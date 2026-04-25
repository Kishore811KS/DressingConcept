import React, { useEffect, useMemo, useState } from "react";
import { Download, Edit, Hash, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API_URL = "http://localhost:5000/api/products";

const emptyProduct = {
  id: "",
  productCode: "",
  name: "",
  size: "",
  tax: "",
  unit: "PCS",
  mrp: "",
  sellPrice: "",
  discountPercent: "",
  netPrice: "",
  quantity: "",
  amount: "0.00",
  salesPerson: "",
};


const toNumber = (value) => Number(value) || 0;

const calculateProduct = (product) => {
  const unitPrice = toNumber(product.sellPrice) || toNumber(product.mrp);
  const discountPercent = toNumber(product.discountPercent);
  const calculatedNet = unitPrice - (unitPrice * discountPercent) / 100;
  const netPrice = product.netPrice === "" || product.netPrice === null || product.netPrice === undefined
    ? calculatedNet
    : toNumber(product.netPrice);
  const quantity = parseInt(product.quantity, 10) || 0;

  return {
    ...product,
    sellPrice: unitPrice,
    discountPercent,
    netPrice,
    quantity,
    amount: (netPrice * quantity).toFixed(2),
  };
};

export default function Products() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const showMessage = (type, text) => setMessage({ type, text });

  const normalizeFromApi = (item) => calculateProduct({
    id: item.id,
    productCode: item.productCode || item.id || "",
    name: item.name || "",
    size: item.size || item.model || "",
    tax: item.tax ?? "",
    unit: item.unit || "PCS",
    mrp: item.mrp || item.buyPrice || item.sellPrice || "",
    sellPrice: item.sellPrice || 0,
    discountPercent: item.discountPercent || 0,
    netPrice: item.netPrice || "",
    quantity: item.quantity || 0,
    amount: item.amount || 0,
    salesPerson: item.salesPerson || "",
    manualNet: false,
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}?page=1&per_page=1000`);
      if (!response.ok) throw new Error("Failed to load products");
      const data = await response.json();
      const list = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(list.map(normalizeFromApi));
    } catch (error) {
      showMessage("error", error.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => (
      String(item.productCode || item.id).toLowerCase().includes(query) ||
      String(item.name || "").toLowerCase().includes(query) ||
      String(item.size || "").toLowerCase().includes(query) ||
      String(item.unit || "").toLowerCase().includes(query) ||
      String(item.salesPerson || "").toLowerCase().includes(query)
    ));
  }, [items, search]);

  const handleAddNew = () => setEditingItem({ ...emptyProduct, isNew: true });

  const handleEdit = (item) => setEditingItem({ ...item, isNew: false });

  const handleEditChange = (field, value) => {
    setEditingItem((current) => {
      const next = { ...current, [field]: value };

      // If user explicitly edits netPrice, mark it as manual to avoid overwrites
      if (field === "netPrice") {
        next.manualNet = true;
        return next;
      }

      // When unit price / mrp or discount changes, auto-update netPrice unless user set it manually
      if (!next.manualNet && (field === "discountPercent" || field === "sellPrice" || field === "mrp")) {
        const calculated = calculateProduct(next);
        next.netPrice = calculated.netPrice;
        next.amount = calculated.amount;
      }

      // When quantity changes, update displayed amount using calculated netPrice
      if (field === "quantity") {
        const calculated = calculateProduct(next);
        next.amount = calculated.amount;
      }

      return next;
    });
  };

  const buildPayload = (item) => {
    const product = calculateProduct(item);
    return {
      productCode: String(product.productCode || "").trim(),
      name: String(product.name || "").trim(),
      description: String(product.name || "").trim(),
      model: String(product.size || "").trim(),
      size: String(product.size || "").trim(),
      unit: String(product.unit || "PCS").trim() || "PCS",
      tax: toNumber(product.tax),
      mrp: toNumber(product.mrp),
      discountPercent: toNumber(product.discountPercent),
      netPrice: toNumber(product.netPrice),
      salesPerson: String(product.salesPerson || "").trim(),
      buyPrice: toNumber(product.mrp || product.sellPrice),
      sellPrice: toNumber(product.sellPrice),
      quantity: parseInt(product.quantity, 10) || 0,
    };
  };

  const handleSave = async () => {
    if (!editingItem?.name?.trim()) {
      showMessage("error", "Product_Description is required");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(editingItem);
      const url = editingItem.isNew ? API_URL : `${API_URL}/${editingItem.id}`;
      const response = await fetch(url, {
        method: editingItem.isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.errors?.join(", ") || "Failed to save product");
      }

      setEditingItem(null);
      showMessage("success", `Product ${editingItem.isNew ? "created" : "updated"} successfully`);
      await loadProducts();
    } catch (error) {
      showMessage("error", error.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`${API_URL}/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete product");
      showMessage("success", "Product deleted successfully");
      await loadProducts();
    } catch (error) {
      showMessage("error", error.message || "Failed to delete product");
    }
  };

  const rowsForExport = (list) => list.map((item) => ({
    Product_Id: item.productCode || item.id,
    Product_Description: item.name,
    Size: item.size,
    Tax: item.tax,
    Unit: item.unit,
    MRP: item.mrp,
    Unit_Price: item.sellPrice,
    "Dis %": item.discountPercent,
    NetPrice: item.netPrice,
    Quantity: item.quantity,
    Amount: item.amount,
    SalesPerson: item.salesPerson,
  }));

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(rowsForExport(items));
    worksheet["!cols"] = [
      { wch: 14 }, { wch: 28 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Products_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const workbook = XLSX.read(new Uint8Array(evt.target.result), { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        for (const row of rows) {
          const product = calculateProduct({
            productCode: row.Product_Id || row["Product ID"] || "",
            name: row.Product_Description || row["Product Description"] || "",
            size: row.Size || "",
            tax: row.Tax || 0,
            unit: row.Unit || "PCS",
            mrp: row.MRP || 0,
            sellPrice: row.Unit_Price || row["Unit Price"] || 0,
            discountPercent: row["Dis %"] || row["Discount %"] || 0,
            netPrice: row.NetPrice || row["Net Price"] || "",
            quantity: row.Quantity || 0,
            salesPerson: row.SalesPerson || row["Sales Person"] || "",
          });
          if (!product.name) continue;

          await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildPayload(product)),
          });
        }

        showMessage("success", "Import completed");
        await loadProducts();
      } catch (error) {
        showMessage("error", error.message || "Failed to import products");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>Products Inventory</h1>
          <button style={styles.iconButton} onClick={loadProducts} title="Refresh"><RefreshCw size={18} /></button>
        </div>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleExport}><Download size={16} /> Export</button>
          <label style={styles.button}>
            <Upload size={16} /> Import
            <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleImport} />
          </label>
          <button style={{ ...styles.button, ...styles.primaryButton }} onClick={handleAddNew}><Plus size={16} /> Add New</button>
        </div>
      </div>

      {message.text && (
        <div style={{ ...styles.message, ...(message.type === "success" ? styles.successMessage : styles.errorMessage) }}>
          {message.text}
        </div>
      )}

      <div style={styles.searchContainer}>
        <div style={styles.searchWrapper}>
          <Search size={16} style={styles.searchIcon} />
          <input
            style={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by Product_Id, Product_Description, Size, Unit..."
          />
        </div>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}><Hash size={14} /> Product_Id</th>
              <th style={{ ...styles.th, ...styles.descriptionCol }}>Product_Description</th>
              <th style={styles.th}>Size</th>
              <th style={styles.th}>Tax</th>
              <th style={styles.th}>Unit</th>
              <th style={styles.th}>MRP</th>
              <th style={styles.th}>Unit_Price</th>
              <th style={styles.th}>Dis %</th>
              <th style={styles.th}>NetPrice</th>
              <th style={styles.th}>Quantity</th>
              <th style={styles.th}>Amount</th>
              <th style={styles.th}>SalesPerson</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="13" style={styles.emptyState}>Loading products...</td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan="13" style={styles.emptyState}>No products found.</td></tr>
            ) : filteredItems.map((item) => (
              <tr key={item.id}>
                <td style={styles.td}>{item.productCode || item.id}</td>
                <td style={{ ...styles.td, ...styles.descriptionCol }}>{item.name || "-"}</td>
                <td style={styles.td}>{item.size || "-"}</td>
                <td style={styles.td}>{toNumber(item.tax).toFixed(2)}</td>
                <td style={styles.td}>{item.unit || "PCS"}</td>
                <td style={styles.td}>₹{toNumber(item.mrp).toFixed(2)}</td>
                <td style={styles.td}>₹{toNumber(item.sellPrice).toFixed(2)}</td>
                <td style={styles.td}>{toNumber(item.discountPercent).toFixed(2)}</td>
                <td style={styles.td}>₹{toNumber(item.netPrice).toFixed(2)}</td>
                <td style={styles.td}>{item.quantity || 0}</td>
                <td style={styles.td}>₹{toNumber(item.amount).toFixed(2)}</td>
                <td style={styles.td}>{item.salesPerson || "-"}</td>
                <td style={styles.td}>
                  <div style={styles.actionButtons}>
                    <button style={styles.editButton} onClick={() => handleEdit(item)} title="Edit"><Edit size={16} /></button>
                    <button style={styles.deleteButton} onClick={() => handleDelete(item)} title="Delete"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{editingItem.isNew ? "Add New Item" : "Edit Item"}</h2>
              <button style={styles.closeButton} onClick={() => setEditingItem(null)}><X size={20} /></button>
            </div>

            <div style={styles.formGrid}>
              {[
                ["Product_Id", "productCode", "text"],
                ["Product_Description *", "name", "text"],
                ["Size", "size", "text"],
                ["Tax", "tax", "number"],
                ["Unit", "unit", "text"],
                ["MRP", "mrp", "number"],
                ["Unit_Price", "sellPrice", "number"],
                ["Dis %", "discountPercent", "number"],
                ["NetPrice", "netPrice", "number"],
                ["Quantity", "quantity", "number"],
                ["SalesPerson", "salesPerson", "text"],
              ].map(([label, field, type]) => (
                <label key={field} style={styles.formGroup}>
                  <span style={styles.label}>{label}</span>
                  <input
                    style={styles.input}
                    type={type}
                    value={editingItem[field] ?? ""}
                    onChange={(event) => handleEditChange(field, event.target.value)}
                  />
                </label>
              ))}
              <div style={styles.formGroup}>
                <span style={styles.label}>Amount</span>
                <div style={styles.readOnly}>₹{toNumber(calculateProduct(editingItem).amount).toFixed(2)}</div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.button} onClick={() => setEditingItem(null)}>Cancel</button>
              <button style={{ ...styles.button, ...styles.primaryButton }} onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { padding: "60px", backgroundColor: "#111827", minHeight: "100vh", color: "#f9fafb", fontFamily: "Inter, Arial, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16 },
  headerTitle: { display: "flex", alignItems: "center", gap: 12 },
  title: { margin: 0, fontSize: 28, fontWeight: 600 },
  buttonGroup: { display: "flex", gap: 10, flexWrap: "wrap" },
  button: { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, backgroundColor: "#1f2937", color: "#f9fafb", border: "1px solid #374151", cursor: "pointer", fontSize: 14 },
  iconButton: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 8 },
  primaryButton: { backgroundColor: "#6366f1", border: "none", color: "#fff" },
  searchContainer: { marginBottom: 20 },
  searchWrapper: { position: "relative", maxWidth: 430 },
  searchIcon: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#6b7280" },
  searchInput: { width: "100%", padding: "10px 10px 10px 40px", backgroundColor: "#1f2937", border: "1px solid #374151", color: "#fff", borderRadius: 6, fontSize: 14 },
  tableContainer: { overflowX: "auto", borderRadius: 8, border: "1px solid #374151" },
  table: { width: "100%", minWidth: 1350, borderCollapse: "collapse", backgroundColor: "#1f2937", tableLayout: "fixed" },
  th: { backgroundColor: "#374151", padding: 12, textAlign: "left", color: "#f3f4f6", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" },
  td: { padding: 12, borderTop: "1px solid #374151", color: "#f9fafb", fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  descriptionCol: { width: 250, minWidth: 250 },
  emptyState: { textAlign: "center", padding: 40, color: "#9ca3af" },
  actionButtons: { display: "flex", gap: 8 },
  editButton: { background: "none", border: "none", color: "#818cf8", cursor: "pointer", padding: 6 },
  deleteButton: { background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 6 },
  message: { padding: "12px 20px", borderRadius: 6, marginBottom: 20, fontSize: 14, fontWeight: 500 },
  successMessage: { backgroundColor: "rgba(22, 163, 74, 0.2)", color: "#4ade80", border: "1px solid #16a34a" },
  errorMessage: { backgroundColor: "rgba(220, 38, 38, 0.2)", color: "#f87171", border: "1px solid #dc2626" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 },
  modal: { backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, width: "90%", maxWidth: 780, maxHeight: "86vh", overflow: "auto", padding: 24 },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { margin: 0, fontSize: 20 },
  closeButton: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 },
  formGroup: { display: "grid", gap: 6 },
  label: { color: "#9ca3af", fontSize: 13, fontWeight: 500 },
  input: { padding: 10, backgroundColor: "#111827", border: "1px solid #374151", color: "#fff", borderRadius: 4, fontSize: 14 },
  readOnly: { padding: 10, backgroundColor: "#111827", border: "1px solid #374151", color: "#fff", borderRadius: 4 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22, paddingTop: 18, borderTop: "1px solid #374151" },
};
