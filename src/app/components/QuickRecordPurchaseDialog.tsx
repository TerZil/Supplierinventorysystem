import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  ShoppingCart, CheckCircle2, AlertCircle, Minus, Plus,
  Building2, Package, CalendarDays, Clock,
} from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  supplierId: string;
  name: string;
  price: number;
  unit: string;
  supplierName: string;
  supplier: { id: string; name: string } | null;
}

interface QuickRecordPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  apiUrl: string;
  apiKey: string;
  onSuccess?: () => void;
}

export function QuickRecordPurchaseDialog({
  open, onOpenChange, product, apiUrl, apiKey, onSuccess,
}: QuickRecordPurchaseDialogProps) {
  const [quantity, setQuantity] = useState<string>("1");
  const [price, setPrice] = useState<string>(String(product.price));
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [hasPaymentDue, setHasPaymentDue] = useState(false);
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedQty = parseInt(quantity);
  const parsedPrice = parseFloat(price);
  const total = isNaN(parsedQty) || isNaN(parsedPrice) ? 0 : parsedQty * parsedPrice;

  const supplierName = product.supplier?.name ?? product.supplierName;

  function stepQty(delta: number) {
    const current = parseInt(quantity) || 0;
    const next = Math.max(1, current + delta);
    setQuantity(String(next));
  }

  function stepPrice(delta: number) {
    const current = parseFloat(price) || 0;
    const next = Math.max(0, parseFloat((current + delta).toFixed(2)));
    setPrice(String(next));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(parsedQty) || parsedQty < 1) {
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[360px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Invalid Quantity</p>
            <p className="text-sm text-red-700 mt-0.5">Quantity must be at least 1.</p>
          </div>
        </div>
      ));
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[360px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Invalid Price</p>
            <p className="text-sm text-red-700 mt-0.5">Please enter a valid price.</p>
          </div>
        </div>
      ));
      return;
    }

    if (hasPaymentDue && !paymentDueDate) {
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[360px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Missing Due Date</p>
            <p className="text-sm text-red-700 mt-0.5">Please set a payment due date or disable the payment term.</p>
          </div>
        </div>
      ));
      return;
    }

    setSaving(true);
    try {
      const supplierId = product.supplier?.id ?? product.supplierId;

      const res = await fetch(`${apiUrl}/purchases`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          supplierId,
          supplierName,
          items: [{
            productId: product.id,
            productName: product.name,
            quantity: parsedQty,
            price: parsedPrice,
          }],
          totalAmount: total,
          notes,
          purchaseDate: new Date(purchaseDate).toISOString(),
          ...(hasPaymentDue && paymentDueDate
            ? { paymentDueDate: new Date(paymentDueDate).toISOString(), paymentStatus: "unpaid" }
            : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record purchase");
      }

      setQuantity("1");
      setPrice(String(product.price));
      setPurchaseDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      setHasPaymentDue(false);
      setPaymentDueDate("");
      onOpenChange(false);
      if (onSuccess) onSuccess();

      toast.custom(() => (
        <div className="flex items-start gap-3 bg-green-800 text-white px-4 py-3 rounded-xl shadow-lg w-[360px] border border-green-700">
          <CheckCircle2 className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Purchase Recorded!</p>
            <p className="text-sm text-green-100 mt-0.5">
              {parsedQty}×{" "}
              <span className="font-semibold text-white">{product.name}</span> from{" "}
              <span className="font-semibold text-white">{supplierName}</span> — ₱{total.toFixed(2)} total.
            </p>
            {hasPaymentDue && paymentDueDate && (
              <p className="text-xs text-green-200 mt-1">
                Payment due: {new Date(paymentDueDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
        </div>
      ));
    } catch (err) {
      console.error("Error recording purchase:", err);
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[360px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Failed to Record</p>
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
      <DialogContent className="max-w-md p-0 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* ── Colored header ── */}
        <div className="bg-green-900 px-6 pt-6 pb-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-xl font-bold">
              <div className="bg-amber-400/20 p-2 rounded-lg">
                <ShoppingCart className="h-5 w-5 text-amber-400" />
              </div>
              Record Purchase
            </DialogTitle>
            <DialogDescription className="text-green-200 mt-1 text-base">
              Logging a purchase for this product
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* ── Product + supplier info card ── */}
          <div className="bg-stone-50 border-2 border-stone-200 rounded-xl px-4 py-3.5 space-y-2">
            <div className="flex items-center gap-2.5">
              <Package className="h-5 w-5 text-green-800 shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Product</p>
                <p className="font-bold text-gray-900 text-base leading-tight">{product.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <Building2 className="h-5 w-5 text-amber-700 shrink-0" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Supplier</p>
                <p className="font-bold text-gray-900 text-base leading-tight">{supplierName}</p>
              </div>
            </div>
          </div>

          {/* ── Purchase date ── */}
          <div className="space-y-2">
            <Label htmlFor="qr-date" className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-green-800" />
              Purchase Date
            </Label>
            <Input
              id="qr-date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="h-12 text-base border-2 border-stone-300 focus:border-green-800 rounded-xl"
              required
            />
          </div>

          {/* ── Quantity stepper ── */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-gray-900">Quantity</Label>
            <div className="flex items-stretch gap-0 border-2 border-stone-300 rounded-xl overflow-hidden focus-within:border-green-800 transition-colors">
              <button
                type="button"
                onClick={() => stepQty(-1)}
                className="flex items-center justify-center w-16 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border-r-2 border-stone-300 transition-colors shrink-0"
              >
                <Minus className="h-6 w-6 text-gray-700" />
              </button>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1 h-14 text-2xl font-bold text-center border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
                required
              />
              <button
                type="button"
                onClick={() => stepQty(1)}
                className="flex items-center justify-center w-16 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border-l-2 border-stone-300 transition-colors shrink-0"
              >
                <Plus className="h-6 w-6 text-gray-700" />
              </button>
            </div>
          </div>

          {/* ── Unit price stepper ── */}
          <div className="space-y-2">
            <Label className="text-base font-bold text-gray-900">Unit Price (₱)</Label>
            <div className="flex items-stretch gap-0 border-2 border-stone-300 rounded-xl overflow-hidden focus-within:border-green-800 transition-colors">
              <button
                type="button"
                onClick={() => stepPrice(-1)}
                className="flex items-center justify-center w-16 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border-r-2 border-stone-300 transition-colors shrink-0"
              >
                <Minus className="h-6 w-6 text-gray-700" />
              </button>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-900 font-bold text-xl pointer-events-none">₱</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-14 pl-8 text-2xl font-bold text-center border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white"
                  required
                />
              </div>
              <button
                type="button"
                onClick={() => stepPrice(1)}
                className="flex items-center justify-center w-16 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border-l-2 border-stone-300 transition-colors shrink-0"
              >
                <Plus className="h-6 w-6 text-gray-700" />
              </button>
            </div>
          </div>

          {/* ── Total ── */}
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-amber-800 uppercase tracking-wide">Total Amount</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {isNaN(parsedQty) ? "?" : parsedQty} × ₱{isNaN(parsedPrice) ? "?" : parsedPrice.toFixed(2)}
              </p>
            </div>
            <p className="text-3xl font-bold text-green-900">
              ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* ── Payment Term ── */}
          <div className="border-2 border-dashed border-stone-300 rounded-xl overflow-hidden">
            {/* Toggle row */}
            <button
              type="button"
              onClick={() => { setHasPaymentDue((v) => !v); setPaymentDueDate(""); }}
              className={`w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors ${
                hasPaymentDue ? "bg-orange-50 border-b-2 border-dashed border-orange-200" : "bg-stone-50 hover:bg-stone-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${hasPaymentDue ? "bg-orange-200" : "bg-stone-200"}`}>
                  <Clock className={`h-4 w-4 ${hasPaymentDue ? "text-orange-800" : "text-stone-600"}`} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${hasPaymentDue ? "text-orange-900" : "text-gray-700"}`}>
                    Payment Term / Due Date
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hasPaymentDue ? "Set when payment is due — you'll get a notice" : "Optional — tap to set a payment due date"}
                  </p>
                </div>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors relative ${hasPaymentDue ? "bg-orange-500" : "bg-stone-300"}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasPaymentDue ? "translate-x-5" : "translate-x-1"}`} />
              </div>
            </button>

            {/* Due date input */}
            {hasPaymentDue && (
              <div className="px-4 py-4 bg-orange-50 space-y-2">
                <Label htmlFor="qr-payment-due" className="text-sm font-bold text-orange-900 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Payment Due Date
                </Label>
                <Input
                  id="qr-payment-due"
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  min={purchaseDate}
                  className="h-12 text-base border-2 border-orange-300 focus:border-orange-600 rounded-xl bg-white"
                  required={hasPaymentDue}
                />
                {paymentDueDate && (
                  <p className="text-xs text-orange-700 font-medium">
                    A notice will appear when this date approaches and be cleared once marked as paid.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Notes ── */}
          <div className="space-y-2">
            <Label htmlFor="qr-notes" className="text-base font-bold text-gray-900">
              Notes{" "}
              <span className="text-muted-foreground font-normal text-sm">(optional)</span>
            </Label>
            <Textarea
              id="qr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. rush order, batch #42, delivery included…"
              rows={2}
              className="text-base border-2 border-stone-300 focus:border-green-800 rounded-xl resize-none"
            />
          </div>

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
              disabled={saving}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Confirm Purchase
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}