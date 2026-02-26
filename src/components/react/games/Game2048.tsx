import { useState, useEffect, useCallback } from "react";

interface GameProps {
  onExit: () => void;
}

type Grid = number[][];

function createEmptyGrid(): Grid {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function addRandom(grid: Grid): Grid {
  const newGrid = grid.map((row) => [...row]);
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (newGrid[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return newGrid;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  newGrid[r][c] = Math.random() < 0.9 ? 2 : 4;
  return newGrid;
}

function slideRow(row: number[]): { row: number[]; score: number } {
  let score = 0;
  const filtered = row.filter((v) => v !== 0);
  const merged: number[] = [];
  let i = 0;
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const val = filtered[i] * 2;
      merged.push(val);
      score += val;
      i += 2;
    } else {
      merged.push(filtered[i]);
      i += 1;
    }
  }
  while (merged.length < 4) merged.push(0);
  return { row: merged, score };
}

function transpose(grid: Grid): Grid {
  return grid[0].map((_, c) => grid.map((row) => row[c]));
}

function moveLeft(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const newGrid = grid.map((row) => {
    const { row: newRow, score } = slideRow(row);
    totalScore += score;
    if (newRow.some((v, i) => v !== row[i])) moved = true;
    return newRow;
  });
  return { grid: newGrid, score: totalScore, moved };
}

function moveRight(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  let totalScore = 0;
  let moved = false;
  const newGrid = grid.map((row) => {
    const reversed = [...row].reverse();
    const { row: newRow, score } = slideRow(reversed);
    const final = newRow.reverse();
    totalScore += score;
    if (final.some((v, i) => v !== row[i])) moved = true;
    return final;
  });
  return { grid: newGrid, score: totalScore, moved };
}

function moveUp(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  const t = transpose(grid);
  const result = moveLeft(t);
  return { grid: transpose(result.grid), score: result.score, moved: result.moved };
}

function moveDown(grid: Grid): { grid: Grid; score: number; moved: boolean } {
  const t = transpose(grid);
  const result = moveRight(t);
  return { grid: transpose(result.grid), score: result.score, moved: result.moved };
}

function canMove(grid: Grid): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid[r][c] === 0) return true;
      if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
      if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
    }
  }
  return false;
}

function hasWon(grid: Grid): boolean {
  return grid.some((row) => row.some((v) => v >= 2048));
}

const TILE_COLORS: Record<number, { bg: string; fg: string }> = {
  0: { bg: "var(--ctp-surface0)", fg: "transparent" },
  2: { bg: "var(--ctp-surface1)", fg: "var(--ctp-text)" },
  4: { bg: "var(--ctp-surface2)", fg: "var(--ctp-text)" },
  8: { bg: "var(--ctp-peach)", fg: "var(--ctp-base)" },
  16: { bg: "var(--ctp-maroon)", fg: "var(--ctp-base)" },
  32: { bg: "var(--ctp-red)", fg: "var(--ctp-base)" },
  64: { bg: "var(--ctp-red)", fg: "var(--ctp-base)" },
  128: { bg: "var(--ctp-yellow)", fg: "var(--ctp-base)" },
  256: { bg: "var(--ctp-yellow)", fg: "var(--ctp-base)" },
  512: { bg: "var(--ctp-green)", fg: "var(--ctp-base)" },
  1024: { bg: "var(--ctp-green)", fg: "var(--ctp-base)" },
  2048: { bg: "var(--ctp-mauve)", fg: "var(--ctp-base)" },
};

function tileStyle(value: number): { bg: string; fg: string } {
  return TILE_COLORS[value] || { bg: "var(--ctp-mauve)", fg: "var(--ctp-base)" };
}

const Game2048 = ({ onExit }: GameProps) => {
  const [grid, setGrid] = useState<Grid>(() => {
    let g = createEmptyGrid();
    g = addRandom(g);
    g = addRandom(g);
    return g;
  });
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">(
    "playing"
  );

  const move = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (gameState === "lost") return;

      const movers = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown };
      const result = movers[direction](grid);

      if (!result.moved) return;

      const newGrid = addRandom(result.grid);
      setGrid(newGrid);
      setScore((s) => s + result.score);

      if (hasWon(newGrid) && gameState !== "won") {
        setGameState("won");
      } else if (!canMove(newGrid)) {
        setGameState("lost");
      }
    },
    [grid, gameState]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          move("left");
          break;
        case "ArrowRight":
          e.preventDefault();
          move("right");
          break;
        case "ArrowUp":
          e.preventDefault();
          move("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          move("down");
          break;
      }

      // Restart
      if (e.key === "Enter" && gameState === "lost") {
        let g = createEmptyGrid();
        g = addRandom(g);
        g = addRandom(g);
        setGrid(g);
        setScore(0);
        setGameState("playing");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit, move, gameState]);

  const TILE_SIZE = 64;
  const GAP = 6;

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
            Score: <strong>{score}</strong>
          </span>
          <span style={{ color: "var(--ctp-subtext0)", fontSize: 11 }}>
            Arrow keys to move | ESC to exit
          </span>
        </div>
        <div
          style={{
            display: "inline-grid",
            gridTemplateColumns: `repeat(4, ${TILE_SIZE}px)`,
            gap: GAP,
            backgroundColor: "var(--ctp-mantle)",
            padding: GAP,
            borderRadius: 8,
          }}
        >
          {grid.flat().map((value, i) => {
            const { bg, fg } = tileStyle(value);
            return (
              <div
                key={i}
                style={{
                  width: TILE_SIZE,
                  height: TILE_SIZE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderRadius: 4,
                  fontSize: value >= 1024 ? 18 : value >= 128 ? 22 : 26,
                  fontWeight: 700,
                  color: fg,
                  fontFamily: "'Fira Mono', monospace",
                }}
              >
                {value || ""}
              </div>
            );
          })}
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
            You reached 2048! Keep going or ESC to exit.
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
            No more moves! Press Enter to restart.
          </div>
        )}
      </div>
    </div>
  );
};

export default Game2048;
