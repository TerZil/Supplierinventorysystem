import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-1f3aab97/health", (c) => {
  return c.json({ status: "ok" });
});

// Get all suppliers
app.get("/make-server-1f3aab97/suppliers", async (c) => {
  try {
    const suppliers = await kv.getByPrefix("supplier:");
    return c.json({ suppliers });
  } catch (error) {
    console.log(`Error fetching suppliers: ${error}`);
    return c.json({ error: "Failed to fetch suppliers" }, 500);
  }
});

// Get specific supplier
app.get("/make-server-1f3aab97/suppliers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supplier = await kv.get(`supplier:${id}`);
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    return c.json({ supplier });
  } catch (error) {
    console.log(`Error fetching supplier: ${error}`);
    return c.json({ error: "Failed to fetch supplier" }, 500);
  }
});

// Create new supplier
app.post("/make-server-1f3aab97/suppliers", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const supplier = {
      id,
      name: body.name,
      description: body.description || "",
      contactEmail: body.contactEmail || "",
      contactPhone: body.contactPhone || "",
      address: body.address || "",
      createdAt: new Date().toISOString(),
    };
    await kv.set(`supplier:${id}`, supplier);
    return c.json({ supplier });
  } catch (error) {
    console.log(`Error creating supplier: ${error}`);
    return c.json({ error: "Failed to create supplier" }, 500);
  }
});

// Update supplier
app.put("/make-server-1f3aab97/suppliers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`supplier:${id}`);
    if (!existing) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    const supplier = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`supplier:${id}`, supplier);
    return c.json({ supplier });
  } catch (error) {
    console.log(`Error updating supplier: ${error}`);
    return c.json({ error: "Failed to update supplier" }, 500);
  }
});

// Delete supplier
app.delete("/make-server-1f3aab97/suppliers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`supplier:${id}`);
    // Also delete all products for this supplier
    const products = await kv.getByPrefix(`product:${id}:`);
    for (const product of products) {
      await kv.del(`product:${id}:${product.id}`);
    }
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting supplier: ${error}`);
    return c.json({ error: "Failed to delete supplier" }, 500);
  }
});

// Get products for a supplier
app.get("/make-server-1f3aab97/products/:supplierId", async (c) => {
  try {
    const supplierId = c.req.param("supplierId");
    const products = await kv.getByPrefix(`product:${supplierId}:`);
    return c.json({ products });
  } catch (error) {
    console.log(`Error fetching products: ${error}`);
    return c.json({ error: "Failed to fetch products" }, 500);
  }
});

// Add product
app.post("/make-server-1f3aab97/products", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const product = {
      id,
      supplierId: body.supplierId,
      name: body.name,
      description: body.description || "",
      price: body.price,
      sku: body.sku || "",
      unit: body.unit || "unit",
      createdAt: new Date().toISOString(),
    };
    await kv.set(`product:${body.supplierId}:${id}`, product);
    return c.json({ product });
  } catch (error) {
    console.log(`Error adding product: ${error}`);
    return c.json({ error: "Failed to add product" }, 500);
  }
});

// Update product
app.put("/make-server-1f3aab97/products/:supplierId/:id", async (c) => {
  try {
    const supplierId = c.req.param("supplierId");
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`product:${supplierId}:${id}`);
    if (!existing) {
      return c.json({ error: "Product not found" }, 404);
    }
    const product = {
      ...existing,
      ...body,
      id,
      supplierId,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`product:${supplierId}:${id}`, product);
    return c.json({ product });
  } catch (error) {
    console.log(`Error updating product: ${error}`);
    return c.json({ error: "Failed to update product" }, 500);
  }
});

// Delete product
app.delete("/make-server-1f3aab97/products/:supplierId/:id", async (c) => {
  try {
    const supplierId = c.req.param("supplierId");
    const id = c.req.param("id");
    await kv.del(`product:${supplierId}:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting product: ${error}`);
    return c.json({ error: "Failed to delete product" }, 500);
  }
});

// Record a purchase
app.post("/make-server-1f3aab97/purchases", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const purchase = {
      id,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      items: body.items, // array of { productId, productName, quantity, price }
      totalAmount: body.totalAmount,
      notes: body.notes || "",
      purchaseDate: body.purchaseDate || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await kv.set(`purchase:${id}`, purchase);
    return c.json({ purchase });
  } catch (error) {
    console.log(`Error recording purchase: ${error}`);
    return c.json({ error: "Failed to record purchase" }, 500);
  }
});

// Get all purchases
app.get("/make-server-1f3aab97/purchases", async (c) => {
  try {
    const purchases = await kv.getByPrefix("purchase:");
    // Sort by purchase date descending
    purchases.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    return c.json({ purchases });
  } catch (error) {
    console.log(`Error fetching purchases: ${error}`);
    return c.json({ error: "Failed to fetch purchases" }, 500);
  }
});

// Update purchase
app.put("/make-server-1f3aab97/purchases/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const existing = await kv.get(`purchase:${id}`);
    if (!existing) {
      return c.json({ error: "Purchase not found" }, 404);
    }
    const purchase = {
      ...existing,
      ...body,
      id,
      updatedAt: new Date().toISOString(),
    };
    await kv.set(`purchase:${id}`, purchase);
    return c.json({ purchase });
  } catch (error) {
    console.log(`Error updating purchase: ${error}`);
    return c.json({ error: "Failed to update purchase" }, 500);
  }
});

// Delete purchase
app.delete("/make-server-1f3aab97/purchases/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`purchase:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting purchase: ${error}`);
    return c.json({ error: "Failed to delete purchase" }, 500);
  }
});

// Search suppliers and products
app.get("/make-server-1f3aab97/search", async (c) => {
  try {
    const query = c.req.query("q")?.toLowerCase() || "";
    if (!query) {
      return c.json({ suppliers: [], products: [] });
    }

    const allSuppliers = await kv.getByPrefix("supplier:");
    const allProducts = await kv.getByPrefix("product:");

    const suppliers = allSuppliers.filter(s => 
      s.name?.toLowerCase().includes(query) || 
      s.description?.toLowerCase().includes(query)
    );

    const products = allProducts.filter(p => 
      p.name?.toLowerCase().includes(query) || 
      p.description?.toLowerCase().includes(query) ||
      p.sku?.toLowerCase().includes(query)
    );

    return c.json({ suppliers, products });
  } catch (error) {
    console.log(`Error searching: ${error}`);
    return c.json({ error: "Failed to search" }, 500);
  }
});

Deno.serve(app.fetch);