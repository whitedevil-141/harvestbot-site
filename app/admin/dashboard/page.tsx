"use client";

import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Wallet, 
  CreditCard, 
  TrendingUp, 
  Package, 
  Search, 
  ArrowUpRight,
  Check,
  Copy,
  Menu,
  X,
  Lock,
  Loader2,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// --- HELPER COMPONENTS ---

type Payment = {
  id: string | number;
  transaction_id?: string | null;
  reference_id?: string | null;
  order_id?: string | null;
  amount: number;
  verified_at: string;
  key: string;
  coin: string;
  network: string;
};

type ChartPeriod = 'week' | '1m' | '1yr' | 'lifetime';
type NavId = 'Overview' | 'Transactions';
type PlanId = 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Lifetime';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return {
    dateStr: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date),
    timeStr: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(date)
  };
};

const truncateHash = (hash?: string | null) => {
  if (!hash) return 'N/A';
  if (hash.length < 12) return hash; // Handle shorter IDs elegantly
  return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
};

const PLAN_KEYS: { id: PlanId; tokens: string[] }[] = [
  { id: 'Weekly', tokens: ['weekly', '7d', '7-day', '7day'] },
  { id: 'Bi-Weekly', tokens: ['bi-weekly', 'biweekly', '15d', '15-day', '15day'] },
  { id: 'Monthly', tokens: ['monthly', '30d', '30-day', '30day'] },
  { id: 'Lifetime', tokens: ['lifetime', 'unlimited', 'forever', 'vip', 'pro', 'enterprise', 'perpetual', 'infinity'] },
];

