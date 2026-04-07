import { useState, useEffect, useCallback } from "react";
import { Search, Package, Building2, Tag, Ruler, ArrowRight, Loader2, BoxSelect, CalendarClock } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

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
}

interface GroupedResult {
  supplier: Supplier | null;
  products: Product[];
}

interface ProductSearchProps {
  apiUrl: string;
  apiKey: string;
  onViewSupplier: (supplier: Supplier) => void;
}

export function ProductSearch({ apiUrl, apiKey, onViewSupplier }: ProductSearchProps) {
  const [query, setQuery] = useState("");
  const [grouped, setGrouped] = useState<GroupedResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searched, setSearched] = useState(false);

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

  // Load all products on mount
  useEffect(() => {
    fetchProducts("");
  }, [fetchProducts]);

  // Debounced search
  useEffect(() => {
    if (!searched && query === "") return;
    const timer = setTimeout(() => {
      fetchProducts(query);
      setSearched(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchProducts, searched]);

  const handleInput = (value: string) => {
    setQuery(value);
    setSearched(true);
  };

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-600" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-yellow-500 animate-spin" />
        )}
        <Input
          type="search"
          placeholder="Search by product name, SKU, or description…"
          className="pl-10 pr-10 border-green-200 focus:border-yellow-400 focus:ring-yellow-400 bg-white"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
        />
      </div>

      {/* Result count */}
      {!initialLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-semibold border border-yellow-300 text-xs">
            {totalCount}
          </span>
          <span>
            {query.trim()
              ? `product${totalCount !== 1 ? "s" : ""} matching "${query}"`
              : `total product${totalCount !== 1 ? "s" : ""} across all suppliers`}
          </span>
        </div>
      )}

      {/* States */}
      {initialLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          <span>Loading products…</span>
        </div>
      ) : totalCount === 0 ? (
        <div className="text-center py-20">
          <BoxSelect className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {query.trim() ? "No products found" : "No products yet"}
          </h3>
          <p className="text-muted-foreground">
            {query.trim()
              ? "Try different keywords or check the spelling."
              : "Add products inside a supplier profile to see them here."}
          </p>
        </div>
      ) : (
        /* Grouped supplier sections */
        <div className="space-y-6">
          {grouped.map((group) => (
            <div
              key={group.supplier?.id ?? "unknown"}
              className="bg-white border border-green-200 border-t-4 border-t-yellow-400 rounded-xl shadow-sm overflow-hidden"
            >
              {/* Supplier header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-green-50 to-yellow-50 border-b border-green-100">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 border border-yellow-200 p-2 rounded-lg">
                    <Building2 className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-green-800 text-base leading-tight">
                      {group.supplier?.name ?? "Unknown Supplier"}
                    </p>
                    {group.supplier?.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {group.supplier.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {group.products.length} product{group.products.length !== 1 ? "s" : ""}
                  </span>
                  {group.supplier && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-yellow-400 hover:text-green-900 transition-colors font-semibold text-xs"
                      onClick={() => group.supplier && onViewSupplier(group.supplier)}
                    >
                      View Supplier
                      <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Product rows */}
              <div className="divide-y divide-green-50">
                {group.products.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-start justify-between px-5 py-3.5 hover:bg-yellow-50/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="bg-green-100 p-1.5 rounded-md mt-0.5 shrink-0">
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 text-sm">{product.name}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {product.sku && (
                            <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
                              <Tag className="h-3 w-3" />
                              {product.sku}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded px-1.5 py-0.5">
                            <Ruler className="h-3 w-3" />
                            per {product.unit}
                          </span>
                          {product.lastPurchaseDate ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded px-1.5 py-0.5">
                              <CalendarClock className="h-3 w-3" />
                              Last purchased:{" "}
                              {new Date(product.lastPurchaseDate).toLocaleDateString("en-PH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">
                              <CalendarClock className="h-3 w-3" />
                              Never purchased
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 ml-4 text-right">
                      <span className="text-lg font-bold text-green-700 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-0.5 whitespace-nowrap">
                        ₱{Number(product.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}