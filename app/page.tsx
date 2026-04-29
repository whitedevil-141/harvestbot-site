'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Coins, 
  Droplets, 
  Layers, 
  Clock, 
  Target, 
  ShieldCheck, 
  Swords, 
  BarChart3, 
  Timer, 
  ArrowUpCircle, 
  Check,
  ArrowLeft,
  Star,
  MessageSquareQuote,
  ChevronRight,
  CreditCard,
  Lock,
  BadgeCheck,
  CheckCircle2,
  Copy,
  Sparkles,
  UserRound,
  Wallet,
  Bitcoin,
  Gift,
  Twitter,
  MessageSquare,
  Menu,
  X
} from 'lucide-react';
import { Stats } from 'fs';

// --- DATA ---

type Vouch = {
  id: string;
  name: string;
  username: string;
  discriminator?: string;
  avatar: string;
  text: string;
  createdAt: string;
};

type GlobalStats = {
  goldValue: string;
  elixirValue: string;
  wallsValue: string;
  runTimeValue: string;
  usersValue: string;
};

const STATS_API = "https://api.harvestbot.app/api/v1/stats";
const VOUCHES_API = "https://late-bread-b04a.white-devil-dev-141.workers.dev/vouches?limit=20";

const DEFAULT_GLOBAL_STATS: GlobalStats = {
  goldValue: "0",
  elixirValue: "0",
  wallsValue: "0",
  runTimeValue: "0h",
  usersValue: "0",
};

const timeAgo = (iso: string) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return iso;
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${Math.max(s, 0)}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const PRICING_PLANS = [
  { id: 'weekly', name: 'Weekly', price: '$2', duration: '7 Days', features: ['Full Bot Access', 'All Elite Strategies', 'Smart Wall Upgrader', 'Standard Support'], recommended: false },
  { id: 'biweekly', name: 'Bi-Weekly', price: '$5', duration: '15 Days', features: ['Full Bot Access', 'All Elite Strategies', 'Smart Wall Upgrader', 'Priority Support'], recommended: false },
  { id: 'monthly', name: 'Monthly', price: '$8', duration: '30 Days', features: ['Full Bot Access', 'All Elite Strategies', 'Smart Wall Upgrader', 'VIP Support'], recommended: false },
  { id: 'lifetime', name: 'Lifetime', price: '$35', duration: 'Lifetime', features: ['Full Bot Access', 'All Elite Strategies', 'Smart Wall Upgrader', 'Lifetime Support'], recommended: true },
];

const SHOWCASE_FEATURES = [
  { id: 'farming', title: 'Smart Base Hunting', icon: Target, desc: 'Our AI scans thousands of bases per minute, identifying dead bases with full collectors to maximize profit while minimizing troop cost.' },
  { id: 'walls', title: 'Auto Wall Upgrades', icon: Layers, desc: 'Never hit the resource cap. The bot automatically identifies your cheapest walls and dumps excess loot into them.' },
  { id: 'antiban', title: 'Human-like Anti-Ban', icon: ShieldCheck, desc: 'Simulates real human touches with randomized delays, imperfect drop patterns, and forced break schedules.' },
  { id: 'stats', title: 'Live Dashboard', icon: BarChart3, desc: 'Monitor your hourly gains, total loot, and attack history in real-time from our beautiful web dashboard.' }
];

// --- COMPONENTS ---

type ButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button = ({ children, variant = 'primary', className = '', ...props }: ButtonProps) => {
  const baseStyles = "relative overflow-hidden inline-flex items-center justify-center font-semibold transition-all duration-300 rounded-xl group active:scale-[0.98]";
  const variants = {
    primary: "bg-[#23f8ff] text-neutral-950 hover:bg-[#1edce3] shadow-[0_0_20px_rgba(35,248,255,0.15)] hover:shadow-[0_0_30px_rgba(35,248,255,0.3)] px-5 py-2.5 md:px-6 md:py-3",
    secondary: "bg-white/5 text-white border border-white/10 hover:bg-white/10 hover:border-white/20 px-5 py-2.5 md:px-6 md:py-3 backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    outline: "border border-[#23f8ff]/50 text-[#23f8ff] hover:bg-[#23f8ff]/10 hover:border-[#23f8ff] px-5 py-2.5 md:px-6 md:py-3",
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10 flex items-center justify-center">{children}</span>
      {variant === 'primary' && (
        <div className="absolute inset-0 h-full w-full bg-linear-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-shine" />
      )}
    </button>
  );
};

const CountUp = ({ end, duration = 2000 }: { end: number | string; duration?: number; suffix?: string }) => {
  const [count, setCount] = useState<number | string>(typeof end === 'string' ? '0' : 0);
  const countRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let frameId: number | null = null;
    let hasAnimated = false;

    const animate = () => {
      if (hasAnimated) return;
      hasAnimated = true;
      let startTime: number | null = null;
      const tick = (timestamp: number) => {
        if (startTime === null) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);

        if (typeof end === 'string') {
          const numericEnd = parseFloat(end);
          const suffixText = end.replace(/[0-9.]/g, '');
          if (Number.isFinite(numericEnd)) {
            const currentCount = Math.floor(numericEnd * progress);
            setCount(currentCount + suffixText);
          } else {
            setCount(end);
          }
        } else {
          setCount(Math.floor(end * progress));
        }

        if (progress < 1) {
          frameId = requestAnimationFrame(tick);
        } else {
          setCount(end);
        }
      };
      frameId = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) animate();
      },
      { threshold: 0.1 }
    );

    const node = countRef.current;
    if (node) observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [end, duration]);

  return <span ref={countRef}>{count}</span>;
};

// --- PAGES ---

const smoothScrollToId = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const formatVouchDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const useInView = (ref: React.RefObject<HTMLElement | null>) => {
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return isInView;
};

