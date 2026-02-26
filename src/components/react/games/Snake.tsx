import { useState, useEffect, useCallback, useRef } from "react";

interface GameProps {
  onExit: () => void;
}

interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 20;
const COLS = 20;
const ROWS = 15;
const CELL = GRID_SIZE;
const TICK_MS = 120;

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";

const Snake = ({ onExit }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dirRef = useRef<Direction>("RIGHT");
  const nextDirRef = useRef<Direction>("RIGHT");
  const snakeRef = useRef<Point[]>([
    { x: 5, y: 7 },
    { x: 4, y: 7 },
    { x: 3, y: 7 },
  ]);
  const foodRef = useRef<Point>(randomFood([{ x: 5, y: 7 }]));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const gameOverRef = useRef(false);

  function randomFood(snake: Point[]): Point {
    let pos: Point;
    do {
      pos = {
        x: Math.floor(Math.random() * COLS),
        y: Math.floor(Math.random() * ROWS),
      };
    } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
    return pos;
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const base = style.getPropertyValue("--ctp-base").trim() || "#1e1e2e";
    const green = style.getPropertyValue("--ctp-green").trim() || "#a6e3a1";
    const red = style.getPropertyValue("--ctp-red").trim() || "#f38ba8";
    const surface0 =
      style.getPropertyValue("--ctp-surface0").trim() || "#313244";

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = surface0;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, ROWS * CELL);
      ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(COLS * CELL, y * CELL);
      ctx.stroke();
    }

    // Food
    const food = foodRef.current;
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL / 2 - 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Snake
    const snake = snakeRef.current;
    snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? green : green + "cc";
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const tick = useCallback(() => {
    if (gameOverRef.current) return;

    dirRef.current = nextDirRef.current;
    const snake = [...snakeRef.current];
    const head = { ...snake[0] };

    switch (dirRef.current) {
      case "UP":
        head.y -= 1;
        break;
      case "DOWN":
        head.y += 1;
        break;
      case "LEFT":
        head.x -= 1;
        break;
      case "RIGHT":
        head.x += 1;
        break;
    }

    // Wall collision
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      gameOverRef.current = true;
      setGameOver(true);
      return;
    }

    // Self collision
    if (snake.some((s) => s.x === head.x && s.y === head.y)) {
      gameOverRef.current = true;
      setGameOver(true);
      return;
    }

    snake.unshift(head);

    // Eat food
    if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
      foodRef.current = randomFood(snake);
      setScore((s) => s + 10);
    } else {
      snake.pop();
    }

    snakeRef.current = snake;
    draw();
  }, [draw]);

  useEffect(() => {
    draw();
    const interval = setInterval(tick, TICK_MS);
    return () => clearInterval(interval);
  }, [draw, tick]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }

      const dir = dirRef.current;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          if (dir !== "DOWN") nextDirRef.current = "UP";
          break;
        case "ArrowDown":
          e.preventDefault();
          if (dir !== "UP") nextDirRef.current = "DOWN";
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (dir !== "RIGHT") nextDirRef.current = "LEFT";
          break;
        case "ArrowRight":
          e.preventDefault();
          if (dir !== "LEFT") nextDirRef.current = "RIGHT";
          break;
      }

      // Restart on Enter after game over
      if (e.key === "Enter" && gameOverRef.current) {
        snakeRef.current = [
          { x: 5, y: 7 },
          { x: 4, y: 7 },
          { x: 3, y: 7 },
        ];
        dirRef.current = "RIGHT";
        nextDirRef.current = "RIGHT";
        foodRef.current = randomFood(snakeRef.current);
        gameOverRef.current = false;
        setGameOver(false);
        setScore(0);
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit]);

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
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          style={{ borderRadius: 4, display: "block" }}
        />
        {gameOver && (
          <div
            style={{
              marginTop: 12,
              color: "var(--ctp-red)",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            Game Over! Press Enter to restart
          </div>
        )}
      </div>
    </div>
  );
};

export default Snake;
