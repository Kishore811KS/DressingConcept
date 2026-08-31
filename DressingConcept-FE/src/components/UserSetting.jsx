import React, { useState, useEffect, useMemo } from "react";
import { FaSave, FaSyncAlt, FaUserCog, FaPlus, FaTrashAlt, FaEdit, FaTimes, FaSearch, FaUser, FaUsers, FaShieldAlt } from "react-icons/fa";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

const ROLE_TEMPLATES = {
  admin: [
    "dashboard", "employee_dashboard", "products", "category", "stock_in", "stock_out", "low_stock",
    "warranty", "create_bill", "bill_reports", "ledger_book", "sale_return", "bill_number_edit", "profit_visibility", "date_filter_visibility",
    "service_bill", "service_bills", "sales_bills", "quotations", "invoices", "discount",
    "add_supplier", "supplier_list", "payment_tracking", "employee", "user_type", "attendance", "salary",
    "company", "enquiries", "customer_details", "usersettings"
  ],
  manager: [
    "dashboard", "employee_dashboard", "products", "category", "stock_in", "stock_out", "low_stock",
    "warranty", "create_bill", "bill_reports", "ledger_book", "sale_return", "bill_number_edit", "profit_visibility", "date_filter_visibility",
    "service_bill", "service_bills", "sales_bills", "quotations", "invoices", "discount",
    "add_supplier", "supplier_list", "payment_tracking", "employee", "attendance", "salary", "company",
    "enquiries", "customer_details"
  ],
  staff: [
    "employee_dashboard", "products", "stock_in", "stock_out", "create_bill", "ledger_book", "sale_return",
    "service_bill", "service_bills", "sales_bills", "warranty"
  ],
  hr: [
    "dashboard", "employee", "user_type", "attendance", "salary", "company"
  ],
  supplier: [
    "dashboard", "supplier_list", "payment_tracking"
  ]
};

