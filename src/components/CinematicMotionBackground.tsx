import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Pause, Play, RotateCcw, Sliders, Sparkles } from 'lucide-react';

interface CinematicMotionBackgroundProps {
  onTogglePlay?: (isPlaying: boolean) => void;
  videoSrc?: string;
  posterSrc?: string;
  showControls?: boolean;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  alpha: number;
  baseAlpha: number;
  color: string;
  pulseSpeed: number;
  pulseOffset: number;
}

interface DataTrack {
  y: number;
  speed: number;
  lineAlpha: number;
  nodes: { x: number; size: number }[];
  packets: { x: number; speed: number; length: number; alpha: number }[];
}

export const CinematicMotionBackground: React.FC<CinematicMotionBackgroundProps> = ({
  videoSrc = '/dw-brand-animation.mp4',
  posterSrc = '/dw-brand-poster.jpg',
  showControls = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [videoOpacity, setVideoOpacity] = useState(0.42);
  const [showSettings, setShowSettings] = useState(false);

  // Toggle video & canvas animation
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const restart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsPlaying(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initDataTracks();
    };
    window.addEventListener('resize', handleResize);

    // 1. Bokeh motes (Soft volumetric drifting particles in brand colors)
    const bokehCount = Math.min(38, Math.floor(width / 42));
    const bokehMotes: Particle[] = [];
    const brandColors = [
      'rgba(223, 186, 107, ', // --text-primary-gold (#dfba6b)
      'rgba(229, 192, 123, ', // Gold bright (#e5c07b)
      'rgba(77, 182, 172, ',  // --logo-gradient-bottom Mint Green / Teal (#4db6ac)
      'rgba(156, 39, 176, ',  // --logo-gradient-top Deep Magenta-Violet (#9c27b0)
      'rgba(255, 255, 255, ', // --text-white Pure White sparkles
    ];

    for (let i = 0; i < bokehCount; i++) {
      const baseAlpha = 0.15 + Math.random() * 0.35;
      bokehMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 1.5 + Math.random() * 4.5,
        speedX: (Math.random() - 0.5) * 0.35 + 0.15, // Gentle right drift
        speedY: -0.15 - Math.random() * 0.3, // Soft upward drift
        alpha: baseAlpha,
        baseAlpha,
        color: brandColors[Math.floor(Math.random() * brandColors.length)],
        pulseSpeed: 0.015 + Math.random() * 0.03,
        pulseOffset: Math.random() * Math.PI * 2,
      });
    }

    // 2. Horizontal Data Lines & Streaming Packets (Lower third of frame: y ~ 64% - 94%)
    let dataTracks: DataTrack[] = [];
    const initDataTracks = () => {
      dataTracks = [];
      const lowerThirdStart = height * 0.64;
      const lowerThirdHeight = height * 0.28;
      const trackCount = 6;

      for (let i = 0; i < trackCount; i++) {
        const trackY = lowerThirdStart + (lowerThirdHeight / (trackCount - 1)) * i;
        const nodeCount = 4 + Math.floor(Math.random() * 4);
        const nodes: { x: number; size: number }[] = [];
        for (let n = 0; n < nodeCount; n++) {
          nodes.push({
            x: (width / (nodeCount + 1)) * (n + 1) + (Math.random() - 0.5) * 60,
            size: 2 + Math.random() * 2.5,
          });
        }

        const packetCount = 2 + Math.floor(Math.random() * 3);
        const packets: { x: number; speed: number; length: number; alpha: number }[] = [];
        for (let p = 0; p < packetCount; p++) {
          packets.push({
            x: Math.random() * width,
            speed: 1.2 + Math.random() * 2.2,
            length: 35 + Math.random() * 80,
            alpha: 0.4 + Math.random() * 0.5,
          });
        }

        dataTracks.push({
          y: trackY,
          speed: 1 + i * 0.3,
          lineAlpha: 0.14 + Math.random() * 0.16,
          nodes,
          packets,
        });
      }
    };
    initDataTracks();

    // 3. Animation Loop
    let time = 0;
    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      // --- A. Draw Horizontal Thin Glowing Gold & Mint Teal Data Lines (Lower Third) ---
      for (let i = 0; i < dataTracks.length; i++) {
        const track = dataTracks[i];
        const isTealTrack = i % 2 === 1;

        // Base thin data rail (Gold / Mint Teal)
        ctx.beginPath();
        ctx.moveTo(0, track.y);
        ctx.lineTo(width, track.y);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = isTealTrack
          ? `rgba(77, 182, 172, ${track.lineAlpha * (0.8 + 0.2 * Math.sin(time * 2 + i))})`
          : `rgba(223, 186, 107, ${track.lineAlpha * (0.8 + 0.2 * Math.sin(time * 2 + i))})`;
        ctx.stroke();

        // Connective inter-track circuit diagonals (symbolizing ERP sync mesh)
        if (i < dataTracks.length - 1 && i % 2 === 0) {
          const nextTrack = dataTracks[i + 1];
          const crossX = ((time * 25 * (i + 1)) % (width + 400)) - 200;
          ctx.beginPath();
          ctx.moveTo(crossX, track.y);
          ctx.lineTo(crossX + 40, nextTrack.y);
          ctx.lineWidth = 0.5;
          ctx.strokeStyle = 'rgba(77, 182, 172, 0.18)';
          ctx.stroke();
        }

        // Draw nodes on rail
        for (const node of track.nodes) {
          const pulse = Math.sin(time * 3 + node.x * 0.01) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.arc(node.x, track.y, node.size + pulse * 2, 0, Math.PI * 2);
          ctx.fillStyle = isTealTrack ? 'rgba(77, 182, 172, 0.15)' : 'rgba(223, 186, 107, 0.15)';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(node.x, track.y, node.size * 0.7, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.4 + pulse * 0.45})`;
          ctx.fill();
        }

        // Draw Streaming Gold & Mint Teal Data Packets
        for (const packet of track.packets) {
          if (isPlaying) {
            packet.x += packet.speed;
            if (packet.x - packet.length > width) {
              packet.x = -packet.length;
              packet.speed = 1.2 + Math.random() * 2.2;
            }
          }

          const grad = ctx.createLinearGradient(packet.x - packet.length, track.y, packet.x, track.y);
          grad.addColorStop(0, 'rgba(223, 186, 107, 0)');
          if (isTealTrack) {
            grad.addColorStop(0.7, `rgba(77, 182, 172, ${packet.alpha * 0.7})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${packet.alpha})`);
          } else {
            grad.addColorStop(0.7, `rgba(223, 186, 107, ${packet.alpha * 0.7})`);
            grad.addColorStop(1, `rgba(255, 255, 255, ${packet.alpha})`);
          }

          ctx.beginPath();
          ctx.moveTo(packet.x - packet.length, track.y);
          ctx.lineTo(packet.x, track.y);
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = grad;
          ctx.stroke();

          // Leading bright photon head
          ctx.beginPath();
          ctx.arc(packet.x, track.y, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = isTealTrack ? '#4db6ac' : '#dfba6b';
          ctx.shadowBlur = 6;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // --- B. Draw Amber Bokeh Motes (Volumetric drift throughout frame) ---
      for (const mote of bokehMotes) {
        if (isPlaying) {
          mote.x += mote.speedX;
          mote.y += mote.speedY;

          // Wrap edges smoothly
          if (mote.x > width + 20) mote.x = -20;
          if (mote.x < -20) mote.x = width + 20;
          if (mote.y < -20) mote.y = height + 20;
          if (mote.y > height + 20) mote.y = -20;
        }

        const currentAlpha =
          mote.baseAlpha * (0.65 + 0.35 * Math.sin(time * mote.pulseSpeed * 60 + mote.pulseOffset));

        // Soft radial glow gradient for bokeh look
        const radial = ctx.createRadialGradient(
          mote.x,
          mote.y,
          0,
          mote.x,
          mote.y,
          mote.radius * 2
        );
        radial.addColorStop(0, `${mote.color}${currentAlpha})`);
        radial.addColorStop(0.5, `${mote.color}${currentAlpha * 0.4})`);
        radial.addColorStop(1, `${mote.color}0)`);

        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = radial;
        ctx.fill();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isPlaying]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* ── 1. Brand Magenta-Violet & Mint Teal Gradient Backdrop ── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 85% 15%, rgba(156, 39, 176, 0.38) 0%, transparent 70%), radial-gradient(ellipse 65% 55% at 15% 85%, rgba(77, 182, 172, 0.28) 0%, transparent 65%), linear-gradient(135deg, #1d0a2e 0%, var(--bg-dark-card, #120c1f) 45%, #0a1320 100%)',
        }}
      />

      {/* ── 2. Studio Volumetric Light Leaks & Brand Glows ── */}
      {/* Top-right Deep Magenta-Violet aura (#9c27b0) */}
      <div
        className="absolute -top-24 -right-24 w-[650px] h-[650px] rounded-full blur-[140px] opacity-45 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--logo-gradient-top, #9c27b0) 0%, #6a1b9a 45%, transparent 75%)',
        }}
      />
      {/* Bottom-left Mint Green / Teal glow (#4db6ac) */}
      <div
        className="absolute -bottom-28 -left-28 w-[650px] h-[650px] rounded-full blur-[150px] opacity-35 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--logo-gradient-bottom, #4db6ac) 0%, #00897b 50%, transparent 75%)',
        }}
      />
      {/* Central subtle gold specular aura */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-[160px] opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse, #dfba6b 0%, #9c27b0 50%, transparent 80%)',
        }}
      />

      {/* ── 3. High-Res 3D Cinematic Motion Graphics Video Layer (Blended with brand palette) ── */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{ opacity: videoOpacity }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover scale-105"
          style={{
            mixBlendMode: 'screen',
            filter: 'contrast(1.08) brightness(0.92) saturate(1.2)',
          }}
        />
      </div>

      {/* ── 4. Oversized Translucent "DW" Diamond Logo Watermark Softly Pulsing in Center ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.035, 1],
            opacity: [0.15, 0.24, 0.15],
          }}
          transition={{
            duration: 8.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative w-[340px] sm:w-[480px] md:w-[580px] xl:w-[680px] aspect-square flex items-center justify-center -translate-y-6"
        >
          {/* Radial specular aura behind watermark */}
          <div
            className="absolute inset-0 rounded-full blur-[100px] opacity-30"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(77,182,172,0.3) 45%, rgba(156,39,176,0.3) 70%, transparent 85%)',
            }}
          />

          {/* Authentic DW Monogram with Faceted Diamond Crown in Pure White */}
          <div className="relative w-full h-full p-4 flex items-center justify-center">
            <svg
              viewBox="0 0 600 600"
              className="w-full h-full drop-shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              style={{
                filter: 'drop-shadow(0px 0px 45px rgba(77, 182, 172, 0.25))',
              }}
            >
              <defs>
                <linearGradient id="dwWatermarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
                  <stop offset="40%" stopColor="#ffffff" stopOpacity="0.92" />
                  <stop offset="75%" stopColor="#f3e8ff" stopOpacity="0.85" />
                  <stop offset="100%" stopColor="#e0f2fe" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="gemGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="60%" stopColor="#e0f2fe" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#dfba6b" stopOpacity="0.85" />
                </linearGradient>
              </defs>

              <g fill="url(#dwWatermarkGrad)">
                {/* Faceted Brilliant Diamond Gem Crown */}
                <g transform="translate(348, 238) scale(0.95)" fill="url(#gemGrad)">
                  <polygon points="-30,-36 -8,-36 -14,-20 -40,-20" opacity="0.95" />
                  <polygon points="-6,-36 6,-36 10,-20 -10,-20" opacity="1" />
                  <polygon points="8,-36 30,-36 40,-20 14,-20" opacity="0.95" />
                  <polygon points="-40,-16 -12,-16 0,22 -32,-16" opacity="0.9" />
                  <polygon points="-8,-16 8,-16 0,22" opacity="1" />
                  <polygon points="12,-16 40,-16 32,-16 0,22" opacity="0.9" />
                </g>

                {/* Calligraphic Cursive 'D' Swoop and Loop */}
                <path d="M 148 175 C 190 205, 222 250, 240 295 C 258 340, 258 385, 238 425 C 218 458, 178 472, 142 458 C 108 442, 88 402, 98 358 C 108 310, 142 258, 192 225 C 225 205, 260 215, 275 250 C 290 285, 275 340, 248 395 C 228 435, 195 455, 160 450 C 138 445, 122 428, 120 405 C 118 375, 138 335, 168 298 C 198 260, 230 242, 248 250 C 255 255, 255 268, 248 288 C 235 325, 208 375, 175 410 C 158 428, 142 430, 135 420 C 128 408, 135 385, 152 355 C 175 315, 210 275, 242 250 C 228 220, 192 195, 148 175 Z" />

                {/* Cursive 'W' connecting strokes & right arch flourish */}
                <path d="M 235 345 C 248 305, 270 252, 298 245 C 318 240, 332 260, 335 292 C 338 330, 322 382, 298 430 C 275 475, 245 495, 220 482 C 200 472, 198 445, 212 408 C 232 352, 270 292, 305 255 C 328 232, 348 238, 350 265 C 352 295, 338 342, 318 392 C 298 435, 272 465, 248 472 C 272 462, 302 432, 325 390 C 348 345, 362 292, 358 255 C 355 238, 340 235, 328 250 C 308 275, 280 330, 258 388 C 240 435, 228 465, 235 475 C 242 485, 268 470, 292 430 C 322 378, 348 305, 350 252 C 352 235, 342 232, 330 242 C 310 260, 282 315, 265 372 Z" />

                {/* Soaring Crest and Diamond World Inscription */}
                <path d="M 285 390 C 300 335, 325 275, 350 268 C 368 265, 380 288, 382 320 C 385 362, 370 415, 345 455 C 325 485, 302 495, 285 488 C 272 482, 275 462, 285 435 C 308 385, 342 322, 365 292 C 378 275, 392 280, 395 305 C 398 345, 380 408, 350 458 C 382 438, 425 385, 452 318 C 478 252, 482 180, 452 135 C 430 102, 390 92, 335 118 C 378 118, 415 138, 435 170 C 458 208, 455 268, 430 332 C 405 390, 368 442, 330 465 C 358 440, 388 395, 405 342 C 420 292, 425 245, 410 215 C 398 185, 365 178, 328 192 C 368 180, 405 195, 420 225 C 438 260, 432 315, 408 378 C 380 440, 338 485, 290 495 Z" />
              </g>
            </svg>
          </div>
        </motion.div>
      </div>

      {/* ── 5. HTML5 60fps Canvas (Glowing Gold Data Lines & Amber Bokeh Motes) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── 6. Cinematic Vignette (Preserves text readability & luxury edge roll-off) ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 40%, rgba(3, 6, 16, 0.72) 100%), linear-gradient(180deg, rgba(3,6,16,0.5) 0%, transparent 20%, transparent 80%, rgba(3,6,16,0.85) 100%)',
        }}
      />

      {/* ── 7. Interactive Controls (Optional floating control badge on top bar) ── */}
      {showControls && (
        <div className="absolute top-4 right-4 pointer-events-auto z-20 flex items-center gap-2">
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 10 }}
              className="flex items-center gap-3 bg-black/80 backdrop-blur-2xl border border-white/15 px-3 py-1.5 rounded-2xl shadow-2xl"
            >
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                Video Intensity
              </span>
              <input
                type="range"
                min="0.1"
                max="0.8"
                step="0.05"
                value={videoOpacity}
                onChange={(e) => setVideoOpacity(parseFloat(e.target.value))}
                className="w-20 accent-[#d4af37] h-1.5 bg-white/20 rounded cursor-pointer"
              />
            </motion.div>
          )}

          <div
            className="flex items-center gap-1.5 backdrop-blur-xl rounded-full px-2.5 py-1 shadow-lg border"
            style={{
              backgroundColor: 'rgba(18, 12, 31, 0.75)',
              borderColor: 'rgba(77, 182, 172, 0.3)',
            }}
          >
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause motion graphics' : 'Play motion graphics'}
              className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 hover:text-white transition px-1"
              title={isPlaying ? 'Pause 3D Motion Graphics' : 'Resume 3D Motion Graphics'}
            >
              {isPlaying ? (
                <Pause className="h-3 w-3 text-[#dfba6b]" />
              ) : (
                <Play className="h-3 w-3 text-[#dfba6b]" />
              )}
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-slate-300">
                {isPlaying ? '60fps Motion' : 'Paused'}
              </span>
            </button>

            <button
              type="button"
              onClick={restart}
              aria-label="Restart motion graphics"
              className="p-1 text-slate-400 hover:text-[#4db6ac] transition border-l border-white/10 ml-1 pl-1.5"
              title="Restart"
            >
              <RotateCcw className="h-2.5 w-2.5" />
            </button>

            <button
              type="button"
              onClick={() => setShowSettings((v) => !v)}
              aria-label="Settings"
              className={`p-1 transition ${showSettings ? 'text-[#dfba6b]' : 'text-slate-400 hover:text-white'}`}
              title="Adjust Intensity"
            >
              <Sliders className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
