import React, { useEffect, useRef } from 'react';

/**
 * Fireworks — canvas particle engine for the heart site background.
 *
 * - Rockets launch from the bottom and explode into glowing sparks
 * - Occasional heart-shaped bursts (matches the theme)
 * - Click / tap anywhere launches a rocket toward that point
 * - Respects prefers-reduced-motion and pauses when the tab is hidden
 */

type Intensity = 'low' | 'high' | 'off';

interface FireworksProps {
  intensity?: Intensity;
  /** Bump this number to trigger a celebratory finale sequence. */
  finaleSignal?: number;
}

interface Rocket {
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  hue: number;
  heart: boolean;
  trail: { x: number; y: number }[];
  dead: boolean;
}

interface Spark {
  x: number;
  y: number;
  px: number;
  py: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
  drag: number;
  gravity: number;
  glitter: boolean;
}

const PALETTE = [345, 330, 355, 300, 285, 40, 0, 190];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Point on the classic parametric heart, normalized to roughly [-1, 1]. */
function heartPoint(t: number): { x: number; y: number } {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x: x / 17, y: y / 17 };
}

export default function Fireworks({ intensity = 'high', finaleSignal = 0 }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef<Intensity>(intensity);
  const finaleRef = useRef(finaleSignal);
  const launchRef = useRef<((x?: number, y?: number) => void) | null>(null);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    finaleRef.current = finaleSignal;
    if (finaleSignal > 0 && launchRef.current) {
      // Celebratory finale: a rapid volley of bursts across the sky.
      const timers: number[] = [];
      for (let i = 0; i < 10; i++) {
        timers.push(
          window.setTimeout(() => launchRef.current?.(), 90 * i + Math.random() * 120)
        );
      }
      return () => timers.forEach((t) => window.clearTimeout(t));
    }
  }, [finaleSignal]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    let raf = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const rockets: Rocket[] = [];
    const sparks: Spark[] = [];

    const MAX_SPARKS = 1400;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawnSparks = (x: number, y: number, hue: number, heart: boolean) => {
      const high = intensityRef.current === 'high';
      const count = high ? Math.floor(rand(90, 140)) : Math.floor(rand(45, 75));
      const speed = high ? rand(2.2, 5.4) : rand(1.6, 3.6);
      const baseLife = high ? rand(55, 100) : rand(40, 75);

      for (let i = 0; i < count; i++) {
        if (sparks.length >= MAX_SPARKS) break;

        let vx: number;
        let vy: number;

        if (heart) {
          // Even spacing around the heart curve gives a recognizable outline.
          const t = (i / count) * Math.PI * 2;
          const p = heartPoint(t);
          const jitter = rand(0.86, 1.14);
          vx = p.x * speed * jitter;
          vy = p.y * speed * jitter;
        } else {
          const angle = rand(0, Math.PI * 2);
          const r = Math.sqrt(Math.random()) * speed;
          vx = Math.cos(angle) * r;
          vy = Math.sin(angle) * r;
        }

        sparks.push({
          x,
          y,
          px: x,
          py: y,
          vx,
          vy,
          life: baseLife * rand(0.75, 1.15),
          maxLife: baseLife,
          hue: hue + rand(-16, 16),
          size: rand(1.1, 2.4),
          drag: rand(0.975, 0.988),
          gravity: rand(0.035, 0.075),
          glitter: Math.random() < 0.28,
        });
      }
    };

    const launch = (targetX?: number, targetY?: number) => {
      if (rockets.length > 8) return;

      const high = intensityRef.current === 'high';
      const startX = targetX !== undefined ? targetX + rand(-40, 40) : rand(width * 0.12, width * 0.88);
      const destY = targetY !== undefined ? targetY : rand(height * 0.12, height * 0.48);
      const frames = rand(42, 68);
      const startY = height + 10;

      rockets.push({
        x: startX,
        y: startY,
        vx: ((targetX ?? startX) - startX) / frames,
        vy: (destY - startY) / frames,
        targetY: destY,
        hue: pick(PALETTE),
        heart: high ? Math.random() < 0.28 : Math.random() < 0.12,
        trail: [],
        dead: false,
      });
    };

    let lastAuto = 0;
    let nextAuto = rand(500, 1200);

    launchRef.current = launch;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // User can switch the effect off at runtime; keep the loop cheap.
      if (intensityRef.current === 'off') {
        rockets.length = 0;
        sparks.length = 0;
        raf = requestAnimationFrame(draw);
        return;
      }

      ctx.globalCompositeOperation = 'lighter';

      // ---- rockets ----
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];

        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 7) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.028; // gentle arc
        r.vx *= 0.995;

        // Trail
        for (let t = 0; t < r.trail.length; t++) {
          const p = r.trail[t];
          const a = (t / r.trail.length) * 0.55;
          ctx.fillStyle = `hsla(${r.hue}, 100%, 75%, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Head
        ctx.fillStyle = `hsla(${r.hue}, 100%, 88%, 0.95)`;
        ctx.shadowColor = `hsla(${r.hue}, 100%, 70%, 0.9)`;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        if (r.y <= r.targetY || r.vy >= 0) {
          spawnSparks(r.x, r.y, r.hue, r.heart);
          rockets.splice(i, 1);
        }
      }

      // ---- sparks ----
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];

        s.px = s.x;
        s.py = s.y;
        s.vx *= s.drag;
        s.vy = s.vy * s.drag + s.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= 1;

        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }

        const lifeRatio = s.life / s.maxLife;
        const alpha = Math.min(1, lifeRatio * 1.35);
        const flicker = s.glitter && Math.random() < 0.35 ? 0.25 : 1;
        const a = alpha * flicker;

        // Streak from previous position
        ctx.strokeStyle = `hsla(${s.hue}, 100%, ${65 + lifeRatio * 20}%, ${a})`;
        ctx.lineWidth = s.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';

      // ---- auto launch ----
      const now = performance.now();
      if (now - lastAuto > nextAuto) {
        lastAuto = now;
        const high = intensityRef.current === 'high';
        nextAuto = high ? rand(700, 1600) : rand(2600, 4800);
        launch();
        if (high && Math.random() < 0.35) {
          setTimeout(() => launch(), rand(120, 380));
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (intensityRef.current === 'off') return;
      launch(e.clientX, Math.max(e.clientY, height * 0.08));
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(draw);
      }
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('visibilitychange', handleVisibility);

    resize();
    // Seed the scene so the background is alive immediately.
    launch();
    setTimeout(() => launch(), 400);
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      launchRef.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
