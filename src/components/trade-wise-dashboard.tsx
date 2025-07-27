"use client";

import { useState, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { suggestTradeAmount } from "@/ai/flows/suggest-trade-amount";
import type { SuggestTradeAmountOutput } from "@/ai/flows/suggest-trade-amount";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Scale,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Sparkles,
  TrendingUp,
  CirclePercent,
  DollarSign,
  Loader2,
  BrainCircuit,
  AlertTriangle,
  Pencil,
  Check,
  X,
} from "lucide-react";

type Trade = {
  id: number;
  amount: number;
  returnPercentage: number;
  outcome: "win" | "loss";
  profit: number;
  portfolioAfter: number;
};

type RiskLevel = "low" | "medium" | "high";

const tradeSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .positive({ message: "Amount must be positive" }),
  returnPercentage: z.coerce
    .number({ invalid_type_error: "Must be a number" })
    .gte(0, { message: "Return must be non-negative" }),
});

const DEFAULT_INITIAL_PORTFOLIO = 1000.0;

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

  const portfolioValue = useMemo(() => {
    if (trades.length === 0) return initialPortfolio;
    return trades[0].portfolioAfter;
  }, [trades, initialPortfolio]);
  
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("medium");
  const [suggestion, setSuggestion] =
    useState<SuggestTradeAmountOutput | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof tradeSchema>>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      amount: undefined,
      returnPercentage: undefined,
    },
  });

  const { wins, losses, winRate } = useMemo(() => {
    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.length - wins;
    const winRate = trades.length > 0 ? (wins / trades.length) * 100 : 0;
    return { wins, losses, winRate };
  }, [trades]);

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
      form.reset();
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


  const handleReset = () => {
    startTransition(() => {
      setTrades([]);
      setInitialPortfolio(DEFAULT_INITIAL_PORTFOLIO);
      setEditingInitialPortfolioValue(String(DEFAULT_INITIAL_PORTFOLIO));
      setIsEditingInitialPortfolio(false);
      setSuggestion(null);
      form.reset();
    });
  };

  const handleGetSuggestion = async () => {
    setIsSuggestionLoading(true);
    setSuggestion(null);
    try {
      const tradeHistory = trades.map((t) => ({
        amount: t.amount,
        returnPercentage: t.returnPercentage,
        outcome: t.outcome,
      }));
      const result = await suggestTradeAmount({
        tradeHistory,
        currentPortfolioValue: portfolioValue,
        riskLevel,
      });
      setSuggestion(result);
    } catch (error) {
      console.error("AI suggestion failed:", error);
      toast({
        variant: "destructive",
        title: "AI Suggestion Error",
        description:
          "Could not generate a suggestion. Please check your connection and try again.",
      });
    } finally {
      setIsSuggestionLoading(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="text-primary" />
                  Smart Suggestion
                </CardTitle>
                <CardDescription>
                  Let AI suggest an optimal trade amount.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Risk Level</Label>
                <RadioGroup
                  value={riskLevel}
                  onValueChange={(value: RiskLevel) => setRiskLevel(value)}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="r1" />
                    <Label htmlFor="r1">Low</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="r2" />
                    <Label htmlFor="r2">Medium</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="r3" />
                    <Label htmlFor="r3">High</Label>
                  </div>
                </RadioGroup>
                <Button
                  onClick={handleGetSuggestion}
                  disabled={isSuggestionLoading}
                  className="w-full"
                >
                  {isSuggestionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <BrainCircuit className="mr-2 h-4 w-4" />
                  )}
                  Get Suggestion
                </Button>
              </CardContent>
              {isSuggestionLoading && (
                <CardFooter>
                  <div className="w-full space-y-2">
                    <Skeleton className="h-8 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                </CardFooter>
              )}
              {suggestion && (
                <CardFooter className="flex flex-col items-start gap-4">
                  <div className="w-full">
                    <Label className="text-muted-foreground">Suggested Amount</Label>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(suggestion.suggestedTradeAmount)}
                    </p>
                  </div>
                  <div className="w-full">
                     <Label className="text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Bankruptcy Risk
                    </Label>
                    <p className={`text-lg font-semibold ${suggestion.bankruptcyRisk > 20 ? 'text-destructive' : 'text-foreground'}`}>
                      {formatPercent(suggestion.bankruptcyRisk)}
                    </p>
                  </div>
                  <div className="w-full">
                    <Label className="text-muted-foreground">Reasoning</Label>
                    <p className="text-sm text-foreground/80">
                      {suggestion.reasoning}
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>
          </div>
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                        <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{trades.length}</div>
                        <p className="text-xs text-muted-foreground">in this session</p>
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

    