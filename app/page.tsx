"use client";
import React, { useState, useEffect, useRef } from 'react';
// Link import removed
import { 
  Bot,
  Loader2,
  Copy,
  AlertCircle,
  Info,
  RefreshCw,
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
  Send,
} from 'lucide-react';

/**
 * ANIMATION HOOKS & COMPONENTS
 */
const useOnScreen = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, options);

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, [options]);

  return [ref, isVisible] as const;
};

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  fullWidth?: boolean;
};

const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  direction = "up",
  className = "",
  fullWidth = false,
}) => {
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
 * TYPES
 */
type Vouch = {
  id: string;
  name: string;
  username: string;
  discriminator: string;
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

type Plan = {
  name: string;
  price: string;
  period: string;
  feat: string[];
  popular?: boolean;
};

type PaymentSession = {
  sessionId: string;
  orderId: string;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'expired';
};

type ToastState = {
  message: string;
  type: 'success' | 'error' | 'info';
  visible: boolean;
};

/**
 * MAIN APP COMPONENT
 */
export default function App() {
  const WORKER_API = "https://late-bread-b04a.white-devil-dev-141.workers.dev/vouches?limit=20";
  const API_DOMAIN = "https://api.harvestbot.app"; 
  const WEBHOOK_URL = `${API_DOMAIN}/api/v1/licenses/generate`;

  // Mocking flag for preview environment (set to false in production)
  const IS_MOCK_MODE = false;

  const [vouches, setVouches] = useState<Vouch[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats>({
    goldValue: "0",
    elixirValue: "0",
    wallsValue: "0",
    runTimeValue: "0h-0m",
    usersValue: "0",
  });
  const [vouchesLoading, setVouchesLoading] = useState(true);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());

  // Checkout State
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'init' | 'payment' | 'success' | 'expired'>('init');
  const [session, setSession] = useState<PaymentSession | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [toast, setToast] = useState<ToastState | null>(null);

  // -- MODERN ALERT on TOP-RIGHT ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, visible: true });
    // Auto hide after 5 seconds
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);
  };

  const copyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showToast("Copied to clipboard!", "success");
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      showToast("Failed to copy.", "error");
    }
    document.body.removeChild(textArea);
  };

  // --- PAYMENT LOGIC START ---

  // 1. Create Session
  const createPaymentSession = async () => {
    if (!selectedPlan) return;
    setCheckoutStep('init');
    setErrorMessage('');
    
    try {
      const amount = Number(selectedPlan.price.replace("$", ""));
      
      let data;
      if (IS_MOCK_MODE) {
         // Mock API response
         await new Promise(r => setTimeout(r, 1000)); 
         data = { 
           sessionId: `sess_${Math.random().toString(36).substr(2, 9)}`,
           orderId: `ORD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
           status: 'pending'
         };
         showToast("Mock payment session created.", "info");
      } else {
        const res = await fetch(`${API_DOMAIN}/api/v1/payments/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amount })
        });
        if(!res.ok) throw new Error("Failed to create session");
        data = await res.json();
        showToast("Payment session created.", "info");
      }

      setSession(data);
      setCheckoutStep('payment');
    } catch (err: any) {
      setErrorMessage(err.message || "Could not initialize payment.");
    }
  };

  // 2. Poll Status
  useEffect(() => {
    if (checkoutStep !== 'payment' || !session) return;

    const pollInterval = setInterval(async () => {
       try {
         let status = session.status;
         
         if (IS_MOCK_MODE) {
             // Mock status update: 50% chance to pay after 5 seconds in mock mode
             // Forcing "paid" for demo purposes if user waits
             const mockChance = Math.random();
             if (mockChance > 0.8) status = 'paid';
         } else {
             const res = await fetch(`${API_DOMAIN}/api/v1/payments/sessions/${session.sessionId}`);
             const data = await res.json();

             if (data.status === 'paid') {
               clearInterval(pollInterval);
               setSession(data);
               handlePaymentSuccess(data);
             } else if (data.status === 'expired' || data.status === 'failed') {
               clearInterval(pollInterval);
               setSession(data);
               setCheckoutStep('expired');
               showToast("Payment session expired or failed.", "error");
             }
         }
       } catch (err) {
         console.error("Polling error", err);
       }
    }, 10000);

    return () => clearInterval(pollInterval);
  }, [checkoutStep, session]);

  // 3. Handle Success (Webhook Call)
  const handlePaymentSuccess = async (completedSession: PaymentSession) => {
     try {
       let license = "";

       if (IS_MOCK_MODE) {
         const res = await fetch(WEBHOOK_URL, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
             sessionId: completedSession.sessionId,
           })
         });
         const data = await res.json();
         license = data.licenseKey;
         showToast("Mock license generated.", "success");
       } else {
          // Call the webhook / license generation endpoint
          const res = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: completedSession.sessionId,
            })
          });
          if (!res.ok) throw new Error("Failed to generate license");
          const data = await res.json();
          license = data.licenseKey;
       }

       setLicenseKey(license);
       setCheckoutStep('success');
     } catch (err) {
       setErrorMessage("Payment confirmed, but failed to generate license. Contact support.");
     }
  };

  // --- PAYMENT LOGIC END ---

  const closeCheckout = async () => {
    if (session && !IS_MOCK_MODE) {
    const res = await fetch(`${API_DOMAIN}/api/v1/payments/sessions/${session.sessionId}/close`, {
        method: "POST",
      });
      if (!res.ok) {
        console.error("Failed to close session");
      }
    }
    setSelectedPlan(null);
    setCheckoutStep('init');
    setSession(null);
    setLicenseKey('');
    setErrorMessage('');
    
  };

  // Auto-start payment when plan is selected
  useEffect(() => {
      if (selectedPlan && checkoutStep === 'init' && !session) {
        createPaymentSession();
      }
    }, [selectedPlan]);


  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const r = await fetch(WORKER_API, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);

        const data = await r.json();
        if (!alive) return;

        const safeVouches = Array.isArray(data?.vouches) ? data.vouches : [];
        setVouches(safeVouches);
        setVouchesLoading(false);
      } catch {
        if (!alive) return;

        setVouches([]);
        setVouchesLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // fetch global stats
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API_DOMAIN}/api/v1/stats`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        data && alive && setGlobalStats({
          goldValue: data.total_gold || "0",
          elixirValue: data.total_elixir || "0",
          wallsValue: data.total_walls || "0",
          runTimeValue: data.total_runtime || "0h-0m",
          usersValue: data.total_users || "0",
        });
      } catch {
        if (!alive) return;
        setGlobalStats({
          goldValue: "0",
          elixirValue: "0",
          wallsValue: "0",
          runTimeValue: "0h-0m",
          usersValue: "0",
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const timeAgo = (iso: string) => {
    const d = new Date(iso).getTime();
    const s = Math.floor((Date.now() - d) / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };


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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();

    const element = document.querySelector(href);
    if (!element) return;

    const el = element as HTMLElement;
    const offsetTop = el.offsetTop - 100;

    window.scrollTo({ top: offsetTop, behavior: "smooth" });
    setMobileMenuOpen(false);
  };


  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How it Works', href: '#how-it-works' },
    { name: 'Feedbacks', href: '#feedbacks' },
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
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 7s ease-in-out infinite 2s; }
        .animate-pulse-slow { animation: pulse-slow 8s ease-in-out infinite; }
        .animate-scroll {
          animation: scroll 60s linear infinite;
          width: max-content;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
      
      {/* BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#23f8ff]/10 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      {/* GLOBAL TOAST */}
      {toast && toast.visible && (
        <div className={`fixed top-6 right-6 z-[120] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md animate-in slide-in-from-right-5 fade-in duration-300 ${
          toast.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
          toast.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
          'bg-blue-500/10 border-blue-500/20 text-blue-400'
        }`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <AlertCircle size={20} />}
          {toast.type === 'info' && <Info size={20} />}
          <span className="font-medium text-sm">{toast.message}</span>
          <button onClick={() => setToast(prev => prev ? { ...prev, visible: false } : null)} className="ml-2 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* CHECKOUT MODAL */}
      {selectedPlan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={closeCheckout} />
          
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900">
              <div>
                <h3 className="text-xl font-bold text-white">Binance Pay</h3>
                <p className="text-sm text-slate-400">Harvest Bot - {selectedPlan.name} Plan</p>
              </div>
              <button onClick={closeCheckout} className="text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              
              {/* INIT STATE */}
              {checkoutStep === 'init' && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                   <div className="relative">
                     <Loader2 className="w-10 h-10 text-[#23f8ff] animate-spin" />
                   </div>
                   <h4 className="text-lg font-bold text-white mt-6 mb-2">Creating Payment Session</h4>
                   <p className="text-slate-400 text-sm">Please wait...</p>
                   {errorMessage && <p className="text-red-400 mt-4 text-sm">{errorMessage}</p>}
                </div>
              )}

              {/* PAYMENT STATE */}
              {checkoutStep === 'payment' && session && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 mb-6 flex justify-between items-center">
                     <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total to Pay</p>
                        <p className="text-2xl font-bold text-[#23f8ff]">{selectedPlan.price}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Status</p>
                        <div className="flex items-center gap-2 justify-end">
                           <span className="relative flex h-2 w-2">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                             <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-400"></span>
                           </span>
                           <span className="text-yellow-400 font-bold text-sm">Awaiting Payment</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="bg-white p-3 rounded-xl shadow-lg shadow-black/20">
                      {/* Using a static QR for demo, but normally this would come from the session data */}
                      <img 
                        src={`qr-${selectedPlan.price.replace("$", "")}-usdt.png`} 
                        alt="Binance Pay QR" 
                        className="w-40 h-40 mix-blend-multiply"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-3 uppercase tracking-wider font-semibold">Scan with Binance App</p>
                    {IS_MOCK_MODE && (
                        <p className="text-[10px] text-green-400 mt-1 animate-pulse">(Simulating Payment... Wait 5s)</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Order ID (Reference)</label>
                      <div className="flex gap-2">
                        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white font-mono text-base font-bold flex items-center justify-between tracking-wide">
                           <span>{session.orderId}</span>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(session.orderId)}
                          className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-lg border border-slate-700 transition-colors"
                          title="Copy Order ID"
                        >
                          <Copy size={20} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        <AlertCircle size={12} className="inline mr-1" />
                        If any issues occur, provide this Order ID to support.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* SUCCESS STATE */}
              {checkoutStep === 'success' && (
                <div className="py-6 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 mb-6 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                     <CheckCircle size={32} />
                  </div>
                  <h4 className="text-2xl font-bold text-white mb-2">Payment Confirmed!</h4>
                  <p className="text-slate-400 mb-8">Here is your license key</p>
                  
                  <div className="w-full bg-slate-950 border border-[#23f8ff]/30 rounded-xl p-5 relative group text-left">
                     <div className="text-xs text-[#23f8ff] font-bold uppercase tracking-wider mb-2">License Key</div>
                     <div className="flex items-center justify-between gap-4">
                       <code className="text-lg font-mono text-white tracking-wide break-all">{licenseKey}</code>
                       <button 
                         onClick={() => copyToClipboard(licenseKey)}
                         className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg"
                         title="Copy Key"
                       >
                         <Copy size={20} />
                       </button>
                     </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-6">
                    Paste this key into the bot settings to activate your {selectedPlan.name} plan.
                  </p>
                  
                  <button
                      onClick={closeCheckout}
                      className="mt-8 bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Close Window
                  </button>
                </div>
              )}

              {/* EXPIRED/FAILED STATE */}
              {checkoutStep === 'expired' && (
                  <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                   <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 border border-red-500/20">
                      <X size={32} />
                   </div>
                   <h4 className="text-lg font-bold text-white mb-2">Payment Expired</h4>
                   <p className="text-slate-400 mb-6 max-w-xs">The session timed out or the payment could not be verified.</p>
                   
                   <button
                       onClick={createPaymentSession}
                       className="flex items-center gap-2 bg-[#23f8ff] hover:bg-[#1ac2c7] text-slate-900 px-6 py-3 rounded-lg font-bold transition-colors"
                     >
                       <RefreshCw size={18} />
                       Try Again
                   </button>
                 </div>
              )}
            </div>
            
            {/* Modal Footer (Security Badge) */}
            {(checkoutStep === 'payment' || checkoutStep === 'init') && (
               <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
                  <Shield size={12} />
                  <span>Secured by Harvest Bot Payment System</span>
               </div>
            )}
          </div>
        </div>
      )}

      {/* NAVIGATION */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-slate-950/90 backdrop-blur-lg border-b border-slate-800/50 py-4 shadow-lg shadow-black/20' : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src="/logo.png"
              alt="HarvestBot"
              className="h-9 md:h-10 w-auto object-contain"
            />

            <span className="font-bold text-xl md:text-2xl tracking-tight text-white">
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
            <a
              href="https://discord.com/invite/ymj4rEHpEV"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#23f8ff] hover:bg-[#1ac2c7] text-slate-900 px-5 py-2.5 rounded-lg font-bold transition-all hover:shadow-[0_0_25px_rgba(35,248,255,0.4)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-none text-sm group inline-flex items-center"
            >
              Contact
              <Send className="w-4 h-4 inline-block ml-1 group-hover:translate-x-1 transition-transform" />
            </a>

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
            <a
              href="https://discord.com/invite/ymj4rEHpEV"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#23f8ff] text-slate-900 px-5 py-3 rounded-lg font-bold w-full mt-2 shadow-[0_0_20px_rgba(35,248,255,0.3)] inline-flex items-center justify-center"
            >
              Join Discord
            </a>
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
                New Release: v5.0 Available Now!
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

                <a
                    href="/download/setup.exe"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-white text-slate-950 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-200 transition-all hover:-translate-y-1 shadow-[0_0_20px_rgba(255,255,255,0.15)] group"
                  >
                    Download Bot
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </a>

                <a
                  href="#features"
                  onClick={(e) => scrollToSection(e as unknown as React.MouseEvent<HTMLAnchorElement>, "#features")}
                  className="flex items-center justify-center gap-2 bg-slate-800/50 backdrop-blur border border-slate-700 text-white px-8 py-4 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:-translate-y-1 hover:border-[#23f8ff]/50"
                >
                  View Features
                </a>
              </div>
            </FadeIn>
            
            <FadeIn delay={400} direction="up">
              <div className="mt-10 flex items-center gap-4 text-sm text-slate-500">
                <div className="flex -space-x-3">
                  {[...Array(vouches.length)].map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-950 flex items-center justify-center text-xs font-bold text-slate-300 hover:-translate-y-1 hover:z-10 transition-transform cursor-default">
                      <img className='rounded-full' src={vouches[i]?.avatar || ""} alt={vouches[i]?.name || ""} />
                    </div>
                  ))}
                </div>
                <p>Used by <span className="font-mono ">{globalStats?.usersValue}</span> Chiefs Worldwide</p>
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
                    {globalStats?.goldValue}
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
                    {globalStats?.elixirValue}
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
                    {globalStats?.wallsValue}
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
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">TOTAL RUNTIME</span>
                  </div>
                  <div className="text-2xl md:text-4xl font-bold text-white mb-1 group-hover/card:text-green-400 transition-colors">
                    {globalStats?.runTimeValue}
                  </div>
                  <div className="text-xs text-slate-500 font-mono"></div>
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
                title: "Best Base Hunter",
                desc: "Automatically identifies bases with full collectors for maximum loot with minimal troop cost."
              },
              {
                icon: <Shield className="w-6 h-6 text-[#23f8ff]" />,
                title: "Anti-Ban AI",
                desc: "Uses randomized click delays, screen offsets, and human-like scrolling to bypass detection systems."
              },
              {
                icon: <Layers className="w-6 h-6 text-blue-400" />,
                title: "Multiple Army Styles",
                desc: "Switch between different army compositions and attack strategies to match your preferred farming style."
              },
              {
                icon: <BarChart3 className="w-6 h-6 text-purple-400" />,
                title: "Loot Statistics",
                desc: "Track your gold, elixir, and dark elixir gains per hour."
              },
              {
                icon: <Clock className="w-6 h-6 text-orange-400" />,
                title: "24/7 Running",
                desc: "Runs nonstop with stable automation loops to keep farming active around the clock."
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
              { title: "Install Emulator & Bot", text: "Works perfectly with Bluestacks, LDPlayer. One-click setup wizard included." },
              { title: "Select Strategy", text: "Choose from Barch, Sneaky Goblins, or Electro Dragons / Normal Dragons" },
              { title: "Set Loot Criteria", text: "Tell the bot to only attack bases with over 500k Gold/Elixir or specific Dark Elixir amounts." },
              { title: "Start Farming", text: "Sit back and watch your storages fill up. The bot handles attacking, resource collection, and wall upgrades." }
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

      {/* FEEDBACKS */}
      <section id="feedbacks" className="py-24 bg-slate-900/30 relative scroll-mt-24 overflow-hidden">
        <style>{`
          @keyframes vouchIn {
            0% { opacity: 0; transform: translateY(-10px) scale(0.98); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-vouchIn { animation: vouchIn .6s ease-out both; }
        `}</style>

        <div className="max-w-7xl mx-auto px-6 mb-16">
          <div className="text-center">
            <FadeIn direction="up">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">Chiefs Love Harvest Bot</h2>
              <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                Live vouches pulled from our Discord community.
              </p>
            </FadeIn>
          </div>
        </div>

        {/* Infinite Scroll Container */}
        <div className="max-w-7xl mx-auto px-6">
        <div className="relative w-full overflow-hidden mask-linear-gradient"
        style={{
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            }}> 
           {/* Fade masks on edges */}
           <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none"></div>
           <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none"></div>

            <div className="flex animate-scroll">
              {/* Render items twice for infinite loop */}
              {[...Array(2)].map((_, listIdx) => (
                <div key={listIdx} className="flex gap-6 px-3"> 
                  {(vouchesLoading ? Array.from({ length: 6 }) : vouches).map((v, idx) => {
                    const isSkeleton = vouchesLoading;
                    // Need unique keys across the two lists
                    const key = isSkeleton ? `sk-${listIdx}-${idx}` : `vouch-${listIdx}-${(v as Vouch).id}`;
                    const item = v as Vouch;

                    return (
                      <div
                        key={key}
                        className="w-[350px] md:w-[450px] flex-shrink-0"
                      >
                        <div
                          className={[
                            "h-full rounded-2xl border border-slate-800 bg-slate-950/80 backdrop-blur p-6",
                            "hover:border-[#23f8ff]/30 transition-all duration-300",
                            !isSkeleton && newIds.has(item.id) ? "animate-vouchIn" : "",
                          ].join(" ")}
                        >

                          {isSkeleton ? (
                            <div className="animate-pulse">
                              <div className="flex items-center gap-4 mb-4">
                                <div className="w-11 h-11 rounded-full bg-slate-800" />
                                <div className="flex-1">
                                  <div className="h-3 w-32 bg-slate-800 rounded mb-2" />
                                  <div className="h-3 w-24 bg-slate-800 rounded" />
                                </div>
                              </div>
                              <div className="h-3 w-full bg-slate-800 rounded mb-2" />
                              <div className="h-3 w-5/6 bg-slate-800 rounded mb-2" />
                              <div className="h-3 w-3/4 bg-slate-800 rounded" />
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4 mb-4">
                                <img
                                  src={item.avatar}
                                  alt={item.name}
                                  className="w-11 h-11 rounded-full border border-slate-800 object-cover"
                                />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-white">{item.name}</span>
                                    <span className="text-slate-500 text-sm truncate">@{item.username}</span>
                                    <span className="text-slate-600 text-xs">•</span>
                                    <span className="text-slate-500 text-xs">{timeAgo(item.createdAt)} ago</span>
                                  </div>
                                  <div className="mt-1 inline-flex items-center rounded-full border border-slate-800 bg-slate-900/60 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
                                    Discord Vouch
                                  </div>
                                </div>
                              </div>

                              <p className="text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
                                {item.text}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
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
              {
                name: "Weekly",
                price: "$2",
                period: "/ 7 Days",
                feat: [
                  "Full Bot Access",
                  "All Elite Strategies",
                  "Smart Wall Upgrader",
                  "Standard Support",
                ],
                popular: false
              },
              {
                name: "Monthly",
                price: "$8",
                period: "/ 30 Days",
                feat: [
                  "Full Bot Access",
                  "All Elite Strategies",
                  "Smart Wall Upgrader",
                  "VIP Support",
                ],
                popular: true,
              },
              {
                name: "Bi-Weekly",
                price: "$5",
                period: "/ 15 Days",
                feat: [
                  "Full Bot Access",
                  "All Elite Strategies",
                  "Smart Wall Upgrader",
                  "Priority Support",
                ],
                popular: false
              }
              
            ].map((plan, idx) => (
              <FadeIn key={idx} delay={idx * 150} direction="up" className="relative h-full">
                <div
                  className={`h-full p-8 rounded-2xl flex flex-col transition-all duration-300 ${
                    plan.popular
                      ? "bg-slate-900 border-2 border-[#23f8ff] shadow-[0_0_30px_rgba(35,248,255,0.15)] transform md:-translate-y-4 hover:shadow-[0_0_50px_rgba(35,248,255,0.25)]"
                      : "bg-slate-950 border border-slate-800 hover:bg-slate-900 hover:border-slate-700"
                  }`}
                >
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
                        <CheckCircle className={`w-4 h-4 ${plan.popular ? "text-[#23f8ff]" : "text-[#23f8ff]"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => setSelectedPlan(plan)}
                    className={`w-full py-3 rounded-lg font-bold transition-all text-center ${
                      plan.popular
                        ? "bg-[#23f8ff] hover:bg-[#1ac2c7] text-slate-900 shadow-lg hover:shadow-[#23f8ff]/25"
                        : "bg-slate-800 hover:bg-slate-700 text-white hover:shadow-lg"
                    }`}
                  >
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
                <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="HarvestBot"
                    className="h-9 md:h-10 w-auto object-contain"
                  />
                </div>
                <span>HarvestBot</span>
              </div>
              <p className="text-slate-500 max-w-sm">
                The #1 Automation Tool for Clash of Clans. Helping Chiefs max their bases faster since 2025. Not affiliated with Supercell.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-bold mb-6">Links</h4>
              <ul className="space-y-4 text-slate-500 text-sm">
                <li><a key="features" href="#features" onClick={(e) => scrollToSection(e, "#features")} className="hover:text-[#23f8ff] transition-colors">Features</a></li>
                <li><a href="#how-it-works" onClick={(e) => scrollToSection(e, "#how-it-works")} className="hover:text-[#23f8ff] transition-colors">How it works</a></li>
                <li><a href="#feedbacks" onClick={(e) => scrollToSection(e, "#feedbacks")} className="hover:text-[#23f8ff] transition-colors">Feedbacks</a></li>
                <li><a href="#pricing" onClick={(e) => scrollToSection(e, "#pricing")} className="hover:text-[#23f8ff] transition-colors">Pricing</a></li>
              </ul>
            </div>
            
          </div>
          
          <div className="border-t border-slate-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-600 text-sm">
            <p>© <span>{new Date().getFullYear()}</span> Harvest Bot Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="https://www.youtube.com/@harvest-bot" className="hover:text-[#23f8ff]">Youtube</a>
              <a href="https://discord.com/invite/ymj4rEHpEV" className="hover:text-[#23f8ff]">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}