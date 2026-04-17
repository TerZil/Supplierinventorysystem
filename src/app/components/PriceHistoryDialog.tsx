import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "./ui/dialog";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Tag, BarChart2, Loader2, History } from "lucide-react";
import { Badge } from "./ui/badge";

interface PriceEntry {
  price: number;
  previousPrice: number | null;
  updatedAt: string;
  note?: string;
}

interface Product {
  id: string;
  name: string;
  unit: string;
  supplierName: string;
  price: number;
}

interface PriceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  apiUrl: string;
  apiKey: string;
}

function formatDate(iso: string, short = false) {
  return new Date(iso).toLocaleDateString("en-PH", short
    ? { month: "short", day: "numeric" }
    : { year: "numeric", month: "short", day: "numeric" }
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border-2 border-yellow-300 rounded-xl shadow-lg px-4 py-3 min-w-[140px]">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-lg font-bold text-green-700">
          ₱{Number(payload[0].value).toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">per {payload[0].payload.unit}</p>
      </div>
    );
  }
  return null;
};

export function PriceHistoryDialog({
  open, onOpenChange, product, apiUrl, apiKey,
}: PriceHistoryDialogProps) {
  const [history, setHistory] = useState<PriceEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/price-history/${product.id}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const data = await res.json();
        setHistory(data.history || []);
      } catch (err) {
        console.error("Error loading price history:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open, product.id, apiUrl, apiKey]);

  // Build chart data — use array index as the x-axis key so duplicate
  // same-day dates never produce duplicate Recharts SVG child keys.
  const chartData = history.map((entry, idx) => ({
    idx,
    date: formatDate(entry.updatedAt, true),
    fullDate: formatDateTime(entry.updatedAt),
    price: Number(entry.price),
    unit: product.unit,
    note: entry.note,
  }));

  // Stats
  const prices = history.map((e) => Number(e.price));
  const minPrice = prices.length ? Math.min(...prices) : null;
  const maxPrice = prices.length ? Math.max(...prices) : null;
  const firstPrice = prices.length ? prices[0] : null;
  const currentPrice = product.price;
  const totalChange = firstPrice !== null ? currentPrice - firstPrice : null;
  const changes = history.length - 1; // subtract initial entry

  const yDomain = minPrice !== null && maxPrice !== null
    ? [Math.max(0, minPrice * 0.85), maxPrice * 1.15]
    : ["auto", "auto"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-800 px-6 py-5 rounded-t-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-xl">
              <div className="bg-yellow-400/20 p-2 rounded-lg">
                <BarChart2 className="h-5 w-5 text-yellow-300" />
              </div>
              Price History
            </DialogTitle>
            <DialogDescription className="text-green-200 mt-1">
              <span className="font-semibold text-white">{product.name}</span>
              <span className="mx-2 opacity-50">·</span>
              {product.supplierName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              <span>Loading price history…</span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                <History className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                <p className="font-semibold text-yellow-800">No price history yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Price changes will appear here once you update the price.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Stats row ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Current Price",
                    value: `₱${Number(currentPrice).toFixed(2)}`,
                    sub: `per ${product.unit}`,
                    bg: "bg-green-50 border-green-200",
                    textColor: "text-green-700",
                    icon: <Tag className="h-4 w-4 text-green-500" />,
                  },
                  {
                    label: "Lowest Price",
                    value: minPrice !== null ? `₱${minPrice.toFixed(2)}` : "—",
                    sub: "all time",
                    bg: "bg-blue-50 border-blue-200",
                    textColor: "text-blue-700",
                    icon: <TrendingDown className="h-4 w-4 text-blue-500" />,
                  },
                  {
                    label: "Highest Price",
                    value: maxPrice !== null ? `₱${maxPrice.toFixed(2)}` : "—",
                    sub: "all time",
                    bg: "bg-orange-50 border-orange-200",
                    textColor: "text-orange-700",
                    icon: <TrendingUp className="h-4 w-4 text-orange-500" />,
                  },
                  {
                    label: "Total Change",
                    value: totalChange !== null
                      ? `${totalChange >= 0 ? "+" : ""}₱${totalChange.toFixed(2)}`
                      : "—",
                    sub: `over ${changes} update${changes !== 1 ? "s" : ""}`,
                    bg: totalChange === null || totalChange === 0
                      ? "bg-gray-50 border-gray-200"
                      : totalChange > 0
                        ? "bg-red-50 border-red-200"
                        : "bg-emerald-50 border-emerald-200",
                    textColor: totalChange === null || totalChange === 0
                      ? "text-gray-600"
                      : totalChange > 0 ? "text-red-700" : "text-emerald-700",
                    icon: totalChange === null || totalChange === 0
                      ? <Minus className="h-4 w-4 text-gray-400" />
                      : totalChange > 0
                        ? <TrendingUp className="h-4 w-4 text-red-500" />
                        : <TrendingDown className="h-4 w-4 text-emerald-500" />,
                  },
                ].map(({ label, value, sub, bg, textColor, icon }) => (
                  <div key={label} className={`border rounded-xl px-4 py-3 ${bg}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {icon}
                      <span className="text-xs text-muted-foreground">{label}</span>
                    </div>
                    <p className={`text-lg font-bold leading-tight ${textColor}`}>{value}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                ))}
              </div>

              {/* ── Trend chart ── */}
              {chartData.length >= 1 && (
                <div className="bg-white border border-green-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-green-600" />
                    Price Trend
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                      <XAxis
                        dataKey="idx"
                        tickFormatter={(val) => chartData[val]?.date ?? String(val)}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `₱${v}`}
                        domain={yDomain as any}
                        width={60}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {minPrice !== null && minPrice !== maxPrice && (
                        <ReferenceLine
                          y={minPrice}
                          stroke="#3b82f6"
                          strokeDasharray="4 3"
                          strokeOpacity={0.6}
                          label={{ value: "Low", position: "insideTopRight", fontSize: 10, fill: "#3b82f6" }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#16a34a"
                        strokeWidth={2.5}
                        fill="url(#priceGradient)"
                        dot={{ r: 4, fill: "#16a34a", stroke: "#fff", strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: "#facc15", stroke: "#16a34a", strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* ── Change log table ── */}
              <div className="bg-white border border-green-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-green-50 border-b border-green-100 flex items-center gap-2">
                  <History className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">Change Log</p>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {history.length} entr{history.length !== 1 ? "ies" : "y"}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {[...history].reverse().map((entry, idx) => {
                    const diff = entry.previousPrice !== null
                      ? entry.price - entry.previousPrice
                      : null;
                    const isFirst = idx === history.length - 1;
                    const isLatest = idx === 0;

                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-4 py-3 ${
                          isLatest ? "bg-green-50" : "hover:bg-gray-50"
                        } transition-colors`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Icon */}
                          <div className={`p-1.5 rounded-lg ${
                            isFirst
                              ? "bg-gray-100"
                              : diff === null || diff === 0
                                ? "bg-gray-100"
                                : diff > 0
                                  ? "bg-red-100"
                                  : "bg-emerald-100"
                          }`}>
                            {isFirst ? (
                              <Tag className="h-3.5 w-3.5 text-gray-500" />
                            ) : diff !== null && diff > 0 ? (
                              <TrendingUp className="h-3.5 w-3.5 text-red-500" />
                            ) : diff !== null && diff < 0 ? (
                              <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Minus className="h-3.5 w-3.5 text-gray-500" />
                            )}
                          </div>
                          {/* Date + note */}
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {formatDateTime(entry.updatedAt)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.note
                                ? entry.note
                                : entry.previousPrice !== null
                                  ? `From ₱${Number(entry.previousPrice).toFixed(2)}`
                                  : "—"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Diff badge */}
                          {diff !== null && diff !== 0 && (
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold ${
                                diff > 0
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}₱{diff.toFixed(2)}
                            </Badge>
                          )}
                          {/* Price */}
                          <span className={`text-base font-bold ${
                            isLatest ? "text-green-700" : "text-gray-700"
                          }`}>
                            ₱{Number(entry.price).toFixed(2)}
                          </span>
                          {isLatest && (
                            <Badge className="bg-green-600 text-white text-xs">Current</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}