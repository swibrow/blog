import { useState, useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  opacity: number;
}

const PARTICLE_COUNT = 40;

function createParticle(canvasWidth: number, canvasHeight: number): Particle {
  return {
    x: Math.random() * canvasWidth,
    y: Math.random() * canvasHeight,
    radius: Math.random() * 2 + 1,
    speed: Math.random() * 1 + 0.5,
    drift: Math.random() * 0.5 - 0.25,
    opacity: Math.random() * 0.5 + 0.3,
  };
}

function getInitialEnabled(): boolean {
  if (typeof window === "undefined") return false;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (prefersReducedMotion) return false;

  const stored = localStorage.getItem("snow-enabled");
  if (stored !== null) return stored === "true";

  return false;
}

const SnowEffect = () => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    setEnabled(getInitialEnabled());
    setMounted(true);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach((particle) => {
      particle.y += particle.speed;
      particle.x += particle.drift;

      if (particle.y > canvas.height) {
        particle.y = -particle.radius;
        particle.x = Math.random() * canvas.width;
      }
      if (particle.x > canvas.width) {
        particle.x = 0;
      } else if (particle.x < 0) {
        particle.x = canvas.width;
      }

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
      ctx.fill();
    });

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = (): void => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    handleResize();
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
      createParticle(canvas.width, canvas.height)
    );

    animationRef.current = requestAnimationFrame(animate);
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      window.removeEventListener("resize", handleResize);
    };
  }, [enabled, animate]);

  const toggle = (): void => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem("snow-enabled", String(next));
  };

  if (!mounted) return null;

  return (
    <>
      {enabled && (
        <canvas
          ref={canvasRef}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            pointerEvents: "none",
            zIndex: 999,
          }}
        />
      )}
      <button
        onClick={toggle}
        aria-label={enabled ? "Disable snow effect" : "Enable snow effect"}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "1.2rem",
          padding: "4px",
          opacity: enabled ? 1 : 0.5,
        }}
      >
        &#10052;
      </button>
    </>
  );
};

export default SnowEffect;
