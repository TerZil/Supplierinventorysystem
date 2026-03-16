import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export function exportSupplierProfilePDF(supplier: Supplier, products: Product[]) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text(`Supplier Profile: ${supplier.name}`, 14, 22);
  
  // Supplier Details
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(`Description: ${supplier.description || 'N/A'}`, 14, 32);
  doc.text(`Email: ${supplier.contactEmail || 'N/A'}`, 14, 40);
  doc.text(`Phone: ${supplier.contactPhone || 'N/A'}`, 14, 48);
  doc.text(`Address: ${supplier.address || 'N/A'}`, 14, 56);
  
  // Products Table
  doc.setFontSize(16);
  doc.setTextColor(21, 128, 61);
  doc.text('Products List', 14, 70);
  
  const tableData = products.map(product => [
    product.name,
    product.sku || 'N/A',
    product.description || 'N/A',
    `$${product.price.toFixed(2)}`,
    product.unit
  ]);
  
  autoTable(doc, {
    startY: 75,
    head: [['Product Name', 'SKU', 'Description', 'Price', 'Unit']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [21, 128, 61] }
  });
  
  doc.save(`${supplier.name.replace(/\s+/g, '_')}_Profile.pdf`);
}

export function exportPurchaseHistoryPDF(purchases: Purchase[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(21, 128, 61); // Green-700
  doc.text('Purchase History', 14, 22);
  
  const tableData = purchases.map(purchase => [
    new Date(purchase.purchaseDate).toLocaleDateString(),
    purchase.supplierName,
    purchase.items.map(item => `${item.productName} (x${item.quantity})`).join('\n'),
    `$${purchase.totalAmount.toFixed(2)}`,
    purchase.notes || 'N/A'
  ]);
  
  autoTable(doc, {
    startY: 30,
    head: [['Date', 'Supplier', 'Items', 'Total Amount', 'Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [21, 128, 61] },
    styles: { cellPadding: 3, fontSize: 10, valign: 'middle' },
  });
  
  doc.save('Purchase_History.pdf');
}
