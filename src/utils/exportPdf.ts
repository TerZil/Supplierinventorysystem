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
    `₱${product.price.toFixed(2)}`,
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
    `₱${purchase.totalAmount.toFixed(2)}`,
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

export function exportSupplierPurchaseHistoryPDF(supplier: Supplier, purchases: Purchase[]) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header banner ──────────────────────────────────────────────
  doc.setFillColor(21, 128, 61); // green-700
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text(`Purchase History: ${supplier.name}`, 14, 14);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 14, 24);

  // ── Summary row ────────────────────────────────────────────────
  const totalSpend = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalItems = purchases.reduce((sum, p) => sum + p.items.reduce((s, i) => s + i.quantity, 0), 0);

  doc.setFillColor(240, 253, 244); // green-50
  doc.setDrawColor(187, 247, 208); // green-200
  doc.roundedRect(14, 38, pageWidth - 28, 22, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Purchases: ${purchases.length}`, 20, 47);
  doc.text(`Total Items Ordered: ${totalItems}`, 80, 47);
  doc.text(`Total Spend: \u20B1${totalSpend.toFixed(2)}`, 155, 47);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Supplier: ${supplier.name}  |  Email: ${supplier.contactEmail || "N/A"}  |  Phone: ${supplier.contactPhone || "N/A"}`, 20, 56);

  // ── Purchases table ────────────────────────────────────────────
  if (purchases.length === 0) {
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("No purchases recorded for this supplier.", 14, 75);
  } else {
    const tableRows = purchases.flatMap((purchase, index) => {
      const dateStr = new Date(purchase.purchaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      return purchase.items.map((item, itemIndex) => [
        itemIndex === 0 ? `#${index + 1}  ${dateStr}` : "",
        item.productName,
        String(item.quantity),
        `\u20B1${item.price.toFixed(2)}`,
        `\u20B1${(item.quantity * item.price).toFixed(2)}`,
        itemIndex === 0 ? `\u20B1${purchase.totalAmount.toFixed(2)}` : "",
        itemIndex === 0 ? (purchase.notes || "—") : "",
      ]);
    });

    autoTable(doc, {
      startY: 66,
      head: [["Date", "Product", "Qty", "Unit Price", "Subtotal", "Order Total", "Notes"]],
      body: tableRows,
      theme: "grid",
      headStyles: {
        fillColor: [21, 128, 61],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [30, 41, 59],
        cellPadding: 3,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: "bold" },
        1: { cellWidth: 45 },
        2: { cellWidth: 12, halign: "center" },
        3: { cellWidth: 24, halign: "right" },
        4: { cellWidth: 24, halign: "right" },
        5: { cellWidth: 26, halign: "right", fontStyle: "bold", textColor: [21, 128, 61] },
        6: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      // Draw a subtle dividing line between purchase groups
      didParseCell(data) {
        if (data.section === "body" && data.column.index === 0 && data.cell.raw !== "") {
          data.cell.styles.fillColor = [240, 253, 244]; // green-50 for first row of each purchase
        }
      },
    });

    // ── Footer total ───────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    doc.setFillColor(21, 128, 61);
    doc.setDrawColor(21, 128, 61);
    doc.roundedRect(pageWidth - 80, finalY, 66, 12, 2, 2, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`Grand Total:  \u20B1${totalSpend.toFixed(2)}`, pageWidth - 76, finalY + 8);
  }

  doc.save(`${supplier.name.replace(/\s+/g, "_")}_Purchase_History.pdf`);
}