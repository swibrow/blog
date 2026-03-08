import { motion } from "framer-motion";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
}

export default function SectionHeading({ title, subtitle, wide, children }: SectionHeadingProps) {
  return (
    <motion.main
      className={`mx-auto px-4 py-12 ${wide ? "max-w-6xl" : "max-w-4xl"}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h1 className="mb-2 font-mono text-3xl font-bold" style={{ color: "var(--ctp-green)" }}>
          ~/{title}
        </h1>
        {subtitle && (
          <p className="font-mono text-sm" style={{ color: "var(--ctp-subtext0)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </motion.main>
  );
}
