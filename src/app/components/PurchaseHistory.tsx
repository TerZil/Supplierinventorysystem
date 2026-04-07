import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Calendar, DollarSign, Package, Edit, Trash2, Download, Search, X, Star } from "lucide-react";
import { EditPurchaseDialog } from "./EditPurchaseDialog";

import { exportPurchaseHistoryPDF } from "../../utils/exportPdf";

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

interface PurchaseHistoryProps {
  apiUrl: string;
  apiKey: string;
}

export function PurchaseHistory({ apiUrl, apiKey }: PurchaseHistoryProps) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");

  useEffect(() => {
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/purchases`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = await response.json();
      setPurchases(data.purchases || []);
    } catch (error) {
      console.error("Error loading purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
        const updatedPurchases = purchases.map(p => p.id === updatedPurchase.id ? data.purchase : p);
        // Re-sort after update
        updatedPurchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
        setPurchases(updatedPurchases);
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
        setPurchases(purchases.filter(p => p.id !== purchaseId));
      }
    } catch (error) {
      console.error("Error deleting purchase:", error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading purchase history...</div>;
  }

  if (purchases.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No purchases recorded yet.
        </CardContent>
      </Card>
    );
  }

  const filteredPurchases = supplierSearch.trim()
    ? purchases.filter((p) =>
        p.supplierName.toLowerCase().includes(supplierSearch.trim().toLowerCase())
      )
    : purchases;

  // Determine the ID of the latest purchase when a supplier is filtered
  const latestPurchaseId =
    supplierSearch.trim() && filteredPurchases.length > 0
      ? filteredPurchases.reduce((latest, p) =>
          new Date(p.purchaseDate) > new Date(latest.purchaseDate) ? p : latest
        ).id
      : null;

  const exportTarget = supplierSearch.trim() ? filteredPurchases : purchases;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-green-700">Purchase History</h2>
        <Button
          onClick={() => exportPurchaseHistoryPDF(exportTarget)}
          variant="outline"
          className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-semibold border-yellow-400"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>

      {/* Supplier search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
        <Input
          type="search"
          placeholder="Search by supplier name..."
          className="pl-10 pr-10 bg-white border-green-200 focus:border-green-500 text-green-900 placeholder:text-green-400"
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
        />
        {supplierSearch && (
          <button
            onClick={() => setSupplierSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 hover:text-green-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Result summary */}
      {supplierSearch.trim() && (
        <div className="flex items-center gap-2 text-sm">
          {filteredPurchases.length > 0 ? (
            <>
              <span className="text-green-700 font-medium">
                {filteredPurchases.length} purchase{filteredPurchases.length !== 1 ? "s" : ""} found
              </span>
              <span className="text-muted-foreground">for</span>
              <Badge className="bg-green-100 text-green-800 border border-green-300">
                {supplierSearch}
              </Badge>
            </>
          ) : (
            <span className="text-muted-foreground">
              No purchases found for&nbsp;
              <span className="font-medium text-green-700">"{supplierSearch}"</span>
            </span>
          )}
        </div>
      )}

      {filteredPurchases.map((purchase) => (
        <Card
          key={purchase.id}
          className={`border-yellow-200 transition-all ${
            purchase.id === latestPurchaseId
              ? "ring-2 ring-green-500 border-green-300 shadow-md"
              : ""
          }`}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-lg">{purchase.supplierName}</CardTitle>
                  {purchase.id === latestPurchaseId && (
                    <Badge className="bg-green-600 text-white text-xs flex items-center gap-1">
                      <Star className="h-3 w-3 fill-white" />
                      Latest Purchase
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(purchase.purchaseDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {purchase.items.length} item{purchase.items.length !== 1 ? "s" : ""}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-right mr-4">
                  <div className="text-2xl font-bold text-green-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1">₱{purchase.totalAmount.toFixed(2)}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingPurchase(purchase)}
                  className="hover:bg-green-50"
                >
                  <Edit className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeletePurchase(purchase.id)}
                  className="hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {purchase.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">₱{item.price.toFixed(2)} each</span>
                    <span className="ml-3 font-medium">₱{(item.quantity * item.price).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            {purchase.notes && (
              <div className="mt-4 p-3 bg-green-50 rounded text-sm">
                <div className="font-medium text-green-900 mb-1">Notes:</div>
                <div className="text-muted-foreground">{purchase.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

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