"use client";

import { site } from "@/data/site";
import { projects } from "@/data/projects";
import Reveal from "./Reveal";

const upcoming = projects.find((p) => p.slug === "unexpected-time")!;

export default function Hero() {
  return (
    <div className="main-h" id="about">
      <div className="h-grid">
        {/* brand headline */}
        <Reveal className="h-item h1">
          <h1 className="head-hero">{site.brand}</h1>
        </Reveal>

        {/* interactive artist intro */}
        <div className="h-item r-bord">
          <div className="h-intro">
            <div className="block">
              <h2 className="h-head s-1">
                Intera<span className="f-span">c</span>tive
              </h2>
              <h2 className="h-head sub">Artist!</h2>
            </div>
            <div className="h-inner set2">
              <img
                className="h-img set2 blend"
                src="/assets/avatars/portrait-1.svg"
                alt="Studio portrait"
                draggable={false}
              />
            </div>
          </div>
          <Reveal className="h-drop left">
            <h5 className="has-dropcap">{site.intro}</h5>
          </Reveal>
        </div>

        {/* image + role list */}
        <div className="h-item">
          <div className="h-desc-row">
            <div className="h-inner set1">
              <img
                className="h-img set1 blend"
                src="/assets/avatars/portrait-2.svg"
                alt="Studio work"
                draggable={false}
              />
            </div>
            <div className="h-desc">
              <h2 className="h-head ex">
                di<span className="f-span">g</span>ital art dire
                <span className="f-span">c</span>t<span className="f-span">o</span>r
              </h2>
              <h2 className="h-head ex">
                Intera<span className="f-span">c</span>tive Desi
                <span className="f-span">g</span>ner
              </h2>
              <h2 className="h-head ex">
                <span className="f-span">c</span>reative devel
                <span className="f-span">o</span>per
              </h2>
              <h2 className="h-head ex">
                based in <span className="under">{site.location}</span>.
              </h2>
            </div>
          </div>
        </div>

        {/* website + stamp */}
        <Reveal className="h-item stamp" stagger>
          <div className="h-block">
            <h2 className="head set2">Website</h2>
          </div>
          <div className="stamp-w">
            <img
              className="postage blend"
              src="/assets/stamp.svg"
              alt="YUVENZA postage stamp"
              draggable={false}
            />
          </div>
        </Reveal>

        {/* upcoming next + think/create/deliver */}
        <div className="h-item flex">
          <div className="h-col left">
            <div className="headline set3">
              <div className="head-wrap">
                <div className="head-title">
                  Up<span className="dom">co</span>min
                  <span className="dom">g</span> Next
                </div>
              </div>
              <div className="head-desc left">
                Fresh entry — a selected
                <br />
                work from the latest
                <br />
                digital releases.
              </div>
              <div className="head-caption">
                <div className="item-title cap">Tip!</div>
                <div className="item-desc cap">Click the image to explore</div>
              </div>
            </div>
            <a href={upcoming.href} className="h-inner set3" aria-label={upcoming.name}>
              <img
                src={`/assets/projects/${upcoming.slug}.svg`}
                alt={upcoming.name}
                draggable={false}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </a>
          </div>

          <div className="h-col right">
            <div className="block">
              <h2 className="h-head s">
                Think, <span className="f-span">C</span>reate
              </h2>
              <h2 className="h-head sub-2">Deliver</h2>
            </div>
            <div className="h-drop">
              <Reveal>
                <h5 className="has-dropcap">{site.collab}</h5>
              </Reveal>
              <h3 className="h5 h3">{site.artisan}</h3>
            </div>
            <a href="#work" className="cta-h home">
              <div className="cta-text work">
                All W<span className="f-span">o</span>rk
              </div>
              <img className="arrow" src="/assets/arrow.svg" alt="" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
