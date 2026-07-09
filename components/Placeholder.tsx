import type { CSSProperties } from "react";

/**
 * A labeled image placeholder that fills its container. Used everywhere a real
 * photo should eventually go, so it's obvious an image needs to be dropped in.
 * Replace these with real imagery when it's ready.
 */
export default function Placeholder({
  className = "",
  label = "Image",
  style,
}: {
  className?: string;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={"img-ph " + className} style={style} aria-hidden="true">
      <span className="img-ph-label">{label}</span>
    </div>
  );
}
