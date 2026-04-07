import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Plus, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
  onSuccess?: (purchase: any) => void;
}

export function AddPurchaseDialog({ open, onOpenChange, supplier, products, apiUrl, apiKey, onSuccess }: AddPurchaseDialogProps) {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);

  const addItem = () => {
    if (products.length === 0) {
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[340px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">No Products Available</p>
            <p className="text-xs text-red-600 mt-0.5">Please add products to this supplier first.</p>
          </div>
        </div>
      ));
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
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[340px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">No Items Added</p>
            <p className="text-xs text-red-600 mt-0.5">Please add at least one item to the purchase.</p>
          </div>
        </div>
      ));
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
        const data = await response.json();
        setItems([]);
        setNotes("");
        setPurchaseDate(new Date().toISOString().split('T')[0]);
        onOpenChange(false);
        if (onSuccess) onSuccess(data.purchase);
        toast.custom(() => (
          <div className="flex items-start gap-3 bg-green-700 text-white px-4 py-3 rounded-xl shadow-lg w-[340px] border border-green-600">
            <CheckCircle2 className="h-5 w-5 text-green-200 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Purchase Recorded!</p>
              <p className="text-xs text-green-100 mt-0.5">
                Purchase from <span className="font-medium text-white">{supplier.name}</span> has been saved successfully.
              </p>
            </div>
          </div>
        ));
      }
    } catch (error) {
      console.error("Error recording purchase:", error);
      toast.custom(() => (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl shadow-lg w-[340px]">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Failed to Record Purchase</p>
            <p className="text-xs text-red-600 mt-0.5">Something went wrong. Please try again.</p>
          </div>
        </div>
      ));
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
                              {product.name} - ₱{product.price.toFixed(2)}/{product.unit}
                            </option>
                          ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={isNaN(item.quantity) ? "" : item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              updateItem(index, "quantity", isNaN(val) ? 0 : val);
                            }}
                            placeholder="Quantity"
                            required
                          />
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={isNaN(item.price) ? "" : item.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              updateItem(index, "price", isNaN(val) ? 0 : val);
                            }}
                            placeholder="Price"
                            required
                          />
                        </div>
                        <div className="text-sm font-medium text-green-700">
                          Subtotal: ₱{(item.quantity * item.price).toFixed(2)}
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
                <span className="text-green-700">₱{totalAmount.toFixed(2)}</span>
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