import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { X, Plus } from "lucide-react";

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
}

interface EditPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase: Purchase;
  onUpdate: (purchase: Purchase) => void;
}

export function EditPurchaseDialog({ open, onOpenChange, purchase, onUpdate }: EditPurchaseDialogProps) {
  const [formData, setFormData] = useState<Purchase>(purchase);

  useEffect(() => {
    setFormData(purchase);
  }, [purchase]);

  const handleUpdateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    const totalAmount = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setFormData({ ...formData, items: newItems, totalAmount });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const totalAmount = newItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    setFormData({ ...formData, items: newItems, totalAmount });
  };

  const handleAddItem = () => {
    const newItems = [...formData.items, { productId: "", productName: "", quantity: 1, price: 0 }];
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
          <DialogDescription>
            Update purchase details, items, quantities, and pricing information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Supplier</Label>
            <Input
              id="supplier-name"
              value={formData.supplierName}
              onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="purchase-date">Purchase Date</Label>
            <Input
              id="purchase-date"
              type="date"
              value={formData.purchaseDate.split('T')[0]}
              onChange={(e) => setFormData({ ...formData, purchaseDate: new Date(e.target.value).toISOString() })}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items</Label>
              <Button type="button" onClick={handleAddItem} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start bg-white p-3 rounded border">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Product name"
                      value={item.productName}
                      onChange={(e) => handleUpdateItem(index, "productName", e.target.value)}
                      required
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Quantity"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(index, "quantity", parseInt(e.target.value) || 0)}
                        required
                      />
                      <Input
                        type="number"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleUpdateItem(index, "price", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Subtotal: ₱{(item.quantity * item.price).toFixed(2)}
                    </div>
                  </div>
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-lg font-semibold">
              Total: <span className="text-green-700">₱{formData.totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Update Purchase
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}