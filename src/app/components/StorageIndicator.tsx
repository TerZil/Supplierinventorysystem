import { useState, useEffect, useCallback } from "react";
import { Database, RefreshCw } from "lucide-react";

interface StorageStats {
  counts: {
    suppliers: number;
    products: number;
    purchases: number;
    deletedSuppliers: number;
    priceHistoryEntries: number;
    total: number;
  };
  estimatedBytes: number;
}

interface StorageIndicatorProps {
  apiUrl: string;
  apiKey: string;
}

const SOFT_LIMIT_BYTES = 500 * 1024 * 1024; // 500 MB display ceiling

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function StorageIndicator({ apiUrl, apiKey }: StorageIndicatorProps) {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`${apiUrl}/storage-stats`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Error fetching storage stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [apiUrl, apiKey]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const usedBytes = stats?.estimatedBytes ?? 0;
  const pct = Math.min((usedBytes / SOFT_LIMIT_BYTES) * 100, 100);

  // Color the bar based on usage
  const barColor =
    pct >= 85 ? "bg-red-500" :
    pct >= 60 ? "bg-amber-400" :
    "bg-emerald-400";

  const textColor =
    pct >= 85 ? "text-red-300" :
    pct >= 60 ? "text-amber-300" :
    "text-emerald-300";

  return (
    <div className="relative">
      {/* Pill button */}
      <button
        type="button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => fetchStats(true)}
        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-2 transition-colors group"
        title="Click to refresh storage stats"
      >
        <Database className={`h-4 w-4 shrink-0 ${textColor}`} />

        <div className="flex flex-col gap-0.5 min-w-[80px]">
          {loading ? (
            <div className="h-2 w-16 bg-white/20 rounded-full animate-pulse" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white leading-none">
                  {formatBytes(usedBytes)}
                </span>
                <span className="text-[10px] text-white/50 leading-none">
                  / {formatBytes(SOFT_LIMIT_BYTES)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden w-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </>
          )}
        </div>

        {refreshing && (
          <RefreshCw className="h-3 w-3 text-white/60 animate-spin shrink-0" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && stats && (
        <div className="absolute top-full right-0 mt-2 z-50 w-52 bg-green-950 border border-green-800 rounded-xl shadow-xl p-3 text-xs space-y-2">
          <p className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            Storage Breakdown
          </p>
          <div className="space-y-1 text-green-200">
            {[
              ["Suppliers",        stats.counts.suppliers],
              ["Products",         stats.counts.products],
              ["Purchases",        stats.counts.purchases],
              ["Price History",    stats.counts.priceHistoryEntries],
              ["Recently Deleted", stats.counts.deletedSuppliers],
            ].map(([label, count]) => (
              <div key={label as string} className="flex justify-between">
                <span className="text-green-400">{label}</span>
                <span className="font-semibold text-white">{count as number} record{(count as number) !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-green-800 pt-2 flex justify-between text-green-300">
            <span>Total records</span>
            <span className="font-bold text-white">{stats.counts.total}</span>
          </div>
          <div className="flex justify-between text-green-300">
            <span>Est. data size</span>
            <span className={`font-bold ${textColor}`}>{formatBytes(usedBytes)}</span>
          </div>
          <p className="text-green-600 text-[10px] pt-1 border-t border-green-800">
            Click the pill to refresh · Limit is soft-capped at {formatBytes(SOFT_LIMIT_BYTES)}
          </p>
        </div>
      )}
    </div>
  );
}