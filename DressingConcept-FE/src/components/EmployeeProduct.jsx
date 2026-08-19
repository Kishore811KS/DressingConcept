import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Download, Edit, Hash, Plus, RefreshCw, Search, Trash2, Upload, X, Package, AlertTriangle, Keyboard, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { printProductSticker } from "../utils/stickerPrinter";

import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const API_BASE_URL = `${BASE_URL}/api`;
const API = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const API_URL = "/products";

const emptyProduct = {
  id: "",
  productCode: "",
  name: "",
  tax: "",
  unit: "PCS",
  mrp: "",
  discountPercent: "",
  discountAmount: "",
  purchaseRate: "",
  classicCustomer: "",
  normalProfit: "0.00",
  classicProfit: "0.00",
  quantity: "",
  amount: "0.00",
};

const toNumber = (value) => Number(value) || 0;

const calculateProduct = (product) => {
  const mrp = toNumber(product.mrp);
  const purchaseRate = toNumber(product.purchaseRate);
  const classicPrice = toNumber(product.classicCustomer);
  const quantity = parseInt(product.quantity, 10) || 0;
  const discountPercent = toNumber(product.discountPercent);

  let discountAmount = 0;
  if (product.discountAmount !== undefined && product.discountAmount !== "" && product.discountAmount !== null) {
    discountAmount = toNumber(product.discountAmount);
  } else if (discountPercent > 0 && mrp > 0) {
    discountAmount = Math.round((mrp * (discountPercent / 100)) * 100) / 100;
  }

  const sellPrice = (product.sellPrice !== undefined && product.sellPrice !== "" && product.sellPrice !== null && product.sellPrice !== 0)
    ? toNumber(product.sellPrice)
    : (toNumber(product.discountAmount) > 0 ? toNumber(product.discountAmount) : mrp);

  const normalProfit = sellPrice - purchaseRate;
  const classicProfit = classicPrice > 0 ? (classicPrice - purchaseRate) : 0;

  return {
    ...product,
    discountAmount: discountAmount.toFixed(2),
    normalProfit: normalProfit.toFixed(2),
    classicProfit: classicProfit.toFixed(2),
    quantity,
    amount: (mrp * quantity).toFixed(2),
  };
};

