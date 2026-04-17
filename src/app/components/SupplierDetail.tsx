import { useState, useEffect } from "react";
import { Building2, Mail, Phone, MapPin, ArrowLeft, Edit, Plus, Trash2, Search, Download, Calendar, Package, ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AddProductDialog } from "./AddProductDialog";
import { AddPurchaseDialog } from "./AddPurchaseDialog";
import { EditPurchaseDialog } from "./EditPurchaseDialog";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { downloadSupplierTemplate, downloadSingleSupplierPurchaseTemplate } from "../utils/downloadTemplates";

import { exportSupplierProfilePDF, exportSupplierPurchaseHistoryPDF } from "../../utils/exportPdf";
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
}

interface SupplierDetailProps {
  supplier: Supplier;
  onBack: () => void;
  onUpdate: (supplier: Supplier) => void;
  onDelete?: (supplierId: string) => void;
  apiUrl: string;
  apiKey: string;
}

export function SupplierDetail({ supplier, onBack, onUpdate, onDelete, apiUrl, apiKey }: SupplierDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(supplier);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  useEffect(() => {
    loadProducts();
    loadPurchases();
  }, [supplier.id]);

  const loadProducts = async () => {
    try {
      const response = await fetch(`${apiUrl}/products/${supplier.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const loadPurchases = async () => {
    try {
      setPurchasesLoading(true);
      const response = await fetch(`${apiUrl}/purchases/supplier/${supplier.id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      setPurchases(data.purchases || []);
    } catch (error) {
      console.error("Error loading purchases:", error);
    } finally {
      setPurchasesLoading(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const handleSave = () => {
    onUpdate(formData);
    setIsEditing(false);
  };

  const handleAddProduct = async (product: any) => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ ...product, supplierId: supplier.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setProducts([...products, data.product]);
        setShowAddProduct(false);
        toast.success("Successfully added product!");
      }
    } catch (error) {
      console.error("Error adding product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await fetch(`${apiUrl}/products/${supplier.id}/${productId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        setProducts(products.filter((p) => p.id !== productId));
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handlePurchaseAdded = (newPurchase: Purchase) => {
    setPurchases((prev) =>
      [newPurchase, ...prev].sort(
        (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
      )
    );
  };

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
        setPurchases((prev) =>
          prev
            .map((p) => (p.id === updatedPurchase.id ? data.purchase : p))
            .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime())
        );
        setEditingPurchase(null);
      }
    } catch (error) {
      console.error("Error updating purchase:", error);
    }
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm("Are you sure you want to delete this purchase record?")) return;
    try {
      const response = await fetch(`${apiUrl}/purchases/${purchaseId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        setPurchases((prev) => prev.filter((p) => p.id !== purchaseId));
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!confirm("Are you sure you want to delete this supplier? They will be moved to Recently Deleted and can be restored within 30 days.")) return;
    try {
      const response = await fetch(`${apiUrl}/suppliers/${supplier.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        toast.success(`"${supplier.name}" moved to Recently Deleted.`, {
          description: "You can restore it within 30 days from the Suppliers tab.",
        });
        if (onDelete) onDelete(supplier.id);
        onBack();
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier.");
    }
  };

  const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="outline" onClick={onBack} size="icon" className="border-amber-300 hover:bg-amber-50">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-green-900">{supplier.name}</h1>
            <div className="h-1 w-16 bg-amber-500 rounded-full mt-1" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white font-semibold">
                <Download className="h-4 w-4 mr-2" />
                Export Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onClick={() => exportSupplierProfilePDF(supplier, products)}>
                Export Profile & Products (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportSupplierPurchaseHistoryPDF(supplier, purchases)}>
                Export Purchase History (PDF)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadSupplierTemplate(supplier, products)}>
                Supplier Profile & Products (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadSingleSupplierPurchaseTemplate(supplier, products)}>
                Purchase Record Template (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
            className={isEditing ? "bg-green-900 hover:bg-green-800 font-bold" : "font-semibold"}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Save Changes" : "Edit Supplier"}
          </Button>
        </div>
      </div>

      {/* Supplier Info */}
      <Card className="border-green-200 border-2">
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea id="edit-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Contact Email</Label>
                  <Input id="edit-email" type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Contact Phone</Label>
                  <Input id="edit-phone" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-green-800 mt-0.5" />
                <div>
                  <div className="font-bold text-gray-900">Description</div>
                  <div className="text-muted-foreground">{supplier.description || "No description"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-800" />
                <div>
                  <div className="font-bold text-gray-900">Email</div>
                  <div className="text-muted-foreground">{supplier.contactEmail || "Not provided"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-green-800" />
                <div>
                  <div className="font-bold text-gray-900">Phone</div>
                  <div className="text-muted-foreground">{supplier.contactPhone || "Not provided"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-800" />
                <div>
                  <div className="font-bold text-gray-900">Address</div>
                  <div className="text-muted-foreground">{supplier.address || "Not provided"}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Products */}
      <Card className="border-amber-300 border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products &amp; Pricing</CardTitle>
              <CardDescription>Manage products from this supplier</CardDescription>
            </div>
            <Button onClick={() => setShowAddProduct(true)} className="bg-amber-500 hover:bg-amber-400 text-white font-bold">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products added yet. Click "Add Product" to get started.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products by name, description, or SKU..."
                  className="pl-10 bg-white border-amber-200 focus:border-amber-500"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                {products
                  .filter((product) => {
                    if (!productSearchQuery.trim()) return true;
                    const query = productSearchQuery.toLowerCase();
                    return (
                      product.name.toLowerCase().includes(query) ||
                      product.description?.toLowerCase().includes(query) ||
                      product.sku?.toLowerCase().includes(query)
                    );
                  })
                  .map((product) => (
                    <div key={product.id} className="flex items-start justify-between p-4 border-2 border-amber-100 rounded-lg hover:bg-amber-50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{product.name}</h4>
                          {product.sku && <Badge variant="outline" className="border-amber-300 text-amber-800">{product.sku}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <span className="font-bold text-green-900">₱{product.price.toFixed(2)}</span>
                          <span className="text-muted-foreground">per {product.unit}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteProduct(product.id)} className="text-red-700 hover:text-red-800 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
              </div>
              {productSearchQuery &&
                products.filter((p) => {
                  const q = productSearchQuery.toLowerCase();
                  return p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
                }).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No products found matching "{productSearchQuery}"
                  </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card className="border-green-300 border-2 border-t-4 border-t-amber-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-green-800" />
                Purchase History
              </CardTitle>
              <CardDescription>
                {purchases.length > 0 ? (
                  <span className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold border border-amber-300 text-xs">
                      {purchases.length} purchase{purchases.length !== 1 ? "s" : ""}
                    </span>
                    <span>·</span>
                    <span>Total spend: <strong className="text-green-900">₱{totalSpend.toFixed(2)}</strong></span>
                  </span>
                ) : "No purchases recorded yet"}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSupplierPurchaseHistoryPDF(supplier, purchases)}
                disabled={purchases.length === 0}
                className="bg-amber-500 hover:bg-amber-400 text-white font-bold border-amber-500 disabled:opacity-40"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={() => setShowAddPurchase(true)} className="bg-green-900 hover:bg-green-800 text-white font-bold">
                <Plus className="h-4 w-4 mr-2" />
                Record Purchase
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {purchasesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading purchase history...</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-10">
              <ShoppingCart className="h-10 w-10 text-green-200 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No purchases have been recorded for this supplier yet.</p>
              <Button onClick={() => setShowAddPurchase(true)} className="mt-4 bg-green-900 hover:bg-green-800 text-white font-bold" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Record First Purchase
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {purchases.map((purchase, index) => (
                <div
                  key={purchase.id}
                  className={`rounded-lg border-2 p-4 transition-colors ${
                    index === 0
                      ? "border-green-400 bg-green-50 ring-1 ring-green-400"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(purchase.purchaseDate)}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground font-medium">
                          <Package className="h-3.5 w-3.5" />
                          {purchase.items.length} item{purchase.items.length !== 1 ? "s" : ""}
                        </span>
                        {index === 0 && (
                          <Badge className="bg-green-800 text-white text-xs">Latest</Badge>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        {purchase.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-gray-800 font-medium">
                              {item.productName}
                              <span className="text-muted-foreground ml-1">× {item.quantity}</span>
                            </span>
                            <span className="font-bold text-green-900">
                              ₱{(item.quantity * item.price).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                      {purchase.notes && (
                        <p className="mt-2 text-xs text-muted-foreground italic">{purchase.notes}</p>
                      )}
                    </div>
                    <div className="flex items-start gap-1 shrink-0">
                      <div className="text-right mr-2">
                        <div className="text-lg font-bold text-green-900 bg-amber-50 border border-amber-300 rounded-lg px-2 py-0.5">₱{purchase.totalAmount.toFixed(2)}</div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setEditingPurchase(purchase)} className="hover:bg-green-100 h-8 w-8">
                        <Edit className="h-3.5 w-3.5 text-green-800" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeletePurchase(purchase.id)} className="hover:bg-red-50 h-8 w-8">
                        <Trash2 className="h-3.5 w-3.5 text-red-700" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {onDelete && (
        <div className="border-t pt-6">
          <Card className="border-red-300 border-2 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900 font-bold">Danger Zone</CardTitle>
              <CardDescription className="text-red-700">
                Delete this supplier — they'll be moved to <strong>Recently Deleted</strong> and can be restored within 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleDeleteSupplier} variant="destructive" className="bg-red-700 hover:bg-red-800 font-bold text-base">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Supplier
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <AddProductDialog open={showAddProduct} onOpenChange={setShowAddProduct} onAdd={handleAddProduct} />

      <AddPurchaseDialog
        open={showAddPurchase}
        onOpenChange={setShowAddPurchase}
        supplier={supplier}
        products={products}
        apiUrl={apiUrl}
        apiKey={apiKey}
        onSuccess={handlePurchaseAdded}
      />

      {editingPurchase && (
        <EditPurchaseDialog
          open={!!editingPurchase}
          onOpenChange={(open) => !open && setEditingPurchase(null)}
          purchase={editingPurchase}
          onUpdate={handleUpdatePurchase}
        />
      )}
    </div>
  );
}