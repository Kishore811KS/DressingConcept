import React, { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import axios from "axios";
import { 
  FaCalendarAlt, 
  FaUserCheck, 
  FaUserTimes, 
  FaClock, 
  FaFileExport,
  FaCheckCircle,
  FaTimesCircle,
  FaUserClock,
  FaChevronDown
} from "react-icons/fa";

const Attendance = () => {
  const [loading, setLoading] = useState(false);
  const [employeesAttendance, setEmployeesAttendance] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [workingDays, setWorkingDays] = useState(22);
  const [isEditingWorkingDays, setIsEditingWorkingDays] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const API_BASE_URL = "http://localhost:5000/api";
  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  useEffect(() => {
    fetchAttendance(format(selectedDate, "yyyy-MM-dd"));
    fetchMonthlySummary();
    fetchWorkingDays();
  }, [selectedDate, selectedMonth, selectedYear]);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAttendance = async (dateStr) => {
    setLoading(true);
    try {
      const res = await api.get(`/attendance/list?date=${dateStr}`);
      setEmployeesAttendance(res.data);
    } catch (err) {
      console.error("Error fetching attendance:", err);
      showToast("Failed to load attendance", true);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const res = await api.get(`/attendance/monthly-list?month=${selectedMonth}&year=${selectedYear}`);
      setMonthlySummary(res.data);
    } catch (err) {
      console.error("Error fetching monthly summary:", err);
    }
  };

  const updateStatus = async (attendanceId, newStatus) => {
    try {
      await api.put(`/attendance/update/${attendanceId}`, { status: newStatus });
      setEmployeesAttendance(prev => 
        prev.map(item => item.id === attendanceId ? { ...item, status: newStatus } : item)
      );
      fetchMonthlySummary(); // Refresh summary
      showToast("Status updated successfully");
    } catch (err) {
      showToast("Failed to update status", true);
    }
  };

  const fetchWorkingDays = async () => {
    try {
      const res = await api.get(`/attendance/get-config?month=${selectedMonth}&year=${selectedYear}`);
      setWorkingDays(res.data.working_days);
    } catch (err) {
      console.error("Error fetching working days:", err);
    }
  };

  const saveWorkingDays = async (val) => {
    try {
      await api.post("/attendance/set-config", {
        month: selectedMonth,
        year: selectedYear,
        working_days: parseInt(val)
      });
      setWorkingDays(parseInt(val));
      setIsEditingWorkingDays(false);
      showToast("Working days updated");
    } catch (err) {
      showToast("Failed to save working days", true);
    }
  };

  // Mock stats for the dashboard feel
  const stats = useMemo(() => {
    const present = employeesAttendance.filter(a => a.status === 'present').length;
    const leave = employeesAttendance.filter(a => a.status === 'leave').length;
    const paidLeave = employeesAttendance.filter(a => a.status === 'paid_leave').length;
    const halfDay = employeesAttendance.filter(a => a.status === 'half_day').length;
    const absent = employeesAttendance.filter(a => a.status === 'absent').length;
    return { present, leave, paidLeave, halfDay, absent, workingDays: workingDays }; 
  }, [employeesAttendance, workingDays]);

  const filteredAttendance = useMemo(() => {
    return employeesAttendance.filter(emp => 
      (emp.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employeesAttendance, searchTerm]);

  const filteredMonthlySummary = useMemo(() => {
    return monthlySummary.filter(emp => 
      (emp.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [monthlySummary, searchTerm]);

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
    searchInput: {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      backgroundColor: "#fff",
      fontSize: "14px",
      outline: "none",
      width: "250px"
    },
    exportBtn: {
      padding: "8px 16px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      backgroundColor: "#fff",
      fontSize: "14px",
      fontWeight: "500",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      cursor: "pointer"
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(5, 1fr)",
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
    statValue: (color) => ({
      fontSize: "28px",
      fontWeight: "700",
      color: color.text
    }),
    mainCard: {
      backgroundColor: "#fff",
      borderRadius: "16px",
      border: "1px solid #eee",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      padding: "24px",
      marginBottom: "24px"
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "700",
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    adminTip: {
      fontSize: "12px",
      fontWeight: "500",
      backgroundColor: "#fff3e0",
      color: "#e65100",
      padding: "6px 12px",
      borderRadius: "6px"
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
      verticalAlign: "middle"
    },
    avatar: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      backgroundColor: "#e3f2fd",
      color: "#1976d2",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "12px",
      fontWeight: "700"
    },
    statusBadge: (status) => {
      const config = {
        present: { bg: "#e8f5e9", text: "#2e7d32" },
        leave: { bg: "#ffebee", text: "#c62828" },
        paid_leave: { bg: "#e3f2fd", text: "#1565c0" },
        half_day: { bg: "#fff3e0", text: "#ef6c00" },
        absent: { bg: "#fafafa", text: "#757575" }
      };
      const theme = config[status] || config.present;
      return {
        backgroundColor: theme.bg,
        color: theme.text,
        padding: "4px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "700"
      };
    },
    dropdown: {
      padding: "8px 12px",
      borderRadius: "8px",
      border: "1px solid #ddd",
      backgroundColor: "#fff",
      fontSize: "14px",
      fontWeight: "600",
      width: "140px",
      cursor: "pointer",
      outline: "none"
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
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      zIndex: 1000
    }
  };

  const statColors = {
    working: { bg: "#f5f5f5", border: "#eee", text: "#333" },
    present: { bg: "#f1f8e9", border: "#dcedc8", text: "#2e7d32" },
    leave: { bg: "#fff3e0", border: "#ffe0b2", text: "#e65100" },
    paid: { bg: "#e3f2fd", border: "#bbdefb", text: "#1565c0" },
    half: { bg: "#f3e5f5", border: "#e1bee7", text: "#7b1fa2" },
    absent: { bg: "#f5f5f5", border: "#e0e0e0", text: "#616161" }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Attendance</h1>
          <span style={styles.subtitle}>Auto-marked daily · Admin can override</span>
        </div>
        <div style={styles.controls}>
          <input 
            type="text" 
            placeholder="Search employee..." 
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select style={styles.select} value={`${selectedYear}-${selectedMonth}`}>
            <option value="2026-5">May 2026</option>
          </select>
          <button style={styles.exportBtn}>
            <FaFileExport /> Export
          </button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard(statColors.working)}>
          <span style={styles.statLabel}>Working days</span>
          {isEditingWorkingDays ? (
            <input 
              type="number"
              defaultValue={workingDays}
              autoFocus
              onBlur={(e) => saveWorkingDays(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveWorkingDays(e.target.value)}
              style={{...styles.statValue(statColors.working), width: '60px', border: '1px solid #ddd', borderRadius: '4px', padding: '0 4px'}}
            />
          ) : (
            <span 
              style={{...styles.statValue(statColors.working), cursor: 'pointer'}} 
              onClick={() => setIsEditingWorkingDays(true)}
              title="Click to edit"
            >
              {workingDays}
            </span>
          )}
        </div>
        <div style={styles.statCard(statColors.present)}>
          <span style={styles.statLabel}>Present today</span>
          <span style={styles.statValue(statColors.present)}>{stats.present}</span>
        </div>
        <div style={styles.statCard(statColors.leave)}>
          <span style={styles.statLabel}>On leave</span>
          <span style={styles.statValue(statColors.leave)}>{stats.leave}</span>
        </div>
        <div style={styles.statCard(statColors.paid)}>
          <span style={styles.statLabel}>Paid leave</span>
          <span style={styles.statValue(statColors.paid)}>{stats.paidLeave}</span>
        </div>
        <div style={styles.statCard(statColors.half)}>
          <span style={styles.statLabel}>Half day</span>
          <span style={styles.statValue(statColors.half)}>{stats.halfDay}</span>
        </div>
        <div style={styles.statCard(statColors.absent)}>
          <span style={styles.statLabel}>Absent today</span>
          <span style={styles.statValue(statColors.absent)}>{stats.absent}</span>
        </div>
      </div>

      <div style={styles.mainCard}>
        <div style={styles.cardTitle}>
          <span>Daily attendance — {format(selectedDate, "dd MMM yyyy")}</span>
          <span style={styles.adminTip}>Admin: change dropdown to override auto-marked status</span>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Per day rate</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Leave type</th>
              <th style={styles.th}>Remark</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.map((emp) => (
              <tr key={emp.id}>
                <td style={styles.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={styles.avatar}>{(emp.employee_name || 'E').charAt(0)}</div>
                    <span style={{ fontWeight: "600" }}>{emp.employee_name || 'Unknown'}</span>
                  </div>
                </td>
                <td style={styles.td}>₹{emp.basic_salary || 0}/day</td>
                <td style={styles.td}>
                  <span style={styles.statusBadge(emp.status)}>
                    {emp.status === 'paid_leave' ? 'Paid L.' : (emp.status || 'present').charAt(0).toUpperCase() + (emp.status || 'present').slice(1)}
                  </span>
                </td>
                <td style={styles.td}>
                  <select 
                    style={styles.dropdown}
                    value={emp.status || 'present'}
                    onChange={(e) => updateStatus(emp.id, e.target.value)}
                  >
                    <option value="present">Present</option>
                    <option value="leave">Leave</option>
                    <option value="paid_leave">Paid Leave</option>
                    <option value="half_day">Half Day</option>
                    <option value="absent">Absent</option>
                  </select>
                </td>
                <td style={styles.td}>
                  <span style={{ color: "#999", fontSize: "12px" }}>Auto-marked</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.mainCard}>
        <div style={styles.cardTitle}>Monthly summary — all employees</div>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Employee</th>
              <th style={styles.th}>Present</th>
              <th style={styles.th}>Leave</th>
              <th style={styles.th}>Paid L.</th>
              <th style={styles.th}>Half day</th>
              <th style={styles.th}>Absent</th>
              <th style={styles.th}>Eff. days</th>
            </tr>
          </thead>
          <tbody>
             {filteredMonthlySummary.map((emp) => (
              <tr key={emp.employee_id}>
                <td style={styles.td}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={styles.avatar}>{emp.employee_name.charAt(0)}</div>
                    <span style={{ fontWeight: "600" }}>{emp.employee_name}</span>
                  </div>
                </td>
                <td style={styles.td}><span style={{ backgroundColor: "#e8f5e9", color: "#2e7d32", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" }}>{emp.present}</span></td>
                <td style={styles.td}><span style={{ backgroundColor: "#fff3e0", color: "#e65100", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" }}>{emp.leave}</span></td>
                <td style={styles.td}><span style={{ backgroundColor: "#e3f2fd", color: "#1565c0", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" }}>{emp.paid_leave}</span></td>
                <td style={styles.td}><span style={{ backgroundColor: "#f3e5f5", color: "#7b1fa2", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" }}>{emp.half_day}</span></td>
                <td style={styles.td}><span style={{ backgroundColor: "#ffebee", color: "#c62828", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "700" }}>{emp.absent}</span></td>
                <td style={styles.td}><span style={{ fontWeight: "700" }}>{emp.effective_days}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && (
        <div style={{...styles.toast, backgroundColor: toast.isError ? "#c62828" : "#333"}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Attendance;