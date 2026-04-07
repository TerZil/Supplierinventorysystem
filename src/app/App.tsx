import { useState, useEffect } from "react";
import { Search, Plus, ShoppingCart, Package, Download, FlaskConical } from "lucide-react";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { SupplierCard } from "./components/SupplierCard";
import { SupplierDetail } from "./components/SupplierDetail";
import { AddSupplierDialog } from "./components/AddSupplierDialog";
import { PurchaseHistory } from "./components/PurchaseHistory";
import { ProductSearch } from "./components/ProductSearch";
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
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchResults, setSearchResults] = useState<{ suppliers: Supplier[]; products: Product[] } | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("suppliers");

  const apiUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1f3aab97`;
  const apiKey = publicAnonKey;

  useEffect(() => {
    loadSuppliers();
  }, []);

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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
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
  };

  const displaySuppliers = searchResults ? searchResults.suppliers : suppliers;

  if (selectedSupplier) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-yellow-50 p-8">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-green-50 to-yellow-50">
      <div className="bg-green-700 border-b-4 border-yellow-400 shadow-md">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white">
                Wonder<span className="text-yellow-300">zyme</span>
              </h1>
              <p className="text-green-100 mt-1">Inventory Management System</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="lg" className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white">
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
              <Button onClick={() => setShowAddSupplier(true)} size="lg" className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold shadow-sm">
                <Plus className="h-5 w-5 mr-2" />
                Add Supplier
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-green-700" />
            <Input
              type="search"
              placeholder="Search suppliers and products..."
              className="pl-10 bg-white border-transparent focus:border-yellow-400 focus:ring-yellow-400 text-green-900 placeholder:text-green-700/50 shadow-inner"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border border-green-200">
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#facc15]">
              <Package className="h-4 w-4 mr-2" />
              Suppliers
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#facc15]">
              <FlaskConical className="h-4 w-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="purchases" className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-[inset_0_-2px_0_0_#facc15]">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Purchase History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-6">
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
                  <Button onClick={() => setShowAddSupplier(true)} className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Supplier
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground flex items-center gap-2">
                  {searchQuery && (
                    <>
                      <span>Found</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-semibold border border-yellow-300 text-xs">
                        {displaySuppliers.length}
                      </span>
                      <span>supplier{displaySuppliers.length !== 1 ? "s" : ""}</span>
                    </>
                  )}
                  {!searchQuery && (
                    <>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 font-semibold border border-yellow-300 text-xs">
                        {displaySuppliers.length}
                      </span>
                      <span>total supplier{displaySuppliers.length !== 1 ? "s" : ""}</span>
                    </>
                  )}
                </div>
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
            />
          </TabsContent>

          <TabsContent value="purchases" className="mt-6">
            <PurchaseHistory apiUrl={apiUrl} apiKey={apiKey} />
          </TabsContent>
        </Tabs>
      </div>

      <AddSupplierDialog
        open={showAddSupplier}
        onOpenChange={setShowAddSupplier}
        onAdd={handleAddSupplier}
      />

      <Toaster position="bottom-right" richColors />
    </div>
  );
}