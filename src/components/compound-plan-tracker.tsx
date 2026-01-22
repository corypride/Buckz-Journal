"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  Target,
  Flame,
  Upload,
  Check,
  X,
  Pencil,
  Star,
} from "lucide-react";
import {
  CompoundPlan,
  CompoundPlanProgress,
  DEFAULT_PLANS,
  loadProgressFromStorage,
  saveProgressToStorage,
  detectCurrentLevel,
  getDefaultProgress,
  parsePlanCSV,
  isMilestoneLevel,
  STORAGE_KEY,
} from "@/lib/compound-plans";

interface CompoundPlanTrackerProps {
  portfolioValue: number;
  trades: Array<{ outcome: "win" | "loss" }>;
  onLevelUp?: (level: number) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

export function CompoundPlanTracker({
  portfolioValue,
  trades,
  onLevelUp,
}: CompoundPlanTrackerProps) {
  const { toast } = useToast();
  const [selectedPlanId, setSelectedPlanId] = useState<string>("relaxed");
  const [planProgress, setPlanProgress] = useState<CompoundPlanProgress | null>(null);
  const [isHot, setIsHot] = useState(false);
  const [manualLevelInput, setManualLevelInput] = useState("");
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [customPlans, setCustomPlans] = useState<CompoundPlan[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const celebrationTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isCelebratingRef = useRef<boolean>(false);
  const initialPortfolioRef = useRef<number>(portfolioValue);

  // Track portfolio peak for "slow down" notification
  const levelPeakPortfolioRef = useRef<number>(portfolioValue);
  const tradesSincePeakRef = useRef<number>(0);
  const hasShownSlowDownRef = useRef<boolean>(false);

  // Helper to clear all pending celebration timeouts
  const clearCelebrationTimeouts = () => {
    celebrationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    celebrationTimeoutsRef.current = [];
    isCelebratingRef.current = false;
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      clearCelebrationTimeouts();
    };
  }, []);

  // Get the current plan
  const currentPlan: CompoundPlan | undefined = [
    ...DEFAULT_PLANS,
    ...customPlans,
  ].find((p) => p.id === selectedPlanId);

  // Load progress from localStorage on mount
  useEffect(() => {
    const saved = loadProgressFromStorage();
    if (saved) {
      // Validate that the saved progress is compatible with the current plan
      const currentPlan = DEFAULT_PLANS.find(p => p.id === saved.planId);
      const isValid = currentPlan &&
        saved.currentLevel <= currentPlan.levels.length &&
        saved.completedLevels.every(l => l <= currentPlan.levels.length);

      if (isValid) {
        setPlanProgress(saved);
        setSelectedPlanId(saved.planId);
      } else {
        // Saved progress is invalid, reset to default
        const defaultProgress = getDefaultProgress("relaxed");
        setPlanProgress(defaultProgress);
        saveProgressToStorage(defaultProgress);
      }
    } else {
      // Initialize with default progress
      const defaultProgress = getDefaultProgress("relaxed");
      setPlanProgress(defaultProgress);
    }
  }, []);

  // Auto-detect current level based on portfolio
  useEffect(() => {
    if (!currentPlan || !planProgress) return;

    const detectedLevel = detectCurrentLevel(portfolioValue, currentPlan);
    const newCompletedLevels: number[] = [];

    // Find all levels that should be completed
    for (const level of currentPlan.levels) {
      if (portfolioValue >= level.targetAmount && !planProgress.completedLevels.includes(level.level)) {
        newCompletedLevels.push(level.level);
      }
    }

    // Find levels that should be removed (portfolio dropped below target)
    const lostLevels = planProgress.completedLevels.filter(level => {
      const levelData = currentPlan.levels.find(l => l.level === level);
      return levelData && portfolioValue < levelData.targetAmount;
    });

    const updatedCompletedLevels = planProgress.completedLevels.filter(
      level => !lostLevels.includes(level)
    );

    // Always update progress (levels can go up OR down)
    const hasChanges =
      detectedLevel !== planProgress.currentLevel ||
      newCompletedLevels.length > 0 ||
      lostLevels.length > 0;

    if (hasChanges) {
      const updatedProgress = {
        ...planProgress,
        currentLevel: detectedLevel,
        completedLevels: [...new Set([...updatedCompletedLevels, ...newCompletedLevels])].sort((a, b) => a - b),
      };
      setPlanProgress(updatedProgress);
      saveProgressToStorage(updatedProgress);

      // Only trigger celebration if this is NOT the initial load (i.e., new trades were placed)
      // Skip celebration on mount to avoid celebrating old trades
      // CAP: Max 3 consecutive celebrations even if more levels are completed
      const isInitialLoad = initialPortfolioRef.current === portfolioValue;
      if (!isInitialLoad && newCompletedLevels.length > 0 && !isCelebratingRef.current) {
        isCelebratingRef.current = true;

        // Limit to max 3 celebrations
        const levelsToCelebrate = newCompletedLevels.slice(0, 3);

        // Trigger celebration for newly completed levels (max 3)
        levelsToCelebrate.forEach((level, index) => {
          const timeoutId = setTimeout(() => {
            triggerCelebration(level);
            // Reset flag after last celebration
            if (index === levelsToCelebrate.length - 1) {
              const resetTimeoutId = setTimeout(() => {
                isCelebratingRef.current = false;
              }, 2000); // Allow final confetti to complete
              celebrationTimeoutsRef.current.push(resetTimeoutId);
            }
          }, index * 500);
          celebrationTimeoutsRef.current.push(timeoutId);
        });
      }

      if (detectedLevel > planProgress.currentLevel) {
        onLevelUp?.(detectedLevel);
      }
    }
  }, [portfolioValue, currentPlan, planProgress]);

