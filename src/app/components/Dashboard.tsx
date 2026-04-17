import { useState, useEffect, useCallback } from "react";
import {
  Building2, FlaskConical, ShoppingCart, ArrowRight,
  TrendingUp, Package, Clock, LayoutDashboard,
  Tag, Ruler, RefreshCw, PenLine,
  CalendarDays, AlertTriangle, CheckCircle2, Bell,
  ChevronRight, ReceiptText,
} from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";

interface DashboardProps {
  apiUrl: string;
  apiKey: string;
  onNavigate: (tab: string) => void;
}

interface Stats {
  supplierCount: number;
  productCount: number;
  purchaseCount: number;
  totalSpend: number;
}

interface PaymentDue {
  id: string;
  supplierName: string;
  totalAmount: number;
  paymentDueDate: string;
  paymentStatus: string;
  purchaseDate: string;
  items: { productName: string; quantity: number; price: number }[];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
    year: "numeric", month: "short", day: "numeric",
  });
}

type Urgency = "overdue" | "critical" | "warning" | "upcoming";

function getUrgency(days: number): Urgency {
  if (days < 0) return "overdue";
  if (days <= 3) return "critical";
  if (days <= 7) return "warning";
  return "upcoming";
}

const URGENCY_CONFIG: Record<Urgency, {
  border: string; bg: string; badge: string; badgeText: string;
  icon: string; label: string; daysText: (d: number) => string;
}> = {
  overdue: {
    border: "border-l-red-500",
    bg: "bg-red-50 hover:bg-red-100/60",
    badge: "bg-red-600 text-white",
    badgeText: "OVERDUE",
    icon: "text-red-500",
    label: "text-red-900",
    daysText: (d) => `${Math.abs(d)}d overdue`,
  },
  critical: {
    border: "border-l-orange-500",
    bg: "bg-orange-50 hover:bg-orange-100/60",
    badge: "bg-orange-500 text-white",
    badgeText: "DUE SOON",
    icon: "text-orange-500",
    label: "text-orange-900",
    daysText: (d) => d === 0 ? "Due today" : `${d}d left`,
  },
  warning: {
    border: "border-l-amber-500",
    bg: "bg-amber-50 hover:bg-amber-100/60",
    badge: "bg-amber-500 text-white",
    badgeText: "THIS WEEK",
    icon: "text-amber-600",
    label: "text-amber-900",
    daysText: (d) => `${d}d left`,
  },
  upcoming: {
    border: "border-l-blue-400",
    bg: "bg-blue-50 hover:bg-blue-100/60",
    badge: "bg-blue-500 text-white",
    badgeText: "UPCOMING",
    icon: "text-blue-500",
    label: "text-blue-900",
    daysText: (d) => `${d}d left`,
  },
};

const PRODUCT_HIGHLIGHTS = [
  { icon: Tag,       text: "Search by name, SKU, or description" },
  { icon: TrendingUp, text: "Update prices and track when they changed" },
  { icon: ShoppingCart, text: "Record a purchase directly from any product" },
  { icon: Building2, text: "Browse products grouped by supplier" },
];

