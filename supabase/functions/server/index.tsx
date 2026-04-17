import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js";
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

// ── Auth: Sign Up ────────────────────────────────────────────────
app.post("/make-server-1f3aab97/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name: name || "" },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true,
    });
    if (error) {
      console.log(`Signup error: ${error.message}`);
      return c.json({ error: error.message }, 400);
    }
    return c.json({ user: data.user }, 201);
  } catch (error) {
    console.log(`Error during signup: ${error}`);
    return c.json({ error: "Failed to create account" }, 500);
  }
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

// ── Recently-deleted suppliers (must be before /:id) ──
app.get("/make-server-1f3aab97/suppliers/deleted", async (c) => {
  try {
    const all = await kv.getByPrefix("deleted_supplier:");
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    const recent = all.filter((s: any) => new Date(s.deletedAt).getTime() > cutoff);
    recent.sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    return c.json({ suppliers: recent });
  } catch (error) {
    console.log(`Error fetching deleted suppliers: ${error}`);
    return c.json({ error: "Failed to fetch deleted suppliers" }, 500);
  }
});

// Restore a soft-deleted supplier
app.post("/make-server-1f3aab97/suppliers/deleted/:id/restore", async (c) => {
  try {
    const id = c.req.param("id");
    const deleted = await kv.get(`deleted_supplier:${id}`);
    if (!deleted) {
      return c.json({ error: "Deleted supplier not found" }, 404);
    }
    // Restore supplier record (strip internal deletedAt/deletedProducts)
    const { deletedAt, deletedProducts, ...supplierData } = deleted as any;
    await kv.set(`supplier:${id}`, supplierData);
    // Restore products
    const products: any[] = deletedProducts || [];
    for (const product of products) {
      await kv.set(`product:${id}:${product.id}`, product);
    }
    // Remove from deleted bucket
    await kv.del(`deleted_supplier:${id}`);
    return c.json({ supplier: supplierData, restoredProducts: products.length });
  } catch (error) {
    console.log(`Error restoring supplier: ${error}`);
    return c.json({ error: "Failed to restore supplier" }, 500);
  }
});