  // Update hot streak status
  useEffect(() => {
    if (!planProgress) return;

    const recentTrades = trades.slice(-5);
    const consecutiveWins = getConsecutiveWins(recentTrades);
    const levelsPassedThisSession = planProgress.completedLevels.filter(
      (l) => l > (planProgress.lastCelebratedLevel || 0)
    ).length;

    const isWinningStreak = consecutiveWins >= 3;
    const isLevelStreak = levelsPassedThisSession >= 2;

    setIsHot(isWinningStreak || isLevelStreak);
  }, [trades, planProgress]);

  // "Slow down" notification - show positive message after portfolio decline
  useEffect(() => {
    if (!planProgress) return;

    const currentPeak = levelPeakPortfolioRef.current;

    // Update peak when portfolio reaches new high
    if (portfolioValue > currentPeak) {
      levelPeakPortfolioRef.current = portfolioValue;
      tradesSincePeakRef.current = 0;
      hasShownSlowDownRef.current = false;
      return;
    }

    // Skip if this is initial load
    const isInitialLoad = initialPortfolioRef.current === portfolioValue;

    // Count trades since peak
    if (portfolioValue < currentPeak && !isInitialLoad) {
      tradesSincePeakRef.current = trades.length;

      // Show "slow down" toast after 3-5 trades when portfolio is below peak
      if (
        tradesSincePeakRef.current >= 3 &&
        tradesSincePeakRef.current <= 5 &&
        !hasShownSlowDownRef.current
      ) {
        toast({
          title: "Take your time",
          description: "Slow down and reassess your strategy. You've got this!",
          variant: "default",
        });
        hasShownSlowDownRef.current = true;
      }
    }
  }, [portfolioValue, trades.length, planProgress, toast]);

