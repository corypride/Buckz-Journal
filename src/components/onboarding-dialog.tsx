"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export interface OnboardingValues {
  initialPortfolio: number;
  sessionGoal: number;
  targetWinRate: number;
  profitGoal: number;
  profitGoalType: "dollar" | "percent";
}

interface OnboardingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: OnboardingValues) => void;
  defaults?: OnboardingValues;
}

const DEFAULT_VALUES: OnboardingValues = {
  initialPortfolio: 300,
  sessionGoal: 15,
  targetWinRate: 60,
  profitGoal: 7,
  profitGoalType: "percent",
};

export function OnboardingDialog({
  open,
  onOpenChange,
  onSubmit,
  defaults,
}: OnboardingDialogProps) {
  const [initialPortfolio, setInitialPortfolio] = useState(
    defaults?.initialPortfolio ?? DEFAULT_VALUES.initialPortfolio
  );
  const [sessionGoal, setSessionGoal] = useState(
    defaults?.sessionGoal ?? DEFAULT_VALUES.sessionGoal
  );
  const [targetWinRate, setTargetWinRate] = useState(
    defaults?.targetWinRate ?? DEFAULT_VALUES.targetWinRate
  );
  const [profitGoal, setProfitGoal] = useState(
    defaults?.profitGoal ?? DEFAULT_VALUES.profitGoal
  );
  const [profitGoalType, setProfitGoalType] = useState<"dollar" | "percent">(
    defaults?.profitGoalType ?? DEFAULT_VALUES.profitGoalType
  );

  const handleSubmit = () => {
    onSubmit({
      initialPortfolio,
      sessionGoal,
      targetWinRate,
      profitGoal,
      profitGoalType,
    });
    onOpenChange(false);
  };

  const handleSkip = () => {
    onSubmit(DEFAULT_VALUES);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Trading Session</DialogTitle>
          <DialogDescription>
            Set your session parameters to track your progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Initial Portfolio */}
          <div className="space-y-2">
            <Label htmlFor="initialPortfolio">Initial Portfolio Amount ($)</Label>
            <Input
              id="initialPortfolio"
              type="number"
              min="1"
              value={initialPortfolio}
              onChange={(e) => setInitialPortfolio(parseFloat(e.target.value) || 0)}
              placeholder="300"
            />
          </div>

          {/* Trades Per Session */}
          <div className="space-y-2">
            <Label htmlFor="sessionGoal">Trades Per Session</Label>
            <Input
              id="sessionGoal"
              type="number"
              min="1"
              value={sessionGoal}
              onChange={(e) => setSessionGoal(parseInt(e.target.value) || 0)}
              placeholder="15"
            />
          </div>

          {/* Target Win Rate */}
          <div className="space-y-2">
            <Label htmlFor="targetWinRate">Target Win Rate (%)</Label>
            <div className="flex items-center gap-4">
              <Slider
                id="targetWinRate"
                min={1}
                max={100}
                step={1}
                value={[targetWinRate]}
                onValueChange={(value) => setTargetWinRate(value[0])}
                className="flex-1"
              />
              <Input
                type="number"
                min="1"
                max="100"
                value={targetWinRate}
                onChange={(e) => setTargetWinRate(parseFloat(e.target.value) || 0)}
                className="w-20"
              />
            </div>
          </div>

          {/* Target Profit */}
          <div className="space-y-2">
            <Label htmlFor="profitGoalType">Target Profit Goal</Label>
            <Select
              value={profitGoalType}
              onValueChange={(value: "dollar" | "percent") => setProfitGoalType(value)}
            >
              <SelectTrigger id="profitGoalType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percent">Percentage of Account (%)</SelectItem>
                <SelectItem value="dollar">Fixed Dollar Amount ($)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={profitGoal}
                onChange={(e) => setProfitGoal(parseFloat(e.target.value) || 0)}
                placeholder={profitGoalType === "percent" ? "7" : "100"}
              />
              <span className="text-sm text-muted-foreground">
                {profitGoalType === "percent" ? "%" : "$"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {profitGoalType === "percent"
                ? `Target: ${profitGoal}% of $${initialPortfolio} = $${(initialPortfolio * profitGoal / 100).toFixed(2)}`
                : `Target: $${profitGoal.toFixed(2)}`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleSkip}>
            Use Defaults
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Start Trading
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
