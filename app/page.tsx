"use client";
import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Zap, 
  BarChart3, 
  Clock, 
  CheckCircle, 
  ArrowRight, 
  Menu, 
  X, 
  Sword, 
  Shield, 
  Cpu, 
  Layers,
  ChevronRight,
  Star,
  Quote
} from 'lucide-react';

/**
 * ANIMATION HOOKS & COMPONENTS
 */
const useOnScreen = (options) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, options);

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options]);

  return [ref, isVisible];
};

const FadeIn = ({ children, delay = 0, direction = 'up', className = "", fullWidth = false }) => {
  const [ref, isVisible] = useOnScreen({ threshold: 0.1 });
  
  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up': return 'translateY(30px)';
        case 'down': return 'translateY(-30px)';
        case 'left': return 'translateX(-30px)';
        case 'right': return 'translateX(30px)';
        default: return 'translateY(30px)';
      }
    }
    return 'translate(0)';
  };

  return (
    <div
      ref={ref}
      style={{ 
        transitionDelay: `${delay}ms`,
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
      }}
      className={`transition-all duration-1000 cubic-bezier(0.17, 0.55, 0.55, 1) ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handle scroll for navbar styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      const offsetTop = element.offsetTop - 100; // Account for fixed header
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
      setMobileMenuOpen(false);
    }
  };

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'Pricing', href: '#pricing' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#23f8ff] selection:text-slate-900 overflow-x-hidden">
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.15; transform: scale(1.1); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 2s; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
      `}</style>
      
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#23f8ff]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* NAVIGATION */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50 py-4 shadow-lg shadow-black/20' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-2xl tracking-tighter cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 bg-gradient-to-br from-[#23f8ff] to-[#00d0d6] rounded-xl flex items-center justify-center shadow-lg shadow-[#23f8ff]/20 group hover:shadow-[#23f8ff]/40 transition-all duration-300">
              <Bot className="text-slate-900 w-6 h-6 group-hover:rotate-12 transition-transform duration-300" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              Harvest<span className="text-[#23f8ff]">Bot</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-sm font-medium text-slate-300 hover:text-[#23f8ff] transition-colors relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#23f8ff] transition-all duration-300 group-hover:w-full"></span>
              </a>
            ))}
            <button className="bg-[#23f8ff] hover:bg-[#1ac2c7] text-slate-900 px-5 py-2.5 rounded-lg font-bold transition-all hover:shadow-[0_0_25px_rgba(35,248,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-sm group">
              Start Farming
              <ChevronRight className="w-4 h-4 inline-block ml-1 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-slate-300 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 p-6 flex flex-col gap-4 animate-in slide-in-from-top-5 shadow-2xl">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href}
                onClick={(e) => scrollToSection(e, link.href)}
                className="text-lg font-medium text-slate-300 hover:text-[#23f8ff] py-2 border-b border-slate-800/50"
              >
                {link.name}
              </a>
            ))}
            <button className="bg-[#23f8ff] text-slate-900 px-5 py-3 rounded-lg font-bold w-full mt-2 shadow-[0_0_20px_rgba(35,248,255,0.3)]">
              Start Farming
            </button>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <FadeIn direction="right">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#23f8ff]/10 border border-[#23f8ff]/20 text-[#23f8ff] text-xs font-semibold uppercase tracking-wider mb-6 hover:bg-[#23f8ff]/20 transition-colors cursor-default">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#23f8ff] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#23f8ff]"></span>
                </span>
                Updated for Town Hall 16
              </div>
            </FadeIn>
            
            <FadeIn delay={100} direction="right">
              <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight">
                Max Your Base <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#23f8ff] via-[#00d0d6] to-purple-500">
                  While You Sleep
                </span>
              </h1>
            </FadeIn>
            
            <FadeIn delay={200} direction="right">
              <p className="text-lg text-slate-400 mb-8 max-w-xl leading-relaxed">
                The ultimate Clash of Clans automation tool. Auto-farm millions of resources, keep your walls upgrading, and never miss a builder cycle again.
              </p>
            </FadeIn>
            
            <FadeIn delay={300} direction="up">
              <div className="flex flex-col sm:flex-row gap-4">
                <button className="flex items-center justify-center gap-2 bg-white text-slate-950 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all hover:-translate-y-1 shadow-[0_0_20px_rgba(255,255,255,0.15)] group">
                  Download Bot
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="flex items-center justify-center gap-2 bg-slate-800/50 backdrop-blur border border-slate-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:-translate-y-1 hover:border-[#23f8ff]/50">
                  View Features
                </button>
              </div>
            </FadeIn>
            
            <FadeIn delay={400} direction="up">
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs font-bold text-slate-300 hover:-translate-y-1 hover:z-10 transition-transform cursor-default">
                      C{i}
                    </div>
                  ))}
                </div>
                <p>Used by 10,000+ Chiefs Worldwide</p>
              </div>
            </FadeIn>
          </div>

          {/* Hero Visual - Stats Overview */}
          <FadeIn delay={200} direction="left" className="relative perspective-1000">
            <div className="relative z-10 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden group animate-float transform hover:scale-[1.02] transition-transform duration-500 hover:border-[#23f8ff]/20">
               {/* Dashboard Header */}
               <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-[#23f8ff]/50" />
                </div>
                <div className="text-xs font-mono text-slate-500">LIVE GLOBAL METRICS</div>
              </div>

              {/* Stats Grid */}
              <div className="p-6 md:p-8 grid grid-cols-2 gap-4 bg-slate-900/95 relative">
                 {/* Decorative BG elements */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#23f8ff]/5 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[80px] -ml-16 -mb-16 pointer-events-none" />

                 {/* Gold Card */}
                 <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 hover:border-yellow-500/40 transition-all group/card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-yellow-500 blur-xl" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Gold</span>
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-white mb-1 group-hover/card:text-yellow-400 transition-colors">
                        842<span className="text-slate-600">.</span>5B
                    </div>
                    <div className="text-xs text-slate-500 font-mono">Harvested</div>
                 </div>

                 {/* Elixir Card */}
                 <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 hover:border-purple-500/40 transition-all group/card relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-purple-500 blur-xl" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Elixir</span>
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-white mb-1 group-hover/card:text-purple-400 transition-colors">
                        650<span className="text-slate-600">.</span>9B
                    </div>
                    <div className="text-xs text-slate-500 font-mono">Harvested</div>
                 </div>

                 {/* Walls Card */}
                 <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 hover:border-[#23f8ff]/40 transition-all group/card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-[#23f8ff] blur-xl" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-[#23f8ff] animate-pulse" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Walls</span>
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-white mb-1 group-hover/card:text-[#23f8ff] transition-colors">
                        12<span className="text-slate-600">.</span>4M
                    </div>
                    <div className="text-xs text-slate-500 font-mono">Upgraded</div>
                 </div>

                 {/* Users Card */}
                 <div className="bg-slate-950/80 p-5 rounded-xl border border-slate-800 hover:border-green-500/40 transition-all group/card relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                        <div className="w-16 h-16 rounded-full bg-green-500 blur-xl" />
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Users</span>
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-white mb-1 group-hover/card:text-green-400 transition-colors">
                        15<span className="text-slate-600">,</span>420
                    </div>
                    <div className="text-xs text-slate-500 font-mono">Active Chiefs</div>
                 </div>
              </div>
            </div>
            
            {/* Decorative Glow */}
            <div className="absolute inset-0 bg-[#23f8ff] blur-[90px] opacity-20 -z-10 transform translate-y-10 animate-pulse-slow" />
          </FadeIn>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="py-24 bg-slate-900/50 relative scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Why Harvest Bot?</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Designed to mimic human behavior while maximizing resource gain. Safe, fast, and efficient.
              </p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Sword className="w-6 h-6 text-yellow-400" />,
                title: "Dead Base Hunter",
                desc: "Automatically identifies abandoned bases with full collectors for maximum loot with minimal troop cost."
              },
              {
                icon: <Shield className="w-6 h-6 text-[#23f8ff]" />,
                title: "Anti-Ban AI",
                desc: "Uses randomized click delays, screen offsets, and human-like scrolling to bypass detection systems."
              },
              {
                icon: <Layers className="w-6 h-6 text-blue-400" />,
                title: "Multi-Account Manager",
                desc: "Farm on unlimited accounts simultaneously. Switch between accounts seamlessly to keep builders busy."
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
                title: "Loot Statistics",
                desc: "Track your gold, elixir, and dark elixir gains per hour. Analyze your best raiding times."
              },
              {
                icon: <Clock className="w-6 h-6 text-orange-400" />,
                title: "Smart Scheduling",
                desc: "Configurable breaks to simulate sleep patterns. Keeps your account online to protect resources."
              },
              {
                icon: <Cpu className="w-6 h-6 text-pink-400" />,
                title: "Auto-Upgrade Walls",
                desc: "Overflowing with resources? Harvest Bot can automatically dump excess loot into walls."
              }
            ].map((feature, idx) => (
              <FadeIn key={idx} delay={idx * 150} direction="up">
                <div className="h-full bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-[#23f8ff]/30 hover:bg-slate-900 transition-all duration-300 group hover:-translate-y-2 hover:shadow-xl hover:shadow-[#23f8ff]/5">
                  <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center mb-6 border border-slate-800 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 group-hover:border-[#23f8ff]/30">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-3 text-white group-hover:text-[#23f8ff] transition-colors">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 relative overflow-hidden scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Complete Control <br /> 
                <span className="text-[#23f8ff]">Zero Coding Required</span>
              </h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Get up and running in minutes with our streamlined setup process.
              </p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Install Emulator & Bot", text: "Works perfectly with Bluestacks, LDPlayer, or MEmu. One-click setup wizard included." },
              { title: "Select Strategy", text: "Choose from Barch, Sneaky Goblins, or Electro Dragons. Or create your own custom deployment." },
              { title: "Set Loot Criteria", text: "Tell the bot to only attack bases with over 500k Gold/Elixir or specific Dark Elixir amounts." },
              { title: "Start Farming", text: "Sit back and watch your storages fill up. The bot handles training, donating, and attacking." }
            ].map((step, idx) => (
              <FadeIn key={idx} delay={idx * 150} direction="up" className="h-full">
                <div className="h-full bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-[#23f8ff]/30 transition-all duration-300 group hover:-translate-y-1 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] transform translate-x-1/4 -translate-y-1/4">
                    <Bot size={120} />
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-[#23f8ff]/10 border border-[#23f8ff]/30 text-[#23f8ff] flex items-center justify-center font-bold text-xl mb-6 group-hover:bg-[#23f8ff] group-hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(35,248,255,0.1)]">
                    {idx + 1}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-3 group-hover:text-[#23f8ff] transition-colors relative z-10">{step.title}</h4>
                  <p className="text-slate-400 leading-relaxed relative z-10">{step.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="testimonials" className="py-24 bg-slate-900/30 relative scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Chiefs Love Harvest Bot</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Join thousands of satisfied players who have automated their way to max Town Hall.
              </p>
            </FadeIn>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "KingSlayer_99",
                role: "TH16 Legend League",
                text: "I was skeptical about using a bot, but Harvest Bot's anti-ban features are legit. Maxed my walls in just 3 weeks without lifting a finger.",
                rating: 5
              },
              {
                name: "ClanMasterJ",
                role: "Clan Leader",
                text: "Managing 15 donation accounts used to be a full-time job. Now I just set it up once a week and my clan castle is always full. Game changer.",
                rating: 5
              },
              {
                name: "ElectroQueen",
                role: "TH15 Farmer",
                text: "The smart scheduling is my favorite feature. It looks exactly like I'm playing manually. Customer support helped me set up my custom config in minutes.",
                rating: 5
              }
            ].map((review, idx) => (
              <FadeIn key={idx} delay={idx * 150} direction="up">
                <div className="h-full bg-slate-950 border border-slate-800 p-8 rounded-2xl hover:border-[#23f8ff]/30 transition-all duration-300 group hover:-translate-y-1 relative">
                  <div className="absolute top-6 right-8 text-slate-800 group-hover:text-[#23f8ff]/10 transition-colors">
                    <Quote size={48} />
                  </div>
                  <div className="flex gap-1 mb-6">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-[#23f8ff] text-[#23f8ff]" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 leading-relaxed relative z-10">
                    "{review.text}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center font-bold text-slate-300">
                      {review.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-white group-hover:text-[#23f8ff] transition-colors">{review.name}</h4>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">{review.role}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-24 bg-slate-950 border-t border-slate-900 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-slate-400">Choose the plan that fits your village needs.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Scout", price: "Free", feat: ["2 Hours/Day", "1 Account", "Basic Barch Strategy", "Standard Support"] },
              { name: "Warlord", price: "$12", period: "/mo", feat: ["Unlimited Farming", "3 Accounts", "Advanced Strategies (Edrag/Hybrid)", "Smart Wall Upgrader", "Priority Support"], popular: true },
              { name: "Legend", price: "$25", period: "/mo", feat: ["Unlimited Accounts", "Cloud Hosting (No PC Needed)", "Custom Scripting", "24/7 VIP Support"] }
            ].map((plan, idx) => (
              <FadeIn key={idx} delay={idx * 150} direction="up" className={`relative h-full`}>
                <div className={`h-full p-8 rounded-2xl flex flex-col transition-all duration-300 ${plan.popular ? 'bg-slate-900 border-2 border-[#23f8ff] shadow-[0_0_30px_rgba(35,248,255,0.15)] transform md:-translate-y-4 hover:shadow-[0_0_50px_rgba(35,248,255,0.25)]' : 'bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700'}`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#23f8ff] text-slate-900 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                      Best Value
                    </div>
                  )}
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-slate-400 mb-2">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      {plan.period && <span className="text-slate-500">{plan.period}</span>}
                    </div>
                  </div>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.feat.map((f, i) => (
                      <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                        <CheckCircle className={`w-4 h-4 ${plan.popular ? 'text-[#23f8ff]' : 'text-slate-600'}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-3 rounded-lg font-bold transition-all ${plan.popular ? 'bg-[#23f8ff] hover:bg-[#1ac2c7] text-slate-900 shadow-lg hover:shadow-[#23f8ff]/25' : 'bg-slate-800 hover:bg-slate-700 text-white hover:shadow-lg'}`}>
                    Choose {plan.name}
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 pt-20 pb-10 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 font-bold text-xl mb-6">
                <div className="w-8 h-8 bg-[#23f8ff] rounded-lg flex items-center justify-center">
                  <Bot className="text-slate-900 w-5 h-5" />
                </div>
                <span>HarvestBot</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                The #1 Automation Tool for Clash of Clans. Helping Chiefs max their bases faster since 2023. Not affiliated with Supercell.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Product</h4>
              <ul className="space-y-4 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Strategies</a></li>
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Download</a></li>
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Community Configs</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-slate-500 text-sm">
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-[#23f8ff] transition-colors">Fair Play Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-sm">
            <p>© 2024 Harvest Bot Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[#23f8ff]">Twitter</a>
              <a href="#" className="hover:text-[#23f8ff]">GitHub</a>
              <a href="#" className="hover:text-[#23f8ff]">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}