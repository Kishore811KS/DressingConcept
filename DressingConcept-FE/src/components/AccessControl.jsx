import React, { useState, useEffect } from "react";

import {
  FaShieldAlt, FaInfoCircle, FaCheckCircle, FaLock,
  FaEye, FaSave, FaSyncAlt, FaTrashAlt, FaUserShield
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

// Configure axios instance with full backend URL


// ── Responsive hook ──
const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
};

const AccessControl = () => {
  const [userTypeName, setUserTypeName] = useState("");
  const [baseRole, setBaseRole] = useState("Staff");
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [userTypes, setUserTypes] = useState([]);
  const [userPermissions, setUserPermissions] = useState({});

  const width = useWindowWidth();
  const isMobile = width <= 480;
  const isTablet = width > 480 && width <= 768;
  const isSmall = width <= 768;

  const roles = ["Admin", "Manager", "HR", "Staff"];

  const modules = [
    { name: "Inventory", submodules: ["Products", "Categories", "Stock In", "Stock Out"] },
    { name: "Billing", submodules: ["Bills", "Bill Reports", "Services", "Quotations", "Invoices"] },
    { name: "HR Management", submodules: ["Employees", "Attendance", "User Types", "Access Control"] },
    { name: "CRM", submodules: ["Enquiries"] },
  ];

  const criticalSubmodules = ["User Types", "Access Control"];
  const operationalSubmodules = ["Employees", "Attendance"];

  useEffect(() => {
    calculatePermissions();
    fetchUserTypes();
  }, [baseRole]);

  const fetchUserTypes = async () => {
    try {
      const response = await api.get("/user-types");
      setUserTypes(response.data);
    } catch (error) {
      console.error("Error fetching user types:", error);
    }
  };

  const calculatePermissions = () => {
    const newPermissions = {};
    modules.forEach((module) => {
      module.submodules.forEach((sub) => {
        const p = { create: false, view: false, update: false, delete: false };
        if (baseRole === "Admin") {
          p.create = p.view = p.update = p.delete = true;
        } else if (baseRole === "Manager") {
          p.view = p.update = true;
        } else if (baseRole === "HR") {
          p.view = p.create = true;
        } else if (baseRole === "Staff") {
          p.view = true;
        }
        if (criticalSubmodules.includes(sub) && baseRole !== "Admin") {
          p.create = p.view = p.update = p.delete = false;
        }
        if (operationalSubmodules.includes(sub)) {
          if (baseRole === "Manager" || baseRole === "HR") {
            p.view = true;
            p.update = baseRole === "Manager";
            p.create = baseRole === "HR";
          }
        }
        if (p.create) p.view = true;
        if (p.delete) { p.update = true; p.view = true; }
        newPermissions[sub] = p;
      });
    });
    setUserPermissions(newPermissions);
  };

  const handleSave = async () => {
    if (!userTypeName.trim()) { alert("Please enter a User Type Name"); return; }
    setIsSaving(true);
    try {
      await api.post("/user-types", {
        name: userTypeName,
        base_template: baseRole,
        permissions: userPermissions,
      });
      setSuccessMessage(`User Type "${userTypeName}" created successfully!`);
      setUserTypeName("");
      fetchUserTypes();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error saving user type:", error);
      alert(error.response?.data?.error || "Failed to save user type");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user type?")) return;
    try {
      await api.delete(`/user-types/${id}`);
      fetchUserTypes();
    } catch (error) {
      alert("Failed to delete user type");
    }
  };

  const getStatusLabel = () => {
    if (baseRole === "Admin") return { text: "Full Access", color: "#10b981" };
    if (baseRole === "Staff") return { text: "Read Only", color: "#6b7280" };
    return { text: "Restricted Access", color: "#f59e0b" };
  };

  const status = getStatusLabel();

  // ── Actions shown on mobile: abbreviate labels ──
  const actions = isMobile
    ? ["C", "V", "U", "D"]
    : ["Create", "View", "Update", "Delete"];
  const actionKeys = ["create", "view", "update", "delete"];

  const styles = {
    card: {
      background: "rgba(30, 41, 59, 0.7)",
      backdropFilter: "blur(12px)",
      borderRadius: "16px",
      padding: isMobile ? "16px" : "24px",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
      marginBottom: "24px",
    },
    sectionTitle: {
      fontSize: isMobile ? "15px" : "18px",
      fontWeight: "600",
      color: "#f8fafc",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      marginBottom: "20px",
      flexWrap: "wrap",
    },
    inputGroup: {
      display: "grid",
      gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
      gap: isSmall ? "14px" : "20px",
      marginBottom: "32px",
    },
    field: { display: "flex", flexDirection: "column", gap: "8px" },
    label: { fontSize: "14px", color: "#94a3b8", fontWeight: "500" },
    input: {
      padding: isMobile ? "10px 12px" : "12px 16px",
      background: "rgba(15, 23, 42, 0.5)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
      borderRadius: "8px",
      color: "#fff",
      fontSize: "14px",
      outline: "none",
      transition: "border 0.2s ease",
      width: "100%",
      boxSizing: "border-box",
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 6px",
    },
    th: {
      textAlign: "left",
      padding: isMobile ? "8px 8px" : "12px 16px",
      color: "#64748b",
      fontSize: isMobile ? "11px" : "13px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.025em",
      whiteSpace: "nowrap",
    },
    tr: {
      background: "rgba(255, 255, 255, 0.02)",
      transition: "background 0.2s ease",
    },
    td: {
      padding: isMobile ? "8px 8px" : "12px 16px",
      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      fontSize: isMobile ? "12px" : "14px",
    },
    checkbox: {
      width: isMobile ? "15px" : "18px",
      height: isMobile ? "15px" : "18px",
      borderRadius: "4px",
      pointerEvents: "none",
      accentColor: "#4da6ff",
    },
    statusBadge: {
      padding: "4px 10px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "600",
      background: `${status.color}20`,
      color: status.color,
      border: `1px solid ${status.color}40`,
      marginLeft: isMobile ? "0" : "12px",
    },
    infoBox: {
      padding: isMobile ? "12px" : "16px",
      background: "rgba(77, 166, 255, 0.05)",
      border: "1px solid rgba(77, 166, 255, 0.2)",
      borderRadius: "12px",
      marginTop: "24px",
      display: "flex",
      gap: "12px",
      alignItems: "flex-start",
    },
    actionPanel: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "24px",
      gap: "12px",
      flexWrap: "wrap",
    },
    btn: {
      padding: isMobile ? "10px 16px" : "12px 24px",
      borderRadius: "8px",
      fontSize: isMobile ? "13px" : "14px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      border: "none",
    },
    btnPrimary: {
      background: "#4da6ff",
      color: "#fff",
      boxShadow: "0 4px 12px rgba(77, 166, 255, 0.3)",
    },
    btnOutline: {
      padding: isMobile ? "8px 12px" : "8px 16px",
      background: "transparent",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      color: "#94a3b8",
    },
    typeCard: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: isMobile ? "12px" : "16px",
      background: "rgba(255, 255, 255, 0.03)",
      borderRadius: "12px",
      marginBottom: "8px",
      border: "1px solid rgba(255, 255, 255, 0.05)",
    },
  };

  return (
    <div>
      {/* ── Success Toast ── */}
      {successMessage && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: isMobile ? "12px" : "20px",
          left: isMobile ? "12px" : "auto",
          padding: "12px 20px",
          background: "#10b981",
          color: "white",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 1000,
          animation: "slideIn 0.3s ease-out",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: isMobile ? "13px" : "14px",
        }}>
          <FaCheckCircle /> {successMessage}
        </div>
      )}

      {/* ── User Type Creation Card ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <FaShieldAlt color="#4da6ff" />
          User Type Creation
          <span style={styles.statusBadge}>{status.text}</span>
        </div>

        <div style={styles.inputGroup}>
          <div style={styles.field}>
            <label style={styles.label}>User Type Name</label>
            <input
              style={styles.input}
              placeholder="e.g. Sales Specialist"
              value={userTypeName}
              onChange={(e) => setUserTypeName(e.target.value)}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Base Role Template</label>
            <select
              style={styles.input}
              value={baseRole}
              onChange={(e) => setBaseRole(e.target.value)}
            >
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div style={styles.sectionTitle}>
          <FaLock color="#4da6ff" fontSize="16px" />
          Intelligent Permission Matrix
        </div>

        {/* ── Permission Table — scrollable on all small screens ── */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table style={{ ...styles.table, minWidth: isMobile ? "340px" : "500px" }}>
            <thead>
              <tr>
                {!isMobile && <th style={styles.th}>Module</th>}
                <th style={styles.th}>Submodule</th>
                {actions.map((a) => (
                  <th key={a} style={{ ...styles.th, textAlign: "center" }}>{a}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod) => (
                <React.Fragment key={mod.name}>
                  {/* On mobile, show a module group header row */}
                  {isMobile && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          ...styles.td,
                          fontWeight: "700",
                          color: "#4da6ff",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          paddingTop: "12px",
                          paddingBottom: "4px",
                          borderTop: "none",
                          borderBottom: "none",
                          background: "transparent",
                        }}
                      >
                        {mod.name}
                      </td>
                    </tr>
                  )}

                  {mod.submodules.map((sub, subIdx) => {
                    const rowPerms = userPermissions[sub] || {};
                    return (
                      <tr key={sub} style={styles.tr}>
                        {/* Desktop: merged module cell */}
                        {!isMobile && subIdx === 0 && (
                          <td
                            rowSpan={mod.submodules.length}
                            style={{
                              ...styles.td,
                              fontWeight: "700",
                              color: "#4da6ff",
                              borderRight: "1px solid rgba(255,255,255,0.05)",
                              verticalAlign: "middle",
                            }}
                          >
                            {mod.name}
                          </td>
                        )}
                        <td style={{ ...styles.td, color: "#cbd5e1" }}>{sub}</td>
                        {actionKeys.map((action) => (
                          <td key={action} style={{ ...styles.td, textAlign: "center" }}>
                            <div title="Auto-assigned based on role policy">
                              <input
                                type="checkbox"
                                style={{
                                  ...styles.checkbox,
                                  opacity: rowPerms[action] ? 1 : 0.3,
                                  cursor: "help",
                                }}
                                checked={rowPerms[action] || false}
                                readOnly
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Info Box ── */}
        <div style={styles.infoBox}>
          <FaInfoCircle color="#4da6ff" size={isMobile ? 18 : 24} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: isMobile ? "12px" : "13px", lineHeight: "1.6", color: "#94a3b8" }}>
            <strong style={{ color: "#4da6ff", display: "block", marginBottom: "4px" }}>System Policy Note</strong>
            Permissions are automatically assigned based on the selected user type and predefined access policies.
            Manual modification is restricted to ensure consistency, security, and role-based hierarchy enforcement.
          </div>
        </div>

        {/* ── Action Panel ── */}
        <div style={styles.actionPanel}>
          <button
            style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={() => setShowPreview(!showPreview)}
          >
            <FaEye /> {showPreview ? "Hide JSON" : "Preview"}
          </button>

          <button
            style={{ ...styles.btn, ...styles.btnPrimary, opacity: isSaving ? 0.7 : 1 }}
            disabled={isSaving}
            onClick={handleSave}
          >
            {isSaving ? <FaSyncAlt className="spin" /> : <FaSave />}
            {isMobile ? "Save" : "Save System Logic"}
          </button>
        </div>

        {/* ── JSON Preview ── */}
        {showPreview && (
          <div style={{
            marginTop: "20px",
            padding: isMobile ? "12px" : "16px",
            background: "#0f172a",
            borderRadius: "8px",
            fontSize: isMobile ? "11px" : "12px",
            color: "#4da6ff",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            border: "1px solid rgba(77, 166, 255, 0.3)",
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
          }}>
            {JSON.stringify({
              user_type: userTypeName || "New Role",
              base_template: baseRole,
              permissions: userPermissions,
            }, null, 2)}
          </div>
        )}
      </div>

      {/* ── Existing User Types Card ── */}
      <div style={styles.card}>
        <div style={styles.sectionTitle}>
          <FaUserShield color="#4da6ff" />
          Configured System Roles
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: isSmall ? "1fr" : "1fr 1fr",
          gap: "12px",
        }}>
          {userTypes.map((type) => (
            <div key={type.id} style={styles.typeCard}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: "600", color: "#f8fafc", fontSize: isMobile ? "13px" : "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {type.name}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: 2 }}>
                  Template: {type.base_template || "N/A"}
                </div>
              </div>
              <button
                onClick={() => handleDelete(type.id)}
                style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "8px", flexShrink: 0 }}
                title="Delete Role"
              >
                <FaTrashAlt />
              </button>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @media (max-width: 480px) {
          @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        }
      `}</style>
    </div>
  );
};

export default AccessControl;