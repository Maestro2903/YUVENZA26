import { site } from "@/data/site";
import Reveal from "./Reveal";

/**
 * "The pixel perfect artisan" — the big editorial award section:
 * interleaved display type + decorative frames, a full-bleed "artisan"
 * headline block, and the awards paragraph.
 */
export default function Artisan() {
  return (
    <section className="h-item aw" id="work">
      <div className="h-row">
        <div className="h-inner set4">
          <img
            className="h-img set4 blend hat"
            src="/assets/avatars/hat.svg"
            alt=""
            draggable={false}
          />
        </div>
        <h2 className="m-head s1">The</h2>
        <h2 className="m-head sub">pixel</h2>
        <div className="h-inner set5">
          <img
            className="h-img set5 star"
            src="/assets/avatars/star.svg"
            alt=""
            draggable={false}
          />
        </div>
      </div>

      <div className="h-row sp">
        <div className="h-inner set4 award">
          <img
            className="h-img set4 blend award"
            src="/assets/avatars/trophy.svg"
            alt=""
            draggable={false}
          />
        </div>
        <h2 className="m-head">
          perfe<span className="m-span">c</span>t
        </h2>
      </div>

      <div className="h-row sp text">
        <div className="h-block sub">
          <h2 className="m-head shape">artisan</h2>
        </div>
        <Reveal className="h-description">
          <div className="txt">
            {site.awardsBlurb.split("mentions & awards")[0]}
            <a className="under" href="#">
              mentions &amp; awards
            </a>
          </div>
          <a className="block aww" href="https://awwwards.com" target="_blank" rel="noreferrer">
            <h2 className="h-head aww">Awwwards</h2>
          </a>
          <div className="txt">
            {site.awardsBlurb.split("Awwwards,")[1] ?? ""}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
