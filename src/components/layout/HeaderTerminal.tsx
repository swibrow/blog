import { useState, useRef, useEffect, useCallback } from "react";
import Terminal from "@components/react/Terminal";

interface TerminalHandle {
  submitCommand: (cmd: string) => void;
  tabComplete: (input: string) => string | undefined;
}

export default function HeaderTerminal() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [headerInput, setHeaderInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<TerminalHandle>(null);

  useEffect(() => {
    if (!terminalOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setTerminalOpen(false);
      }
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

  return (
    <div ref={wrapperRef} className="contents">
      {terminalOpen && (
        <div className="header-terminal-popover">
          <div className="mx-auto max-w-6xl px-4">
            <Terminal
              embedded
              externalInput
              ref={terminalRef}
              onClose={() => setTerminalOpen(false)}
            />
          </div>
        </div>
      )}

      <div
        className="flex items-center gap-1 font-mono text-sm cursor-text min-w-0 flex-1 mr-4"
        onClick={handlePromptClick}
      >
        <span className="shrink-0" style={{ color: "var(--ctp-green)" }}>
          samuel@wibrow.net
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
    </div>
  );
}