// Permanently delete a soft-deleted supplier
app.delete("/make-server-1f3aab97/suppliers/deleted/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`deleted_supplier:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error permanently deleting supplier: ${error}`);
    return c.json({ error: "Failed to permanently delete supplier" }, 500);
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

// Delete supplier  (soft-delete — moves to deleted_supplier: bucket)
app.delete("/make-server-1f3aab97/suppliers/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const supplier = await kv.get(`supplier:${id}`);
    if (!supplier) {
      return c.json({ error: "Supplier not found" }, 404);
    }
    // Fetch associated products before removing them
    const products = await kv.getByPrefix(`product:${id}:`);
    // Save everything to the deleted bucket
    await kv.set(`deleted_supplier:${id}`, {
      ...(supplier as any),
      deletedAt: new Date().toISOString(),
      deletedProducts: products,
    });
    // Remove live records
    await kv.del(`supplier:${id}`);
    for (const product of products) {
      await kv.del(`product:${id}:${product.id}`);
    }
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error deleting supplier: ${error}`);
    return c.json({ error: "Failed to delete supplier" }, 500);
  }
});

// ── IMPORTANT: /products/search must be registered BEFORE /products/:supplierId
// so Hono does not swallow "search" as a supplierId param.

// Search products with full supplier info
app.get("/make-server-1f3aab97/products/search", async (c) => {
  try {
    const query = c.req.query("q")?.toLowerCase() || "";

    const allProducts = await kv.getByPrefix("product:");
    const allSuppliers = await kv.getByPrefix("supplier:");
    const allPurchases = await kv.getByPrefix("purchase:");

    const supplierMap = new Map(allSuppliers.map((s: any) => [s.id, s]));

    // Build a map of productId -> latest purchaseDate
    const lastPurchaseDateMap = new Map<string, string>();
    for (const purchase of allPurchases) {
      if (!Array.isArray(purchase.items)) continue;
      for (const item of purchase.items) {
        const existing = lastPurchaseDateMap.get(item.productId);
        if (!existing || new Date(purchase.purchaseDate) > new Date(existing)) {
          lastPurchaseDateMap.set(item.productId, purchase.purchaseDate);
        }
      }
    }

    const filtered = (
      query
        ? allProducts.filter(
            (p: any) =>
              p.name?.toLowerCase().includes(query) ||
              p.description?.toLowerCase().includes(query) ||
              p.sku?.toLowerCase().includes(query) ||
              supplierMap.get(p.supplierId)?.name?.toLowerCase().includes(query)
          )
        : allProducts
    ).map((p: any) => ({
      ...p,
      supplierName: supplierMap.get(p.supplierId)?.name || "Unknown Supplier",
      supplier: supplierMap.get(p.supplierId) || null,
      lastPurchaseDate: lastPurchaseDateMap.get(p.id) || null,
    }));

    // Group by supplierId so the frontend can render per-supplier sections
    const grouped: Record<string, { supplier: any; products: any[] }> = {};
    for (const product of filtered) {
      if (!grouped[product.supplierId]) {
        grouped[product.supplierId] = {
          supplier: product.supplier,
          products: [],
        };
      }
      grouped[product.supplierId].products.push(product);
    }

    return c.json({ products: filtered, grouped: Object.values(grouped) });
  } catch (error) {
    console.log(`Error searching products: ${error}`);
    return c.json({ error: "Failed to search products" }, 500);
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
    const now = new Date().toISOString();
    const product = {
      id,
      supplierId: body.supplierId,
      name: body.name,
      description: body.description || "",
      price: body.price,
      sku: body.sku || "",
      unit: body.unit || "unit",
      createdAt: now,
    };
    await kv.set(`product:${body.supplierId}:${id}`, product);
    // Record initial price history entry
    await kv.set(`price_history:${id}`, [
      { price: body.price, previousPrice: null, updatedAt: now, note: "Initial price" },
    ]);
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
    const now = new Date().toISOString();
    const product = {
      ...existing,
      ...body,
      id,
      supplierId,
      updatedAt: now,
      priceUpdatedAt: body.priceUpdatedAt ?? (existing as any).priceUpdatedAt ?? null,
    };
    await kv.set(`product:${supplierId}:${id}`, product);

    // If price changed, append to price history
    const oldPrice = (existing as any).price;
    const newPrice = body.price;
    if (newPrice !== undefined && newPrice !== oldPrice) {
      const history: any[] = (await kv.get(`price_history:${id}`)) || [];
      history.push({
        price: newPrice,
        previousPrice: oldPrice,
        updatedAt: now,
      });
      await kv.set(`price_history:${id}`, history);
    }

    return c.json({ product });
  } catch (error) {
    console.log(`Error updating product: ${error}`);
    return c.json({ error: "Failed to update product" }, 500);
  }
});

// Get price history for a product
app.get("/make-server-1f3aab97/price-history/:productId", async (c) => {
  try {
    const productId = c.req.param("productId");
    const history: any[] = (await kv.get(`price_history:${productId}`)) || [];
    // Sort ascending by date for charting
    history.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
    return c.json({ history });
  } catch (error) {
    console.log(`Error fetching price history: ${error}`);
    return c.json({ error: "Failed to fetch price history" }, 500);
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
      paymentDueDate: body.paymentDueDate || null,
      paymentStatus: body.paymentStatus || (body.paymentDueDate ? "unpaid" : null),
      paymentPaidAt: body.paymentPaidAt || null,
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

// Get purchases for a specific supplier
app.get("/make-server-1f3aab97/purchases/supplier/:supplierId", async (c) => {
  try {
    const supplierId = c.req.param("supplierId");
    const allPurchases = await kv.getByPrefix("purchase:");
    const purchases = allPurchases.filter((p: any) => p.supplierId === supplierId);
    purchases.sort((a: any, b: any) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    return c.json({ purchases });
  } catch (error) {
    console.log(`Error fetching purchases for supplier: ${error}`);
    return c.json({ error: "Failed to fetch supplier purchases" }, 500);
  }
});

// ── Recently-deleted purchases (must be before /:id) ──
app.get("/make-server-1f3aab97/purchases/deleted", async (c) => {
  try {
    const all = await kv.getByPrefix("deleted_purchase:");
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = all.filter((p: any) => new Date(p.deletedAt).getTime() > cutoff);
    recent.sort((a: any, b: any) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
    return c.json({ purchases: recent });
  } catch (error) {
    console.log(`Error fetching deleted purchases: ${error}`);
    return c.json({ error: "Failed to fetch deleted purchases" }, 500);
  }
});

// Restore a soft-deleted purchase
app.post("/make-server-1f3aab97/purchases/deleted/:id/restore", async (c) => {
  try {
    const id = c.req.param("id");
    const deleted = await kv.get(`deleted_purchase:${id}`);
    if (!deleted) return c.json({ error: "Deleted purchase not found" }, 404);
    const { deletedAt, ...purchaseData } = deleted as any;
    await kv.set(`purchase:${id}`, purchaseData);
    await kv.del(`deleted_purchase:${id}`);
    return c.json({ purchase: purchaseData });
  } catch (error) {
    console.log(`Error restoring purchase: ${error}`);
    return c.json({ error: "Failed to restore purchase" }, 500);
  }
});

// Permanently delete a soft-deleted purchase
app.delete("/make-server-1f3aab97/purchases/deleted/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await kv.del(`deleted_purchase:${id}`);
    return c.json({ success: true });
  } catch (error) {
    console.log(`Error permanently deleting purchase: ${error}`);
    return c.json({ error: "Failed to permanently delete purchase" }, 500);
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

// Delete purchase  (soft-delete — moves to deleted_purchase: bucket)
app.delete("/make-server-1f3aab97/purchases/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const purchase = await kv.get(`purchase:${id}`);
    if (!purchase) return c.json({ error: "Purchase not found" }, 404);
    await kv.set(`deleted_purchase:${id}`, {
      ...(purchase as any),
      deletedAt: new Date().toISOString(),
    });
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

// ── Storage stats ─────────────────────────────────────────────────
app.get("/make-server-1f3aab97/storage-stats", async (c) => {
  try {
    const [suppliers, products, purchases, deletedSuppliers, priceHistories, deletedPurchases] = await Promise.all([
      kv.getByPrefix("supplier:"),
      kv.getByPrefix("product:"),
      kv.getByPrefix("purchase:"),
      kv.getByPrefix("deleted_supplier:"),
      kv.getByPrefix("price_history:"),
      kv.getByPrefix("deleted_purchase:"),
    ]);

    const allData = [...suppliers, ...products, ...purchases, ...deletedSuppliers, ...priceHistories, ...deletedPurchases];
    const estimatedBytes = new TextEncoder().encode(JSON.stringify(allData)).length;

    return c.json({
      counts: {
        suppliers: suppliers.length,
        products: products.length,
        purchases: purchases.length,
        deletedSuppliers: deletedSuppliers.length,
        deletedPurchases: deletedPurchases.length,
        priceHistoryEntries: priceHistories.length,
        total: allData.length,
      },
      estimatedBytes,
    });
  } catch (error) {
    console.log(`Error fetching storage stats: ${error}`);
    return c.json({ error: "Failed to fetch storage stats" }, 500);
  }
});

Deno.serve(app.fetch);