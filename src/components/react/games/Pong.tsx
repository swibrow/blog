import { useEffect, useRef, useCallback, useState } from "react";

interface GameProps {
  onExit: () => void;
}

const WIDTH = 400;
const HEIGHT = 300;
const PADDLE_W = 8;
const PADDLE_H = 60;
const BALL_R = 5;
const PADDLE_SPEED = 5;
const BALL_SPEED_INIT = 3;
const AI_SPEED = 3;

const Pong = ({ onExit }: GameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [playerScore, setPlayerScore] = useState(0);
  const [aiScore, setAiScore] = useState(0);

  const stateRef = useRef({
    playerY: HEIGHT / 2 - PADDLE_H / 2,
    aiY: HEIGHT / 2 - PADDLE_H / 2,
    ballX: WIDTH / 2,
    ballY: HEIGHT / 2,
    ballVX: BALL_SPEED_INIT,
    ballVY: BALL_SPEED_INIT * (Math.random() > 0.5 ? 1 : -1),
    playerScore: 0,
    aiScore: 0,
    paused: false,
  });

  const resetBall = useCallback((direction: number) => {
    const s = stateRef.current;
    s.ballX = WIDTH / 2;
    s.ballY = HEIGHT / 2;
    s.ballVX = BALL_SPEED_INIT * direction;
    s.ballVY = BALL_SPEED_INIT * (Math.random() > 0.5 ? 1 : -1);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = getComputedStyle(document.documentElement);
    const base = style.getPropertyValue("--ctp-base").trim() || "#1e1e2e";
    const text = style.getPropertyValue("--ctp-text").trim() || "#cdd6f4";
    const surface0 =
      style.getPropertyValue("--ctp-surface0").trim() || "#313244";
    const green = style.getPropertyValue("--ctp-green").trim() || "#a6e3a1";
    const blue = style.getPropertyValue("--ctp-blue").trim() || "#89b4fa";

    const s = stateRef.current;

    // Background
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Center line
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = surface0;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0);
    ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score
    ctx.fillStyle = text;
    ctx.font = "24px 'Fira Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(String(s.playerScore), WIDTH / 2 - 40, 30);
    ctx.fillText(String(s.aiScore), WIDTH / 2 + 40, 30);

    // Player paddle (left)
    ctx.fillStyle = blue;
    ctx.fillRect(10, s.playerY, PADDLE_W, PADDLE_H);

    // AI paddle (right)
    ctx.fillStyle = green;
    ctx.fillRect(WIDTH - 10 - PADDLE_W, s.aiY, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillStyle = text;
    ctx.beginPath();
    ctx.arc(s.ballX, s.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const update = useCallback(() => {
    const s = stateRef.current;
    if (s.paused) return;

    // Player movement
    const keys = keysRef.current;
    if ((keys.has("ArrowUp") || keys.has("w")) && s.playerY > 0) {
      s.playerY -= PADDLE_SPEED;
    }
    if (
      (keys.has("ArrowDown") || keys.has("s")) &&
      s.playerY < HEIGHT - PADDLE_H
    ) {
      s.playerY += PADDLE_SPEED;
    }

    // AI movement
    const aiCenter = s.aiY + PADDLE_H / 2;
    if (aiCenter < s.ballY - 10) {
      s.aiY += Math.min(AI_SPEED, s.ballY - aiCenter);
    } else if (aiCenter > s.ballY + 10) {
      s.aiY -= Math.min(AI_SPEED, aiCenter - s.ballY);
    }
    s.aiY = Math.max(0, Math.min(HEIGHT - PADDLE_H, s.aiY));

    // Ball movement
    s.ballX += s.ballVX;
    s.ballY += s.ballVY;

    // Top/bottom bounce
    if (s.ballY - BALL_R <= 0 || s.ballY + BALL_R >= HEIGHT) {
      s.ballVY *= -1;
      s.ballY = Math.max(BALL_R, Math.min(HEIGHT - BALL_R, s.ballY));
    }

    // Player paddle collision
    if (
      s.ballX - BALL_R <= 10 + PADDLE_W &&
      s.ballX - BALL_R >= 10 &&
      s.ballY >= s.playerY &&
      s.ballY <= s.playerY + PADDLE_H
    ) {
      s.ballVX = Math.abs(s.ballVX) * 1.05;
      const offset = (s.ballY - (s.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      s.ballVY = offset * 4;
      s.ballX = 10 + PADDLE_W + BALL_R;
    }

    // AI paddle collision
    if (
      s.ballX + BALL_R >= WIDTH - 10 - PADDLE_W &&
      s.ballX + BALL_R <= WIDTH - 10 &&
      s.ballY >= s.aiY &&
      s.ballY <= s.aiY + PADDLE_H
    ) {
      s.ballVX = -Math.abs(s.ballVX) * 1.05;
      const offset = (s.ballY - (s.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      s.ballVY = offset * 4;
      s.ballX = WIDTH - 10 - PADDLE_W - BALL_R;
    }

    // Scoring
    if (s.ballX < 0) {
      s.aiScore += 1;
      setAiScore(s.aiScore);
      resetBall(1);
    } else if (s.ballX > WIDTH) {
      s.playerScore += 1;
      setPlayerScore(s.playerScore);
      resetBall(-1);
    }
  }, [resetBall]);

  useEffect(() => {
    let frameId: number;

    const loop = () => {
      update();
      draw();
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [update, draw]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onExit();
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "w", "s"].includes(e.key)
      ) {
        e.preventDefault();
      }
      keysRef.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
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
            <span style={{ color: "var(--ctp-blue)" }}>You</span> vs{" "}
            <span style={{ color: "var(--ctp-green)" }}>AI</span>
          </span>
          <span style={{ color: "var(--ctp-subtext0)", fontSize: 11 }}>
            W/S or Arrow Up/Down | ESC to exit
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          style={{ borderRadius: 4, display: "block" }}
        />
      </div>
    </div>
  );
};

export default Pong;
