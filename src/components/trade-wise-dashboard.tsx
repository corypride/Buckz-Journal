
"use client";

import { useState, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { Badge } from "@/components/ui/badge";
import { suggestTradeAmount, SuggestTradeAmountOutput, SuggestTradeAmountInput } from "@/ai/flows/suggest-trade-amount";

import {
  Scale,
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
  Lightbulb,
  Loader2,
  PlusCircle,
  Trash2,
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

const DEFAULT_INITIAL_PORTFOLIO = 1000.0;
const DEFAULT_SESSION_GOAL = 10;
const DEFAULT_PROFIT_GOAL = 100;
const DEFAULT_PROFIT_GOAL_TYPE = "dollar";
const DEFAULT_TARGET_WIN_RATE = 70;

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

  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high">("high");
  const [suggestion, setSuggestion] = useState<SuggestTradeAmountOutput | null>(null);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const [sessionStocks, setSessionStocks] = useState<string[]>([]);
  const [newStockInput, setNewStockInput] = useState("");


  const portfolioValue = useMemo(() => {
    if (trades.length === 0) return initialPortfolio;
    return trades[trades.length - 1].portfolioAfter;
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

  const { wins, losses, winRate, totalProfit, tradeHistoryForAI } = useMemo(() => {
    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.length - wins;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const totalProfit = trades.reduce((acc, trade) => acc + trade.profit, 0);
    const tradeHistoryForAI = trades.map(t => ({ stock: t.stock, amount: t.amount, returnPercentage: t.returnPercentage, outcome: t.outcome, tradeType: t.tradeType })).reverse();
    return { wins, losses, winRate, totalProfit, tradeHistoryForAI };
  }, [trades]);

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

  const { profitGoalAmount, profitGoalProgress } = useMemo(() => {
      const goalAmount = profitGoalType === 'dollar' ? profitGoal : initialPortfolio * (profitGoal / 100);
      const progress = goalAmount > 0 ? (totalProfit / goalAmount) * 100 : 0;
      return { profitGoalAmount: goalAmount, profitGoalProgress: progress };
  }, [profitGoal, profitGoalType, initialPortfolio, totalProfit]);

  const targetWinRateProgress = useMemo(() => {
      return targetWinRate > 0 ? (winRate / targetWinRate) * 100 : 0;
  }, [winRate, targetWinRate]);

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
      };

      setTrades((prev) => [...prev, newTrade]);
      setSuggestion(null);
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

  const handleReset = () => {
    startTransition(() => {
      setTrades([]);
      setSessionStocks([]);
      setNewStockInput("");
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
      setSuggestion(null);
      setRiskLevel("high");
    });
  };

  const handleGetSuggestion = async () => {
    setIsSuggesting(true);
    setSuggestion(null);

    const input: SuggestTradeAmountInput = {
        tradeHistory: tradeHistoryForAI as any, // Cast because tradeType is added
        currentPortfolioValue: portfolioValue,
        riskLevel,
        profitGoal: profitGoalAmount,
        targetWinRate,
        tradesRemaining: sessionGoal - trades.length > 0 ? sessionGoal - trades.length : 1,
    };
    
    try {
        const result = await suggestTradeAmount(input);
        setSuggestion(result);
    } catch (error) {
        console.error("Error getting suggestion:", error);
        toast({
            variant: "destructive",
            title: "Suggestion Failed",
            description: "Could not get a suggestion from the AI. Please try again.",
        });
    } finally {
        setIsSuggesting(false);
    }
  };

  const handleApplySuggestion = () => {
    if (suggestion) {
        form.setValue("amount", suggestion.suggestedTradeAmount);
    }
  };

  const handleAddStock = () => {
    const stockToAdd = newStockInput.trim().toUpperCase();
    if (stockToAdd && !sessionStocks.includes(stockToAdd)) {
        setSessionStocks(prev => [...prev, stockToAdd]);
        setNewStockInput("");
        if (sessionStocks.length === 0) {
            form.setValue("stock", stockToAdd);
        }
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
      if (form.getValues("stock") === stockToRemove) {
          form.setValue("stock", "");
      }
  };

  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground font-sans">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <Scale className="w-8 h-8 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-50">
            TradeWise
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
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <Card className="xl:col-span-2 flex flex-col shadow-lg">
                <CardHeader>
                  <CardTitle>Trade Journal</CardTitle>
                  <CardDescription>
                    Log new trades and review your session history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0">
                   <Form {...form}>
                    <div className="pr-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[120px]">Stock</TableHead>
                            <TableHead className="w-[120px]">Amount ($)</TableHead>
                            <TableHead className="w-[120px]">Return (%)</TableHead>
                            <TableHead className="w-[150px]">Type</TableHead>
                            <TableHead className="w-[180px]">Action</TableHead>
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
                                           <Select onValueChange={field.onChange} value={field.value} disabled={sessionStocks.length === 0}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Stock" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {sessionStocks.map(stock => (
                                                        <SelectItem key={stock} value={stock}>{stock}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
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
                            <TableHead className="w-[80px]">Trade</TableHead>
                            <TableHead className="w-[120px]">Stock</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="w-[140px]">Amount</TableHead>
                            <TableHead className="w-[180px]">Outcome</TableHead>
                            <TableHead>P/L</TableHead>
                            <TableHead className="text-right">Portfolio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trades.length > 0 ? (
                            [...trades].reverse().map((trade) => (
                              <TableRow key={trade.id}>
                                <TableCell className="font-medium">
                                  #{trade.id}
                                </TableCell>
                                 <TableCell className="font-medium">
                                  {trade.stock}
                                </TableCell>
                                <TableCell className="capitalize">{trade.tradeType}</TableCell>
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
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Session Stocks</CardTitle>
                    <CardDescription>
                        Manage the stocks for this trading session.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input 
                            placeholder="e.g., TSLA" 
                            value={newStockInput} 
                            onChange={(e) => setNewStockInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddStock()}
                            className="uppercase"
                        />
                        <Button onClick={handleAddStock}><PlusCircle className="mr-2"/> Add</Button>
                    </div>
                    <ScrollArea className="h-40 mt-4">
                        <div className="space-y-2 pr-4">
                            {sessionStocks.length > 0 ? (
                                sessionStocks.map(stock => (
                                    <div key={stock} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                        <span className="font-medium">{stock}</span>
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRemoveStock(stock)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </div>
                                ))
                            ) : (
                                <div className="flex items-center justify-center h-24 text-center text-muted-foreground">
                                    No stocks added yet.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                 <Card className="flex-1 flex flex-col shadow-lg">
                    <CardHeader>
                        <CardTitle>Stock Performance</CardTitle>
                        <CardDescription>
                            Review your win/loss ratio for each stock.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Stock</TableHead>
                                    <TableHead>Win Rate</TableHead>
                                    <TableHead>P/L</TableHead>
                                    <TableHead>Calls (W/L)</TableHead>
                                    <TableHead>Puts (W/L)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stockPerformance.length > 0 ? (
                                    stockPerformance.map((p) => (
                                        <TableRow key={p.stock}>
                                            <TableCell className="font-medium">{p.stock}</TableCell>
                                            <TableCell className="font-medium">
                                                {`${p.wins}/${p.total} (${formatPercent((p.wins / p.total) * 100)})`}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={trades.filter(t => t.stock === p.stock).reduce((acc, t) => acc + t.profit, 0) >= 0 ? "default" : "destructive"}>
                                                    {formatCurrency(trades.filter(t => t.stock === p.stock).reduce((acc, t) => acc + t.profit, 0))}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-primary">{p.calls.wins}</span> / <span className="text-destructive">{p.calls.losses}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-primary">{p.puts.wins}</span> / <span className="text-destructive">{p.puts.losses}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                            No stock data yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </ScrollArea>
                    </CardContent>
                </Card>
                 <div className="">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Lightbulb className="h-6 w-6 text-primary" />
                                <CardTitle>Smart Suggestion</CardTitle>
                            </div>
                            <CardDescription>
                                Let AI suggest an optimal trade amount. Risk level is set to high.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {suggestion && (
                                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Suggested Amount</Label>
                                        <p className="text-2xl font-bold text-primary">{formatCurrency(suggestion.suggestedTradeAmount)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Bankruptcy Risk</Label>
                                        <p className={`font-bold ${suggestion.bankruptcyRisk > 20 ? 'text-destructive' : ''}`}>{formatPercent(suggestion.bankruptcyRisk)}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Reasoning</Label>
                                        <p className="text-sm">{suggestion.reasoning}</p>
                                    </div>
                                    <Button onClick={handleApplySuggestion} size="sm" className="w-full">
                                        Apply Suggestion
                                    </Button>
                                </div>
                            )}

                            {isSuggesting && (
                                <div className="flex items-center justify-center p-8 bg-muted/50 rounded-lg">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleGetSuggestion} disabled={isSuggesting || isPending} className="w-full">
                                {isSuggesting ? 'Thinking...' : 'Get Suggestion'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
