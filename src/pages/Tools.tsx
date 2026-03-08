import SectionHeading from "@components/layout/SectionHeading";
import Card from "@components/ui/Card";
import { toolsByCategory } from "@/data/tools";
import { motion } from "framer-motion";

export default function Tools() {
  return (
    <SectionHeading title="tools" subtitle="A small collection of tools to make me feel like a wizard.">
      <div className="flex flex-col gap-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card href="https://github.com/swibrow/dotfiles" external>
            <h2 className="mb-1 text-lg font-bold" style={{ color: "var(--ctp-blue)" }}>
              Dotfiles
            </h2>
            <p className="mb-0 text-sm" style={{ color: "var(--ctp-text)" }}>
              My configuration files and setup scripts
            </p>
          </Card>
        </motion.div>

        {toolsByCategory.map((cat, ci) => (
          <motion.div
            key={cat.name}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: (ci + 1) * 0.05 }}
          >
            <h3
              className="mb-3 font-mono text-sm font-semibold uppercase tracking-wider"
              style={{ color: "var(--ctp-subtext0)" }}
            >
              {cat.name}
            </h3>
            <div className="flex flex-col gap-3">
              {cat.tools.map((tool) => (
                <Card key={tool.name} href={tool.url} external>
                  <h2 className="mb-1 text-lg font-bold" style={{ color: "var(--ctp-blue)" }}>
                    {tool.name}
                  </h2>
                  <p className="mb-0 text-sm" style={{ color: "var(--ctp-text)" }}>
                    {tool.description}
                  </p>
                </Card>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </SectionHeading>
  );
}
