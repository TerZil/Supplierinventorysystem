import { useState, useEffect } from "react";
import { Building2, Mail, Phone, MapPin, ArrowLeft, Edit, Plus, Trash2, Search, Download } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { AddProductDialog } from "./AddProductDialog";
import { AddPurchaseDialog } from "./AddPurchaseDialog";
import { Badge } from "./ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { downloadSupplierTemplate, downloadSingleSupplierPurchaseTemplate } from "../utils/downloadTemplates";

import { exportSupplierProfilePDF } from "../../utils/exportPdf";

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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddPurchase, setShowAddPurchase] = useState(false);
  const [loading, setLoading] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  useEffect(() => {
    loadProducts();
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
        setProducts(products.filter(p => p.id !== productId));
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const handleDeleteSupplier = async () => {
    if (!confirm("Are you sure you want to delete this supplier? This will also delete all associated products.")) return;
    
    try {
      const response = await fetch(`${apiUrl}/suppliers/${supplier.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (response.ok) {
        if (onDelete) {
          onDelete(supplier.id);
        }
        onBack();
      }
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="outline" onClick={onBack} size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-green-700 truncate">{supplier.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white">
              <Download className="h-4 w-4 mr-2" />
              Export Options
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuItem
              onClick={() => exportSupplierProfilePDF(supplier, products)}
            >
              Export Profile & Products (PDF)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => downloadSupplierTemplate(supplier, products)}
            >
              Supplier Profile & Products (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => downloadSingleSupplierPurchaseTemplate(supplier, products)}
            >
              Purchase Record Template (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
          <Button
            variant={isEditing ? "default" : "outline"}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={isEditing ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Edit className="h-4 w-4 mr-2" />
            {isEditing ? "Save Changes" : "Edit Supplier"}
          </Button>
        </div>
      </div>

      <Card className="border-green-200">
        <CardHeader>
          <CardTitle>Supplier Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Contact Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Contact Phone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium">Description</div>
                  <div className="text-muted-foreground">{supplier.description || "No description"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-muted-foreground">{supplier.contactEmail || "Not provided"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Phone</div>
                  <div className="text-muted-foreground">{supplier.contactPhone || "Not provided"}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">Address</div>
                  <div className="text-muted-foreground">{supplier.address || "Not provided"}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-yellow-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Products & Pricing</CardTitle>
              <CardDescription>Manage products from this supplier</CardDescription>
            </div>
            <Button onClick={() => setShowAddProduct(true)} className="bg-yellow-500 hover:bg-yellow-600 text-black">
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
                  className="pl-10 bg-white border-yellow-200 focus:border-yellow-500"
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
                <div
                  key={product.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-yellow-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{product.name}</h4>
                      {product.sku && <Badge variant="outline">{product.sku}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{product.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="font-medium text-green-700">${product.price.toFixed(2)}</span>
                      <span className="text-muted-foreground">per {product.unit}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              </div>
              {productSearchQuery && products.filter((product) => {
                const query = productSearchQuery.toLowerCase();
                return (
                  product.name.toLowerCase().includes(query) ||
                  product.description?.toLowerCase().includes(query) ||
                  product.sku?.toLowerCase().includes(query)
                );
              }).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No products found matching "{productSearchQuery}"
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => setShowAddPurchase(true)} size="lg" className="bg-green-600 hover:bg-green-700">
          <Plus className="h-5 w-5 mr-2" />
          Record Purchase
        </Button>
      </div>

      {onDelete && (
        <div className="border-t pt-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
              <CardDescription>Permanently delete this supplier and all associated data</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleDeleteSupplier} 
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Supplier
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <AddProductDialog
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        onAdd={handleAddProduct}
      />

      <AddPurchaseDialog
        open={showAddPurchase}
        onOpenChange={setShowAddPurchase}
        supplier={supplier}
        products={products}
        apiUrl={apiUrl}
        apiKey={apiKey}
      />
    </div>
  );
}