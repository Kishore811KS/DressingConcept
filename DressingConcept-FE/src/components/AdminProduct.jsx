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
  category: "",
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
  const purchaseRate = toNumber(product.purchaseRate !== undefined ? product.purchaseRate : product.buyPrice);
  const classicPrice = toNumber(product.classicCustomer);
  const quantity = parseInt(product.quantity, 10) || 0;

  let discountAmount = 0;
  if (product.discountAmount !== undefined && product.discountAmount !== "" && product.discountAmount !== null) {
    discountAmount = toNumber(product.discountAmount);
  } else if (toNumber(product.discountPercent) > 0 && mrp > 0) {
    discountAmount = Math.round((mrp * (toNumber(product.discountPercent) / 100)) * 100) / 100;
  }

  const discountPercent = (mrp > 0 && discountAmount > 0)
    ? Math.round((discountAmount / mrp) * 10000) / 100
    : toNumber(product.discountPercent);

  const sellPrice = (product.sellPrice !== undefined && product.sellPrice !== "" && product.sellPrice !== null && product.sellPrice !== 0)
    ? toNumber(product.sellPrice)
    : (toNumber(product.discountAmount) > 0 ? toNumber(product.discountAmount) : mrp);

  const normalProfit = sellPrice - purchaseRate;
  const classicProfit = classicPrice > 0 ? (classicPrice - purchaseRate) : 0;

  const unitValue = mrp > 0 ? mrp : (sellPrice > 0 ? sellPrice : purchaseRate);
  const totalAmount = unitValue * quantity;

  return {
    ...product,
    discountAmount: discountAmount > 0 ? discountAmount.toFixed(2) : (product.discountAmount !== undefined && product.discountAmount !== "" ? product.discountAmount : ""),
    discountPercent,
    normalProfit: normalProfit.toFixed(2),
    classicProfit: classicProfit.toFixed(2),
    quantity,
    amount: totalAmount.toFixed(2),
  };
};

