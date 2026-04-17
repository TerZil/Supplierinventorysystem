import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Building2, RotateCcw, Trash2, Mail, Phone, Package,
  Clock, AlertTriangle, Inbox,
} from "lucide-react";
import { toast } from "sonner";

interface DeletedSupplier {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  deletedAt: string;
  deletedProducts: any[];
}

interface RecentlyDeletedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiUrl: string;
  apiKey: string;
  onRestored: () => void; // callback to reload supplier list
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
  const deletedMs = new Date(iso).getTime();
  const expiresMs = deletedMs + 30 * 24 * 60 * 60 * 1000;
  const remaining = Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, remaining);
}

export function RecentlyDeletedDialog({
  open, onOpenChange, apiUrl, apiKey, onRestored,
}: RecentlyDeletedDialogProps) {
  const [deletedSuppliers, setDeletedSuppliers] = useState<DeletedSupplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/suppliers/deleted`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      setDeletedSuppliers(data.suppliers || []);
    } catch (err) {
      console.error("Error loading deleted suppliers:", err);
      toast.error("Failed to load recently deleted suppliers.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, apiKey]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleRestore = async (supplier: DeletedSupplier) => {
    setActionId(supplier.id);
    try {
      const res = await fetch(`${apiUrl}/suppliers/deleted/${supplier.id}/restore`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      setDeletedSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
      toast.success(
        `"${supplier.name}" restored successfully!`,
        {
          description: data.restoredProducts > 0
            ? `${data.restoredProducts} product${data.restoredProducts !== 1 ? "s" : ""} were also restored.`
            : "No products were associated.",
        }
      );
      onRestored();
    } catch (err) {
      console.error("Error restoring supplier:", err);
      toast.error(`Failed to restore "${supplier.name}".`);
    } finally {
      setActionId(null);
    }
  };

  const handlePermanentDelete = async (supplier: DeletedSupplier) => {
    if (!confirm(`Permanently delete "${supplier.name}"? This cannot be undone.`)) return;
    setActionId(supplier.id);
    try {
      const res = await fetch(`${apiUrl}/suppliers/deleted/${supplier.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) throw new Error("Permanent delete failed");
      setDeletedSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
      toast.success(`"${supplier.name}" permanently deleted.`);
    } catch (err) {
      console.error("Error permanently deleting supplier:", err);
      toast.error(`Failed to permanently delete "${supplier.name}".`);
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
            Recently Deleted Suppliers
          </DialogTitle>
          <DialogDescription>
            Suppliers deleted within the last 30 days. Restore them to recover all associated products.
          </DialogDescription>
        </DialogHeader>

        {/* Info banner */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Deleted suppliers are kept for <strong>30 days</strong> then automatically removed forever.
            Restoring a supplier also restores all its products.
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
          ) : deletedSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                <Inbox className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <p className="font-semibold text-green-800">No recently deleted suppliers</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Any supplier you delete will appear here for 30 days.
                </p>
              </div>
            </div>
          ) : (
            deletedSuppliers.map((supplier) => {
              const remaining = daysLeft(supplier.deletedAt);
              const isUrgent = remaining <= 3;
              const busy = actionId === supplier.id;

              return (
                <div
                  key={supplier.id}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isUrgent
                      ? "border-red-200 bg-red-50"
                      : "border-gray-200 bg-white hover:border-yellow-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left info */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`p-2.5 rounded-xl shrink-0 ${isUrgent ? "bg-red-100" : "bg-yellow-100"}`}>
                        <Building2 className={`h-5 w-5 ${isUrgent ? "text-red-600" : "text-yellow-600"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-gray-900 truncate">{supplier.name}</h4>
                          {isUrgent && (
                            <Badge variant="destructive" className="text-xs shrink-0">
                              Expires in {remaining}d
                            </Badge>
                          )}
                        </div>
                        {supplier.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{supplier.description}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          {supplier.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />{supplier.contactEmail}
                            </span>
                          )}
                          {supplier.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />{supplier.contactPhone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {(supplier.deletedProducts || []).length} product{(supplier.deletedProducts || []).length !== 1 ? "s" : ""}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Deleted {timeAgo(supplier.deletedAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold"
                        onClick={() => handleRestore(supplier)}
                        disabled={busy}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                        Restore
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={() => handlePermanentDelete(supplier)}
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
