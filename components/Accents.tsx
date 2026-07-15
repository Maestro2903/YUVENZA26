import { Fragment, type ReactNode } from "react";

/**
 * Renders editable copy using the site's accent conventions:
 *   - "*x*" wraps x in the serif accent style: <span class="f-span">x</span>
 *   - "*_x*" adds the spaced variant: <span class="f-span space">x</span>
 *   - a literal newline becomes a <br />
 *
 * This lets admins author display headings like "Our W*_o*rk" as plain text.
 */
export function renderAccents(text: string): ReactNode {
  const lines = text.split("\n");
  return lines.map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {lineIndex > 0 && <br />}
      {renderLine(line)}
    </Fragment>
  ));
}

function renderLine(line: string): ReactNode {
  const parts = line.split(/\*([^*]+)\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
    const spaced = part.startsWith("_");
    const letter = spaced ? part.slice(1) : part;
    return (
      <span key={i} className={spaced ? "f-span space" : "f-span"}>
        {letter}
      </span>
    );
  });
}
