import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <motion.main
      className="flex min-h-[60vh] items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center font-mono">
        <h1 className="mb-4 text-6xl font-bold" style={{ color: "var(--ctp-red)" }}>
          404
        </h1>
        <div
          className="mb-6 rounded-lg border p-6"
          style={{ backgroundColor: "var(--ctp-mantle)", borderColor: "var(--ctp-surface0)" }}
        >
          <p style={{ color: "var(--ctp-green)" }}>
            samuel@wibrow.net:~$
            <span style={{ color: "var(--ctp-text)" }}> cd /page-not-found</span>
          </p>
          <p className="mt-2" style={{ color: "var(--ctp-red)" }}>
            bash: cd: /page-not-found: No such file or directory
          </p>
        </div>
        <Link
          to="/"
          className="font-mono text-sm transition-colors hover:underline"
          style={{ color: "var(--ctp-blue)" }}
        >
          cd ~/ (go home)
        </Link>
      </div>
    </motion.main>
  );
}
