import React, { useEffect, useMemo, useState } from "react";
import { Download, Edit, Hash, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";

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
      const response = await axios.get(`${API_URL}?page=1&per_page=1000`, { withCredentials: true });
      const data = response.data;
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      // Filter out any soft-deleted products that may slip through
      const active = list.filter((item) => !String(item.name || "").startsWith("___DELETED___"));
      setItems(active.map(normalizeFromApi));
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.errors?.join(", ") || error.message || "Failed to load products";
      showMessage("error", msg);
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
        next.netPrice = ""; // Force recalculation
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
      const response = await axios({
        url,
        method: editingItem.isNew ? "POST" : "PUT",
        data: payload,
        withCredentials: true
      });

      setEditingItem(null);
      showMessage("success", `Product ${editingItem.isNew ? "created" : "updated"} successfully`);
      await loadProducts();
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.errors?.join(", ") || error.message || "Failed to save product";
      showMessage("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await axios.delete(`${API_URL}/${item.id}`, { withCredentials: true });
      showMessage("success", "Product deleted successfully");
      await loadProducts();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Failed to delete product";
      showMessage("error", msg);
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

          await axios.post(API_URL, buildPayload(product), { withCredentials: true });
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
      <div style={styles.overlay}></div>
      <div style={styles.content}>
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
                <th style={{ ...styles.th, width: 110 }}>Product ID</th>
                <th style={{ ...styles.th, width: 220, textAlign: "left" }}>Description</th>
                <th style={{ ...styles.th, width: 90, textAlign: "center" }}>Size</th>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>Tax</th>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>Unit</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>MRP (₹)</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>Unit Price</th>
                <th style={{ ...styles.th, width: 70, textAlign: "right" }}>Dis %</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>Net Price</th>
                <th style={{ ...styles.th, width: 70, textAlign: "center" }}>Qty</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }}>Amount (₹)</th>
                <th style={{ ...styles.th, width: 110 }}>Sales Person</th>
                <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="13" style={styles.emptyState}>Loading products...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan="13" style={styles.emptyState}>No products found.</td></tr>
              ) : filteredItems.map((item, idx) => (
                <tr key={item.id} style={idx % 2 === 0 ? styles.trEven : styles.trOdd}>
                  <td style={{ ...styles.td, fontFamily: "monospace", color: "#a5b4fc", fontSize: 12 }}>{item.productCode || item.id}</td>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{item.name || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "center", color: "#d1d5db" }}>{item.size || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "center", color: "#d1d5db" }}>{toNumber(item.tax).toFixed(1)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.badge}>{item.unit || "PCS"}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#9ca3af" }}>{toNumber(item.mrp).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{toNumber(item.sellPrice).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: toNumber(item.discountPercent) > 0 ? "#34d399" : "#9ca3af" }}>
                    {toNumber(item.discountPercent).toFixed(1)}%
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#f9fafb" }}>{toNumber(item.netPrice).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "center", color: toNumber(item.quantity) === 0 ? "#ef4444" : "#f9fafb" }}>{item.quantity || 0}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#a5b4fc" }}>{toNumber(item.amount).toFixed(2)}</td>
                  <td style={{ ...styles.td, color: "#d1d5db" }}>{item.salesPerson || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={styles.actionButtons}>
                      <button style={styles.editButton} onClick={() => handleEdit(item)} title="Edit"><Edit size={15} /></button>
                      <button style={styles.deleteButton} onClick={() => handleDelete(item)} title="Delete"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {editingItem && (
          <div style={styles.overlayModal}>
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
    </div>
  );
}

const styles = {
  // ── Main Container with Background Image
  container: {
    minHeight: "100vh",
    position: "relative",
    backgroundColor: "#0f172a",
    fontFamily: "'Inter', Arial, sans-serif",
    backgroundImage: `url('/Dc-logo.jpg')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    backgroundRepeat: "no-repeat",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.88)",
    backdropFilter: "blur(3px)",
  },
  content: {
    position: "relative",
    zIndex: 1,
    padding: "32px 40px",
  },

  // ── Header
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16, flexWrap: "wrap" },
  headerTitle: { display: "flex", alignItems: "center", gap: 10 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px", color: "#f1f5f9" },
  iconButton: { background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "6px 8px", borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.2s" },

  // ── Buttons
  buttonGroup: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  button: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 7, backgroundColor: "rgba(30, 41, 59, 0.9)", color: "#cbd5e1", border: "1px solid rgba(51, 65, 85, 0.8)", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "background 0.15s" },
  primaryButton: { backgroundColor: "#6366f1", border: "1px solid #6366f1", color: "#fff", fontWeight: 600 },

  // ── Notification
  message: { padding: "11px 18px", borderRadius: 7, marginBottom: 18, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 },
  successMessage: { backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" },
  errorMessage: { backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },

  // ── Search
  searchContainer: { marginBottom: 18 },
  searchWrapper: { position: "relative", maxWidth: 460 },
  searchIcon: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none" },
  searchInput: { width: "100%", padding: "10px 14px 10px 40px", backgroundColor: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(51, 65, 85, 0.8)", color: "#f1f5f9", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" },

  // ── Table
  tableContainer: { overflowX: "auto", borderRadius: 10, border: "1px solid rgba(51, 65, 85, 0.5)", boxShadow: "0 4px 24px rgba(0,0,0,0.4)" },
  table: { width: "100%", borderCollapse: "collapse", backgroundColor: "rgba(30, 41, 59, 0.9)", tableLayout: "fixed", fontSize: 13 },
  th: {
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    padding: "11px 14px",
    textAlign: "left",
    color: "#94a3b8",
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    borderBottom: "1px solid rgba(51, 65, 85, 0.6)",
    userSelect: "none",
  },
  td: { padding: "10px 14px", borderBottom: "1px solid rgba(15, 23, 42, 0.5)", color: "#e2e8f0", fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" },
  trEven: { backgroundColor: "rgba(30, 41, 59, 0.7)" },
  trOdd: { backgroundColor: "rgba(23, 32, 50, 0.7)" },
  emptyState: { textAlign: "center", padding: 52, color: "#475569", fontSize: 14 },

  // ── Badges / actions
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.8)", color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", border: "1px solid rgba(51, 65, 85, 0.6)" },
  actionButtons: { display: "flex", gap: 4, justifyContent: "center", alignItems: "center" },
  editButton: { background: "none", border: "none", color: "#818cf8", cursor: "pointer", padding: "5px 7px", borderRadius: 5, display: "flex", alignItems: "center", transition: "background 0.15s" },
  deleteButton: { background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "5px 7px", borderRadius: 5, display: "flex", alignItems: "center", transition: "background 0.15s" },

  // ── Modal
  overlayModal: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(5px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 },
  modal: { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: 12, width: "92%", maxWidth: 800, maxHeight: "88vh", overflow: "auto", padding: "28px 32px", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "1px solid #334155" },
  modalTitle: { margin: 0, fontSize: 18, fontWeight: 700, color: "#f1f5f9" },
  closeButton: { background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px 20px" },
  formGroup: { display: "flex", flexDirection: "column", gap: 6 },
  label: { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" },
  input: { padding: "9px 12px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#f1f5f9", borderRadius: 6, fontSize: 13, outline: "none", transition: "border-color 0.15s" },
  readOnly: { padding: "9px 12px", backgroundColor: "#0f172a", border: "1px solid #334155", color: "#a5b4fc", borderRadius: 6, fontSize: 13, fontWeight: 700 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 28, paddingTop: 20, borderTop: "1px solid #334155" },
};