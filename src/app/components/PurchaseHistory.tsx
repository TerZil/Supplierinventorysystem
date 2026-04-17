import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Calendar, Package, Edit, Trash2, Download, Star, FileText,
  FileSpreadsheet, ChevronDown, Clock, CheckCircle2, AlertTriangle,
  ArrowUpDown, CircleDollarSign, ListFilter, XCircle, CalendarCheck2, RotateCcw, Trash,
} from "lucide-react";
import { EditPurchaseDialog } from "./EditPurchaseDialog";
import { RecentlyDeletedPurchasesDialog } from "./RecentlyDeletedPurchasesDialog";
import { exportPurchaseHistoryPDF, exportPurchaseHistoryExcel } from "../../utils/exportPdf";
import { toast } from "sonner";

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  notes: string;
  purchaseDate: string;
  createdAt: string;
  paymentDueDate?: string;
  paymentStatus?: "paid" | "unpaid";
  paymentPaidAt?: string;
}

interface PurchaseHistoryProps {
  apiUrl: string;
  apiKey: string;
  supplierSearch: string;
}

type PaymentFilter = "all" | "unpaid" | "paid";
type SortKey =
  | "date_desc"
  | "date_asc"
  | "due_soonest"
  | "due_latest"
  | "amount_desc"
  | "amount_asc"
  | "supplier_az"
  | "supplier_za";

const SORT_LABELS: Record<SortKey, string> = {
  date_desc:    "Purchase Date (Newest)",
  date_asc:     "Purchase Date (Oldest)",
  due_soonest:  "Due Date (Soonest)",
  due_latest:   "Due Date (Latest)",
  amount_desc:  "Amount (High → Low)",
  amount_asc:   "Amount (Low → High)",
  supplier_az:  "Supplier (A → Z)",
  supplier_za:  "Supplier (Z → A)",
};

function getDaysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function applySorting(list: Purchase[], sort: SortKey): Purchase[] {
  return [...list].sort((a, b) => {
    switch (sort) {
      case "date_desc":
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      case "date_asc":
        return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      case "due_soonest": {
        const da = a.paymentDueDate ? getDaysUntil(a.paymentDueDate) : Infinity;
        const db = b.paymentDueDate ? getDaysUntil(b.paymentDueDate) : Infinity;
        return da - db;
      }
      case "due_latest": {
        const da = a.paymentDueDate ? getDaysUntil(a.paymentDueDate) : -Infinity;
        const db = b.paymentDueDate ? getDaysUntil(b.paymentDueDate) : -Infinity;
        return db - da;
      }
      case "amount_desc":
        return b.totalAmount - a.totalAmount;
      case "amount_asc":
        return a.totalAmount - b.totalAmount;
      case "supplier_az":
        return a.supplierName.localeCompare(b.supplierName);
      case "supplier_za":
        return b.supplierName.localeCompare(a.supplierName);
      default:
        return 0;
    }
  });
}

