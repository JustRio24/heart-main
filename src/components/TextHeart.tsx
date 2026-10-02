import React, { useEffect, useRef } from 'react';

interface Point {
  x: number;
  y: number;
  alpha: number;
  targetAlpha: number;
  delay: number;
  text: string;
  colorOffset: number;
}

const words = [
  "Princess DEA",
  "I Love You",
  "Beautiful",
  "My Everything",
  "Fav Person",
  "My Universe",
  "Always You",
  "Forever DEA",
  "❤️",
  "My Safe Place",
];

export default function TextHeart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let points: Point[] = [];
    let dpr = window.devicePixelRatio || 1;
    let fontSize = 14;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Handle HiDPI / Retina displays
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const isMobile = width < 640;
      fontSize = isMobile ? 11 : 14;

      initPoints(width, height, isMobile);
    };

    const initPoints = (width: number, height: number, isMobile: boolean) => {
      points = [];
      const centerX = width / 2;
      const centerY = height / 2 - (isMobile ? 25 : 15);
      
      // Scaling responsive for small viewports
      const scale = isMobile
        ? Math.min(width, height) / 38
        : Math.min(width, height) / 45;

      const addPoint = (t: number, s: number = 1, delayOffset: number = 0) => {
        // Parametric heart curve
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

        points.push({
          x: centerX + x * scale * s,
          y: centerY + y * scale * s,
          alpha: 0,
          targetAlpha: (0.45 + Math.random() * 0.45) * (s === 1 ? 1.4 : 1),
          delay: Math.random() * 1800 + delayOffset,
          text: words[Math.floor(Math.random() * words.length)],
          colorOffset: Math.random() * 40 - 20,
        });
      };

      // Outer outline
      const stepOutline = isMobile ? 0.07 : 0.05;
      for (let t = 0; t < Math.PI * 2; t += stepOutline) {
        addPoint(t, 1, 0);
      }

      // Inner fill layers
      for (let s = 0.25; s < 1; s += 0.22) {
        const stepFill = isMobile ? 0.14 : 0.1;
        for (let t = 0; t < Math.PI * 2; t += stepFill) {
          addPoint(t, s, 800);
        }
      }
    };

    let start: number | null = null;
    const draw = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;

      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 640;

      // Organic Lub-Dub Heartbeat Rhythm:
      // Two quick successive contractions (lub-dub) followed by rest
      const cycle = (time * 0.0032) % (Math.PI * 2);
      const beat1 = Math.pow(Math.max(0, Math.sin(cycle)), 32) * 0.09;
      const beat2 = Math.pow(Math.max(0, Math.sin(cycle - 0.45)), 32) * 0.06;
      const beat = 1 + beat1 + beat2;

      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontSize}px "Fira Code", monospace`;

      const centerX = width / 2;
      const centerY = height / 2 - (isMobile ? 25 : 15);
      const blurAmount = isMobile ? 5 : 8;

      points.forEach((p) => {
        if (elapsed > p.delay) {
          p.alpha += (p.targetAlpha - p.alpha) * 0.025;
        }

        if (p.alpha <= 0.01) return;

        // Apply heartbeat scale relative to center
        const px = centerX + (p.x - centerX) * beat;
        const py = centerY + (p.y - centerY) * beat;

        // Dynamic hue shimmer around rose-pink (345)
        const hue = 345 + p.colorOffset + Math.sin(time * 0.0012) * 12;
        const color = `hsla(${hue}, 100%, 68%, ${p.alpha})`;

        // Glow neon bloom
        ctx.shadowColor = `hsla(${hue}, 100%, 65%, ${p.alpha * 0.85})`;
        ctx.shadowBlur = blurAmount;
        ctx.fillStyle = color;

        ctx.fillText(p.text, px - ctx.measureText(p.text).width / 2, py);
      });

      // Reset shadow for next frame
      ctx.shadowBlur = 0;

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-10"
    />
  );
}
