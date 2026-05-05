import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import axios from "axios";
import { 
  FaCalendarAlt, 
  FaUserCheck, 
  FaUserTimes, 
  FaClock, 
  FaSave,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock
} from "react-icons/fa";

const AdminAttendance = () => {
  const [loading, setLoading] = useState(false);
  const [employeesAttendance, setEmployeesAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [toast, setToast] = useState(null);

  const API_BASE_URL = "http://localhost:5000/api";
  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  useEffect(() => {
    fetchAttendance(selectedDate);
  }, [selectedDate]);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAttendance = async (date) => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/list?date=${date}`);
      setEmployeesAttendance(res.data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      showToast("Failed to load attendance", true);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (attendanceId, newStatus) => {
    try {
      await api.put(`/attendance/update/${attendanceId}`, { status: newStatus });
      setEmployeesAttendance(prev => 
        prev.map(item => item.id === attendanceId ? { ...item, status: newStatus } : item)
      );
      showToast("Status updated successfully");
    } catch (err) {
      showToast("Failed to update status", true);
    }
  };

  const styles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#0a0e27",
      padding: "40px 20px",
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
    },
    content: {
      maxWidth: "1200px",
      margin: "0 auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "30px",
      flexWrap: "wrap",
      gap: "20px"
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      color: "#ffffff",
      margin: 0,
    },
    datePicker: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      background: "#1a1f3e",
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid #2a2f4a",
    },
    input: {
      background: "transparent",
      border: "none",
      color: "#ffffff",
      fontSize: "16px",
      cursor: "pointer",
      outline: "none"
    },
    tableCard: {
      background: "#1a1f3e",
      borderRadius: "12px",
      padding: "24px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      border: "1px solid #2a2f4a",
      overflow: "hidden"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
    },
    th: {
      textAlign: "left",
      padding: "12px 16px",
      fontSize: "12px",
      fontWeight: "600",
      color: "#a0a5c0",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      borderBottom: "1px solid #2a2f4a",
    },
    td: {
      padding: "16px",
      fontSize: "14px",
      color: "#e0e5f0",
      borderBottom: "1px solid #2a2f4a",
    },
    select: {
      background: "#0a0e27",
      color: "white",
      border: "1px solid #2a2f4a",
      padding: "6px 12px",
      borderRadius: "6px",
      outline: "none",
      cursor: "pointer"
    },
    statusBadge: (status) => {
      const colors = {
        present: { bg: "#10b98120", color: "#10b981" },
        leave: { bg: "#ef444420", color: "#ef4444" },
        paid_leave: { bg: "#3b82f620", color: "#3b82f6" },
        half_day: { bg: "#f59e0b20", color: "#f59e0b" },
      };
      const theme = colors[status] || colors.present;
      return {
        padding: "4px 10px",
        borderRadius: "4px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: theme.bg,
        color: theme.color,
        textTransform: "capitalize"
      };
    },
    toast: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      padding: "12px 20px",
      borderRadius: "8px",
      fontSize: "14px",
      zIndex: 1000,
      background: "#10b981",
      color: "white",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.title}>Attendance Management</h1>
          <div style={styles.datePicker}>
            <FaCalendarAlt color="#4da6ff" />
            <input 
              type="date" 
              style={styles.input} 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        <div style={styles.tableCard}>
          {loading ? (
            <div style={{ color: "#a0a5c0", textAlign: "center", padding: "40px" }}>Loading employee data...</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Employee</th>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesAttendance.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600" }}>{row.employee_name}</div>
                        <div style={{ fontSize: "12px", color: "#a0a5c0" }}>ID: {row.employee_id}</div>
                      </td>
                      <td style={styles.td}>{row.date}</td>
                      <td style={styles.td}>
                        <span style={styles.statusBadge(row.status)}>
                          {row.status.replace("_", " ")}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <select 
                          style={styles.select}
                          value={row.status}
                          onChange={(e) => updateStatus(row.id, e.target.value)}
                        >
                          <option value="present">Present</option>
                          <option value="leave">Leave</option>
                          <option value="paid_leave">Paid Leave</option>
                          <option value="half_day">Half Day</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {toast && (
        <div style={{...styles.toast, background: toast.isError ? "#ef4444" : "#10b981"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default AdminAttendance;
