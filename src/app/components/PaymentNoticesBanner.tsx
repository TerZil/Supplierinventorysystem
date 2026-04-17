import { useState, useEffect, useCallback } from "react";
import {
  Bell, AlertTriangle, Clock, CheckCircle2, ChevronDown, ChevronUp,
  X, CalendarDays, Building2,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface PurchaseItem {
  productName: string;
  quantity: number;
  price: number;
}

interface Notice {
  id: string;
  supplierName: string;
  totalAmount: number;
  paymentDueDate: string;
  paymentStatus: string;
  purchaseDate: string;
  items: PurchaseItem[];
}

interface PaymentNoticesBannerProps {
  apiUrl: string;
  apiKey: string;
}

function getDaysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  return Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "long", day: "numeric",
  });
}

type Urgency = "overdue" | "critical" | "warning" | "upcoming";

function getUrgency(days: number): Urgency {
  if (days < 0) return "overdue";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "upcoming";
}

const URGENCY_STYLES: Record<Urgency, {
  border: string; bg: string; badge: string; badgeText: string;
  icon: string; label: string; dotColor: string;
}> = {
  overdue: {
    border: "border-red-400",
    bg: "bg-red-50",
    badge: "bg-red-600 text-white",
    badgeText: "OVERDUE",
    icon: "text-red-600",
    label: "text-red-800",
    dotColor: "bg-red-500",
  },
  critical: {
    border: "border-orange-400",
    bg: "bg-orange-50",
    badge: "bg-orange-500 text-white",
    badgeText: "DUE SOON",
    icon: "text-orange-600",
    label: "text-orange-800",
    dotColor: "bg-orange-500",
  },
  warning: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    badge: "bg-amber-500 text-white",
    badgeText: "THIS WEEK",
    icon: "text-amber-600",
    label: "text-amber-800",
    dotColor: "bg-amber-500",
  },
  upcoming: {
    border: "border-blue-300",
    bg: "bg-blue-50",
    badge: "bg-blue-500 text-white",
    badgeText: "UPCOMING",
    icon: "text-blue-600",
    label: "text-blue-800",
    dotColor: "bg-blue-400",
  },
};

export function PaymentNoticesBanner({ apiUrl, apiKey }: PaymentNoticesBannerProps) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [markingPaid, setMarkingPaid] = useState<Set<string>>(new Set());

  const loadNotices = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/purchases`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const purchases: any[] = data.purchases || [];

      // Show all overdue + any within 30 days that are unpaid
      const relevant = purchases
        .filter(
          (p) =>
            p.paymentDueDate &&
            p.paymentStatus !== "paid" &&
            getDaysUntil(p.paymentDueDate) <= 30
        )
        .sort(
          (a, b) => getDaysUntil(a.paymentDueDate) - getDaysUntil(b.paymentDueDate)
        );

      setNotices(relevant);

      // Auto-expand if any are overdue or critical (≤3 days)
      const hasUrgent = relevant.some((n) => getDaysUntil(n.paymentDueDate) <= 3);
      if (hasUrgent) setCollapsed(false);
    } catch (err) {
      console.error("Error loading payment notices:", err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl, apiKey]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  const handleMarkAsPaid = async (notice: Notice) => {
    setMarkingPaid((prev) => new Set(prev).add(notice.id));
    try {
      const res = await fetch(`${apiUrl}/purchases/${notice.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          paymentStatus: "paid",
          paymentPaidAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to mark as paid");
      setNotices((prev) => prev.filter((n) => n.id !== notice.id));
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-green-800 text-white px-4 py-3 rounded-xl shadow-lg w-[360px] border border-green-700">
          <CheckCircle2 className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Payment Cleared!</p>
            <p className="text-sm text-green-100 mt-0.5">
              Payment for <span className="font-semibold">{notice.supplierName}</span> has been marked as paid.
            </p>
          </div>
        </div>
      ));
    } catch (err) {
      console.error("Error marking as paid:", err);
      toast.error("Failed to mark as paid. Please try again.");
    } finally {
      setMarkingPaid((prev) => {
        const next = new Set(prev);
        next.delete(notice.id);
        return next;
      });
    }
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  if (loading) return null;

  const visibleNotices = notices.filter((n) => !dismissed.has(n.id));
  if (visibleNotices.length === 0) return null;

  const overdueCount = visibleNotices.filter((n) => getDaysUntil(n.paymentDueDate) < 0).length;
  const urgentCount = visibleNotices.filter((n) => getDaysUntil(n.paymentDueDate) <= 7).length;

  return (
    <div className="rounded-2xl overflow-hidden border-2 border-orange-300 shadow-md mb-6">
      {/* ── Banner header ── */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-orange-700 to-orange-800 hover:from-orange-600 hover:to-orange-700 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="bg-orange-400/30 border border-orange-300/50 p-2 rounded-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            {/* Pulse dot for urgent */}
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
              </span>
            )}
          </div>
          <div className="text-left">
            <p className="font-bold text-white text-base leading-tight">
              Payment Notices
            </p>
            <p className="text-orange-200 text-xs mt-0.5">
              {overdueCount > 0
                ? `${overdueCount} overdue · `
                : ""}
              {visibleNotices.length} pending payment{visibleNotices.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Urgency summary pills */}
          <div className="hidden sm:flex items-center gap-2">
            {overdueCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {overdueCount} overdue
              </span>
            )}
            {urgentCount - overdueCount > 0 && (
              <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                {urgentCount - overdueCount} due this week
              </span>
            )}
          </div>
          <div className="bg-white/20 rounded-lg p-1.5">
            {collapsed
              ? <ChevronDown className="h-5 w-5 text-white" />
              : <ChevronUp className="h-5 w-5 text-white" />}
          </div>
        </div>
      </button>

      {/* ── Notice list ── */}
      {!collapsed && (
        <div className="bg-white divide-y divide-stone-100">
          {visibleNotices.map((notice) => {
            const days = getDaysUntil(notice.paymentDueDate);
            const urgency = getUrgency(days);
            const styles = URGENCY_STYLES[urgency];
            const isPaying = markingPaid.has(notice.id);

            return (
              <div
                key={notice.id}
                className={`flex items-start gap-4 px-5 py-4 border-l-4 ${styles.border} ${styles.bg} transition-all`}
              >
                {/* Icon */}
                <div className={`mt-0.5 shrink-0 ${styles.icon}`}>
                  {urgency === "overdue"
                    ? <AlertTriangle className="h-6 w-6" />
                    : <Clock className="h-6 w-6" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                      {styles.badgeText}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className={`font-bold text-sm ${styles.label}`}>
                        {notice.supplierName}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="font-bold text-gray-900 text-base">
                      ₱{notice.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      Due: {formatDate(notice.paymentDueDate)}
                    </span>
                    <span className={`font-semibold ${
                      days < 0 ? "text-red-700" : days <= 3 ? "text-orange-700" : days <= 7 ? "text-amber-700" : "text-blue-700"
                    }`}>
                      {days < 0
                        ? `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} overdue`
                        : days === 0
                        ? "Due today"
                        : `${days} day${days !== 1 ? "s" : ""} remaining`}
                    </span>
                  </div>

                  {/* Items summary */}
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {notice.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    className="bg-green-800 hover:bg-green-700 text-white font-bold h-9 px-4 text-sm rounded-lg"
                    onClick={() => handleMarkAsPaid(notice)}
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
                  <button
                    type="button"
                    title="Dismiss (hides until page reload)"
                    onClick={() => handleDismiss(notice.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
