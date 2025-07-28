
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
} from "lucide-react";

type Trade = {
  id: number;
  amount: number;
  returnPercentage: number;
  outcome: "win" | "loss";
  profit: number;
  portfolioAfter: number;
};

const tradeSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .positive({ message: "Amount must be positive" }),
  returnPercentage: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .gte(0, { message: "Return must be non-negative" }),
});

const DEFAULT_INITIAL_PORTFOLIO = 1000.0;
const DEFAULT_SESSION_GOAL = 10;
const DEFAULT_PROFIT_GOAL = 100;
const DEFAULT_PROFIT_GOAL_TYPE = "dollar";

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

  const portfolioValue = useMemo(() => {
    if (trades.length === 0) return initialPortfolio;
    return trades[0].portfolioAfter;
  }, [trades, initialPortfolio]);
  
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof tradeSchema>>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      amount: "" as any,
      returnPercentage: "" as any,
    },
  });

  const { wins, losses, winRate, totalProfit } = useMemo(() => {
    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.length - wins;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    const totalProfit = trades.reduce((acc, trade) => acc + trade.profit, 0);
    return { wins, losses, winRate, totalProfit };
  }, [trades]);

  const { profitGoalAmount, profitGoalProgress } = useMemo(() => {
      const goalAmount = profitGoalType === 'dollar' ? profitGoal : initialPortfolio * (profitGoal / 100);
      const progress = goalAmount > 0 ? (totalProfit / goalAmount) * 100 : 0;
      return { profitGoalAmount: goalAmount, profitGoalProgress: progress };
  }, [profitGoal, profitGoalType, initialPortfolio, totalProfit]);

  const handleAddTrade = (
    values: z.infer<typeof tradeSchema>,
    outcome: "win" | "loss"
  ) => {
    startTransition(() => {
      const { amount, returnPercentage } = values;
      const currentPortfolio = portfolioValue;
      const profit = amount * (returnPercentage / 100);
      const newPortfolioValue =
        outcome === "win"
          ? currentPortfolio + profit
          : currentPortfolio - amount;

      const newTrade: Trade = {
        id: trades.length + 1,
        amount,
        returnPercentage,
        outcome,
        profit: outcome === "win" ? profit : -amount,
        portfolioAfter: newPortfolioValue,
      };

      setTrades((prev) => [newTrade, ...prev]);
      
      // Don't reset form so user can re-use values
      // form.reset({ amount: "" as any, returnPercentage: "" as any });
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


  const handleReset = () => {
    startTransition(() => {
      setTrades([]);
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
      form.reset({ amount: "" as any, returnPercentage: "" as any });
    });
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
                This will clear all trades and reset your portfolio to the
                initial value. This action cannot be undone.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
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
                        <CardTitle className="text-sm font-medium">Total P/L</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatCurrency(totalProfit)}</div>
                        <p className="text-xs text-muted-foreground">in this session</p>
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
                        <CardTitle className="text-sm font-medium">Session Goal</CardTitle>
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
                        <p className="text-xs text-muted-foreground">Total trades in session</p>
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
            </div>
            
            <Card className="flex-1 flex flex-col shadow-lg">
              <CardHeader>
                <CardTitle>Trade Log</CardTitle>
                <CardDescription>
                  History of trades in this session. Add new trades below.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col min-h-0">
                 <Form {...form}>
                  <div className="pr-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px]">Amount ($)</TableHead>
                          <TableHead className="w-[140px]">Return (%)</TableHead>
                          <TableHead className="w-[180px]">Action</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead className="text-right">P/L</TableHead>
                          <TableHead className="text-right">Portfolio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
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
                            <TableCell colSpan={4}>
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
                          <TableHead className="w-[120px]">Trade</TableHead>
                          <TableHead className="w-[140px]">Amount</TableHead>
                           <TableHead className="w-[180px]">Outcome</TableHead>
                          <TableHead>P/L</TableHead>
                          <TableHead className="text-right">Portfolio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trades.length > 0 ? (
                          trades.map((trade) => (
                            <TableRow key={trade.id}>
                              <TableCell className="font-medium">
                                #{trade.id}
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
                              colSpan={5}
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
          </div>
        </div>
      </main>
    </div>
  );
}