export function Dashboard({ apiUrl, apiKey, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [paymentDues, setPaymentDues] = useState<PaymentDue[]>([]);
  const [loadingDues, setLoadingDues] = useState(true);
  const [markingPaid, setMarkingPaid] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [suppliersRes, productsRes, purchasesRes] = await Promise.all([
          fetch(`${apiUrl}/suppliers`, { headers: { Authorization: `Bearer ${apiKey}` } }),
          fetch(`${apiUrl}/products/search`, { headers: { Authorization: `Bearer ${apiKey}` } }),
          fetch(`${apiUrl}/purchases`, { headers: { Authorization: `Bearer ${apiKey}` } }),
        ]);
        const [suppliersData, productsData, purchasesData] = await Promise.all([
          suppliersRes.json(),
          productsRes.json(),
          purchasesRes.json(),
        ]);

        const purchases: any[] = purchasesData.purchases || [];
        const totalSpend = purchases.reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);

        setStats({
          supplierCount: (suppliersData.suppliers || []).length,
          productCount: (productsData.products || []).length,
          purchaseCount: purchases.length,
          totalSpend,
        });

        // Extract payment dues
        const dues = purchases
          .filter(
            (p) =>
              p.paymentDueDate &&
              p.paymentStatus !== "paid"
          )
          .sort((a, b) => getDaysUntil(a.paymentDueDate) - getDaysUntil(b.paymentDueDate));
        setPaymentDues(dues);
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoadingStats(false);
        setLoadingDues(false);
      }
    };
    fetchStats();
  }, [apiUrl, apiKey]);

  const handleMarkAsPaid = async (due: PaymentDue) => {
    setMarkingPaid((prev) => new Set(prev).add(due.id));
    try {
      const res = await fetch(`${apiUrl}/purchases/${due.id}`, {
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
      setPaymentDues((prev) => prev.filter((d) => d.id !== due.id));
      // Also update stats purchase count (totalSpend doesn't change)
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-green-800 text-white px-4 py-3 rounded-xl shadow-lg w-[360px] border border-green-700">
          <CheckCircle2 className="h-5 w-5 text-green-300 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold text-base">Payment Cleared!</p>
            <p className="text-sm text-green-100 mt-0.5">
              Payment for <span className="font-semibold">{due.supplierName}</span> has been marked as paid.
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
        next.delete(due.id);
        return next;
      });
    }
  };

  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const overdueCount = paymentDues.filter((d) => getDaysUntil(d.paymentDueDate) < 0).length;
  const dueThisWeek = paymentDues.filter((d) => { const days = getDaysUntil(d.paymentDueDate); return days >= 0 && days <= 7; }).length;
  const totalUnpaidAmount = paymentDues.reduce((sum, d) => sum + d.totalAmount, 0);

  return (
    <div className="space-y-8">

      {/* ── Section label (top of page) ── */}
      <div>
        <h3 className="text-lg font-bold text-green-900 mb-1">What would you like to do?</h3>
        <p className="text-sm text-muted-foreground">Choose a module to navigate to.</p>
      </div>

      {/* ── Featured: Browse Products (top) ── */}
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-white shadow-md hover:shadow-xl transition-all duration-200 cursor-pointer group"
        onClick={() => onNavigate("products")}
      >
        {/* Thick top accent */}
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        {/* Background decorative blob */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-amber-50 pointer-events-none group-hover:bg-amber-100 transition-colors duration-300" />
        <div className="absolute right-8 top-6 opacity-10 pointer-events-none">
          <FlaskConical className="h-36 w-36 text-amber-600" />
        </div>

        <div className="relative px-8 py-8 flex flex-col md:flex-row md:items-center gap-8">
          {/* Left content */}
          <div className="flex-1 min-w-0">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold px-3 py-1 rounded-full mb-4">
              <Ruler className="h-3.5 w-3.5" />
              Featured Module
            </span>

            <div className="flex items-center gap-4 mb-3">
              <div className="bg-amber-100 border border-amber-300 p-4 rounded-2xl shrink-0">
                <FlaskConical className="h-10 w-10 text-amber-700" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Browse Products</h3>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Your central hub for searching, pricing, and purchasing across all suppliers.
                </p>
              </div>
            </div>

            {/* Highlight bullets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
              {PRODUCT_HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                  <div className="bg-amber-200 p-1.5 rounded-lg shrink-0">
                    <Icon className="h-3.5 w-3.5 text-amber-800" />
                  </div>
                  <span className="text-sm font-medium text-gray-800">{text}</span>
                </div>
              ))}
            </div>

            {/* Stat pill */}
            {!loadingStats && stats && (
              <div className="mt-5 flex items-center gap-2 text-sm text-amber-900">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>
                  <span className="font-bold text-amber-800 text-base">{stats.productCount}</span>
                  {" "}product{stats.productCount !== 1 ? "s" : ""} across{" "}
                  <span className="font-bold text-amber-800 text-base">{stats.supplierCount}</span>
                  {" "}supplier{stats.supplierCount !== 1 ? "s" : ""} currently on record
                </span>
              </div>
            )}
          </div>

          {/* Right CTA */}
          <div className="shrink-0 flex flex-col items-center gap-3 md:min-w-[180px]">
            <Button
              size="lg"
              className="w-full bg-amber-500 hover:bg-amber-400 text-white font-bold text-base px-8 py-6 shadow-md group-hover:shadow-lg transition-shadow"
              onClick={(e) => { e.stopPropagation(); onNavigate("products"); }}
            >
              Browse Products
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <p className="text-xs text-muted-foreground text-center">Update prices · Record purchases</p>
          </div>
        </div>
      </div>

      {/* ── Payment Dues Module ── */}
      {!loadingDues && (
        <div className="rounded-2xl border-2 border-orange-300 overflow-hidden shadow-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-700 to-orange-800 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-orange-400/30 border border-orange-300/50 p-2 rounded-lg">
                  <ReceiptText className="h-5 w-5 text-white" />
                </div>
                {overdueCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500" />
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-white text-base leading-tight">Payment Dues</p>
                <p className="text-orange-200 text-xs mt-0.5">
                  {paymentDues.length === 0
                    ? "All payments cleared"
                    : `${paymentDues.length} pending · ₱${totalUnpaidAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {overdueCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  {overdueCount} overdue
                </span>
              )}
              {dueThisWeek > 0 && (
                <span className="bg-amber-400 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-full">
                  {dueThisWeek} this week
                </span>
              )}
              <button
                type="button"
                onClick={() => onNavigate("purchases")}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 transition-colors text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                View All
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Body */}
          {paymentDues.length === 0 ? (
            <div className="bg-white px-6 py-8 flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-1" />
              <p className="font-bold text-green-800 text-base">All caught up!</p>
              <p className="text-sm text-muted-foreground">No pending payments at the moment.</p>
            </div>
          ) : (
            <div className="bg-white divide-y divide-stone-100">
              {/* Summary row */}
              <div className="grid grid-cols-3 divide-x divide-stone-100 text-center">
                <div className="px-4 py-3">
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Overdue</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-2xl font-bold text-amber-600">{dueThisWeek}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Due This Week</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-2xl font-bold text-blue-600">{paymentDues.length - overdueCount - dueThisWeek}</p>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">Upcoming</p>
                </div>
              </div>

              {/* Payment due rows (max 5, then "view all" link) */}
              {paymentDues.slice(0, 5).map((due) => {
                const days = getDaysUntil(due.paymentDueDate);
                const urgency = getUrgency(days);
                const cfg = URGENCY_CONFIG[urgency];
                const isPaying = markingPaid.has(due.id);

                return (
                  <div
                    key={due.id}
                    className={`flex items-center gap-4 px-5 py-4 border-l-4 ${cfg.border} ${cfg.bg} transition-all`}
                  >
                    {/* Icon */}
                    <div className={`shrink-0 ${cfg.icon}`}>
                      {urgency === "overdue"
                        ? <AlertTriangle className="h-6 w-6" />
                        : <Clock className="h-6 w-6" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                          {cfg.badgeText}
                        </span>
                        <span className={`font-bold text-sm ${cfg.label} truncate`}>
                          {due.supplierName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="font-bold text-gray-900">
                          ₱{due.totalAmount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="flex items-center gap-1 text-gray-500">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Due {formatDate(due.paymentDueDate)}
                        </span>
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                          days < 0
                            ? "bg-red-100 text-red-700"
                            : days <= 3
                            ? "bg-orange-100 text-orange-700"
                            : days <= 7
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {cfg.daysText(days)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {due.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}
                      </p>
                    </div>

                    {/* Mark as Paid */}
                    <Button
                      size="sm"
                      className="shrink-0 bg-green-800 hover:bg-green-700 text-white font-bold h-9 px-4 text-sm rounded-lg"
                      onClick={() => handleMarkAsPaid(due)}
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
                          Mark Paid
                        </span>
                      )}
                    </Button>
                  </div>
                );
              })}

              {/* "View more" footer if there are more than 5 */}
              {paymentDues.length > 5 && (
                <button
                  type="button"
                  onClick={() => onNavigate("purchases")}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm text-orange-700 font-semibold hover:bg-orange-50 transition-colors"
                >
                  +{paymentDues.length - 5} more pending payments — View all in Purchase History
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Welcome hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-950 via-green-900 to-green-950 border-b-4 border-amber-500 shadow-lg px-8 py-10">
        <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-amber-400/10 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutDashboard className="h-5 w-5 text-amber-400" />
              <span className="text-amber-400 text-sm font-semibold uppercase tracking-wide">Dashboard</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight">
              {greeting}, <span className="text-amber-400">Wonderzyme!</span> 👋
            </h2>
            <p className="text-green-200 mt-2 text-sm">{today}</p>
            <p className="text-green-100 mt-3 max-w-lg text-sm leading-relaxed">
              Welcome to the <span className="text-white font-bold">Wonderzyme Inventory Management System</span>.
              Select a module below to get started.
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex gap-4 flex-wrap">
            {[
              { label: "Suppliers",  value: stats?.supplierCount,  icon: Building2 },
              { label: "Products",   value: stats?.productCount,   icon: Package },
              { label: "Purchases",  value: stats?.purchaseCount,  icon: ShoppingCart },
            ].map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="bg-white/10 border border-white/25 rounded-xl px-5 py-3 flex items-center gap-3 min-w-[120px]"
              >
                <Icon className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <p className="text-2xl font-bold text-white leading-none">
                    {loadingStats ? "—" : (value ?? 0)}
                  </p>
                  <p className="text-green-200 text-xs mt-0.5 font-medium">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!loadingStats && stats && stats.totalSpend > 0 && (
          <div className="relative mt-6 flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 rounded-xl px-5 py-3 w-fit">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-amber-100 text-sm">
              Total recorded spend:{" "}
              <span className="font-bold text-white text-base">
                ₱{stats.totalSpend.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        )}
      </div>

    </div>
  );
}