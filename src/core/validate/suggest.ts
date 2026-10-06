/**
 * Damerau–Levenshtein distance in its optimal-string-alignment form: insertions, deletions,
 * substitutions and swaps of two adjacent characters each cost 1.
 */
export function editDistance(a: string, b: string): number {
  let beforePrevious: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(previous[j]! + 1, current[j - 1]! + 1, previous[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, beforePrevious[j - 2]! + 1);
      }
      current.push(best);
    }
    beforePrevious = previous;
    previous = current;
  }
  return previous[b.length]!;
}

/**
 * The applicable term closest to an unknown property name (GSV-REQ-020): suggested when the
 * distance is at most 2 or at most a third of the term's length (AD-004). Case is ignored, so
 * `LineColor` suggests `lineColor`; ties go to the first term in definition order.
 */
// @spec GSV-REQ-020
export function closestTerm(name: string, terms: readonly string[]): string | undefined {
  const target = name.toLowerCase();
  let best: { term: string; distance: number } | undefined;
  for (const term of terms) {
    const threshold = Math.max(2, Math.floor(term.length / 3));
    // The distance is at least the difference in length, so long names are skipped cheaply.
    if (Math.abs(term.length - target.length) > threshold) continue;
    const distance = editDistance(target, term.toLowerCase());
    if (distance <= threshold && (best === undefined || distance < best.distance)) best = { term, distance };
  }
  return best?.term;
}
