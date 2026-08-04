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

const words = ["Princess DEA", "I Love You", "Beautiful", "My Everything", "Forever"];

export default function TextHeart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let points: Point[] = [];
    const fontSize = 14;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initPoints();
    };

    const initPoints = () => {
      points = [];
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) / 45;

      const addPoint = (t: number, s: number = 1, delayOffset: number = 0) => {
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
        
        points.push({
          x: centerX + x * scale * s,
          y: centerY + y * scale * s,
          alpha: 0,
          targetAlpha: (0.4 + Math.random() * 0.4) * (s === 1 ? 1.5 : 1),
          delay: Math.random() * 2000 + delayOffset,
          text: words[Math.floor(Math.random() * words.length)],
          colorOffset: Math.random() * 40 - 20
        });
      };
      
      for (let t = 0; t < Math.PI * 2; t += 0.05) {
        addPoint(t, 1, 0);
      }

      for (let s = 0.2; s < 1; s += 0.2) {
          for (let t = 0; t < Math.PI * 2; t += 0.1) {
            addPoint(t, s, 1000);
          }
      }
    };

    let start: number | null = null;
    const draw = (time: number) => {
      if (!start) start = time;
      const elapsed = time - start;

      // Heartbeat pulse effect: subtle scale over time
      const beat = Math.sin(time * 0.003) * 0.05 + 1;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${fontSize}px "Fira Code", monospace`;
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      points.forEach(p => {
        if (elapsed > p.delay) {
            p.alpha += (p.targetAlpha - p.alpha) * 0.02;
        }

        // Apply heartbeat scale
        const px = centerX + (p.x - centerX) * beat;
        const py = centerY + (p.y - centerY) * beat;

        // Dynamic color hue shift based on time and individual offset
        // Base pink is around hue 345
        const hue = 345 + p.colorOffset + Math.sin(time * 0.001) * 10;
        ctx.fillStyle = `hsla(${hue}, 100%, 65%, ${p.alpha})`;
        
        ctx.fillText(p.text, px - ctx.measureText(p.text).width / 2, py);
      });

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
