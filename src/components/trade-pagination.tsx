"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TradePaginationProps {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  itemsPerPageOptions: readonly number[];
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export function TradePagination({
  currentPage,
  totalPages,
  itemsPerPage,
  itemsPerPageOptions,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: TradePaginationProps) {
  const [jumpInput, setJumpInput] = useState("");
  const [jumpError, setJumpError] = useState(false);

  const handleJumpToPage = () => {
    const page = parseInt(jumpInput, 10);
    if (isNaN(page) || page < 1 || page > totalPages) {
      setJumpError(true);
      setTimeout(() => setJumpError(false), 2000);
      return;
    }
    setJumpError(false);
    onPageChange(page);
    setJumpInput("");
  };

  const handleJumpKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJumpToPage();
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const pageNumbers = getPageNumbers();

  if (totalItems === 0) {
    return (
      <div className="flex items-center justify-between w-full">
        <div className="text-sm text-muted-foreground">No trades to display</div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={String(itemsPerPage)} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {itemsPerPageOptions.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full gap-4 flex-col sm:flex-row">
      {/* Left: Items per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rows per page:</span>
        <Select value={String(itemsPerPage)} onValueChange={(v) => onItemsPerPageChange(Number(v))}>
          <SelectTrigger className="w-[70px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {itemsPerPageOptions.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Center: Page information */}
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1}-{endIndex} of {totalItems} trades
      </div>

      {/* Right: Page controls */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page */}
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers */}
        <div className="hidden md:flex items-center gap-1">
          {pageNumbers.map((page, index) => {
            if (page === "...") {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-sm text-muted-foreground">
                  ...
                </span>
              );
            }
            return (
              <Button
                key={page}
                size="icon"
                variant={currentPage === page ? "default" : "outline"}
                className="h-8 w-8"
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            );
          })}
        </div>

        {/* Next page */}
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page */}
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>

        {/* Jump to page */}
        <div className="flex items-center gap-1 ml-2">
          <Input
            type="number"
            min="1"
            max={totalPages}
            placeholder="Go to"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            onKeyDown={handleJumpKeyDown}
            className={`w-16 h-8 text-center ${jumpError ? 'border-destructive' : ''}`}
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={handleJumpToPage}
            disabled={!jumpInput}
          >
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
