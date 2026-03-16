import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Calendar, DollarSign, Package, Edit, Trash2, Download } from "lucide-react";
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-green-700">Purchase History</h2>
        <Button 
          onClick={() => exportPurchaseHistoryPDF(purchases)}
          variant="outline"
          className="bg-white"
        >
          <Download className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
      </div>
      {purchases.map((purchase) => (
        <Card key={purchase.id} className="border-yellow-200">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{purchase.supplierName}</CardTitle>
                <CardDescription className="flex items-center gap-4 mt-2">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(purchase.purchaseDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-start gap-2">
                <div className="text-right mr-4">
                  <div className="text-2xl font-bold text-green-700">${purchase.totalAmount.toFixed(2)}</div>
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
                    <span className="text-muted-foreground">${item.price.toFixed(2)} each</span>
                    <span className="ml-3 font-medium">${(item.quantity * item.price).toFixed(2)}</span>
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