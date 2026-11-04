import { existsSync, readFileSync, statSync } from "node:fs";
import { type Server, createServer } from "node:http";
import { limitText } from "../../docs/components/Limit";
import type { AddressInfo } from "node:net";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

// prd/CC-003: the documentation site makes no request outside its own files (graph-library CPSE
// TICKET-008). Serves the built site (`pnpm docs:build`, storybook-static/) from this process,
// opens every page, docs and story, through the site's own manager, and fails on any request to
// another origin: a web font, a CDN script, telemetry. Such a request is aborted, never sent.
// Skipped when the site is not built, unless DOCS_SITE_REQUIRED=1 (the docs workflow sets it).

const site = fileURLToPath(new URL("../../storybook-static/", import.meta.url));
const built = existsSync(join(site, "index.html")) && existsSync(join(site, "index.json"));

const TYPES: Readonly<Record<string, string>> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** A static server for the built site on a free local port. */
async function serve(): Promise<{ server: Server; origin: string }> {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    const file = resolve(site, `.${path.endsWith("/") ? `${path}index.html` : path}`);
    if (!(file === site || file.startsWith(site.endsWith(sep) ? site : `${site}${sep}`)) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(readFileSync(file));
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  return { server, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

interface Entry {
  id: string;
  type: "docs" | "story";
  title: string;
  name: string;
}

const entries: Entry[] = built ? Object.values((JSON.parse(readFileSync(join(site, "index.json"), "utf8")) as { entries: Record<string, Entry> }).entries) : [];

test.describe("documentation site (prd/CC-003)", () => {
  test.skip(!built && process.env.DOCS_SITE_REQUIRED !== "1", "The site is not built; run pnpm docs:build.");

  let server: Server;
  let origin: string;
  test.beforeAll(async () => {
    ({ server, origin } = await serve());
  });
  test.afterAll(async () => {
    await new Promise((done) => server.close(done));
  });

  test("is built, with a page for every documentation page and every example", () => {
    expect(built, "storybook-static/index.html and index.json").toBe(true);
    expect(entries.filter((entry) => entry.type === "docs").length).toBeGreaterThan(0);
    expect(entries.filter((entry) => entry.type === "story").length).toBeGreaterThan(0);
  });

  // @spec CPSE-REQ-044, CPSE-REQ-045
  for (const entry of entries) {
    test(`${entry.title} / ${entry.name} requests nothing outside the site`, async ({ page }) => {
      const outside: string[] = [];
      const own = (url: string) => url.startsWith(`${origin}/`) || url.startsWith("data:") || url.startsWith("blob:") || url === "about:blank";
      await page.route(
        (url) => !own(url.href),
        (route) => {
          outside.push(route.request().url());
          return route.abort("blockedbyclient");
        },
      );
      page.on("websocket", (socket) => outside.push(socket.url()));
      page.on("request", (request) => {
        if (!own(request.url()) && !outside.includes(request.url())) outside.push(request.url());
      });

      await page.goto(`${origin}/index.html?path=/${entry.type}/${entry.id}`, { waitUntil: "networkidle" });
      const preview = page.frameLocator("#storybook-preview-iframe");
      // The page itself rendered: an example's graph, or a documentation page's text.
      if (entry.type === "story") await expect(preview.locator("#storybook-root svg").first()).toBeVisible();
      else await expect(preview.locator("#storybook-docs h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle");

      expect(outside, "requests outside the site").toEqual([]);
    });
  }

  // The limits a page states come from the package's constants (`docs/components/Limit.tsx`); this
  // checks they reach the built page as numbers (CPSE TICKET-008 code review CR-002).
  test("Source export states the command's limits from the package", async ({ page }) => {
    const exportPage = entries.find((entry) => entry.type === "docs" && entry.title === "Source export");
    expect(exportPage, "a Source export page").toBeDefined();
    await page.goto(`${origin}/index.html?path=/docs/${exportPage!.id}`, { waitUntil: "networkidle" });
    const docs = page.frameLocator("#storybook-preview-iframe").locator("#storybook-docs");
    await expect(docs).toContainText(limitText("MAX_INPUT_BYTES"));
    await expect(docs).toContainText(`first ${limitText("MAX_ISSUES_PRINTED")} issues`);
  });
});
