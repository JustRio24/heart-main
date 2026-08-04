import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Lock, Heart as HeartIcon, Sparkles } from 'lucide-react';
import TextHeart from './components/TextHeart';
import bgMusic from './music/bg_music.mp3';

const playTypingSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(150 + Math.random() * 50, ctx.currentTime);
        gain.gain.setValueAtTime(0.01, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {
        // ignore if not supported or blocked
    }
};

const Typewriter = ({ text, delay = 50, onComplete, useSound = true }: { text: string, delay?: number, onComplete?: () => void, useSound?: boolean }) => {
  const [currentText, setCurrentText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
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
      let newVolume = startVolume + (stepVolume * currentStep);
      if (newVolume < 0) newVolume = 0;
      if (newVolume > 1) newVolume = 1;
      audio.volume = newVolume;
      
      if (currentStep >= steps) {
        clearInterval(interval);
        if (targetVolume === 0) audio.pause();
      }
    }, stepTime);
};

export default function App() {
  const [stage, setStage] = useState<'console' | 'reveal'>('console');
  const [consoleFinished, setConsoleFinished] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleReveal = useCallback(() => {
    if (stage === 'console' && consoleFinished) {
      setStage('reveal');
      if (audioRef.current) {
        audioRef.current.volume = 0;
        audioRef.current.play().catch(console.error);
        fadeAudio(audioRef.current, 1, 2000);
      }
    }
  }, [stage, consoleFinished]);

  const handleReEncrypt = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setStage('console');
    if (audioRef.current) {
      fadeAudio(audioRef.current, 0, 1000);
      setTimeout(() => {
          if (audioRef.current) audioRef.current.currentTime = 0;
      }, 1000);
    }
  }, []);

  // Parallax calculations
  const parallaxX = (mousePos.x / window.innerWidth - 0.5) * 40;
  const parallaxY = (mousePos.y / window.innerHeight - 0.5) * 40;

  return (
    <div 
      onClick={handleReveal}
      className={`relative min-h-screen w-full flex items-center justify-center bg-[#050505] selection:bg-pink-deep/30 ${stage === 'console' && consoleFinished ? 'cursor-pointer' : ''} overflow-hidden`}
    >
      <div 
        className={`custom-cursor ${stage === 'console' ? 'cursor-console' : 'cursor-reveal'}`} 
        style={{ left: mousePos.x, top: mousePos.y }} 
      />

      <audio ref={audioRef} src={bgMusic} loop />
      <div className="scanline pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {stage === 'console' ? (
          <motion.div
            key="console"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full max-w-2xl p-8 font-mono text-sm md:text-base text-white/80 z-10"
          >
            <div className="space-y-2">
              <div className="flex gap-2 text-pink-soft/60">
                <span>[system]</span>
                <Typewriter 
                  text="Initializing heart.PROTOCOL_v2.0..." 
                  delay={30} 
                  onComplete={() => setConsoleFinished(true)}
                  useSound={true}
                />
              </div>
              
              <div className="flex gap-2 h-6">
                <span>[status]</span>
                {consoleFinished && (
                    <motion.span 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="text-green-400"
                    >
                        READY
                    </motion.span>
                )}
              </div>

              {consoleFinished && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pt-8 flex flex-col items-start gap-6"
                >
                  <p className="text-white/40 italic">
                    {">"} One encrypted package found for you.
                  </p>
                  
                  <button
                    id="decrypt-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReveal();
                    }}
                    className="group flex items-center gap-3 px-6 py-3 border border-pink-deep/30 bg-pink-deep/5 hover:bg-pink-deep/10 text-pink-soft transition-all duration-300 pointer-events-auto"
                  >
                    <Lock size={16} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-mono tracking-widest uppercase text-xs">Decrypt Message</span>
                    <span className="terminal-cursor" />
                  </button>
                  
                  <p className="text-[10px] text-white/20 animate-pulse">
                    (or just click anywhere)
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
            className="relative w-full h-screen flex items-center justify-center overflow-hidden"
          >
            {/* Particles */}
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{
                        opacity: 0,
                        y: window.innerHeight + 100,
                        x: Math.random() * window.innerWidth
                    }}
                    animate={{
                        opacity: [0, 0.5, 0],
                        y: -100,
                        x: Math.random() * window.innerWidth
                    }}
                    transition={{
                        duration: 10 + Math.random() * 20,
                        repeat: Infinity,
                        delay: Math.random() * 10,
                        ease: "linear"
                    }}
                    className="absolute w-1 h-1 bg-pink-soft/50 rounded-full blur-[1px] pointer-events-none"
                />
            ))}

            <div style={{ transform: `translate(${-parallaxX * 0.5}px, ${-parallaxY * 0.5}px)` }} className="absolute inset-0 pointer-events-none">
              <TextHeart />
            </div>
            
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 3, duration: 1.5 }}
              className="z-20 text-center"
              style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}
            >
              <div className="mb-4 min-h-[4rem] text-pink-soft max-w-md mx-auto text-sm md:text-base leading-relaxed drop-shadow-lg">
                <Typewriter 
                    text={"Dear Princess DEA,\nYou are the most beautiful part of my code.\nMy universe revolves around you."}
                    delay={60}
                    useSound={false}
                />
              </div>
              
              <h2 className="text-pink-deep font-mono text-xl tracking-[0.3em] uppercase glow-text mb-4 mt-8">
                Decrypted
              </h2>
              <div className="w-12 h-px bg-pink-deep/30 mx-auto mb-8" />
              
              <motion.button
                onClick={handleReEncrypt}
                className="text-white/20 hover:text-white/60 transition-colors uppercase text-[10px] tracking-widest font-mono pointer-events-auto"
              >
                Re-encrypt
              </motion.button>
            </motion.div>

            {/* Subtle tech overlays */}
            <div className="absolute top-8 left-8 text-[10px] font-mono text-white/10 uppercase tracking-widest space-y-1 pointer-events-none">
                <div>ln: 420</div>
                <div>id: 0xDEADBEEF</div>
                <div>type: organic_emotion</div>
            </div>
            
            <div className="absolute bottom-8 right-8 text-[10px] font-mono text-white/10 uppercase tracking-widest pointer-events-none">
                heart_reveal // success
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