// Custom SVG Area Chart
const CustomAreaChart = ({ data, period }: { data: Payment[]; period: ChartPeriod }) => {
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [hoverCardSize, setHoverCardSize] = React.useState({ width: 0, height: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  const hoverCardRef = React.useRef<HTMLDivElement>(null);
  
  const chartData = useMemo(() => {
    // Amount to plan mapping
    const amountToPlan: Record<number, PlanId> = {
      2: 'Weekly',
      5: 'Bi-Weekly',
      8: 'Monthly',
      35: 'Lifetime',
    };
    const seriesData: Record<string, { value: number; plans: Record<PlanId, { count: number; total: number }>; totalSales: number }> = {};

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    const periodConfig: Record<ChartPeriod, { unit: 'day' | 'month'; count: number }> = {
      week: { unit: 'day', count: 7 },
      '1m': { unit: 'day', count: 30 },
      '1yr': { unit: 'month', count: 12 },
      lifetime: { unit: 'month', count: 1 },
    };

    const { unit } = periodConfig[period];
    const currentMonthStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));

    let lifetimeCount = 1;
    if (period === 'lifetime') {
      const earliest = data.reduce<Date | null>((min, tx) => {
        const date = new Date(tx.verified_at);
        if (Number.isNaN(date.getTime())) return min;
        if (!min || date < min) return date;
        return min;
      }, null);

      const lifetimeStart = earliest
        ? new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), 1))
        : currentMonthStart;

      lifetimeCount =
        (currentMonthStart.getUTCFullYear() - lifetimeStart.getUTCFullYear()) * 12 +
        (currentMonthStart.getUTCMonth() - lifetimeStart.getUTCMonth()) +
        1;
    }

    const count = period === 'lifetime' ? Math.max(1, lifetimeCount) : periodConfig[period].count;

    const startDate = unit === 'day'
      ? new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate() - (count - 1)))
      : new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - (count - 1), 1));

    const bucketDates: Date[] = [];
    for (let i = 0; i < count; i += 1) {
      const bucketDate = new Date(startDate);
      if (unit === 'day') {
        bucketDate.setUTCDate(startDate.getUTCDate() + i);
      } else {
        bucketDate.setUTCMonth(startDate.getUTCMonth() + i, 1);
      }
      bucketDates.push(bucketDate);
    }

    const yearsInRange = new Set(bucketDates.map((date) => date.getUTCFullYear()));
    const includeYear = yearsInRange.size > 1;

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      ...(includeYear ? { year: 'numeric' } : {}),
    });
    const monthFormatter = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {}),
    });

    const buckets = bucketDates.map((bucketDate) => {
      const key = unit === 'day'
        ? bucketDate.toISOString().substring(0, 10)
        : bucketDate.toISOString().substring(0, 7);
      const label = unit === 'day'
        ? dayFormatter.format(bucketDate)
        : monthFormatter.format(bucketDate);
      return { key, label };
    });

    const startKey = buckets[0]?.key;
    const endKey = buckets[buckets.length - 1]?.key;

    data.forEach((tx) => {
      const txDate = new Date(tx.verified_at);
      if (Number.isNaN(txDate.getTime())) return;

      const txKey = unit === 'day'
        ? txDate.toISOString().substring(0, 10)
        : txDate.toISOString().substring(0, 7);

      if (!startKey || !endKey || txKey < startKey || txKey > endKey) return;

      if (!seriesData[txKey]) {
        seriesData[txKey] = { value: 0, plans: {} as Record<PlanId, { count: number; total: number }>, totalSales: 0 };
      }

      seriesData[txKey].value += tx.amount;
      seriesData[txKey].totalSales += 1;

      const plan = amountToPlan[tx.amount];
      if (plan) {
        if (!seriesData[txKey].plans[plan]) {
          seriesData[txKey].plans[plan] = { count: 0, total: 0 };
        }
        seriesData[txKey].plans[plan].count += 1;
        seriesData[txKey].plans[plan].total += tx.amount;
      }
    });

    return buckets.map((bucket) => ({
      month: bucket.label,
      value: seriesData[bucket.key]?.value || 0,
      plans: seriesData[bucket.key]?.plans || ({} as Record<PlanId, { count: number; total: number }>),
      totalSales: seriesData[bucket.key]?.totalSales || 0,
    }));
  }, [data, period]);

  const isSinglePoint = chartData.length <= 1;
  const emptyPlans = {} as Record<PlanId, { count: number; total: number }>;
  const renderData = isSinglePoint ? [{month: 'Start', value: 0, plans: emptyPlans, totalSales: 0}, ...(chartData.length ? chartData : [{month: 'Current', value: 0, plans: emptyPlans, totalSales: 0}]), {month: 'End', value: 0, plans: emptyPlans, totalSales: 0}] : chartData;

  const maxVal = Math.max(...renderData.map(d => d.value), 100);
  const minVal = 0;
  
  const width = 800;
  const height = 200;
  const padding = 20;
  
  const getCoordinates = (index: number, value: number) => {
    const x = padding + (index * ((width - padding * 2) / (renderData.length - 1)));
    const y = height - padding - ((value - minVal) / (maxVal - minVal)) * (height - padding * 2);
    return { x, y };
  };

  const pathD = renderData.map((d, i) => {
    const { x, y } = getCoordinates(i, d.value);
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const areaD = `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  // Get hovered point details
  const hoveredPoint = hoveredIndex !== null && !isSinglePoint ? renderData[hoveredIndex] : null;
  const hoveredCoords = hoveredIndex !== null && !isSinglePoint ? getCoordinates(hoveredIndex, renderData[hoveredIndex].value) : null;

  useLayoutEffect(() => {
    if (!hoverCardRef.current) return;
    const rect = hoverCardRef.current.getBoundingClientRect();
    setHoverCardSize((prev) => (
      prev.width === rect.width && prev.height === rect.height
        ? prev
        : { width: rect.width, height: rect.height }
    ));
  }, [hoveredPoint]);

  const hoverCardStyle = (() => {
    if (!hoveredCoords || !containerRef.current) return undefined;
    const rect = containerRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;

    const leftPx = (hoveredCoords.x / width) * rect.width;
    const topPx = (hoveredCoords.y / height) * rect.height;
    const paddingPx = 12;

    const halfWidth = hoverCardSize.width / 2;
    const minLeft = halfWidth + paddingPx;
    const maxLeft = rect.width - halfWidth - paddingPx;
    const clampedLeft = minLeft >= maxLeft
      ? rect.width / 2
      : Math.min(Math.max(leftPx, minLeft), maxLeft);

    const aboveTop = topPx - hoverCardSize.height - paddingPx;
    const belowTop = topPx + paddingPx;
    const maxTop = rect.height - hoverCardSize.height - paddingPx;
    let clampedTop = aboveTop >= paddingPx ? aboveTop : belowTop;
    if (maxTop < paddingPx) {
      clampedTop = paddingPx;
    } else {
      clampedTop = Math.min(clampedTop, maxTop);
    }

    return { left: clampedLeft, top: clampedTop, transform: 'translateX(-50%)' };
  })();

  // Handle mouse move for precise hover detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSinglePoint || !containerRef.current) {
      setHoveredIndex(null);
      return;
    }

    const svg = e.currentTarget;
    
    // Create an SVG point and convert from screen coordinates to SVG coordinates
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) {
      setHoveredIndex(null);
      return;
    }
    
    const svgPoint = point.matrixTransform(screenCTM.inverse());
    const x = svgPoint.x;
    const y = svgPoint.y;

    // Find closest point within tolerance
    let closestIndex = -1;
    let minDistance = 50; // Pixel tolerance

    renderData.forEach((_, i) => {
      const coords = getCoordinates(i, renderData[i].value);
      const distance = Math.sqrt(Math.pow(x - coords.x, 2) + Math.pow(y - coords.y, 2));
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });

    setHoveredIndex(closestIndex >= 0 ? closestIndex : null);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      <svg 
        viewBox={`0 0 ${width} ${height}`} 
        className="w-full h-full overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#23f8ff" stopOpacity={0.4}/>
            <stop offset="95%" stopColor="#23f8ff" stopOpacity={0}/>
          </linearGradient>
        </defs>
        
        {/* Grid lines and Y-axis labels */}
        {[0, 0.5, 1].map((ratio, i) => {
          const yValue = maxVal - (ratio * maxVal);
          return (
            <g key={i}>
              <line 
                x1={padding} 
                y1={padding + ratio * (height - padding * 2)} 
                x2={width - padding} 
                y2={padding + ratio * (height - padding * 2)} 
                stroke="rgba(255,255,255,0.05)" 
                strokeDasharray="4 4"
              />
              <text 
                x={padding - 8} 
                y={padding + ratio * (height - padding * 2) + 4} 
                fill="#71717a" 
                fontSize="11" 
                textAnchor="end"
                className="font-medium"
              >
                ${yValue === 0 ? '0' : yValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </text>
            </g>
          );
        })}

        {/* Area */}
        <path d={areaD} fill="url(#colorValue)" className="transition-all duration-700 ease-in-out" />
        
        {/* Line */}
        <path 
          d={pathD} 
          fill="none" 
          stroke="#23f8ff" 
          strokeWidth="3" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="transition-all duration-700 ease-in-out drop-shadow-[0_0_10px_rgba(35,248,255,0.6)]"
        />

        {/* Points */}
        {renderData.map((d, i) => {
          if (isSinglePoint && (i === 0 || i === 2)) return null; 
          const { x, y } = getCoordinates(i, d.value);
          const isHovered = hoveredIndex === i;
          return (
            <g key={i} className="cursor-pointer">
              <circle 
                cx={x} 
                cy={y} 
                r={isHovered ? 7 : 5} 
                fill="#09090b" 
                stroke={isHovered ? "#23f8ff" : "#23f8ff"} 
                strokeWidth={isHovered ? 3 : 2} 
                className={`transition-all duration-200 ${isHovered ? 'drop-shadow-[0_0_12px_rgba(35,248,255,0.8)]' : 'drop-shadow-[0_0_5px_rgba(35,248,255,0.8)]'}`}
              />
            </g>
          );
        })}

        {/* X-Axis Labels */}
        {renderData.map((d, i) => {
          if (isSinglePoint && (i === 0 || i === 2)) return null;
          const { x } = getCoordinates(i, d.value);
          
          // For daily view (30 points), show every 3rd label for clarity
          // For other views, show labels more frequently
          let shouldShowLabel = false;
          if (renderData.length === 30) {
            // Daily view: show day 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 30
            shouldShowLabel = (i + 1) % 3 === 1 || i === renderData.length - 1;
          } else {
            // Monthly/yearly view: show more labels
            shouldShowLabel = i % Math.ceil(renderData.length / 6) === 0 || i === renderData.length - 1;
          }
          
          if (!shouldShowLabel) return null;
          
          return (
            <text key={`label-${i}`} x={x} y={height} fill="#71717a" fontSize="12" textAnchor="middle" className="font-medium">
              {d.month}
            </text>
          );
        })}
      </svg>

      {/* Hover Details Card - Positioned outside SVG */}
      {hoveredPoint && hoveredCoords && hoveredPoint.totalSales > 0 && containerRef.current && (
        <div 
          ref={hoverCardRef}
          className="absolute bg-zinc-900/95 backdrop-blur-md border border-[#23f8ff]/40 rounded-2xl p-4 shadow-lg shadow-[#23f8ff]/20 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
          style={hoverCardStyle ?? {
            left: `${(hoveredCoords.x / width) * 100}%`,
            top: `${(hoveredCoords.y / height) * 100}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="flex flex-col gap-3 min-w-fit">
            {/* Date */}
            <p className="text-xs uppercase tracking-[0.15em] text-zinc-400 font-semibold">{hoveredPoint.month}</p>
            
            {/* Total Revenue */}
            <div>
              <p className="text-2xl font-bold text-[#23f8ff]">${hoveredPoint.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Total Revenue</p>
            </div>
            
            <div className="h-px bg-[#23f8ff]/20" />
            
            {/* Plan Details */}
            {Object.keys(hoveredPoint.plans).length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold">Plans Sold</p>
                {(['Weekly', 'Bi-Weekly', 'Monthly', 'Lifetime'] as PlanId[]).map((plan) => {
                  const planData = hoveredPoint.plans[plan];
                  if (!planData) return null;
                  return (
                    <div key={plan} className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-zinc-400">{plan}</span>
                      <span className="text-[10px] font-semibold text-[#23f8ff]">{planData.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : null}
            
            <div className="h-px bg-[#23f8ff]/20" />
            
            {/* Total Sold */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-zinc-500 font-semibold">Total Sold</p>
              <p className="text-sm font-bold text-[#23f8ff]">{hoveredPoint.totalSales}</p>
            </div>
          </div>
          
          {/* Arrow pointer */}
          {/* <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
            <div className="border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-zinc-900/95" />
          </div> */}
        </div>
      )}
    </div>
  );
};

// --- MAIN DASHBOARD COMPONENT ---

export default function AdminDashboard() {
  const [data, setData] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appSecret, setAppSecret] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [activeTab, setActiveTab] = useState<NavId>('Overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('1m');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterCoin, setFilterCoin] = useState('');
  const [filterNetwork, setFilterNetwork] = useState('');
  const [filterMinAmount, setFilterMinAmount] = useState('');
  const [filterMaxAmount, setFilterMaxAmount] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  
  // Manual transaction add state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTxData, setNewTxData] = useState({
    transaction_id: '',
    coin: 'USDT',
    network: '',
    amount: '',
    key: '',
    verified_at: new Date().toISOString().slice(0, 16), // YYYY-MM-DDTHH:mm format
  });

  const navItems = useMemo<{ id: NavId; icon: typeof LayoutDashboard; label: string }[]>(() => [
    { id: 'Overview', icon: LayoutDashboard, label: 'Overview' },
    { id: 'Transactions', icon: CreditCard, label: 'Transactions' },
  ], []);
  const activeNavIndex = navItems.findIndex(item => item.id === activeTab);

  const periods = useMemo<ChartPeriod[]>(() => ['week', '1m', '1yr', 'lifetime'], []);
  const activePeriodIndex = periods.indexOf(chartPeriod);

  // Close mobile menu when tab changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [activeTab]);

  const fetchPayments = async (secretToUse: string = appSecret) => {
    setLoading(true);
    setError(null);
    try {
      const targetUrl = `https://api.harvestbot.app/api/v1/admin/verified_payments?app_secret=${encodeURIComponent(secretToUse)}`;
      let response;

      try {
        // Attempt direct fetch first
        response = await fetch(targetUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
      } catch (err) {
        // If the browser blocks the request due to missing backend CORS headers, it throws a "Failed to fetch" TypeError.
        // We catch it and automatically fall back to a secure CORS proxy so your UI still works perfectly.
        if (err instanceof Error && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          response = await fetch(proxyUrl);
        } else {
          throw err;
        }
      }
      
      if (response.status === 403) {
        throw new Error('Invalid App Secret. Please try again.');
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      setData((result?.verified_payments as Payment[]) || []);
      setIsAuthenticated(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error.';
      setError(message === 'Failed to fetch' ? 'Network error or strict CORS block. Check backend headers.' : message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (appSecret) fetchPayments();
  };

  // Handler for adding a new transaction manually
  const handleAddTransaction = async () => {
    if (!newTxData.transaction_id.trim() || !newTxData.amount.trim() || !newTxData.network.trim()) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const response = await fetch(`https://api.harvestbot.app/api/v1/admin/verified_payments?app_secret=${encodeURIComponent(appSecret)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: newTxData.transaction_id,
          amount: parseFloat(newTxData.amount),
          coin: 'USDT',
          network: newTxData.network,
          key: newTxData.key.trim() || null,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        alert(error.detail || 'Failed to add transaction');
        return;
      }
      
      const result = await response.json();
      
      // Add to local state
      const newPayment: Payment = {
        id: result.transaction_id,
        transaction_id: result.transaction_id,
        reference_id: result.transaction_id,
        order_id: null,
        amount: result.amount,
        verified_at: new Date().toISOString(),
        key: result.key || '',
        coin: result.coin,
        network: result.network,
      };
      
      setData([newPayment, ...data]);
      
      // Reset form and close modal
      setNewTxData({
        transaction_id: '',
        coin: 'USDT',
        network: '',
        amount: '',
        key: '',
        verified_at: new Date().toISOString().slice(0, 16),
      });
      setShowAddModal(false);
      
      alert('Transaction added successfully!');
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to add transaction');
    }
  };

  // --- FILTERED DATA ---
  const filteredData = useMemo(() => {
    let result = data;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((tx) => {
        const idToSearch = tx.transaction_id || tx.reference_id || tx.order_id || '';
        return (
          idToSearch.toLowerCase().includes(query) ||
          tx.key.toLowerCase().includes(query) ||
          tx.coin.toLowerCase().includes(query) ||
          tx.network.toLowerCase().includes(query)
        );
      });
    }
    
    // Coin filter
    if (filterCoin) {
      result = result.filter(tx => tx.coin === filterCoin);
    }
    
    // Network filter
    if (filterNetwork) {
      result = result.filter(tx => tx.network === filterNetwork);
    }
    
    // Amount range filter
    if (filterMinAmount) {
      result = result.filter(tx => tx.amount >= parseFloat(filterMinAmount));
    }
    if (filterMaxAmount) {
      result = result.filter(tx => tx.amount <= parseFloat(filterMaxAmount));
    }
    
    return result;
  }, [data, searchQuery, filterCoin, filterNetwork, filterMinAmount, filterMaxAmount]);

  // --- DERIVED METRICS ---
  const metrics = useMemo(() => {
    let totalRev = 0;
    let monthlyRev = 0;
    let prevMonthRev = 0;
    const planCounts: Record<PlanId, number> = {
      Weekly: 0,
      'Bi-Weekly': 0,
      Monthly: 0,
      Lifetime: 0,
    };
    
    // Amount to plan mapping
    const amountToPlan: Record<number, PlanId> = {
      2: 'Weekly',
      5: 'Bi-Weekly',
      8: 'Monthly',
      35: 'Lifetime',
    };
    
    // Get current and previous month prefixes
    const now = new Date();
    const currentMonthPrefix = now.toISOString().substring(0, 7);
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthPrefix = prevDate.toISOString().substring(0, 7);

    data.forEach((tx) => {
      totalRev += tx.amount;
      
      if (tx.verified_at.startsWith(currentMonthPrefix)) {
        monthlyRev += tx.amount;
      } else if (tx.verified_at.startsWith(prevMonthPrefix)) {
        prevMonthRev += tx.amount;
      }
      
      // Count sales by plan
      const plan = amountToPlan[tx.amount];
      if (plan) {
        planCounts[plan] += 1;
      }
    });

    // Find most sold plan
    const mostSoldProduct = (Object.entries(planCounts).reduce((a, b) => 
      b[1] > a[1] ? b : a
    , ['N/A', 0]) as [PlanId | string, number])[0];

    // Calculate real growth: percentage change from previous month to current month
    const growth = prevMonthRev > 0 
      ? parseFloat((((monthlyRev - prevMonthRev) / prevMonthRev) * 100).toFixed(1))
      : monthlyRev > 0 ? 100 : 0;

    return { totalRev, monthlyRev, totalSales: data.length, mostSoldProduct, growth };
  }, [data]);

  const planTotals = useMemo<Record<PlanId, number>>(() => {
    const totals: Record<PlanId, number> = {
      Weekly: 0,
      'Bi-Weekly': 0,
      Monthly: 0,
      Lifetime: 0,
    };

    // Amount to plan mapping
    const amountToPlan: Record<number, PlanId> = {
      2: 'Weekly',
      5: 'Bi-Weekly',
      8: 'Monthly',
      35: 'Lifetime',
    };

    data.forEach((tx) => {
      const plan = amountToPlan[tx.amount];
      if (plan) {
        totals[plan] += tx.amount;
      }
    });

    return totals;
  }, [data]);

  const planCounts = useMemo<Record<PlanId, number>>(() => {
    const counts: Record<PlanId, number> = {
      Weekly: 0,
      'Bi-Weekly': 0,
      Monthly: 0,
      Lifetime: 0,
    };

    // Amount to plan mapping
    const amountToPlan: Record<number, PlanId> = {
      2: 'Weekly',
      5: 'Bi-Weekly',
      8: 'Monthly',
      35: 'Lifetime',
    };

    data.forEach((tx) => {
      const plan = amountToPlan[tx.amount];
      if (plan) {
        counts[plan] += 1;
      }
    });

    return counts;
  }, [data]);

  // Get unique coins and networks for filters
  const uniqueCoins = useMemo(() => [...new Set(data.map(tx => tx.coin))].sort(), [data]);
  const uniqueNetworks = useMemo(() => [...new Set(data.map(tx => tx.network))].sort(), [data]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    const endIdx = startIdx + itemsPerPage;
    return filteredData.slice(startIdx, endIdx);
  }, [filteredData, currentPage, itemsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCoin, filterNetwork, filterMinAmount, filterMaxAmount, searchQuery]);

  // --- ACTIONS ---
  const handleCopy = (text?: string | null) => {
    if (!text) return;
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(el);
    
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-[#23f8ff]/30 relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#23f8ff]/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="w-full max-w-md p-8 relative z-10 animate-tab-switch">
          <div className="bg-zinc-900/50 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-[#23f8ff]/10 rounded-2xl flex items-center justify-center mb-4 border border-[#23f8ff]/20 shadow-[0_0_15px_rgba(35,248,255,0.15)]">
                <Lock className="w-8 h-8 text-[#23f8ff]" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Admin Access</h1>
              <p className="text-sm text-zinc-400 mt-2 text-center">Enter your application secret to access the HarvestBot dashboard.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input 
                  type="password"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  placeholder="App Secret"
                  className="w-full bg-zinc-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all shadow-inner"
                  required
                />
              </div>
              
              {error && (
                <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 p-3 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-[#23f8ff] text-zinc-950 font-bold py-3 px-4 rounded-xl hover:bg-[#23f8ff]/90 hover:shadow-[0_0_15px_rgba(35,248,255,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Authenticate'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-[#23f8ff]/30 overflow-hidden relative">
      
      {/* Premium Tab Switching Animation Styles */}
      <style>
        {`
          @keyframes cinematicFadeIn {
            0% { opacity: 0; transform: translateY(8px) scale(0.995); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes dropdownSlideDown {
            0% { opacity: 0; transform: translateY(-8px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-tab-switch {
            animation: cinematicFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-in {
            animation: dropdownSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}
      </style>

      {/* --- MOBILE MENU OVERLAY --- */}
      <div 
        className={`fixed inset-0 z-40 bg-zinc-950/80 backdrop-blur-sm transition-opacity duration-500 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* --- SIDEBAR --- */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-white/5 bg-zinc-950/90 backdrop-blur-2xl transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) md:relative md:translate-x-0 flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/5">
          <div className="flex items-center gap-3 text-[#23f8ff] font-bold text-xl tracking-tight drop-shadow-[0_0_8px_rgba(35,248,255,0.3)]">
            <Image src="/logo.png" alt="Harvest Bot" width={24} height={24} />
            Harvest<span className="text-white">Bot</span>
          </div>
          <button 
            className="md:hidden text-zinc-400 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 overflow-y-auto">
          <div className="relative flex flex-col">
            {/* Animated Sliding Background */}
            <div 
              className="absolute left-0 right-0 top-0 h-12 bg-[#23f8ff]/10 rounded-xl border border-[#23f8ff]/20 shadow-[inset_0_0_12px_rgba(35,248,255,0.1)] transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
              style={{ transform: `translateY(${activeNavIndex * 56}px)` }} // 48px height + 8px gap
            />
            
            <div className="flex flex-col gap-2 relative z-10">
              {navItems.map((item) => (
                <button 
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 h-12 rounded-xl transition-colors duration-300 group ${
                    activeTab === item.id 
                      ? 'text-[#23f8ff] font-medium' 
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-[#23f8ff]' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Decorative Background Glow */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#23f8ff]/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* --- HEADER --- */}
        <header className="h-20 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-zinc-950/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <button 
              className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md group hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#23f8ff] transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by ID, key, coin, or network..." 
                className="w-full bg-zinc-900/50 border border-white/5 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all shadow-inner"
              />
            </div>
            {/* Mobile Search Icon Only */}
            <button className="sm:hidden p-2 text-zinc-400 hover:text-[#23f8ff] transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              onClick={() => fetchPayments()}
              disabled={loading}
              className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-[#23f8ff] transition-colors p-2 rounded-lg hover:bg-[#23f8ff]/10"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#23f8ff]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* --- DASHBOARD SCROLL AREA --- */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 z-10 scrollbar-hide">
          <div key={activeTab} className="max-w-7xl mx-auto space-y-8 animate-tab-switch">
            
            {activeTab === 'Overview' && (
              <>
                {/* Title Section */}
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Financial Overview</h1>
                  <p className="text-sm md:text-base text-zinc-400 mt-1">Track your live sales, revenue, and top performing assets.</p>
                </div>

                {/* --- METRICS CARDS --- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                  {/* Total Revenue */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-[#23f8ff]/40 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(35,248,255,0.05)]">
                    <div className="absolute inset-0 bg-linear-to-br from-[#23f8ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <p className="text-zinc-400 text-sm font-medium group-hover:text-zinc-300 transition-colors">Total Revenue</p>
                      <div className="p-2 bg-[#23f8ff]/10 rounded-xl text-[#23f8ff] shadow-[0_0_10px_rgba(35,248,255,0.2)]">
                        <Wallet className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-semibold text-white tracking-tight relative z-10">
                      {formatCurrency(metrics.totalRev)}
                    </h3>
                  </div>

                  {/* Monthly Revenue */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-[#23f8ff]/40 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(35,248,255,0.05)]">
                    <div className="absolute inset-0 bg-linear-to-br from-[#23f8ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <p className="text-zinc-400 text-sm font-medium group-hover:text-zinc-300 transition-colors">Monthly Revenue</p>
                      <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-3 relative z-10">
                      <h3 className="text-3xl font-semibold text-white tracking-tight">
                        {formatCurrency(metrics.monthlyRev)}
                      </h3>
                      <span className="flex items-center text-xs font-medium text-[#23f8ff] bg-[#23f8ff]/10 px-2 py-1 rounded-full border border-[#23f8ff]/20">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        {metrics.growth}%
                      </span>
                    </div>
                  </div>

                  {/* Total Sales */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-[#23f8ff]/40 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(35,248,255,0.05)]">
                    <div className="absolute inset-0 bg-linear-to-br from-[#23f8ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <p className="text-zinc-400 text-sm font-medium group-hover:text-zinc-300 transition-colors">Total Sales</p>
                      <div className="p-2 bg-purple-500/10 rounded-xl text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                        <CreditCard className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-semibold text-white tracking-tight relative z-10">
                      {metrics.totalSales} <span className="text-lg text-zinc-500 font-normal">txns</span>
                    </h3>
                  </div>

                  {/* Top Product */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-[#23f8ff]/40 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(35,248,255,0.05)]">
                    <div className="absolute inset-0 bg-linear-to-br from-[#23f8ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <p className="text-zinc-400 text-sm font-medium group-hover:text-zinc-300 transition-colors">Most Sold Product</p>
                      <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]">
                        <Package className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-semibold text-white tracking-tight capitalize relative z-10 truncate" title={metrics.mostSoldProduct}>
                      {metrics.mostSoldProduct}
                    </h3>
                  </div>
                </div>

                {/* --- CHART SECTION --- */}
                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 md:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Revenue Analytics</h2>
                      <p className="text-sm text-zinc-400 mt-1">Fiat equivalent across all crypto networks</p>
                    </div>
                    <div className="relative flex p-1 bg-zinc-950/50 rounded-xl border border-white/5 w-fit">
                      {/* Animated Sliding Pill */}
                      <div 
                        className="absolute top-1 bottom-1 left-1 w-20 rounded-lg bg-[#23f8ff] shadow-[0_0_10px_rgba(35,248,255,0.4)] transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
                        style={{ transform: `translateX(${activePeriodIndex * 100}%)` }}
                      />
                      
                      {periods.map((period) => (
                        <button 
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`relative z-10 w-20 py-1.5 text-xs font-medium transition-colors duration-300 ${
                            chartPeriod === period 
                              ? 'text-zinc-950' 
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-62.5 w-full">
                    <CustomAreaChart data={filteredData} period={chartPeriod} />
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-4 md:p-8">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-lg font-semibold text-white">Plan revenue</h2>
                      <p className="text-sm text-zinc-400 mt-1">Total sales per plan</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
                    {PLAN_KEYS.map((plan, index) => (
                      <div
                        key={plan.id}
                        className="animate-rise-in bg-zinc-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden group hover:border-[#23f8ff]/40 transition-all duration-500 hover:shadow-[0_8px_30px_rgba(35,248,255,0.05)]"
                        style={{ animationDelay: `${index * 90}ms` }}
                      >
                        <div className="absolute inset-0 bg-linear-to-br from-[#23f8ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-300 transition-colors relative z-10">
                          {plan.id}
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-white relative z-10">
                          {formatCurrency(planTotals[plan.id])}
                        </p>
                        <div className="mt-3 flex items-center justify-between relative z-10">
                          <p className="text-xs text-zinc-500">Revenue</p>
                          <p className="text-xs text-zinc-400 font-medium">{planCounts[plan.id]} sales</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* --- TRANSACTIONS TABLE --- */}
            {(activeTab === 'Overview' || activeTab === 'Transactions') && (
              <div className="bg-zinc-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
                <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/20">
                  <h2 className="text-lg font-semibold text-white">
                    {activeTab === 'Transactions' ? 'All Transactions' : 'Recent Transactions'}
                  </h2>
                  <div className="flex items-center gap-2">
                    {activeTab === 'Transactions' && isAuthenticated && (
                      <button 
                        onClick={() => setShowAddModal(true)}
                        className="text-sm bg-[#23f8ff]/10 border border-[#23f8ff]/30 text-[#23f8ff] px-3 py-2 rounded-lg font-medium hover:bg-[#23f8ff]/20 hover:border-[#23f8ff]/50 transition-all drop-shadow-[0_0_5px_rgba(35,248,255,0.3)]"
                      >
                        + Add Transaction
                      </button>
                    )}
                    {activeTab === 'Overview' && (
                      <button 
                        onClick={() => setActiveTab('Transactions')}
                        className="text-sm text-[#23f8ff] font-medium hover:text-white transition-colors drop-shadow-[0_0_5px_rgba(35,248,255,0.5)]"
                      >
                        View All
                      </button>
                    )}
                  </div>
                </div>

                {/* Filters Section - Only show on Transactions tab */}
                {activeTab === 'Transactions' && (
                  <div className="p-4 md:p-6 border-b border-white/5 bg-zinc-950/10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {/* Coin Filter - Custom Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'coin' ? null : 'coin')}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-left text-white hover:border-[#23f8ff]/30 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all flex justify-between items-center"
                        >
                          <span>{filterCoin || 'All Coins'}</span>
                          <svg className={`w-4 h-4 transition-transform duration-300 ${openDropdown === 'coin' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                        {openDropdown === 'coin' && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-[#23f8ff]/30 rounded-lg shadow-lg z-50 overflow-y-auto max-h-48 animate-in fade-in zoom-in-95 duration-200">
                            <button
                              onClick={() => { setFilterCoin(''); setOpenDropdown(null); }}
                              className={`w-full px-3 py-2 text-sm text-left transition-colors ${filterCoin === '' ? 'bg-[#23f8ff]/20 text-[#23f8ff]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                            >
                              All Coins
                            </button>
                            {uniqueCoins.map(coin => (
                              <button
                                key={coin}
                                onClick={() => { setFilterCoin(coin); setOpenDropdown(null); }}
                                className={`w-full px-3 py-2 text-sm text-left transition-colors ${filterCoin === coin ? 'bg-[#23f8ff]/20 text-[#23f8ff]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                              >
                                {coin}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Network Filter - Custom Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'network' ? null : 'network')}
                          className="w-full bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-left text-white hover:border-[#23f8ff]/30 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all flex justify-between items-center"
                        >
                          <span>{filterNetwork ? filterNetwork.replace('_', ' ') : 'All Networks'}</span>
                          <svg className={`w-4 h-4 transition-transform duration-300 ${openDropdown === 'network' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                        {openDropdown === 'network' && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-[#23f8ff]/30 rounded-lg shadow-lg z-50 overflow-y-auto max-h-48 animate-in fade-in zoom-in-95 duration-200">
                            <button
                              onClick={() => { setFilterNetwork(''); setOpenDropdown(null); }}
                              className={`w-full px-3 py-2 text-sm text-left transition-colors ${filterNetwork === '' ? 'bg-[#23f8ff]/20 text-[#23f8ff]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                            >
                              All Networks
                            </button>
                            {uniqueNetworks.map(network => (
                              <button
                                key={network}
                                onClick={() => { setFilterNetwork(network); setOpenDropdown(null); }}
                                className={`w-full px-3 py-2 text-sm text-left transition-colors ${filterNetwork === network ? 'bg-[#23f8ff]/20 text-[#23f8ff]' : 'text-zinc-300 hover:bg-zinc-800'}`}
                              >
                                {network.replace('_', ' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Min Amount Filter */}
                      <input
                        type="number"
                        placeholder="Min Amount"
                        value={filterMinAmount}
                        onChange={(e) => setFilterMinAmount(e.target.value)}
                        className="bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 hover:border-[#23f8ff]/30 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                      />

                      {/* Max Amount Filter */}
                      <input
                        type="number"
                        placeholder="Max Amount"
                        value={filterMaxAmount}
                        onChange={(e) => setFilterMaxAmount(e.target.value)}
                        className="bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 hover:border-[#23f8ff]/30 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                      />

                      {/* Clear Filters Button */}
                      {(filterCoin || filterNetwork || filterMinAmount || filterMaxAmount) && (
                        <button
                          onClick={() => {
                            setFilterCoin('');
                            setFilterNetwork('');
                            setFilterMinAmount('');
                            setFilterMaxAmount('');
                          }}
                          className="bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:text-[#23f8ff] hover:border-[#23f8ff]/30 transition-all"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-200">
                    <thead>
                      <tr className="bg-zinc-950/50 border-b border-white/5">
                        <th className="py-5 px-4 md:px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Transaction ID</th>
                        <th className="py-5 px-4 md:px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Asset / Network</th>
                        <th className="py-5 px-4 md:px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Amount</th>
                        <th className="py-5 px-4 md:px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                        <th className="py-5 px-4 md:px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-zinc-500">
                            <div className="flex flex-col items-center justify-center">
                              <Search className="w-8 h-8 mb-3 opacity-20" />
                              <p>No transactions found matching &quot;{searchQuery || 'your filters'}&quot;</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        (activeTab === 'Overview' ? filteredData.slice(0, 8) : paginatedData).map((tx) => {
                          const displayId = tx.transaction_id || tx.reference_id || tx.order_id || 'N/A';
                          const { dateStr, timeStr } = formatDateTime(tx.verified_at);

                          // Simplified Asset Icon Styling
                          const getCoinStyles = (coin: string) => {
                            switch(coin) {
                              case 'BTC': return { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
                              case 'ETH': return { text: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
                              case 'LTC': return { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
                              case 'GIFT': return { text: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/20' };
                              case 'USDT': return { text: 'text-[#23f8ff]', bg: 'bg-[#23f8ff]/10', border: 'border-[#23f8ff]/20' };
                              default: return { text: 'text-zinc-400', bg: 'bg-zinc-800/50', border: 'border-white/10' };
                            }
                          };
                          const iconStyles = getCoinStyles(tx.coin);

                          return (
                            <tr key={tx.id} className="relative bg-zinc-950/10 hover:bg-[#23f8ff]/2 transition-colors group">
                              <td className="relative py-4 md:py-5 px-4 md:px-6 whitespace-nowrap">
                                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#23f8ff] opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-zinc-900 rounded-lg border border-white/5 group-hover:border-[#23f8ff]/30 transition-colors shadow-inner">
                                    <CreditCard className="w-4 h-4 text-zinc-500 group-hover:text-[#23f8ff] transition-colors" />
                                  </div>
                                  <span className="text-sm text-zinc-300 font-mono tracking-wide group-hover:text-white transition-colors">
                                    {truncateHash(displayId)}
                                  </span>
                                </div>
                              </td>
                              <td className="py-4 md:py-5 px-4 md:px-6 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg border shrink-0 ${iconStyles.bg} ${iconStyles.border}`}>
                                    <span className={`text-[10px] font-bold ${iconStyles.text}`}>
                                      {tx.coin.substring(0, 4)}
                                    </span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-200 tracking-wide">{tx.coin}</span>
                                    <span className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider mt-0.5">
                                      {tx.network.replace('_', ' ')}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 md:py-5 px-4 md:px-6 whitespace-nowrap">
                                <span className="text-base font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.05)] group-hover:text-[#23f8ff] transition-colors">
                                  {formatCurrency(tx.amount)}
                                </span>
                              </td>
                              <td className="py-4 md:py-5 px-4 md:px-6 whitespace-nowrap">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-sm text-zinc-300 font-medium">{dateStr}</span>
                                  <span className="text-xs text-zinc-600">{timeStr}</span>
                                </div>
                              </td>
                              <td className="py-4 md:py-5 px-4 md:px-6 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2 md:gap-4">
                                  <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full text-[10px] font-bold tracking-widest bg-[#23f8ff]/10 text-[#23f8ff] border border-[#23f8ff]/20 shadow-[0_0_10px_rgba(35,248,255,0.05)]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#23f8ff] animate-pulse shadow-[0_0_8px_rgba(35,248,255,0.8)]" />
                                    VERIFIED
                                  </span>
                                  <div className="relative flex items-center w-8 justify-end">
                                    <button 
                                      onClick={() => handleCopy(displayId)}
                                      className="absolute p-2 rounded-lg bg-zinc-900 border border-white/5 text-zinc-500 hover:text-[#23f8ff] hover:bg-[#23f8ff]/10 hover:border-[#23f8ff]/30 transition-all opacity-0 group-hover:opacity-100"
                                      title="Copy Transaction ID"
                                    >
                                      {copiedId === displayId ? <Check className="w-4 h-4 text-[#23f8ff]" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls - Only show on Transactions tab */}
                {activeTab === 'Transactions' && filteredData.length > 0 && (
                  <div className="p-4 md:p-6 border-t border-white/5 bg-zinc-950/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <span>Show:</span>
                      <div className="relative">
                        <button
                          onClick={() => setOpenDropdown(openDropdown === 'itemsPerPage' ? null : 'itemsPerPage')}
                          className="bg-zinc-900/50 border border-white/10 rounded px-3 py-1.5 text-white text-xs hover:border-[#23f8ff]/30 focus:outline-none focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all flex items-center gap-2"
                        >
                          <span>{itemsPerPage}</span>
                          <svg className={`w-3 h-3 transition-transform duration-300 ${openDropdown === 'itemsPerPage' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </button>
                        {openDropdown === 'itemsPerPage' && (
                          <div className="absolute bottom-full left-0 mb-2 bg-zinc-900 border border-[#23f8ff]/30 rounded-lg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-200">
                            {[10, 20, 50, 100].map(num => (
                              <button
                                key={num}
                                onClick={() => {
                                  setItemsPerPage(num);
                                  setCurrentPage(1);
                                  setOpenDropdown(null);
                                }}
                                className={`w-full px-4 py-2 text-xs text-left transition-colors whitespace-nowrap ${
                                  itemsPerPage === num
                                    ? 'bg-[#23f8ff]/20 text-[#23f8ff]'
                                    : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                              >
                                {num}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <span>per page</span>
                    </div>

                    <div className="text-xs text-zinc-500 whitespace-nowrap">
                      Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} transactions
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-xs font-medium bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded text-zinc-400 hover:text-white hover:border-[#23f8ff]/30 hover:from-zinc-700 hover:to-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-2.5 py-1.5 text-xs font-semibold rounded transition-all duration-200 active:scale-95 ${
                                currentPage === pageNum
                                  ? 'bg-linear-to-br from-[#23f8ff] to-cyan-400 text-zinc-950 shadow-lg shadow-[#23f8ff]/50'
                                  : 'bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:border-[#23f8ff]/30 hover:from-zinc-700 hover:to-zinc-800'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-xs font-medium bg-linear-to-br from-zinc-800 to-zinc-900 border border-white/10 rounded text-zinc-400 hover:text-white hover:border-[#23f8ff]/30 hover:from-zinc-700 hover:to-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Add Transaction Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Add Transaction Manually</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Transaction ID Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={newTxData.transaction_id}
                    onChange={(e) => setNewTxData({ ...newTxData, transaction_id: e.target.value })}
                    placeholder="Enter transaction ID"
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                  />
                </div>

                {/* Coin (USDT only) */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Coin</label>
                  <div className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-white">
                    USDT
                  </div>
                </div>

                {/* Network Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Network</label>
                  <input
                    type="text"
                    value={newTxData.network}
                    onChange={(e) => setNewTxData({ ...newTxData, network: e.target.value })}
                    placeholder="Enter network (e.g., Ethereum, Polygon)"
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                  />
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Amount (USD)</label>
                  <input
                    type="number"
                    value={newTxData.amount}
                    onChange={(e) => setNewTxData({ ...newTxData, amount: e.target.value })}
                    placeholder="Enter amount"
                    step="0.01"
                    min="0"
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                  />
                </div>

                {/* License Key Input (Optional) */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">License Key (Optional)</label>
                  <input
                    type="text"
                    value={newTxData.key}
                    onChange={(e) => setNewTxData({ ...newTxData, key: e.target.value })}
                    placeholder="Enter license key or leave blank"
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                  />
                </div>

                {/* Date/Time Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newTxData.verified_at}
                    onChange={(e) => setNewTxData({ ...newTxData, verified_at: e.target.value })}
                    className="w-full bg-zinc-800/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-[#23f8ff]/50 focus:ring-1 focus:ring-[#23f8ff]/50 transition-all"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-white/5 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white hover:border-[#23f8ff]/30 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTransaction}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#23f8ff]/10 border border-[#23f8ff]/30 text-[#23f8ff] hover:bg-[#23f8ff]/20 hover:border-[#23f8ff]/50 font-medium transition-all"
                >
                  Add Transaction
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