export default function EmployeeProduct() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userType = localStorage.getItem("userType") || user.user_type || "";
  const isEmployee = true;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const searchInputRef = useRef(null);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => (
      String(item.productCode || item.id).toLowerCase().includes(query) ||
      String(item.name || "").toLowerCase().includes(query) ||
      String(item.unit || "").toLowerCase().includes(query)
    ));
  }, [items, search]);

  const showMessage = (type, text) => setMessage({ type, text });

  const stats = useMemo(() => {
    const totalProducts = items.length;
    const totalUnits = items.reduce((sum, item) => sum + (toNumber(item.quantity) || 0), 0);
    const lowStockCount = items.filter(item => toNumber(item.quantity) <= 5).length;
    return { totalProducts, totalUnits, lowStockCount };
  }, [items]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        searchInputRef.current?.focus();
        showMessage("success", "⌨️ Search input focused (Ctrl+F)");
        return;
      }

      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, filteredItems]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!message.text) return undefined;
    const timer = setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const normalizeFromApi = (item) => calculateProduct({
    id: item.id,
    productCode: item.productCode || item.id || "",
    name: item.name || "",
    tax: item.tax ?? "",
    unit: item.unit || "PCS",
    mrp: item.mrp || 0,
    discountPercent: item.discountPercent || 0,
    discountAmount: item.discountAmount !== undefined ? item.discountAmount : "",
    purchaseRate: item.buyPrice || 0,
    sellPrice: item.sellPrice || 0,
    classicCustomer: item.classicCustomer || "",
    quantity: item.quantity || 0,
    amount: item.amount || 0,
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`${API_URL}?page=1&per_page=1000`);
      const data = response.data;
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      const active = list.filter((item) => !String(item.name || "").startsWith("___DELETED___"));
      setItems(active.map(normalizeFromApi));
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.errors?.join(", ") || error.message || "Failed to load products";
      showMessage("error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>

      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <h1 style={styles.title}>Products Catalog</h1>
            <button style={styles.iconButton} onClick={loadProducts} title="Refresh"><RefreshCw size={18} /></button>
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
              ref={searchInputRef}
              style={styles.searchInput}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by Product_Id, Product_Description, Unit... (Ctrl+F)"
            />
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 50, textAlign: "center" }}>#</th>
                <th style={{ ...styles.th, width: 130 }}>Product ID</th>
                <th style={{ ...styles.th, width: 280, textAlign: "left" }}>Description</th>
                <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Unit</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }}>MRP (₹)</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }}>Selling Price</th>
                <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={styles.emptyState}>Loading products...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan="7" style={styles.emptyState}>No products found.</td></tr>
              ) : filteredItems.map((item, idx) => (
                <tr
                  key={item.id}
                  data-product-id={item.id}
                  style={{
                    ...(idx % 2 === 0 ? styles.trEven : styles.trOdd),
                    ...(selectedProductId === item.id ? styles.selectedRow : {}),
                    cursor: "pointer"
                  }}
                  onClick={() => setSelectedProductId(item.id)}
                >
                  <td style={{ ...styles.td, textAlign: "center", color: selectedProductId === item.id ? "#6366f1" : "#64748b" }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...styles.td, fontFamily: "monospace", color: "#a5b4fc", fontSize: 12 }}>{item.productCode || item.id}</td>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{item.name || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.badge}>{item.unit || "PCS"}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#9ca3af" }}>{toNumber(item.mrp).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#f87171", fontWeight: 600 }}>{toNumber(item.discountAmount).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <button
                      style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", padding: "4px" }}
                      onClick={(e) => { e.stopPropagation(); printProductSticker(item); }}
                      title="Print Sticker"
                    >
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          style={styles.floatingShortcutBtn}
          onClick={() => setShowShortcuts(true)}
          title="Shortcut Guide (?)"
        >
          <Keyboard size={20} />
          <span style={{ fontWeight: "600" }}>Shortcut Keys</span>
        </button>

        {showShortcuts && (
          <div
            style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)", backdropFilter: "blur(8px)",
              zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "center"
            }}
            onClick={() => setShowShortcuts(false)}
          >
            <div
              style={{
                backgroundColor: "rgba(18, 18, 18, 0.95)", backdropFilter: "blur(10px)",
                borderRadius: "16px", padding: "24px", maxWidth: "600px", width: "90%",
                maxHeight: "80vh", overflowY: "auto", border: "1px solid rgba(77, 166, 255, 0.3)",
                boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "#fff", display: "flex", alignItems: "center", gap: "12px" }}>
                  <Keyboard size={24} color="#4da6ff" />
                  Keyboard Shortcuts
                </div>
                <button style={styles.closeButton} onClick={() => setShowShortcuts(false)}><X size={24} /></button>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ color: "#4da6ff", fontSize: "16px", marginBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "6px" }}>
                  General
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "6px" }}>
                    <span style={{ color: "#aaa", fontSize: "13px" }}>Focus Search</span>
                    <kbd style={{ backgroundColor: "#333", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>Ctrl+F</kbd>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "6px" }}>
                    <span style={{ color: "#aaa", fontSize: "13px" }}>Show/Hide Shortcuts</span>
                    <kbd style={{ backgroundColor: "#333", color: "#fff", padding: "2px 6px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>?</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, sans-serif"
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(4px)"
  },
  content: {
    position: "relative",
    zIndex: 1,
    padding: "24px",
    maxWidth: "1600px",
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px"
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  title: {
    fontSize: "28px",
    fontWeight: "700",
    margin: 0,
    background: "linear-gradient(135deg, #818cf8 0%, #c084fc 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
  },
  iconButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "6px",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s"
  },
  message: {
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "20px",
    fontSize: "14px"
  },
  successMessage: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    border: "1px solid #10b981",
    color: "#34d399"
  },
  errorMessage: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    border: "1px solid #ef4444",
    color: "#f87171"
  },
  searchContainer: {
    marginBottom: "20px"
  },
  searchWrapper: {
    position: "relative",
    maxWidth: "400px"
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#64748b"
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px 10px 38px",
    borderRadius: "8px",
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none"
  },
  tableContainer: {
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    border: "1px solid #334155",
    overflow: "hidden",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left"
  },
  th: {
    backgroundColor: "#0f172a",
    padding: "14px 16px",
    color: "#94a3b8",
    fontWeight: "600",
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #334155"
  },
  td: {
    padding: "12px 16px",
    fontSize: "14px",
    borderBottom: "1px solid #334155"
  },
  trEven: {
    backgroundColor: "#1e293b"
  },
  trOdd: {
    backgroundColor: "#182234"
  },
  selectedRow: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    outline: "1px solid #6366f1"
  },
  badge: {
    backgroundColor: "#334155",
    color: "#e2e8f0",
    padding: "2px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "500"
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#94a3b8"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer"
  },
  floatingShortcutBtn: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "#6366f1",
    color: "#ffffff",
    border: "none",
    borderRadius: "30px",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.5)",
    zIndex: 99
  }
};
