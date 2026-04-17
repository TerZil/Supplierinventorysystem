import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  ShoppingCart, RotateCcw, Trash2, Calendar, Package,
  Clock, AlertTriangle, Inbox, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface DeletedPurchase {
  id: string;
  supplierName: string;
  items: { productId: string; productName: string; quantity: number; price: number }[];
  totalAmount: number;
  notes: string;
  purchaseDate: string;
  deletedAt: string;
  paymentDueDate?: string;
  paymentStatus?: "paid" | "unpaid";
}

interface RecentlyDeletedPurchasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiUrl: string;
  apiKey: string;
  onRestored: () => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function daysLeft(iso: string) {
  const expiresMs = new Date(iso).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export function RecentlyDeletedPurchasesDialog({
  open, onOpenChange, apiUrl, apiKey, onRestored,
}: RecentlyDeletedPurchasesDialogProps) {
  const [deletedPurchases, setDeletedPurchases] = useState<DeletedPurchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/purchases/deleted`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      setDeletedPurchases(data.purchases || []);
    } catch (err) {
      console.error("Error loading deleted purchases:", err);
      toast.error("Failed to load recently deleted purchases.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, apiKey]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleRestore = async (purchase: DeletedPurchase) => {
    setActionId(purchase.id);
    try {
      const res = await fetch(`${apiUrl}/purchases/deleted/${purchase.id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      setDeletedPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
      toast.success(`Purchase from "${purchase.supplierName}" restored!`, {
        description: `${purchase.items.length} item${purchase.items.length !== 1 ? "s" : ""} • ₱${purchase.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`,
      });
      onRestored();
    } catch (err) {
      console.error("Error restoring purchase:", err);
      toast.error(`Failed to restore purchase from "${purchase.supplierName}".`);
    } finally {
      setActionId(null);
    }
  };

  const handlePermanentDelete = async (purchase: DeletedPurchase) => {
    if (!confirm(`Permanently delete this purchase from "${purchase.supplierName}"? This cannot be undone.`)) return;
    setActionId(purchase.id);
    try {
      const res = await fetch(`${apiUrl}/purchases/deleted/${purchase.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("Permanent delete failed");
      setDeletedPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
      toast.success("Purchase permanently deleted.");
    } catch (err) {
      console.error("Error permanently deleting purchase:", err);
      toast.error("Failed to permanently delete this purchase.");
    } finally {
      setActionId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="bg-red-100 p-2 rounded-lg">
              <RotateCcw className="h-5 w-5 text-red-600" />
            </div>
            Recently Deleted Purchases
          </DialogTitle>
          <DialogDescription>
            Purchase records deleted within the last 30 days. Restore them to bring them back to your history.
          </DialogDescription>
        </DialogHeader>

        {/* Info banner */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Deleted purchases are kept for <strong>30 days</strong> then automatically removed forever.
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <div className="text-center">
                <RotateCcw className="h-8 w-8 mx-auto mb-2 animate-spin opacity-40" />
                <p className="text-sm">Loading…</p>
              </div>
            </div>
          ) : deletedPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <Inbox className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-green-800">No recently deleted purchases</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Any purchase you delete will appear here for 30 days.
                </p>
              </div>
            </div>
          ) : (
            deletedPurchases.map((purchase) => {
              const remaining = daysLeft(purchase.deletedAt);
              const isUrgent = remaining <= 3;
              const busy = actionId === purchase.id;
              const isPaid = purchase.paymentStatus === "paid";

              return (
                <div
                  key={purchase.id}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isUrgent
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200 bg-white hover:border-yellow-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isUrgent ? "bg-red-100" : "bg-amber-100"}`}>
                        <ShoppingCart className={`h-5 w-5 ${isUrgent ? "text-red-600" : "text-amber-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 truncate">{purchase.supplierName}</h4>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              Expires in {remaining}d
                            </Badge>
                          )}
                          {isPaid && (
                            <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />Paid
                            </Badge>
                          )}
                          {purchase.paymentDueDate && !isPaid && (
                            <Badge className="bg-orange-100 text-orange-800 border border-orange-300 text-xs">
                              <Clock className="h-3 w-3 mr-1" />Unpaid
                            </Badge>
                          )}
                        </div>

                        {/* Summary line */}
                        <p className="text-sm font-semibold text-green-800 mt-1">
                          ₱{purchase.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                        </p>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Purchased: {formatDate(purchase.purchaseDate)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {purchase.items.length} item{purchase.items.length !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Deleted {timeAgo(purchase.deletedAt)}
                          </span>
                        </div>

                        {/* Items preview */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {purchase.items.slice(0, 3).map((item, i) => (
                            <span
                              key={i}
                              className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full"
                            >
                              {item.productName} ×{item.quantity}
                            </span>
                          ))}
                          {purchase.items.length > 3 && (
                            <span className="inline-block bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                              +{purchase.items.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={() => handleRestore(purchase)}
                        disabled={busy}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={() => handlePermanentDelete(purchase)}
                        disabled={busy}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
