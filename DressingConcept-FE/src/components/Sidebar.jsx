import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaBoxOpen,
  FaFileInvoice,
  FaFileAlt,
  FaTruck,
  FaList,
  FaArrowDown,
  FaTags,
  FaExclamationTriangle,
  FaArrowUp,
  FaClipboardList,
  FaFileInvoiceDollar,
  FaUsers,
  FaBoxes,
  FaShoppingCart,
  FaUserCheck,
  FaUserCog,
  FaCog,
  FaPercent,
  FaClipboardCheck,
  FaShieldAlt,
  FaPlusCircle,
  FaListAlt,
  FaMoneyBillWave,
  FaUserPlus,
  FaUserTag,
  FaCalendarCheck,
  FaBuilding,
  FaPhoneAlt,
  FaUserCircle,
  FaFileContract,
  FaReceipt,
  FaChartLine,
  FaKeyboard,
  FaUndo,
  FaBook,
} from "react-icons/fa";

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

const Sidebar = ({ isOpen }) => {
  const HEADER_HEIGHT = "65px";

  // Get user and permissions from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userPermissions = user?.permissions || [];
  const userType = user?.user_type || "";

  // Helper to check if a submodule is permitted
  const hasPermission = (submodule_id) => {
    const isAdmin = userType?.toLowerCase() === 'admin' || user?.email === 'admin@m3cars.com';
    if (isAdmin) return true;
    if (!Array.isArray(userPermissions)) return false;
    const perm = userPermissions.find(p => p.submodule_id === submodule_id);
    return perm ? perm.view === true : false;
  };

  // Helper to check if a section should be visible
  const isSectionVisible = (submodule_ids) => {
    const isAdmin = userType?.toLowerCase() === 'admin' || user?.email === 'admin@m3cars.com';
    if (isAdmin) return true;
    return submodule_ids.some(id => hasPermission(id));
  };

  // Define shortcuts for each menu item
  const getShortcut = (path) => {
    const shortcuts = {
      '/dashboard': 'D',
      '/admin-product': 'P',
      '/employee-product': 'EP',
      '/type': 'C',
      '/itemlist': 'V',
      '/stockout': 'O',
      '/lowstock': 'L',
      '/warranty': 'W',
      '/bill': 'B',
      '/billreport': 'R',
      '/ledger-book': 'LB',
      '/salereturn': 'SR',
      '/service': 'G',
      '/serviceBillView': 'X',
      '/employeebill': 'Y',
      '/quotation': 'Q',
      '/discount': 'I',
      '/supplier': 'S',
      '/supplierList': 'K',
      '/paymenttracking': 'T',
      '/employee': 'E',
      '/usertype': 'UT',
      '/attendance': 'A',
      '/salary': 'M',
      '/company': 'Z',
      '/enquiry': 'N',
      '/customer': 'F',
      '/usersettings': 'US',
    };
    return shortcuts[path] || '';
  };

  const styles = {
    sidebar: {
      width: isOpen ? "230px" : "60px",
      height: `calc(100vh - ${HEADER_HEIGHT})`,
      background: "linear-gradient(180deg, #111827, #0f172a)",
      color: "#fff",
      padding: "20px 8px",
      position: "fixed",
      top: HEADER_HEIGHT,
      left: 0,
      transition: "all 0.3s ease",
      overflowY: "auto",
      overflowX: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: "4px 0 20px rgba(0,0,0,0.4)",
      scrollbarWidth: "thin",
      scrollbarColor: "#4da6ff #1f2937",
    },
    logoSection: {
      marginBottom: "25px",
      fontSize: isOpen ? "18px" : "14px",
      fontWeight: "600",
      letterSpacing: "1px",
      textAlign: "center",
      padding: "8px 4px",
      color: "#4da6ff",
      borderBottom: "1px solid rgba(77, 166, 255, 0.2)",
      whiteSpace: "nowrap",
      transition: "all 0.3s ease",
    },
    navContainer: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      flex: 1,
    },
    link: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "12px",
      padding: "10px 12px",
      color: "#9ca3af",
      textDecoration: "none",
      borderRadius: "8px",
      transition: "all 0.2s ease",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "nowrap",
      minHeight: "40px",
    },
    activeLink: {
      background: "rgba(77, 166, 255, 0.15)",
      color: "#4da6ff",
    },
    icon: {
      fontSize: "18px",
      minWidth: "20px",
    },
    text: {
      display: isOpen ? "inline" : "none",
      opacity: isOpen ? 1 : 0,
      transition: "opacity 0.2s ease",
      flex: 1,
    },
    shortcut: {
      display: isOpen ? "inline-block" : "none",
      fontSize: "10px",
      padding: "2px 6px",
      backgroundColor: "rgba(77, 166, 255, 0.2)",
      borderRadius: "4px",
      color: "#4da6ff",
      fontFamily: "monospace",
      fontWeight: "600",
      letterSpacing: "0.5px",
    },
    divider: {
      height: "1px",
      background: "rgba(255,255,255,0.1)",
      margin: "12px 0",
    },
    sectionTitle: {
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      color: "#6b7280",
      padding: "8px 12px 4px",
      display: isOpen ? "block" : "none",
    },
  };

  const scrollbarStyles = `
    .sidebar::-webkit-scrollbar {
      width: 4px;
    }
    .sidebar::-webkit-scrollbar-track {
      background: #1f2937;
    }
    .sidebar::-webkit-scrollbar-thumb {
      background: #4da6ff;
      border-radius: 4px;
    }
    .sidebar::-webkit-scrollbar-thumb:hover {
      background: #3b82f6;
    }
  `;

  const getLinkStyle = ({ isActive }) =>
    isActive
      ? { ...styles.link, ...styles.activeLink }
      : styles.link;

  const renderLink = (to, icon, label) => {
    const shortcut = getShortcut(to);
    return (
      <NavLink to={to} style={getLinkStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
          {icon}
          <span style={styles.text}>{label}</span>
        </div>
        {shortcut && <span style={styles.shortcut}>{shortcut}</span>}
      </NavLink>
    );
  };

  return (
    <>
      <style>{scrollbarStyles}</style>
      <div style={styles.sidebar} className="sidebar">
        <div style={styles.logoSection}>
          {isOpen ? "Dressing Concept" : "DC"}
        </div>

        <div style={styles.navContainer}>
          {/* Main Navigation */}
          {isSectionVisible(["dashboard", "employee_dashboard"]) && (
            <>
              <div style={styles.sectionTitle}>Main</div>
              {hasPermission("dashboard") && renderLink("/dashboard", <FaTachometerAlt style={styles.icon} />, "Dashboard")}
              {hasPermission("employee_dashboard") && renderLink("/dashboard", <FaTachometerAlt style={styles.icon} />, "Employee Dashboard")}
            </>
          )}

          {/* Inventory Management */}
          {isSectionVisible(["admin_products", "employee_products", "category", "stock_in", "stock_out", "low_stock"]) && (
            <>
              <div style={styles.sectionTitle}>Inventory</div>
              {hasPermission("admin_products") && renderLink("/admin-product", <FaBoxes style={styles.icon} />, "Admin Products")}
              {hasPermission("employee_products") && renderLink("/employee-product", <FaBoxes style={styles.icon} />, "Employee Products")}
              {hasPermission("category") && renderLink("/type", <FaTags style={styles.icon} />, "Category")}
              {hasPermission("stock_in") && renderLink("/itemlist", <FaArrowDown style={styles.icon} />, "Stock In")}
              {hasPermission("stock_out") && renderLink("/stockout", <FaArrowUp style={styles.icon} />, "Stock Out")}
              {hasPermission("low_stock") && renderLink("/lowstock", <FaExclamationTriangle style={styles.icon} />, "Low Stock")}
            </>
          )}

          {/* Warranty Section
          {isSectionVisible(["warranty"]) && (
            <>
              <div style={styles.sectionTitle}>Warranty</div>
              {hasPermission("warranty") && renderLink("/warranty", <FaShieldAlt style={styles.icon} />, "Warranty")}
            </>
          )} */}

          {/* Billing Section */}
          {isSectionVisible(["create_bill", "bill_reports", "ledger_book", "sale_return", "service_bill", "service_bills", "sales_bills", "quotations", "invoices", "discount"]) && (
            <>
              <div style={styles.sectionTitle}>Billing</div>
              {hasPermission("create_bill") && renderLink("/bill", <FaReceipt style={styles.icon} />, "Create Bill")}
              {hasPermission("bill_reports") && renderLink("/billreport", <FaChartLine style={styles.icon} />, "Bill Reports")}
              {(hasPermission("bill_reports") || hasPermission("ledger_book")) && renderLink("/ledger-book", <FaBook style={styles.icon} />, "Ledger Book")}
              {(hasPermission("bill_reports") || hasPermission("sale_return")) && renderLink("/salereturn", <FaUndo style={styles.icon} />, "Sale Return")}
              {hasPermission("service_bill") && renderLink("/service", <FaShoppingCart style={styles.icon} />, "Service Bill")}
              {hasPermission("service_bills") && renderLink("/serviceBillView", <FaFileContract style={styles.icon} />, "Service Bills")}
              {/* {hasPermission("sales_bills") && renderLink("/employeebill", <FaUserCircle style={styles.icon} />, "SalesBill(emp)")} */}
              {hasPermission("quotations") && renderLink("/quotation", <FaClipboardList style={styles.icon} />, "Quotations")}
              {/* {hasPermission("discount") && renderLink("/discount", <FaPercent style={styles.icon} />, "Discount")} */}
            </>
          )}

          {/* Supplier Section */}
          {isSectionVisible(["add_supplier", "supplier_list", "payment_tracking", "employee", "user_type", "attendance", "salary", "company"]) && (
            <>
              <div style={styles.sectionTitle}>Suppliers & HR</div>
              {hasPermission("add_supplier") && renderLink("/supplier", <FaPlusCircle style={styles.icon} />, "Add Supplier")}
              {hasPermission("supplier_list") && renderLink("/supplierList", <FaListAlt style={styles.icon} />, "Supplier List")}
              {hasPermission("payment_tracking") && renderLink("/paymenttracking", <FaMoneyBillWave style={styles.icon} />, "Payment Tracking")}
              {hasPermission("employee") && renderLink("/employee", <FaUserPlus style={styles.icon} />, "Employee")}
              {hasPermission("user_type") && renderLink("/usertype", <FaUserTag style={styles.icon} />, "User Type")}
              {hasPermission("attendance") && renderLink("/attendance", <FaCalendarCheck style={styles.icon} />, "Attendance")}
              {hasPermission("salary") && renderLink("/salary", <FaMoneyBillWave style={styles.icon} />, "Salary")}
              {hasPermission("company") && renderLink("/company", <FaBuilding style={styles.icon} />, "Company")}
            </>
          )}

          {/* CRM Section */}
          {isSectionVisible(["enquiries", "customer_details", "usersettings"]) && (
            <>
              <div style={styles.sectionTitle}>CRM</div>
              {hasPermission("enquiries") && renderLink("/enquiry", <FaPhoneAlt style={styles.icon} />, "Enquiries")}
              {hasPermission("customer_details") && renderLink("/customer", <FaUsers style={styles.icon} />, "Customer Details")}
              {hasPermission("usersettings") && renderLink("/usersettings", <FaUserCog style={styles.icon} />, "User Settings")}
            </>
          )}
        </div>

        {isOpen && (
          <div style={{
            fontSize: "10px",
            color: "#6b7280",
            textAlign: "center",
            padding: "16px 0 8px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            marginTop: "auto"
          }}>
            <FaKeyboard style={{ marginRight: "4px" }} /> Press ? for shortcuts
            <div>v1.0.0</div>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
