import { useState, useEffect } from "react";
import { Search, Plus, ShoppingCart, Package, Download, FlaskConical, LayoutDashboard, RotateCcw, LogOut, User } from "lucide-react";
import { supabase } from "./lib/supabaseClient";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { SupplierCard } from "./components/SupplierCard";
import { SupplierDetail } from "./components/SupplierDetail";
import { AddSupplierDialog } from "./components/AddSupplierDialog";
import { PurchaseHistory } from "./components/PurchaseHistory";
import { ProductSearch } from "./components/ProductSearch";
import { Dashboard } from "./components/Dashboard";
import { RecentlyDeletedDialog } from "./components/RecentlyDeletedDialog";
import { PaymentNoticesBanner } from "./components/PaymentNoticesBanner";
import { StorageIndicator } from "./components/StorageIndicator";
import { LoginPage } from "./components/LoginPage";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { downloadMultiSupplierPurchaseTemplate, downloadBlankSupplierTemplate } from "./utils/downloadTemplates";
import { Toaster } from "sonner";
import { toast } from "sonner";

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
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchResults, setSearchResults] = useState<{ suppliers: Supplier[]; products: Product[] } | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [showRecentlyDeleted, setShowRecentlyDeleted] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1f3aab97`;
  const apiKey = publicAnonKey;

  // ── Auth bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      loadSuppliers();
      loadDeletedCount();
    }
  }, [session]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/suppliers`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (error) {
      console.error("Error loading suppliers:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDeletedCount = async () => {
    try {
      const res = await fetch(`${apiUrl}/suppliers/deleted`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await res.json();
      setDeletedCount((data.suppliers || []).length);
    } catch (err) {
      console.error("Error loading deleted count:", err);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    // Only call the unified /search endpoint on the Suppliers tab.
    // Products and Purchases tabs handle their own search via props.
    if (activeTab !== "suppliers") return;

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) {
        console.error("Search request failed:", response.status, response.statusText);
        return;
      }
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Error searching:", error);
    }
  };

  const handleAddSupplier = async (supplierData: any) => {
    try {
      const response = await fetch(`${apiUrl}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(supplierData),
      });
      const data = await response.json();
      if (response.ok) {
        setSuppliers([...suppliers, data.supplier]);
        setShowAddSupplier(false);
        toast.success("Supplier successfully added!");
      }
    } catch (error) {
      console.error("Error adding supplier:", error);
    }
  };

  const handleUpdateSupplier = async (updatedSupplier: Supplier) => {
    try {
      const response = await fetch(`${apiUrl}/suppliers/${updatedSupplier.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(updatedSupplier),
      });
      const data = await response.json();
      if (response.ok) {
        setSuppliers(suppliers.map((s) => (s.id === updatedSupplier.id ? data.supplier : s)));
        setSelectedSupplier(data.supplier);
      }
    } catch (error) {
      console.error("Error updating supplier:", error);
    }
  };

  const handleDeleteSupplier = (supplierId: string) => {
    setSuppliers(suppliers.filter((s) => s.id !== supplierId));
    setSelectedSupplier(null);
    loadDeletedCount();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    toast.success("You have been signed out.");
  };

  const displaySuppliers = searchResults ? searchResults.suppliers : suppliers;

  // ── Auth gate ──────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FDF8F0] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <FlaskConical className="h-10 w-10 text-green-900 animate-pulse" />
          <p className="text-green-800 font-semibold text-lg">Loading…</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LoginPage onLogin={(s) => setSession(s)} apiUrl={apiUrl} apiKey={apiKey} />
        <Toaster position="bottom-right" richColors />
      </>
    );
  }

  if (selectedSupplier) {
    return (
      <div className="min-h-screen bg-[#FDF8F0] p-8">
        <div className="max-w-6xl mx-auto">
          <SupplierDetail
            supplier={selectedSupplier}
            onBack={() => setSelectedSupplier(null)}
            onUpdate={handleUpdateSupplier}
            onDelete={handleDeleteSupplier}
            apiUrl={apiUrl}
            apiKey={apiKey}
          />
        </div>
      </div>
    );
  }

  const placeholderByTab: Record<string, string> = {
    suppliers: "Search suppliers by name or description…",
    products: "Search products by name, SKU, description, or supplier name…",
    purchases: "Filter purchase history by supplier or product name…",
  };

  const showSearch = activeTab !== "dashboard";

  // derive user display info
  const userName = session?.user?.user_metadata?.name || session?.user?.email?.split("@")[0] || "User";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#FDF8F0]">
      <div className="bg-green-950 border-b-4 border-amber-500 shadow-lg">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white">
                Wonder<span className="text-amber-400">zyme</span>
              </h1>
              <p className="text-green-200 mt-1 text-base">Inventory Management System</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <StorageIndicator apiUrl={apiUrl} apiKey={apiKey} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="bg-white/10 text-white border-white/30 hover:bg-white/20 hover:text-white text-base">
                    <Download className="h-5 w-5 mr-2" />
                    Download Templates
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuItem onClick={downloadBlankSupplierTemplate}>
                    Blank Supplier Template
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => downloadMultiSupplierPurchaseTemplate(suppliers)}
                    disabled={suppliers.length === 0}
                  >
                    Multi-Supplier Purchase Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setShowAddSupplier(true)} size="lg" className="bg-amber-500 hover:bg-amber-400 text-white font-bold shadow-sm text-base">
                <Plus className="h-5 w-5 mr-2" />
                Add Supplier
              </Button>
              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-3 py-2 transition-colors"
                    title={userEmail}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {userInitial}
                    </div>
                    <span className="text-white text-sm font-medium hidden sm:block max-w-[120px] truncate">
                      {userName}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-sm font-semibold text-green-900 truncate">{userName}</p>
                    <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 gap-2 cursor-pointer mt-1"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {showSearch && (
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-green-800" />
              <Input
                type="search"
                placeholder={placeholderByTab[activeTab] ?? "Search…"}
                className="pl-12 h-13 text-base bg-white border-transparent focus:border-amber-500 focus:ring-amber-500 text-green-950 placeholder:text-green-700/60 shadow-inner rounded-xl"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <PaymentNoticesBanner apiUrl={apiUrl} apiKey={apiKey} />
        <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setSearchQuery(""); setSearchResults(null); }}>
          <div className="flex justify-end mb-6">
            <TabsList className="bg-white border border-amber-200 shadow-sm">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-green-900 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#f59e0b] text-base px-4">
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="data-[state=active]:bg-green-900 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#f59e0b] text-base px-4">
                <Package className="h-4 w-4 mr-2" />
                Suppliers
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-green-900 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#f59e0b] text-base px-4">
                <FlaskConical className="h-4 w-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="purchases" className="data-[state=active]:bg-green-900 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#f59e0b] text-base px-4">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase History
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="dashboard" className="mt-6">
            <Dashboard
              apiUrl={apiUrl}
              apiKey={apiKey}
              onNavigate={(tab) => { setActiveTab(tab); setSearchQuery(""); setSearchResults(null); }}
            />
          </TabsContent>

          <TabsContent value="suppliers" className="mt-6">
            {/* Suppliers tab toolbar */}
            <div className="flex items-center justify-between mb-5">
              <div className="text-sm text-muted-foreground">
                {!loading && (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300 text-xs">
                      {displaySuppliers.length}
                    </span>
                    total supplier{displaySuppliers.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-800 hover:bg-red-50 hover:border-red-400 gap-2 font-semibold"
                onClick={() => setShowRecentlyDeleted(true)}
              >
                <RotateCcw className="h-4 w-4" />
                Recently Deleted
                {deletedCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-red-700 text-white text-xs font-bold">
                    {deletedCount}
                  </span>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="text-lg text-muted-foreground">Loading suppliers...</div>
              </div>
            ) : displaySuppliers.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery ? "No suppliers found" : "No suppliers yet"}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "Get started by adding your first supplier"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowAddSupplier(true)} className="bg-green-900 hover:bg-green-800 text-white font-bold">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Supplier
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displaySuppliers.map((supplier) => (
                    <SupplierCard
                      key={supplier.id}
                      supplier={supplier}
                      onViewDetails={setSelectedSupplier}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ProductSearch
              apiUrl={apiUrl}
              apiKey={apiKey}
              onViewSupplier={(supplier) => setSelectedSupplier(supplier)}
              query={searchQuery}
            />
          </TabsContent>

          <TabsContent value="purchases" className="mt-6">
            <PurchaseHistory apiUrl={apiUrl} apiKey={apiKey} supplierSearch={searchQuery} />
          </TabsContent>
        </Tabs>
      </div>

      <AddSupplierDialog
        open={showAddSupplier}
        onOpenChange={setShowAddSupplier}
        onAdd={handleAddSupplier}
      />

      <RecentlyDeletedDialog
        open={showRecentlyDeleted}
        onOpenChange={setShowRecentlyDeleted}
        apiUrl={apiUrl}
        apiKey={apiKey}
        onRestored={() => { loadSuppliers(); loadDeletedCount(); }}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}