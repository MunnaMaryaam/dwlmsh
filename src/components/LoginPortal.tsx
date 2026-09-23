import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CircleAlert as AlertCircle, Check, ChevronRight, Eye, EyeOff, Fingerprint, Loader as Loader2, Lock, ShieldCheck, User, Wifi, WifiOff } from 'lucide-react';
import { AuthUser } from '../types';
import { authenticateUser, requestPasswordRecovery, requestSignup } from '../utils/authEngine';

interface LoginPortalProps {
  onLoginSuccess: (user: AuthUser) => void;
}

type Mode = 'login' | 'signup' | 'forgot';
type ServerStatus = 'checking' | 'online' | 'offline';

export const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health', { credentials: 'include' });
        if (!cancelled) setServerStatus(res.ok ? 'online' : 'offline');
      } catch {
        if (!cancelled) setServerStatus('offline');
      }
    };
    checkHealth();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearNotice = () => {
    setMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearNotice();
    if (mode !== 'login' && !agreedToTerms) {
      setErrorMessage('Please accept the access terms to continue.');
      return;
    }
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const result = await authenticateUser(username, password);
        if (result.success && result.user) {
          onLoginSuccess(result.user);
        } else {
          setErrorMessage(result.error || 'Invalid username or password.');
        }
      } else if (mode === 'signup') {
        const result = await requestSignup({ username, name, password });
        if (result.success) {
          setMessage(result.message || 'Account request submitted.');
          setMode('login');
          setPassword('');
        } else {
          setErrorMessage(result.error || 'Could not create account request.');
        }
      } else {
        const result = await requestPasswordRecovery(username);
        if (result.success) {
          setMessage(result.message || 'Recovery request submitted.');
        } else {
          setErrorMessage(result.error || 'Could not submit recovery request.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword('');
    clearNotice();
  };

  const heading =
    mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Request Access' : 'Recover Account';

  const subheading =
    mode === 'login'
      ? 'Authenticate to access the intelligence console'
      : mode === 'signup'
        ? 'Submit details for system owner approval'
        : 'Enter username to request a password reset';

  const submitLabel =
    mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Submit Request' : 'Send Recovery Link';

  return (
    <div className="min-h-screen w-full flex font-body bg-[#060a13]">
      {/* ── LEFT: Form panel — dark, analytical, glass ── */}
      <div className="w-full lg:w-[44%] xl:w-[40%] min-h-screen relative z-10 flex flex-col overflow-hidden bg-[#080d18]">
        {/* Ambient background: grid + glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
              backgroundSize: '34px 34px',
              maskImage: 'radial-gradient(ellipse 90% 70% at 50% 20%, black 40%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 90% 70% at 50% 20%, black 40%, transparent 100%)',
            }}
          />
          <div
            className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-25"
            style={{ background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)' }}
          />
          <div
            className="absolute bottom-0 right-0 h-96 w-96 rounded-full blur-3xl opacity-[0.14] translate-x-1/3 translate-y-1/4"
            style={{ background: 'radial-gradient(circle, #0f4c5c 0%, transparent 70%)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#060a13]" />
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 xl:px-14 py-10 max-w-md mx-auto w-full relative z-10">
          {/* Brand mark */}
          <div className="mb-7 flex flex-col items-center text-center">
            <div className="relative mb-4">
              <div className="absolute -inset-4 rounded-3xl bg-[#d4af37]/10 blur-xl" />
              <div className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-[#fdfbf6] to-[#e7e2d6] p-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-[#d4af37]/40">
                <img
                  src="/diamond-world-logo-cutout.png"
                  alt="Diamond World"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <h1 className="font-display text-2xl font-semibold text-white tracking-tight">
              Diamond World Ltd.
            </h1>
            <p className="text-[10px] text-[#8a93a8] mt-1.5 font-medium font-body uppercase tracking-[0.2em]">
              Stock Operations · Distribution & Intelligence
            </p>
          </div>

          {/* Glass card */}
          <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-2xl shadow-[0_20px_70px_rgba(0,0,0,0.55)] px-6 sm:px-8 py-7">
            {/* corner accent */}
            <div className="pointer-events-none absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent" />

            {/* Mode title + status */}
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="text-left">
                <h2 className="font-display text-xl font-semibold text-white italic">{heading}</h2>
                <p className="text-[11px] text-[#8a93a8] mt-0.5 font-body">{subheading}</p>
              </div>
              <span
                className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wide font-mono ${
                  serverStatus === 'online'
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : serverStatus === 'offline'
                      ? 'border-rose-400/30 bg-rose-400/10 text-rose-300'
                      : 'border-white/15 bg-white/5 text-slate-400'
                }`}
              >
                <span className="relative flex h-1.5 w-1.5">
                  {serverStatus === 'online' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                      serverStatus === 'online'
                        ? 'bg-emerald-400'
                        : serverStatus === 'offline'
                          ? 'bg-rose-400'
                          : 'bg-slate-400'
                    }`}
                  />
                </span>
                {serverStatus === 'checking'
                  ? 'Connecting'
                  : serverStatus === 'online'
                    ? 'Online'
                    : 'Offline'}
              </span>
            </div>

            {/* Notices */}
            <AnimatePresence mode="wait">
              {serverStatus === 'offline' && (
                <motion.div
                  key="offline"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/[0.07] p-3 text-xs text-amber-200"
                >
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Server is not responding. Please try again shortly.</span>
                </motion.div>
              )}
              {message && (
                <motion.div
                  key="message"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.07] p-3 text-xs text-emerald-200"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{message}</span>
                </motion.div>
              )}
              {errorMessage && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-400/[0.07] p-3 text-xs text-rose-200"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[10px] font-semibold text-[#9aa3b5] mb-1.5 uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    autoComplete="name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#d4af37]/15 transition"
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9aa3b5] mb-1.5 uppercase tracking-wider">
                  <User className="h-3 w-3 opacity-70" /> Username
                </label>
                <input
                  required
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#d4af37]/15 transition"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9aa3b5] mb-1.5 uppercase tracking-wider">
                    <Lock className="h-3 w-3 opacity-70" />
                    {mode === 'signup' ? 'Create Password' : 'Password'}
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        mode === 'signup' ? 'At least 4 characters' : 'Enter your password'
                      }
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-[#d4af37]/15 transition"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-300 transition"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[#d4af37]"
                    />
                    <span className="text-xs text-[#8a93a8]">Remember username</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-medium text-[#d4af37] hover:text-[#f4d03f] hover:underline transition"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {mode !== 'login' && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[#d4af37]"
                  />
                  <span className="text-xs text-[#8a93a8]">I agree to the access terms.</span>
                </label>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[#0f2b48] via-[#17395c] to-[#0f2b48] text-white font-bold text-sm py-3 shadow-[0_10px_30px_rgba(23,57,92,0.45)] ring-1 ring-[#d4af37]/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:ring-[#d4af37]/50 hover:shadow-[0_10px_36px_rgba(212,175,55,0.2)]"
              >
                <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Fingerprint className="h-4 w-4 text-[#d4af37]" />
                )}
                {isLoading ? 'Processing…' : submitLabel}
              </button>
            </form>

            {/* Mode switcher */}
            <div className="mt-5 pt-4 border-t border-white/[0.08]">
              {mode === 'login' ? (
                <p className="text-center text-xs text-[#8a93a8]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-[#d4af37] hover:text-[#f4d03f] hover:underline transition"
                  >
                    Request access
                  </button>
                </p>
              ) : (
                <p className="text-center text-xs text-[#8a93a8]">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="inline-flex items-center gap-1 font-semibold text-[#d4af37] hover:text-[#f4d03f] hover:underline transition"
                  >
                    <ChevronRight className="h-3 w-3 rotate-180" />
                    Back to sign in
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Trust strip */}
          <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-[#5c6478] font-mono uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]/70" />
            Encrypted session · Role-based access control
          </div>
        </div>

        {/* Footer strip */}
        <div className="px-8 py-3 text-[10px] text-[#5c6478] text-center border-t border-white/[0.06] relative z-10 space-y-0.5">
          <p>© {new Date().getFullYear()} Diamond World LTD · Authorized users only</p>
          <p className="text-[9px] text-[#4a5164] tracking-wide">
            Developed by <span className="font-semibold text-[#6b7284]">MSH (Data Analytics)</span>
          </p>
        </div>
      </div>

      {/* ── RIGHT: Brand showcase (color-graded, cinematic) ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center min-h-screen bg-[#050608]">
        {/* Animated brand video — cropped tight on the diamond mark only (baked-in wordmark
            is pushed out of frame so it never duplicates our animated typography below);
            slow cinematic Ken Burns drift for movement */}
        <motion.video
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            filter: 'grayscale(1) contrast(1.15) brightness(0.82)',
            objectPosition: '50% 0%',
            transformOrigin: '50% 0%',
          }}
          initial={{ scale: 1.9 }}
          animate={{ scale: 2.05 }}
          transition={{ duration: 22, ease: 'linear', repeat: Infinity, repeatType: 'mirror' }}
          src="/dw-brand-animation.mp4"
          poster="/dw-brand-poster.jpg"
          autoPlay
          loop
          muted
          playsInline
        />

        {/* Duotone color grade: maps video luminance onto a deep navy → bronze → gold gradient */}
        <div
          className="absolute inset-0 mix-blend-color"
          style={{
            background: 'linear-gradient(150deg, #04070d 0%, #0f2036 30%, #17395c 55%, #8a6d2c 82%, #d4af37 100%)',
          }}
        />
        <div className="absolute inset-0 bg-[#070a10]/35 mix-blend-multiply" />

        {/* Vignette so it reads as one cohesive, legible panel */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 85% 65% at 50% 42%, transparent 30%, rgba(4,6,10,0.72) 100%), linear-gradient(0deg, #050608 0%, rgba(5,6,8,0.1) 22%, rgba(5,6,8,0.1) 74%, #050608 100%)',
          }}
        />

        {/* Fine film-grain texture for a premium, non-flat finish */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Gold geometric lines for texture */}
        <div className="absolute top-0 right-0 w-[55%] h-full pointer-events-none">
          <svg
            className="absolute inset-0 w-full h-full opacity-20"
            viewBox="0 0 400 800"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMaxYMid slice"
          >
            <path d="M80 0 L400 200 L400 0 Z" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" />
            <path d="M120 800 L400 500 L400 800 Z" stroke="url(#goldGrad)" strokeWidth="1.5" fill="none" />
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d4af37" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f4d03f" stopOpacity="0.3" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Top live-intelligence KPI chips */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
          className="absolute top-10 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-2.5 px-10"
        >
          {[
            { label: 'Real-time Stock Sync' },
            { label: 'Multi-branch Intelligence' },
            { label: 'AI-assisted Allocation' },
          ].map((chip) => (
            <span
              key={chip.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-300"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_6px_#d4af37]" />
              {chip.label}
            </span>
          ))}
        </motion.div>

        {/* Cinematic wordmark reveal — letter-by-letter rise, then a slow shimmer sweep */}
        <div className="relative z-10 flex flex-col items-center text-center px-10 -translate-y-6">
          <div className="flex overflow-hidden">
            {'DIAMOND WORLD'.split('').map((ch, i) => (
              <motion.span
                key={i}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.4 + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
                className="font-heading text-3xl xl:text-4xl font-semibold tracking-[0.14em] inline-block"
                style={{
                  color: ch === ' ' ? 'transparent' : undefined,
                  backgroundImage:
                    ch === ' '
                      ? undefined
                      : 'linear-gradient(180deg, #f7ecc4 0%, #d4af37 45%, #a9791a 100%)',
                  WebkitBackgroundClip: ch === ' ' ? undefined : 'text',
                  backgroundClip: ch === ' ' ? undefined : 'text',
                  WebkitTextFillColor: ch === ' ' ? undefined : 'transparent',
                  width: ch === ' ' ? '0.5em' : undefined,
                }}
              >
                {ch === ' ' ? '\u00A0' : ch}
              </motion.span>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.35, ease: 'easeOut' }}
            className="font-tagline italic text-lg xl:text-xl mt-2 tracking-wide"
            style={{ color: '#c9a84c' }}
          >
            the art of beauty
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.9, delay: 1.6, ease: 'easeOut' }}
            className="mt-6 h-px w-24 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent"
          />
        </div>

        {/* Bottom caption strip, floating over the video */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 1.8 }}
          className="absolute bottom-16 left-0 right-0 z-10 flex flex-col items-center text-center px-10"
        >
          <div className="flex items-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#d4af37]/60" />
            <span className="font-heading text-[11px] uppercase tracking-[0.3em] text-[#d4af37]/85 font-semibold">
              Stock Operations ERP
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#d4af37]/60" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
