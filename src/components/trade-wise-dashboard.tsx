"use client";

import React, { useState, useMemo, useTransition, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parseExcelTrades } from "@/lib/excel-parser";
import { parseCsvTrades } from "@/lib/csv-parser";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { TradePagination } from "@/components/trade-pagination";
import { CompoundPlanTracker } from "@/components/compound-plan-tracker";
import { OnboardingDialog, OnboardingValues } from "@/components/onboarding-dialog";
import { TradeImportDialog } from "@/components/trade-import-dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

import {
  BookOpenCheck,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  TrendingUp,
  CirclePercent,
  DollarSign,
  Pencil,
  Check,
  X,
  Target,
  Trophy,
  Activity,
  PlusCircle,
  Trash2,
  Upload,
  Star,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type Trade = {
  id: number;
  stock: string;
  amount: number;
  returnPercentage: number;
  outcome: "win" | "loss";
  profit: number;
  portfolioAfter: number;
  tradeType: 'call' | 'put';
  isHistorical?: boolean;  // Flag for historical trade data
  // Optional fields from PDF/Excel/CSV import
  orderNumber?: string;
  expiryTime?: string;
  openTime?: string;
  closeTime?: string;
  openPrice?: number;
  closePrice?: number;
  currency?: string;
  loggedAt?: string;  // Timestamp when manual trade was recorded
};

type SessionStats = {
  session: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  profit: number;
  calls: { wins: number; losses: number; total: number; };
  puts: { wins: number; losses: number; total: number; };
};

type TradingSession = 'New York' | 'London' | 'Asia' | 'Spread Hours';

const COLORS = {
  primary: '#00FF7F',    // Electric green
  destructive: '#EF4444', // Red
  call: '#3B82F6',       // Blue
  put: '#F59E0B',        // Amber
  overlap: '#FFA500',    // Orange for session overlap
};

const SESSION_CONFIG: Record<TradingSession, { flag: string; ctStart: number; ctEnd: number }> = {
  'New York': { flag: '🇺🇸', ctStart: 7, ctEnd: 17 },   // 7:00 AM – 5:00 PM CT
  'London': { flag: '🇬🇧', ctStart: 3, ctEnd: 12 },       // 3:00 AM – 12:00 PM (noon) CT
  'Asia': { flag: '🇯🇵', ctStart: 19, ctEnd: 28 },       // 7:00 PM – 4:00 AM CT (spans midnight)
  'Spread Hours': { flag: '🌙', ctStart: -1, ctEnd: -1 },
};

const tradeSchema = z.object({
  stock: z.string().min(1, { message: "Please select a stock" }),
  amount: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .positive({ message: "Amount must be positive" }),
  returnPercentage: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .gte(0, { message: "Return must be non-negative" }),
  tradeType: z.enum(['call', 'put'], { required_error: "Please select a trade type" }),
});

const DEFAULT_INITIAL_PORTFOLIO = 300.0;
const DEFAULT_SESSION_GOAL = 15;
const DEFAULT_PROFIT_GOAL = 100;
const DEFAULT_PROFIT_GOAL_TYPE = "percent";
const DEFAULT_TARGET_WIN_RATE = 60;

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
const DEFAULT_ITEMS_PER_PAGE = 10;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100);

const formatTime = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();

  const isDifferentDay =
    date.getDate() !== now.getDate() ||
    date.getMonth() !== now.getMonth() ||
    date.getFullYear() !== now.getFullYear();

  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  if (isDifferentDay) {
    const datePart = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit'
    });
    return `${datePart} ${time}`;
  }

  return time;
};

const defaultStocks = [
  "AED/CNY OTC",
  "AUD/CAD OTC",
  "CAD/CHF OTC",
  "EUR/HUF OTC",
  "GBP/USD OTC",
  "AMERICAN EXPRESS OTC",
  "AUD/NZD OTC",
  "CHF/JPY OTC",
  "USD/CLP OTC",
  "MCDONALD'S OTC",
  "CHF/NOK OTC",
  "YER/USD OTC",
  "USD/MYR OTC",
  "AMAZON OTC",
  "EUR/TRY OTC",
  "LBP/USD OTC",
  "EUR/JPY OTC",
  "USD/JPY OTC",
  "EUR/GBP OTC",
  "BHD/CNY OTC",
  "EUR/USD OTC",
];

