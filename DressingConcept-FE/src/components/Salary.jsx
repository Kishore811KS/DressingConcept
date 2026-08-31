import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import {
  FaMoneyBillWave,
  FaCalendarAlt,
  FaCalculator,
  FaCheckDouble,
  FaFileInvoiceDollar,
  FaDownload,
  FaUser,
  FaShoppingBag,
  FaEdit,
  FaTimes,
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaTrash,
  FaCoins
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

const Salary = () => {
  const [loading, setLoading] = useState(false);
  const [salaries, setSalaries] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Purchased Products Modal state
  const [showPurchasesModal, setShowPurchasesModal] = useState(false);
  const [purchasesEmp, setPurchasesEmp] = useState(null);
  const [manualPurchasesList, setManualPurchasesList] = useState([]);

  // Advance Salary Modal state
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceEmp, setAdvanceEmp] = useState(null);
  const [advanceList, setAdvanceList] = useState([]);
  const [newAdvDate, setNewAdvDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAdvAmount, setNewAdvAmount] = useState("");
  const [newAdvRemarks, setNewAdvRemarks] = useState("");
  const [advLoading, setAdvLoading] = useState(false);

  const [showIncentiveModal, setShowIncentiveModal] = useState(false);
  const [incentiveEmp, setIncentiveEmp] = useState(null);
  const [incentiveInput, setIncentiveInput] = useState("");

  const openIncentiveModal = (emp) => {
    setIncentiveEmp(emp);
    setIncentiveInput(emp.incentive_amount ? String(emp.incentive_amount) : "");
    setShowIncentiveModal(true);
  };

  const handleSaveIncentive = async () => {
    if (!incentiveEmp) return;
    const amountNum = parseFloat(incentiveInput) || 0;
    try {
      await api.put('/salary/update-incentive', {
        salary_id: incentiveEmp.id,
        employee_id: incentiveEmp.employee_id || incentiveEmp.id,
        month: month,
        year: year,
        incentive_amount: amountNum
      });
      showToast("Incentive amount updated successfully");
      setShowIncentiveModal(false);
      calculateSalaries();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to update incentive amount", true);
    }
  };

  const openPurchasesModal = (emp) => {
    setPurchasesEmp(emp);
    let list = [];
    if (emp.purchased_bills && emp.purchased_bills.length > 0) {
      list = emp.purchased_bills.map((b, idx) => ({
        id: b.id || idx + 1,
        bill_number: String(b.billNumber || b.bill_number || b.id || '').split('/').pop(),
        date: (b.createdAt || b.created_at || b.date || '').split('T')[0] || new Date().toISOString().split('T')[0],
        total: b.total !== undefined ? b.total : (b.summary?.total || 0)
      }));
    } else if (emp.purchased_items && emp.purchased_items.length > 0) {
      const seen = new Set();
      emp.purchased_items.forEach((item, idx) => {
        const bNo = String(item.bill_number || '').split('/').pop();
        if (bNo && !seen.has(bNo)) {
          seen.add(bNo);
          list.push({
            id: idx + 1,
            bill_number: bNo,
            date: (item.bill_date || item.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0],
            total: item.bill_total !== undefined ? item.bill_total : (item.total || 0)
          });
        }
      });
    }

    if (list.length === 0) {
      list = [{ id: Date.now(), bill_number: '', date: new Date().toISOString().split('T')[0], total: '' }];
    }
    setManualPurchasesList(list);
    setShowPurchasesModal(true);
  };

  const handlePurchaseRowChange = (index, field, value) => {
    setManualPurchasesList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddPurchaseRow = () => {
    setManualPurchasesList(prev => [
      ...prev,
      { id: Date.now(), bill_number: '', date: new Date().toISOString().split('T')[0], total: '' }
    ]);
  };

  const handleRemovePurchaseRow = (index) => {
    setManualPurchasesList(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [{ id: Date.now(), bill_number: '', date: new Date().toISOString().split('T')[0], total: '' }];
    });
  };

  const handleSaveManualPurchases = () => {
    if (!purchasesEmp) return;
    const totalSum = manualPurchasesList.reduce((acc, row) => acc + (parseFloat(row.total) || 0), 0);
    const empId = purchasesEmp.employee_id || purchasesEmp.id;

    setSalaries(prev => prev.map(s => {
      if ((s.employee_id || s.id) === empId) {
        const gross = s.calculated_salary || 0;
        const adv = s.advance_amount || 0;
        return {
          ...s,
          purchases_amount: totalSum,
          purchased_bills: manualPurchasesList,
          purchased_items: manualPurchasesList,
          net_salary: Math.max(0, gross - adv - totalSum)
        };
      }
      return s;
    }));

    if ((selectedEmp?.employee_id || selectedEmp?.id) === empId) {
      setSelectedEmp(prev => {
        const gross = prev?.calculated_salary || 0;
        const adv = prev?.advance_amount || 0;
        return {
          ...prev,
          purchases_amount: totalSum,
          purchased_bills: manualPurchasesList,
          purchased_items: manualPurchasesList,
          net_salary: Math.max(0, gross - adv - totalSum)
        };
      });
    }

    showToast("Purchased products details updated successfully!");
    setShowPurchasesModal(false);
  };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch advances for an employee
  const fetchEmployeeAdvances = async (empId) => {
    try {
      setAdvLoading(true);
      const res = await api.get(`/salary/advance?employee_id=${empId}`);
      const data = res.data || {};
      setAdvanceList(data.advances || []);

      // If emp status is not paid, update local table pending advance
      const pendingTotal = data.total_pending !== undefined ? data.total_pending : 0;
      setSalaries(prev => prev.map(s => {
        if ((s.employee_id || s.id) === empId && s.status !== 'paid') {
          const gross = s.calculated_salary || 0;
          const pur = s.purchases_amount || 0;
          return {
            ...s,
            advance_amount: pendingTotal,
            net_salary: Math.max(0, gross - pendingTotal - pur)
          };
        }
        return s;
      }));

      if ((selectedEmp?.employee_id || selectedEmp?.id) === empId && selectedEmp?.status !== 'paid') {
        setSelectedEmp(prev => {
          const gross = prev?.calculated_salary || 0;
          const pur = prev?.purchases_amount || 0;
          return {
            ...prev,
            advance_amount: pendingTotal,
            net_salary: Math.max(0, gross - pendingTotal - pur)
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch employee advances", err);
    } finally {
      setAdvLoading(false);
    }
  };

  const openAdvanceModal = (emp) => {
    setAdvanceEmp(emp);
    setNewAdvDate(new Date().toISOString().split('T')[0]);
    setNewAdvAmount("");
    setNewAdvRemarks("");
    setShowAdvanceModal(true);
    const empId = emp.employee_id || emp.id;
    fetchEmployeeAdvances(empId);
  };

  const handleAddAdvance = async () => {
    if (!advanceEmp) return;
    const amountNum = parseFloat(newAdvAmount);
    if (!newAdvAmount || isNaN(amountNum) || amountNum <= 0) {
      showToast("Please enter a valid advance amount greater than 0", true);
      return;
    }
    if (!newAdvDate) {
      showToast("Please select a date for the advance entry", true);
      return;
    }

    try {
      const empId = advanceEmp.employee_id || advanceEmp.id;
      await api.post('/salary/advance', {
        employee_id: empId,
        date: newAdvDate,
        amount: amountNum,
        remarks: newAdvRemarks
      });
      showToast("Advance salary entry added successfully");
      setNewAdvAmount("");
      setNewAdvRemarks("");
      fetchEmployeeAdvances(empId);
      calculateSalaries();
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to add advance salary entry", true);
    }
  };

  const handleDeleteAdvance = async (advId) => {
    if (!window.confirm("Are you sure you want to delete this advance entry?")) return;
    try {
      await api.delete(`/salary/advance/${advId}`);
      showToast("Advance entry deleted");
      if (advanceEmp) {
        const empId = advanceEmp.employee_id || advanceEmp.id;
        fetchEmployeeAdvances(empId);
        calculateSalaries();
      }
    } catch (err) {
      showToast(err.response?.data?.error || "Failed to delete advance entry", true);
    }
  };

  const calculateSalaries = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/salary/calculate?month=${month}&year=${year}`);
      const salaryList = res.data || [];

      // Fetch employee product purchases for each employee in this pay period
      const enrichedSalaries = await Promise.all(salaryList.map(async (empSalary) => {
        try {
          const pRes = await api.get(`/employees/${empSalary.employee_id}/purchases`);
          const allBills = pRes.data?.purchases || [];

          const monthBills = allBills.filter(b => {
            const dateVal = b.createdAt || b.created_at;
            if (!dateVal) return true;
            const d = new Date(dateVal);
            return (d.getMonth() + 1) === Number(month) && d.getFullYear() === Number(year);
          });

          const purchasesTotal = monthBills.reduce((acc, b) => acc + (b.summary?.total !== undefined ? b.summary.total : (b.total || 0)), 0);

          const items = [];
          monthBills.forEach(bill => {
            (bill.items || []).forEach(item => {
              items.push({
                bill_number: bill.billNumber || bill.bill_number,
                bill_date: bill.createdAt || bill.created_at,
                product_name: item.product_name || item.productName || 'Product',
                product_code: item.product_code || item.productCode || '-',
                quantity: item.quantity || 1,
                sell_price: item.sell_price || item.sellPrice || 0,
                total: item.total !== undefined ? item.total : ((item.sell_price || 0) * (item.quantity || 1))
              });
            });
          });

          const gross = empSalary.calculated_salary || 0;
          const adv = empSalary.advance_amount || 0;
          const inc = empSalary.incentive_amount || 0;
          const net = Math.max(0, gross + inc - adv - purchasesTotal);

          return {
            ...empSalary,
            purchases_amount: purchasesTotal,
            purchased_items: items,
            purchased_bills: monthBills,
            net_salary: net
          };
        } catch (err) {
          const gross = empSalary.calculated_salary || 0;
          const adv = empSalary.advance_amount || 0;
          const inc = empSalary.incentive_amount || 0;
          return {
            ...empSalary,
            purchases_amount: 0,
            purchased_items: [],
            purchased_bills: [],
            net_salary: Math.max(0, gross + inc - adv)
          };
        }
      }));

      setSalaries(enrichedSalaries);
      if (enrichedSalaries.length > 0) {
        setSelectedEmp(prev => {
          if (!prev) return enrichedSalaries[0];
          const updated = enrichedSalaries.find(s => s.id === prev.id || s.employee_id === prev.employee_id);
          return updated || enrichedSalaries[0];
        });
      }
    } catch (err) {
      showToast("Failed to calculate salaries", true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateSalaries();
  }, [month, year]);

  const downloadPayslip = (emp) => {
    if (!emp) return;
    const doc = new jsPDF();

    const generatePdf = (logoBase64 = null) => {
      // Dressing Concept Title on top (centered)
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Dressing Concepts", 105, 16, null, null, "center");

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.text("Payslip", 105, 23, null, null, "center");

      // Logo placed below title
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 82.5, 26, 45, 18);
        } catch (e) {
          console.warn("Logo add error", e);
        }
      }

      const startY = logoBase64 ? 48 : 32;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Employee Name: ${emp.employee_name || 'Unknown'}`, 20, startY);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      doc.text(`Month/Year: ${monthNames[month - 1]} ${year}`, 120, startY);

      doc.line(20, startY + 5, 190, startY + 5); // horizontal line

      const row1Y = startY + 16;
      const daysInSelMonth = new Date(year, month, 0).getDate();
      doc.text(`Working Days in Month: ${emp.working_days_threshold || emp.num_days_in_month || daysInSelMonth}`, 20, row1Y);
      doc.text(`Present Days: ${emp.present_days || 0}`, 20, row1Y + 9);
      doc.text(`Paid Leaves: ${emp.paid_leaves || 0}`, 20, row1Y + 18);
      doc.text(`Half Days: ${emp.half_days || 0}`, 20, row1Y + 27);

      doc.text(`Effective Paid Days: ${emp.effective_days || 0}`, 120, row1Y);
      doc.text(`Unpaid Leaves (LOP): ${emp.unpaid_leaves || 0}`, 120, row1Y + 9);
      doc.text(`Absent Days: ${emp.absent_days || 0}`, 120, row1Y + 18);

      const row2Y = row1Y + 34;
      doc.line(20, row2Y, 190, row2Y);

      const totalDeductions = ((emp.unpaid_leaves || 0) + (emp.absent_days || 0) + (emp.half_days || 0) * 0.5) * (emp.basic_salary || 0);
      const advance = Number(emp.advance_amount) || 0;
      const purchasesAmount = Number(emp.purchases_amount) || 0;
      const incentive = Number(emp.incentive_amount) || 0;
      const netTakeHome = Math.max(0, (emp.calculated_salary || 0) + incentive - advance - purchasesAmount);

      doc.setFontSize(11);
      doc.text(`Gross Salary:`, 20, row2Y + 12);
      doc.text(`Rs. ${(emp.calculated_salary || 0).toLocaleString()}`, 140, row2Y + 12);

      let currentLineY = row2Y + 21;
      if (incentive > 0) {
        doc.text(`Incentive / Bonus:`, 20, currentLineY);
        doc.setTextColor(2, 132, 199);
        doc.text(`+ Rs. ${incentive.toLocaleString()}`, 140, currentLineY);
        doc.setTextColor(0, 0, 0);
        currentLineY += 9;
      }

      doc.text(`LOP Deductions:`, 20, currentLineY);
      doc.setTextColor(200, 0, 0);
      doc.text(`- Rs. ${totalDeductions.toLocaleString()}`, 140, currentLineY);
      currentLineY += 9;

      doc.text(`Advance Deducted:`, 20, currentLineY);
      doc.setTextColor(230, 81, 0);
      doc.text(`- Rs. ${advance.toLocaleString()}`, 140, currentLineY);
      currentLineY += 9;

      doc.text(`Product Purchases Deducted:`, 20, currentLineY);
      doc.setTextColor(194, 24, 91);
      doc.text(`- Rs. ${purchasesAmount.toLocaleString()}`, 140, currentLineY);
      doc.setTextColor(0, 0, 0);
      currentLineY += 7;

      doc.line(20, currentLineY, 190, currentLineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(`Net Take-Home:`, 20, currentLineY + 11);
      doc.setTextColor(0, 150, 0);
      doc.text(`Rs. ${netTakeHome.toLocaleString()}`, 140, currentLineY + 11);
      doc.setTextColor(0, 0, 0);

      let currentY = row2Y + 70;
      const purchasesToDisplay = [];
      if (emp.purchased_bills && emp.purchased_bills.length > 0) {
        emp.purchased_bills.forEach(b => {
          const bNo = String(b.billNumber || b.bill_number || b.id || 'N/A').split('/').pop();
          const rawDate = b.createdAt || b.created_at || b.date || '';
          const bDate = rawDate ? String(rawDate).split('T')[0] : '-';
          const bAmt = b.total !== undefined ? b.total : (b.summary?.total || 0);
          purchasesToDisplay.push({ bill_number: bNo, date: bDate, total: bAmt });
        });
      } else if (emp.purchased_items && emp.purchased_items.length > 0) {
        const seen = new Set();
        emp.purchased_items.forEach(item => {
          const bNo = String(item.bill_number || 'N/A').split('/').pop();
          if (!seen.has(bNo)) {
            seen.add(bNo);
            const rawDate = item.bill_date || item.created_at || '';
            const bDate = rawDate ? String(rawDate).split('T')[0] : '-';
            const bAmt = item.bill_total !== undefined ? item.bill_total : (item.total !== undefined ? item.total : 0);
            purchasesToDisplay.push({ bill_number: bNo, date: bDate, total: bAmt });
          }
        });
      }

      if (purchasesToDisplay.length > 0) {
        doc.line(20, currentY, 190, currentY);
        currentY += 8;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(180, 0, 0);
        doc.text("NOTE: Purchased Products", 20, currentY);
        doc.setTextColor(0, 0, 0);
        currentY += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        purchasesToDisplay.forEach((p, idx) => {
          if (currentY > 230) {
            doc.addPage();
            currentY = 20;
          }
          doc.text(`${idx + 1}. Bill #${p.bill_number}  |  Date: ${p.date}  |  Total Amount: Rs. ${p.total.toLocaleString()}`, 25, currentY);
          currentY += 5.5;
        });
      }

      // Proprietor Seal & Signature on Bottom Right (no box)
      const sealY = 245;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("For Dressing Concepts", 190, sealY, null, null, "right");

      // Space left for signature
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Proprietor", 190, sealY + 20, null, null, "right");
      doc.setTextColor(0, 0, 0);

      doc.save(`Payslip_${emp.employee_name || 'Emp'}_${monthNames[month - 1]}_${year}.pdf`);
    };

    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = '/Dressing_Concept.png';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataURL = canvas.toDataURL('image/png');
        generatePdf(dataURL);
      } catch (err) {
        generatePdf(null);
      }
    };
    img.onerror = () => {
      generatePdf(null);
    };
  };

  const filteredSalaries = useMemo(() => {
    return salaries.filter(s =>
      (s.employee_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [salaries, searchTerm]);

  const updateStatus = async (salaryId, status) => {
    try {
      await api.put("/salary/update-status", { salary_id: salaryId, status });
      showToast(`Marked as ${status}`);
      calculateSalaries();
    } catch (err) {
      showToast("Update failed", true);
    }
  };

  const payAll = async () => {
    if (!window.confirm("Mark all pending salaries as paid?")) return;
    try {
      await api.post("/salary/pay-all", { month, year });
      showToast("All salaries marked as paid");
      calculateSalaries();
    } catch (err) {
      showToast("Bulk update failed", true);
    }
  };

  const styles = {
    container: {
      padding: "24px",
      backgroundColor: "#0f172a",
      minHeight: "100vh",
      fontFamily: "'Inter', sans-serif",
      color: "#f8fafc"
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "24px",
      flexWrap: "wrap",
      gap: "16px"
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
      color: "#f8fafc"
    },
    subtitle: {
      fontSize: "14px",
      color: "#94a3b8"
    },
    controls: {
      display: "flex",
      gap: "12px",
      alignItems: "center",
      flexWrap: "wrap"
    },
    select: {
      padding: "9px 14px",
      borderRadius: "8px",
      border: "1px solid #334155",
      backgroundColor: "#1e293b",
      color: "#f8fafc",
      fontSize: "14px",
      fontWeight: "500",
      cursor: "pointer",
      outline: "none"
    },
    searchInput: {
      padding: "9px 16px",
      borderRadius: "8px",
      border: "1px solid #334155",
      backgroundColor: "#1e293b",
      color: "#f8fafc",
      fontSize: "14px",
      outline: "none",
      width: "220px"
    },
    generateBtn: {
      padding: "9px 18px",
      borderRadius: "8px",
      border: "none",
      backgroundColor: "#6366f1",
      color: "#fff",
      fontSize: "14px",
      fontWeight: "600",
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: "6px"
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: "16px",
      marginBottom: "24px"
    },
    statCard: (color) => ({
      padding: "20px",
      borderRadius: "12px",
      backgroundColor: "#1e293b",
      border: `1px solid #334155`,
      display: "flex",
      flexDirection: "column",
      gap: "8px"
    }),
    statLabel: {
      fontSize: "13px",
      fontWeight: "600",
      color: "#94a3b8"
    },
    statValue: {
      fontSize: "24px",
      fontWeight: "700",
      color: "#f8fafc"
    },
    layout: {
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 450px",
      gap: "24px",
      alignItems: "start"
    },
    card: {
      backgroundColor: "#1e293b",
      borderRadius: "12px",
      border: "1px solid #334155",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      padding: "24px",
      boxSizing: "border-box",
      width: "100%",
      color: "#f8fafc"
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "700",
      marginBottom: "20px",
      color: "#f8fafc"
    },
    tableWrapper: {
      overflowX: "auto",
      width: "100%"
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "650px"
    },
    th: {
      textAlign: "left",
      padding: "12px",
      fontSize: "13px",
      fontWeight: "600",
      color: "#94a3b8",
      backgroundColor: "#0f172a",
      borderBottom: "1px solid #334155",
      whiteSpace: "nowrap"
    },
    td: {
      padding: "12px",
      fontSize: "14px",
      borderBottom: "1px solid #334155",
      color: "#f8fafc",
      cursor: "pointer",
      whiteSpace: "nowrap"
    },
    statusBadge: (status) => ({
      backgroundColor: status === 'paid' ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
      color: status === 'paid' ? "#34d399" : "#fbbf24",
      border: `1px solid ${status === 'paid' ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
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
      padding: "6px 14px",
      borderRadius: "8px",
      border: `1px solid ${active ? "#6366f1" : "#334155"}`,
      backgroundColor: active ? "rgba(99, 102, 241, 0.2)" : "#0f172a",
      color: active ? "#818cf8" : "#94a3b8",
      fontSize: "13px",
      fontWeight: "600",
      cursor: "pointer",
      transition: "all 0.2s ease"
    }),
    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      fontSize: "14px",
      borderBottom: "1px solid #334155"
    },
    detailLabel: {
      color: "#94a3b8"
    },
    detailValue: {
      fontWeight: "600",
      color: "#f8fafc"
    },
    summaryCard: (type) => ({
      backgroundColor: type === 'net' ? "rgba(16, 185, 129, 0.15)" : "#0f172a",
      padding: "14px",
      borderRadius: "10px",
      border: type === 'net' ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #334155",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }),
    downloadBtn: {
      width: "100%",
      padding: "11px",
      borderRadius: "8px",
      border: "1px solid #334155",
      backgroundColor: "#6366f1",
      color: "#fff",
      fontWeight: "600",
      fontSize: "13px",
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
    acc.total += s.calculated_salary || 0;
    if (s.status === 'paid') acc.paid += s.calculated_salary || 0;
    else acc.pending += s.calculated_salary || 0;
    return acc;
  }, { total: 0, paid: 0, pending: 0, deduct: 0 });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Salary Management</h1>
          <span style={styles.subtitle}>Auto-calculated from employee attendance & daily rates</span>
        </div>
        <div style={styles.controls}>
          <input
            type="text"
            placeholder="Search employee..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            style={styles.select}
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            style={styles.select}
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button style={styles.generateBtn} onClick={payAll}>
            <FaCheckDouble /> Generate all payslips
          </button>
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
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Employee</th>
                  <th style={styles.th}>Eff. days</th>
                  <th style={styles.th}>Gross</th>
                  <th style={styles.th}>Advance</th>
                  <th style={styles.th}>Store Purchases</th>
                  <th style={styles.th}>Net Pay</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSalaries.map(s => (
                  <tr key={s.id} onClick={() => setSelectedEmp(s)} style={{ backgroundColor: selectedEmp?.id === s.id ? "rgba(99, 102, 241, 0.2)" : "transparent", cursor: "pointer" }}>
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "rgba(99, 102, 241, 0.25)", color: "#818cf8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700" }}>
                          {(s.employee_name || 'E').charAt(0)}
                        </div>
                        <span style={{ fontWeight: "600", color: "#f8fafc" }}>{s.employee_name || 'Unknown Employee'}</span>
                      </div>
                    </td>
                    <td style={styles.td}>{s.effective_days} days</td>
                    <td style={styles.td}>₹{(s.calculated_salary || 0).toLocaleString()}</td>
                    <td style={styles.td}>
                      {s.advance_amount > 0 ? (
                        <span style={{ color: "#fbbf24", fontWeight: "bold" }}>-₹{s.advance_amount.toLocaleString()}</span>
                      ) : "-"}
                    </td>
                    <td style={styles.td}>
                      {s.purchases_amount > 0 ? (
                        <span style={{ color: "#f472b6", fontWeight: "bold" }}>-₹{s.purchases_amount.toLocaleString()}</span>
                      ) : "-"}
                    </td>
                    <td style={styles.td}>
                      <strong style={{ color: "#34d399" }}>
                        ₹{(s.net_salary !== undefined ? s.net_salary : Math.max(0, (s.calculated_salary || 0) - (s.advance_amount || 0) - (s.purchases_amount || 0))).toLocaleString()}
                      </strong>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.statusBadge(s.status)}>{s.status}</span>
                    </td>
                    <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <button
                          onClick={() => openPurchasesModal(s)}
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid rgba(244, 114, 182, 0.3)",
                            backgroundColor: "rgba(244, 114, 182, 0.15)",
                            color: "#f472b6",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="View Purchased Products Report"
                        >
                          <FaShoppingBag /> Purchases
                        </button>
                        <button
                          onClick={() => openAdvanceModal(s)}
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            backgroundColor: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="View / Add Advance Salary"
                        >
                          <FaMoneyBillWave /> Advance Salary
                        </button>
                        <button
                          onClick={() => openIncentiveModal(s)}
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid rgba(56, 189, 248, 0.3)",
                            backgroundColor: "rgba(56, 189, 248, 0.15)",
                            color: "#38bdf8",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="Set / Edit Salesperson Incentive"
                        >
                          <FaCoins /> Incentive
                        </button>
                        <button
                          onClick={() => downloadPayslip(s)}
                          style={{
                            padding: "5px 9px",
                            borderRadius: "6px",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#34d399",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="Download Payslip PDF"
                        >
                          <FaDownload /> Payslip
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Salary breakdown</h2>
          <div style={styles.breakdownHeader}>
            {filteredSalaries.map(s => (
              <button key={s.id} style={styles.empTab(selectedEmp?.id === s.id)} onClick={() => setSelectedEmp(s)}>
                {(s.employee_name || 'Unknown').split(' ')[0]}
              </button>
            ))}
          </div>

          {selectedEmp ? (
            <div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>

                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Working days threshold</span>
                  <span style={styles.detailValue}>{selectedEmp.num_days_in_month || selectedEmp.working_days_threshold || new Date(year, month, 0).getDate()}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Present days</span>
                  <span style={styles.detailValue}>{selectedEmp.present_days || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Paid leave days</span>
                  <span style={styles.detailValue}>{selectedEmp.paid_leaves || 0} (counted as present)</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Half days</span>
                  <span style={styles.detailValue}>{selectedEmp.half_days || 0} (×0.5 = {(selectedEmp.half_days || 0) * 0.5} days)</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Unpaid leave (LOP)</span>
                  <span style={styles.detailValue}>{selectedEmp.unpaid_leaves || 0} days</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Absent (LOP)</span>
                  <span style={styles.detailValue}>{selectedEmp.absent_days || 0} days</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Effective paid days</span>
                  <span style={styles.detailValue}>{selectedEmp.effective_days || 0}</span>
                </div>
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Total Sales Generated (Month)</span>
                  <span style={{ ...styles.detailValue, color: "#38bdf8", fontWeight: "700" }}>
                    ₹{(selectedEmp.total_sales_generated || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "18px" }}>
                <div style={styles.summaryCard()}>
                  <div style={styles.detailLabel}>Gross salary</div>
                  <div style={{ ...styles.detailValue, fontSize: "15px", marginTop: "4px", color: "#f8fafc" }}>₹{(selectedEmp.calculated_salary || 0).toLocaleString()}</div>
                </div>
                <div style={styles.summaryCard()}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={styles.detailLabel}>Incentive / Bonus</div>
                    <button
                      onClick={() => openIncentiveModal(selectedEmp)}
                      style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', textDecoration: 'underline' }}
                    >
                      Edit
                    </button>
                  </div>
                  <div style={{ ...styles.detailValue, fontSize: "15px", marginTop: "4px", color: "#38bdf8" }}>
                    +₹{(selectedEmp.incentive_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div style={styles.summaryCard()}>
                  <div style={styles.detailLabel}>Advance Deducted</div>
                  <div style={{ ...styles.detailValue, fontSize: "15px", marginTop: "4px", color: "#fbbf24" }}>
                    -₹{(selectedEmp.advance_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div style={styles.summaryCard()}>
                  <div style={styles.detailLabel}>Purchases Deducted</div>
                  <div style={{ ...styles.detailValue, fontSize: "15px", marginTop: "4px", color: "#f472b6" }}>
                    -₹{(selectedEmp.purchases_amount || 0).toLocaleString()}
                  </div>
                </div>
                <div style={styles.summaryCard()}>
                  <div style={styles.detailLabel}>LOP deduction</div>
                  <div style={{ ...styles.detailValue, fontSize: "15px", marginTop: "4px", color: "#f87171" }}>
                    -₹{(((selectedEmp.unpaid_leaves || 0) + (selectedEmp.absent_days || 0) + (selectedEmp.half_days || 0) * 0.5) * (selectedEmp.basic_salary || 0)).toLocaleString()}
                  </div>
                </div>
              </div>

              <div style={{ ...styles.summaryCard('net'), marginTop: "12px", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ ...styles.detailLabel, color: "#34d399", fontSize: "13px", fontWeight: "600" }}>Net Take-Home</div>
                <div style={{ ...styles.detailValue, fontSize: "20px", color: "#34d399" }}>
                  ₹{(selectedEmp.net_salary !== undefined ? selectedEmp.net_salary : Math.max(0, (selectedEmp.calculated_salary || 0) + (selectedEmp.incentive_amount || 0) - (selectedEmp.advance_amount || 0) - (selectedEmp.purchases_amount || 0))).toLocaleString()}
                </div>
              </div>

              {/* Purchased Products Details inside Breakdown */}
              <div style={{ marginTop: "18px", borderTop: "1px solid #334155", paddingTop: "14px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: "700", color: "#f472b6", marginBottom: "8px" }}>
                  Purchased Products Details ({month}/{year})
                </h3>
                {!selectedEmp.purchased_items || selectedEmp.purchased_items.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>No product purchases recorded for this pay period.</p>
                ) : (
                  <div style={{ overflowX: "auto", maxHeight: "160px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#0f172a" }}>
                          <th style={{ ...styles.th, fontSize: "11px", padding: "6px" }}>Bill #</th>
                          <th style={{ ...styles.th, fontSize: "11px", padding: "6px" }}>Date</th>
                          <th style={{ ...styles.th, fontSize: "11px", padding: "6px" }}>Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedEmp.purchased_bills || selectedEmp.purchased_items || []).map((item, idx) => (
                          <tr key={idx}>
                            <td style={{ ...styles.td, padding: "6px", fontWeight: "600", color: "#f472b6" }}>{String(item.bill_number || item.billNumber || '').split('/').pop()}</td>
                            <td style={{ ...styles.td, padding: "6px" }}>{String(item.date || item.bill_date || item.created_at || '').split('T')[0] || '-'}</td>
                            <td style={{ ...styles.td, padding: "6px", fontWeight: "600", color: "#f87171" }}>₹{(item.total !== undefined ? item.total : (item.summary?.total || 0)).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
                <button style={styles.downloadBtn} onClick={() => downloadPayslip(selectedEmp)}>
                  <FaDownload /> Download payslip
                </button>
                {selectedEmp.status === 'pending' ? (
                  <button
                    style={{ ...styles.downloadBtn, backgroundColor: "#10b981", color: "white", border: "none" }}
                    onClick={() => updateStatus(selectedEmp.id, 'paid')}
                  >
                    <FaCheckDouble /> Mark as Paid
                  </button>
                ) : (
                  <button
                    style={{ ...styles.downloadBtn, backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.4)" }}
                    onClick={() => updateStatus(selectedEmp.id, 'pending')}
                  >
                    Reset to Pending
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0" }}>Select an employee to see details</div>
          )}
        </div>
      </div>

      {/* Purchased Products Report Modal for Salary Section */}
      {showPurchasesModal && purchasesEmp && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "16px", width: "90%", maxWidth: "700px", maxHeight: "85vh", overflowY: "auto", padding: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FaShoppingBag style={{ color: "#f472b6", fontSize: "20px" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#f8fafc" }}>Purchased Products Report - {purchasesEmp.employee_name || purchasesEmp.full_name}</h3>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>Pay Period: {month}/{year} | Type bill details manually below</span>
                </div>
              </div>
              <button onClick={() => setShowPurchasesModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#0f172a", textAlign: "left" }}>
                    <th style={{ padding: "10px", borderBottom: "1px solid #334155", color: "#94a3b8", width: "40px" }}>#</th>
                    <th style={{ padding: "10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Bill Number</th>
                    <th style={{ padding: "10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Date</th>
                    <th style={{ padding: "10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Total Amount (₹)</th>
                    <th style={{ padding: "10px", borderBottom: "1px solid #334155", color: "#94a3b8", textAlign: "center", width: "70px" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {manualPurchasesList.map((row, idx) => (
                    <tr key={row.id || idx} style={{ borderBottom: "1px solid #334155" }}>
                      <td style={{ padding: "8px 10px", fontWeight: "600", color: "#94a3b8" }}>{idx + 1}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <input
                          type="text"
                          value={row.bill_number}
                          onChange={(e) => handlePurchaseRowChange(idx, "bill_number", e.target.value)}
                          placeholder="e.g. 0001N"
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#f8fafc", fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input
                          type="date"
                          value={row.date}
                          onChange={(e) => handlePurchaseRowChange(idx, "date", e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#f8fafc", fontSize: "13px", boxSizing: "border-box" }}
                        />
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <input
                          type="number"
                          value={row.total}
                          onChange={(e) => handlePurchaseRowChange(idx, "total", e.target.value)}
                          placeholder="0.00"
                          style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#0f172a", color: "#f472b6", fontSize: "13px", fontWeight: "bold", boxSizing: "border-box" }}
                        />
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <button
                          onClick={() => handleRemovePurchaseRow(idx)}
                          style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", fontSize: "12px" }}
                          title="Remove Entry"
                        >
                          <FaTimes />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  onClick={handleAddPurchaseRow}
                  style={{ padding: "7px 14px", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.3)", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
                >
                  + Add Purchase Row
                </button>

                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#f8fafc" }}>
                  Total Purchases: <span style={{ color: "#f472b6", fontSize: "16px" }}>₹{manualPurchasesList.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #334155", paddingTop: "14px", marginTop: "16px" }}>
              <button onClick={() => setShowPurchasesModal(false)} style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#374151", color: "#f8fafc", cursor: "pointer", fontWeight: "600" }}>Cancel</button>
              <button onClick={handleSaveManualPurchases} style={{ padding: "8px 20px", borderRadius: "8px", border: "none", backgroundColor: "#ec4899", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>Save & Update Purchases</button>
            </div>
          </div>
        </div>
      )}

      {/* Advance Salary Management Modal */}
      {showAdvanceModal && advanceEmp && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "16px", width: "92%", maxWidth: "750px", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FaMoneyBillWave style={{ color: "#fbbf24", fontSize: "24px" }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: "18px", color: "#f8fafc" }}>Advance Salary Management</h3>
                  <span style={{ fontSize: "12px", color: "#94a3b8" }}>Employee: <strong style={{ color: "#f8fafc" }}>{advanceEmp.employee_name || advanceEmp.full_name}</strong> | Pay Period: <strong style={{ color: "#f8fafc" }}>{month}/{year}</strong></span>
                </div>
              </div>
              <button onClick={() => setShowAdvanceModal(false)} style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }}>✕</button>
            </div>

            {/* Top KPI Summary */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
              <div style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
                <span style={{ fontSize: "12px", color: "#fbbf24", fontWeight: "600" }}>Total Pending Advance</span>
                <h4 style={{ fontSize: "20px", fontWeight: "bold", color: "#fbbf24", margin: "4px 0 0 0" }}>
                  ₹{(advanceList.filter(a => a.status === 'pending').reduce((sum, a) => sum + (a.amount || 0), 0)).toLocaleString()}
                </h4>
                <span style={{ fontSize: "10px", color: "#f59e0b" }}>To deduct in current cycle</span>
              </div>
              <div style={{ backgroundColor: "rgba(139, 92, 246, 0.15)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(139, 92, 246, 0.3)" }}>
                <span style={{ fontSize: "12px", color: "#a78bfa", fontWeight: "600" }}>Total Historical Advances</span>
                <h4 style={{ fontSize: "20px", fontWeight: "bold", color: "#a78bfa", margin: "4px 0 0 0" }}>
                  ₹{(advanceList.reduce((sum, a) => sum + (a.amount || 0), 0)).toLocaleString()}
                </h4>
                <span style={{ fontSize: "10px", color: "#8b5cf6" }}>All entries count</span>
              </div>
              <div style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", padding: "12px 14px", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                <span style={{ fontSize: "12px", color: "#34d399", fontWeight: "600" }}>Net Salary Take-Home</span>
                <h4 style={{ fontSize: "20px", fontWeight: "bold", color: "#34d399", margin: "4px 0 0 0" }}>
                  ₹{(advanceEmp.net_salary !== undefined ? advanceEmp.net_salary : Math.max(0, (advanceEmp.calculated_salary || 0) - (advanceEmp.advance_amount || 0) - (advanceEmp.purchases_amount || 0))).toLocaleString()}
                </h4>
                <span style={{ fontSize: "10px", color: "#10b981" }}>Gross minus deductions</span>
              </div>
            </div>

            {/* Add New Advance Entry Form */}
            <div style={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "16px", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 12px 0", fontSize: "14px", fontWeight: "700", color: "#f8fafc", display: "flex", alignItems: "center", gap: "6px" }}>
                <FaPlus style={{ color: "#fbbf24" }} /> Add New Advance Entry
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "140px 150px 1fr auto", gap: "10px", alignItems: "end" }}>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#94a3b8", marginBottom: "4px" }}>Date</label>
                  <input
                    type="date"
                    value={newAdvDate}
                    onChange={(e) => setNewAdvDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#94a3b8", marginBottom: "4px" }}>Advance Amount (₹)</label>
                  <input
                    type="number"
                    value={newAdvAmount}
                    onChange={(e) => setNewAdvAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#1e293b", color: "#fbbf24", fontSize: "13px", fontWeight: "bold", boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "600", color: "#94a3b8", marginBottom: "4px" }}>Remarks / Purpose (Optional)</label>
                  <input
                    type="text"
                    value={newAdvRemarks}
                    onChange={(e) => setNewAdvRemarks(e.target.value)}
                    placeholder="e.g. Festival advance"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #334155", backgroundColor: "#1e293b", color: "#f8fafc", fontSize: "13px", boxSizing: "border-box" }}
                  />
                </div>
                <button
                  onClick={handleAddAdvance}
                  style={{ padding: "9px 16px", borderRadius: "6px", border: "none", backgroundColor: "#d97706", color: "#fff", fontSize: "13px", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  <FaPlus /> Save Entry
                </button>
              </div>
            </div>

            {/* Advance Salary Records List Table */}
            <div>
              <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
                Advance Salary History & Reference Records
              </h4>

              {advLoading ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>Loading advance records...</div>
              ) : advanceList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "20px", color: "#94a3b8", backgroundColor: "#0f172a", borderRadius: "8px", border: "1px solid #334155", fontSize: "13px" }}>
                  No advance salary entries found for this employee. Use the form above to add an advance.
                </div>
              ) : (
                <div style={{ overflowX: "auto", maxHeight: "250px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#0f172a", textAlign: "left" }}>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid #334155", color: "#94a3b8", width: "40px" }}>#</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Date</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Amount (₹)</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Remarks</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid #334155", color: "#94a3b8" }}>Status</th>
                        <th style={{ padding: "8px 10px", borderBottom: "1px solid #334155", color: "#94a3b8", textAlign: "center", width: "70px" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advanceList.map((adv, idx) => (
                        <tr key={adv.id || idx} style={{ borderBottom: "1px solid #334155" }}>
                          <td style={{ padding: "8px 10px", fontWeight: "600", color: "#94a3b8" }}>{idx + 1}</td>
                          <td style={{ padding: "8px 10px", fontWeight: "500", color: "#f8fafc" }}>{adv.date || '-'}</td>
                          <td style={{ padding: "8px 10px", fontWeight: "bold", color: "#fbbf24" }}>₹{(adv.amount || 0).toLocaleString()}</td>
                          <td style={{ padding: "8px 10px", color: "#cbd5e1" }}>{adv.remarks || '-'}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {adv.status === 'deducted' ? (
                              <span style={{ backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                                Deducted (Paid)
                              </span>
                            ) : (
                              <span style={{ backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: "700" }}>
                                Pending Deduction
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            {adv.status === 'pending' ? (
                              <button
                                onClick={() => handleDeleteAdvance(adv.id)}
                                style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", borderRadius: "6px", padding: "5px 8px", cursor: "pointer", fontSize: "12px" }}
                                title="Delete pending advance entry"
                              >
                                <FaTrash />
                              </button>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#64748b" }}>-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid #334155", paddingTop: "14px", marginTop: "20px" }}>
              <button onClick={() => setShowAdvanceModal(false)} style={{ padding: "8px 20px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#374151", color: "#f8fafc", cursor: "pointer", fontWeight: "600" }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incentive Modal */}
      {showIncentiveModal && incentiveEmp && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100 }}>
          <div style={{ backgroundColor: "#1e293b", border: "1px solid #334155", color: "#f8fafc", borderRadius: "16px", width: "90%", maxWidth: "450px", maxHeight: "90vh", overflowY: "auto", padding: "24px", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #334155", paddingBottom: "12px", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#38bdf8", display: "flex", alignItems: "center", gap: "8px" }}>
                <FaCoins style={{ color: "#38bdf8" }} /> Salesperson Incentive ({month}/{year})
              </h3>
              <button style={{ background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8" }} onClick={() => setShowIncentiveModal(false)}>✕</button>
            </div>

            <div style={{ padding: "10px 0" }}>
              <p style={{ fontSize: "13px", color: "#cbd5e1", marginTop: 0, marginBottom: "16px" }}>
                Set monthly sales incentive / bonus for <strong style={{ color: "#f8fafc" }}>{incentiveEmp.employee_name || 'Employee'}</strong>.
              </p>

              <div style={{ backgroundColor: "rgba(56, 189, 248, 0.15)", padding: "14px", borderRadius: "10px", border: "1px solid rgba(56, 189, 248, 0.3)", marginBottom: "18px" }}>
                <div style={{ fontSize: "11px", color: "#38bdf8", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Total Net Sales Generated (Month):
                </div>
                <div style={{ fontSize: "22px", fontWeight: "900", color: "#38bdf8", marginTop: "4px" }}>
                  ₹{(incentiveEmp.total_sales_generated || 0).toLocaleString()}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#94a3b8", marginBottom: "6px" }}>
                  Incentive / Bonus Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={incentiveInput}
                  onChange={(e) => setIncentiveInput(e.target.value)}
                  placeholder="Enter incentive amount e.g. 2500"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#0f172a", fontSize: "15px", fontWeight: "bold", color: "#38bdf8", boxSizing: "border-box", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={() => setShowIncentiveModal(false)} style={{ padding: "9px 16px", borderRadius: "8px", border: "1px solid #334155", backgroundColor: "#374151", color: "#f8fafc", cursor: "pointer", fontWeight: "600" }}>
                  Cancel
                </button>
                <button onClick={handleSaveIncentive} style={{ padding: "9px 18px", borderRadius: "8px", border: "none", backgroundColor: "#0284c7", color: "#fff", fontWeight: "700", cursor: "pointer" }}>
                  Save Incentive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ ...styles.toast, backgroundColor: toast.isError ? "#c62828" : "#333" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default Salary;
