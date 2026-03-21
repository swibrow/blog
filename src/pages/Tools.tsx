import { useState } from "react";
import SectionHeading from "@components/layout/SectionHeading";
import Card from "@components/ui/Card";
import { tools, categories } from "@/data/tools";
import { motion, AnimatePresence } from "framer-motion";

const categoryColors: Record<string, string> = {
  "Terminal & Shell": "var(--ctp-green)",
  "Package Management": "var(--ctp-peach)",
  "CLI Utilities": "var(--ctp-blue)",
  "TUI Applications": "var(--ctp-mauve)",
};

export default function Tools() {
  const [active, setActive] = useState<string | null>(null);

  const filtered = active ? tools.filter((t) => t.category === active) : tools;

  return (
    <SectionHeading title="tools" subtitle="A small collection of tools to make me feel like a wizard.">
      <div className="flex flex-col gap-8">
        {/* Dotfiles card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card href="https://github.com/swibrow/dotfiles" external>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚙️</span>
              <div>
                <h2 className="mb-0.5 text-lg font-bold" style={{ color: "var(--ctp-yellow)" }}>
                  Dotfiles
                </h2>
                <p className="mb-0 text-sm" style={{ color: "var(--ctp-subtext1)" }}>
                  My configuration files and setup scripts — the source of truth
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Category filter pills */}
        <motion.div
          className="flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <button
            onClick={() => setActive(null)}
            className="rounded-full border px-3 py-1 font-mono text-xs transition-all duration-200"
            style={{
              borderColor: !active ? "var(--ctp-lavender)" : "var(--ctp-surface1)",
              backgroundColor: !active ? "var(--ctp-surface0)" : "transparent",
              color: !active ? "var(--ctp-lavender)" : "var(--ctp-subtext0)",
            }}
          >
            all ({tools.length})
          </button>
          {categories.map((cat) => {
            const isActive = active === cat;
            const color = categoryColors[cat] || "var(--ctp-text)";
            const count = tools.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setActive(isActive ? null : cat)}
                className="rounded-full border px-3 py-1 font-mono text-xs transition-all duration-200"
                style={{
                  borderColor: isActive ? color : "var(--ctp-surface1)",
                  backgroundColor: isActive ? "var(--ctp-surface0)" : "transparent",
                  color: isActive ? color : "var(--ctp-subtext0)",
                }}
              >
                {cat.toLowerCase()} ({count})
              </button>
            );
          })}
        </motion.div>

        {/* Tools grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active ?? "all"}
            className="grid gap-3 sm:grid-cols-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {filtered.map((tool, i) => {
              const color = categoryColors[tool.category] || "var(--ctp-blue)";
              return (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <Card href={tool.url} external className="h-full">
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <h2 className="mb-0.5 text-base font-bold" style={{ color: "var(--ctp-text)" }}>
                          {tool.name}
                        </h2>
                        <p className="mb-0 text-sm" style={{ color: "var(--ctp-subtext1)" }}>
                          {tool.description}
                        </p>
                        <span
                          className="mt-2 inline-block font-mono text-xs"
                          style={{ color }}
                        >
                          {tool.category.toLowerCase()}
                        </span>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </SectionHeading>
  );
}
