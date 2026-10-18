import React, { useEffect, useRef } from 'react';

/**
 * Fireworks — canvas particle engine for the heart site background.
 *
 * Rendering notes (why it looks the way it does):
 * - Trails come from fading the previous frame with `destination-out`, not from
 *   clearRect. That keeps the canvas transparent (the page background shows
 *   through) while leaving glowing streaks behind every spark.
 * - Sparks are stroked with a `shadowBlur` halo so they read as light, not dots.
 * - Intensity scales burst size + launch rate; `off` stops all emission.
 */

type Intensity = 'low' | 'medium' | 'high' | 'off';

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

interface Flash {
  x: number;
  y: number;
  hue: number;
  life: number;
  maxLife: number;
  radius: number;
}

const PALETTE = [345, 332, 352, 300, 285, 45, 0, 195, 320];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Point on the classic parametric heart, normalized to roughly [-1, 1]. */
function heartPoint(t: number): { x: number; y: number } {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
  return { x: x / 17, y: y / 17 };
}

const TUNING = {
  low: {
    sparks: [70, 105] as [number, number],
    speed: [2.6, 5.2] as [number, number],
    life: [55, 95] as [number, number],
    every: [1100, 2100] as [number, number],
    size: [1.6, 3.0] as [number, number],
    heartChance: 0.15,
  },
  medium: {
    sparks: [110, 160] as [number, number],
    speed: [3.2, 6.4] as [number, number],
    life: [60, 110] as [number, number],
    every: [750, 1500] as [number, number],
    size: [1.8, 3.4] as [number, number],
    heartChance: 0.22,
  },
  high: {
    sparks: [160, 230] as [number, number],
    speed: [3.6, 7.2] as [number, number],
    life: [65, 120] as [number, number],
    every: [420, 950] as [number, number],
    size: [2.0, 3.8] as [number, number],
    heartChance: 0.3,
  },
};

type TuningKey = keyof typeof TUNING;

