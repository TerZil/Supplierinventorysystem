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

// Convert data to CSV format
function convertToCSV(data: any[], headers: string[]): string {
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if contains comma
      const escaped = String(value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// Trigger file download
function downloadFile(content: string, filename: string, type: string = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// Download supplier profile with products
export function downloadSupplierTemplate(supplier: Supplier, products: Product[]) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Supplier info section
  const supplierInfo = [
    ['SUPPLIER INFORMATION', ''],
    ['Name', supplier.name],
    ['Description', supplier.description],
    ['Contact Email', supplier.contactEmail],
    ['Contact Phone', supplier.contactPhone],
    ['Address', supplier.address],
    ['', ''],
    ['PRODUCTS', ''],
  ];
  
  // Products section headers
  const productHeaders = ['Product Name', 'Description', 'SKU', 'Price', 'Unit'];
  
  // Products data
  const productsData = products.map(p => ({
    'Product Name': p.name,
    'Description': p.description,
    'SKU': p.sku,
    'Price': p.price,
    'Unit': p.unit,
  }));
  
  // Combine supplier info and products
  let csvContent = supplierInfo.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  csvContent += '\n' + convertToCSV(productsData, productHeaders);
  
  downloadFile(csvContent, `${supplier.name.replace(/\s+/g, '_')}_Profile_${timestamp}.csv`);
}

// Download blank purchase template for a specific supplier
export function downloadSingleSupplierPurchaseTemplate(supplier: Supplier, products: Product[]) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Purchase header info
  const headerInfo = [
    ['PURCHASE RECORD TEMPLATE', ''],
    ['Supplier Name', supplier.name],
    ['Supplier ID', supplier.id],
    ['Purchase Date', timestamp],
    ['Notes', ''],
    ['', ''],
    ['ITEMS', ''],
  ];
  
  // Items section
  const itemHeaders = ['Product Name', 'Product ID', 'SKU', 'Quantity', 'Unit Price', 'Subtotal'];
  
  // Add sample rows with actual products
  const itemsData = products.map(p => ({
    'Product Name': p.name,
    'Product ID': p.id,
    'SKU': p.sku,
    'Quantity': '',
    'Unit Price': p.price,
    'Subtotal': '',
  }));
  
  // Add empty rows for additional items
  for (let i = 0; i < 3; i++) {
    itemsData.push({
      'Product Name': '',
      'Product ID': '',
      'SKU': '',
      'Quantity': '',
      'Unit Price': '',
      'Subtotal': '',
    });
  }
  
  // Footer
  const footer = [
    ['', ''],
    ['TOTAL AMOUNT', ''],
  ];
  
  let csvContent = headerInfo.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  csvContent += '\n' + convertToCSV(itemsData, itemHeaders);
  csvContent += '\n' + footer.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  downloadFile(csvContent, `Purchase_Template_${supplier.name.replace(/\s+/g, '_')}_${timestamp}.csv`);
}

// Download blank purchase template for multiple suppliers
export function downloadMultiSupplierPurchaseTemplate(suppliers: Supplier[]) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Purchase header info
  const headerInfo = [
    ['MULTI-SUPPLIER PURCHASE RECORD TEMPLATE', ''],
    ['Purchase Date', timestamp],
    ['Notes', ''],
    ['', ''],
    ['ITEMS', ''],
  ];
  
  // Items section
  const itemHeaders = ['Supplier Name', 'Product Name', 'SKU', 'Quantity', 'Unit Price', 'Subtotal'];
  
  // Add sample rows for each supplier
  const itemsData: any[] = [];
  
  suppliers.forEach(supplier => {
    // Add 2 blank rows per supplier
    for (let i = 0; i < 2; i++) {
      itemsData.push({
        'Supplier Name': supplier.name,
        'Product Name': '',
        'SKU': '',
        'Quantity': '',
        'Unit Price': '',
        'Subtotal': '',
      });
    }
  });
  
  // Add 5 more empty rows
  for (let i = 0; i < 5; i++) {
    itemsData.push({
      'Supplier Name': '',
      'Product Name': '',
      'SKU': '',
      'Quantity': '',
      'Unit Price': '',
      'Subtotal': '',
    });
  }
  
  // Footer
  const footer = [
    ['', ''],
    ['TOTAL AMOUNT', ''],
  ];
  
  let csvContent = headerInfo.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  csvContent += '\n' + convertToCSV(itemsData, itemHeaders);
  csvContent += '\n' + footer.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  
  downloadFile(csvContent, `Purchase_Template_Multi_Supplier_${timestamp}.csv`);
}

// Download blank supplier profile template
export function downloadBlankSupplierTemplate() {
  const timestamp = new Date().toISOString().split('T')[0];
  
  const templateInfo = [
    ['BLANK SUPPLIER PROFILE TEMPLATE', ''],
    ['Name', ''],
    ['Description', ''],
    ['Contact Email', ''],
    ['Contact Phone', ''],
    ['Address', ''],
    ['', ''],
    ['PRODUCTS (Add as many rows as needed)', ''],
  ];
  
  const productHeaders = ['Product Name', 'Description', 'SKU', 'Price', 'Unit'];
  
  // Add 10 blank product rows
  const productsData = Array(10).fill(null).map(() => ({
    'Product Name': '',
    'Description': '',
    'SKU': '',
    'Price': '',
    'Unit': '',
  }));
  
  let csvContent = templateInfo.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  csvContent += '\n' + convertToCSV(productsData, productHeaders);
  
  downloadFile(csvContent, `Blank_Supplier_Template_${timestamp}.csv`);
}
