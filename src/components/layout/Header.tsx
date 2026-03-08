import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import ThemeToggle from "@components/react/ThemeToggle";
import Terminal from "@components/react/Terminal";

const navItems = [
  { name: "~/home", href: "/", exact: true },
  { name: "~/posts", href: "/posts" },
  { name: "~/til", href: "/til" },
  { name: "~/projects", href: "/projects" },
  { name: "~/tools", href: "/tools" },
  { name: "~/about", href: "/about" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [headerInput, setHeaderInput] = useState("");
  const location = useLocation();
  const headerInputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<{ submitCommand: (cmd: string) => void }>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setTerminalOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  // Close terminal on click outside or Escape
  useEffect(() => {
    if (!terminalOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setTerminalOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTerminalOpen(false);
        headerInputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [terminalOpen]);

  const handleHeaderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && headerInput.trim()) {
        if (!terminalOpen) setTerminalOpen(true);
        terminalRef.current?.submitCommand(headerInput.trim());
        setHeaderInput("");
      } else if (e.key === "Tab") {
        e.preventDefault();
        const result = terminalRef.current?.tabComplete(headerInput);
        if (result) {
          setHeaderInput(result);
          if (!terminalOpen) setTerminalOpen(true);
        }
      } else if (e.key === "Escape") {
        setTerminalOpen(false);
        headerInputRef.current?.blur();
      }
    },
    [headerInput, terminalOpen]
  );

  const handlePromptClick = () => {
    if (!terminalOpen) setTerminalOpen(true);
    headerInputRef.current?.focus();
  };

  return (
    <div
      ref={headerRef}
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: "var(--ctp-mantle)", borderColor: "var(--ctp-surface0)" }}
    >
      {/* Terminal output - always mounted, animated open/closed */}
      <motion.div
        initial={false}
        animate={{ height: terminalOpen ? "auto" : 0, opacity: terminalOpen ? 1 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}
      >
        <div className="mx-auto max-w-6xl px-4">
          <Terminal embedded externalInput ref={terminalRef} onClose={() => setTerminalOpen(false)} />
        </div>
      </motion.div>

      {/* Nav bar */}
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Prompt with inline input */}
        <div
          className="flex items-center gap-1 font-mono text-sm cursor-text min-w-0 flex-1 mr-4"
          onClick={handlePromptClick}
        >
          <span className="shrink-0" style={{ color: "var(--ctp-green)" }}>samuel@wibrow.net</span>
          <span className="shrink-0" style={{ color: "var(--ctp-subtext0)" }}>~</span>
          <span className="shrink-0" style={{ color: "var(--ctp-text)" }}>$</span>
          {!headerInput && !terminalOpen && (
            <span className="cursor-blink ml-1" style={{ color: "var(--ctp-green)" }}>_</span>
          )}
          <input
            ref={headerInputRef}
            type="text"
            value={headerInput}
            onChange={(e) => setHeaderInput(e.target.value)}
            onKeyDown={handleHeaderKeyDown}
            className="bg-transparent border-none outline-none font-mono text-sm min-w-0 flex-1 ml-1"
            style={{ color: "var(--ctp-text)", caretColor: "var(--ctp-green)" }}
            placeholder={terminalOpen ? "esc or 'exit' to close" : "type a command..."}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-4 md:flex shrink-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="font-mono text-sm transition-colors hover:no-underline"
              style={{
                color: item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href)
                  ? "var(--ctp-green)"
                  : "var(--ctp-text)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ctp-green)")}
              onMouseLeave={(e) => {
                if (!item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href)) {
                  e.currentTarget.style.color = "var(--ctp-text)";
                }
              }}
            >
              {item.name}
            </Link>
          ))}
          <ThemeToggle />
        </nav>

        {/* Mobile hamburger */}
        <div className="flex items-center gap-3 md:hidden shrink-0">
          <button
            className="flex flex-col gap-1.5"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="block h-0.5 w-6 transition-all" style={{ backgroundColor: "var(--ctp-text)" }} />
            <span className="block h-0.5 w-6 transition-all" style={{ backgroundColor: "var(--ctp-text)" }} />
            <span className="block h-0.5 w-6 transition-all" style={{ backgroundColor: "var(--ctp-text)" }} />
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <nav
          className="flex flex-col gap-2 border-t px-4 py-3 md:hidden"
          style={{ borderColor: "var(--ctp-surface0)" }}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="font-mono text-sm transition-colors"
              style={{
                color: item.exact ? location.pathname === item.href : location.pathname.startsWith(item.href)
                  ? "var(--ctp-green)"
                  : "var(--ctp-text)",
              }}
              onClick={() => setMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}
          <div className="pt-2">
            <ThemeToggle />
          </div>
        </nav>
      )}
    </div>
  );
}
