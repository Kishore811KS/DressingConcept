import React, { useState, useEffect } from "react";
import axios from "axios";
import { 
  FaMoneyBillWave, 
  FaCalendarAlt, 
  FaCalculator, 
  FaCheckDouble,
  FaFileInvoiceDollar,
  FaDownload,
  FaUser
} from "react-icons/fa";

const Salary = () => {
  const [loading, setLoading] = useState(false);
  const [salaries, setSalaries] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);

  const API_BASE_URL = "http://localhost:5000/api/salary";
  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const calculateSalaries = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/calculate?month=${month}&year=${year}`);
      setSalaries(res.data);
      if (res.data.length > 0 && !selectedEmp) setSelectedEmp(res.data[0]);
      showToast("Salaries calculated successfully");
    } catch (err) {
      showToast("Failed to calculate salaries", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateSalaries();
  }, [month, year]);

  const updateStatus = async (salaryId, status) => {
    try {
      await api.put("/update-status", { salary_id: salaryId, status });
      setSalaries(prev => prev.map(s => s.id === salaryId ? { ...s, status } : s));
      if (selectedEmp?.id === salaryId) setSelectedEmp(prev => ({ ...prev, status }));
      showToast(`Marked as ${status}`);
    } catch (err) {
      showToast("Update failed", true);
    }
  };

  const payAll = async () => {
    if (!window.confirm("Mark all pending salaries as paid?")) return;
    try {
      await api.post("/pay-all", { month, year });
      setSalaries(prev => prev.map(s => ({ ...s, status: 'paid' })));
      showToast("All salaries marked as paid");
    } catch (err) {
      showToast("Bulk update failed", true);
    }
  };

  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#f8f9fa",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      color: "#333"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "24px"
    },
    titleSection: {
      display: "flex",
      flexDirection: "column",
      gap: "4px"
    },
    title: {
      fontSize: "24px",
      fontWeight: "700",
      margin: 0,
      color: "#1a1a1a"
    },
    subtitle: {
      fontSize: "14px",
      color: "#666"
    },
    controls: {
      display: "flex",
      gap: "12px",
      alignItems: "center"
    },
    select: {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      backgroundColor: "#fff",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      outline: "none"
    },
    generateBtn: {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      backgroundColor: "#fff",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer"
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "16px",
      marginBottom: "24px"
    },
    statCard: (color) => ({
      padding: "20px",
      borderRadius: "12px",
      backgroundColor: color.bg,
      border: `1px solid ${color.border}`,
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }),
    statLabel: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#666"
    },
    statValue: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#1a1a1a"
    },
    layout: {
      display: "grid",
      gridTemplateColumns: "1fr 400px",
      gap: "24px"
    },
    card: {
      backgroundColor: "#fff",
      borderRadius: "16px",
      border: "1px solid #eee",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      padding: "24px",
      height: "fit-content"
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "700",
      marginBottom: "20px"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse"
    },
    th: {
      textAlign: "left",
      padding: "12px",
      fontSize: "13px",
      fontWeight: "600",
      color: "#888",
      borderBottom: "1px solid #eee"
    },
    td: {
      padding: "12px",
      fontSize: "14px",
      borderBottom: "1px solid #f5f5f5",
      cursor: "pointer"
    },
    statusBadge: (status) => ({
      backgroundColor: status === 'paid' ? "#e8f5e9" : "#fff3e0",
      color: status === 'paid' ? "#2e7d32" : "#e65100",
      padding: "4px 10px",
      borderRadius: "6px",
      fontSize: "12px",
      fontWeight: "700",
      textTransform: "capitalize"
    }),
    breakdownHeader: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      marginBottom: "20px"
    },
    empTab: (active) => ({
      padding: "6px 12px",
      borderRadius: "8px",
      border: `1px solid ${active ? "#4da6ff" : "#ddd"}`,
      backgroundColor: active ? "#eef6ff" : "#fff",
      color: active ? "#4da6ff" : "#666",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer"
    }),
    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      fontSize: "14px",
      borderBottom: "1px dotted #eee"
    },
    detailLabel: {
      color: "#666"
    },
    detailValue: {
      fontWeight: "600"
    },
    summaryCard: (type) => ({
      backgroundColor: type === 'net' ? "#f1f8e9" : "#fff",
      padding: "16px",
      borderRadius: "12px",
      border: type === 'net' ? "1px solid #dcedc8" : "1px solid #eee",
      marginTop: "16px"
    }),
    downloadBtn: {
      width: "100%",
      padding: "12px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      backgroundColor: "#fff",
      color: "#333",
      fontWeight: "600",
      marginTop: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      cursor: "pointer"
    },
    toast: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      padding: "12px 24px",
      borderRadius: "12px",
      backgroundColor: "#333",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "600",
      zIndex: 1000
    }
  };

  const statColors = {
    total: { bg: "#f5f5f5", border: "#eee" },
    paid: { bg: "#f1f8e9", border: "#dcedc8" },
    pending: { bg: "#fff3e0", border: "#ffe0b2" },
    deduct: { bg: "#ffebee", border: "#ffcdd2" }
  };

  const totals = salaries.reduce((acc, s) => {
    acc.total += s.calculated_salary;
    if (s.status === 'paid') acc.paid += s.calculated_salary;
    else acc.pending += s.calculated_salary;
    return acc;
  }, { total: 0, paid: 0, pending: 0, deduct: 0 });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Salary</h1>
          <span style={styles.subtitle}>Auto-calculated from attendance · per day rate set in employee profile</span>
        </div>
        <div style={styles.controls}>
           <select style={styles.select} value={`${year}-${month}`} onChange={(e) => {
             const [y, m] = e.target.value.split('-');
             setYear(y); setMonth(m);
           }}>
            <option value="2026-5">May 2026</option>
          </select>
          <button style={styles.generateBtn} onClick={payAll}>Generate all payslips</button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard(statColors.total)}>
          <span style={styles.statLabel}>Total payroll</span>
          <span style={styles.statValue}>₹{totals.total.toLocaleString()}</span>
        </div>
        <div style={styles.statCard(statColors.paid)}>
          <span style={styles.statLabel}>Paid</span>
          <span style={styles.statValue}>₹{totals.paid.toLocaleString()}</span>
        </div>
        <div style={styles.statCard(statColors.pending)}>
          <span style={styles.statLabel}>Pending</span>
          <span style={styles.statValue}>₹{totals.pending.toLocaleString()}</span>
        </div>
        <div style={styles.statCard(statColors.deduct)}>
          <span style={styles.statLabel}>Deductions (LOP)</span>
          <span style={styles.statValue}>₹0</span>
        </div>
      </div>

      <div style={styles.layout}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Payroll list</h2>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Employee</th>
                <th style={styles.th}>Eff. days</th>
                <th style={styles.th}>Gross</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map(s => (
                <tr key={s.id} onClick={() => setSelectedEmp(s)} style={{ backgroundColor: selectedEmp?.id === s.id ? "#f0f7ff" : "transparent" }}>
                  <td style={styles.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>
                        {(s.employee_name || 'E').charAt(0)}
                      </div>
                      <span style={{ fontWeight: "600" }}>{s.employee_name || 'Unknown Employee'}</span>
                    </div>
                  </td>
                  <td style={styles.td}>{s.effective_days} days</td>
                  <td style={styles.td}>₹{s.calculated_salary.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span style={styles.statusBadge(s.status)}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Salary breakdown</h2>
          <div style={styles.breakdownHeader}>
            {salaries.map(s => (
              <button key={s.id} style={styles.empTab(selectedEmp?.id === s.id)} onClick={() => setSelectedEmp(s)}>
                {(s.employee_name || 'Unknown').split(' ')[0]}
              </button>
            ))}
          </div>

          {selectedEmp ? (
            <div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Per day rate</span>
                <span style={styles.detailValue}>₹{selectedEmp.basic_salary}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Working days in month</span>
                <span style={styles.detailValue}>{selectedEmp.working_days_threshold}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Present days</span>
                <span style={styles.detailValue}>{selectedEmp.present_days}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Paid leave days</span>
                <span style={styles.detailValue}>{selectedEmp.paid_leaves} (counted as present)</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Half days</span>
                <span style={styles.detailValue}>{selectedEmp.half_days} (×0.5 = {selectedEmp.half_days * 0.5} days)</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Unpaid leave (LOP)</span>
                <span style={styles.detailValue}>{selectedEmp.unpaid_leaves} days</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Absent (LOP)</span>
                <span style={styles.detailValue}>{selectedEmp.absent_days} days</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Effective paid days</span>
                <span style={styles.detailValue}>{selectedEmp.effective_days}</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" }}>
                <div style={styles.summaryCard()}>
                   <div style={styles.detailLabel}>Gross salary</div>
                   <div style={{ ...styles.detailValue, fontSize: "16px", marginTop: "4px" }}>₹{selectedEmp.calculated_salary.toLocaleString()}</div>
                </div>
                <div style={styles.summaryCard()}>
                   <div style={styles.detailLabel}>LOP deduction</div>
                   <div style={{ ...styles.detailValue, fontSize: "16px", marginTop: "4px", color: "#c62828" }}>
                     -₹{((selectedEmp.unpaid_leaves + selectedEmp.absent_days + selectedEmp.half_days * 0.5) * selectedEmp.basic_salary).toLocaleString()}
                   </div>
                </div>
              </div>

              <div style={styles.summaryCard('net')}>
                 <div style={{ ...styles.detailLabel, color: "#2e7d32" }}>Net take-home</div>
                 <div style={{ ...styles.detailValue, fontSize: "20px", marginTop: "4px", color: "#2e7d32" }}>₹{selectedEmp.calculated_salary.toLocaleString()}</div>
              </div>

              <button style={styles.downloadBtn}>
                <FaDownload /> Download payslip
              </button>
              
              <div style={{ marginTop: "16px" }}>
                {selectedEmp.status === 'pending' ? (
                  <button 
                    style={{ ...styles.downloadBtn, backgroundColor: "#10b981", color: "white", border: "none" }}
                    onClick={() => updateStatus(selectedEmp.id, 'paid')}
                  >
                    Mark as Paid
                  </button>
                ) : (
                  <button 
                    style={{ ...styles.downloadBtn, backgroundColor: "#fff3e0", color: "#e65100", border: "none" }}
                    onClick={() => updateStatus(selectedEmp.id, 'pending')}
                  >
                    Reset to Pending
                  </button>
                )}
              </div>
            </div>
          ) : (
             <div style={{ textAlign: "center", color: "#999", padding: "40px 0" }}>Select an employee to see details</div>
          )}
        </div>
      </div>

      {toast && (
        <div style={{...styles.toast, backgroundColor: toast.isError ? "#c62828" : "#333"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Salary;
