import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Fingerprint,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
  WifiOff,
} from 'lucide-react';
import { AuthUser } from '../types';
import { authenticateUser, requestPasswordRecovery, requestSignup } from '../utils/authEngine';
import { CinematicMotionBackground } from './CinematicMotionBackground';

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
    <div className="relative min-h-screen w-full font-body overflow-x-hidden flex flex-col justify-between bg-[#04070f]">
      {/* ── 3D CINEMATIC MOTION GRAPHICS BACKGROUND ── */}
      <CinematicMotionBackground videoSrc="/dw-brand-animation.mp4" posterSrc="/dw-brand-poster.jpg" showControls={true} />

      {/* ── TOP NAV / BRAND BAR (Floating) ── */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.6)] ring-1 border"
            style={{
              backgroundColor: '#120c1f',
              borderColor: 'rgba(77, 182, 172, 0.4)',
              boxShadow: '0 0 15px rgba(77, 182, 172, 0.2)',
            }}
          >
            <img
              src="/diamond-world-logo-cutout.png"
              alt="Diamond World"
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <span className="font-heading text-sm sm:text-base font-semibold tracking-wider text-white uppercase block">
              Diamond World
            </span>
            <span className="font-tagline italic text-xs text-[#dfba6b] block -mt-0.5">
              the art of beauty
            </span>
          </div>
        </div>

        {/* Server status badge & security clearance pill */}
        <div className="flex items-center gap-2.5 sm:gap-3 mr-24 sm:mr-32">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wide font-mono backdrop-blur-md ${
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
            <span className="hidden sm:inline">
              {serverStatus === 'checking'
                ? 'Connecting'
                : serverStatus === 'online'
                  ? 'ERP Online'
                  : 'Offline'}
            </span>
          </span>
        </div>
      </header>

      {/* ── MAIN CONTENT (Glassmorphic split presentation over background video) ── */}
      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-8 py-4 sm:py-8 flex-1 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-12 items-center">
          {/* Left Column: Brand Hero Title & Highlights directly over video background */}
          <div className="lg:col-span-6 xl:col-span-7 text-center lg:text-left space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#4db6ac]/30 bg-[#120c1f]/60 backdrop-blur-xl px-4 py-1.5 text-xs text-[#dfba6b] shadow-[0_0_20px_rgba(77,182,172,0.15)]"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#dfba6b]" />
              <span className="font-mono text-[10px] uppercase tracking-wider font-semibold">
                Authorized Enterprise Portal
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.1 }}
              className="space-y-2"
            >
              <h1 className="font-heading text-3xl sm:text-5xl xl:text-6xl font-semibold tracking-tight text-white drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
                DIAMOND <span className="text-white">WORLD</span>
              </h1>
              <p className="font-tagline italic text-2xl sm:text-3xl text-[#dfba6b] drop-shadow-[0_2px_12px_rgba(223,186,107,0.35)]">
                the art of beauty
              </p>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.2 }}
              className="text-sm sm:text-base text-slate-300 max-w-xl font-light leading-relaxed drop-shadow"
            >
              Centralized stock operations, intelligent branch replenishment, and high-precision diamond jewelry allocation engine.
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.3 }}
              className="flex flex-wrap gap-2.5 justify-center lg:justify-start pt-2"
            >
              {[
                'Real-time Stock Sync',
                'Multi-branch Intelligence',
                'AI-assisted Allocation',
                'NetSuite Connector',
              ].map((pill, idx) => (
                <span
                  key={pill}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#120c1f]/75 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-200 shadow-md"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#dfba6b' : '#4db6ac',
                      boxShadow: idx % 2 === 0 ? '0 0 6px #dfba6b' : '0 0 6px #4db6ac',
                    }}
                  />
                  {pill}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Right Column: Floating Frosted Glass Login Card */}
          <div className="lg:col-span-6 xl:col-span-5 w-full max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              style={{
                backgroundColor: 'rgba(18, 12, 31, 0.86)', // var(--bg-dark-card)
                borderColor: 'rgba(77, 182, 172, 0.28)',   // var(--card-border-glow)
                boxShadow:
                  '0 25px 80px rgba(0, 0, 0, 0.85), 0 0 45px rgba(77, 182, 172, 0.16), 0 0 1px rgba(223, 186, 107, 0.3)',
              }}
              className="relative rounded-3xl border backdrop-blur-2xl p-6 sm:p-8"
            >
              {/* Corner Mint-Teal & Gold accent aura bar */}
              <div className="pointer-events-none absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-[#4db6ac] to-transparent opacity-80" />

              {/* Mode title + status header */}
              <div className="mb-6 flex items-start justify-between gap-3">
                <div className="text-left">
                  <h2 className="font-display text-xl sm:text-2xl font-semibold text-white tracking-tight">
                    {heading}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 font-body">{subheading}</p>
                </div>
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shadow-inner shrink-0 border"
                  style={{
                    background: 'linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(18, 12, 31, 0.9) 100%)',
                    borderColor: 'rgba(77, 182, 172, 0.35)',
                    color: '#dfba6b',
                  }}
                >
                  <Lock className="h-4 w-4" />
                </div>
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
                    <span>Server is offline. Running on local resilient fallback.</span>
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
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4db6ac]/70 focus:bg-[#120c1f]/80 focus:ring-2 focus:ring-[#4db6ac]/20 transition"
                    />
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9aa3b5] mb-1.5 uppercase tracking-wider">
                    <User className="h-3 w-3 text-[#4db6ac]" /> Username
                  </label>
                  <input
                    required
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4db6ac]/70 focus:bg-[#120c1f]/80 focus:ring-2 focus:ring-[#4db6ac]/20 transition"
                  />
                </div>

                {mode !== 'forgot' && (
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#9aa3b5] mb-1.5 uppercase tracking-wider">
                      <Lock className="h-3 w-3 text-[#4db6ac]" />
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
                        className="w-full rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 pr-11 text-sm text-white placeholder:text-slate-500 outline-none focus:border-[#4db6ac]/70 focus:bg-[#120c1f]/80 focus:ring-2 focus:ring-[#4db6ac]/20 transition"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-white transition"
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
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[#dfba6b]"
                      />
                      <span className="text-xs text-slate-300">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => switchMode('forgot')}
                      className="text-xs font-medium text-[#dfba6b] hover:text-[#e5c07b] hover:underline transition"
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
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-[#dfba6b]"
                    />
                    <span className="text-xs text-slate-300">I agree to the access terms.</span>
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    background: 'var(--btn-gold-gradient, linear-gradient(90deg, #e5c07b, #c49a45))',
                    boxShadow: '0 10px 30px rgba(196, 154, 69, 0.35)',
                  }}
                  className="group relative w-full overflow-hidden rounded-xl text-[#120c1f] font-bold text-sm py-3 ring-1 ring-[#e5c07b]/70 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.99]"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[#120c1f]" />
                  ) : (
                    <Fingerprint className="h-4 w-4 text-[#120c1f]" />
                  )}
                  {isLoading ? 'Authenticating…' : submitLabel}
                </button>
              </form>

              {/* Mode switcher */}
              <div className="mt-5 pt-4 border-t border-white/[0.08]">
                {mode === 'login' ? (
                  <p className="text-center text-xs text-slate-400">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchMode('signup')}
                      className="font-semibold text-[#dfba6b] hover:text-[#e5c07b] hover:underline transition"
                    >
                      Request access
                    </button>
                  </p>
                ) : (
                  <p className="text-center text-xs text-slate-400">
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="inline-flex items-center gap-1 font-semibold text-[#dfba6b] hover:text-[#e5c07b] hover:underline transition"
                    >
                      <ChevronRight className="h-3 w-3 rotate-180" />
                      Back to sign in
                    </button>
                  </p>
                )}
              </div>

              {/* Security info footer */}
              <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 text-[#4db6ac]" />
                <span>Encrypted 256-Bit SSL · RBAC Enforced</span>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* ── FOOTER BAR (Floating translucent strip) ── */}
      <footer className="relative z-10 w-full px-4 sm:px-8 py-3 text-[11px] text-[#717b92] flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-white/[0.06] bg-black/40 backdrop-blur-md">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Diamond World LTD · Enterprise Stock Intelligence
        </p>
        <div className="flex items-center gap-4 text-[10px]">
          <span>
            Developed by <strong className="text-slate-300 font-medium">MSH (Data Analytics)</strong>
          </span>
          <span className="hidden sm:inline text-white/20">|</span>
          <span className="text-[#dfba6b] font-mono">NetSuite Cloud Synced</span>
        </div>
      </footer>
    </div>
  );
};

