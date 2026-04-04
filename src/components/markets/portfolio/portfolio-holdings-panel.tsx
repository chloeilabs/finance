"use client"

import { Pencil, Plus, Search, Trash2, Wallet, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { SymbolSearch } from "@/components/markets/search/symbol-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { readApiErrorMessage } from "@/lib/market-api"
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/markets-format"
import type {
  PortfolioHoldingView,
  PortfolioRecord,
} from "@/lib/shared/markets/portfolio"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"
import { cn } from "@/lib/utils"

interface FormState {
  symbol: string
  shares: string
  averageCost: string
  targetWeight: string
  notes: string
}

function createEmptyFormState(): FormState {
  return {
    symbol: "",
    shares: "",
    averageCost: "",
    targetWeight: "",
    notes: "",
  }
}

function toFormState(holding: PortfolioHoldingView): FormState {
  return {
    symbol: holding.symbol,
    shares: String(holding.shares),
    averageCost: String(holding.averageCost),
    targetWeight:
      holding.targetWeight !== null ? String(holding.targetWeight * 100) : "",
    notes: holding.notes ?? "",
  }
}

function ToolbarMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="border border-border/50 px-2.5 py-2">
      <div className="font-departureMono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </div>
      <div className="mt-1 text-sm tracking-tight">{value}</div>
    </div>
  )
}

function getValueToneClass(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) {
    return "text-foreground"
  }

  return value > 0
    ? "text-[color:var(--vesper-teal)]"
    : "text-[color:var(--vesper-orange)]"
}

function getTickerPriceChangeValue(holding: PortfolioHoldingView) {
  if (holding.dayChangeValue === null || holding.shares === 0) {
    return null
  }

  return holding.dayChangeValue / holding.shares
}

function HoldingSheetForm({
  duplicateHolding,
  formState,
  isHoldingPending,
  isEditing,
  onCancel,
  onSave,
  setFormState,
}: {
  duplicateHolding: boolean
  formState: FormState
  isHoldingPending: boolean
  isEditing: boolean
  onCancel: () => void
  onSave: () => void
  setFormState: React.Dispatch<React.SetStateAction<FormState>>
}) {
  return (
    <>
      <SheetHeader className="border-b border-border/50 pb-4">
        <div className="font-departureMono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          {isEditing ? "Edit Position" : "Add Position"}
        </div>
        <SheetTitle className="text-xl tracking-tight">
          {isEditing ? "Update holding" : "Add a new holding"}
        </SheetTitle>
        <SheetDescription>
          Keep the table clean and open positions only when you need to edit them.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          <div className="font-departureMono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            Lookup
          </div>
          <SymbolSearch
            className="max-w-none"
            inputClassName="h-10 rounded-none border-border/60 bg-muted/20"
            onSelectResult={(result) => {
              setFormState((current) => ({
                ...current,
                symbol: result.symbol,
              }))
            }}
            placeholder="Search and select a symbol"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1.5 text-sm" htmlFor="portfolio-symbol">
            <span className="text-muted-foreground">Symbol</span>
            <Input
              className="rounded-none border-border/60 bg-muted/20"
              id="portfolio-symbol"
              value={formState.symbol}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  symbol: event.target.value.toUpperCase(),
                }))
              }}
              placeholder="AAPL"
            />
          </label>
          <label className="space-y-1.5 text-sm" htmlFor="portfolio-shares">
            <span className="text-muted-foreground">Shares</span>
            <Input
              className="rounded-none border-border/60 bg-muted/20"
              id="portfolio-shares"
              inputMode="decimal"
              min="0"
              step="0.0001"
              type="number"
              value={formState.shares}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  shares: event.target.value,
                }))
              }}
            />
          </label>
          <label
            className="space-y-1.5 text-sm"
            htmlFor="portfolio-average-cost"
          >
            <span className="text-muted-foreground">Average cost</span>
            <Input
              className="rounded-none border-border/60 bg-muted/20"
              id="portfolio-average-cost"
              inputMode="decimal"
              min="0"
              step="0.01"
              type="number"
              value={formState.averageCost}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  averageCost: event.target.value,
                }))
              }}
            />
          </label>
          <label
            className="space-y-1.5 text-sm"
            htmlFor="portfolio-target-weight"
          >
            <span className="text-muted-foreground">Target weight %</span>
            <Input
              className="rounded-none border-border/60 bg-muted/20"
              id="portfolio-target-weight"
              inputMode="decimal"
              min="0"
              step="0.1"
              type="number"
              value={formState.targetWeight}
              onChange={(event) => {
                setFormState((current) => ({
                  ...current,
                  targetWeight: event.target.value,
                }))
              }}
              placeholder="Optional"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-sm" htmlFor="portfolio-notes">
          <span className="text-muted-foreground">Notes</span>
          <Textarea
            className="min-h-28 rounded-none border-border/60 bg-muted/20"
            id="portfolio-notes"
            value={formState.notes}
            onChange={(event) => {
              setFormState((current) => ({
                ...current,
                notes: event.target.value,
              }))
            }}
            placeholder="Optional thesis, sizing note, or execution context"
          />
        </label>

        {duplicateHolding ? (
          <div className="border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">
            Portfolio already includes this symbol.
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 border-t border-border/50 px-4 py-4">
        <Button disabled={isHoldingPending} onClick={onSave}>
          <Plus className="size-3.5" />
          {isEditing ? "Save holding" : "Add holding"}
        </Button>
        <Button disabled={isHoldingPending} variant="outline" onClick={onCancel}>
          <X className="size-3.5" />
          Cancel
        </Button>
      </div>
    </>
  )
}

