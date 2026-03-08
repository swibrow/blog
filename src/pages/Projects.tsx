import SectionHeading from "@components/layout/SectionHeading";
import Card from "@components/ui/Card";
import { projects } from "@/data/projects";
import { motion } from "framer-motion";

export default function Projects() {
  return (
    <SectionHeading title="projects">
      <div className="flex flex-col gap-4">
        {projects.map((project, i) => (
          <motion.div
            key={project.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          >
            <Card>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="mb-1 text-lg font-bold" style={{ color: "var(--ctp-blue)" }}>
                    {project.name}
                  </h2>
                  <p className="mb-0 text-sm" style={{ color: "var(--ctp-text)" }}>
                    {project.description}
                  </p>
                </div>
                {project.badge && (
                  <span
                    className="shrink-0 rounded px-2 py-0.5 font-mono text-xs"
                    style={{ backgroundColor: "var(--ctp-surface0)", color: "var(--ctp-subtext1)" }}
                  >
                    {project.badge}
                  </span>
                )}
              </div>
              {project.links && project.links.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {project.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs transition-colors hover:underline"
                      style={{ color: "var(--ctp-lavender)" }}
                    >
                      {link.label} →
                    </a>
                  ))}
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </SectionHeading>
  );
}