  // Get consecutive wins from end of array
  const getConsecutiveWins = (tradeArray: Array<{ outcome: "win" | "loss" }>): number => {
    let count = 0;
    for (let i = tradeArray.length - 1; i >= 0; i--) {
      if (tradeArray[i].outcome === "win") {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  // Trigger confetti celebration
  const triggerCelebration = (level: number) => {
    const isMilestone = isMilestoneLevel(level);

    if (isMilestone) {
      // Extra special celebration for milestones
      const duration = 3000;
      const end = Date.now() + duration;

      const milestoneCelebration = () => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#00FF7F", "#FFD700", "#FF6B6B"],
        });

        if (Date.now() < end) {
          const timeoutId = setTimeout(milestoneCelebration, 200);
          celebrationTimeoutsRef.current.push(timeoutId);
        }
      };
      milestoneCelebration();
    } else {
      // Standard celebration
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#00FF7F"],
      });
    }

    // Update last celebrated level
    if (planProgress) {
      const updated = { ...planProgress, lastCelebratedLevel: level };
      setPlanProgress(updated);
      saveProgressToStorage(updated);
    }
  };

  // Handle plan change
  const handlePlanChange = (planId: string) => {
    if (planId === "upload") {
      fileInputRef.current?.click();
      return;
    }
    setSelectedPlanId(planId);
    if (planProgress) {
      const updated = { ...planProgress, planId: planId };
      setPlanProgress(updated);
      saveProgressToStorage(updated);
    }
  };

  // Handle manual level override
  const handleManualLevelSet = () => {
    const newLevel = parseInt(manualLevelInput, 10);
    if (
      !currentPlan ||
      isNaN(newLevel) ||
      newLevel < 1 ||
      newLevel > currentPlan.levels.length
    ) {
      return;
    }

    const completedLevels = Array.from({ length: newLevel - 1 }, (_, i) => i + 1);
    const updated = {
      ...planProgress!,
      currentLevel: newLevel,
      completedLevels,
    };
    setPlanProgress(updated);
    saveProgressToStorage(updated);
    setManualLevelInput("");
    setIsEditingLevel(false);
  };

  // Handle custom plan upload
  const handleCustomPlanUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const levels = parsePlanCSV(text);
      const newPlan: CompoundPlan = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        description: "Custom uploaded plan",
        levels,
      };

      setCustomPlans((prev) => [...prev, newPlan]);
      handlePlanChange(newPlan.id);
    } catch (error) {
      console.error("Error parsing custom plan:", error);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Calculate progress to next level
  const currentLevelData = currentPlan?.levels.find(
    (l) => l.level === planProgress?.currentLevel
  );
  const progressPercentage =
    currentLevelData && portfolioValue > 0
      ? ((portfolioValue - currentLevelData.startAmount) /
          (currentLevelData.targetAmount - currentLevelData.startAmount)) *
        100
      : 0;

  if (!currentPlan || !planProgress) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Compound Plan</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Compound Plan</CardTitle>
            <CardDescription>Track your wealth-building progress</CardDescription>
          </div>
          {isHot && (
            <Badge className="bg-orange-500 hover:bg-orange-600">
              <Flame className="mr-1 h-3 w-3" /> YOU'RE ON FIRE!
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Plan display */}
        <div className="mb-4">
          <Label>Current Plan</Label>
          <div className="text-sm font-medium">
            {currentPlan?.name} - {currentPlan?.description}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCustomPlanUpload}
            className="hidden"
          />
        </div>

        {/* Current Level Display */}
        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-muted-foreground">Current Level</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {isEditingLevel ? (
                  <>
                    <Input
                      type="number"
                      min="1"
                      max={currentPlan.levels.length}
                      value={manualLevelInput}
                      onChange={(e) => setManualLevelInput(e.target.value)}
                      className="w-20 h-8"
                      onKeyDown={(e) => e.key === "Enter" && handleManualLevelSet()}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={handleManualLevelSet}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => {
                        setIsEditingLevel(false);
                        setManualLevelInput("");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    Level {planProgress.currentLevel} of {currentPlan.levels.length}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5"
                      onClick={() => {
                        setIsEditingLevel(true);
                        setManualLevelInput(String(planProgress.currentLevel));
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            {isHot && (
              <div className="text-orange-500">
                <Flame className="h-8 w-8" />
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {currentLevelData && (
            <>
              <Progress value={Math.min(100, Math.max(0, progressPercentage))} className="mb-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatCurrency(portfolioValue)}</span>
                <span>Target: {formatCurrency(currentLevelData.targetAmount)}</span>
              </div>
              <div className="text-sm mt-2">
                Need{" "}
                <span className="font-bold text-primary">
                  {formatCurrency(Math.max(0, currentLevelData.targetAmount - portfolioValue))}
                </span>{" "}
                more to reach level {planProgress.currentLevel + 1}
              </div>
            </>
          )}
        </div>

        {/* Level List */}
        <div className="text-sm font-medium mb-2">Level Progress</div>
        <ScrollArea className="h-48 rounded-md border">
          <div className="p-2">
            {currentPlan.levels.map((level) => {
              const isCompleted = planProgress.completedLevels.includes(level.level);
              const isCurrent = level.level === planProgress.currentLevel;
              const isMilestone = isMilestoneLevel(level.level);

              return (
                <div
                  key={level.level}
                  className={`flex items-center justify-between p-2 rounded mb-1 ${
                    isCurrent ? "bg-primary/20" : isCompleted ? "bg-muted/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Checkbox checked={isCompleted} disabled={true} />
                    <span className={`text-sm ${isMilestone ? "font-bold text-yellow-400" : ""}`}>
                      {isMilestone && <Star className="inline h-3 w-3 mr-1" />}
                      Level {level.level}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatCurrency(level.startAmount)} → {formatCurrency(level.targetAmount)}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-sm">
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Completed</div>
            <div className="font-bold text-lg">{planProgress.completedLevels.length}</div>
          </div>
          <div className="p-2 bg-muted/30 rounded">
            <div className="text-muted-foreground">Remaining</div>
            <div className="font-bold text-lg">
              {currentPlan.levels.length - planProgress.completedLevels.length}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
