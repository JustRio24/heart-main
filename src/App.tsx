import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Heart as HeartIcon, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import TextHeart from './components/TextHeart';

const playTypingSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'square';
    osc.frequency.setValueAtTime(150 + Math.random() * 50, ctx.currentTime);
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    // ignore if audio context is blocked
  }
};

const Typewriter = ({
  text,
  delay = 45,
  onComplete,
  useSound = true,
}: {
  text: string;
  delay?: number;
  onComplete?: () => void;
  useSound?: boolean;
}) => {
  const [currentText, setCurrentText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText((prev) => prev + text[index]);
        setIndex((prev) => prev + 1);
        if (useSound && text[index] !== ' ' && text[index] !== '\n') {
          playTypingSound();
        }
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [index, text, delay, onComplete, useSound]);

  return <span className="font-mono whitespace-pre-wrap">{currentText}</span>;
};

const fadeAudio = (audio: HTMLAudioElement, targetVolume: number, duration: number) => {
  const startVolume = audio.volume;
  const steps = 20;
  const stepTime = duration / steps;
  const stepVolume = (targetVolume - startVolume) / steps;

  let currentStep = 0;
  const interval = setInterval(() => {
    currentStep++;
    let newVolume = startVolume + stepVolume * currentStep;
    if (newVolume < 0) newVolume = 0;
    if (newVolume > 1) newVolume = 1;
    audio.volume = newVolume;

    if (currentStep >= steps) {
      clearInterval(interval);
      if (targetVolume === 0) audio.pause();
    }
  }, stepTime);
};

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  text: string;
}