export function PurchaseHistory({ apiUrl, apiKey, supplierSearch }: PurchaseHistoryProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [markingPaid, setMarkingPaid] = useState<Set<string>>(new Set());
  const [markingUnpaid, setMarkingUnpaid] = useState<Set<string>>(new Set());
  const [showDeletedPurchases, setShowDeletedPurchases] = useState(false);

  // ── New: filter + sort state ──
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/purchases`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      setPurchases(data.purchases || []);
    } catch (error) {
      console.error("Error loading purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-PH", {
      year: "numeric", month: "short", day: "numeric",
    });

  const formatDateLong = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  const handleUpdatePurchase = async (updatedPurchase: Purchase) => {
    try {
      const response = await fetch(`${apiUrl}/purchases/${updatedPurchase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(updatedPurchase),
      });
      const data = await response.json();
      if (response.ok) {
        const updatedPurchases = purchases.map(p =>
          p.id === updatedPurchase.id ? data.purchase : p
        );
        setPurchases(updatedPurchases);
        setEditingPurchase(null);
      }
    } catch (error) {
      console.error("Error updating purchase:", error);
    }
  };

  const handleDeletePurchase = async (purchaseId: string, supplierName: string) => {
    if (!confirm("Are you sure you want to delete this purchase record?")) return;
    try {
      const response = await fetch(`${apiUrl}/purchases/${purchaseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        setPurchases(purchases.filter(p => p.id !== purchaseId));
        toast.success("Purchase deleted.", {
          description: "You can restore it from Recently Deleted within 30 days.",
          action: { label: "View Deleted", onClick: () => setShowDeletedPurchases(true) },
        });
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
      toast.error("Failed to delete purchase. Please try again.");
    }
  };

  const handleClearAll = async () => {
    try {
      setClearingAll(true);
      const toDelete = visiblePurchases;
      await Promise.all(
        toDelete.map((p) =>
          fetch(`${apiUrl}/purchases/${p.id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${apiKey}` },
          })
        )
      );
      const remainingIds = new Set(toDelete.map((p) => p.id));
      setPurchases((prev) => prev.filter((p) => !remainingIds.has(p.id)));
      setShowClearConfirm(false);
    } catch (error) {
      console.error("Error clearing purchases:", error);
    } finally {
      setClearingAll(false);
    }
  };

  const handleMarkAsPaid = async (purchase: Purchase) => {
    setMarkingPaid((prev) => new Set(prev).add(purchase.id));
    try {
      const paidAt = new Date().toISOString();
      const response = await fetch(`${apiUrl}/purchases/${purchase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ paymentStatus: "paid", paymentPaidAt: paidAt }),
      });
      const data = await response.json();
      if (response.ok) {
        setPurchases((prev) =>
          prev.map((p) => (p.id === purchase.id ? { ...p, ...data.purchase } : p))
        );
        toast.custom(() => (
          <div className="flex items-start gap-3 bg-green-800 text-white px-4 py-3 rounded-xl shadow-lg w-[360px] border border-green-700">
            <CheckCircle2 className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-base">Payment Cleared!</p>
              <p className="text-sm text-green-100 mt-0.5">
                <span className="font-semibold">{purchase.supplierName}</span> marked as paid on{" "}
                {new Date(paidAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}.
              </p>
            </div>
          </div>
        ));
      }
    } catch (error) {
      console.error("Error marking as paid:", error);
      toast.error("Failed to mark as paid. Please try again.");
    } finally {
      setMarkingPaid((prev) => { const s = new Set(prev); s.delete(purchase.id); return s; });
    }
  };

  const handleMarkAsUnpaid = async (purchase: Purchase) => {
    setMarkingUnpaid((prev) => new Set(prev).add(purchase.id));
    try {
      const response = await fetch(`${apiUrl}/purchases/${purchase.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ paymentStatus: "unpaid", paymentPaidAt: null }),
      });
      const data = await response.json();
      if (response.ok) {
        setPurchases((prev) =>
          prev.map((p) => (p.id === purchase.id ? { ...p, ...data.purchase } : p))
        );
        toast.custom(() => (
          <div className="flex items-start gap-3 bg-amber-700 text-white px-4 py-3 rounded-xl shadow-lg w-[360px] border border-amber-600">
            <AlertTriangle className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-base">Marked as Unpaid</p>
              <p className="text-sm text-amber-100 mt-0.5">
                Payment for <span className="font-semibold">{purchase.supplierName}</span> has been marked as unpaid.
              </p>
            </div>
          </div>
        ));
      }
    } catch (error) {
      console.error("Error marking as unpaid:", error);
      toast.error("Failed to update payment status. Please try again.");
    } finally {
      setMarkingUnpaid((prev) => { const s = new Set(prev); s.delete(purchase.id); return s; });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-base gap-3">
        <span className="h-5 w-5 border-2 border-green-700/30 border-t-green-700 rounded-full animate-spin" />
        Loading purchase history…
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No purchases recorded yet.
        </CardContent>
      </Card>
    );
  }

  // ── Pipeline: supplier search → payment filter → sort ──
  const afterSearch = supplierSearch.trim()
    ? purchases.filter((p) => {
        const q = supplierSearch.trim().toLowerCase();
        return (
          p.supplierName.toLowerCase().includes(q) ||
          p.items.some((item) => item.productName.toLowerCase().includes(q))
        );
      })
    : purchases;

  const afterPaymentFilter =
    paymentFilter === "unpaid"
      ? afterSearch.filter((p) => p.paymentDueDate && p.paymentStatus !== "paid")
      : paymentFilter === "paid"
      ? afterSearch.filter((p) => p.paymentStatus === "paid")
      : afterSearch;

  const visiblePurchases = applySorting(afterPaymentFilter, sortKey);

  // Counts for badges
  const unpaidCount  = afterSearch.filter((p) => p.paymentStatus !== "paid" && p.paymentDueDate).length;
  const paidCount    = afterSearch.filter((p) => p.paymentStatus === "paid").length;
  const overdueCount = afterSearch.filter(
    (p) => p.paymentDueDate && p.paymentStatus !== "paid" && getDaysUntil(p.paymentDueDate) < 0
  ).length;

  // Latest purchase id (only relevant when supplier filter is active)
  const latestPurchaseId =
    supplierSearch.trim() && visiblePurchases.length > 0
      ? [...visiblePurchases].sort(
          (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
        )[0].id
      : null;

  const exportTarget = visiblePurchases;

  return (
    <div className="space-y-5">

      {/* ── Top toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-2xl font-bold text-green-700">Purchase History</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            className="border-stone-200 text-gray-600 hover:bg-stone-50 gap-2 font-semibold"
            onClick={() => setShowDeletedPurchases(true)}
          >
            <RotateCcw className="h-4 w-4 text-red-500" />
            Recently Deleted
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-semibold border-yellow-400"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => exportPurchaseHistoryPDF(exportTarget)}
              >
                <FileText className="h-4 w-4 text-red-500" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer gap-2"
                onClick={() => exportPurchaseHistoryExcel(exportTarget)}
              >
                <FileSpreadsheet className="h-4 w-4 text-green-600" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Filter + Sort bar ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">

        {/* Payment Filter Tabs */}
        <div className="flex items-center bg-white border border-stone-200 rounded-xl p-1 shadow-sm gap-1">
          <button
            type="button"
            onClick={() => setPaymentFilter("all")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              paymentFilter === "all"
                ? "bg-green-900 text-white shadow"
                : "text-gray-600 hover:bg-stone-100"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            All
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
              paymentFilter === "all" ? "bg-white/20 text-white" : "bg-stone-100 text-gray-600"
            }`}>
              {afterSearch.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setPaymentFilter("unpaid")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              paymentFilter === "unpaid"
                ? "bg-orange-600 text-white shadow"
                : "text-gray-600 hover:bg-orange-50"
            }`}
          >
            <Clock className="h-4 w-4" />
            Unpaid
            {unpaidCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                paymentFilter === "unpaid"
                  ? "bg-white/25 text-white"
                  : overdueCount > 0
                  ? "bg-red-100 text-red-700"
                  : "bg-orange-100 text-orange-700"
              }`}>
                {unpaidCount}
              </span>
            )}
            {overdueCount > 0 && paymentFilter !== "unpaid" && (
              <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                {overdueCount} overdue
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPaymentFilter("paid")}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              paymentFilter === "paid"
                ? "bg-green-700 text-white shadow"
                : "text-gray-600 hover:bg-green-50"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Paid
            {paidCount > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                paymentFilter === "paid" ? "bg-white/20 text-white" : "bg-green-100 text-green-700"
              }`}>
                {paidCount}
              </span>
            )}
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="bg-white border-stone-200 text-gray-700 font-semibold hover:bg-stone-50 gap-2"
            >
              <ArrowUpDown className="h-4 w-4 text-green-700" />
              {SORT_LABELS[sortKey]}
              <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
              <DropdownMenuItem
                key={key}
                className={`cursor-pointer gap-2 ${sortKey === key ? "bg-green-50 text-green-800 font-semibold" : ""}`}
                onClick={() => setSortKey(key)}
              >
                {sortKey === key && <CheckCircle2 className="h-3.5 w-3.5 text-green-700 shrink-0" />}
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Unpaid summary banner (shown when filter = unpaid) ── */}
      {paymentFilter === "unpaid" && visiblePurchases.length > 0 && (() => {
        const totalUnpaid = visiblePurchases.reduce((s, p) => s + p.totalAmount, 0);
        const overdue = visiblePurchases.filter(p => p.paymentDueDate && getDaysUntil(p.paymentDueDate) < 0).length;
        return (
          <div className="flex flex-wrap items-center gap-4 bg-orange-50 border border-orange-200 rounded-xl px-5 py-3">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-semibold text-orange-900">
                Total Outstanding:{" "}
                <span className="text-lg font-bold text-orange-800">
                  ₱{totalUnpaid.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </span>
              </span>
            </div>
            {overdue > 0 && (
              <span className="flex items-center gap-1.5 bg-red-100 text-red-800 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200">
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdue} overdue
              </span>
            )}
            <span className="text-xs text-orange-600 ml-auto">
              {visiblePurchases.length} unpaid purchase{visiblePurchases.length !== 1 ? "s" : ""}
            </span>
          </div>
        );
      })()}

      {/* ── Clear Confirm Banner ── */}
      {showClearConfirm && (
        <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <div>
            <p className="font-semibold text-red-700 text-sm">
              Delete {visiblePurchases.length} purchase{visiblePurchases.length !== 1 ? "s" : ""} currently shown?
            </p>
            <p className="text-xs text-red-500 mt-0.5">This action cannot be undone.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-100"
              onClick={() => setShowClearConfirm(false)}
              disabled={clearingAll}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={handleClearAll}
              disabled={clearingAll}
            >
              {clearingAll ? "Deleting…" : "Yes, delete all"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Search result label ── */}
      {supplierSearch.trim() && (
        <div className="flex items-center gap-2 text-sm">
          {afterSearch.length > 0 ? (
            <>
              <span className="text-green-700 font-medium">
                {afterSearch.length} purchase{afterSearch.length !== 1 ? "s" : ""} found
              </span>
              <span className="text-muted-foreground">matching</span>
              <Badge className="bg-green-100 text-green-800 border border-green-300">
                {supplierSearch}
              </Badge>
            </>
          ) : (
            <span className="text-muted-foreground">
              No purchases found matching <span className="font-medium text-green-700">"{supplierSearch}"</span>
            </span>
          )}
        </div>
      )}

      {/* ── Empty state for current filter ── */}
      {visiblePurchases.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          {paymentFilter === "unpaid" ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-bold text-green-800 text-lg">All payments cleared!</p>
              <p className="text-sm text-muted-foreground">There are no unpaid purchases at the moment.</p>
            </>
          ) : paymentFilter === "paid" ? (
            <>
              <Clock className="h-12 w-12 text-gray-300" />
              <p className="font-bold text-gray-600 text-lg">No paid purchases yet.</p>
              <p className="text-sm text-muted-foreground">Paid purchases will appear here once marked.</p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-gray-300" />
              <p className="font-bold text-gray-600 text-lg">No results found.</p>
            </>
          )}
          {paymentFilter !== "all" && (
            <button
              type="button"
              onClick={() => setPaymentFilter("all")}
              className="text-sm text-green-700 underline underline-offset-2 font-semibold mt-1"
            >
              Show all purchases
            </button>
          )}
        </div>
      )}

      {/* ── Purchase cards ── */}
      {visiblePurchases.map((purchase) => {
        const daysUntilDue = purchase.paymentDueDate
          ? getDaysUntil(purchase.paymentDueDate)
          : null;
        const isPaid         = purchase.paymentStatus === "paid";
        const isPaying       = markingPaid.has(purchase.id);
        const isMarkingUnpaid = markingUnpaid.has(purchase.id);

        // Left border colour based on payment urgency
        const borderAccent = !purchase.paymentDueDate
          ? "border-yellow-200"
          : isPaid
          ? "border-green-400"
          : daysUntilDue !== null && daysUntilDue < 0
          ? "border-red-400"
          : daysUntilDue !== null && daysUntilDue <= 3
          ? "border-orange-400"
          : daysUntilDue !== null && daysUntilDue <= 7
          ? "border-amber-400"
          : "border-blue-300";

        return (
          <Card
            key={purchase.id}
            className={`transition-all border-l-4 ${borderAccent} ${
              purchase.id === latestPurchaseId
                ? "ring-2 ring-green-500 shadow-md"
                : ""
            }`}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-lg">{purchase.supplierName}</CardTitle>

                    {purchase.id === latestPurchaseId && (
                      <Badge className="bg-green-600 text-white text-xs flex items-center gap-1">
                        <Star className="h-3 w-3 fill-white" />
                        Latest
                      </Badge>
                    )}

                    {/* Payment status badge */}
                    {purchase.paymentDueDate && (
                      isPaid ? (
                        <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Paid
                        </Badge>
                      ) : daysUntilDue !== null && daysUntilDue < 0 ? (
                        <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs flex items-center gap-1 animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          Overdue
                        </Badge>
                      ) : daysUntilDue !== null && daysUntilDue <= 3 ? (
                        <Badge className="bg-orange-100 text-orange-800 border border-orange-300 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due Very Soon
                        </Badge>
                      ) : daysUntilDue !== null && daysUntilDue <= 7 ? (
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due This Week
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200 text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Unpaid
                        </Badge>
                      )
                    )}
                  </div>

                  <CardDescription className="flex items-center gap-4 mt-2 flex-wrap text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Purchased: {formatDate(purchase.purchaseDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {purchase.items.length} item{purchase.items.length !== 1 ? "s" : ""}
                    </span>

                    {/* Due date info (unpaid) */}
                    {purchase.paymentDueDate && !isPaid && (
                      <span className={`flex items-center gap-1 font-semibold ${
                        daysUntilDue !== null && daysUntilDue < 0
                          ? "text-red-600"
                          : daysUntilDue !== null && daysUntilDue <= 7
                          ? "text-amber-700"
                          : "text-blue-600"
                      }`}>
                        <Clock className="h-4 w-4" />
                        Due: {formatDate(purchase.paymentDueDate)}
                        {daysUntilDue !== null && (
                          <span className="ml-1">
                            ({daysUntilDue < 0
                              ? `${Math.abs(daysUntilDue)}d overdue`
                              : daysUntilDue === 0
                              ? "today"
                              : `${daysUntilDue}d left`})
                          </span>
                        )}
                      </span>
                    )}

                    {/* Paid date info */}
                    {isPaid && purchase.paymentPaidAt && (
                      <span className="flex items-center gap-1 text-green-700 font-semibold">
                        <CalendarCheck2 className="h-4 w-4" />
                        Paid: {formatDate(purchase.paymentPaidAt)}
                      </span>
                    )}
                  </CardDescription>
                </div>

                <div className="flex items-start gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">
                      ₱{purchase.totalAmount.toFixed(2)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingPurchase(purchase)}
                    className="hover:bg-green-50"
                  >
                    <Edit className="h-4 w-4 text-green-600" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePurchase(purchase.id, purchase.supplierName)}
                    className="hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Items */}
              <div className="space-y-2">
                {purchase.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <div>
                      <span className="font-medium">{item.productName}</span>
                      <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">₱{item.price.toFixed(2)} each</span>
                      <span className="ml-3 font-medium">₱{(item.quantity * item.price).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Notes */}
              {purchase.notes && (
                <div className="mt-4 p-3 bg-green-50 rounded text-sm">
                  <div className="font-medium text-green-900 mb-1">Notes:</div>
                  <div className="text-muted-foreground">{purchase.notes}</div>
                </div>
              )}

              {/* Paid-on detail block (shown when paid) */}
              {isPaid && purchase.paymentPaidAt && (
                <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-900">Payment Cleared</p>
                    <p className="text-xs text-green-700 mt-0.5">
                      Paid on <span className="font-semibold">{formatDateLong(purchase.paymentPaidAt)}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* ── Payment action buttons ── */}
              {purchase.paymentDueDate && (
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  {!isPaid ? (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-800 hover:bg-green-700 text-white font-bold h-9 px-5 text-sm rounded-lg"
                        onClick={() => handleMarkAsPaid(purchase)}
                        disabled={isPaying}
                      >
                        {isPaying ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Saving…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark as Paid
                          </span>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Tap to confirm this payment has been settled.
                      </p>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-400 text-amber-800 hover:bg-amber-50 font-bold h-9 px-5 text-sm rounded-lg"
                        onClick={() => handleMarkAsUnpaid(purchase)}
                        disabled={isMarkingUnpaid}
                      >
                        {isMarkingUnpaid ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-3.5 w-3.5 border-2 border-amber-400/40 border-t-amber-600 rounded-full animate-spin" />
                            Saving…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Revert to Unpaid
                          </span>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Reverse this if the payment was recorded by mistake.
                      </p>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {editingPurchase && (
        <EditPurchaseDialog
          open={!!editingPurchase}
          onOpenChange={(open) => !open && setEditingPurchase(null)}
          purchase={editingPurchase}
          onUpdate={handleUpdatePurchase}
        />
      )}

      {/* ── Clear All (bottom) ── */}
      {visiblePurchases.length > 0 && (
        <div className="pt-2 border-t border-stone-200">
          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-semibold transition-colors mx-auto"
            >
              <Trash className="h-4 w-4" />
              {paymentFilter !== "all" || supplierSearch.trim() ? "Clear shown purchases" : "Clear all purchases"}
            </button>
          ) : (
            <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-xl px-5 py-4">
              <div>
                <p className="font-semibold text-red-700 text-sm">
                  Delete {visiblePurchases.length} purchase{visiblePurchases.length !== 1 ? "s" : ""} currently shown?
                </p>
                <p className="text-xs text-red-500 mt-0.5">This action cannot be undone.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-100"
                  onClick={() => setShowClearConfirm(false)}
                  disabled={clearingAll}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                  onClick={handleClearAll}
                  disabled={clearingAll}
                >
                  {clearingAll ? "Deleting…" : "Yes, delete all"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recently Deleted Purchases Dialog */}
      <RecentlyDeletedPurchasesDialog
        open={showDeletedPurchases}
        onOpenChange={setShowDeletedPurchases}
        apiUrl={apiUrl}
        apiKey={apiKey}
        onRestored={loadPurchases}
      />
    </div>
  );
}