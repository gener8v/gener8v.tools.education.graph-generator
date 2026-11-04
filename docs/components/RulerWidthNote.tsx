import type { ReactElement } from "react";
import { note } from "./styles";

/**
 * How wide to show a ruler, in the words of the README's Styling section and `RulerGraph`
 * (rulers NLC TICKET-003 code review CR-003, NLC TICKET-008).
 */
export function RulerWidthNote(): ReactElement {
  return (
    <div style={note}>
      <strong>Show a ruler wide enough.</strong> A ruler keeps 3:1 contrast for its finest marks (WCAG 1.4.11) when
      shown at least about 130 px wide, whatever its length, and a centimetre ruler longer than about 12 cm at least
      about 11 px wide per centimetre: about 330 px for a 30 cm ruler and 164 px for a 15 cm one. A 12 in ruler marked to
      sixteenths keeps it down to about 210 px. Narrower than that, the finest marks render lighter than 3:1 against
      white. This applies to <code>&lt;RulerGraph&gt;</code>, to <code>&lt;Graph&gt;</code> drawing a ruler and to{" "}
      <code>createGraph</code> with your own printer. The figures are arithmetic, not a browser measurement, so treat
      them as a floor to stay above.
    </div>
  );
}
