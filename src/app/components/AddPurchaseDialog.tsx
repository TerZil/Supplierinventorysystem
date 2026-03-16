import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface AddPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  products: Product[];
  apiUrl: string;
  apiKey: string;
}

export function AddPurchaseDialog({ open, onOpenChange, supplier, products, apiUrl, apiKey }: AddPurchaseDialogProps) {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const addItem = () => {
    if (products.length === 0) {
      alert("Please add products to this supplier first.");
      return;
    }
    const firstProduct = products[0];
    setItems([
      ...items,
      {
        productId: firstProduct.id,
        productName: firstProduct.name,
        quantity: 1,
        price: firstProduct.price,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Update product name and price when product is changed
    if (field === "productId") {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].productName = product.name;
        newItems[index].price = product.price;
      }
    }
    
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert("Please add at least one item to the purchase.");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/purchases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          supplierId: supplier.id,
          supplierName: supplier.name,
          items,
          totalAmount,
          notes,
          purchaseDate: new Date(purchaseDate).toISOString(),
        }),
      });

      if (response.ok) {
        setItems([]);
        setNotes("");
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        onOpenChange(false);
        alert("Purchase recorded successfully!");
      }
    } catch (error) {
      console.error("Error recording purchase:", error);
      alert("Failed to record purchase. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Purchase from {supplier.name}</DialogTitle>
          <DialogDescription>Add items and details for this purchase order.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="purchase-date">Purchase Date</Label>
              <Input
                id="purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" onClick={addItem} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  No items added. Click "Add Item" to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 border rounded-lg bg-green-50">
                      <div className="flex-1 space-y-2">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(index, "productId", e.target.value)}
                          className="w-full px-3 py-2 border rounded-md bg-white"
                          required
                        >
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - ${product.price.toFixed(2)}/{product.unit}
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value))}
                            placeholder="Quantity"
                            required
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(e) => updateItem(index, "price", parseFloat(e.target.value))}
                            placeholder="Price"
                            required
                          />
                        </div>
                        <div className="text-sm font-medium text-green-700">
                          Subtotal: ${(item.quantity * item.price).toFixed(2)}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="purchase-notes">Notes</Label>
              <Textarea
                id="purchase-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this purchase"
                rows={3}
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total Amount:</span>
                <span className="text-green-700">${totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700">
              Record Purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
