import React, { useState, useEffect } from "react";
import {
  FaUsers,
  FaShoppingCart,
  FaMoneyBillWave,
  FaChartLine,
  FaBoxes,
  FaExclamationTriangle,
  FaSpinner,
  FaArrowRight,
  FaEye,
  FaKeyboard,
} from "react-icons/fa";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import useKeyboardShortcuts from "../hooks/useKeyboardShortcuts";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [stats, setStats] = useState({
    products: {
      total: 0,
      totalQuantity: 0,
      lowStock: 0,
    },
    billing: {
      today: {
        bills: 0,
        sales: 0,
        average: 0,
      },
      thisWeek: {
        bills: 0,
        sales: 0,
      },
      thisMonth: {
        bills: 0,
        sales: 0,
      },
      pendingItems: 0,
    },
    lowStockProducts: [],
    paymentMethods: [],
  });

  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const handleKeyPress = (event) => {
      // Show shortcuts modal when '?' is pressed
      if (event.key === '?' || (event.shiftKey && event.key === '/')) {
        event.preventDefault();
        setShowShortcuts(prev => !prev);
      }
      // Close modal on Escape
      if (event.key === 'Escape' && showShortcuts) {
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShortcuts]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const productStatsResponse = await axios.get(
        `${API_BASE_URL}/api/products/statistics`
      );

      const billingStatsResponse = await axios.get(
        `${API_BASE_URL}/api/billing/statistics`
      );

      const lowStockResponse = await axios.get(
        `${API_BASE_URL}/api/products?per_page=100`
      );

      const productStats = productStatsResponse.data;
      const billingStats = billingStatsResponse.data;

      const allProducts = lowStockResponse.data.items || [];
      const lowStockProducts = allProducts
        .filter(product => product.quantity < 10)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 10);

      const totalPayments = (billingStats.paymentMethods || []).reduce(
        (sum, method) => sum + (method.total || 0),
        0
      );

      setStats({
        products: {
          total: productStats.total_products || 0,
          totalQuantity: productStats.total_quantity || 0,
          lowStock: lowStockProducts.length,
        },
        billing: {
          today: billingStats.today || { bills: 0, sales: 0, average: 0 },
          thisWeek: billingStats.thisWeek || { bills: 0, sales: 0 },
          thisMonth: billingStats.thisMonth || { bills: 0, sales: 0 },
          pendingItems: billingStats.pendingItems || 0,
          totalPayments: totalPayments,
        },
        lowStockProducts: lowStockProducts,
        paymentMethods: billingStats.paymentMethods || [],
      });

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleViewAllLowStock = () => {
    navigate('/lowstock');
  };

  const ShortcutsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const shortcutCategories = [
      {
        title: "Main Navigation",
        shortcuts: [
          { keys: "D", description: "Dashboard" }
        ]
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
        title: "Warranty",
        shortcuts: [
          { keys: "W", description: "Warranty" }
        ]
      },
      {
        title: "Billing",
        shortcuts: [
          { keys: "B", description: "Create Bill" },
          { keys: "BR", description: "Bill Reports" },
          { keys: "SV", description: "Service Bill" },
          { keys: "SB", description: "Service Bills" },
          { keys: "SE", description: "Sales Bill (Employee)" },
          { keys: "Q", description: "Quotations" },
          { keys: "DI", description: "Discount" }
        ]
      },
      {
        title: "Suppliers & HR",
        shortcuts: [
          { keys: "AS", description: "Add Supplier" },
          { keys: "SL", description: "Supplier List" },
          { keys: "PT", description: "Payment Tracking" },
          { keys: "E", description: "Employee" },
          { keys: "UT", description: "User Type" },
          { keys: "A", description: "Attendance" },
          { keys: "SA", description: "Salary" },
          { keys: "CO", description: "Company" }
        ]
      },
      {
        title: "CRM",
        shortcuts: [
          { keys: "EN", description: "Enquiries" },
          { keys: "CU", description: "Customer Details" },
          { keys: "US", description: "User Settings" }
        ]
      },
      {
        title: "General",
        shortcuts: [
          { keys: "?", description: "Show/Hide this menu" },
          { keys: "ESC", description: "Close this menu" }
        ]
      }
    ];

    const modalStyles = {
      overlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        animation: "fadeIn 0.2s ease",
      },
      modal: {
        backgroundColor: "rgba(18, 18, 18, 0.95)",
        backdropFilter: "blur(10px)",
        borderRadius: "16px",
        padding: "24px",
        maxWidth: "800px",
        width: "90%",
        maxHeight: "80vh",
        overflowY: "auto",
        border: "1px solid rgba(77, 166, 255, 0.3)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        animation: "slideUp 0.3s ease",
      },
      header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
      },
      title: {
        fontSize: "24px",
        fontWeight: "600",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      },
      closeButton: {
        background: "none",
        border: "none",
        color: "#9ca3af",
        fontSize: "24px",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        transition: "all 0.2s",
      },
      category: {
        marginBottom: "24px",
      },
      categoryTitle: {
        fontSize: "16px",
        fontWeight: "600",
        color: "#4da6ff",
        marginBottom: "12px",
        paddingBottom: "4px",
        borderBottom: "1px solid rgba(77, 166, 255, 0.2)",
      },
      shortcutGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
        gap: "12px",
      },
      shortcutItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.05)",
      },
      shortcutKeys: {
        fontFamily: "monospace",
        fontSize: "12px",
        fontWeight: "600",
        padding: "4px 8px",
        backgroundColor: "rgba(77, 166, 255, 0.2)",
        borderRadius: "4px",
        color: "#4da6ff",
        letterSpacing: "0.5px",
      },
      shortcutDesc: {
        color: "#cbd5e1",
        fontSize: "13px",
      },
      footer: {
        marginTop: "24px",
        paddingTop: "16px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        textAlign: "center",
        fontSize: "12px",
        color: "#6b7280",
      },
    };

    return (
      <div style={modalStyles.overlay} onClick={onClose}>
        <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>
          <div style={modalStyles.header}>
            <div style={modalStyles.title}>
              <FaKeyboard size={24} color="#4da6ff" />
              Keyboard Shortcuts
            </div>
            <button style={modalStyles.closeButton} onClick={onClose}>
              ×
            </button>
          </div>

          {shortcutCategories.map((category, idx) => (
            <div key={idx} style={modalStyles.category}>
              <h3 style={modalStyles.categoryTitle}>{category.title}</h3>
              <div style={modalStyles.shortcutGrid}>
                {category.shortcuts.map((shortcut, sidx) => (
                  <div key={sidx} style={modalStyles.shortcutItem}>
                    <span style={modalStyles.shortcutKeys}>
                      {shortcut.keys}
                    </span>
                    <span style={modalStyles.shortcutDesc}>
                      {shortcut.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={modalStyles.footer}>
            <p>💡 Tip: Press <strong style={{ color: "#4da6ff" }}>?</strong> anytime to view this menu</p>
            <p style={{ marginTop: "8px" }}>Shortcuts work when not typing in input fields</p>
          </div>
        </div>
      </div>
    );
  };

  const styles = {
    container: {
      minHeight: "100vh",
      fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      color: "#e2e8f0",
      position: "relative",
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
      backgroundColor: "rgba(0, 0, 0, 0.85)",
      backdropFilter: "blur(3px)",
    },
    content: {
      position: "relative",
      zIndex: 1,
      padding: "24px",
    },
    header: {
      marginBottom: "32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
    },
    title: {
      margin: 0,
      color: "#ffffff",
      fontSize: "28px",
      fontWeight: "600",
    },
    subtitle: {
      color: "#cbd5e1",
      marginTop: "4px",
      fontSize: "14px",
    },
    refreshButton: {
      backgroundColor: "#2563eb",
      color: "white",
      border: "none",
      padding: "10px 20px",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
    },
    cards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
      gap: "20px",
      marginBottom: "30px",
    },
    card: {
      backgroundColor: "rgba(18, 18, 18, 0.85)",
      backdropFilter: "blur(8px)",
      padding: "24px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "transform 0.2s, box-shadow 0.2s, background-color 0.2s",
      cursor: "pointer",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    icon: {
      fontSize: "36px",
      padding: "12px",
      borderRadius: "12px",
      backgroundColor: "rgba(255,255,255,0.08)",
    },
    cardContent: {
      flex: 1,
    },
    cardLabel: {
      color: "#cbd5e1",
      fontSize: "14px",
      marginBottom: "4px",
    },
    cardValue: {
      color: "#ffffff",
      fontSize: "24px",
      fontWeight: "600",
      margin: 0,
    },
    cardSmallValue: {
      color: "#94a3b8",
      fontSize: "13px",
      marginTop: "4px",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "24px",
      marginBottom: "24px",
    },
    tableContainer: {
      backgroundColor: "rgba(18, 18, 18, 0.85)",
      backdropFilter: "blur(8px)",
      padding: "20px",
      borderRadius: "16px",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    tableHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "16px",
    },
    tableTitle: {
      fontSize: "18px",
      fontWeight: "600",
      color: "#ffffff",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    viewAllLink: {
      color: "#3b82f6",
      fontSize: "14px",
      cursor: "pointer",
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "6px 12px",
      backgroundColor: "rgba(59, 130, 246, 0.15)",
      borderRadius: "20px",
      transition: "all 0.2s",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      padding: "12px",
      borderBottom: "2px solid rgba(255, 255, 255, 0.1)",
      textAlign: "left",
      color: "#cbd5e1",
      fontWeight: "500",
      fontSize: "13px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    td: {
      padding: "12px",
      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
      textAlign: "left",
      fontSize: "14px",
    },
    statusBadge: {
      padding: "4px 8px",
      borderRadius: "20px",
      fontSize: "12px",
      fontWeight: "500",
      display: "inline-block",
    },
    lowStock: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#ef4444",
    },
    criticalStock: {
      backgroundColor: "rgba(127, 29, 29, 0.4)",
      color: "#fca5a5",
      border: "1px solid #7f1d1d",
    },
    loadingContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      flexDirection: "column",
      gap: "16px",
      position: "relative",
      zIndex: 1,
    },
    errorContainer: {
      backgroundColor: "rgba(239, 68, 68, 0.2)",
      color: "#ef4444",
      padding: "16px",
      borderRadius: "8px",
      marginBottom: "20px",
      border: "1px solid rgba(239, 68, 68, 0.3)",
      backdropFilter: "blur(4px)",
    },
    spinner: {
      animation: "spin 1s linear infinite",
    },
    paymentGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      marginTop: "16px",
    },
    paymentCard: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: "16px",
      borderRadius: "12px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      backdropFilter: "blur(4px)",
    },
    paymentMethod: {
      color: "#cbd5e1",
      fontSize: "14px",
      textTransform: "capitalize",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    paymentAmount: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#ffffff",
      marginTop: "8px",
    },
    paymentCount: {
      color: "#94a3b8",
      fontSize: "13px",
      marginTop: "4px",
    },
    viewAllText: {
      color: "#3b82f6",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontSize: "13px",
      transition: "all 0.2s",
    },
    shortcutButton: {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      backgroundColor: "rgba(77, 166, 255, 0.2)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(77, 166, 255, 0.4)",
      borderRadius: "40px",
      padding: "10px 16px",
      color: "#4da6ff",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      zIndex: 2000,
      transition: "all 0.2s",
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.overlay}></div>
        <div style={styles.loadingContainer}>
          <FaSpinner style={{ ...styles.spinner, fontSize: "40px", color: "#3b82f6" }} />
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.content}>
        <style>
          {`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(20px);
              }
              to { 
                opacity: 1;
                transform: translateY(0);
              }
            }
            .card:hover {
              transform: translateY(-4px);
              box-shadow: 0 8px 30px rgba(0,0,0,0.6);
              background-color: rgba(18, 18, 18, 0.95) !important;
            }
            .view-all:hover {
              background-color: rgba(59, 130, 246, 0.25) !important;
            }
            .view-all-text:hover {
              color: #60a5fa !important;
            }
            .shortcut-button:hover {
              background-color: rgba(77, 166, 255, 0.3) !important;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(77, 166, 255, 0.2);
            }
          `}
        </style>

        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Dashboard</h2>
            <p style={styles.subtitle}>
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            style={styles.refreshButton}
            onClick={fetchDashboardData}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1d4ed8"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
          >
            <FaChartLine /> Refresh Data
          </button>
        </div>

        {error && (
          <div style={styles.errorContainer}>
            <FaExclamationTriangle style={{ marginRight: "8px" }} />
            {error}
          </div>
        )}

        <div style={styles.cards}>
          <div className="card" style={styles.card}>
            <FaBoxes style={{ ...styles.icon, color: "#3b82f6" }} />
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>Total Products</div>
              <div style={styles.cardValue}>{stats.products.total}</div>
              <div style={styles.cardSmallValue}>
                {stats.products.totalQuantity} units in stock
              </div>
            </div>
          </div>

          <div className="card" style={styles.card}>
            <FaShoppingCart style={{ ...styles.icon, color: "#10b981" }} />
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>Today's Sales</div>
              <div style={styles.cardValue}>
                {formatCurrency(stats.billing.today.sales)}
              </div>
              <div style={styles.cardSmallValue}>
                {stats.billing.today.bills} bills today
              </div>
            </div>
          </div>

          <div className="card" style={styles.card}>
            <FaChartLine style={{ ...styles.icon, color: "#f59e0b" }} />
            <div style={styles.cardContent}>
              <div style={styles.cardLabel}>Average Sale</div>
              <div style={styles.cardValue}>
                {formatCurrency(stats.billing.today.average)}
              </div>
              <div style={styles.cardSmallValue}>Per customer today</div>
            </div>
          </div>
        </div>

        <div style={styles.grid2}>
          <div style={styles.tableContainer}>
            <div style={styles.tableHeader}>
              <h3 style={styles.tableTitle}>
                <FaExclamationTriangle color="#ef4444" />
                Low Stock Alert ({stats.lowStockProducts.length} items)
              </h3>
              <span
                style={styles.viewAllLink}
                onClick={handleViewAllLowStock}
                className="view-all"
              >
                View All <FaArrowRight size={12} />
              </span>
            </div>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Product</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.lowStockProducts.length > 0 ? (
                  stats.lowStockProducts.slice(0, 5).map((product) => (
                    <tr key={product.id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "500" }}>{product.name}</div>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.statusBadge,
                            ...(product.quantity === 0
                              ? styles.criticalStock
                              : styles.lowStock),
                          }}
                        >
                          {product.quantity === 0 ? "Out of Stock" : "Low Stock"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" style={{ ...styles.td, textAlign: "center", padding: "40px" }}>
                      <FaBoxes size={32} style={{ opacity: 0.5, marginBottom: "12px" }} />
                      <div>All products are well stocked ✓</div>
                      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                        No items with quantity less than 10
                      </div>
                    </td>
                  </tr>
                )}

                {stats.lowStockProducts.length > 5 && (
                  <tr>
                    <td colSpan="2" style={{ ...styles.td, textAlign: "center", backgroundColor: "rgba(0, 0, 0, 0.3)" }}>
                      <span
                        onClick={handleViewAllLowStock}
                        style={styles.viewAllText}
                        className="view-all-text"
                      >
                        <FaEye size={12} /> View all {stats.lowStockProducts.length} low stock items
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

        <button
          style={styles.shortcutButton}
          onClick={() => setShowShortcuts(true)}
          className="shortcut-button"
        >
          <FaKeyboard /> <span style={{ fontWeight: "bold" }}>?</span> Shortcuts
        </button>

        <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </div>
  );
};

export default Dashboard;