const UserSetting = () => {
  const [modules, setModules] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [employees, setEmployees] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Module Structure
      const moduleRes = await api.get(`/modules`);
      const moduleData = moduleRes.data.modules || [];
      setModules(moduleData);

      // 2. Fetch User Types
      const utRes = await api.get(`/user-types`);
      const utData = Array.isArray(utRes.data) ? utRes.data : [];
      setUserTypes(utData);

      // 3. Fetch Employees
      const empRes = await api.get(`/employees`);
      const empData = Array.isArray(empRes.data) ? empRes.data : [];
      setEmployees(empData);

      // 4. Fetch Permissions for all User Types
      const updatedMatrix = {};
      await Promise.all(
        utData.map(async (ut) => {
          try {
            const permRes = await api.get(`/permissions?userType=${ut.name}`);
            const fetchedPerms = Array.isArray(permRes.data) ? permRes.data : [];
            const rolePerms = {};
            const roleNameLower = ut.name.toLowerCase();

            if (fetchedPerms.length === 0 && ROLE_TEMPLATES[roleNameLower]) {
              const template = ROLE_TEMPLATES[roleNameLower];
              moduleData.forEach(mod => {
                mod.submodules.forEach(sub => {
                  if (template.includes(sub.id.toLowerCase())) {
                    rolePerms[`${mod.id}_${sub.id}`] = true;
                  }
                });
              });
            } else {
              fetchedPerms.forEach(p => {
                rolePerms[`${p.module_id}_${p.submodule_id}`] = p.view;
              });
            }

            updatedMatrix[`role-${ut.name}`] = rolePerms;
          } catch (err) {
            console.error(`Error fetching perms for ${ut.name}:`, err);
          }
        })
      );

      // 5. Fetch Permissions for Employees (Overrides)
      empData.forEach(emp => {
        if (emp.permissions && Array.isArray(emp.permissions)) {
          const empPerms = {};
          emp.permissions.forEach(p => {
            empPerms[`${p.module_id}_${p.submodule_id}`] = p.view;
          });
          updatedMatrix[`emp-${emp.id}`] = empPerms;
        }
      });

      setMatrix(updatedMatrix);
    } catch (error) {
      console.error("Initialization error:", error);
      toast.error("Failed to load user settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCheckboxChange = (entityId, moduleId, submoduleId, roleName) => {
    const key = `${moduleId}_${submoduleId}`;
    setMatrix(prev => {
      const currentEntry = prev[entityId] || prev[`role-${roleName}`] || {};
      return {
        ...prev,
        [entityId]: {
          ...currentEntry,
          [key]: !currentEntry[key]
        }
      };
    });
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      const bulkData = {};

      // Save Roles
      userTypes.forEach(ut => {
        const identifier = `role-${ut.name}`;
        const roleMatrix = matrix[identifier] || {};
        const permissionsArray = [];
        const isAdmin = ut.name.toLowerCase() === "admin";

        modules.forEach(mod => {
          mod.submodules.forEach(sub => {
            const isView = isAdmin ? true : (roleMatrix[`${mod.id}_${sub.id}`] || false);
            permissionsArray.push({
              user_type: ut.name,
              module_id: mod.id,
              submodule_id: sub.id,
              view: isView,
              add: isView,
              edit: isView,
              delete: isView
            });
          });
        });
        bulkData[identifier] = permissionsArray;
      });

      // Save Employee Overrides
      employees.forEach(emp => {
        const identifier = `emp-${emp.id}`;
        if (matrix[identifier]) {
          const empMatrix = matrix[identifier];
          const permissionsArray = [];
          modules.forEach(mod => {
            mod.submodules.forEach(sub => {
              const isView = empMatrix[`${mod.id}_${sub.id}`] || false;
              permissionsArray.push({
                module_id: mod.id,
                submodule_id: sub.id,
                view: isView
              });
            });
          });
          bulkData[identifier] = permissionsArray;
        }
      });

      await api.post(`/bulk-save-permissions`, bulkData);

      // Sync active logged-in user's permissions in localStorage if updated
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const currentUserType = currentUser?.user_type || "";
      if (currentUserType && bulkData[`role-${currentUserType}`]) {
        const updatedUserPerms = bulkData[`role-${currentUserType}`];
        const updatedUser = { ...currentUser, permissions: updatedUserPerms };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      toast.success("Security policies updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to update security policies");
    } finally {
      setSaving(false);
    }
  };

  const addUserType = async () => {
    if (!newName.trim()) return;
    try {
      await api.post(`/user-types`, { name: newName.trim() });
      toast.success("User type created!");
      setNewName("");
      setAddingUser(false);
      fetchInitialData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create user type");
    }
  };

  const deleteUserType = async (id, name) => {
    if (name.toLowerCase() === "admin") {
      toast.error("Cannot delete admin role");
      return;
    }
    if (!window.confirm(`Delete role "${name}"? This will remove all associated permissions.`)) return;
    try {
      await api.delete(`/user-types/${id}`);
      toast.success("User type deleted");
      fetchInitialData();
    } catch (err) {
      toast.error("Failed to delete user type");
    }
  };

  const deleteEmployee = async (id, name) => {
    if (!window.confirm(`Delete employee "${name}"? This action cannot be undone.`)) return;
    try {
      await api.delete(`/employees/${id}`);
      toast.success(`Employee "${name}" deleted`);
      fetchInitialData();
    } catch (err) {
      toast.error("Failed to delete employee: " + (err.response?.data?.error || err.message));
    }
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setEditName(user.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const updateUserType = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/user-types/${id}`, { name: editName.trim() });
      toast.success("User type updated");
      setEditingId(null);
      fetchInitialData();
    } catch (err) {
      toast.error("Failed to update user type");
    }
  };

  const filteredEntities = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    // Convert user types (roles) to a standard format
    const roles = userTypes.map(ut => ({
      id: `role-${ut.name}`,
      originalId: ut.id,
      name: ut.name,
      userTypeName: ut.name,
      isRole: true
    }));

    if (!term) return roles;

    return roles.filter(item =>
      item.name.toLowerCase().includes(term) ||
      (item.userTypeName || "").toLowerCase().includes(term)
    );
  }, [userTypes, searchTerm]);

  const allSubmodules = useMemo(() => {
    const list = [];
    modules.forEach(mod => {
      mod.submodules.forEach(sub => {
        list.push({ ...sub, moduleId: mod.id, moduleName: mod.name });
      });
    });
    return list;
  }, [modules]);

  const styles = {
    wrapper: {
      background: "#0b1329",
      padding: "24px",
      minHeight: "100vh",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: "#f8fafc"
    },
    header: {
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "16px",
      background: "#1e293b",
      padding: "20px 24px",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      border: "1px solid #334155"
    },
    title: {
      fontSize: "20px",
      fontWeight: "800",
      color: "#f8fafc",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      margin: 0
    },
    tableContainer: {
      background: "#1e293b",
      borderRadius: "12px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
      overflow: "auto",
      maxHeight: "calc(100vh - 230px)",
      position: "relative",
      border: "1px solid #334155"
    },
    table: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontSize: "13px"
    },
    thCategory: {
      background: "#0f172a",
      color: "#38bdf8",
      padding: "12px 14px",
      fontWeight: "800",
      textAlign: "center",
      borderBottom: "1px solid #334155",
      borderRight: "1px solid #334155",
      position: "sticky",
      top: 0,
      zIndex: 10,
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      fontSize: "11px"
    },
    thSubmodule: {
      background: "#1e293b",
      color: "#94a3b8",
      padding: "10px 12px",
      fontWeight: "600",
      textAlign: "center",
      borderBottom: "1px solid #334155",
      borderRight: "1px solid rgba(51, 65, 85, 0.5)",
      position: "sticky",
      top: "41px",
      zIndex: 10,
      fontSize: "12px"
    },
    stickyCol: {
      position: "sticky",
      left: 0,
      background: "#1e293b",
      zIndex: 20,
      borderRight: "2px solid #334155",
      borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
      padding: "14px 20px",
      minWidth: "240px",
      fontWeight: "600",
      color: "#f8fafc",
      display: "flex",
      alignItems: "center",
      gap: "12px"
    },
    avatar: {
      width: "32px",
      height: "32px",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "700",
      color: "#fff",
      flexShrink: 0
    },
    stickyHeaderCol: {
      position: "sticky",
      left: 0,
      top: 0,
      zIndex: 30,
      background: "#0f172a",
      borderRight: "2px solid #334155",
      borderBottom: "1px solid #334155",
      padding: "14px 20px",
      textAlign: "left",
      color: "#38bdf8",
      fontSize: "11px",
      textTransform: "uppercase",
      fontWeight: "800",
      letterSpacing: "0.5px"
    },
    td: {
      padding: "10px",
      textAlign: "center",
      borderBottom: "1px solid rgba(51, 65, 85, 0.4)",
      borderRight: "1px solid rgba(51, 65, 85, 0.4)",
      background: "#1e293b"
    },
    checkbox: {
      width: "18px",
      height: "18px",
      cursor: "pointer",
      accentColor: "#0284c7"
    },
    btnSave: {
      background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      color: "#ffffff",
      padding: "9px 20px",
      borderRadius: "8px",
      border: "none",
      fontWeight: "700",
      fontSize: "13px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
      transition: "all 0.2s"
    },
    btnRefresh: {
      background: "#334155",
      color: "#f8fafc",
      padding: "9px 18px",
      borderRadius: "8px",
      border: "1px solid #475569",
      fontWeight: "600",
      fontSize: "13px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s"
    },
    btnSecondary: {
      background: "#334155",
      color: "#f8fafc",
      padding: "9px 18px",
      borderRadius: "8px",
      border: "1px solid #475569",
      fontWeight: "600",
      fontSize: "13px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s"
    },
    controls: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px"
    },
    actionBtn: {
      padding: "6px",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      background: "#334155",
      color: "#94a3b8",
      transition: "all 0.2s"
    },
    searchContainer: {
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
      background: "#1e293b",
      padding: "10px 16px",
      borderRadius: "10px",
      border: "1px solid #334155",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
    },
    searchInput: {
      flex: 1,
      border: "none",
      outline: "none",
      fontSize: "13px",
      color: "#ffffff",
      background: "transparent"
    }
  };

  const getAvatarColor = (name) => {
    const colors = [
      "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
      "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
      "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
      "linear-gradient(135deg, #ec4899 0%, #db2777 100%)"
    ];
    const charCode = name.charCodeAt(0);
    return colors[charCode % colors.length];
  };

  if (loading) {
    return (
      <div style={styles.wrapper}>
        <div style={{ textAlign: "center", padding: "100px" }}>
          <FaSyncAlt className="spin" size={40} color="#38bdf8" />
          <p style={{ marginTop: "20px", color: "#94a3b8", fontWeight: "600" }}>Loading Security Matrix...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="us-root" style={styles.wrapper}>
      <ToastContainer position="top-right" theme="dark" />
      <div style={styles.header}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h1 style={styles.title}>
            <div style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              padding: "8px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(2,132,199,0.3)"
            }}>
              <FaShieldAlt size={18} color="#ffffff" />
            </div>
            User Settings & Permissions Matrix
          </h1>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
            Configure and govern granular access privileges across all organizational roles
          </p>
        </div>
        <div style={styles.controls}>
          {addingUser ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="New role name..."
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "#0f172a",
                  color: "#ffffff",
                  fontSize: "13px",
                  outline: "none"
                }}
              />
              <button
                style={{ ...styles.btnSave, padding: "8px 16px" }}
                onClick={addUserType}
              >
                Add
              </button>
              <button
                style={{ ...styles.btnSecondary, padding: "8px 16px" }}
                onClick={() => setAddingUser(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button style={styles.btnSecondary} onClick={() => setAddingUser(true)}>
              <FaPlus size={12} /> Add Role
            </button>
          )}

          <button style={styles.btnRefresh} onClick={fetchInitialData}>
            <FaSyncAlt size={12} /> Sync
          </button>
          <button
            style={{ ...styles.btnSave, opacity: saving ? 0.7 : 1 }}
            onClick={handleSaveMatrix}
            disabled={saving}
          >
            <FaSave size={13} /> {saving ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div style={styles.searchContainer}>
        <FaSearch color="#64748b" />
        <input
          style={styles.searchInput}
          placeholder="Search User Type / Role..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <FaTimes
            color="#94a3b8"
            style={{ cursor: "pointer" }}
            onClick={() => setSearchTerm("")}
          />
        )}
      </div>

      <div style={styles.tableContainer} className="tbl-scroll">
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.stickyHeaderCol} rowSpan={2}>Organization Roles</th>
              {modules.map(mod => (
                <th
                  key={mod.id}
                  style={styles.thCategory}
                  colSpan={mod.submodules.length}
                >
                  {mod.name}
                </th>
              ))}
            </tr>
            <tr>
              {allSubmodules.map(sub => (
                <th key={`${sub.moduleId}_${sub.id}`} style={styles.thSubmodule}>
                  {sub.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEntities.map(entity => (
              <tr key={entity.id}>
                <td style={styles.stickyCol}>
                  <div style={{ ...styles.avatar, background: getAvatarColor(entity.name) }}>
                    {entity.isEmployee ? <FaUser size={13} /> : <FaUsers size={13} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    {editingId === entity.originalId && entity.isRole ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          style={{
                            width: "90px",
                            fontSize: "12px",
                            padding: "4px 6px",
                            background: "#0f172a",
                            border: "1px solid #334155",
                            color: "#ffffff",
                            borderRadius: "4px",
                            outline: "none"
                          }}
                        />
                        <FaSave color="#34d399" style={{ cursor: "pointer" }} onClick={() => updateUserType(entity.originalId)} />
                        <FaTimes color="#f87171" style={{ cursor: "pointer" }} onClick={cancelEdit} />
                      </div>
                    ) : (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "700", fontSize: entity.isEmployee ? "13px" : "14px", color: "#f8fafc" }}>
                            {entity.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "#94a3b8", display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
                            {entity.isRole ? (
                              <span style={{
                                color: "#38bdf8",
                                background: "rgba(2, 132, 199, 0.15)",
                                border: "1px solid rgba(2, 132, 199, 0.3)",
                                padding: "1px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                                fontWeight: "700"
                              }}>
                                ROLE
                              </span>
                            ) : (
                              <>
                                <span style={{ fontWeight: "600", color: "#818cf8" }}>{entity.userTypeName?.toUpperCase()}</span>
                                {entity.department && <span>• {entity.department}</span>}
                              </>
                            )}
                          </div>
                          {entity.name.toLowerCase() === "admin" && entity.isRole && (
                            <span style={{
                              fontSize: "10px",
                              color: "#34d399",
                              background: "rgba(16, 185, 129, 0.15)",
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontWeight: "700",
                              display: "inline-block",
                              marginTop: "4px"
                            }}>
                              SUPER ADMIN
                            </span>
                          )}
                        </div>
                        {/* Action buttons for Roles */}
                        {entity.isRole && entity.name.toLowerCase() !== "admin" && (
                          <div style={{ display: "flex", gap: "5px" }}>
                            <button
                              style={styles.actionBtn}
                              title="Edit Name"
                              onClick={() => startEdit({ id: entity.originalId, name: entity.name })}
                            >
                              <FaEdit color="#94a3b8" />
                            </button>
                            <button
                              style={{ ...styles.actionBtn, background: "rgba(239, 68, 68, 0.15)" }}
                              title="Delete Role"
                              onClick={() => deleteUserType(entity.originalId, entity.name)}
                            >
                              <FaTrashAlt color="#f87171" />
                            </button>
                          </div>
                        )}
                        {/* Delete button for Employees */}
                        {entity.isEmployee && (
                          <div style={{ display: "flex", gap: "5px" }}>
                            <button
                              style={{ ...styles.actionBtn, background: "rgba(239, 68, 68, 0.15)" }}
                              title="Delete Employee"
                              onClick={() => deleteEmployee(entity.originalId, entity.name)}
                            >
                              <FaTrashAlt color="#f87171" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                {allSubmodules.map(sub => {
                  const rolePerms = matrix[`role-${entity.userTypeName}`] || {};
                  const entityPerms = matrix[entity.id] || rolePerms;
                  const isChecked = entityPerms[`${sub.moduleId}_${sub.id}`] || false;
                  const isAdmin = entity.userTypeName?.toLowerCase() === "admin";

                  return (
                    <td key={`${entity.id}_${sub.moduleId}_${sub.id}`} style={styles.td}>
                      <input
                        type="checkbox"
                        checked={isAdmin ? true : isChecked}
                        disabled={isAdmin}
                        onChange={() => handleCheckboxChange(entity.id, sub.moduleId, sub.id, entity.userTypeName)}
                        style={{
                          ...styles.checkbox,
                          opacity: isAdmin ? 0.4 : 1
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .spin { animation: spin 1.5s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        tr:hover td { background-color: #0f172a !important; }
        .tbl-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .tbl-scroll::-webkit-scrollbar-track { background: #0f172a; }
        .tbl-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .tbl-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default UserSetting;