export function TradeWiseDashboard() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [initialPortfolio, setInitialPortfolio] = useState(DEFAULT_INITIAL_PORTFOLIO);
  const [isEditingInitialPortfolio, setIsEditingInitialPortfolio] = useState(false);
  const [editingInitialPortfolioValue, setEditingInitialPortfolioValue] = useState(String(DEFAULT_INITIAL_PORTFOLIO));

  const [sessionGoal, setSessionGoal] = useState(DEFAULT_SESSION_GOAL);
  const [isEditingSessionGoal, setIsEditingSessionGoal] = useState(false);
  const [editingSessionGoalValue, setEditingSessionGoalValue] = useState(String(DEFAULT_SESSION_GOAL));

  const [profitGoal, setProfitGoal] = useState(DEFAULT_PROFIT_GOAL);
  const [profitGoalType, setProfitGoalType] = useState<'dollar' | 'percent'>(DEFAULT_PROFIT_GOAL_TYPE);
  const [isEditingProfitGoal, setIsEditingProfitGoal] = useState(false);
  const [editingProfitGoalValue, setEditingProfitGoalValue] = useState(String(DEFAULT_PROFIT_GOAL));
  const [editingProfitGoalType, setEditingProfitGoalType] = useState<'dollar' | 'percent'>(DEFAULT_PROFIT_GOAL_TYPE);

  const [targetWinRate, setTargetWinRate] = useState(DEFAULT_TARGET_WIN_RATE);
  const [isEditingTargetWinRate, setIsEditingTargetWinRate] = useState(false);
  const [editingTargetWinRateValue, setEditingTargetWinRateValue] = useState(String(DEFAULT_TARGET_WIN_RATE));

  const [sessionStocks, setSessionStocks] = useState<string[]>(defaultStocks);
  const [stockFilter, setStockFilter] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [favoritedStocks, setFavoritedStocks] = useState<string[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

  // Session Stocks pagination state
  const [stocksCurrentPage, setStocksCurrentPage] = useState(1);
  const STOCKS_ITEMS_PER_PAGE = 8; // Show 8 stocks per page for smaller, cleaner look

  // Expanded stock rows state
  const [expandedStocks, setExpandedStocks] = useState<Set<string>>(new Set());

  // View state for tabs (journal vs performance)
  const [currentView, setCurrentView] = useState<'journal' | 'performance'>('journal');

  // Session indicator state
  const [currentSession, setCurrentSession] = useState<TradingSession>('Spread Hours');
  const [activeSessions, setActiveSessions] = useState<TradingSession[]>(['Spread Hours']);
  const [manualSessionOverride, setManualSessionOverride] = useState<TradingSession | null>(null);

  // New York time display
  const [currentTimeNY, setCurrentTimeNY] = useState<string>("");

  // Onboarding dialog state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(true);

  // Pending import state for historical/current session dialog
  const [pendingImport, setPendingImport] = useState<{
    trades: Array<{
      direction: 'call' | 'put';
      orderNumber: string;
      expiryTime: string;
      asset: string;
      openTime: string;
      closeTime: string;
      openPrice: number;
      closePrice: number;
      tradeAmount: number;
      profitAmount: number;
      currency: string;
    }>;
    assets: string[];
  } | null>(null);

  // Toggle to show/hide historical trades in journal
  const [showHistoricalInJournal, setShowHistoricalInJournal] = useState<boolean>(false);

  // Helper function to get New York time in military format
  const getNewYorkTime = (): string => {
    const now = new Date();
    const nyTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const hours = nyTime.getHours().toString().padStart(2, '0');
    const minutes = nyTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Update NY time every second
  useEffect(() => {
    setCurrentTimeNY(getNewYorkTime());
    const interval = setInterval(() => {
      setCurrentTimeNY(getNewYorkTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const portfolioValue = useMemo(() => {
    // Only use current session trades (not historical)
    const sessionTrades = trades.filter(t => !t.isHistorical);
    if (sessionTrades.length === 0) return initialPortfolio;
    return sessionTrades[sessionTrades.length - 1].portfolioAfter;
  }, [trades, initialPortfolio]);
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof tradeSchema>>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      stock: "",
      amount: "" as any,
      returnPercentage: "" as any,
      tradeType: "call",
    },
  });

  const { wins, losses, winRate, totalProfit } = useMemo(() => {
    // Only use current session trades (not historical)
    const sessionTrades = trades.filter(t => !t.isHistorical);
    const wins = sessionTrades.filter((t) => t.outcome === "win").length;
    const losses = sessionTrades.length - wins;
    const winRate = sessionTrades.length > 0 ? (wins / sessionTrades.length) * 100 : 0;
    const totalProfit = sessionTrades.reduce((acc, trade) => acc + trade.profit, 0);
    return { wins, losses, winRate, totalProfit };
  }, [trades]);

  // Pagination computed values
  const { paginatedTrades, totalPages, startIndex, endIndex } = useMemo(() => {
    // Filter trades based on showHistoricalInJournal toggle
    const displayTrades = showHistoricalInJournal ? trades : trades.filter(t => !t.isHistorical);
    const reversedTrades = [...displayTrades].reverse();
    const totalTrades = displayTrades.length;
    if (totalTrades === 0) {
      return { paginatedTrades: [], totalPages: 1, startIndex: 0, endIndex: 0 };
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalTrades);
    const paginatedTrades = reversedTrades.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalTrades / itemsPerPage);
    return { paginatedTrades, totalPages, startIndex, endIndex };
  }, [trades, currentPage, itemsPerPage, showHistoricalInJournal]);

  const stockPerformance = useMemo(() => {
    const performance: {
      [key: string]: { wins: number; losses: number; total: number, calls: { wins: number, losses: number }, puts: { wins: number, losses: number } };
    } = {};
    trades.forEach((trade) => {
      if (!performance[trade.stock]) {
        performance[trade.stock] = { wins: 0, losses: 0, total: 0, calls: { wins: 0, losses: 0 }, puts: { wins: 0, losses: 0 } };
      }
      performance[trade.stock].total++;
      if (trade.outcome === "win") {
        performance[trade.stock].wins++;
        if (trade.tradeType === 'call') performance[trade.stock].calls.wins++;
        else performance[trade.stock].puts.wins++;
      } else {
        performance[trade.stock].losses++;
        if (trade.tradeType === 'call') performance[trade.stock].calls.losses++;
        else performance[trade.stock].puts.losses++;
      }
    });
    return Object.entries(performance)
      .map(([stock, data]) => ({ stock, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [trades]);

  // Historical stock performance (separate from current session)
  const historicalStockPerformance = useMemo(() => {
    const performance: {
      [key: string]: { wins: number; losses: number; total: number, calls: { wins: number, losses: number }, puts: { wins: number, losses: number } };
    } = {};
    const historicalTrades = trades.filter(t => t.isHistorical);

    historicalTrades.forEach((trade) => {
      if (!performance[trade.stock]) {
        performance[trade.stock] = { wins: 0, losses: 0, total: 0, calls: { wins: 0, losses: 0 }, puts: { wins: 0, losses: 0 } };
      }
      performance[trade.stock].total++;
      if (trade.outcome === "win") {
        performance[trade.stock].wins++;
        if (trade.tradeType === 'call') performance[trade.stock].calls.wins++;
        else performance[trade.stock].puts.wins++;
      } else {
        performance[trade.stock].losses++;
        if (trade.tradeType === 'call') performance[trade.stock].calls.losses++;
        else performance[trade.stock].puts.losses++;
      }
    });
    return Object.entries(performance)
      .map(([stock, data]) => ({ stock, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [trades]);

  // Session detection helper function (for imported trades with openTime)
  const getTradingSession = (trade: Trade): 'New York' | 'London' | 'Asia' | 'Unknown' => {
    const tradeTime = trade.openTime ? new Date(trade.openTime) : new Date();
    const hours = tradeTime.getUTCHours();
    const minutes = tradeTime.getUTCMinutes();
    const timeInHours = hours + (minutes / 60);

    // Trading sessions (UTC hours, based on CT)
    // New York: CT 7:00 AM – 5:00 PM = 13:00 - 22:00 UTC
    // London: CT 3:00 AM – 12:00 PM = 09:00 - 18:00 UTC
    // Asia: CT 7:00 PM – 4:00 AM = 01:00 - 10:00 UTC (spans midnight)

    if (timeInHours >= 13 && timeInHours < 22) return 'New York';
    if (timeInHours >= 9 && timeInHours < 18) return 'London';
    if (timeInHours >= 1 && timeInHours < 10) return 'Asia';
    return 'Unknown';
  };

  // Convert local time to Central Time (handles DST automatically)
  const convertLocalToCT = (localDate: Date): Date => {
    // Use Intl API to properly convert to Central Time (handles DST automatically)
    const ctTimeString = localDate.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      hour12: false
    });
    return new Date(ctTimeString);
  };

  // Get current trading session based on local time
  const getCurrentLocalSession = (): TradingSession => {
    const now = new Date();
    const ctTime = convertLocalToCT(now);
    const ctHour = ctTime.getHours();

    for (const [sessionName, config] of Object.entries(SESSION_CONFIG)) {
      if (sessionName === 'Spread Hours') continue;

      const { ctStart, ctEnd } = config;

      if (ctEnd > 24) {
        // Session spans midnight (Asia)
        if (ctHour >= ctStart || ctHour < (ctEnd - 24)) {
          return sessionName as TradingSession;
        }
      } else {
        if (ctHour >= ctStart && ctHour < ctEnd) {
          return sessionName as TradingSession;
        }
      }
    }

    return 'Spread Hours';
  };

  // Get all active sessions at current time (for overlap handling)
  const getActiveSessions = (): TradingSession[] => {
    const now = new Date();
    const ctTime = convertLocalToCT(now);
    const ctHour = ctTime.getHours();
    const activeSessions: TradingSession[] = [];

    for (const [sessionName, config] of Object.entries(SESSION_CONFIG)) {
      if (sessionName === 'Spread Hours') continue;

      const { ctStart, ctEnd } = config;

      if (ctEnd > 24) {
        // Session spans midnight (Asia)
        if (ctHour >= ctStart || ctHour < (ctEnd - 24)) {
          activeSessions.push(sessionName as TradingSession);
        }
      } else {
        if (ctHour >= ctStart && ctHour < ctEnd) {
          activeSessions.push(sessionName as TradingSession);
        }
      }
    }

    return activeSessions.length > 0 ? activeSessions : ['Spread Hours'];
  };

  // Overall stats computation
  const overallStats = useMemo(() => {
    return {
      stock: "Overall",
      wins: trades.filter(t => t.outcome === "win").length,
      losses: trades.filter(t => t.outcome === "loss").length,
      total: trades.length,
      calls: {
        wins: trades.filter(t => t.outcome === "win" && t.tradeType === 'call').length,
        losses: trades.filter(t => t.outcome === "loss" && t.tradeType === 'call').length,
      },
      puts: {
        wins: trades.filter(t => t.outcome === "win" && t.tradeType === 'put').length,
        losses: trades.filter(t => t.outcome === "loss" && t.tradeType === 'put').length,
      },
      profit: trades.reduce((acc, t) => acc + t.profit, 0),
    };
  }, [trades]);

  // Session breakdown computation
  const sessionBreakdown = useMemo(() => {
    const stats: Record<string, SessionStats> = {};

    // Only use current session trades (not historical)
    const sessionTrades = trades.filter(t => !t.isHistorical);

    sessionTrades.forEach(trade => {
      const session = getTradingSession(trade);
      if (!stats[session]) {
        stats[session] = {
          session,
          wins: 0,
          losses: 0,
          total: 0,
          winRate: 0,
          profit: 0,
          calls: { wins: 0, losses: 0, total: 0 },
          puts: { wins: 0, losses: 0, total: 0 },
        };
      }

      stats[session].total++;
      stats[session].profit += trade.profit;

      if (trade.outcome === 'win') {
        stats[session].wins++;
        if (trade.tradeType === 'call') stats[session].calls.wins++;
        else stats[session].puts.wins++;
      } else {
        stats[session].losses++;
        if (trade.tradeType === 'call') stats[session].calls.losses++;
        else stats[session].puts.losses++;
      }

      stats[session].calls.total = stats[session].calls.wins + stats[session].calls.losses;
      stats[session].puts.total = stats[session].puts.wins + stats[session].puts.losses;
      stats[session].winRate = stats[session].total > 0 ? (stats[session].wins / stats[session].total) * 100 : 0;
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [trades]);

  const { profitGoalAmount, profitGoalProgress } = useMemo(() => {
      const goalAmount = profitGoalType === 'dollar' ? profitGoal : initialPortfolio * (profitGoal / 100);
      const progress = goalAmount > 0 ? (totalProfit / goalAmount) * 100 : 0;
      return { profitGoalAmount: goalAmount, profitGoalProgress: progress };
  }, [profitGoal, profitGoalType, initialPortfolio, totalProfit]);

  const targetWinRateProgress = useMemo(() => {
      return targetWinRate > 0 ? (winRate / targetWinRate) * 100 : 0;
  }, [winRate, targetWinRate]);

  const handlePageChange = (newPage: number) => {
    const validPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(validPage);
  };

  const toggleStockExpansion = (stock: string) => {
    setExpandedStocks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stock)) {
        newSet.delete(stock);
      } else {
        newSet.add(stock);
      }
      return newSet;
    });
  };

  const getStockSessionBreakdown = (stockName: string): SessionStats[] => {
    const stockTrades = trades.filter(t => t.stock === stockName);
    const stats: Record<string, SessionStats> = {};

    stockTrades.forEach(trade => {
      const session = getTradingSession(trade);
      if (!stats[session]) {
        stats[session] = {
          session,
          wins: 0,
          losses: 0,
          total: 0,
          winRate: 0,
          profit: 0,
          calls: { wins: 0, losses: 0, total: 0 },
          puts: { wins: 0, losses: 0, total: 0 },
        };
      }

      stats[session].total++;
      stats[session].profit += trade.profit;

      if (trade.outcome === 'win') {
        stats[session].wins++;
        if (trade.tradeType === 'call') stats[session].calls.wins++;
        else stats[session].puts.wins++;
      } else {
        stats[session].losses++;
        if (trade.tradeType === 'call') stats[session].calls.losses++;
        else stats[session].puts.losses++;
      }

      stats[session].calls.total = stats[session].calls.wins + stats[session].calls.losses;
      stats[session].puts.total = stats[session].puts.wins + stats[session].puts.losses;
      stats[session].winRate = stats[session].total > 0 ? (stats[session].wins / stats[session].total) * 100 : 0;
    });

    return Object.values(stats).filter(s => s.session !== 'Unknown').sort((a, b) => b.total - a.total);
  };

  const handleAddTrade = (
    values: z.infer<typeof tradeSchema>,
    outcome: "win" | "loss"
  ) => {
    startTransition(() => {
      const { stock, amount, returnPercentage, tradeType } = values;
      const currentPortfolio = portfolioValue;
      const profit = amount * (returnPercentage / 100);
      const newPortfolioValue =
        outcome === "win"
          ? currentPortfolio + profit
          : currentPortfolio - amount;

      const newTrade: Trade = {
        id: trades.length + 1,
        stock: stock.toUpperCase(),
        amount,
        returnPercentage,
        outcome,
        profit: outcome === "win" ? profit : -amount,
        portfolioAfter: newPortfolioValue,
        tradeType,
        loggedAt: new Date().toISOString(),  // Capture timestamp
      };

      setTrades((prev) => [...prev, newTrade]);
      setCurrentPage(1);
    });
  };
  
  const handleSaveInitialPortfolio = () => {
    const newInitial = parseFloat(editingInitialPortfolioValue);
    if (!isNaN(newInitial) && newInitial > 0) {
      if (trades.length > 0) {
          toast({
              variant: "destructive",
              title: "Cannot Change Initial Portfolio",
              description: "Please reset the session to change the initial portfolio value.",
          });
      } else {
        setInitialPortfolio(newInitial);
        setIsEditingInitialPortfolio(false);
      }
    } else {
      toast({
          variant: "destructive",
          title: "Invalid Amount",
          description: "Please enter a valid positive number for the initial portfolio.",
      });
    }
  };

  const handleSaveSessionGoal = () => {
    const newGoal = parseInt(editingSessionGoalValue, 10);
    if (!isNaN(newGoal) && newGoal > 0) {
      setSessionGoal(newGoal);
      setIsEditingSessionGoal(false);
    } else {
      toast({
          variant: "destructive",
          title: "Invalid Goal",
          description: "Please enter a valid positive number for the session goal.",
      });
    }
  };

  const handleSaveProfitGoal = () => {
    const newGoal = parseFloat(editingProfitGoalValue);
    if (!isNaN(newGoal) && newGoal > 0) {
        setProfitGoal(newGoal);
        setProfitGoalType(editingProfitGoalType);
        setIsEditingProfitGoal(false);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Goal",
            description: "Please enter a valid positive number for the profit goal.",
        });
    }
  };
  
  const handleSaveTargetWinRate = () => {
    const newRate = parseFloat(editingTargetWinRateValue);
    if (!isNaN(newRate) && newRate > 0 && newRate <= 100) {
        setTargetWinRate(newRate);
        setIsEditingTargetWinRate(false);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid Rate",
            description: "Please enter a valid percentage between 1 and 100.",
        });
    }
  };

  const handleOnboardingSubmit = (values: OnboardingValues) => {
    setInitialPortfolio(values.initialPortfolio);
    setEditingInitialPortfolioValue(String(values.initialPortfolio));
    setSessionGoal(values.sessionGoal);
    setEditingSessionGoalValue(String(values.sessionGoal));
    setTargetWinRate(values.targetWinRate);
    setEditingTargetWinRateValue(String(values.targetWinRate));
    setProfitGoal(values.profitGoal);
    setProfitGoalType(values.profitGoalType);
    setEditingProfitGoalValue(String(values.profitGoal));
    setEditingProfitGoalType(values.profitGoalType);
  };

  const handleReset = () => {
    startTransition(() => {
      setTrades([]);
      setSessionStocks(defaultStocks);
      setStockFilter("");
      setInitialPortfolio(DEFAULT_INITIAL_PORTFOLIO);
      setEditingInitialPortfolioValue(String(DEFAULT_INITIAL_PORTFOLIO));
      setIsEditingInitialPortfolio(false);
      setSessionGoal(DEFAULT_SESSION_GOAL);
      setEditingSessionGoalValue(String(DEFAULT_SESSION_GOAL));
      setIsEditingSessionGoal(false);
      setProfitGoal(DEFAULT_PROFIT_GOAL);
      setProfitGoalType(DEFAULT_PROFIT_GOAL_TYPE);
      setEditingProfitGoalValue(String(DEFAULT_PROFIT_GOAL));
      setEditingProfitGoalType(DEFAULT_PROFIT_GOAL_TYPE);
      setIsEditingProfitGoal(false);
      setTargetWinRate(DEFAULT_TARGET_WIN_RATE);
      setEditingTargetWinRateValue(String(DEFAULT_TARGET_WIN_RATE));
      setIsEditingTargetWinRate(false);
      form.reset({ stock: "", amount: "" as any, returnPercentage: "" as any, tradeType: "call" });
      setFavoritedStocks([]);
      setCurrentPage(1);
      setItemsPerPage(DEFAULT_ITEMS_PER_PAGE);
      // Show onboarding dialog after reset
      setShowOnboarding(true);
    });
  };

  const handleAddStock = () => {
    const stockToAdd = stockFilter.trim().toUpperCase();
    if (stockToAdd && !sessionStocks.includes(stockToAdd)) {
        setSessionStocks(prev => [stockToAdd, ...prev]);
        setStockFilter("");
    } else if (sessionStocks.includes(stockToAdd)) {
        toast({
            variant: "destructive",
            title: "Stock Already Exists",
            description: `"${stockToAdd}" is already in your session list.`,
        });
    }
  };

  const handleRemoveStock = (stockToRemove: string) => {
      setSessionStocks(prev => prev.filter(s => s !== stockToRemove));
      setFavoritedStocks(prev => prev.filter(s => s !== stockToRemove));
      if (form.getValues("stock") === stockToRemove) {
          form.setValue("stock", "");
      }
  };

  const handleTradeImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let parsedTrades: Array<{
      direction: 'call' | 'put';
      orderNumber: string;
      expiryTime: string;
      asset: string;
      openTime: string;
      closeTime: string;
      openPrice: number;
      closePrice: number;
      tradeAmount: number;
      profitAmount: number;
      currency: string;
    }> = [];

    try {
      // Detect file type and use appropriate parser
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const buffer = await file.arrayBuffer();
        parsedTrades = await parseExcelTrades(Buffer.from(buffer));
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        parsedTrades = parseCsvTrades(text);
      } else {
        toast({
          variant: "destructive",
          title: "Unsupported File Type",
          description: "Please upload an Excel (.xlsx, .xls) or CSV file.",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      if (parsedTrades.length === 0) {
        toast({
          variant: "destructive",
          title: "No Trades Found",
          description: "Could not find any valid trades in the file. Please check the format.",
        });
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Extract unique assets from trades
      const uniqueAssets = [...new Set(parsedTrades.map(t => t.asset))];

      // Show confirmation dialog instead of immediately importing
      setPendingImport({
        trades: parsedTrades,
        assets: uniqueAssets,
      });

    } catch (error) {
      console.error("Error importing trades:", error);
      toast({
        variant: "destructive",
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Could not parse the file. Please check the format.",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImportConfirm = (isHistorical: boolean) => {
    if (!pendingImport) return;

    const { trades: parsedTrades, assets: uniqueAssets } = pendingImport;

    // Add new assets to session stocks
    const newAssets = uniqueAssets.filter(asset => !sessionStocks.includes(asset));
    if (newAssets.length > 0) {
      setSessionStocks(prev => [...prev, ...newAssets]);
    }

    // Calculate starting portfolio
    let startingPortfolio;
    if (isHistorical) {
      // Historical: Each trade is independent, no portfolio chain
      startingPortfolio = initialPortfolio;
    } else {
      // Current session: Calculate portfolio chain
      if (trades.length === 0) {
        startingPortfolio = Math.max(initialPortfolio, parsedTrades[0].tradeAmount * 2);
      } else {
        startingPortfolio = initialPortfolio;
      }
    }

    // Convert trades with isHistorical flag
    const convertedTrades: Trade[] = parsedTrades.map((parsed, index) => ({
      id: trades.length + index + 1,
      stock: parsed.asset,
      amount: parsed.tradeAmount,
      returnPercentage: parsed.profitAmount >= 0
        ? Math.abs((parsed.profitAmount / parsed.tradeAmount) * 100)
        : Math.abs((parsed.profitAmount / parsed.tradeAmount) * 100),
      outcome: (parsed.profitAmount >= 0 ? "win" : "loss") as "win" | "loss",
      profit: parsed.profitAmount,
      portfolioAfter: isHistorical
        ? startingPortfolio  // Historical: all trades show same starting value
        : index === 0
          ? startingPortfolio + parsed.profitAmount
          : 0,  // Will be calculated sequentially
      tradeType: parsed.direction,
      orderNumber: parsed.orderNumber,
      expiryTime: parsed.expiryTime,
      openTime: parsed.openTime,
      closeTime: parsed.closeTime,
      openPrice: parsed.openPrice,
      closePrice: parsed.closePrice,
      currency: parsed.currency,
      isHistorical: isHistorical,  // NEW FLAG
    }));

    // For current session, calculate portfolio chain
    if (!isHistorical && convertedTrades.length > 0) {
      let runningPortfolio = startingPortfolio;
      convertedTrades.forEach(trade => {
        runningPortfolio += trade.profit;
        trade.portfolioAfter = runningPortfolio;
      });
    }

    // Add to trades
    setTrades(prev => [...prev, ...convertedTrades]);
    setCurrentPage(1);
    setPendingImport(null);

    // Success toast
    toast({
      title: isHistorical ? "Historical Data Imported" : "Trades Imported",
      description: `Imported ${convertedTrades.length} ${isHistorical ? "historical" : ""} trade${convertedTrades.length !== 1 ? "s" : ""} from ${uniqueAssets.length} asset${uniqueAssets.length !== 1 ? "s" : ""}.`,
    });
  };

  const toggleFavorite = (stockToToggle: string) => {
    setFavoritedStocks(prev => 
        prev.includes(stockToToggle) 
        ? prev.filter(s => s !== stockToToggle)
        : [...prev, stockToToggle]
    );
  };

  const stockOptions = useMemo(() => {
    const list = favoritedStocks.length > 0 ? favoritedStocks : sessionStocks;
    return list.map(stock => ({ value: stock.toLowerCase(), label: stock }));
  }, [sessionStocks, favoritedStocks]);

  const filteredSessionStocks = useMemo(() => {
    if (!stockFilter) {
      return sessionStocks;
    }
    return sessionStocks.filter(stock =>
      stock.toLowerCase().includes(stockFilter.toLowerCase())
    );
  }, [sessionStocks, stockFilter]);

  // Paginated stocks for Session Stocks card
  const paginatedStocks = useMemo(() => {
    const startIndex = (stocksCurrentPage - 1) * STOCKS_ITEMS_PER_PAGE;
    return filteredSessionStocks.slice(startIndex, startIndex + STOCKS_ITEMS_PER_PAGE);
  }, [filteredSessionStocks, stocksCurrentPage]);

  // Auto-detect current trading session on mount and every minute
  useEffect(() => {
    const updateSession = () => {
      if (!manualSessionOverride) {
        const session = getCurrentLocalSession();
        const active = getActiveSessions();
        setCurrentSession(session);
        setActiveSessions(active);
      }
    };

    updateSession();
    const interval = setInterval(updateSession, 60000);

    return () => clearInterval(interval);
  }, [manualSessionOverride]);


  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-sans">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <BookOpenCheck className="w-8 h-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">
            Bucks Bible
          </h1>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Session
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will clear all trades and session data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                Confirm Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(portfolioValue)}</div>
                        <div className="text-xs text-muted-foreground">
                          Initial: {isEditingInitialPortfolio ? (
                            <div className="flex items-center gap-1 mt-1">
                              <Input 
                                type="number" 
                                value={editingInitialPortfolioValue}
                                onChange={(e) => setEditingInitialPortfolioValue(e.target.value)}
                                className="h-6 text-xs w-24"
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveInitialPortfolio()}
                              />
                              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSaveInitialPortfolio} disabled={trades.length > 0}>
                                <Check className="h-4 w-4"/>
                              </Button>
                               <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setIsEditingInitialPortfolio(false); setEditingInitialPortfolioValue(String(initialPortfolio))}}>
                                <X className="h-4 w-4"/>
                              </Button>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1">
                              {formatCurrency(initialPortfolio)}
                              <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setIsEditingInitialPortfolio(true)} disabled={trades.length > 0}>
                                <Pencil className="h-3 w-3"/>
                              </Button>
                            </span>
                          )}
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Session P/L</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(totalProfit)}</div>
                        <p className="text-xs text-muted-foreground">{totalProfit !== 0 ? formatPercent(totalProfit/initialPortfolio * 100) : '0.00%'} return</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                        <CirclePercent className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatPercent(winRate)}</div>
                        <p className="text-xs text-muted-foreground">{wins} wins, {losses} losses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Trades</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                          {isEditingSessionGoal ? (
                              <div className="flex items-center gap-1">
                                <Input 
                                  type="number" 
                                  value={editingSessionGoalValue}
                                  onChange={(e) => setEditingSessionGoalValue(e.target.value)}
                                  className="h-8 text-xl w-24"
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveSessionGoal()}
                                />
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveSessionGoal}>
                                  <Check className="h-5 w-5"/>
                                </Button>
                                 <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditingSessionGoal(false); setEditingSessionGoalValue(String(sessionGoal))}}>
                                  <X className="h-5 w-5"/>
                                </Button>
                              </div>
                            ) : (
                              <span className="flex items-center gap-1">
                                {trades.length} / {sessionGoal}
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingSessionGoal(true)}>
                                  <Pencil className="h-4 w-4"/>
                                </Button>
                              </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">Session goal</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profit Goal</CardTitle>
                        <Trophy className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isEditingProfitGoal ? (
                             <div className="flex flex-col gap-2">
                                 <div className="flex items-center gap-1">
                                     <Input
                                         type="number"
                                         value={editingProfitGoalValue}
                                         onChange={(e) => setEditingProfitGoalValue(e.target.value)}
                                         className="h-8 text-xl w-24"
                                         onKeyDown={(e) => e.key === 'Enter' && handleSaveProfitGoal()}
                                     />
                                     <Select value={editingProfitGoalType} onValueChange={(v) => setEditingProfitGoalType(v as any)}>
                                         <SelectTrigger className="w-20 h-8">
                                             <SelectValue />
                                         </SelectTrigger>
                                         <SelectContent>
                                             <SelectItem value="dollar">$</SelectItem>
                                             <SelectItem value="percent">%</SelectItem>
                                         </SelectContent>
                                     </Select>
                                 </div>
                                 <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveProfitGoal}>
                                        <Check className="h-5 w-5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditingProfitGoal(false); setEditingProfitGoalValue(String(profitGoal)); setEditingProfitGoalType(profitGoalType); }}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                 </div>
                             </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    <span>{profitGoalType === 'dollar' ? formatCurrency(profitGoal) : `${profitGoal}%`}</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingProfitGoal(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    {formatCurrency(totalProfit)} / {formatCurrency(profitGoalAmount)}
                                </div>
                                <Progress value={profitGoalProgress} className="h-2 mt-2" />
                            </>
                        )}
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Target Win Rate</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isEditingTargetWinRate ? (
                             <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1">
                                    <Input
                                        type="number"
                                        value={editingTargetWinRateValue}
                                        onChange={(e) => setEditingTargetWinRateValue(e.target.value)}
                                        className="h-8 text-xl w-24"
                                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTargetWinRate()}
                                    />
                                    <span className="text-xl font-bold">%</span>
                                </div>
                                 <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSaveTargetWinRate}>
                                        <Check className="h-5 w-5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setIsEditingTargetWinRate(false); setEditingTargetWinRateValue(String(targetWinRate)); }}>
                                        <X className="h-5 w-5" />
                                    </Button>
                                 </div>
                             </div>
                        ) : (
                            <>
                                <div className="text-2xl font-bold flex items-center gap-2">
                                    <span>{targetWinRate}%</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditingTargetWinRate(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                    Current: {formatPercent(winRate)}
                                </div>
                                <Progress value={targetWinRateProgress} className="h-2 mt-2" />
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Tabs value={currentView} onValueChange={(v) => setCurrentView(v as 'journal' | 'performance')}>
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="journal">Trade Journal</TabsTrigger>
                <TabsTrigger value="performance">Stock Performance</TabsTrigger>
              </TabsList>

              <TabsContent value="journal" className="mt-0">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 flex flex-col shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Trade Journal</CardTitle>
                      <CardDescription>
                        Log new trades and review your session history.
                      </CardDescription>
                    </div>

                    {/* Session Indicator */}
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={currentSession === 'Spread Hours' ? 'secondary' : 'default'}
                          className="text-sm px-3 py-1"
                        >
                          {activeSessions.length > 1 && <span className="mr-1">🔥</span>}
                          {activeSessions.map((session) => (
                            <span key={session} className="mr-1">
                              {SESSION_CONFIG[session].flag}
                            </span>
                          ))}
                          {activeSessions.length === 1 ? currentSession : 'Overlap'}
                        </Badge>
                        {currentTimeNY && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {currentTimeNY} NY
                          </span>
                        )}
                      </div>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-48">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground mb-2">Set trading session:</p>
                            {(Object.keys(SESSION_CONFIG) as TradingSession[]).map((session) => (
                              <Button
                                key={session}
                                variant={currentSession === session ? 'default' : 'ghost'}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                  setCurrentSession(session);
                                  setActiveSessions([session]);
                                  setManualSessionOverride(session);
                                }}
                              >
                                <span className="mr-2">{SESSION_CONFIG[session].flag}</span>
                                {session}
                              </Button>
                            ))}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-muted-foreground"
                              onClick={() => {
                                setManualSessionOverride(null);
                                setCurrentSession(getCurrentLocalSession());
                                setActiveSessions(getActiveSessions());
                              }}
                            >
                              Auto-detect
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0">
                  {/* Show Historical Toggle */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                    <Checkbox
                      id="showHistorical"
                      checked={showHistoricalInJournal}
                      onCheckedChange={(checked) => setShowHistoricalInJournal(checked as boolean)}
                    />
                    <Label htmlFor="showHistorical" className="text-sm cursor-pointer">
                      Show historical trades in journal
                    </Label>
                  </div>
                   <Form {...form}>
                    <div className="pr-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[180px]">Stock</TableHead>
                            <TableHead className="w-[120px]">Amount ($)</TableHead>
                            <TableHead className="w-[120px]">Return (%)</TableHead>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead className="w-[200px]">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                              <TableCell>
                                  <FormField
                                    control={form.control}
                                    name="stock"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                            <Combobox
                                                options={stockOptions}
                                                value={field.value}
                                                onChange={(value) => field.onChange(value.toUpperCase())}
                                                placeholder="Select stock..."
                                                searchPlaceholder="Search stocks..."
                                                emptyPlaceholder="No stocks found."
                                            />
                                        </FormControl>
                                        <FormMessage className="text-xs"/>
                                      </FormItem>
                                    )}
                                  />
                              </TableCell>
                              <TableCell>
                                  <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input type="number" placeholder="e.g., 100" {...field} className="text-sm" />
                                        </FormControl>
                                        <FormMessage className="text-xs"/>
                                      </FormItem>
                                    )}
                                  />
                              </TableCell>
                              <TableCell>
                                  <FormField
                                    control={form.control}
                                    name="returnPercentage"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <Input type="number" placeholder="e.g., 85" {...field} className="text-sm" />
                                        </FormControl>
                                        <FormMessage className="text-xs"/>
                                      </FormItem>
                                    )}
                                  />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name="tradeType"
                                  render={({ field }) => (
                                    <FormItem className="space-y-3">
                                      <FormControl>
                                        <RadioGroup
                                          onValueChange={field.onChange}
                                          defaultValue={field.value}
                                          className="flex items-center space-x-2"
                                        >
                                          <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                              <RadioGroupItem value="call" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                              Call
                                            </FormLabel>
                                          </FormItem>
                                          <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                              <RadioGroupItem value="put" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                              Put
                                            </FormLabel>
                                          </FormItem>
                                        </RadioGroup>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={form.handleSubmit((data) => handleAddTrade(data, "win"))}
                                      size="sm"
                                      disabled={isPending}
                                      className="flex-1"
                                    >
                                      <ArrowUpRight className="mr-2 h-4 w-4" /> Log Win
                                    </Button>
                                    <Button
                                      onClick={form.handleSubmit((data) => handleAddTrade(data, "loss"))}
                                      size="sm"
                                      variant="destructive"
                                      disabled={isPending}
                                      className="flex-1"
                                    >
                                      <ArrowDownLeft className="mr-2 h-4 w-4" /> Log Loss
                                    </Button>
                                  </div>
                              </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </Form>

                  <ScrollArea className="flex-1 mt-4">
                    <div className="pr-4">
                      <Table>
                         <TableHeader>
                          <TableRow>
                            <TableHead className="w-[70px]">Trade</TableHead>
                            <TableHead className="w-[100px]">Stock</TableHead>
                            <TableHead className="w-[80px]">Type</TableHead>
                            <TableHead className="w-[90px]">Logged</TableHead>
                            <TableHead className="w-[90px]">Open</TableHead>
                            <TableHead className="w-[110px]">Amount</TableHead>
                            <TableHead className="w-[140px]">Outcome</TableHead>
                            <TableHead>P/L</TableHead>
                            <TableHead className="text-right">Portfolio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trades.length > 0 ? (
                            paginatedTrades.map((trade) => (
                              <TableRow key={trade.id}>
                                <TableCell className="font-medium">
                                  #{trade.id}
                                </TableCell>
                                 <TableCell className="font-medium">
                                  {trade.stock}
                                </TableCell>
                                <TableCell className="capitalize">{trade.tradeType}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {formatTime(trade.loggedAt)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {trade.openTime ? formatTime(trade.openTime) : 'N/A'}
                                </TableCell>
                                <TableCell className="text-left">
                                  {formatCurrency(trade.amount)}
                                </TableCell>
                                <TableCell>
                                  {trade.outcome === "win" ? (
                                    <span className="flex items-center gap-2 text-primary">
                                      <ArrowUpRight className="h-4 w-4" /> Win
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-2 text-destructive">
                                      <ArrowDownLeft className="h-4 w-4" /> Loss
                                    </span>
                                  )}
                                </TableCell>
                                
                                <TableCell
                                  className={`text-left font-semibold ${
                                    trade.profit > 0
                                      ? "text-primary"
                                      : "text-destructive"
                                  }`}
                                >
                                  {formatCurrency(trade.profit)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(trade.portfolioAfter)}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell
                                colSpan={7}
                                className="h-24 text-center text-muted-foreground"
                              >
                                No trades logged yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between px-4 pt-4 border-t border-white/10">
                    <TradePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      itemsPerPage={itemsPerPage}
                      itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
                      startIndex={startIndex}
                      endIndex={endIndex}
                      totalItems={trades.length}
                      onPageChange={handlePageChange}
                      onItemsPerPageChange={(items) => {
                        setItemsPerPage(items);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-6">
                <CompoundPlanTracker
                  portfolioValue={portfolioValue}
                  trades={trades}
                />
                <Card className="flex-1 flex flex-col shadow-lg">
                      <CardHeader>
                          <CardTitle>Stock Performance</CardTitle>
                          <CardDescription>
                              Review your win/loss ratio for each stock.
                          </CardDescription>
                      </CardHeader>
                      <CardContent>
                          <ScrollArea className="h-[500px]">
                              {/* Overall Stats Section */}
                              {trades.length > 0 && (
                                  <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                                      <h3 className="text-lg font-semibold mb-3">Overall Performance</h3>
                                      <div className="grid grid-cols-2 gap-4 mb-4">
                                          <div>
                                              <div className="text-sm text-muted-foreground">Overall Win Rate</div>
                                              <div className="text-2xl font-bold">{formatPercent((overallStats.wins / overallStats.total) * 100)}</div>
                                              <div className="text-xs text-muted-foreground">{overallStats.wins}W / {overallStats.losses}L</div>
                                          </div>
                                          <div>
                                              <div className="text-sm text-muted-foreground">Total P/L</div>
                                              <div className={`text-2xl font-bold ${overallStats.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                  {formatCurrency(overallStats.profit)}
                                              </div>
                                              <div className="text-xs text-muted-foreground">{overallStats.total} trades</div>
                                          </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                          <div>
                                              <div className="text-sm text-muted-foreground">Calls</div>
                                              <div className="text-lg font-semibold text-blue-400">
                                                  {overallStats.calls.wins + overallStats.calls.losses > 0
                                                      ? `${overallStats.calls.wins}/${overallStats.calls.wins + overallStats.calls.losses}`
                                                      : 'N/A'}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                  {overallStats.calls.wins + overallStats.calls.losses > 0
                                                      ? formatPercent((overallStats.calls.wins / (overallStats.calls.wins + overallStats.calls.losses)) * 100)
                                                      : '0%'}
                                              </div>
                                          </div>
                                          <div>
                                              <div className="text-sm text-muted-foreground">Puts</div>
                                              <div className="text-lg font-semibold text-amber-400">
                                                  {overallStats.puts.wins + overallStats.puts.losses > 0
                                                      ? `${overallStats.puts.wins}/${overallStats.puts.wins + overallStats.puts.losses}`
                                                      : 'N/A'}
                                              </div>
                                              <div className="text-xs text-muted-foreground">
                                                  {overallStats.puts.wins + overallStats.puts.losses > 0
                                                      ? formatPercent((overallStats.puts.wins / (overallStats.puts.wins + overallStats.puts.losses)) * 100)
                                                      : '0%'}
                                              </div>
                                          </div>
                                      </div>

                                      {/* Overall Charts */}
                                      <div className="grid grid-cols-2 gap-4 mt-4">
                                          <div className="h-40">
                                              <ResponsiveContainer width="100%" height="100%">
                                                  <PieChart>
                                                      <Pie
                                                          data={[
                                                              { name: 'Wins', value: overallStats.wins },
                                                              { name: 'Losses', value: overallStats.losses },
                                                          ]}
                                                          cx="50%"
                                                          cy="50%"
                                                          innerRadius={30}
                                                          outerRadius={60}
                                                          paddingAngle={2}
                                                          dataKey="value"
                                                      >
                                                          <Cell fill={COLORS.primary} />
                                                          <Cell fill={COLORS.destructive} />
                                                      </Pie>
                                                      <Tooltip />
                                                  </PieChart>
                                              </ResponsiveContainer>
                                          </div>
                                          <div className="h-40">
                                              <ResponsiveContainer width="100%" height="100%">
                                                  <BarChart data={[
                                                      { name: 'Calls', wins: overallStats.calls.wins, losses: overallStats.calls.losses },
                                                      { name: 'Puts', wins: overallStats.puts.wins, losses: overallStats.puts.losses },
                                                  ]}>
                                                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                                      <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                                                      <YAxis stroke="#888" tick={{ fill: '#888' }} />
                                                      <Tooltip
                                                          contentStyle={{ backgroundColor: '#1e202d', border: '1px solid #333' }}
                                                          itemStyle={{ color: '#fff' }}
                                                      />
                                                      <Legend />
                                                      <Bar dataKey="wins" fill={COLORS.primary} name="Wins" />
                                                      <Bar dataKey="losses" fill={COLORS.destructive} name="Losses" />
                                                  </BarChart>
                                              </ResponsiveContainer>
                                          </div>
                                      </div>
                                  </div>
                              )}

                              {/* Session Breakdown Section */}
                              {sessionBreakdown.filter(s => s.session !== 'Unknown').length > 0 && (
                                  <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                                      <h3 className="text-lg font-semibold mb-3">Session Breakdown</h3>
                                      <div className="grid grid-cols-3 gap-4">
                                          {sessionBreakdown
                                              .filter(s => s.session !== 'Unknown')
                                              .map((session) => (
                                                  <div key={session.session} className="text-center">
                                                      <div className="text-sm font-semibold mb-1">{session.session}</div>
                                                      <div className="text-lg font-bold">{formatPercent(session.winRate)}</div>
                                                      <div className={`text-sm ${session.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                          {formatCurrency(session.profit)}
                                                      </div>
                                                      <div className="text-xs text-muted-foreground">
                                                          {session.wins}W / {session.losses}L ({session.total} trades)
                                                      </div>
                                                      <div className="flex justify-center gap-2 mt-2">
                                                          <span className="text-xs text-blue-400">
                                                              C: {session.calls.wins}/{session.calls.total}
                                                          </span>
                                                          <span className="text-xs text-amber-400">
                                                              P: {session.puts.wins}/{session.puts.total}
                                                          </span>
                                                      </div>
                                                  </div>
                                              ))}
                                      </div>
                                  </div>
                              )}

                              {/* Per-Stock Table with Expandable Rows */}
                              <Table>
                                  <TableHeader>
                                      <TableRow>
                                          <TableHead></TableHead>
                                          <TableHead>Stock</TableHead>
                                          <TableHead>Current Win Rate</TableHead>
                                          <TableHead>Current P/L</TableHead>
                                          <TableHead>Historical Win Rate</TableHead>
                                          <TableHead>Historical P/L</TableHead>
                                          <TableHead>Calls (W/L)</TableHead>
                                          <TableHead>Puts (W/L)</TableHead>
                                      </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                      {stockPerformance.length > 0 ? (
                                          stockPerformance.map((p) => {
                                              const isExpanded = expandedStocks.has(p.stock);
                                              const currentStockProfit = trades.filter(t => t.stock === p.stock && !t.isHistorical).reduce((acc, t) => acc + t.profit, 0);
                                              const historicalStats = historicalStockPerformance.find(h => h.stock === p.stock);
                                              const historicalStockProfit = trades.filter(t => t.stock === p.stock && t.isHistorical).reduce((acc, t) => acc + t.profit, 0);
                                              const stockSessions = getStockSessionBreakdown(p.stock);

                                              return (
                                                  <React.Fragment key={p.stock}>
                                                      <TableRow
                                                          className="cursor-pointer hover:bg-muted/50"
                                                          onClick={() => toggleStockExpansion(p.stock)}
                                                      >
                                                          <TableCell>
                                                              <Button
                                                                  size="icon"
                                                                  variant="ghost"
                                                                  className="h-6 w-6"
                                                              >
                                                                  {isExpanded ? (
                                                                      <ChevronDown className="h-4 w-4" />
                                                                  ) : (
                                                                      <ChevronRight className="h-4 w-4" />
                                                                  )}
                                                              </Button>
                                                          </TableCell>
                                                          <TableCell className="font-medium">{p.stock}</TableCell>
                                                          <TableCell className="font-medium">
                                                              {`${p.wins}/${p.total} (${formatPercent((p.wins / p.total) * 100)})`}
                                                          </TableCell>
                                                          <TableCell>
                                                              <Badge variant={currentStockProfit >= 0 ? "default" : "destructive"}>
                                                                  {formatCurrency(currentStockProfit)}
                                                              </Badge>
                                                          </TableCell>
                                                          <TableCell>
                                                              {historicalStats ? (
                                                                  <span className="font-medium text-yellow-400">
                                                                      {`${historicalStats.wins}/${historicalStats.total} (${formatPercent((historicalStats.wins / historicalStats.total) * 100)})`}
                                                                  </span>
                                                              ) : (
                                                                  <span className="text-muted-foreground text-sm">N/A</span>
                                                              )}
                                                          </TableCell>
                                                          <TableCell>
                                                              {historicalStats ? (
                                                                  <Badge variant={historicalStockProfit >= 0 ? "secondary" : "destructive"} className="text-yellow-400 border-yellow-400/30">
                                                                      {formatCurrency(historicalStockProfit)}
                                                                  </Badge>
                                                              ) : (
                                                                  <span className="text-muted-foreground text-sm">N/A</span>
                                                              )}
                                                          </TableCell>
                                                          <TableCell>
                                                              <div className="font-medium">
                                                                  {p.calls.wins + p.calls.losses > 0
                                                                      ? `${p.calls.wins}/${p.calls.wins + p.calls.losses} (${formatPercent((p.calls.wins / (p.calls.wins + p.calls.losses)) * 100)})`
                                                                      : 'N/A'}
                                                              </div>
                                                          </TableCell>
                                                          <TableCell>
                                                              <div className="font-medium">
                                                                  {p.puts.wins + p.puts.losses > 0
                                                                      ? `${p.puts.wins}/${p.puts.wins + p.puts.losses} (${formatPercent((p.puts.wins / (p.puts.wins + p.puts.losses)) * 100)})`
                                                                      : 'N/A'}
                                                              </div>
                                                          </TableCell>
                                                      </TableRow>
                                                      {isExpanded && stockSessions.length > 0 && (
                                                          <TableRow>
                                                              <TableCell colSpan={8} className="p-0">
                                                                  <div className="p-4 bg-muted/30">
                                                                      <div className="grid grid-cols-3 gap-4">
                                                                          {stockSessions.map((session) => (
                                                                              <div key={session.session} className="text-center p-3 bg-background rounded-lg">
                                                                                  <div className="text-sm font-semibold mb-1">{session.session}</div>
                                                                                  <div className="text-lg font-bold">{formatPercent(session.winRate)}</div>
                                                                                  <div className={`text-sm ${session.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                                                      {formatCurrency(session.profit)}
                                                                                  </div>
                                                                                  <div className="text-xs text-muted-foreground">
                                                                                      {session.wins}W / {session.losses}L
                                                                                  </div>
                                                                                  <div className="flex justify-center gap-2 mt-2">
                                                                                      <span className="text-xs text-blue-400">
                                                                                          C: {session.calls.wins}/{session.calls.total}
                                                                                      </span>
                                                                                      <span className="text-xs text-amber-400">
                                                                                          P: {session.puts.wins}/{session.puts.total}
                                                                                      </span>
                                                                                  </div>
                                                                              </div>
                                                                          ))}
                                                                      </div>
                                                                  </div>
                                                              </TableCell>
                                                          </TableRow>
                                                      )}
                                                  </React.Fragment>
                                              );
                                          })
                                      ) : (
                                          <TableRow>
                                              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                                  No stock data yet.
                                              </TableCell>
                                          </TableRow>
                                      )}
                                  </TableBody>
                              </Table>
                          </ScrollArea>
                      </CardContent>
                  </Card>
              </div>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="mt-0">
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle>Stock Performance</CardTitle>
                    <CardDescription>Detailed performance analysis by stock</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[calc(100vh-400px)]">
                      {/* All stock performance content */}
                      {trades.length > 0 && (
                        <>
                          {/* Overall Stats Section */}
                          <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                            <h3 className="text-lg font-semibold mb-3">Overall Performance</h3>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Overall Win Rate</div>
                                <div className="text-2xl font-bold">{formatPercent((overallStats.wins / overallStats.total) * 100)}</div>
                                <div className="text-xs text-muted-foreground">{overallStats.wins}W / {overallStats.losses}L</div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Total P/L</div>
                                <div className={`text-2xl font-bold ${overallStats.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                  {formatCurrency(overallStats.profit)}
                                </div>
                                <div className="text-xs text-muted-foreground">{overallStats.total} trades</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-sm text-muted-foreground">Calls</div>
                                <div className="text-lg font-semibold text-blue-400">
                                  {overallStats.calls.wins + overallStats.calls.losses > 0
                                    ? `${overallStats.calls.wins}/${overallStats.calls.wins + overallStats.calls.losses}`
                                    : 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {overallStats.calls.wins + overallStats.calls.losses > 0
                                    ? formatPercent((overallStats.calls.wins / (overallStats.calls.wins + overallStats.calls.losses)) * 100)
                                    : '0%'}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-muted-foreground">Puts</div>
                                <div className="text-lg font-semibold text-amber-400">
                                  {overallStats.puts.wins + overallStats.puts.losses > 0
                                    ? `${overallStats.puts.wins}/${overallStats.puts.wins + overallStats.puts.losses}`
                                    : 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {overallStats.puts.wins + overallStats.puts.losses > 0
                                    ? formatPercent((overallStats.puts.wins / (overallStats.puts.wins + overallStats.puts.losses)) * 100)
                                    : '0%'}
                                </div>
                              </div>
                            </div>

                            {/* Overall Charts */}
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: 'Wins', value: overallStats.wins },
                                        { name: 'Losses', value: overallStats.losses },
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius={30}
                                      outerRadius={60}
                                      paddingAngle={2}
                                      dataKey="value"
                                    >
                                      <Cell fill={COLORS.primary} />
                                      <Cell fill={COLORS.destructive} />
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={[
                                    { name: 'Calls', wins: overallStats.calls.wins, losses: overallStats.calls.losses },
                                    { name: 'Puts', wins: overallStats.puts.wins, losses: overallStats.puts.losses },
                                  ]}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
                                    <YAxis stroke="#888" tick={{ fill: '#888' }} />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#1e202d', border: '1px solid #333' }}
                                      itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="wins" fill={COLORS.primary} name="Wins" />
                                    <Bar dataKey="losses" fill={COLORS.destructive} name="Losses" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Session Breakdown Section */}
                      {sessionBreakdown.filter(s => s.session !== 'Unknown').length > 0 && (
                        <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                          <h3 className="text-lg font-semibold mb-3">Session Breakdown</h3>
                          <div className="grid grid-cols-3 gap-4">
                            {sessionBreakdown
                              .filter(s => s.session !== 'Unknown')
                              .map((session) => (
                                <div key={session.session} className="text-center">
                                  <div className="text-sm font-semibold mb-1">{session.session}</div>
                                  <div className="text-lg font-bold">{formatPercent(session.winRate)}</div>
                                  <div className={`text-sm ${session.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                    {formatCurrency(session.profit)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {session.wins}W / {session.losses}L ({session.total} trades)
                                  </div>
                                  <div className="flex justify-center gap-2 mt-2">
                                    <span className="text-xs text-blue-400">
                                      C: {session.calls.wins}/{session.calls.total}
                                    </span>
                                    <span className="text-xs text-amber-400">
                                      P: {session.puts.wins}/{session.puts.total}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Per-Stock Table with Expandable Rows */}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead></TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Current Win Rate</TableHead>
                            <TableHead>Current P/L</TableHead>
                            <TableHead>Historical Win Rate</TableHead>
                            <TableHead>Historical P/L</TableHead>
                            <TableHead>Calls (W/L)</TableHead>
                            <TableHead>Puts (W/L)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stockPerformance.length > 0 ? (
                            stockPerformance.map((p) => {
                              const isExpanded = expandedStocks.has(p.stock);
                              const currentStockProfit = trades.filter(t => t.stock === p.stock && !t.isHistorical).reduce((acc, t) => acc + t.profit, 0);
                              const historicalStats = historicalStockPerformance.find(h => h.stock === p.stock);
                              const historicalStockProfit = trades.filter(t => t.stock === p.stock && t.isHistorical).reduce((acc, t) => acc + t.profit, 0);
                              const stockSessions = getStockSessionBreakdown(p.stock);

                              return (
                                <React.Fragment key={p.stock}>
                                  <TableRow
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => toggleStockExpansion(p.stock)}
                                  >
                                    <TableCell>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </TableCell>
                                    <TableCell className="font-medium">{p.stock}</TableCell>
                                    <TableCell className="font-medium">
                                      {`${p.wins}/${p.total} (${formatPercent((p.wins / p.total) * 100)})`}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={currentStockProfit >= 0 ? "default" : "destructive"}>
                                        {formatCurrency(currentStockProfit)}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {historicalStats ? (
                                        <span className="font-medium text-yellow-400">
                                          {`${historicalStats.wins}/${historicalStats.total} (${formatPercent((historicalStats.wins / historicalStats.total) * 100)})`}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">N/A</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {historicalStats ? (
                                        <Badge variant={historicalStockProfit >= 0 ? "secondary" : "destructive"} className="text-yellow-400 border-yellow-400/30">
                                          {formatCurrency(historicalStockProfit)}
                                        </Badge>
                                      ) : (
                                        <span className="text-muted-foreground text-sm">N/A</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium">
                                        {p.calls.wins + p.calls.losses > 0
                                          ? `${p.calls.wins}/${p.calls.wins + p.calls.losses} (${formatPercent((p.calls.wins / (p.calls.wins + p.calls.losses)) * 100)})`
                                          : 'N/A'}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="font-medium">
                                        {p.puts.wins + p.puts.losses > 0
                                          ? `${p.puts.wins}/${p.puts.wins + p.puts.losses} (${formatPercent((p.puts.wins / (p.puts.wins + p.puts.losses)) * 100)})`
                                          : 'N/A'}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {isExpanded && stockSessions.length > 0 && (
                                    <TableRow>
                                      <TableCell colSpan={8} className="p-0">
                                        <div className="p-4 bg-muted/30">
                                          <div className="grid grid-cols-3 gap-4">
                                            {stockSessions.map((session) => (
                                              <div key={session.session} className="text-center p-3 bg-background rounded-lg">
                                                <div className="text-sm font-semibold mb-1">{session.session}</div>
                                                <div className="text-lg font-bold">{formatPercent(session.winRate)}</div>
                                                <div className={`text-sm ${session.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                                  {formatCurrency(session.profit)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                  {session.wins}W / {session.losses}L
                                                </div>
                                                <div className="flex justify-center gap-2 mt-2">
                                                  <span className="text-xs text-blue-400">
                                                    C: {session.calls.wins}/{session.calls.total}
                                                  </span>
                                                  <span className="text-xs text-amber-400">
                                                    P: {session.puts.wins}/{session.puts.total}
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                No stock data yet.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Session Stocks - Small, Clean with Pagination */}
                <Card className="shadow-lg">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Session Stocks</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 text-xs"
                        >
                          Import
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleTradeImport}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    {/* Filter/Add */}
                    <div className="flex items-center gap-2 mb-3">
                      <Input
                        placeholder="Filter or add stock..."
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                        className="h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleAddStock}
                        disabled={!stockFilter}
                        className="h-8"
                      >
                        Add
                      </Button>
                    </div>

                    {/* Stocks List with Pagination */}
                    <ScrollArea className="h-28 rounded-md border">
                      <div className="p-1">
                        {paginatedStocks.length > 0 ? (
                          paginatedStocks.map((stock) => {
                            const isFavorited = favoritedStocks.includes(stock);
                            return (
                              <div
                                key={stock}
                                className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 rounded text-sm"
                              >
                                <span className="font-medium">{stock}</span>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      if (isFavorited) {
                                        setFavoritedStocks(prev => prev.filter(s => s !== stock));
                                      } else {
                                        setFavoritedStocks(prev => [...prev, stock]);
                                      }
                                    }}
                                  >
                                    <Star className={`h-3 w-3 ${isFavorited ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 text-destructive"
                                    onClick={() => handleRemoveStock(stock)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center text-muted-foreground text-sm py-6">
                            No stocks found
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Pagination Controls */}
                    {filteredSessionStocks.length > STOCKS_ITEMS_PER_PAGE && (
                      <div className="flex items-center justify-between mt-2 text-xs">
                        <span className="text-muted-foreground">
                          Showing {(stocksCurrentPage - 1) * STOCKS_ITEMS_PER_PAGE + 1}-
                          {Math.min(stocksCurrentPage * STOCKS_ITEMS_PER_PAGE, filteredSessionStocks.length)} of {filteredSessionStocks.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStocksCurrentPage(p => Math.max(1, p - 1))}
                            disabled={stocksCurrentPage === 1}
                            className="h-6 w-6 p-0"
                          >
                            &lsaquo;
                          </Button>
                          <span className="text-muted-foreground px-1">
                            {stocksCurrentPage} / {Math.ceil(filteredSessionStocks.length / STOCKS_ITEMS_PER_PAGE)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setStocksCurrentPage(p => Math.min(Math.ceil(filteredSessionStocks.length / STOCKS_ITEMS_PER_PAGE), p + 1))}
                            disabled={stocksCurrentPage === Math.ceil(filteredSessionStocks.length / STOCKS_ITEMS_PER_PAGE)}
                            className="h-6 w-6 p-0"
                          >
                            &rsaquo;
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Onboarding Dialog */}
      <OnboardingDialog
        open={showOnboarding}
        onOpenChange={setShowOnboarding}
        onSubmit={handleOnboardingSubmit}
        defaults={{
          initialPortfolio,
          sessionGoal,
          targetWinRate,
          profitGoal,
          profitGoalType,
        }}
      />

      {/* Trade Import Dialog */}
      <TradeImportDialog
        open={pendingImport !== null}
        onOpenChange={(open) => !open && setPendingImport(null)}
        tradeCount={pendingImport?.trades.length ?? 0}
        assets={pendingImport?.assets ?? []}
        onConfirm={handleImportConfirm}
      />
    </div>
  );
}
