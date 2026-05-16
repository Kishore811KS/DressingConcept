import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Download, Edit, Hash, Plus, RefreshCw, Search, Trash2, Upload, X, Package, AlertTriangle, Keyboard } from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import axios from "axios";

const API_URL = "http://localhost:5000/api/products";

const emptyProduct = {
  id: "",
  productCode: "",
  name: "",
  tax: "",
  unit: "PCS",
  mrp: "",
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
  
  const normalProfit = mrp - purchaseRate;
  const classicProfit = classicPrice > 0 ? (classicPrice - purchaseRate) : 0;

  return {
    ...product,
    normalProfit: normalProfit.toFixed(2),
    classicProfit: classicProfit.toFixed(2),
    quantity,
    amount: (mrp * quantity).toFixed(2),
  };
};

export default function Products() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const addButtonRef = useRef(null);
  const exportButtonRef = useRef(null);
  const importButtonRef = useRef(null);

  // Define filteredItems first using useMemo
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) => (
      String(item.productCode || item.id).toLowerCase().includes(query) ||
      String(item.name || "").toLowerCase().includes(query) ||
      String(item.unit || "").toLowerCase().includes(query)
    ));
  }, [items, search]);

  // Define showMessage first
  const showMessage = (type, text) => setMessage({ type, text });

  const stats = useMemo(() => {
    const totalProducts = items.length;
    const totalUnits = items.reduce((sum, item) => sum + (toNumber(item.quantity) || 0), 0);
    const lowStockCount = items.filter(item => toNumber(item.quantity) < 10).length;
    return { totalProducts, totalUnits, lowStockCount };
  }, [items]);

  // Define handleAddNew, handleEdit, handleDelete, handleExport before they're used in useEffect
  const handleAddNew = () => {
    setEditingItem({ ...emptyProduct, isNew: true });
    showMessage("success", "⌨️ Add New Product modal opened (F4)");
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item, isNew: false });
    showMessage("success", "⌨️ Editing product (Ctrl+D)");
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    try {
      await axios.delete(`${API_URL}/${item.id}`, { withCredentials: true });
      showMessage("success", "Product deleted successfully");
      setSelectedProductId(null);
      await loadProducts();
    } catch (error) {
      const msg = error.response?.data?.error || error.message || "Failed to delete product";
      showMessage("error", msg);
    }
  };

  const rowsForExport = (list) => list.map((item) => ({
    Product_Id: item.productCode || item.id,
    Product_Description: item.name,
    Tax: item.tax,
    Unit: item.unit,
    MRP: item.mrp,
    Purchase_Rate: item.purchaseRate,
    Unit_Price: item.sellPrice,
    Classic_Customer: item.classicCustomer,
    Normal_Profit: item.normalProfit,
    Classic_Profit: item.classicProfit,
    Quantity: item.quantity,
    Total_Value: item.amount,
  }));

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(rowsForExport(items));
    worksheet["!cols"] = [
      { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
      { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 10 }, { wch: 12 }, { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Products_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showMessage("success", "⌨️ Export completed (Ctrl+E)");
  };

  // Handle import trigger
  const triggerImport = () => {
    fileInputRef.current?.click();
    showMessage("success", "⌨️ Select file to import (Ctrl+I)");
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Get the active element to check if user is typing in an input
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      // Don't trigger shortcuts when typing in modal inputs
      const isModalOpen = !!editingItem;

      // F4 key - Add New Product
      if (event.key === 'F4') {
        event.preventDefault();
        event.stopPropagation();
        if (!isModalOpen && !isTyping) {
          handleAddNew();
        }
        return;
      }

      // Alternative: Alt+N for Add New (fallback for some browsers that block F4)
      if ((event.altKey && event.key === 'n') || (event.altKey && event.key === 'N')) {
        event.preventDefault();
        if (!isModalOpen && !isTyping) {
          handleAddNew();
        }
        return;
      }

      // Ctrl/Cmd + F - Focus search
      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        searchInputRef.current?.focus();
        showMessage("success", "⌨️ Search input focused (Ctrl+F)");
        return;
      }

      // Ctrl/Cmd + E - Export
      if ((event.ctrlKey || event.metaKey) && (event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
        if (!isTyping && !isModalOpen) {
          handleExport();
        }
        return;
      }

      // Ctrl/Cmd + I - Import
      if ((event.ctrlKey || event.metaKey) && (event.key === 'i' || event.key === 'I')) {
        event.preventDefault();
        if (!isTyping && !isModalOpen) {
          triggerImport();
        }
        return;
      }

      // Delete key - Delete selected product
      if (event.key === 'Delete' && selectedProductId && !isTyping && !isModalOpen) {
        event.preventDefault();
        const productToDelete = items.find(item => item.id === selectedProductId);
        if (productToDelete) {
          handleDelete(productToDelete);
        }
        return;
      }

      // Ctrl/Cmd + D - Edit selected product
      if ((event.ctrlKey || event.metaKey) && (event.key === 'd' || event.key === 'D')) {
        event.preventDefault();
        if (selectedProductId && !isTyping && !isModalOpen) {
          const productToEdit = items.find(item => item.id === selectedProductId);
          if (productToEdit) {
            handleEdit(productToEdit);
          }
        }
        return;
      }

      // Escape key - Close modal
      if (event.key === 'Escape' && editingItem) {
        event.preventDefault();
        setEditingItem(null);
        showMessage("success", "⌨️ Modal closed (Esc)");
        return;
      }

      // Arrow Up/Down - Navigate products
      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !editingItem && !isTyping && filteredItems.length > 0) {
        event.preventDefault();
        let currentIndex = filteredItems.findIndex(item => item.id === selectedProductId);

        if (currentIndex === -1 && filteredItems.length > 0) {
          // If no product selected, select the first one
          setSelectedProductId(filteredItems[0].id);
          const firstRow = document.querySelector(`[data-product-id="${filteredItems[0].id}"]`);
          firstRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return;
        }

        let newIndex;
        if (event.key === 'ArrowDown') {
          newIndex = currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
        }

        if (newIndex !== -1 && filteredItems[newIndex]) {
          setSelectedProductId(filteredItems[newIndex].id);
          // Scroll into view
          const selectedRow = document.querySelector(`[data-product-id="${filteredItems[newIndex].id}"]`);
          selectedRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      // Enter key - Save in modal or Edit selected product
      if (event.key === 'Enter' && editingItem && !isTyping) {
        event.preventDefault();
        handleSave();
        return;
      }

      // Question mark - Toggle shortcuts
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingItem, selectedProductId, items, filteredItems]);

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
    purchaseRate: item.buyPrice || 0,
    sellPrice: item.sellPrice || 0,
    classicCustomer: item.classicCustomer || "",
    quantity: item.quantity || 0,
    amount: item.amount || 0,
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}?page=1&per_page=1000`, { withCredentials: true });
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

  const handleEditChange = (field, value) => {
    setEditingItem((current) => {
      const next = { ...current, [field]: value };

      if (field === "sellPrice" || field === "mrp" || field === "purchaseRate" || field === "quantity" || field === "classicCustomer") {
        const calculated = calculateProduct(next);
        next.normalProfit = calculated.normalProfit;
        next.classicProfit = calculated.classicProfit;
        next.amount = calculated.amount;
        next.sellPrice = calculated.sellPrice;
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
      unit: String(product.unit || "PCS").trim() || "PCS",
      tax: toNumber(product.tax),
      mrp: toNumber(product.mrp),
      classicCustomer: toNumber(product.classicCustomer),
      buyPrice: toNumber(product.purchaseRate),
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
      await axios({
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
            tax: row.Tax || 0,
            unit: row.Unit || "PCS",
            mrp: row.MRP || 0,
            purchaseRate: row.Purchase_Rate || row["Purchase Rate"] || 0,
            sellPrice: row.Unit_Price || row["Unit Price"] || 0,
            classicCustomer: row.Classic_Customer || row["Classic Customer"] || 0,
            quantity: row.Quantity || 0,
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
            <button ref={exportButtonRef} style={styles.button} onClick={handleExport} title="Export (Ctrl+E)"><Download size={16} /> Export</button>
            <label style={styles.button} title="Import (Ctrl+I)">
              <Upload size={16} /> Import
              <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleImport} />
            </label>
            <button ref={addButtonRef} style={{ ...styles.button, ...styles.primaryButton }} onClick={handleAddNew} title="Add New (F4)"><Plus size={16} /> Add New</button>
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
                <th style={{ ...styles.th, width: 110 }}>Product ID</th>
                <th style={{ ...styles.th, width: 220, textAlign: "left" }}>Description</th>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>Tax</th>
                <th style={{ ...styles.th, width: 60, textAlign: "center" }}>Unit</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>MRP (₹)</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>Pur Rate</th>
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>Classic Price</th>
                <th style={{ ...styles.th, width: 90, textAlign: "right" }}>N. Profit</th>
                <th style={{ ...styles.th, width: 90, textAlign: "right" }}>C. Profit</th>
                <th style={{ ...styles.th, width: 70, textAlign: "center" }}>Qty</th>
                <th style={{ ...styles.th, width: 110, textAlign: "right" }}>Total Value (₹)</th>
                <th style={{ ...styles.th, width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="12" style={styles.emptyState}>Loading products...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan="12" style={styles.emptyState}>No products found. Press F4 to add new product.</td></tr>
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
                  onDoubleClick={() => handleEdit(item)}
                >
                  <td style={{ ...styles.td, textAlign: "center", color: selectedProductId === item.id ? "#6366f1" : "#64748b" }}>
                    {idx + 1}
                  </td>
                  <td style={{ ...styles.td, fontFamily: "monospace", color: "#a5b4fc", fontSize: 12 }}>{item.productCode || item.id}</td>
                  <td style={{ ...styles.td, fontWeight: 500 }}>{item.name || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "center", color: "#d1d5db" }}>{toNumber(item.tax).toFixed(1)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <span style={styles.badge}>{item.unit || "PCS"}</span>
                  </td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#9ca3af" }}>{toNumber(item.mrp).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#9ca3af" }}>{toNumber(item.purchaseRate).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#d1d5db" }}>{item.classicCustomer || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#10b981" }}>{toNumber(item.normalProfit).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#3b82f6" }}>{toNumber(item.classicProfit).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "center", color: toNumber(item.quantity) === 0 ? "#ef4444" : "#f9fafb" }}>{item.quantity || 0}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#a5b4fc" }}>{toNumber(item.amount).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={styles.actionButtons}>
                      <button style={styles.editButton} onClick={() => handleEdit(item)} title="Edit (Ctrl+D)"><Edit size={15} /></button>
                      <button style={styles.deleteButton} onClick={() => handleDelete(item)} title="Delete (Delete key)"><Trash2 size={15} /></button>
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
                <button style={styles.closeButton} onClick={() => setEditingItem(null)} title="Close (Esc)"><X size={20} /></button>
              </div>

              <div style={styles.formGrid}>
                {[
                  ["Product_Id", "productCode", "text"],
                  ["Product_Description *", "name", "text"],
                  ["Tax", "tax", "number"],
                  ["MRP", "mrp", "number"],
                  ["Purchase Rate", "purchaseRate", "number"],
                  ["Classic Customer Price", "classicCustomer", "text"],
                  ["Quantity", "quantity", "number"],
                ].map(([label, field, type]) => (
                  <label key={field} style={styles.formGroup}>
                    <span style={styles.label}>{label}</span>
                    <input
                      style={styles.input}
                      type={type}
                      value={editingItem[field] ?? ""}
                      onChange={(event) => handleEditChange(field, event.target.value)}
                      autoFocus={field === "name"}
                    />
                  </label>
                ))}
                <label style={styles.formGroup}>
                  <span style={styles.label}>Unit</span>
                  <select
                    style={styles.input}
                    value={editingItem.unit || "PCS"}
                    onChange={(event) => handleEditChange("unit", event.target.value)}
                  >
                    <option value="PCS">PCS</option>
                    <option value="BOX">BOX</option>
                    <option value="BUNDLE">BUNDLE</option>
                  </select>
                </label>
                <div style={styles.formGroup}>
                  <span style={styles.label}>Normal Profit</span>
                  <div style={styles.readOnly}>₹{toNumber(calculateProduct(editingItem).normalProfit).toFixed(2)}</div>
                </div>
                <div style={styles.formGroup}>
                  <span style={styles.label}>Classic Customer Profit</span>
                  <div style={styles.readOnly}>₹{toNumber(calculateProduct(editingItem).classicProfit).toFixed(2)}</div>
                </div>
                <div style={styles.formGroup}>
                  <span style={styles.label}>Total Value</span>
                  <div style={styles.readOnly}>₹{toNumber(calculateProduct(editingItem).amount).toFixed(2)}</div>
                </div>
              </div>

              <div style={styles.modalFooter}>
                <button style={styles.button} onClick={() => setEditingItem(null)}>Cancel (Esc)</button>
                <button style={{ ...styles.button, ...styles.primaryButton }} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save (Enter)"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Shortcut Button */}
        <button
          style={styles.floatingShortcutBtn}
          onClick={() => setShowShortcuts(true)}
          title="Shortcut Guide (?)"
        >
          <Keyboard size={20} />
          <span style={{ fontWeight: "600" }}>Shortcut Keys</span>
        </button>

        {/* Shortcuts Modal */}
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
                borderRadius: "16px", padding: "24px", maxWidth: "800px", width: "90%", 
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

              {[
                {
                  title: "Main Navigation",
                  shortcuts: [{ keys: "D", description: "Dashboard" }]
                },
                {
                  title: "Inventory Management",
                  shortcuts: [
                    { keys: "P", description: "Products" },
                    { keys: "C", description: "Category" },
                    { keys: "SI", description: "Stock In" },
                    { keys: "SO", description: "Stock Out" },
                    { keys: "L", description: "Low Stock" }
                  ]
                },
                {
                  title: "Billing",
                  shortcuts: [
                    { keys: "B", description: "Create Bill" },
                    { keys: "BR", description: "Bill Reports" },
                    { keys: "SV", description: "Service Bill" },
                    { keys: "SB", description: "Service Bills" },
                    { keys: "Q", description: "Quotations" },
                    { keys: "DI", description: "Discount" }
                  ]
                },
                {
                  title: "Product Specific (F4 / Ctrl+D)",
                  shortcuts: [
                    { keys: "F4", description: "Add New Product" },
                    { keys: "Ctrl+D", description: "Edit Selected" },
                    { keys: "Ctrl+F", description: "Focus Search" },
                    { keys: "Ctrl+E", description: "Export to Excel" },
                    { keys: "Ctrl+I", description: "Import from Excel" },
                    { keys: "Delete", description: "Delete Selected" }
                  ]
                },
                {
                  title: "General",
                  shortcuts: [
                    { keys: "?", description: "Show/Hide this menu" },
                    { keys: "ESC", description: "Close this menu" }
                  ]
                }
              ].map((category, idx) => (
                <div key={idx} style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#4da6ff", marginBottom: "12px", paddingBottom: "4px", borderBottom: "1px solid rgba(77, 166, 255, 0.2)" }}>
                    {category.title}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
                    {category.shortcuts.map((shortcut, sidx) => (
                      <div key={sidx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "rgba(0, 0, 0, 0.3)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={styles.kbd}>{shortcut.keys}</span>
                        <span style={{ color: "#cbd5e1", fontSize: "13px" }}>{shortcut.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)", textAlign: "center", fontSize: "12px", color: "#6b7280" }}>
                <p>💡 Tip: Press <strong style={{ color: "#4da6ff" }}>?</strong> anytime to view this menu</p>
                <p style={{ marginTop: "8px" }}>Shortcuts work when not typing in input fields</p>
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
  shortcutBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "20px",
    padding: "10px 16px",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: "10px",
    border: "1px solid rgba(51, 65, 85, 0.5)",
    fontSize: "12px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "20px",
    marginBottom: "28px",
  },
  statCard: {
    backgroundColor: "rgba(30, 41, 59, 0.7)",
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    padding: "20px 24px",
    border: "1px solid rgba(51, 65, 85, 0.5)",
    display: "flex",
    alignItems: "center",
    gap: "20px",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
  },
  statIconWrapper: {
    padding: "12px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "500",
    marginBottom: "4px",
  },
  statValue: {
    color: "#f8fafc",
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: "1.2",
  },
  statSubText: {
    color: "#64748b",
    fontSize: "12px",
    marginTop: "4px",
  },
  shortcutItem: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: "#94a3b8",
  },
  kbd: {
    backgroundColor: "#1e293b",
    border: "1px solid #334155",
    borderRadius: "4px",
    padding: "2px 6px",
    fontSize: "11px",
    fontWeight: "600",
    color: "#cbd5e1",
    fontFamily: "monospace",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, gap: 16, flexWrap: "wrap" },
  headerTitle: { display: "flex", alignItems: "center", gap: 10 },
  title: { margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px", color: "#f1f5f9" },
  iconButton: { background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "6px 8px", borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.2s" },
  buttonGroup: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  button: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 7, backgroundColor: "rgba(30, 41, 59, 0.9)", color: "#cbd5e1", border: "1px solid rgba(51, 65, 85, 0.8)", cursor: "pointer", fontSize: 13, fontWeight: 500, transition: "background 0.15s" },
  primaryButton: { backgroundColor: "#6366f1", border: "1px solid #6366f1", color: "#fff", fontWeight: 600 },
  message: { padding: "11px 18px", borderRadius: 7, marginBottom: 18, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8 },
  successMessage: { backgroundColor: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.3)" },
  errorMessage: { backgroundColor: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" },
  searchContainer: { marginBottom: 18 },
  searchWrapper: { position: "relative", maxWidth: 460 },
  searchIcon: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#475569", pointerEvents: "none" },
  searchInput: { width: "100%", padding: "10px 14px 10px 40px", backgroundColor: "rgba(30, 41, 59, 0.9)", border: "1px solid rgba(51, 65, 85, 0.8)", color: "#f1f5f9", borderRadius: 7, fontSize: 13, outline: "none", boxSizing: "border-box" },
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
  selectedRow: { backgroundColor: "rgba(99, 102, 241, 0.2)", border: "1px solid rgba(99, 102, 241, 0.4)" },
  emptyState: { textAlign: "center", padding: 52, color: "#475569", fontSize: 14 },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 20, backgroundColor: "rgba(15, 23, 42, 0.8)", color: "#94a3b8", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", border: "1px solid rgba(51, 65, 85, 0.6)" },
  actionButtons: { display: "flex", gap: 4, justifyContent: "center", alignItems: "center" },
  editButton: { background: "none", border: "none", color: "#818cf8", cursor: "pointer", padding: "5px 7px", borderRadius: 5, display: "flex", alignItems: "center", transition: "background 0.15s" },
  deleteButton: { background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "5px 7px", borderRadius: 5, display: "flex", alignItems: "center", transition: "background 0.15s" },
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
  floatingShortcutBtn: {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    backgroundColor: "rgba(99, 102, 241, 0.2)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(99, 102, 241, 0.4)",
    borderRadius: "40px",
    padding: "10px 20px",
    color: "#a5b4fc",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 2000,
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
    transition: "all 0.2s",
  },
  shortcutGuideItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 14px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#e2e8f0",
  }
};