// LowStockPage.jsx
import React, { useEffect, useState } from "react";
import { 
  Download, RefreshCw, ArrowLeft, AlertTriangle, Truck,
  ChevronLeft, ChevronRight, Search, X
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

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

export default function LowStockPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [lowStockThreshold] = useState(5);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  
  // Order modal state
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [orderQuantities, setOrderQuantities] = useState({});
  const [processingOrder, setProcessingOrder] = useState(false);

  useEffect(() => {
    loadProducts(1);
  }, []);

  // Filter items based on search term (client-side filtering)
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredItems(items);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = items.filter(item => 
        (item.id && item.id.toString().includes(term)) ||
        (item.name && item.name.toLowerCase().includes(term)) ||
        (item.model && item.model.toLowerCase().includes(term)) ||
        (item.type && item.type.toLowerCase().includes(term))
      );
      setFilteredItems(filtered);
      setCurrentPage(1); // Reset to first page when searching
    }
  }, [searchTerm, items, itemsPerPage]);

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  const loadProducts = async (page = 1) => {
    setLoading(true);
    try {
      // Fetch all products first (since we need to filter by quantity)
      const res = await api.get(`${API_URL}?page=${page}&per_page=100`); // Get more items per page
      
      const data = res.data;
      
      // Handle different response formats
      let productsArray = [];
      let totalCount = 0;
      
      if (Array.isArray(data)) {
        productsArray = data;
        totalCount = data.length;
      } else if (data && Array.isArray(data.items)) {
        productsArray = data.items;
        totalCount = data.total || data.items.length;
      } else if (data && data.data && Array.isArray(data.data)) {
        productsArray = data.data;
        totalCount = data.total || data.data.length;
      } else {
        console.warn('Unexpected API response format:', data);
        productsArray = [];
        totalCount = 0;
      }
      
      // Calculate values and filter low stock items (quantity <= 5)
      const processedItems = productsArray
        .map(item => calculateValues({ ...item, id: item.id }))
        .filter(item => item.quantity <= lowStockThreshold); // Changed to <= to be more inclusive
      
      setItems(processedItems);
      setFilteredItems(processedItems);
      
      if (processedItems.length === 0) {
        showMessage("info", "No items with quantity less than 5 found");
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      showMessage("error", "Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const calculateValues = (item) => {
    const buy = parseFloat(item.buyPrice) || 0;
    const sell = parseFloat(item.sellPrice) || 0;
    const qty = parseInt(item.quantity) || 0;

    const amount = (sell * qty).toFixed(2);

    return { 
      ...item, 
      amount,
      buyPrice: buy,
      sellPrice: sell,
      quantity: qty
    };
  };

  // ================= ORDER FUNCTIONS =================
  const handleOpenOrderModal = () => {
    setOrderItems(filteredItems);
    // Initialize order quantities with 0
    const initialQuantities = {};
    filteredItems.forEach(item => {
      initialQuantities[item.id] = 0;
    });
    setOrderQuantities(initialQuantities);
    setShowOrderModal(true);
  };

  const handleQuantityChange = (itemId, value) => {
    const newValue = parseInt(value) || 0;
    setOrderQuantities(prev => ({
      ...prev,
      [itemId]: newValue
    }));
  };

  const calculateOrderTotal = () => {
    let total = 0;
    Object.entries(orderQuantities).forEach(([itemId, qty]) => {
      const item = filteredItems.find(i => i.id === parseInt(itemId));
      if (item && qty > 0) {
        total += (item.buyPrice || item.buy_price || 0) * qty;
      }
    });
    return total;
  };

  const handlePlaceOrder = async () => {
    const selectedItems = Object.entries(orderQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([itemId, qty]) => ({
        id: parseInt(itemId),
        quantity: qty
      }));

    if (selectedItems.length === 0) {
      showMessage("error", "Please select at least one item to order");
      return;
    }

    setProcessingOrder(true);
    try {
      let updatedItems = [...items];
      
      for (const orderItem of selectedItems) {
        const item = items.find(i => i.id === orderItem.id);
        const newQty = (item?.quantity || 0) + orderItem.quantity;
        
        // Update in backend
        await api.put(`${API_URL}/${orderItem.id}`, {
          name: item?.name || item?.description || "Product",
          model: item?.model || "",
          type: item?.type || "",
          watts: item?.watts ? (parseFloat(item.watts) || null) : null,
          buyPrice: item?.buyPrice ?? item?.buy_price ?? 0,
          sellPrice: item?.sellPrice ?? item?.sell_price ?? 0,
          quantity: newQty,
        });

        // Update local state
        updatedItems = updatedItems.map(i =>
          i.id === orderItem.id ? { ...i, quantity: newQty } : i
        );
      }

      // Re-filter low stock items (quantity <= 5)
      const newLowStockItems = updatedItems.filter(i => i.quantity <= lowStockThreshold);
      setItems(newLowStockItems);
      setFilteredItems(newLowStockItems);
      
      setShowOrderModal(false);
      showMessage("success", `Order placed successfully for ${selectedItems.length} items!`);
      
      // Refresh products
      await loadProducts();
      
    } catch (err) {
      console.error("Error placing order:", err);
      showMessage("error", `Failed to place order: ${err.response?.data?.error || err.message}`);
    } finally {
      setProcessingOrder(false);
    }
  };

  // ================= EXPORT TO EXCEL =================
  const handleExport = () => {
    try {
      // Prepare data for export (use filtered items for export)
      const exportData = filteredItems.map((item, index) => ({
        '#': index + 1,
        'Product ID': item.productCode || item.id || '',
        'Description': item.name || '',
        'Tax': item.tax || 0,
        'Unit': item.unit || 'PCS',        'Unit': item.unit || 'PCS',
        'Qty': item.quantity || 0,
        'Status': item.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
        'Required': item.quantity === 0 ? lowStockThreshold : Math.max(0, lowStockThreshold - item.quantity),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Low Stock Items");

      // Auto-size columns
      const wscols = [
        { wch: 5 },  // #
        { wch: 15 }, // Product ID
        { wch: 30 }, // Description
        { wch: 8 },  // Tax
        { wch: 8 },  // Unit
        { wch: 8 },  // Qty
        { wch: 15 }, // Status
        { wch: 10 }, // Required
      ];
      worksheet['!cols'] = wscols;

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const date = new Date().toISOString().split('T')[0];
      saveAs(file, `Low_Stock_Alert_${date}.xlsx`);
      
      showMessage("success", "Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "Failed to export");
    }
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPageCount = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPageCount) {
      setCurrentPage(pageNumber);
    }
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPageCount));
  };

  const goToPrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPageCount) {
      setCurrentPage(pageNumber);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    if (totalPageCount <= maxVisiblePages) {
      for (let i = 1; i <= totalPageCount; i++) {
        pageNumbers.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPageCount, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
    }
    
    return pageNumbers;
  };

  // ================= STYLES =================
  const styles = {
    container: {
      padding: "60px",
      backgroundColor: "#111827",
      minHeight: "100vh",
      color: "#f9fafb",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    backButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#374151",
        color: "#f9fafb",
      }
    },
    refreshButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#374151",
        color: "#f9fafb",
      }
    },
    buttonGroup: {
      display: "flex",
      gap: "10px",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      borderRadius: "6px",
      backgroundColor: "#1f2937",
      color: "#f9fafb",
      border: "1px solid #374151",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#374151",
      }
    },
    primaryButton: {
      backgroundColor: "#dc2626",
      color: "#fff",
      border: "none",
      ':hover': {
        backgroundColor: "#b91c1c",
      }
    },
    searchContainer: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "20px",
      backgroundColor: "#1f2937",
      padding: "10px 15px",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    searchIcon: {
      color: "#9ca3af",
    },
    searchInput: {
      flex: 1,
      backgroundColor: "transparent",
      border: "none",
      color: "#f9fafb",
      fontSize: "14px",
      outline: "none",
      padding: "5px 0",
    },
    searchStats: {
      color: "#9ca3af",
      fontSize: "13px",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
    },
    successMessage: {
      backgroundColor: "rgba(22, 163, 74, 0.2)",
      color: "#4ade80",
      border: "1px solid #16a34a",
    },
    errorMessage: {
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      color: "#f87171",
      border: "1px solid #dc2626",
    },
    infoMessage: {
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      color: "#60a5fa",
      border: "1px solid #3b82f6",
    },
    tableContainer: {
      overflowX: "auto",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      backgroundColor: "#1f2937",
      minWidth: "1000px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "12px",
      textAlign: "left",
      color: "#f3f4f6",
      fontWeight: "500",
      fontSize: "13px",
      whiteSpace: "nowrap",
    },
    td: {
      padding: "12px",
      borderTop: "1px solid #374151",
    },
    lowStockIndicator: {
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      color: "#f87171",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "500",
      display: "inline-block",
    },
    outOfStockIndicator: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      color: "#ffffff",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "600",
      display: "inline-block",
      border: "1px solid #6b7280",
    },
    quantityCell: {
      fontWeight: "600",
      color: "#f87171",
    },
    zeroQuantityCell: {
      fontWeight: "700",
      color: "#ffffff",
      backgroundColor: "rgba(0, 0, 0, 0.3)",
    },
    requiredCell: {
      color: "#4ade80",
      fontWeight: "500",
    },
    loadingOverlay: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "40px",
      color: "#9ca3af",
    },
    emptyState: {
      textAlign: "center",
      padding: "60px",
      color: "#9ca3af",
      fontStyle: "italic",
    },
    pagination: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "8px",
      marginTop: "20px",
      flexWrap: "wrap",
    },
    paginationButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 12px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      minWidth: "40px",
      transition: "all 0.2s",
      ':hover': {
        backgroundColor: "#374151",
      }
    },
    paginationButtonDisabled: {
      opacity: 0.5,
      cursor: "not-allowed",
      pointerEvents: "none",
    },
    paginationButtonActive: {
      backgroundColor: "#dc2626",
      borderColor: "#dc2626",
      ':hover': {
        backgroundColor: "#b91c1c",
      }
    },
    paginationInfo: {
      color: "#9ca3af",
      fontSize: "14px",
      marginLeft: "10px",
    },
    // Modal styles
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    modalContent: {
      backgroundColor: '#1f2937',
      padding: '24px',
      borderRadius: '8px',
      width: '90%',
      maxWidth: '800px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: '1px solid #374151',
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#f9fafb',
      display: 'flex',
      alignItems: 'center',
    },
    closeButton: {
      background: 'none',
      border: 'none',
      color: '#9ca3af',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ':hover': {
        backgroundColor: '#374151',
        color: '#f9fafb',
      }
    },
    modalTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px',
    },
    modalTh: {
      backgroundColor: '#374151',
      padding: '10px',
      textAlign: 'left',
      color: '#f3f4f6',
      fontWeight: '500',
      fontSize: '12px',
    },
    modalTd: {
      padding: '10px',
      borderBottom: '1px solid #374151',
      color: '#f9fafb',
      fontSize: '13px',
    },
    orderInput: {
      width: '80px',
      padding: '6px',
      backgroundColor: '#111827',
      border: '1px solid #374151',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '13px',
    },
    modalFooter: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '20px',
      paddingTop: '20px',
      borderTop: '1px solid #374151',
    },
    totalAmount: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#4ade80',
    },
  };

  return (
    <div style={styles.container}>
      {/* Order Modal */}
      {showOrderModal && (
        <div style={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) setShowOrderModal(false);
        }}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <Truck size={20} style={{ marginRight: '8px' }} />
                Place Order for Low Stock Items
              </h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowOrderModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={styles.modalTable}>
                <thead>
                  <tr>
                    <th style={styles.modalTh}>Product ID</th>
                    <th style={styles.modalTh}>Description</th>
                    <th style={styles.modalTh}>Qty</th>
                    <th style={styles.modalTh}>Status</th>
                    <th style={styles.modalTh}>Required</th>
                    <th style={styles.modalTh}>Order Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id}>
                    <td style={styles.modalTd}>{item.productCode || item.id}</td>
                    <td style={styles.modalTd}>{item.name}</td>
                    <td style={styles.modalTd}>
                      <span style={{ 
                        color: item.quantity === 0 ? '#ffffff' : '#f87171', 
                        fontWeight: '600',
                        backgroundColor: item.quantity === 0 ? 'rgba(0,0,0,0.5)' : 'transparent',
                        padding: item.quantity === 0 ? '2px 6px' : '0',
                        borderRadius: item.quantity === 0 ? '4px' : '0'
                      }}>
                        {item.quantity}
                      </span>
                    </td>
                    <td style={styles.modalTd}>
                      <span style={item.quantity === 0 ? styles.outOfStockIndicator : styles.lowStockIndicator}>
                        {item.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </td>
                    <td style={styles.modalTd}>
                      <span style={{ color: '#4ade80', fontWeight: '500' }}>
                        {item.quantity === 0 ? lowStockThreshold : Math.max(0, lowStockThreshold - item.quantity)}
                      </span>
                    </td>
                      <td style={styles.modalTd}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          style={styles.orderInput}
                          value={orderQuantities[item.id] || 0}
                          onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.modalFooter}>
              <div>
                <span style={{ color: '#9ca3af', marginRight: '10px' }}>Total Order Value:</span>
                <span style={styles.totalAmount}>₹{calculateOrderTotal().toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  style={styles.button}
                  onClick={() => setShowOrderModal(false)}
                >
                  Cancel
                </button>
                <button 
                  style={{...styles.button, ...styles.primaryButton}}
                  onClick={handlePlaceOrder}
                  disabled={processingOrder}
                >
                  {processingOrder ? 'Processing...' : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <button 
            style={styles.backButton}
            onClick={() => navigate('/items')}
            title="Back to Inventory"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 style={styles.title}>
            <AlertTriangle color="#f87171" size={28} />
            Low Stock Alert (Qty ≤ {lowStockThreshold})
          </h1>
          <button 
            style={styles.refreshButton}
            onClick={() => loadProducts(1)}
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={handleOpenOrderModal}>
            <Truck size={16} /> Place Order
          </button>
          <button style={styles.button} onClick={handleExport}>
            <Download size={16} /> Export List
          </button>
        </div>
      </div>

      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage : 
             message.type === "error" ? styles.errorMessage : 
             styles.infoMessage)
        }}>
          {message.text}
        </div>
      )}

      {/* Search Bar */}
      <div style={styles.searchContainer}>
        <Search size={18} style={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search by ID, name, model, or type..."
          style={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <span style={styles.searchStats}>
            Found {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {/* Low Stock Items Table */}
      <div style={styles.tableContainer}>
        {loading ? (
          <div style={styles.loadingOverlay}>Loading low stock items...</div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.emptyState}>
            <AlertTriangle size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
            <div>
              {searchTerm 
                ? "No items match your search" 
                : "No items with quantity less than 5 found"}
            </div>
            <div style={{ fontSize: '14px', marginTop: '10px', color: '#6b7280' }}>
              {searchTerm 
                ? "Try adjusting your search terms" 
                : "All items have sufficient stock (quantity ≥ 5)"}
            </div>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>Product ID</th>
                <th style={styles.th}>Description</th>
                <th style={styles.th}>Tax</th>
                <th style={styles.th}>Unit</th>
                <th style={styles.th}>Qty</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Required</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((item, idx) => {
                const required = item.quantity === 0 ? lowStockThreshold : Math.max(0, lowStockThreshold - item.quantity);
                const profit = (item.mrp || 0) - (item.buyPrice || 0);
                const amount = (item.sellPrice || item.mrp || 0) * item.quantity;
                
                return (
                  <tr key={item.id}>
                    <td style={styles.td}>{indexOfFirstItem + idx + 1}</td>
                    <td style={{ ...styles.td, color: "#a5b4fc", fontFamily: "monospace" }}>{item.productCode || item.id}</td>
                    <td style={{ ...styles.td, fontWeight: 500 }}>{item.name}</td>
                    <td style={styles.td}>{item.tax || 0}</td>
                    <td style={styles.td}>
                      <span style={{ 
                        backgroundColor: '#374151', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        fontSize: '11px'
                      }}>{item.unit || 'PCS'}</span>
                    </td>
                    <td style={{
                      ...styles.td, 
                      ...(item.quantity === 0 ? styles.zeroQuantityCell : styles.quantityCell)
                    }}>
                      {item.quantity}
                    </td>
                    <td style={styles.td}>
                      <span style={item.quantity === 0 ? styles.outOfStockIndicator : styles.lowStockIndicator}>
                        {item.quantity === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                      </span>
                    </td>
                    <td style={{...styles.td, ...styles.requiredCell}}>{required}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination - Only show if there are items */}
      {filteredItems.length > 0 && (
        <div style={styles.pagination}>
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === 1 ? styles.paginationButtonDisabled : {})
            }}
            onClick={goToPrevPage}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          
          {getPageNumbers().map(number => (
            <button
              key={number}
              style={{
                ...styles.paginationButton,
                ...(currentPage === number ? styles.paginationButtonActive : {})
              }}
              onClick={() => goToPage(number)}
            >
              {number}
            </button>
          ))}
          
          <button
            style={{
              ...styles.paginationButton,
              ...(currentPage === totalPageCount ? styles.paginationButtonDisabled : {})
            }}
            onClick={goToNextPage}
            disabled={currentPage === totalPageCount}
          >
            <ChevronRight size={16} />
          </button>
          
          <span style={styles.paginationInfo}>
            Page {currentPage} of {totalPageCount} 
            {filteredItems.length > 0 && (
              <> (Showing {currentItems.length} of {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'})</>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
