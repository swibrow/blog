import { useState, useEffect, useCallback } from "react";

interface GameProps {
  onExit: () => void;
}

const WORDS = [
  "crane", "slate", "trace", "crate", "blast", "climb", "cloud", "crush",
  "debug", "draft", "drive", "error", "fetch", "flame", "flask", "float",
  "frame", "glyph", "graph", "guard", "hoist", "index", "input", "knobs",
  "layer", "linux", "logic", "merge", "model", "nodes", "parse", "patch",
  "pixel", "plant", "proxy", "query", "queue", "react", "redis", "regex",
  "route", "rural", "scale", "scope", "scout", "shark", "shell", "shift",
  "sigma", "slack", "slice", "smart", "snake", "space", "spark", "stack",
  "stamp", "steam", "stern", "stoke", "stone", "store", "storm", "strip",
  "super", "surge", "swift", "table", "teach", "those", "timer", "token",
  "torch", "trail", "trait", "tribe", "trove", "trunk", "typed", "ultra",
  "union", "value", "vault", "vigor", "vivid", "watch", "whale", "while",
  "world", "write", "yield",
];

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

type LetterState = "correct" | "present" | "absent" | "empty";

interface LetterCell {
  letter: string;
  state: LetterState;
}

const Wordle = ({ onExit }: GameProps) => {
  const [target] = useState(
    () => WORDS[Math.floor(Math.random() * WORDS.length)]
  );
  const [guesses, setGuesses] = useState<LetterCell[][]>([]);
  const [current, setCurrent] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );
  const [shake, setShake] = useState(false);

  const evaluate = useCallback(
    (guess: string): LetterCell[] => {
      const result: LetterCell[] = Array.from({ length: WORD_LENGTH }, () => ({
        letter: "",
        state: "absent" as LetterState,
      }));
      const targetArr = target.split("");
      const used = new Array(WORD_LENGTH).fill(false);

      // First pass: correct positions
      for (let i = 0; i < WORD_LENGTH; i++) {
        result[i].letter = guess[i];
        if (guess[i] === targetArr[i]) {
          result[i].state = "correct";
          used[i] = true;
        }
      }

      // Second pass: present but wrong position
      for (let i = 0; i < WORD_LENGTH; i++) {
        if (result[i].state === "correct") continue;
        for (let j = 0; j < WORD_LENGTH; j++) {
          if (!used[j] && guess[i] === targetArr[j]) {
            result[i].state = "present";
            used[j] = true;
            break;
          }
        }
      }

      return result;
    },
    [target]
  );

  const usedLetters = useCallback((): Record<string, LetterState> => {
    const map: Record<string, LetterState> = {};
    for (const row of guesses) {
      for (const cell of row) {
        const existing = map[cell.letter];
        if (
          cell.state === "correct" ||
          (cell.state === "present" && existing !== "correct") ||
          (cell.state === "absent" && !existing)
        ) {
          map[cell.letter] = cell.state;
        }
      }
    }
    return map;
  }, [guesses]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (gameState !== "playing") return;

      if (e.key === "Enter" && current.length === WORD_LENGTH) {
        const evaluated = evaluate(current.toLowerCase());
        const newGuesses = [...guesses, evaluated];
        setGuesses(newGuesses);
        setCurrent("");

        if (current.toLowerCase() === target) {
          setGameState("won");
        } else if (newGuesses.length >= MAX_GUESSES) {
          setGameState("lost");
        }
      } else if (e.key === "Backspace") {
        setCurrent((c) => c.slice(0, -1));
      } else if (/^[a-zA-Z]$/.test(e.key) && current.length < WORD_LENGTH) {
        setCurrent((c) => c + e.key.toLowerCase());
      } else if (e.key === "Enter" && current.length < WORD_LENGTH) {
        setShake(true);
        setTimeout(() => setShake(false), 400);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit, gameState, current, guesses, evaluate, target]);

  const colorForState = (state: LetterState): string => {
    switch (state) {
      case "correct":
        return "var(--ctp-green)";
      case "present":
        return "var(--ctp-yellow)";
      case "absent":
        return "var(--ctp-surface1)";
      default:
        return "var(--ctp-surface0)";
    }
  };

  const letterMap = usedLetters();

  const renderRow = (cells: LetterCell[], idx: number) => (
    <div key={idx} style={{ display: "flex", gap: 4, marginBottom: 4 }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          style={{
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colorForState(cell.state),
            borderRadius: 4,
            fontSize: 20,
            fontWeight: 700,
            color: cell.state === "empty" ? "var(--ctp-subtext0)" : "var(--ctp-base)",
            textTransform: "uppercase",
            fontFamily: "'Fira Mono', monospace",
          }}
        >
          {cell.letter}
        </div>
      ))}
    </div>
  );

  const currentRow: LetterCell[] = Array.from(
    { length: WORD_LENGTH },
    (_, i) => ({
      letter: current[i] || "",
      state: "empty" as LetterState,
    })
  );

  const emptyRows = Math.max(
    0,
    MAX_GUESSES - guesses.length - (gameState === "playing" ? 1 : 0)
  );

  const KEYBOARD_ROWS = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["z", "x", "c", "v", "b", "n", "m"],
  ];

  return (
    <div className="terminal-game">
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            color: "var(--ctp-subtext0)",
            fontSize: 11,
            marginBottom: 8,
          }}
        >
          Type a 5-letter word + Enter | ESC to exit
        </div>
        <div
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            animation: shake ? "shake 0.4s" : undefined,
          }}
        >
          {guesses.map((row, i) => renderRow(row, i))}
          {gameState === "playing" && renderRow(currentRow, guesses.length)}
          {Array.from({ length: emptyRows }, (_, i) =>
            renderRow(
              Array.from({ length: WORD_LENGTH }, () => ({
                letter: "",
                state: "empty" as LetterState,
              })),
              guesses.length + 1 + i
            )
          )}
        </div>

        {/* Mini keyboard */}
        <div style={{ marginTop: 12 }}>
          {KEYBOARD_ROWS.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 3,
                marginBottom: 3,
              }}
            >
              {row.map((key) => (
                <div
                  key={key}
                  style={{
                    width: 26,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: letterMap[key]
                      ? colorForState(letterMap[key])
                      : "var(--ctp-surface0)",
                    borderRadius: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      letterMap[key] && letterMap[key] !== "absent"
                        ? "var(--ctp-base)"
                        : "var(--ctp-text)",
                    textTransform: "uppercase",
                    fontFamily: "'Fira Mono', monospace",
                  }}
                >
                  {key}
                </div>
              ))}
            </div>
          ))}
        </div>

        {gameState === "won" && (
          <div
            style={{
              marginTop: 8,
              color: "var(--ctp-green)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Nice! You got it in {guesses.length} guess
            {guesses.length > 1 ? "es" : ""}!
          </div>
        )}
        {gameState === "lost" && (
          <div
            style={{
              marginTop: 8,
              color: "var(--ctp-red)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            The word was <strong>{target.toUpperCase()}</strong>
          </div>
        )}
      </div>
    </div>
  );
};

export default Wordle;
