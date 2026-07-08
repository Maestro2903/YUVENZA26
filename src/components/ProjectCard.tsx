import type { Project } from "@/data/projects";

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="item l">
      <a href={project.href} className="item-link" aria-label={project.name}>
        <div className="item-img-w">
          <div className="item-img">
            <img
              src={`/assets/projects/${project.slug}.svg`}
              alt={project.name}
              draggable={false}
            />
          </div>
        </div>
        <div className="item-block">
          <div className="item-tw">
            <img
              className="item-t"
              src={`/assets/projects/${project.slug}-logo.svg`}
              alt={`${project.name} logo`}
              draggable={false}
            />
            {project.isNew && <div className="new-2">New</div>}
          </div>
          <div className="item-desc">{project.desc}</div>
        </div>
      </a>
    </div>
  );
}