export default function AdminProduct() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userType = localStorage.getItem("userType") || user.user_type || "";
  const isEmployee = false;

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [editingItem, setEditingItem] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [importDuplicatesModal, setImportDuplicatesModal] = useState(null);

  const searchInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const addButtonRef = useRef(null);
  const exportButtonRef = useRef(null);
  const importButtonRef = useRef(null);

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
      await api.delete(`${API_URL}/${item.id}`);
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
    Selling_Price: item.discountAmount,
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
      { wch: 14 }, { wch: 20 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 16 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buffer], { type: "application/octet-stream" }), `Products_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showMessage("success", "⌨️ Export completed (Ctrl+E)");
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
    showMessage("success", "⌨️ Select file to import (Ctrl+I)");
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      const isModalOpen = !!editingItem;

      if (event.key === 'F4') {
        event.preventDefault();
        event.stopPropagation();
        if (!isModalOpen && !isTyping) {
          handleAddNew();
        }
        return;
      }

      if ((event.altKey && event.key === 'n') || (event.altKey && event.key === 'N')) {
        event.preventDefault();
        if (!isModalOpen && !isTyping) {
          handleAddNew();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'f' || event.key === 'F')) {
        event.preventDefault();
        searchInputRef.current?.focus();
        showMessage("success", "⌨️ Search input focused (Ctrl+F)");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'e' || event.key === 'E')) {
        event.preventDefault();
        if (!isTyping && !isModalOpen) {
          handleExport();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'i' || event.key === 'I')) {
        event.preventDefault();
        if (!isTyping && !isModalOpen) {
          triggerImport();
        }
        return;
      }

      if (event.key === 'Delete' && selectedProductId && !isTyping && !isModalOpen) {
        event.preventDefault();
        const productToDelete = items.find(item => item.id === selectedProductId);
        if (productToDelete) {
          handleDelete(productToDelete);
        }
        return;
      }

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

      if (event.key === 'Escape') {
        if (showSaveConfirm) {
          event.preventDefault();
          setShowSaveConfirm(false);
          return;
        }
        if (editingItem) {
          event.preventDefault();
          setEditingItem(null);
          showMessage("success", "⌨️ Modal closed (Esc)");
          return;
        }
      }

      if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !editingItem && !showSaveConfirm && !isTyping && filteredItems.length > 0) {
        event.preventDefault();
        let currentIndex = filteredItems.findIndex(item => item.id === selectedProductId);

        if (currentIndex === -1 && filteredItems.length > 0) {
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
          const selectedRow = document.querySelector(`[data-product-id="${filteredItems[newIndex].id}"]`);
          selectedRow?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }

      if (event.key === 'Enter' && (editingItem || showSaveConfirm)) {
        event.preventDefault();
        if (showSaveConfirm) {
          executeSave(true);
        } else {
          handleSave();
        }
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
  }, [editingItem, showSaveConfirm, selectedProductId, items, filteredItems]);

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

  const handleEditChange = (field, value) => {
    setEditingItem((current) => {
      const next = { ...current, [field]: value };

      if (field === "sellPrice" || field === "mrp" || field === "discountAmount" || field === "discountPercent" || field === "purchaseRate" || field === "quantity" || field === "classicCustomer") {
        const calculated = calculateProduct(next);
        next.normalProfit = calculated.normalProfit;
        next.classicProfit = calculated.classicProfit;
        next.amount = calculated.amount;
        if (field !== "discountAmount") next.discountAmount = calculated.discountAmount;
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
      discountAmount: toNumber(product.discountAmount),
      discountPercent: product.discountPercent,
      classicCustomer: toNumber(product.classicCustomer),
      buyPrice: toNumber(product.purchaseRate),
      sellPrice: toNumber(product.sellPrice),
      quantity: parseInt(product.quantity, 10) || 0,
    };
  };

  const handleSave = () => {
    if (!editingItem?.name?.trim()) {
      showMessage("error", "Product_Description is required");
      return;
    }
    setShowSaveConfirm(true);
  };

  const executeSave = async (shouldPrint = false) => {
    if (!editingItem?.name?.trim()) {
      showMessage("error", "Product_Description is required");
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload(editingItem);
      const url = editingItem.isNew ? API_URL : `${API_URL}/${editingItem.id}`;
      const response = await api({
        url,
        method: editingItem.isNew ? "POST" : "PUT",
        data: payload,
        withCredentials: true
      });

      const isNew = editingItem.isNew;
      const savedProduct = response?.data ? normalizeFromApi(response.data) : calculateProduct(editingItem);

      setShowSaveConfirm(false);
      setEditingItem(null);
      showMessage("success", `Product ${isNew ? "created" : "updated"} successfully`);
      await loadProducts();

      if (shouldPrint) {
        printProductSticker(savedProduct);
      }
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

        const parsedProductsMap = new Map();

        for (const row of rows) {
          const product = calculateProduct({
            productCode: row.Product_Id || row["Product ID"] || "",
            name: row.Product_Description || row["Product Description"] || "",
            tax: row.Tax || 0,
            unit: row.Unit || "PCS",
            mrp: row.MRP || 0,
            discountAmount: row.Selling_Price || row["Selling Price"] || row.Discount_Amt || row["Discount Amt"] || row["Discount Amount"] || 0,
            purchaseRate: row.Purchase_Rate || row["Purchase Rate"] || 0,
            sellPrice: row.Unit_Price || row["Unit Price"] || 0,
            classicCustomer: row.Classic_Customer || row["Classic Customer"] || 0,
            quantity: row.Quantity || 0,
          });

          if (!product.name?.trim()) continue;

          const key = product.name.trim().toLowerCase();
          if (parsedProductsMap.has(key)) {
            const existingParsed = parsedProductsMap.get(key);
            existingParsed.quantity = (parseInt(existingParsed.quantity, 10) || 0) + (parseInt(product.quantity, 10) || 0);
          } else {
            parsedProductsMap.set(key, product);
          }
        }

        const parsedProductsList = Array.from(parsedProductsMap.values());
        if (parsedProductsList.length === 0) {
          showMessage("error", "No valid products found in the imported file");
          return;
        }

        const newProducts = [];
        const duplicateProducts = [];

        for (const importedProduct of parsedProductsList) {
          const key = importedProduct.name.trim().toLowerCase();
          const existingItem = items.find(item => item.name?.trim().toLowerCase() === key);

          if (existingItem) {
            duplicateProducts.push({
              id: `dup-${duplicateProducts.length}`,
              existingProduct: existingItem,
              importedProduct: importedProduct,
              newQuantity: (parseInt(existingItem.quantity, 10) || 0) + (parseInt(importedProduct.quantity, 10) || 0),
              selected: true
            });
          } else {
            newProducts.push(importedProduct);
          }
        }

        if (duplicateProducts.length > 0) {
          setImportDuplicatesModal({
            newProducts,
            duplicateProducts
          });
        } else {
          setSaving(true);
          for (const product of newProducts) {
            await api.post(API_URL, buildPayload(product));
          }
          showMessage("success", "Import completed successfully");
          await loadProducts();
          setSaving(false);
        }
      } catch (error) {
        showMessage("error", error.message || "Failed to import products");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const toggleSelectDuplicateItem = (id) => {
    if (!importDuplicatesModal) return;
    setImportDuplicatesModal(prev => ({
      ...prev,
      duplicateProducts: prev.duplicateProducts.map(item =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    }));
  };

  const toggleSelectAllDuplicates = () => {
    if (!importDuplicatesModal) return;
    const allSelected = importDuplicatesModal.duplicateProducts.every(item => item.selected);
    setImportDuplicatesModal(prev => ({
      ...prev,
      duplicateProducts: prev.duplicateProducts.map(item => ({ ...item, selected: !allSelected }))
    }));
  };

  const processImportAgreement = async () => {
    if (!importDuplicatesModal) return;
    setSaving(true);
    try {
      const selectedDuplicates = importDuplicatesModal.duplicateProducts.filter(d => d.selected);

      for (const dup of selectedDuplicates) {
        const updatedQty = (parseInt(dup.existingProduct.quantity, 10) || 0) + (parseInt(dup.importedProduct.quantity, 10) || 0);
        const payload = {
          ...buildPayload(dup.existingProduct),
          quantity: updatedQty
        };
        await api.put(`${API_URL}/${dup.existingProduct.id}`, payload);
      }

      for (const product of importDuplicatesModal.newProducts) {
        await api.post(API_URL, buildPayload(product));
      }

      const msg = selectedDuplicates.length > 0
        ? `Import completed! Quantities updated for ${selectedDuplicates.length} duplicate product(s).`
        : `Import completed! New products added.`;
      showMessage("success", msg);
      setImportDuplicatesModal(null);
      await loadProducts();
    } catch (error) {
      showMessage("error", error.response?.data?.error || error.message || "Failed to complete import");
    } finally {
      setSaving(false);
    }
  };

  const cancelImport = () => {
    setImportDuplicatesModal(null);
    showMessage("info", "Import cancelled.");
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>

      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <h1 style={styles.title}>Products Inventory (Admin)</h1>
            <button style={styles.iconButton} onClick={loadProducts} title="Refresh"><RefreshCw size={18} /></button>
          </div>
          <div style={styles.buttonGroup}>
            <button ref={exportButtonRef} style={styles.button} onClick={handleExport} title="Export (Ctrl+E)"><Upload size={16} /> Export</button>
            <label style={styles.button} title="Import (Ctrl+I)">
              <Download size={16} /> Import
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
                <th style={{ ...styles.th, width: 100, textAlign: "right" }}>Selling Price</th>
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
                <tr><td colSpan="14" style={styles.emptyState}>Loading products...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan="14" style={styles.emptyState}>No products found. Press F4 to add new product.</td></tr>
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
                  <td style={{ ...styles.td, textAlign: "right", color: "#f87171", fontWeight: 600 }}>{toNumber(item.discountAmount).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#9ca3af" }}>{toNumber(item.purchaseRate).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", color: "#d1d5db" }}>{item.classicCustomer || "-"}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#10b981" }}>{toNumber(item.normalProfit).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#3b82f6" }}>{toNumber(item.classicProfit).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "center", color: toNumber(item.quantity) === 0 ? "#ef4444" : "#f9fafb" }}>{item.quantity || 0}</td>
                  <td style={{ ...styles.td, textAlign: "right", fontWeight: 600, color: "#a5b4fc" }}>{toNumber(item.amount).toFixed(2)}</td>
                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={styles.actionButtons}>
                      <button style={styles.printButton} onClick={(e) => { e.stopPropagation(); printProductSticker(item); }} title="Print Sticker"><Printer size={15} /></button>
                      <button style={styles.editButton} onClick={(e) => { e.stopPropagation(); handleEdit(item); }} title="Edit (Ctrl+D)"><Edit size={15} /></button>
                      <button style={styles.deleteButton} onClick={(e) => { e.stopPropagation(); handleDelete(item); }} title="Delete (Delete key)"><Trash2 size={15} /></button>
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
                  ["Selling Price", "discountAmount", "number"],
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

        {showSaveConfirm && (
          <div style={styles.overlayModal}>
            <div style={{ ...styles.modal, maxWidth: "440px", textAlign: "center" }}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px auto" }}>
                  <Printer size={28} color="#818cf8" />
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: "700", margin: "0 0 8px 0", color: "#f8fafc" }}>
                  Print Product Sticker?
                </h2>
                <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0, lineHeight: "1.5" }}>
                  Product details are ready to save. Do you want to print the product sticker after saving?
                </p>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                <button
                  style={{ ...styles.button, flex: 1, justifyContent: "center" }}
                  onClick={() => executeSave(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  style={{ ...styles.button, ...styles.primaryButton, flex: 1, justifyContent: "center" }}
                  onClick={() => executeSave(true)}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Print"}
                </button>
              </div>
            </div>
          </div>
        )}

        {importDuplicatesModal && (
          <div style={styles.overlayModal}>
            <div style={{ ...styles.modal, maxWidth: "750px" }}>
              <div style={styles.modalHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#f59e0b" }}>
                  <AlertTriangle size={24} />
                  <h2 style={{ fontSize: "18px", fontWeight: "700", margin: 0, color: "#f8fafc" }}>
                    Duplicate Product Description Detected
                  </h2>
                </div>
                <button style={styles.closeButton} onClick={cancelImport}>
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "16px", lineHeight: "1.5" }}>
                The following imported product(s) match existing items in your inventory. Select individual duplicate products to add their quantity, or deselect to skip merging:
              </p>

              <div style={{ maxHeight: "280px", overflowY: "auto", marginBottom: "20px", borderRadius: "8px", border: "1px solid #334155" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#0f172a", color: "#94a3b8", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px", width: "40px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={importDuplicatesModal.duplicateProducts.length > 0 && importDuplicatesModal.duplicateProducts.every(d => d.selected)}
                          onChange={toggleSelectAllDuplicates}
                          title="Select / Deselect All"
                          style={{ cursor: "pointer", accentColor: "#10b981" }}
                        />
                      </th>
                      <th style={{ padding: "10px 12px" }}>Product Description</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Current Qty</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Imported Qty</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", color: "#34d399" }}>New Total Qty</th>
                      <th style={{ padding: "10px 12px", textAlign: "center" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importDuplicatesModal.duplicateProducts.map((dup) => (
                      <tr key={dup.id} style={{ borderBottom: "1px solid #1e293b", backgroundColor: dup.selected ? "rgba(16, 185, 129, 0.05)" : "transparent" }}>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={dup.selected}
                            onChange={() => toggleSelectDuplicateItem(dup.id)}
                            style={{ cursor: "pointer", accentColor: "#10b981" }}
                          />
                        </td>
                        <td style={{ padding: "10px 12px", color: "#f8fafc", fontWeight: "500" }}>{dup.existingProduct.name}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#94a3b8" }}>{dup.existingProduct.quantity}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: "#fbbf24", fontWeight: "600" }}>+{dup.importedProduct.quantity}</td>
                        <td style={{ padding: "10px 12px", textAlign: "center", color: dup.selected ? "#34d399" : "#94a3b8", fontWeight: "700" }}>
                          {dup.selected ? dup.newQuantity : dup.existingProduct.quantity}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "center" }}>
                          {dup.selected ? (
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "#10b981", backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                              Add Qty
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", fontWeight: "600", color: "#94a3b8", backgroundColor: "rgba(148, 163, 184, 0.15)", padding: "2px 8px", borderRadius: "4px" }}>
                              Skip
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "13px", color: "#94a3b8" }}>
                  Selected: <strong style={{ color: "#10b981" }}>{importDuplicatesModal.duplicateProducts.filter(d => d.selected).length}</strong> of {importDuplicatesModal.duplicateProducts.length} duplicate product(s)
                </span>
                <div style={{ display: "flex", gap: "12px" }}>
                  <button
                    style={{ ...styles.button }}
                    onClick={cancelImport}
                    disabled={saving}
                  >
                    Cancel Import
                  </button>
                  <button
                    style={{ ...styles.button, ...styles.primaryButton, backgroundColor: "#10b981", borderColor: "#10b981" }}
                    onClick={processImportAgreement}
                    disabled={saving}
                  >
                    {saving ? "Updating..." : `Agree & Add Selected (${importDuplicatesModal.duplicateProducts.filter(d => d.selected).length})`}
                  </button>
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
  buttonGroup: {
    display: "flex",
    gap: "12px"
  },
  button: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    borderRadius: "8px",
    backgroundColor: "#1e293b",
    color: "#f8fafc",
    border: "1px solid #334155",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "500",
    transition: "all 0.2s"
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
    color: "#ffffff"
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
  actionButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "8px"
  },
  printButton: {
    background: "none",
    border: "none",
    color: "#10b981",
    cursor: "pointer",
    padding: "4px"
  },
  editButton: {
    background: "none",
    border: "none",
    color: "#818cf8",
    cursor: "pointer",
    padding: "4px"
  },
  deleteButton: {
    background: "none",
    border: "none",
    color: "#f87171",
    cursor: "pointer",
    padding: "4px"
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#94a3b8"
  },
  overlayModal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(4px)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  },
  modal: {
    backgroundColor: "#1e293b",
    borderRadius: "16px",
    border: "1px solid #334155",
    padding: "24px",
    width: "90%",
    maxWidth: "600px",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px"
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    margin: 0
  },
  closeButton: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer"
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
    marginBottom: "24px"
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase"
  },
  input: {
    padding: "10px 12px",
    borderRadius: "8px",
    backgroundColor: "#0f172a",
    border: "1px solid #334155",
    color: "#f8fafc",
    fontSize: "14px",
    outline: "none"
  },
  readOnly: {
    padding: "10px 12px",
    borderRadius: "8px",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    border: "1px solid #334155",
    color: "#10b981",
    fontWeight: "600",
    fontSize: "14px"
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px"
  }
};
