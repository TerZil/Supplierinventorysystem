import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

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
  paymentDueDate?: string;
  paymentStatus?: "paid" | "unpaid";
  paymentPaidAt?: string;
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
  const doc = new jsPDF({ orientation: "landscape" });

  // ── Header banner ──────────────────────────────────────────────
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("Purchase History", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}   •   ${purchases.length} record${purchases.length !== 1 ? "s" : ""}`,
    14, 21
  );

  // ── Summary stats ─────────────────────────────────────────────
  const totalSpend  = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const unpaidCount = purchases.filter(p => p.paymentDueDate && p.paymentStatus !== "paid").length;
  const paidCount   = purchases.filter(p => p.paymentStatus === "paid").length;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, 34, pageWidth - 28, 16, 2, 2, "FD");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(21, 128, 61);
  doc.text(`Total Spend: \u20B1${totalSpend.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`, 20, 44);
  doc.text(`Paid: ${paidCount}`, 110, 44);
  doc.text(`Unpaid: ${unpaidCount}`, 155, 44);

  // ── Table ─────────────────────────────────────────────────────
  const tableData = purchases.map(p => {
    // Payment status label
    let statusLabel = "—";
    if (p.paymentDueDate) {
      statusLabel = p.paymentStatus === "paid" ? "Paid" : "Unpaid";
    }
    const dueDate  = p.paymentDueDate
      ? new Date(p.paymentDueDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : "—";
    const paidDate = p.paymentPaidAt
      ? new Date(p.paymentPaidAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : "—";

    return [
      new Date(p.purchaseDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
      p.supplierName,
      p.items.map(i => `${i.productName} ×${i.quantity}`).join("\n"),
      `\u20B1${p.totalAmount.toFixed(2)}`,
      statusLabel,
      dueDate,
      paidDate,
      p.notes || "—",
    ];
  });

  autoTable(doc, {
    startY: 56,
    head: [["Date", "Supplier", "Items", "Total (₱)", "Payment", "Due Date", "Paid On", "Notes"]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: "bold", fontSize: 9 },
    styles: { cellPadding: 3, fontSize: 9, valign: "middle" },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 38 },
      2: { cellWidth: 60 },
      3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 28 },
      6: { cellWidth: 28 },
      7: { cellWidth: "auto" },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 4) {
        const val = String(data.cell.raw);
        if (val === "Paid")   { data.cell.styles.textColor = [21, 128, 61]; data.cell.styles.fontStyle = "bold"; }
        if (val === "Unpaid") { data.cell.styles.textColor = [194, 65, 12];  data.cell.styles.fontStyle = "bold"; }
      }
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save("Purchase_History.pdf");
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

export function exportPurchaseHistoryExcel(purchases: Purchase[]) {
  // Flatten each purchase into one row per item for full detail
  const rows: Record<string, any>[] = [];

  for (const purchase of purchases) {
    // Payment status label
    let statusLabel = "—";
    if (purchase.paymentDueDate) {
      statusLabel = purchase.paymentStatus === "paid" ? "Paid" : "Unpaid";
    }
    const dueDate  = purchase.paymentDueDate
      ? new Date(purchase.paymentDueDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : "—";
    const paidDate = purchase.paymentPaidAt
      ? new Date(purchase.paymentPaidAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : "—";

    purchase.items.forEach((item, idx) => {
      rows.push({
        "Purchase Date": new Date(purchase.purchaseDate).toLocaleDateString("en-PH", {
          year: "numeric", month: "short", day: "numeric",
        }),
        "Supplier": purchase.supplierName,
        "Product Name": item.productName,
        "Quantity": item.quantity,
        "Unit Price (₱)": Number(item.price.toFixed(2)),
        "Subtotal (₱)": Number((item.quantity * item.price).toFixed(2)),
        // Only show order-level fields on the first item row
        "Order Total (₱)": idx === 0 ? Number(purchase.totalAmount.toFixed(2)) : "",
        "Payment Status":  idx === 0 ? statusLabel : "",
        "Payment Due Date": idx === 0 ? dueDate : "",
        "Date Paid":       idx === 0 ? paidDate : "",
        "Notes":           idx === 0 ? (purchase.notes || "") : "",
      });
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Column widths
  worksheet["!cols"] = [
    { wch: 18 }, // Purchase Date
    { wch: 24 }, // Supplier
    { wch: 28 }, // Product Name
    { wch: 10 }, // Quantity
    { wch: 16 }, // Unit Price
    { wch: 16 }, // Subtotal
    { wch: 16 }, // Order Total
    { wch: 16 }, // Payment Status
    { wch: 18 }, // Payment Due Date
    { wch: 18 }, // Date Paid
    { wch: 32 }, // Notes
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Purchase History");

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Purchase_History_${dateStr}.xlsx`);
}