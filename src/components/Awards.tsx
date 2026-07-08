import { site } from "@/data/site";
import Reveal from "./Reveal";

export default function Awards() {
  return (
    <Reveal className="h-item awards" stagger as="section">
      {site.awards.map((a) => (
        <div className="m-col" key={a.init}>
          <div className="m-inner">
            <h3 className="m-init">{a.init}</h3>
            <h3 className="m-title">{a.title}</h3>
          </div>
          <div className="m-numb">{a.num}</div>
        </div>
      ))}
    </Reveal>
  );
}
