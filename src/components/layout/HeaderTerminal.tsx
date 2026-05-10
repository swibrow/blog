import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Terminal from "@components/react/Terminal";
import { promptHost } from "@/lib/promptHost";

interface TerminalHandle {
  submitCommand: (cmd: string) => void;
  tabComplete: (input: string) => string | undefined;
}

export default function HeaderTerminal() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [headerInput, setHeaderInput] = useState("");
  const [host] = useState(() => promptHost());
  const [popoverSlot, setPopoverSlot] = useState<HTMLElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<TerminalHandle>(null);

  // Locate the portal target Astro provides in Header.astro.
  useEffect(() => {
    setPopoverSlot(document.getElementById("header-terminal-popover-slot"));
  }, []);

  // Close on click outside the prompt + popover, and on Escape.
  useEffect(() => {
    if (!terminalOpen) return;

    const isInside = (target: Node) =>
      (promptRef.current?.contains(target) ?? false) ||
      (popoverRef.current?.contains(target) ?? false);

    const handleClickOutside = (e: MouseEvent) => {
      if (!isInside(e.target as Node)) setTerminalOpen(false);
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTerminalOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [terminalOpen]);

  const handleKeyDown = useCallback(
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
        inputRef.current?.blur();
      }
    },
    [headerInput, terminalOpen]
  );

  const handlePromptClick = () => {
    if (!terminalOpen) setTerminalOpen(true);
    inputRef.current?.focus();
  };

  const popover =
    terminalOpen && popoverSlot
      ? createPortal(
          <div ref={popoverRef} className="header-terminal-popover">
            <div className="mx-auto max-w-6xl px-4">
              <Terminal
                embedded
                externalInput
                ref={terminalRef}
                onClose={() => setTerminalOpen(false)}
              />
            </div>
          </div>,
          popoverSlot
        )
      : null;

  return (
    <>
      {popover}
      <div
        ref={promptRef}
        className="flex items-center gap-1 font-mono text-sm cursor-text min-w-0 flex-1 mr-4"
        onClick={handlePromptClick}
      >
        <span className="shrink-0" style={{ color: "var(--ctp-green)" }}>
          samuel@{host}
        </span>
        <span className="shrink-0" style={{ color: "var(--ctp-subtext0)" }}>
          ~
        </span>
        <span className="shrink-0" style={{ color: "var(--ctp-text)" }}>
          $
        </span>
        {!headerInput && !terminalOpen && (
          <span className="cursor-blink ml-1" style={{ color: "var(--ctp-green)" }}>
            _
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={headerInput}
          onChange={(e) => setHeaderInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none font-mono text-sm min-w-0 flex-1 ml-1"
          style={{ color: "var(--ctp-text)", caretColor: "var(--ctp-green)" }}
          placeholder={terminalOpen ? "esc or 'exit' to close" : "type a command..."}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </>
  );
}
