import { useState, useEffect, useCallback } from "react";
import {
  Package, Building2, Tag, Ruler, ArrowRight, Loader2, BoxSelect,
  CalendarClock, TrendingUp, ShoppingCart, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "./ui/button";
import { UpdatePriceDialog } from "./UpdatePriceDialog";
import { QuickRecordPurchaseDialog } from "./QuickRecordPurchaseDialog";
import { PriceHistoryDialog } from "./PriceHistoryDialog";

interface Supplier {
  id: string;
  name: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
}

interface Product {
  id: string;
  supplierId: string;
  name: string;
  description: string;
  price: number;
  sku: string;
  unit: string;
  supplierName: string;
  supplier: Supplier | null;
  lastPurchaseDate: string | null;
  priceUpdatedAt?: string | null;
}

interface GroupedResult {
  supplier: Supplier | null;
  products: Product[];
}

interface ProductSearchProps {
  apiUrl: string;
  apiKey: string;
  onViewSupplier: (supplier: Supplier) => void;
  query: string;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric",
  });
}

/** Single product card */
function ProductCard({
  product,
  onUpdatePrice,
  onRecordPurchase,
  onPriceHistory,
}: {
  product: Product;
  onUpdatePrice: () => void;
  onRecordPurchase: () => void;
  onPriceHistory: () => void;
}) {
  return (
    <div className="bg-white border-2 border-stone-200 rounded-2xl flex flex-col hover:border-amber-400 hover:shadow-lg transition-all duration-200 overflow-hidden group">

      {/* ── Card top bar ── */}
      <div className="h-1.5 w-full bg-gradient-to-r from-green-800 to-green-900 group-hover:from-amber-500 group-hover:to-amber-600 transition-colors duration-200" />

      <div className="flex flex-col flex-1 p-5 gap-4">

        {/* ── Product identity ── */}
        <div className="flex items-start gap-3">
          <div className="bg-green-100 border border-green-200 p-2.5 rounded-xl shrink-0 mt-0.5">
            <Package className="h-6 w-6 text-green-800" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-gray-900 text-lg leading-snug">{product.name}</h4>
            {product.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-2.5">
              {product.sku && (
                <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-800 border border-green-200 rounded-lg px-2 py-1 font-semibold">
                  <Tag className="h-3 w-3" />
                  {product.sku}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-xs bg-stone-50 text-stone-700 border border-stone-200 rounded-lg px-2 py-1 font-semibold">
                <Ruler className="h-3 w-3" />
                per {product.unit}
              </span>
            </div>
          </div>
        </div>

        {/* ── Price block ── */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3.5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-0.5">
              Current Price
            </p>
            <p className="text-3xl font-bold text-green-900 leading-none">
              ₱{Number(product.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground mt-1">per {product.unit}</p>
          </div>
          <button
            onClick={onPriceHistory}
            title="View price history"
            className="shrink-0 flex flex-col items-center gap-1 bg-white border-2 border-amber-300 hover:border-amber-500 hover:bg-amber-100 transition-colors rounded-xl px-3 py-2.5 cursor-pointer"
          >
            <BarChart2 className="h-5 w-5 text-amber-700" />
            <span className="text-xs font-bold text-amber-800 whitespace-nowrap">History</span>
          </button>
        </div>

        {/* ── Meta row ── */}
        <div className="flex flex-wrap gap-2">
          {product.lastPurchaseDate ? (
            <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-800 border border-blue-200 rounded-lg px-2.5 py-1 font-semibold">
              <CalendarClock className="h-3.5 w-3.5" />
              Last purchased: {formatShortDate(product.lastPurchaseDate)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs bg-stone-50 text-stone-500 border border-stone-200 rounded-lg px-2.5 py-1 font-semibold">
              <CalendarClock className="h-3.5 w-3.5" />
              Never purchased
            </span>
          )}
          {product.priceUpdatedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-purple-50 text-purple-800 border border-purple-200 rounded-lg px-2.5 py-1 font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              Price updated: {formatShortDate(product.priceUpdatedAt)}
            </span>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-2.5 mt-auto pt-1">
          <Button
            size="lg"
            className="w-full bg-green-900 hover:bg-green-800 text-white font-bold text-base h-12 rounded-xl shadow-sm"
            onClick={onRecordPurchase}
          >
            <ShoppingCart className="h-5 w-5 mr-2 shrink-0" />
            Record Purchase
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full border-2 border-amber-400 text-amber-900 hover:bg-amber-50 hover:border-amber-500 font-bold text-base h-12 rounded-xl"
            onClick={onUpdatePrice}
          >
            <TrendingUp className="h-5 w-5 mr-2 shrink-0" />
            Update Price
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Collapsible supplier section */
function SupplierSection({
  group,
  onViewSupplier,
  onUpdatePrice,
  onRecordPurchase,
  onPriceHistory,
}: {
  group: GroupedResult;
  onViewSupplier: (s: Supplier) => void;
  onUpdatePrice: (p: Product) => void;
  onRecordPurchase: (p: Product) => void;
  onPriceHistory: (p: Product) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="bg-white border-2 border-stone-200 rounded-2xl overflow-hidden shadow-sm">

      {/* Supplier header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-900 to-green-800 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-400/20 border border-amber-400/40 p-2 rounded-lg shrink-0">
            <Building2 className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <p className="font-bold text-white text-lg leading-tight">
              {group.supplier?.name ?? "Unknown Supplier"}
            </p>
            {group.supplier?.description && (
              <p className="text-green-200 text-sm line-clamp-1 mt-0.5">
                {group.supplier.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-amber-400/20 border border-amber-400/40 text-amber-200 text-sm font-bold px-3 py-1 rounded-full">
            {group.products.length} product{group.products.length !== 1 ? "s" : ""}
          </span>
          {group.supplier && (
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-sm h-9 px-4 rounded-lg"
              onClick={(e) => { e.stopPropagation(); group.supplier && onViewSupplier(group.supplier); }}
            >
              View Supplier
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          )}
          <div className="text-amber-300">
            {collapsed
              ? <ChevronDown className="h-5 w-5" />
              : <ChevronUp className="h-5 w-5" />
            }
          </div>
        </div>
      </div>

      {/* Product grid */}
      {!collapsed && (
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onUpdatePrice={() => onUpdatePrice(product)}
                onRecordPurchase={() => onRecordPurchase(product)}
                onPriceHistory={() => onPriceHistory(product)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductSearch({ apiUrl, apiKey, onViewSupplier, query }: ProductSearchProps) {
  const [grouped, setGrouped] = useState<GroupedResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [updatePriceProduct, setUpdatePriceProduct] = useState<Product | null>(null);
  const [recordPurchaseProduct, setRecordPurchaseProduct] = useState<Product | null>(null);
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<Product | null>(null);

  const fetchProducts = useCallback(async (q: string) => {
    try {
      setLoading(true);
      const url = `${apiUrl}/products/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` } });
      const data = await res.json();
      setGrouped(data.grouped ?? []);
      setTotalCount(data.products?.length ?? 0);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [apiUrl, apiKey]);

  useEffect(() => { fetchProducts(""); }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => fetchProducts(query), 300);
    return () => clearTimeout(timer);
  }, [query, fetchProducts]);

  const handlePriceUpdated = (updatedProduct: Product) => {
    setGrouped((prev) =>
      prev.map((group) => ({
        ...group,
        products: group.products.map((p) =>
          p.id === updatedProduct.id
            ? { ...p, price: updatedProduct.price, priceUpdatedAt: updatedProduct.priceUpdatedAt }
            : p
        ),
      }))
    );
    setUpdatePriceProduct(null);
  };

  const handlePurchaseRecorded = () => {
    fetchProducts(query);
    setRecordPurchaseProduct(null);
  };

  return (
    <div className="space-y-6">

      {/* ── Summary bar ── */}
      {!initialLoading && (
        <div className="flex items-center gap-3 bg-white border-2 border-stone-200 rounded-xl px-5 py-3">
          {loading && <Loader2 className="h-5 w-5 animate-spin text-green-800 shrink-0" />}
          <span className="inline-flex items-center justify-center min-w-[2.5rem] h-8 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300 text-base px-3">
            {totalCount}
          </span>
          <span className="text-base font-semibold text-muted-foreground">
            {query.trim()
              ? `product${totalCount !== 1 ? "s" : ""} matching "${query}"`
              : `total product${totalCount !== 1 ? "s" : ""} across all suppliers`}
          </span>
        </div>
      )}

      {/* ── States ── */}
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-green-800" />
          <span className="text-lg font-semibold">Loading products…</span>
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-24">
          <div className="bg-stone-100 border-2 border-stone-200 rounded-full p-6 w-fit mx-auto mb-5">
            <BoxSelect className="h-14 w-14 text-stone-400" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {query.trim() ? "No products found" : "No products yet"}
          </h3>
          <p className="text-base text-muted-foreground max-w-sm mx-auto">
            {query.trim()
              ? "Try different keywords or check the spelling."
              : "Add products inside a supplier profile to see them here."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <SupplierSection
              key={group.supplier?.id ?? "unknown"}
              group={group}
              onViewSupplier={onViewSupplier}
              onUpdatePrice={setUpdatePriceProduct}
              onRecordPurchase={setRecordPurchaseProduct}
              onPriceHistory={setPriceHistoryProduct}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      {priceHistoryProduct && (
        <PriceHistoryDialog
          open={!!priceHistoryProduct}
          onOpenChange={(open) => { if (!open) setPriceHistoryProduct(null); }}
          product={priceHistoryProduct}
          apiUrl={apiUrl}
          apiKey={apiKey}
        />
      )}
      {updatePriceProduct && (
        <UpdatePriceDialog
          open={!!updatePriceProduct}
          onOpenChange={(open) => { if (!open) setUpdatePriceProduct(null); }}
          product={updatePriceProduct}
          apiUrl={apiUrl}
          apiKey={apiKey}
          onSuccess={handlePriceUpdated}
        />
      )}
      {recordPurchaseProduct && (
        <QuickRecordPurchaseDialog
          open={!!recordPurchaseProduct}
          onOpenChange={(open) => { if (!open) setRecordPurchaseProduct(null); }}
          product={recordPurchaseProduct}
          apiUrl={apiUrl}
          apiKey={apiKey}
          onSuccess={handlePurchaseRecorded}
        />
      )}
    </div>
  );
}