export default function Fireworks({ intensity = 'high', finaleSignal = 0 }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef<Intensity>(intensity);
  const launchRef = useRef<((x?: number, y?: number) => void) | null>(null);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  useEffect(() => {
    if (finaleSignal <= 0) return;
    const timers: number[] = [];
    for (let i = 0; i < 14; i++) {
      timers.push(window.setTimeout(() => launchRef.current?.(), 80 * i + Math.random() * 90));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
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
    const flashes: Flash[] = [];
    const MAX_SPARKS = 2200;

    const tune = (): (typeof TUNING)[TuningKey] =>
      TUNING[(intensityRef.current === 'off' ? 'medium' : intensityRef.current) as TuningKey];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
    };

    const spawnSparks = (x: number, y: number, hue: number, heart: boolean) => {
      const t = tune();
      const count = Math.floor(rand(t.sparks[0], t.sparks[1]));
      const speed = rand(t.speed[0], t.speed[1]);
      const baseLife = rand(t.life[0], t.life[1]);

      flashes.push({ x, y, hue, life: 14, maxLife: 14, radius: rand(60, 110) });

      for (let i = 0; i < count; i++) {
        if (sparks.length >= MAX_SPARKS) break;

        let vx: number;
        let vy: number;

        if (heart) {
          // Even spacing around the heart curve keeps the silhouette readable.
          const ang = (i / count) * Math.PI * 2;
          const p = heartPoint(ang);
          const jitter = rand(0.9, 1.1);
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
          life: baseLife * rand(0.8, 1.2),
          maxLife: baseLife,
          hue: hue + rand(-18, 18),
          size: rand(t.size[0], t.size[1]),
          drag: rand(0.972, 0.986),
          gravity: rand(0.04, 0.085),
          glitter: Math.random() < 0.3,
        });
      }
    };

    const launch = (targetX?: number, targetY?: number) => {
      if (rockets.length > 12) return;

      const t = tune();
      const startX = targetX !== undefined ? targetX + rand(-30, 30) : rand(width * 0.08, width * 0.92);
      const destY = targetY !== undefined ? targetY : rand(height * 0.1, height * 0.5);
      const frames = rand(38, 60);
      const startY = height + 10;

      rockets.push({
        x: startX,
        y: startY,
        vx: ((targetX ?? startX) - startX) / frames,
        vy: (destY - startY) / frames,
        targetY: destY,
        hue: pick(PALETTE),
        heart: Math.random() < t.heartChance,
        trail: [],
      });
    };

    let lastAuto = 0;
    let nextAuto = 350;

    launchRef.current = launch;

    const draw = () => {
      // Fade the previous frame instead of clearing it: transparent canvas plus
      // long glowing trails. 0.19 leaves a ~0.5s tail at 60fps.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.19)';
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      if (intensityRef.current === 'off') {
        rockets.length = 0;
        sparks.length = 0;
        flashes.length = 0;
        ctx.globalCompositeOperation = 'source-over';
        raf = requestAnimationFrame(draw);
        return;
      }

      // ---- explosion flashes ----
      for (let i = flashes.length - 1; i >= 0; i--) {
        const f = flashes[i];
        f.life -= 1;
        if (f.life <= 0) {
          flashes.splice(i, 1);
          continue;
        }
        const k = f.life / f.maxLife;
        const r = f.radius * (1.6 - k);
        const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r);
        grad.addColorStop(0, `hsla(${f.hue}, 100%, 88%, ${0.5 * k})`);
        grad.addColorStop(0.4, `hsla(${f.hue}, 100%, 65%, ${0.16 * k})`);
        grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ---- rockets ----
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];

        r.trail.push({ x: r.x, y: r.y });
        if (r.trail.length > 10) r.trail.shift();

        r.x += r.vx;
        r.y += r.vy;
        r.vy += 0.03; // gentle arc
        r.vx *= 0.995;

        for (let t = 0; t < r.trail.length; t++) {
          const p = r.trail[t];
          const a = (t / r.trail.length) * 0.8;
          ctx.fillStyle = `hsla(${r.hue}, 100%, 78%, ${a})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `hsla(${r.hue}, 100%, 92%, 1)`;
        ctx.shadowColor = `hsla(${r.hue}, 100%, 70%, 1)`;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 2.6, 0, Math.PI * 2);
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
        const alpha = Math.min(1, lifeRatio * 1.6);
        const flicker = s.glitter && Math.random() < 0.3 ? 0.3 : 1;
        const a = alpha * flicker;
        const light = 70 + lifeRatio * 25;

        ctx.strokeStyle = `hsla(${s.hue}, 100%, ${light}%, ${a})`;
        ctx.lineWidth = s.size;
        ctx.lineCap = 'round';
        ctx.shadowColor = `hsla(${s.hue}, 100%, 65%, ${a * 0.9})`;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(s.px, s.py);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      ctx.globalCompositeOperation = 'source-over';

      // ---- auto launch ----
      const now = performance.now();
      if (now - lastAuto > nextAuto) {
        lastAuto = now;
        const t = tune();
        nextAuto = rand(t.every[0], t.every[1]);
        launch();
        if (intensityRef.current !== 'low' && Math.random() < 0.45) {
          setTimeout(() => launch(), rand(110, 340));
        }
      }

      raf = requestAnimationFrame(draw);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (intensityRef.current === 'off') return;
      launch(e.clientX, Math.max(e.clientY, height * 0.08));
      // Small volley so a tap feels rewarding.
      setTimeout(() => launch(), 140);
      setTimeout(() => launch(), 300);
    };

    const handleVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('visibilitychange', handleVisibility);

    resize();
    // Seed the sky immediately so the first paint already has fireworks.
    launch(width * 0.3, height * 0.3);
    setTimeout(() => launch(width * 0.7, height * 0.25), 250);
    setTimeout(() => launch(), 600);
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
