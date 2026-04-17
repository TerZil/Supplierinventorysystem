import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Tag, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  supplierId: string;
  name: string;
  price: number;
  unit: string;
  priceUpdatedAt?: string | null;
}

interface UpdatePriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  apiUrl: string;
  apiKey: string;
  onSuccess: (updatedProduct: Product) => void;
}

export function UpdatePriceDialog({
  open, onOpenChange, product, apiUrl, apiKey, onSuccess,
}: UpdatePriceDialogProps) {
  const [newPrice, setNewPrice] = useState(String(product.price));
  const [saving, setSaving] = useState(false);

  const oldPrice = product.price;
  const parsedNew = parseFloat(newPrice);
  const diff = isNaN(parsedNew) ? null : parsedNew - oldPrice;
  const pctChange = (diff !== null && oldPrice > 0) ? (diff / oldPrice) * 100 : null;

  function step(delta: number) {
    const current = parseFloat(newPrice) || 0;
    const next = Math.max(0, parseFloat((current + delta).toFixed(2)));
    setNewPrice(String(next));
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(parsedNew) || parsedNew < 0) {
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[360px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Invalid Price</p>
            <p className="text-sm text-red-700 mt-0.5">Please enter a valid price (₱0 or more).</p>
          </div>
        </div>
      ));
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const res = await fetch(`${apiUrl}/products/${product.supplierId}/${product.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ price: parsedNew, priceUpdatedAt: now }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update price");
      }

      const data = await res.json();
      onSuccess(data.product);
      onOpenChange(false);

      toast.custom(() => (
        <div className="flex items-start gap-3 bg-green-800 text-white px-4 py-3 rounded-xl shadow-lg w-[360px] border border-green-700">
          <CheckCircle2 className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Price Updated!</p>
            <p className="text-sm text-green-100 mt-0.5">
              <span className="font-semibold text-white">{product.name}</span> is now ₱{parsedNew.toFixed(2)}/{product.unit}.
            </p>
          </div>
        </div>
      ));
    } catch (err) {
      console.error("Error updating price:", err);
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[360px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Update Failed</p>
            <p className="text-sm text-red-700 mt-0.5">Something went wrong. Please try again.</p>
          </div>
        </div>
      ));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">

        {/* ── Colored header ── */}
        <div className="bg-green-900 px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-xl font-bold">
              <div className="bg-amber-400/20 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-400" />
              </div>
              Update Price
            </DialogTitle>
            <DialogDescription className="text-green-200 mt-1 text-base">
              Setting a new price for{" "}
              <span className="font-bold text-white">{product.name}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-5">

          {/* ── Current price ── */}
          <div className="flex items-center gap-4 bg-stone-50 border-2 border-stone-200 rounded-xl px-5 py-4">
            <div className="bg-amber-100 border border-amber-200 p-2.5 rounded-lg shrink-0">
              <Tag className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Current price</p>
              <p className="text-2xl font-bold text-green-900 leading-tight">
                ₱{oldPrice.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                <span className="font-normal text-sm text-muted-foreground ml-2">/ {product.unit}</span>
              </p>
            </div>
          </div>

          {/* ── New price input with steppers ── */}
          <div className="space-y-2">
            <label className="text-base font-bold text-gray-900">New Price</label>
            <div className="flex items-stretch gap-0 border-2 border-amber-400 rounded-xl overflow-hidden focus-within:border-green-800 transition-colors">
              {/* Decrease */}
              <button
                type="button"
                onClick={() => step(-1)}
                className="flex items-center justify-center w-14 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border-r-2 border-amber-400 transition-colors shrink-0"
              >
                <Minus className="h-5 w-5 text-gray-700" />
              </button>

              {/* Input */}
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900 font-bold text-xl pointer-events-none">₱</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8 h-14 text-2xl font-bold text-green-900 border-0 rounded-none bg-white focus-visible:ring-0 focus-visible:ring-offset-0 text-center"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* Increase */}
              <button
                type="button"
                onClick={() => step(1)}
                className="flex items-center justify-center w-14 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border-l-2 border-amber-400 transition-colors shrink-0"
              >
                <Plus className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Use <strong>−</strong> / <strong>+</strong> or type the price directly
            </p>
          </div>

          {/* ── Change preview ── */}
          {diff !== null && !isNaN(diff) && parsedNew !== oldPrice ? (
            <div className={`flex items-center gap-3 rounded-xl px-5 py-4 border-2 ${
              diff > 0
                ? "bg-red-50 border-red-300 text-red-800"
                : "bg-emerald-50 border-emerald-300 text-emerald-800"
            }`}>
              <div className={`p-2 rounded-lg ${diff > 0 ? "bg-red-100" : "bg-emerald-100"}`}>
                {diff > 0
                  ? <TrendingUp className="h-5 w-5 text-red-600" />
                  : <TrendingDown className="h-5 w-5 text-emerald-600" />
                }
              </div>
              <div>
                <p className="font-bold text-base">
                  {diff > 0 ? "Price increase" : "Price decrease"} of{" "}
                  {diff > 0 ? "+" : ""}₱{Math.abs(diff).toFixed(2)}
                </p>
                {pctChange !== null && (
                  <p className="text-sm opacity-80">
                    {Math.abs(pctChange).toFixed(1)}% {diff > 0 ? "more" : "less"} than current price
                  </p>
                )}
              </div>
            </div>
          ) : diff === 0 ? (
            <div className="flex items-center gap-3 bg-stone-50 border-2 border-stone-200 text-stone-600 rounded-xl px-5 py-3">
              <Minus className="h-4 w-4" />
              <span className="text-sm font-semibold">Same as current price — no change</span>
            </div>
          ) : null}

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="flex-1 h-13 text-base border-2 font-bold"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="lg"
              className="flex-1 h-13 text-base bg-green-900 hover:bg-green-800 text-white font-bold shadow-sm"
              disabled={saving || isNaN(parsedNew) || parsedNew < 0 || parsedNew === oldPrice}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : "Save New Price"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
