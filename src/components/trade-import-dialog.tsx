"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";

interface TradeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tradeCount: number;
  assets: string[];
  onConfirm: (isHistorical: boolean) => void;
}

export function TradeImportDialog({
  open,
  onOpenChange,
  tradeCount,
  assets,
  onConfirm,
}: TradeImportDialogProps) {
  const [selectedType, setSelectedType] = React.useState<"current" | "historical">("current");

  const handleConfirm = () => {
    onConfirm(selectedType === "historical");
    onOpenChange(false);
    setSelectedType("current");
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedType("current");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Trade Data</DialogTitle>
          <DialogDescription>
            Found {tradeCount} trade{tradeCount !== 1 ? "s" : ""} from {assets.length} asset{assets.length !== 1 ? "s" : ""}.
            How should this data be categorized?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Assets detected */}
          <div>
            <Label className="text-sm text-muted-foreground">Assets detected</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {assets.slice(0, 8).map((asset) => (
                <Badge key={asset} variant="secondary">
                  {asset}
                </Badge>
              ))}
              {assets.length > 8 && (
                <Badge variant="outline">+{assets.length - 8} more</Badge>
              )}
            </div>
          </div>

          {/* Data type selection */}
          <RadioGroup value={selectedType} onValueChange={(v) => setSelectedType(v as "current" | "historical")}>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="current" id="current" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="current" className="font-medium cursor-pointer">
                    Current Session Data
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    These trades affect your current portfolio value, win rate, and session goals.
                    Portfolio chain is calculated cumulatively.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="historical" id="historical" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="historical" className="font-medium cursor-pointer">
                    Historical Trade Data
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    These trades are for reference only. They won&apos;t affect your current session stats
                    but will show separately in Stock Performance.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm}>
            Import {tradeCount} Trade{tradeCount !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