export default function App() {
  const [stage, setStage] = useState<'console' | 'reveal'>('console');
  const [consoleFinished, setConsoleFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [bursts, setBursts] = useState<BurstParticle[]>([]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const spawnBurst = useCallback((clientX: number, clientY: number) => {
    const symbols = ["❤️", "✨", "🌸", "💖", "★"];
    const newItems: BurstParticle[] = Array.from({ length: 4 }).map(() => ({
      id: Date.now() + Math.random(),
      x: clientX + (Math.random() * 40 - 20),
      y: clientY + (Math.random() * 40 - 20),
      size: Math.floor(Math.random() * 8) + 14,
      text: symbols[Math.floor(Math.random() * symbols.length)],
    }));

    setBursts((prev) => [...prev.slice(-15), ...newItems]);
    setTimeout(() => {
      setBursts((prev) => prev.filter((p) => !newItems.some((n) => n.id === p.id)));
    }, 1200);
  }, []);

  const handleReveal = useCallback(() => {
    if (stage === 'console' && consoleFinished) {
      setStage('reveal');
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current
          .play()
          .then(() => {
            setIsPlayingMusic(true);
            fadeAudio(audioRef.current!, 0.85, 2000);
          })
          .catch((err) => {
            console.warn("Audio autoplay blocked by browser policy:", err);
            setIsPlayingMusic(false);
          });
      }
    }
  }, [stage, consoleFinished]);

  const toggleMusic = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;

    if (isPlayingMusic) {
      fadeAudio(audioRef.current, 0, 600);
      setIsPlayingMusic(false);
    } else {
      audioRef.current.play().then(() => {
        fadeAudio(audioRef.current!, 0.85, 800);
        setIsPlayingMusic(true);
      }).catch(console.error);
    }
  }, [isPlayingMusic]);

  const handleReEncrypt = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setStage('console');
    if (audioRef.current) {
      fadeAudio(audioRef.current, 0, 1000);
      setIsPlayingMusic(false);
      setTimeout(() => {
        if (audioRef.current) audioRef.current.currentTime = 0;
      }, 1000);
    }
  }, []);

  const handleGlobalClick = (e: React.MouseEvent) => {
    spawnBurst(e.clientX, e.clientY);
    if (stage === 'console') {
      handleReveal();
    }
  };

  // Parallax calculations (subtle)
  const parallaxX = mousePos.x > 0 ? (mousePos.x / window.innerWidth - 0.5) * 30 : 0;
  const parallaxY = mousePos.y > 0 ? (mousePos.y / window.innerHeight - 0.5) * 30 : 0;

  return (
    <div
      onClick={handleGlobalClick}
      className={`relative min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-pink-deep/30 ${
        stage === 'console' && consoleFinished ? 'cursor-pointer' : ''
      } overflow-hidden`}
    >
      <audio ref={audioRef} src="/bg_music.mp3" loop preload="auto" />

      {/* Custom Mouse Cursor for Desktop */}
      <div
        className={`custom-cursor ${stage === 'console' ? 'cursor-console' : 'cursor-reveal'}`}
        style={{ left: mousePos.x, top: mousePos.y }}
      />

      {/* CRT Scanline */}
      <div className="scanline pointer-events-none" />

      {/* Ambient Pulsating Radial Glow */}
      <div
        className="ambient-aura absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(circle at 50% 48%, rgba(255, 77, 109, 0.16) 0%, rgba(255, 0, 60, 0.05) 35%, transparent 70%)',
        }}
      />

      {/* Interactive Click Bursts */}
      <div className="fixed inset-0 pointer-events-none z-50">
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 1, scale: 0.5, x: b.x, y: b.y }}
            animate={{
              opacity: 0,
              scale: 1.4,
              x: b.x + (Math.random() * 60 - 30),
              y: b.y - 70,
            }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            style={{ fontSize: `${b.size}px` }}
            className="absolute select-none"
          >
            {b.text}
          </motion.div>
        ))}
      </div>

      {/* Floating Audio Control Widget */}
      {stage === 'reveal' && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="fixed top-5 right-5 z-40"
        >
          <button
            onClick={toggleMusic}
            className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-pink-deep/20 border border-pink-500/25 backdrop-blur-md text-pink-soft text-xs font-mono transition-all duration-300 shadow-[0_0_15px_rgba(255,77,109,0.2)] pointer-events-auto"
            title={isPlayingMusic ? "Mute Music" : "Play Music"}
          >
            {isPlayingMusic ? (
              <>
                <Volume2 size={14} className="text-pink-deep animate-pulse" />
                <span className="text-[11px] tracking-wider uppercase hidden sm:inline">Music: On</span>
                <span className="flex gap-0.5 items-end h-3">
                  <span className="w-0.5 h-full bg-pink-deep animate-bounce" />
                  <span className="w-0.5 h-2/3 bg-pink-soft animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-0.5 h-full bg-pink-deep animate-bounce" style={{ animationDelay: '0.3s' }} />
                </span>
              </>
            ) : (
              <>
                <VolumeX size={14} className="text-white/40" />
                <span className="text-[11px] tracking-wider uppercase text-white/50 hidden sm:inline">Music: Off</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {stage === 'console' ? (
          <motion.div
            key="console"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-xl mx-4 p-6 sm:p-8 rounded-2xl bg-black/70 border border-pink-500/20 backdrop-blur-xl shadow-[0_0_50px_rgba(255,77,109,0.12)] font-mono text-sm md:text-base text-white/85 z-10"
          >
            {/* Window header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-pink-500/15">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              </div>
              <span className="text-[11px] text-pink-soft/60 tracking-wider">protocol://heart.v2</span>
            </div>

            <div className="space-y-3">
              <div className="flex gap-2 text-pink-soft/70">
                <span className="text-pink-deep select-none">&gt;</span>
                <Typewriter
                  text="Initializing heart.PROTOCOL_v2.0..."
                  delay={28}
                  onComplete={() => setConsoleFinished(true)}
                  useSound={true}
                />
              </div>

              <div className="flex gap-2 h-6 items-center">
                <span className="text-pink-deep select-none">&gt;</span>
                <span className="text-white/40">[status]</span>
                {consoleFinished && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-green-400 font-semibold tracking-wider text-xs px-2 py-0.5 bg-green-500/10 rounded border border-green-500/30"
                  >
                    READY
                  </motion.span>
                )}
              </div>

              {consoleFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="pt-6 flex flex-col items-start gap-5"
                >
                  <p className="text-pink-soft/80 italic text-xs sm:text-sm">
                    ✨ One encrypted package found for Princess DEA.
                  </p>

                  <button
                    id="decrypt-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReveal();
                    }}
                    className="group relative flex items-center gap-3 px-6 py-3 rounded-xl border border-pink-deep/40 bg-pink-deep/10 hover:bg-pink-deep/20 text-pink-soft hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(255,77,109,0.25)] pointer-events-auto active:scale-95"
                  >
                    <Lock size={16} className="group-hover:rotate-12 transition-transform text-pink-deep" />
                    <span className="font-mono tracking-widest uppercase text-xs font-semibold">
                      Decrypt Message
                    </span>
                    <span className="terminal-cursor" />
                  </button>

                  <p className="text-[11px] text-white/35 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-pink-soft/50 animate-pulse" />
                    <span>tap decrypt button or touch anywhere</span>
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative w-full h-screen flex items-center justify-center overflow-hidden"
          >
            {/* Ambient Background Particles */}
            {[...Array(24)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 0,
                  y: window.innerHeight + 50,
                  x: Math.random() * window.innerWidth,
                }}
                animate={{
                  opacity: [0, 0.6, 0],
                  y: -80,
                  x: Math.random() * window.innerWidth,
                }}
                transition={{
                  duration: 8 + Math.random() * 16,
                  repeat: Infinity,
                  delay: Math.random() * 8,
                  ease: 'linear',
                }}
                className="absolute w-1.5 h-1.5 bg-pink-soft/40 rounded-full blur-[1px] pointer-events-none"
              />
            ))}

            {/* Glowing Text Heart Canvas */}
            <div
              style={{
                transform: `translate(${-parallaxX * 0.5}px, ${-parallaxY * 0.5}px)`,
              }}
              className="absolute inset-0 pointer-events-none"
            >
              <TextHeart />
            </div>

            {/* Glassmorphic Cyber-Love Message Card */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 2.2, duration: 1.2, ease: 'easeOut' }}
              className="z-20 text-center max-w-lg mx-4"
              style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}
            >
              <div className="relative p-6 sm:p-8 rounded-2xl bg-black/65 border border-pink-500/25 backdrop-blur-xl shadow-[0_0_60px_rgba(255,77,109,0.18)]">
                {/* Status chip */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/25 text-pink-soft text-[10px] font-mono tracking-widest uppercase mb-5">
                  <HeartIcon size={11} className="text-pink-deep fill-pink-deep animate-pulse" />
                  <span>Decrypted // 100% Verified</span>
                </div>

                <div className="min-h-[4.5rem] text-pink-soft font-mono text-sm sm:text-base leading-relaxed drop-shadow-md">
                  <Typewriter
                    text={
                      "Dear Princess DEA,\n" +
                      "You are the most beautiful part of my code.\n" +
                      "My universe revolves around you."
                    }
                    delay={55}
                    useSound={false}
                  />
                </div>

                <div className="w-16 h-px bg-gradient-to-r from-transparent via-pink-deep/50 to-transparent mx-auto my-6" />

                <div className="flex items-center justify-center gap-4">
                  <motion.button
                    onClick={handleReEncrypt}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-white/10 hover:border-pink-500/30 bg-white/5 hover:bg-pink-500/10 text-white/50 hover:text-pink-soft transition-all text-[11px] tracking-wider font-mono uppercase pointer-events-auto"
                  >
                    <RotateCcw size={12} />
                    <span>Re-encrypt</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Subtle Tech Overlays */}
            <div className="absolute top-6 left-6 text-[10px] font-mono text-white/20 uppercase tracking-widest space-y-1 pointer-events-none hidden sm:block">
              <div>ln: 420 // heart.core</div>
              <div>id: 0xDEADBEEF</div>
              <div>status: connected_to_dea</div>
            </div>

            <div className="absolute bottom-6 right-6 text-[10px] font-mono text-white/20 uppercase tracking-widest pointer-events-none hidden sm:block">
              heart_reveal // success ✨
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