function LandingPage({ onCheckout }: { onCheckout: (plan: any) => void }) {
  const [billingCycle, setBillingCycle] = useState('subscription');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeShowcase, setActiveShowcase] = useState(SHOWCASE_FEATURES[0].id);
  const [globalStats, setGlobalStats] = useState<GlobalStats>(DEFAULT_GLOBAL_STATS);
  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  // Refs for lazy loading sections
  const showcaseRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const vouchesRef = useRef<HTMLElement | null>(null);
  const pricingRef = useRef<HTMLElement | null>(null);
  const faqRef = useRef<HTMLElement | null>(null);

  const showcaseInView = useInView(showcaseRef);
  const featuresInView = useInView(featuresRef);
  const vouchesInView = useInView(vouchesRef);
  const pricingInView = useInView(pricingRef);
  const faqInView = useInView(faqRef);

  // Fetch global stats with retries on cold-start and periodic refresh.
  useEffect(() => {
    let alive = true;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const normalizeStats = (data: any): GlobalStats => ({
      goldValue: String(data?.total_gold ?? DEFAULT_GLOBAL_STATS.goldValue),
      elixirValue: String(data?.total_elixir ?? DEFAULT_GLOBAL_STATS.elixirValue),
      wallsValue: String(data?.total_wall ?? DEFAULT_GLOBAL_STATS.wallsValue),
      runTimeValue: String(data?.total_runtime ?? DEFAULT_GLOBAL_STATS.runTimeValue),
      usersValue: String(data?.total_users ?? DEFAULT_GLOBAL_STATS.usersValue),
    });

    const fetchStats = async (attempt = 0) => {
      try {
        const r = await fetch(STATS_API, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        if (!alive) return;
        setGlobalStats(normalizeStats(data));
      } catch {
        if (!alive) return;
        if (attempt < 4) {
          const delayMs = Math.min(1000 * 2 ** attempt, 10000);
          retryTimeout = setTimeout(() => fetchStats(attempt + 1), delayMs);
        }
      }
    };

    fetchStats();
    const refresh = setInterval(() => fetchStats(), 60000);
    return () => {
      alive = false;
      clearInterval(refresh);
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Fetch vouches and refresh periodically.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const r = await fetch(VOUCHES_API, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        const list: Vouch[] = Array.isArray(json) ? json : Array.isArray(json?.vouches) ? json.vouches : [];
        if (!alive || !list.length) return;
        setVouches((prev) => {
          if (prev.length === 0) return list;
          const prevIds = new Set(prev.map((x) => x.id));
          const incomingNew = list.filter((x) => !prevIds.has(x.id));
          if (!incomingNew.length) return prev;
          return [...prev, ...incomingNew].slice(-30);
        });
      } catch {
        // Keep whatever we already have on error.
      }
    };

    tick();
    const id = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Injecting custom styles for the marquee animation
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(24px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes shine {
        100% { transform: translateX(100%); }
      }
      @keyframes gradientMove {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes pulseSlow {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
      }
      @keyframes smoothAppear {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .animate-scroll {
        animation: scroll 40s linear infinite;
        will-change: transform;
        transform: translateZ(0);
        -webkit-transform: translateZ(0);
      }
      .animate-scroll:hover {
        animation-play-state: paused;
      }
      .animate-fade-in-up {
        animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        opacity: 0;
      }
      .animate-smooth-appear {
        animation: smoothAppear 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        opacity: 0;
      }
      .animate-gradient {
        background-size: 200% auto;
        animation: gradientMove 4s linear infinite;
      }
      .animate-pulse-slow {
        animation: pulseSlow 4s ease-in-out infinite;
      }
      .delay-100 { animation-delay: 100ms; }
      .delay-200 { animation-delay: 200ms; }
      .delay-300 { animation-delay: 300ms; }
      .delay-400 { animation-delay: 400ms; }
      .delay-500 { animation-delay: 500ms; }
      .delay-600 { animation-delay: 600ms; }
      .hide-scrollbar::-webkit-scrollbar {
        display: none;
      }
      .hide-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-neutral-200 font-sans selection:bg-[#23f8ff]/30">
      
      {/* Navigation - Floating Island */}
      <div className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center px-4 md:px-6 pointer-events-none transition-all">
        <nav className={`pointer-events-auto w-full max-w-4xl bg-[#0a0a0a]/80 backdrop-blur-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between shadow-[0_20px_40px_-10px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300 p-1.5 md:p-2 ${isMobileMenuOpen ? 'rounded-3xl' : 'rounded-full'}`}>
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2 font-bold text-base md:text-xl tracking-tight text-white group cursor-pointer pl-2 md:pl-3">
              <img src="/logo.png" alt="HarvestBot" className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover" />
              <span>HarvestBot</span>
            </div>
            
            {/* Mobile Hamburger Toggle */}
            <div className="flex items-center md:hidden pr-2">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1.5 text-neutral-400 hover:text-white transition-colors outline-none">
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-neutral-400">
            <a href="#showcase" onClick={(e) => { e.preventDefault(); smoothScrollToId('showcase'); }} className="hover:text-white transition-colors">Showcase</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); smoothScrollToId('features'); }} className="hover:text-white transition-colors">Features</a>
            <a href="#vouches" onClick={(e) => { e.preventDefault(); smoothScrollToId('vouches'); }} className="hover:text-white transition-colors">Vouches</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); smoothScrollToId('pricing'); }} className="hover:text-white transition-colors">Pricing</a>
          </div>
          
          {/* Desktop CTA Button */}
          <div className="hidden md:block">
            <Button variant="primary" className="py-2.5! px-6! text-sm rounded-full! shadow-none" onClick={() => smoothScrollToId('pricing')}>
              Get Started
            </Button>
          </div>

          {/* Mobile Navigation Menu */}
          <div className={`md:hidden flex flex-col items-center font-semibold text-sm text-neutral-400 transition-all duration-300 ${isMobileMenuOpen ? 'max-h-72 opacity-100 py-6 gap-4' : 'max-h-0 opacity-0 gap-0 py-0'}`}>
            <a href="#showcase" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); smoothScrollToId('showcase'); }} className="hover:text-white transition-colors w-full text-center py-2">Showcase</a>
            <a href="#features" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); smoothScrollToId('features'); }} className="hover:text-white transition-colors w-full text-center py-2">Features</a>
            <a href="#vouches" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); smoothScrollToId('vouches'); }} className="hover:text-white transition-colors w-full text-center py-2">Vouches</a>
            <a href="#pricing" onClick={(e) => { e.preventDefault(); setIsMobileMenuOpen(false); smoothScrollToId('pricing'); }} className="hover:text-white transition-colors w-full text-center py-2">Pricing</a>
            <Button variant="primary" className="py-2.5! px-8! mt-2 rounded-full! shadow-none w-fit" onClick={() => { smoothScrollToId('pricing'); setIsMobileMenuOpen(false); }}>
              Get Started
            </Button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-24 px-4 md:px-6 overflow-hidden z-10">
        
        {/* Hero BG Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] max-w-300 h-[400px] md:h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(35,248,255,0.15),transparent_70%)] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-white/2 border border-white/10 text-xs md:text-sm font-medium mb-6 md:mb-8 text-neutral-300 animate-fade-in-up backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <span className="flex h-2 w-2 rounded-full bg-[#23f8ff] animate-pulse-slow shadow-[0_0_8px_#23f8ff]"></span>
            Used by {globalStats.usersValue} Chiefs Worldwide
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-5 md:mb-6 animate-fade-in-up delay-100">
            Max Your Base <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#23f8ff] via-[#60efff] to-[#0061ff] animate-gradient drop-shadow-sm">
              While You Sleep
            </span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed animate-fade-in-up delay-200 px-2">
            The ultimate Clash of Clans automation tool. Auto-farm millions of resources, keep your walls upgrading, and never miss a builder cycle again.
          </p>

          {/* Stats Board */}
          <div className="max-w-3xl mx-auto mb-10 md:mb-12 animate-fade-in-up delay-300">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px bg-linear-to-r from-transparent to-white/10 w-8 sm:w-12 md:w-24"></div>
              <span className="text-[10px] md:text-xs font-bold text-neutral-500 uppercase tracking-[0.2em]">Global Stats</span>
              <div className="h-px bg-linear-to-l from-transparent to-white/10 w-8 sm:w-12 md:w-24"></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {[
                { icon: Coins, value: globalStats.goldValue, label: "Total Gold", color: "text-yellow-400", bg: "bg-yellow-400/5", border: "border-yellow-400/10" },
                { icon: Droplets, value: globalStats.elixirValue, label: "Total Elixir", color: "text-pink-500", bg: "bg-pink-500/5", border: "border-pink-500/10" },
                { icon: Layers, value: globalStats.wallsValue, label: "Walls Upgraded", color: "text-neutral-300", bg: "bg-neutral-500/5", border: "border-neutral-500/10" },
                { icon: Clock, value: globalStats.runTimeValue, label: "Runtime", color: "text-[#23f8ff]", bg: "bg-[#23f8ff]/5", border: "border-[#23f8ff]/10" }
              ].map((stat, idx) => (
                <div 
                  key={idx}
                  className={`group ${stat.bg} ${stat.border} border rounded-2xl p-4 md:p-5 flex flex-col items-center justify-center backdrop-blur-md transition-all duration-300 hover:bg-white/5 hover:-translate-y-1 hover:shadow-lg`}
                >
                  <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color} mb-2 group-hover:scale-110 transition-transform duration-300`} />
                  <div className="text-xl md:text-2xl font-bold text-white mb-1 tracking-tight">
                    <CountUp end={stat.value} duration={2000} />
                  </div>
                  <div className="text-[9px] md:text-[10px] text-neutral-500 font-bold uppercase tracking-wider text-center">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="animate-fade-in-up delay-400">
            <Button variant="primary" className="text-base md:text-lg px-6 py-3 md:px-8 md:py-4 h-auto group" onClick={() => smoothScrollToId('pricing')}>
              View Pricing Plans
              <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Showcase Section */}
      <section ref={showcaseRef} id="showcase" className="relative py-16 md:py-24 px-4 md:px-6 border-t border-white/5 z-10 bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 md:mb-16 ${showcaseInView ? 'animate-smooth-appear' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">See Harvest Bot in Action</h2>
            <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl mx-auto px-4">
              Explore the powerful mechanics working silently behind the scenes.
            </p>
          </div>

          <div className={`grid lg:grid-cols-12 gap-8 lg:gap-12 items-center ${showcaseInView ? 'animate-smooth-appear delay-200' : 'opacity-0'}`}>
            
            {/* Interactive Tabs */}
            <div className="lg:col-span-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:flex lg:flex-col gap-2 sm:gap-3 pb-4 lg:pb-0">
              {SHOWCASE_FEATURES.map((feature) => {
                const isActive = activeShowcase === feature.id;
                return (
                  <button
                    key={feature.id}
                    onClick={() => setActiveShowcase(feature.id)}
                    className={`text-left p-3 sm:p-4 md:p-5 rounded-2xl border transition-all duration-300 group ${
                      isActive 
                        ? 'bg-white/5 border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
                        : 'bg-transparent border-transparent hover:bg-white/2 hover:border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-colors shadow-sm shrink-0 ${
                        isActive ? 'bg-[#23f8ff]/10 text-[#23f8ff] border border-[#23f8ff]/20' : 'bg-white/5 text-neutral-500 border border-white/5 group-hover:text-neutral-300 group-hover:bg-white/10'
                      }`}>
                        <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </div>
                      <h3 className={`font-bold text-xs sm:text-base md:text-lg transition-colors tracking-tight line-clamp-2 ${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-white'}`}>
                        {feature.title}
                      </h3>
                    </div>
                    {/* Desktop detailed description (expands on active) */}
                    <div className={`hidden lg:grid transition-all duration-300 ease-in-out ${isActive ? 'grid-rows-[1fr] opacity-100 mt-3' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
                      <p className="text-sm text-neutral-400 leading-relaxed overflow-hidden">
                        {feature.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* App Window Mockup */}
            <div className="lg:col-span-8 w-full animate-fade-in-up delay-200">
              <div className="w-full aspect-square sm:aspect-video lg:aspect-[16/10] rounded-2xl border border-white/10 bg-[#050505] overflow-hidden relative flex flex-col shadow-2xl">
                
                {/* Window Header */}
                <div className="h-10 md:h-12 border-b border-white/10 bg-white/2 flex items-center px-4 gap-2 shrink-0">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500/80"></div>
                  </div>
                    <div className="flex-1 flex items-center justify-center text-xs md:text-sm font-medium text-neutral-500">
                      
                    </div>
                </div>
                
                {/* Window Body */}
                <div className="flex-1 relative bg-neutral-950 p-6 flex items-center justify-center overflow-hidden">
                  
                  {/* Tech Grid Background */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] md:bg-[size:48px_48px] pointer-events-none" />
                  
                  {/* Dynamic Glowing Orb behind content */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 bg-[#23f8ff]/10 rounded-full blur-[60px] md:blur-[80px] pointer-events-none transition-all duration-700"></div>

                  {SHOWCASE_FEATURES.map((feature) => {
                    if (feature.id !== activeShowcase) return null;
                    return (
                      <div key={feature.id} className="relative z-10 flex flex-col items-center text-center animate-fade-in-up w-full max-w-sm px-4">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/3 border border-white/10 flex items-center justify-center mb-6 shadow-xl backdrop-blur-md">
                           <feature.icon className="w-8 h-8 md:w-10 md:h-10 text-[#23f8ff]" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">{feature.title}</h3>
                        
                        {/* Show desc on mobile inside the window since tabs don't show it */}
                        <p className="text-neutral-400 text-xs md:text-sm leading-relaxed lg:hidden mb-6">
                          {feature.desc}
                        </p>
                        
                        {/* Abstract animated UI blocks representing activity */}
                        <div className="flex flex-col gap-3 w-full opacity-60">
                          <div className="h-2 md:h-2.5 bg-white/5 rounded-full overflow-hidden w-3/4 mx-auto">
                            <div className="h-full bg-[#23f8ff] w-full animate-[pulseSlow_2s_ease-in-out_infinite]"></div>
                          </div>
                          <div className="flex gap-3 justify-center w-full">
                            <div className="h-2 md:h-2.5 bg-white/5 rounded-full overflow-hidden w-1/3">
                              <div className="h-full bg-[#23f8ff]/60 w-full animate-[pulseSlow_3s_ease-in-out_infinite_0.5s]"></div>
                            </div>
                            <div className="h-2 md:h-2.5 bg-white/5 rounded-full overflow-hidden w-1/4">
                              <div className="h-full bg-[#23f8ff]/80 w-full animate-[pulseSlow_2.5s_ease-in-out_infinite_1s]"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section ref={featuresRef} id="features" className="relative py-16 md:py-24 px-4 md:px-6 border-t border-white/5 z-10">
        <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm -z-10" />
        <div className="max-w-6xl mx-auto">
          <div className={`text-center mb-12 md:mb-16 ${featuresInView ? 'animate-smooth-appear' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Why Harvest Bot?</h2>
            <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl mx-auto px-4">
              Designed to mimic human behavior while maximizing resource gain. Safe, fast, and efficient.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Target, title: "Best Base Hunter", desc: "Automatically identifies bases with full collectors for maximum loot with minimal troop cost." },
              { icon: ShieldCheck, title: "Anti-Ban AI", desc: "Uses randomized click delays, screen offsets, and human-like scrolling to bypass detection systems." },
              { icon: Swords, title: "Multiple Army Styles", desc: "Switch between different army compositions and attack strategies to match your preferred farming style." },
              { icon: BarChart3, title: "Loot Statistics", desc: "Track your gold, elixir, and dark elixir gains per hour directly on your dashboard." },
              { icon: Timer, title: "24/7 Running", desc: "Runs nonstop with stable automation loops to keep farming active around the clock." },
              { icon: ArrowUpCircle, title: "Auto-Upgrade Walls", desc: "Overflowing with resources? Harvest Bot can automatically dump excess loot into walls." },
            ].map((feat, idx) => (
              <div 
                key={idx} 
                className={`group p-6 md:p-8 rounded-2xl bg-white/2 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] hover:bg-white/4 hover:border-white/10 hover:-translate-y-1 transition-all duration-300 ${featuresInView ? 'animate-smooth-appear' : 'opacity-0'}`}
                style={{ animationDelay: featuresInView ? `${idx * 80}ms` : '0ms' }}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center mb-4 md:mb-6 group-hover:bg-[#23f8ff]/10 group-hover:border-[#23f8ff]/20 transition-colors duration-300 shadow-sm">
                  <feat.icon className="w-5 h-5 md:w-6 md:h-6 text-neutral-400 group-hover:text-[#23f8ff] transition-colors duration-300" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2 md:mb-3 tracking-tight">{feat.title}</h3>
                <p className="text-neutral-400 leading-relaxed text-xs md:text-sm">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={vouchesRef} id="vouches" className="relative py-16 md:py-24 overflow-hidden z-10 border-t border-white/5">
        <div className={`max-w-7xl mx-auto px-4 md:px-6 mb-10 md:mb-12 text-center ${vouchesInView ? 'animate-smooth-appear' : 'opacity-0'}`}>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Chiefs Love Harvest Bot</h2>
          <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl mx-auto">
            Live vouches pulled from our Discord community.
          </p>
        </div>

        <div className={`relative flex overflow-hidden w-full group mask-[linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] md:mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] ${vouchesInView ? 'animate-smooth-appear delay-200' : 'opacity-0'}`}>
          <div className="flex gap-4 md:gap-6 animate-scroll w-max pr-4 md:pr-6">
            {[...vouches, ...vouches].map((vouch, idx) => (
              <div 
                key={`${vouch.id}-${idx}`} 
                className="w-[280px] sm:w-[320px] md:w-[400px] shrink-0 p-5 md:p-6 rounded-2xl bg-white/2 border border-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] flex flex-col justify-between hover:bg-white/4 transition-colors duration-300 transform-gpu"
                style={{ WebkitBackfaceVisibility: 'hidden', backfaceVisibility: 'hidden', WebkitPerspective: 1000, perspective: 1000 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <img src={vouch.avatar} alt={vouch.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-neutral-900 border border-white/10" />
                      <div>
                        <div className="text-xs md:text-sm font-bold text-white truncate max-w-[100px] sm:max-w-[120px] md:max-w-[150px]">{vouch.name}</div>
                        <div className="text-[10px] md:text-xs text-neutral-500 font-medium truncate max-w-[100px] sm:max-w-[120px] md:max-w-[150px]">@{vouch.username}</div>
                      </div>
                    </div>
                    <div className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-neutral-400 bg-white/5 border border-white/5 px-2 py-1 rounded-md flex items-center gap-1.5 shrink-0">
                      <MessageSquareQuote className="w-3 h-3 hidden sm:block" />
                      Discord
                    </div>
                  </div>
                  <p className="text-neutral-300 text-xs md:text-sm leading-relaxed whitespace-pre-wrap line-clamp-5">
                    {vouch.text}
                  </p>
                </div>
                <div className="mt-5 md:mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] md:text-xs text-neutral-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-[#23f8ff] text-[#23f8ff]" />
                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-[#23f8ff] text-[#23f8ff]" />
                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-[#23f8ff] text-[#23f8ff]" />
                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-[#23f8ff] text-[#23f8ff]" />
                    <Star className="w-3 h-3 md:w-3.5 md:h-3.5 fill-[#23f8ff] text-[#23f8ff]" />
                  </span>
                  <span>{formatVouchDate(vouch.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section ref={pricingRef} id="pricing" className="relative py-16 md:py-24 px-4 md:px-6 border-t border-white/5 z-10">
        <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-md -z-10" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-[radial-gradient(ellipse_at_bottom,rgba(35,248,255,0.06)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className={`text-center mb-8 md:mb-10 ${pricingInView ? 'animate-smooth-appear' : 'opacity-0'}`}>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">Simple Pricing</h2>
            <p className="text-sm sm:text-base md:text-lg text-neutral-400 max-w-2xl mx-auto px-4">
              Choose the plan that fits your village needs.
            </p>
          </div>

          {/* Pricing Toggle */}
          <div className={`flex justify-center mb-10 md:mb-12 ${pricingInView ? 'animate-smooth-appear delay-100' : 'opacity-0'}`}>
            <div className="relative inline-flex bg-white/3 border border-white/10 rounded-full p-1 shadow-inner mt-4">
              {/* Toggle Highlight */}
              <div 
                className={`absolute inset-y-1 w-[120px] md:w-[130px] bg-white/10 rounded-full shadow-sm border border-white/10 transition-transform duration-300 ease-out ${
                  billingCycle === 'lifetime' ? 'translate-x-[120px] md:translate-x-[130px]' : 'translate-x-0'
                }`}
              />
              
              <button 
                onClick={() => setBillingCycle('subscription')}
                className={`relative z-10 w-[120px] md:w-[130px] py-2 md:py-2.5 text-xs md:text-sm font-bold tracking-wide transition-colors duration-200 ${
                  billingCycle === 'subscription' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Subscriptions
              </button>
              <button 
                onClick={() => setBillingCycle('lifetime')}
                className={`relative z-10 w-[120px] md:w-[130px] py-2 md:py-2.5 text-xs md:text-sm font-bold tracking-wide transition-colors duration-200 flex items-center justify-center gap-1 ${
                  billingCycle === 'lifetime' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Lifetime
                <span className="absolute -top-3 -right-2 md:-right-4 px-2 md:px-2.5 py-0.5 bg-linear-to-r from-[#23f8ff] to-[#00c6ff] text-neutral-950 text-[9px] md:text-[10px] font-extrabold tracking-wide uppercase rounded-full shadow-[0_2px_10px_rgba(35,248,255,0.4)] border border-white/20">
                  Save 60%
                </span>
              </button>
            </div>
          </div>

          <div className={`grid gap-4 md:gap-6 mx-auto transition-all duration-300 ${billingCycle === 'subscription' ? 'sm:grid-cols-2 md:grid-cols-3 max-w-5xl' : 'max-w-md'}`}>
            {PRICING_PLANS.filter(plan => billingCycle === 'subscription' ? plan.id !== 'lifetime' : plan.id === 'lifetime').map((plan, idx) => (
              <div 
                key={plan.id} 
                className={`relative p-6 md:p-8 rounded-2xl flex flex-col transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${pricingInView ? 'animate-smooth-appear' : 'opacity-0'} ${
                  plan.recommended 
                    ? 'bg-neutral-900 border border-[#23f8ff]/50 shadow-[0_0_30px_rgba(35,248,255,0.1)] md:-translate-y-2' 
                    : 'bg-white/2 border border-white/5 hover:border-white/10 hover:bg-white/4'
                }`}
                style={{ animationDelay: pricingInView ? `${idx * 100}ms` : '0ms' }}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 md:py-1.5 bg-linear-to-r from-[#23f8ff] to-[#00c6ff] text-neutral-950 text-[9px] md:text-[10px] font-extrabold uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(35,248,255,0.5)] border border-white/20 whitespace-nowrap">
                    Best Value
                  </div>
                )}
                <div className="mb-5 md:mb-6">
                  <h3 className="text-base md:text-lg font-bold text-white mb-2 tracking-tight">{plan.name}</h3>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">{plan.price}</span>
                    <span className="text-xs md:text-sm text-neutral-500 mb-1 font-medium">/ {plan.duration}</span>
                  </div>
                </div>
                
                <ul className="space-y-3 md:space-y-4 mb-6 md:mb-8 grow">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-neutral-300 font-medium">
                      <Check className={`w-4 h-4 md:w-5 md:h-5 shrink-0 ${plan.recommended ? 'text-[#23f8ff]' : 'text-neutral-500'}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <Button 
                  variant={plan.recommended ? 'primary' : 'secondary'} 
                  className="w-full shadow-none text-sm md:text-base py-3"
                  onClick={() => onCheckout(plan)}
                >
                  Choose {plan.name}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative pt-16 md:pt-20 pb-8 md:pb-10 px-6 border-t border-white/5 z-10 bg-[#0a0a0a]">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-[#23f8ff]/2 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10 lg:gap-6 mb-12 md:mb-16">
            
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white mb-4 md:mb-5 cursor-pointer">
                <img src="/logo.png" alt="HarvestBot" className="w-8 h-8 rounded-full object-cover" />
                HarvestBot
              </div>
              <p className="text-neutral-400 text-xs md:text-sm leading-relaxed max-w-sm mb-5 md:mb-6 font-medium">
                The #1 Automation Tool for Clash of Clans. Helping Chiefs max their bases faster since 2025. Save time, farm smart, and dominate the leaderboards.
              </p>
              <div className="flex items-center gap-3">
                <a href="#" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-[#23f8ff] hover:bg-[#23f8ff]/10 hover:border-[#23f8ff]/30 transition-all duration-300">
                   <MessageSquare className="w-4 h-4" />
                </a>
                <a href="#" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/3 border border-white/5 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 transition-all duration-300">
                   <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4 md:mb-5 text-sm tracking-wide">Product</h3>
              <ul className="space-y-3 md:space-y-3.5">
                <li><a href="#features" className="text-xs md:text-sm text-neutral-500 hover:text-[#23f8ff] transition-colors font-medium">Features</a></li>
                <li><a href="#pricing" className="text-xs md:text-sm text-neutral-500 hover:text-[#23f8ff] transition-colors font-medium">Pricing</a></li>
                <li><a href="#vouches" className="text-xs md:text-sm text-neutral-500 hover:text-[#23f8ff] transition-colors font-medium">Testimonials</a></li>
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-[#23f8ff] transition-colors font-medium">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4 md:mb-5 text-sm tracking-wide">Support</h3>
              <ul className="space-y-3 md:space-y-3.5">
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">Discord Server</a></li>
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">Documentation</a></li>
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">FAQ</a></li>
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">Contact Us</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-4 md:mb-5 text-sm tracking-wide">Legal</h3>
              <ul className="space-y-3 md:space-y-3.5">
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">Terms of Service</a></li>
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">Privacy Policy</a></li>
                <li><a href="#" className="text-xs md:text-sm text-neutral-500 hover:text-white transition-colors font-medium">Refund Policy</a></li>
              </ul>
            </div>
            
          </div>

          <div className="pt-6 md:pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
            <p className="text-[10px] md:text-xs text-neutral-600 font-medium shrink-0 order-2 md:order-1">
              © {new Date().getFullYear()} HarvestBot. All rights reserved.
            </p>
            <p className="text-[9px] md:text-[10px] lg:text-xs text-neutral-600 font-medium text-center md:text-right max-w-2xl leading-relaxed order-1 md:order-2">
              This material is unofficial and is not endorsed by Supercell. For more information see Supercell's Fan Content Policy: <a href="https://supercell.com/en/fan-content-policy/" className="hover:text-neutral-400 transition-colors underline underline-offset-2">www.supercell.com/fan-content-policy</a>.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- CHECKOUT PAGE COMPONENT ---
// Note: Checkout page has been moved to app/payment/page.tsx
// Access it at /payment?plan=<planname>&payment=<method>

export default function Page() {
  // If Discord OAuth redirected to "/" with ?code & ?state, bounce to the
  // original page (carried in `state`) so its callback handler can finish.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const stateParam = params.get("state");
    if (!code || !stateParam) return;
    try {
      const target = new URL(stateParam, window.location.origin);
      if (target.origin !== window.location.origin) return;
      target.searchParams.set("code", code);
      target.searchParams.set("state", stateParam);
      window.location.replace(target.toString());
    } catch {
      // Ignore invalid state values.
    }
  }, []);

  const handleCheckout = (plan: any) => {
    const planName = plan.name?.toLowerCase().replace(/[^a-z0-9]/g, '') || plan.id;
    const price = typeof plan.price === 'string' ? plan.price.replace('$', '') : plan.price;
    window.location.href = `/payment?plan=${planName}&payment=binance_pay`;
  };

  return <LandingPage onCheckout={handleCheckout} />;
}
