import { useState, useEffect, useCallback } from "react";

interface GameProps {
  onExit: () => void;
}

type Cell = "X" | "O" | null;
type Board = Cell[];

const WINNING_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Board): Cell {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function getWinningLine(board: Board): number[] | null {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return line;
    }
  }
  return null;
}

function aiMove(board: Board): number {
  const empty = board
    .map((v, i) => (v === null ? i : -1))
    .filter((i) => i !== -1);

  if (empty.length === 0) return -1;

  // Try to win
  for (const idx of empty) {
    const test = [...board];
    test[idx] = "O";
    if (checkWinner(test) === "O") return idx;
  }

  // Block player win
  for (const idx of empty) {
    const test = [...board];
    test[idx] = "X";
    if (checkWinner(test) === "X") return idx;
  }

  // Take center
  if (board[4] === null) return 4;

  // Take corners
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0)
    return corners[Math.floor(Math.random() * corners.length)];

  // Random
  return empty[Math.floor(Math.random() * empty.length)];
}

const TicTacToe = ({ onExit }: GameProps) => {
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [xScore, setXScore] = useState(0);
  const [oScore, setOScore] = useState(0);

  const winner = checkWinner(board);
  const winLine = getWinningLine(board);
  const isDraw = !winner && board.every((c) => c !== null);

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
  }, []);

  const handleClick = useCallback(
    (idx: number) => {
      if (board[idx] || winner || isDraw) return;

      const newBoard = [...board];
      newBoard[idx] = "X";

      const playerWin = checkWinner(newBoard);
      if (playerWin) {
        setBoard(newBoard);
        setXScore((s) => s + 1);
        return;
      }

      if (newBoard.every((c) => c !== null)) {
        setBoard(newBoard);
        return;
      }

      // AI move
      const ai = aiMove(newBoard);
      if (ai !== -1) {
        newBoard[ai] = "O";
        if (checkWinner(newBoard) === "O") {
          setOScore((s) => s + 1);
        }
      }
      setBoard(newBoard);
    },
    [board, winner, isDraw]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (e.key === "Enter" && (winner || isDraw)) {
        resetBoard();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit, winner, isDraw, resetBoard]);

  const CELL_SIZE = 72;
  const GAP = 4;

  const cellColor = (idx: number): string => {
    if (winLine?.includes(idx)) {
      return winner === "X" ? "var(--ctp-green)" : "var(--ctp-red)";
    }
    return "var(--ctp-surface0)";
  };

  return (
    <div className="terminal-game">
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            color: "var(--ctp-text)",
            fontSize: 14,
          }}
        >
          <span>
            You (X): <strong>{xScore}</strong> | AI (O):{" "}
            <strong>{oScore}</strong>
          </span>
          <span style={{ color: "var(--ctp-subtext0)", fontSize: 11 }}>
            Click to play | ESC to exit
          </span>
        </div>
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: `repeat(3, ${CELL_SIZE}px)`,
            gap: GAP,
            backgroundColor: "var(--ctp-mantle)",
            padding: GAP,
            borderRadius: 8,
          }}
        >
          {board.map((cell, i) => (
            <button
              key={i}
              onClick={() => handleClick(i)}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: cellColor(i),
                border: "none",
                borderRadius: 4,
                fontSize: 32,
                fontWeight: 700,
                color:
                  cell === "X"
                    ? "var(--ctp-blue)"
                    : cell === "O"
                      ? "var(--ctp-peach)"
                      : "transparent",
                cursor: cell || winner || isDraw ? "default" : "pointer",
                fontFamily: "'Fira Mono', monospace",
                transition: "background-color 0.15s",
              }}
            >
              {cell || "·"}
            </button>
          ))}
        </div>
        {winner && (
          <div
            style={{
              marginTop: 8,
              color:
                winner === "X" ? "var(--ctp-green)" : "var(--ctp-red)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {winner === "X" ? "You win!" : "AI wins!"} Press Enter for another
            round.
          </div>
        )}
        {isDraw && (
          <div
            style={{
              marginTop: 8,
              color: "var(--ctp-yellow)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            It&apos;s a draw! Press Enter for another round.
          </div>
        )}
      </div>
    </div>
  );
};

export default TicTacToe;