function CashSheetForm({
  cashDraft,
  isCashPending,
  onSave,
  setCashDraft,
}: {
  cashDraft: string
  isCashPending: boolean
  onSave: () => void
  setCashDraft: React.Dispatch<React.SetStateAction<string>>
}) {
  return (
    <>
      <SheetHeader className="border-b border-border/50 pb-4">
        <div className="font-departureMono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
          Cash
        </div>
        <SheetTitle className="text-xl tracking-tight">Update cash balance</SheetTitle>
        <SheetDescription>
          Cash stays separate from invested exposure and rolls into total portfolio value.
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <label className="block space-y-1.5 text-sm" htmlFor="portfolio-cash">
          <span className="text-muted-foreground">USD cash</span>
          <Input
            className="rounded-none border-border/60 bg-muted/20"
            id="portfolio-cash"
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
            value={cashDraft}
            onChange={(event) => {
              setCashDraft(event.target.value)
            }}
          />
        </label>
      </div>

      <div className="flex items-center gap-2 border-t border-border/50 px-4 py-4">
        <Button disabled={isCashPending} onClick={onSave}>
          <Wallet className="size-3.5" />
          Save cash
        </Button>
      </div>
    </>
  )
}

export function PortfolioHoldingsPanel({
  holdings,
  portfolio,
}: {
  holdings: PortfolioHoldingView[]
  portfolio: PortfolioRecord
}) {
  const router = useRouter()
  const [cashDraft, setCashDraft] = useState(String(portfolio.cashBalance))
  const [editingHoldingId, setEditingHoldingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<FormState>(createEmptyFormState)
  const [activeSheet, setActiveSheet] = useState<"cash" | "holding" | null>(null)
  const [isCashPending, startCashTransition] = useTransition()
  const [isHoldingPending, startHoldingTransition] = useTransition()

  const normalizedFormSymbol = useMemo(
    () => formState.symbol.trim().toUpperCase(),
    [formState.symbol]
  )

  const duplicateHolding = useMemo(
    () =>
      holdings.some(
        (holding) =>
          holding.symbol === normalizedFormSymbol && holding.id !== editingHoldingId
      ),
    [editingHoldingId, holdings, normalizedFormSymbol]
  )

  const investedValue = useMemo(
    () => holdings.reduce((total, holding) => total + holding.marketValue, 0),
    [holdings]
  )

  const totalCostBasis = useMemo(
    () => holdings.reduce((total, holding) => total + holding.costBasis, 0),
    [holdings]
  )

  const closeSheets = () => {
    setActiveSheet(null)
    setEditingHoldingId(null)
    setFormState(createEmptyFormState())
    setCashDraft(String(portfolio.cashBalance))
  }

  const openHoldingCreate = () => {
    setEditingHoldingId(null)
    setFormState(createEmptyFormState())
    setActiveSheet("holding")
  }

  const openHoldingEdit = (holding: PortfolioHoldingView) => {
    setEditingHoldingId(holding.id)
    setFormState(toFormState(holding))
    setActiveSheet("holding")
  }

  const openCashSheet = () => {
    setCashDraft(String(portfolio.cashBalance))
    setActiveSheet("cash")
  }

  const handleCashSave = () => {
    startCashTransition(async () => {
      const nextCashBalance = Number(cashDraft)

      if (!Number.isFinite(nextCashBalance) || nextCashBalance < 0) {
        toast.error("Cash balance must be a non-negative number.")
        return
      }

      try {
        const response = await fetch("/api/portfolio", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            cashBalance: nextCashBalance,
          }),
        })

        if (!response.ok) {
          toast.error(
            await readApiErrorMessage(response, "Failed to update cash balance.")
          )
          return
        }

        toast.success("Cash balance updated.")
        closeSheets()
        router.refresh()
      } catch {
        toast.error("Failed to update cash balance.")
      }
    })
  }

  const handleHoldingSave = () => {
    if (normalizedFormSymbol.length === 0) {
      toast.error("Select a symbol first.")
      return
    }

    if (duplicateHolding) {
      toast.error("Portfolio already includes this symbol.")
      return
    }

    const shares = Number(formState.shares)
    const averageCost = Number(formState.averageCost)
    const targetWeight =
      formState.targetWeight.trim() === ""
        ? null
        : Number(formState.targetWeight)

    if (!Number.isFinite(shares) || shares <= 0) {
      toast.error("Shares must be greater than zero.")
      return
    }

    if (!Number.isFinite(averageCost) || averageCost < 0) {
      toast.error("Average cost must be zero or greater.")
      return
    }

    if (
      targetWeight !== null &&
      (!Number.isFinite(targetWeight) || targetWeight < 0 || targetWeight > 100)
    ) {
      toast.error("Target weight must be between 0 and 100.")
      return
    }

    startHoldingTransition(async () => {
      try {
        const response = await fetch(
          editingHoldingId
            ? `/api/portfolio/holdings/${editingHoldingId}`
            : "/api/portfolio/holdings",
          {
            method: editingHoldingId ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              symbol: normalizedFormSymbol,
              shares,
              averageCost,
              targetWeight,
              notes: formState.notes.trim() === "" ? null : formState.notes.trim(),
            }),
          }
        )

        if (!response.ok) {
          toast.error(
            await readApiErrorMessage(
              response,
              editingHoldingId
                ? "Failed to update holding."
                : "Failed to create holding."
            )
          )
          return
        }

        toast.success(editingHoldingId ? "Holding updated." : "Holding added.")
        closeSheets()
        router.refresh()
      } catch {
        toast.error(
          editingHoldingId ? "Failed to update holding." : "Failed to add holding."
        )
      }
    })
  }

  const handleDelete = (holdingId: string) => {
    startHoldingTransition(async () => {
      try {
        const response = await fetch(`/api/portfolio/holdings/${holdingId}`, {
          method: "DELETE",
        })

        if (!response.ok) {
          toast.error(
            await readApiErrorMessage(response, "Failed to delete holding.")
          )
          return
        }

        if (editingHoldingId === holdingId) {
          closeSheets()
        }

        toast.success("Holding deleted.")
        router.refresh()
      } catch {
        toast.error("Failed to delete holding.")
      }
    })
  }

  return (
    <>
      <div className="market-soft-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border/40 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <ToolbarMetric
              label="Positions"
              value={String(holdings.length)}
            />
            <ToolbarMetric
              label="Invested"
              value={formatCurrency(investedValue, { currency: "USD" })}
            />
            <ToolbarMetric
              label="Cost Basis"
              value={formatCurrency(totalCostBasis, { currency: "USD" })}
            />
            <ToolbarMetric
              label="Cash"
              value={formatCurrency(portfolio.cashBalance, {
                currency: "USD",
                compact: true,
              })}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <Button variant="outline" onClick={openCashSheet}>
              <Wallet className="size-3.5" />
              Cash {formatCurrency(portfolio.cashBalance, { currency: "USD" })}
            </Button>
            <Button onClick={openHoldingCreate}>
              <Plus className="size-3.5" />
              Add position
            </Button>
          </div>
        </div>

        {holdings.length === 0 ? (
          <div className="px-4 py-8">
            <div className="space-y-3">
              <div>
                <div className="text-base tracking-tight">No positions yet</div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Start with a stock or ETF position, then use the table as the
                  primary workspace.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={openHoldingCreate}>
                  <Plus className="size-3.5" />
                  Add first position
                </Button>
                <Button variant="outline" onClick={openCashSheet}>
                  <Wallet className="size-3.5" />
                  Set cash balance
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="market-table-frame">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-background/80 text-left">
                  <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Shares
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Avg Cost
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Last Price
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Price Change
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Market Value
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Day P/L
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Total P/L
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Weight
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Dividend
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding) => (
                  <tr
                    key={holding.id}
                    className="border-b border-border/35 transition-colors hover:bg-muted/12 last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div className="min-w-[190px]">
                        <Link
                          className="font-departureMono text-sm tracking-tight hover:underline"
                          href={getTickerHref(holding.symbol, holding.instrumentKind)}
                        >
                          {holding.symbol}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {holding.name ?? "Tracked asset"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatNumber(holding.shares, {
                        digits: 4,
                        minimumDigits: 0,
                      })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(holding.averageCost, { currency: "USD" })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(holding.price ?? holding.averageCost, {
                        currency: holding.currency ?? "USD",
                      })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div
                        className={cn(
                          "whitespace-nowrap",
                          getValueToneClass(getTickerPriceChangeValue(holding))
                        )}
                      >
                        {formatCurrency(getTickerPriceChangeValue(holding), {
                          currency: holding.currency ?? "USD",
                        })}
                      </div>
                      <div
                        className={cn(
                          "text-xs whitespace-nowrap",
                          getValueToneClass(getTickerPriceChangeValue(holding))
                        )}
                      >
                        {formatPercent(holding.dayChangePercent)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(holding.marketValue, { currency: "USD" })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div
                        className={cn(
                          "whitespace-nowrap",
                          getValueToneClass(holding.dayChangeValue)
                        )}
                      >
                        {formatCurrency(holding.dayChangeValue, { currency: "USD" })}
                      </div>
                      <div
                        className={cn(
                          "text-xs whitespace-nowrap",
                          getValueToneClass(holding.dayChangeValue)
                        )}
                      >
                        {formatPercent(holding.dayChangePercent)}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div
                        className={cn(
                          "whitespace-nowrap",
                          getValueToneClass(holding.unrealizedGainLoss)
                        )}
                      >
                        {formatCurrency(holding.unrealizedGainLoss, {
                          currency: "USD",
                        })}
                      </div>
                      <div
                        className={cn(
                          "text-xs whitespace-nowrap",
                          getValueToneClass(holding.unrealizedGainLoss)
                        )}
                      >
                        {formatPercent(holding.unrealizedGainLossPercent, {
                          scale: "fraction",
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatPercent(holding.weight, { scale: "fraction" })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatPercent(holding.dividendYieldTtm, { scale: "fraction" })}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          disabled={isHoldingPending}
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => {
                            openHoldingEdit(holding)
                          }}
                        >
                          <Pencil className="size-3.5" />
                          <span className="sr-only">Edit holding</span>
                        </Button>
                        <Button
                          disabled={isHoldingPending}
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => {
                            handleDelete(holding.id)
                          }}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete holding</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Sheet
        open={activeSheet !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeSheets()
          }
        }}
      >
        <SheetContent className="w-full border-border/60 bg-background sm:max-w-lg">
          {activeSheet === "holding" ? (
            <HoldingSheetForm
              duplicateHolding={duplicateHolding}
              formState={formState}
              isEditing={editingHoldingId !== null}
              isHoldingPending={isHoldingPending}
              onCancel={closeSheets}
              onSave={handleHoldingSave}
              setFormState={setFormState}
            />
          ) : activeSheet === "cash" ? (
            <CashSheetForm
              cashDraft={cashDraft}
              isCashPending={isCashPending}
              onSave={handleCashSave}
              setCashDraft={setCashDraft}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              <Search className="mr-2 size-4" />
              Choose an action to continue.
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
