import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import {
  FaCalendarAlt,
  FaMoneyBillWave,
  FaShoppingBag,
  FaDownload,
  FaEye,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaUserCheck,
  FaBoxOpen,
  FaExclamationCircle
} from 'react-icons/fa';

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

const EmployeeManager = () => {
  const navigate = useNavigate();
  // State for employee list
  const [employees, setEmployees] = useState([]);
  const [userTypes, setUserTypes] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);

  // Report Modals State
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceEmployee, setAttendanceEmployee] = useState(null);
  const [attendanceData, setAttendanceData] = useState({ attendances: [], statistics: {} });
  const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth() + 1);
  const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [attendanceStartDate, setAttendanceStartDate] = useState('');
  const [attendanceEndDate, setAttendanceEndDate] = useState('');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('all');

  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [salaryEmployee, setSalaryEmployee] = useState(null);
  const [salaryRecord, setSalaryRecord] = useState(null);
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());
  const [loadingSalary, setLoadingSalary] = useState(false);

  const [showPurchasesModal, setShowPurchasesModal] = useState(false);
  const [purchasesEmployee, setPurchasesEmployee] = useState(null);
  const [purchasesData, setPurchasesData] = useState({ purchases: [], summary: { total_bills: 0, total_amount: 0, total_items: 0 } });
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [expandedBillId, setExpandedBillId] = useState(null);

  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);


  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    phone_number: '',
    department: '',
    designation: '',
    date_of_joining: '',
    user_type: 'employee',
    aadhar_card_number: '',
    pan_card_number: '',
    emergency_contact: '',
    basic_salary: '',
    monthly_salary: ''
  });

  // File upload state
  const [aadharFile, setAadharFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [existingFiles, setExistingFiles] = useState({
    aadhar_attachment: null,
    pan_attachment: null
  });

  // Fetch all employees, user types, and companies on component mount
  useEffect(() => {
    fetchEmployees();
    fetchUserTypes();
    fetchCompanies();
  }, []);

  // Fetch employees from API
  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/employees`);
      setEmployees(response.data);
    } catch (err) {
      setError('Error fetching employees: ' + err.message);
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user types from the User Type Manager API
  const fetchUserTypes = async () => {
    try {
      const response = await api.get(`/user-types`);
      const data = response.data;
      const userTypeNames = data.map(item => item.name);

      if (userTypeNames.length > 0) {
        setUserTypes(userTypeNames);
        if (!formData.user_type) {
          setFormData(prev => ({ ...prev, user_type: userTypeNames[0] }));
        }
      } else {
        const defaults = ['admin', 'employee', 'manager'];
        setUserTypes(defaults);
        if (!formData.user_type) {
          setFormData(prev => ({ ...prev, user_type: 'employee' }));
        }
      }
    } catch (err) {
      console.error('Error fetching user types:', err);
      const defaults = ['admin', 'employee', 'manager'];
      setUserTypes(defaults);
    }
  };

  // Fetch companies from API
  const fetchCompanies = async () => {
    try {
      console.log('Fetching companies from:', `${API_BASE_URL}/companies/list`);
      const response = await api.get(`/companies/list`);
      const data = response.data;
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
      setCompanies([]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'monthly_salary') {
      const monthly = Number(value);
      const perDay = (!isNaN(monthly) && monthly > 0) ? (monthly / 30).toFixed(2) : '';
      setFormData(prev => ({
        ...prev,
        monthly_salary: value,
        basic_salary: perDay
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle file changes
  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (type === 'aadhar') {
      setAadharFile(file);
    } else if (type === 'pan') {
      setPanFile(file);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      employee_id: '',
      full_name: '',
      email: '',
      password: '',
      phone_number: '',
      department: '',
      designation: '',
      date_of_joining: '',
      user_type: 'employee',
      aadhar_card_number: '',
      pan_card_number: '',
      emergency_contact: '',
      basic_salary: '',
      monthly_salary: ''
    });
    setAadharFile(null);
    setPanFile(null);
    setEditingId(null);
    setExistingFiles({ aadhar_attachment: null, pan_attachment: null });
    setShowPassword(false);
    setShowEditPassword(false);
  };

  // Open form modal for add
  const openAddModal = () => {
    resetForm();
    setEditingId(null);
    setShowFormModal(true);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name || !formData.email || !formData.user_type) {
      alert('Please fill in all required fields (Full Name, Email, and User Type)');
      return;
    }

    // Only require password for new employees
    if (!editingId && !formData.password) {
      alert('Please enter a password for the new employee');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();

      Object.keys(formData).forEach(key => {
        if (formData[key] !== '' && formData[key] !== null && formData[key] !== undefined && key !== 'employee_id') {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (formData.email && !formDataToSend.has('email')) {
        formDataToSend.append('email', formData.email.trim());
      }
      if (formData.full_name && !formDataToSend.has('full_name')) {
        formDataToSend.append('full_name', formData.full_name.trim());
      }
      if (formData.user_type && !formDataToSend.has('user_type')) {
        formDataToSend.append('user_type', formData.user_type);
      }

      if (aadharFile) {
        formDataToSend.append('aadhar_attachment', aadharFile);
      }
      if (panFile) {
        formDataToSend.append('pan_attachment', panFile);
      }

      let url = `/employees`;
      let method = 'post';

      if (editingId) {
        url = `/employees/${editingId}`;
        method = 'put';
        if (formData.employee_id) {
          formDataToSend.append('employee_id', formData.employee_id);
        }
      }

      const response = await api({
        method: method,
        url: url,
        data: formDataToSend,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const savedEmployee = response.data;

      if (editingId) {
        setEmployees(employees.map(emp => emp.id === editingId ? savedEmployee : emp));
      } else {
        setEmployees([savedEmployee, ...employees]);
      }

      resetForm();
      setShowFormModal(false);
      alert(`Employee ${editingId ? 'updated' : 'added'} successfully!`);

    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
      console.error('Save error:', err);
    } finally {
      setLoading(false);
    }
  };

  // View employee details
  const viewEmployee = (employee) => {
    setSelectedEmployee(employee);
    setShowViewModal(true);
  };

  // Edit employee
  const editEmployee = async (employee) => {
    setEditingId(employee.id);
    setFormData({
      employee_id: employee.employee_id,
      full_name: employee.full_name,
      email: employee.email,
      password: '', // Don't show existing password
      phone_number: employee.phone_number || '',
      department: employee.department || '',
      designation: employee.designation || '',
      date_of_joining: employee.date_of_joining || '',
      user_type: employee.user_type || 'employee',
      current_company: '',
      company_id: '',
      aadhar_card_number: employee.aadhar_card_number || '',
      pan_card_number: employee.pan_card_number || '',
      address: '',
      emergency_contact: employee.emergency_contact || '',
      basic_salary: employee.basic_salary || '',
      monthly_salary: employee.monthly_salary || (employee.basic_salary ? (employee.basic_salary * 30).toFixed(2) : '')
    });
    setExistingFiles({
      aadhar_attachment: employee.aadhar_attachment,
      pan_attachment: employee.pan_attachment
    });
    setShowFormModal(true);
  };

  // Confirm delete
  const confirmDelete = (id) => {
    setEmployeeToDelete(id);
    setShowDeleteConfirm(true);
  };

  // Delete employee
  const deleteEmployee = async () => {
    if (!employeeToDelete) return;

    setLoading(true);
    try {
      await api.delete(`/employees/${employeeToDelete}`);

      setEmployees(employees.filter(emp => emp.id !== employeeToDelete));
      alert('Employee deleted successfully!');

      if (editingId === employeeToDelete) {
        resetForm();
      }

      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Download attachment
  const downloadAttachment = async (filename, type) => {
    if (!filename) return;

    try {
      const response = await api.get(`/download/${filename}`, {
        responseType: 'blob'
      });

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Download error:', err);
      alert(`Error downloading ${type} document: ${err.message}`);
    }
  };

  // Close modals
  const closeFormModal = () => {
    setShowFormModal(false);
    resetForm();
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedEmployee(null);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Open Attendance Report Modal
  const openAttendanceReport = async (employee, month = attendanceMonth, year = attendanceYear) => {
    const targetEmp = employee || attendanceEmployee;
    if (!targetEmp) return;
    setAttendanceEmployee(targetEmp);
    setShowAttendanceModal(true);
    setLoadingAttendance(true);
    try {
      const response = await api.get(`/attendance/monthly-summary?employee_id=${targetEmp.id}&month=${month}&year=${year}`);
      setAttendanceData(response.data || { attendances: [], statistics: {} });
    } catch (err) {
      console.error('Error fetching attendance report:', err);
      try {
        const resHistory = await api.get(`/attendance/history?employee_id=${targetEmp.id}&limit=60`);
        setAttendanceData({
          attendances: resHistory.data?.attendances || [],
          statistics: resHistory.data?.summary || {}
        });
      } catch (err2) {
        console.error('Error fetching attendance history fallback:', err2);
      }
    } finally {
      setLoadingAttendance(false);
    }
  };

  const getFilteredAttendance = () => {
    let list = attendanceData?.attendances || [];

    if (attendanceStartDate) {
      list = list.filter(item => {
        const itemDateStr = (item.date || item.attendance_date || item.check_in_time || '').split('T')[0];
        return itemDateStr >= attendanceStartDate;
      });
    }

    if (attendanceEndDate) {
      list = list.filter(item => {
        const itemDateStr = (item.date || item.attendance_date || item.check_in_time || '').split('T')[0];
        return itemDateStr <= attendanceEndDate;
      });
    }

    if (attendanceStatusFilter && attendanceStatusFilter !== 'all') {
      list = list.filter(item => {
        const st = String(item.status || '').toLowerCase();
        return st === attendanceStatusFilter.toLowerCase();
      });
    }

    return list;
  };

  const getFilteredStats = (filteredList) => {
    const total_days = filteredList.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let total_hours = 0;

    filteredList.forEach(rec => {
      const st = String(rec.status || '').toLowerCase();
      if (st.includes('present')) present++;
      else if (st.includes('absent')) absent++;
      else if (st.includes('late') || st.includes('half')) late++;
      else present++;

      total_hours += Number(rec.total_hours || rec.hours || 0);
    });

    const attendance_rate = total_days > 0 ? Math.round(((present + late) / total_days) * 100) : (attendanceData?.statistics?.attendance_rate || 0);

    return {
      total_days,
      present,
      absent,
      late,
      total_hours: Math.round(total_hours * 10) / 10,
      attendance_rate
    };
  };

  // Open Salary Report Modal
  const openSalaryReport = async (employee, month = salaryMonth, year = salaryYear) => {
    const targetEmp = employee || salaryEmployee;
    if (!targetEmp) return;
    setSalaryEmployee(targetEmp);
    setShowSalaryModal(true);
    setLoadingSalary(true);
    try {
      // 1. Calculate / Fetch base salary record
      const response = await api.get(`/salary/calculate?month=${month}&year=${year}`);
      const list = response.data || [];
      const daysInTargetMonth = new Date(year, month, 0).getDate();
      let empSalary = list.find(s => s.employee_id === targetEmp.id) || {
        employee_id: targetEmp.id,
        employee_name: targetEmp.full_name,
        basic_salary: targetEmp.basic_salary || 0,
        monthly_salary: targetEmp.monthly_salary || 0,
        calculated_salary: (targetEmp.basic_salary || 0) * daysInTargetMonth,
        advance_amount: 0,
        net_salary: (targetEmp.basic_salary || 0) * daysInTargetMonth,
        status: 'pending',
        present_days: 0,
        absent_days: 0,
        effective_days: 0,
        working_days_threshold: daysInTargetMonth
      };

      // 2. Fetch employee product purchases for this month & year
      let monthPurchasesTotal = 0;
      let monthItems = [];
      let monthBills = [];

      try {
        const purchasesRes = await api.get(`/employees/${targetEmp.id}/purchases`);
        const allBills = purchasesRes.data?.purchases || [];

        monthBills = allBills.filter(b => {
          const dateVal = b.createdAt || b.created_at;
          if (!dateVal) return true;
          const d = new Date(dateVal);
          return (d.getMonth() + 1) === Number(month) && d.getFullYear() === Number(year);
        });

        monthPurchasesTotal = monthBills.reduce((acc, b) => acc + (b.summary?.total !== undefined ? b.summary.total : (b.total || 0)), 0);

        monthBills.forEach(bill => {
          const items = bill.items || [];
          items.forEach(item => {
            monthItems.push({
              bill_number: String(bill.billNumber || bill.bill_number || '').split('/').pop(),
              bill_date: bill.createdAt || bill.created_at,
              product_name: item.product_name || item.productName || 'Product',
              product_code: item.product_code || item.productCode || '-',
              quantity: item.quantity || 1,
              sell_price: item.sell_price || item.sellPrice || 0,
              total: item.total !== undefined ? item.total : ((item.sell_price || 0) * (item.quantity || 1))
            });
          });
        });
      } catch (pErr) {
        console.error('Error fetching employee purchases for salary report:', pErr);
      }

      const gross = empSalary.calculated_salary || 0;
      const adv = empSalary.advance_amount || 0;
      const inc = empSalary.incentive_amount || 0;
      const net = Math.max(0, gross + inc - adv - monthPurchasesTotal);

      empSalary = {
        ...empSalary,
        purchases_amount: monthPurchasesTotal,
        purchased_items: monthItems,
        purchased_bills: monthBills,
        net_salary: net
      };

      setSalaryRecord(empSalary);
    } catch (err) {
      console.error('Error fetching salary report:', err);
    } finally {
      setLoadingSalary(false);
    }
  };

  // Open Purchased Products Report Modal
  const openPurchasesReport = async (employee) => {
    if (!employee) return;
    setPurchasesEmployee(employee);
    setShowPurchasesModal(true);
    setLoadingPurchases(true);
    setExpandedBillId(null);
    try {
      const response = await api.get(`/employees/${employee.id}/purchases`);
      setPurchasesData(response.data || { purchases: [], summary: { total_bills: 0, total_amount: 0, total_items: 0 } });
    } catch (err) {
      console.error('Error fetching employee purchases:', err);
      try {
        const queryTerm = employee.phone_number || employee.full_name;
        const resBills = await api.get(`/billing/customer-bills?search=${encodeURIComponent(queryTerm)}`);
        const bills = resBills.data || [];
        const totAmt = bills.reduce((acc, b) => acc + (b.summary?.total || b.total || 0), 0);
        const totQty = bills.reduce((acc, b) => acc + (b.items ? b.items.reduce((iAcc, i) => iAcc + (i.quantity || 0), 0) : 0), 0);
        setPurchasesData({
          summary: { total_bills: bills.length, total_amount: totAmt, total_items: totQty },
          purchases: bills
        });
      } catch (err2) {
        console.error('Fallback purchases search failed:', err2);
      }
    } finally {
      setLoadingPurchases(false);
    }
  };

  // Download Salary Payslip PDF (Identical to Salary section payslip generator)
  const downloadPayslipPDF = (employee, salary) => {
    if (!employee || !salary) return;
    const doc = new jsPDF();

    const empName = employee.full_name || salary.employee_name || 'Unknown';
    const monthVal = salary.month || salaryMonth || (new Date().getMonth() + 1);
    const yearVal = salary.year || salaryYear || new Date().getFullYear();

    const generatePdf = (logoBase64 = null) => {
      // Dressing Concept Title on top (centered)
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Dressing Concept", 105, 16, null, null, "center");

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
      doc.text(`Employee Name: ${empName}`, 20, startY);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      doc.text(`Month/Year: ${monthNames[monthVal - 1]} ${yearVal}`, 120, startY);

      doc.line(20, startY + 5, 190, startY + 5); // horizontal line

      const row1Y = startY + 16;
      const daysInSelMonth = new Date(yearVal, monthVal, 0).getDate();
      doc.text(`Working Days in Month: ${salary.working_days_threshold || salary.num_days_in_month || daysInSelMonth}`, 20, row1Y);
      doc.text(`Present Days: ${salary.present_days || 0}`, 20, row1Y + 9);
      doc.text(`Paid Leaves: ${salary.paid_leaves || 0}`, 20, row1Y + 18);
      doc.text(`Half Days: ${salary.half_days || 0}`, 20, row1Y + 27);

      doc.text(`Effective Paid Days: ${salary.effective_days || 0}`, 120, row1Y);
      doc.text(`Unpaid Leaves (LOP): ${salary.unpaid_leaves || 0}`, 120, row1Y + 9);
      doc.text(`Absent Days: ${salary.absent_days || 0}`, 120, row1Y + 18);

      const row2Y = row1Y + 34;
      doc.line(20, row2Y, 190, row2Y);

      const basicSalaryRate = employee.basic_salary || salary.basic_salary || 0;
      const totalDeductions = ((salary.unpaid_leaves || 0) + (salary.absent_days || 0) + (salary.half_days || 0) * 0.5) * basicSalaryRate;
      const advance = Number(salary.advance_amount) || 0;
      const purchasesAmount = Number(salary.purchases_amount) || 0;
      const incentive = Number(salary.incentive_amount) || 0;
      const netTakeHome = Math.max(0, (salary.calculated_salary || 0) + incentive - advance - purchasesAmount);

      doc.setFontSize(11);
      doc.text(`Gross Salary:`, 20, row2Y + 12);
      doc.text(`Rs. ${(salary.calculated_salary || 0).toLocaleString()}`, 140, row2Y + 12);

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
      if (salary.purchased_bills && salary.purchased_bills.length > 0) {
        salary.purchased_bills.forEach(b => {
          const bNo = String(b.billNumber || b.bill_number || b.id || 'N/A').split('/').pop();
          const rawDate = b.createdAt || b.created_at || b.date || '';
          const bDate = rawDate ? String(rawDate).split('T')[0] : '-';
          const bAmt = b.total !== undefined ? b.total : (b.summary?.total || 0);
          purchasesToDisplay.push({ bill_number: bNo, date: bDate, total: bAmt });
        });
      } else if (salary.purchased_items && salary.purchased_items.length > 0) {
        const seen = new Set();
        salary.purchased_items.forEach(item => {
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
      doc.text("For Dressing Concept", 190, sealY, null, null, "right");

      // Space left for signature
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text("Proprietor", 190, sealY + 20, null, null, "right");
      doc.setTextColor(0, 0, 0);

      doc.save(`Payslip_${empName}_${monthNames[monthVal - 1]}_${yearVal}.pdf`);
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

  // Download Attendance Report PDF
  const downloadAttendancePDF = (employee, attendanceInfo, month, year, customStartDate = null, customEndDate = null) => {
    if (!employee || !attendanceInfo) return;
    const doc = new jsPDF();

    const empName = employee.full_name || 'Employee';
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthVal = month || attendanceMonth;
    const yearVal = year || attendanceYear;
    const monthName = monthNames[monthVal - 1] || 'Month';

    let periodLabel = `${monthName} ${yearVal}`;
    if (customStartDate && customEndDate) {
      periodLabel = `${customStartDate} to ${customEndDate}`;
    } else if (customStartDate) {
      periodLabel = `From ${customStartDate}`;
    } else if (customEndDate) {
      periodLabel = `Until ${customEndDate}`;
    }

    const generatePdf = (logoBase64 = null) => {
      // Dressing Concept Title on top (centered)
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Dressing Concept", 105, 16, null, null, "center");

      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.text("Employee Attendance Report", 105, 23, null, null, "center");

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
      doc.text(`Employee ID: ${employee.employee_id || '-'}`, 20, startY);
      doc.text(`Employee Name: ${empName}`, 20, startY + 7);
      doc.text(`Department: ${employee.department || '-'}`, 20, startY + 14);

      doc.text(`Report Period: ${periodLabel}`, 120, startY);
      doc.text(`Designation: ${employee.designation || '-'}`, 120, startY + 7);
      doc.text(`User Type: ${employee.user_type || '-'}`, 120, startY + 14);

      doc.line(20, startY + 20, 190, startY + 20);

      // Attendance Statistics Summary Box
      const statsY = startY + 30;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Attendance Summary", 20, statsY);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const stats = attendanceInfo.statistics || {};
      const attendances = attendanceInfo.attendances || [];

      doc.text(`Total Tracked Days: ${stats.total_days || attendances.length || 0}`, 20, statsY + 10);
      doc.text(`Present Days: ${stats.present || 0}`, 20, statsY + 18);
      doc.text(`Absent Days: ${stats.absent || 0}`, 20, statsY + 26);

      doc.text(`Late / Half Days: ${stats.late || 0}`, 120, statsY + 10);
      doc.text(`Attendance Rate: ${stats.attendance_rate !== undefined ? `${stats.attendance_rate}%` : 'N/A'}`, 120, statsY + 18);
      doc.text(`Total Hours Worked: ${stats.total_hours || 0} hrs`, 120, statsY + 26);

      const tableHeaderY = statsY + 36;
      doc.line(20, tableHeaderY, 190, tableHeaderY);

      // Attendance Table Headers
      let currentY = tableHeaderY + 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Date", 20, currentY);
      doc.text("Check In", 60, currentY);
      doc.text("Check Out", 95, currentY);
      doc.text("Hours", 130, currentY);
      doc.text("Status", 160, currentY);

      doc.line(20, currentY + 3, 190, currentY + 3);
      currentY += 10;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      if (attendances.length === 0) {
        doc.text("No attendance records found for this period.", 20, currentY);
      } else {
        attendances.forEach((rec) => {
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.text("Date", 20, currentY);
            doc.text("Check In", 60, currentY);
            doc.text("Check Out", 95, currentY);
            doc.text("Hours", 130, currentY);
            doc.text("Status", 160, currentY);
            doc.line(20, currentY + 3, 190, currentY + 3);
            currentY += 10;
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
          }

          const dateStr = formatDate(rec.date);
          const inTime = rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
          const outTime = rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-';
          const hrs = rec.total_hours ? `${rec.total_hours} hrs` : '-';
          const statusStr = (rec.status || '-').toUpperCase();

          doc.text(dateStr, 20, currentY);
          doc.text(inTime, 60, currentY);
          doc.text(outTime, 95, currentY);
          doc.text(hrs, 130, currentY);

          if (rec.status === 'present') {
            doc.setTextColor(16, 185, 129);
          } else if (rec.status === 'absent') {
            doc.setTextColor(239, 68, 68);
          } else {
            doc.setTextColor(245, 158, 11);
          }
          doc.text(statusStr, 160, currentY);
          doc.setTextColor(0, 0, 0);

          currentY += 6;
        });
      }

      // Proprietor Seal & Signature on Bottom Right
      const sealY = Math.max(currentY + 20, 245);
      if (sealY > 265) {
        doc.addPage();
        const newSealY = 245;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("For Dressing Concept", 190, newSealY, null, null, "right");
        doc.text("Proprietor", 190, newSealY + 20, null, null, "right");
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 138);
        doc.text("For Dressing Concept", 190, sealY, null, null, "right");
        doc.text("Proprietor", 190, sealY + 20, null, null, "right");
      }
      doc.setTextColor(0, 0, 0);

      doc.save(`Attendance_Report_${empName}_${monthName}_${yearVal}.pdf`);
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


  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>Employee Management System</h1>
          <button onClick={openAddModal} style={styles.addButton}>
            + Add New Employee
          </button>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            {error}
            <button onClick={() => setError('')} style={styles.closeButton}>×</button>
          </div>
        )}

        <div style={styles.tableContainer}>
          <h2 style={styles.subtitle}>Employee List</h2>
          {loading && employees.length === 0 ? (
            <p style={styles.loadingMessage}>Loading...</p>
          ) : employees.length === 0 ? (
            <p style={styles.emptyMessage}>No employees found. Click "Add New Employee" to get started!</p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Emp ID</th>
                    <th style={styles.tableHeader}>Name</th>
                    <th style={styles.tableHeader}>Email</th>
                    <th style={styles.tableHeader}>Department</th>
                    <th style={styles.tableHeader}>Designation</th>
                    <th style={styles.tableHeader}>User Type</th>
                    <th style={styles.tableHeader}>Phone</th>
                    <th style={styles.tableHeader}>Monthly Salary</th>
                    <th style={styles.tableHeader}>DOJ</th>
                    <th style={styles.tableHeader}>Documents</th>
                    <th style={styles.tableHeader}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{employee.employee_id}</td>
                      <td style={styles.tableCell}>
                        <strong style={styles.whiteText}>{employee.full_name}</strong>
                      </td>
                      <td style={styles.tableCell}>{employee.email}</td>
                      <td style={styles.tableCell}>{employee.department || '-'}</td>
                      <td style={styles.tableCell}>{employee.designation || '-'}</td>
                      <td style={{ ...styles.tableCell, textTransform: 'capitalize' }}>{employee.user_type || '-'}</td>
                      <td style={styles.tableCell}>{employee.phone_number || '-'}</td>
                      <td style={styles.tableCell}>₹{employee.monthly_salary || (employee.basic_salary ? (Number(employee.basic_salary) * 30).toFixed(2) : '0')}</td>
                      <td style={styles.tableCell}>{formatDate(employee.date_of_joining)}</td>
                      <td style={styles.tableCell}>
                        {employee.aadhar_attachment && (
                          <button
                            onClick={() => downloadAttachment(employee.aadhar_attachment, 'aadhar')}
                            style={styles.docButton}
                          >
                            Aadhar
                          </button>
                        )}
                        {employee.pan_attachment && (
                          <button
                            onClick={() => downloadAttachment(employee.pan_attachment, 'pan')}
                            style={styles.docButton}
                          >
                            PAN
                          </button>
                        )}
                        {!employee.aadhar_attachment && !employee.pan_attachment && '-'}
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => openAttendanceReport(employee)}
                            style={{ ...styles.actionButton, backgroundColor: '#3b82f6', color: 'white' }}
                            title="Attendance Report"
                          >
                            <FaCalendarAlt />
                          </button>
                          <button
                            onClick={() => openSalaryReport(employee)}
                            style={{ ...styles.actionButton, backgroundColor: '#8b5cf6', color: 'white' }}
                            title="Salary Report"
                          >
                            <FaMoneyBillWave />
                          </button>
                          <button
                            onClick={() => openPurchasesReport(employee)}
                            style={{ ...styles.actionButton, backgroundColor: '#ec4899', color: 'white' }}
                            title="Purchased Products Report"
                          >
                            <FaShoppingBag />
                          </button>
                          <button
                            onClick={() => viewEmployee(employee)}
                            style={{ ...styles.actionButton, ...styles.viewButton }}
                            title="View Profile"
                          >
                            <FaEye />
                          </button>
                          <button
                            onClick={() => editEmployee(employee)}
                            style={{ ...styles.actionButton, ...styles.editButton }}
                            title="Edit Employee"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => confirmDelete(employee.id)}
                            style={{ ...styles.actionButton, ...styles.deleteButton }}
                            title="Delete Employee"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Employee Form Modal */}
      {showFormModal && (
        <div style={styles.modalOverlay} onClick={closeFormModal}>
          <div style={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                {editingId ? 'Edit Employee' : 'Add New Employee'}
              </h2>
              <button onClick={closeFormModal} style={styles.modalClose}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.modalBody}>
                <div style={styles.formGrid}>
                  {/* Personal Information */}
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>Personal Information</h3>

                    {editingId && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>Employee ID</label>
                        <input
                          type="text"
                          name="employee_id"
                          value={formData.employee_id}
                          disabled
                          style={styles.input}
                        />
                      </div>
                    )}

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                        placeholder="John Doe"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        style={styles.input}
                        required
                        placeholder="john.doe@company.com"
                      />
                    </div>

                    {/* Password Field with Eye Icon */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        {editingId ? 'Password (Leave blank to keep current)' : 'Password *'}
                      </label>
                      <div style={styles.passwordContainer}>
                        <input
                          type={editingId ? (showEditPassword ? 'text' : 'password') : (showPassword ? 'text' : 'password')}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          style={styles.passwordInput}
                          placeholder={editingId ? "Enter new password" : "Enter password"}
                        />
                        <button
                          type="button"
                          onClick={() => editingId ? setShowEditPassword(!showEditPassword) : setShowPassword(!showPassword)}
                          style={styles.eyeButton}
                        >
                          {editingId ? (showEditPassword ? '👁️' : '👁️‍🗨️') : (showPassword ? '👁️' : '👁️‍🗨️')}
                        </button>
                      </div>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Phone Number</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="+91 9876543210"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Date of Joining</label>
                      <input
                        type="date"
                        name="date_of_joining"
                        value={formData.date_of_joining}
                        onChange={handleInputChange}
                        style={styles.input}
                      />
                    </div>
                  </div>

                  {/* Employment Details */}
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>Employment Details</h3>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Department</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Engineering, HR, Sales, etc."
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Software Engineer, Manager, etc."
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>User Type</label>
                      <select
                        name="user_type"
                        value={formData.user_type}
                        onChange={handleInputChange}
                        style={styles.input}
                      >
                        {userTypes.map(type => (
                          <option key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Per Day Salary</label>
                      <input
                        type="text"
                        name="basic_salary"
                        value={formData.basic_salary || ''}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="0.00"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Monthly Salary</label>
                      <input
                        type="text"
                        name="monthly_salary"
                        value={formData.monthly_salary || ''}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Document Details */}
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>Document Details</h3>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Aadhar Card Number</label>
                      <input
                        type="text"
                        name="aadhar_card_number"
                        value={formData.aadhar_card_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="XXXX-XXXX-XXXX"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Aadhar Card Attachment</label>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'aadhar')}
                        style={styles.fileInput}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {existingFiles.aadhar_attachment && (
                        <div style={styles.fileInfo}>
                          <span>Current: {existingFiles.aadhar_attachment}</span>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(existingFiles.aadhar_attachment, 'aadhar')}
                            style={styles.downloadButton}
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>PAN Card Number</label>
                      <input
                        type="text"
                        name="pan_card_number"
                        value={formData.pan_card_number}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="ABCDE1234F"
                      />
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>PAN Card Attachment</label>
                      <input
                        type="file"
                        onChange={(e) => handleFileChange(e, 'pan')}
                        style={styles.fileInput}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {existingFiles.pan_attachment && (
                        <div style={styles.fileInfo}>
                          <span>Current: {existingFiles.pan_attachment}</span>
                          <button
                            type="button"
                            onClick={() => downloadAttachment(existingFiles.pan_attachment, 'pan')}
                            style={styles.downloadButton}
                          >
                            Download
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={styles.formGroup}>
                      <label style={styles.label}>Emergency Mobile Number</label>
                      <input
                        type="text"
                        name="emergency_contact"
                        value={formData.emergency_contact}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Enter mobile number"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div style={styles.modalFooter}>
                <button type="button" onClick={closeFormModal} style={styles.cancelModalButton}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitModalButton} disabled={loading}>
                  {loading ? 'Saving...' : (editingId ? 'Update Employee' : 'Add Employee')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Employee Modal */}
      {showViewModal && selectedEmployee && (
        <div style={styles.modalOverlay} onClick={closeViewModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Employee Details</h2>
              <button onClick={closeViewModal} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Personal Information</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Employee ID:</label>
                    <span style={styles.detailValue}>{selectedEmployee.employee_id}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Full Name:</label>
                    <span style={styles.detailValue}>{selectedEmployee.full_name}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Email:</label>
                    <span style={styles.detailValue}>{selectedEmployee.email}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Phone Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.phone_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Date of Joining:</label>
                    <span style={styles.detailValue}>{formatDate(selectedEmployee.date_of_joining)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Address:</label>
                    <span style={styles.detailValue}>{selectedEmployee.address || '-'}</span>
                  </div>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Employment Details</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Department:</label>
                    <span style={styles.detailValue}>{selectedEmployee.department || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Designation:</label>
                    <span style={styles.detailValue}>{selectedEmployee.designation || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>User Type:</label>
                    <span style={{ ...styles.detailValue, textTransform: 'capitalize' }}>{selectedEmployee.user_type || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Monthly Salary:</label>
                    <span style={{ ...styles.detailValue, fontWeight: 'bold', color: '#4ade80' }}>₹{selectedEmployee.monthly_salary || (selectedEmployee.basic_salary ? (Number(selectedEmployee.basic_salary) * 30).toFixed(2) : '0')}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Per Day Salary Rate:</label>
                    <span style={styles.detailValue}>₹{selectedEmployee.basic_salary || '0'}</span>
                  </div>
                </div>
              </div>

              <div style={styles.detailSection}>
                <h3 style={styles.detailSectionTitle}>Document Details</h3>
                <div style={styles.detailGrid}>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Aadhar Card Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.aadhar_card_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Aadhar Attachment:</label>
                    {selectedEmployee.aadhar_attachment ? (
                      <button
                        onClick={() => downloadAttachment(selectedEmployee.aadhar_attachment, 'aadhar')}
                        style={styles.modalDownloadButton}
                      >
                        Download Aadhar
                      </button>
                    ) : (
                      <span style={styles.detailValue}>-</span>
                    )}
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>PAN Card Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.pan_card_number || '-'}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>PAN Attachment:</label>
                    {selectedEmployee.pan_attachment ? (
                      <button
                        onClick={() => downloadAttachment(selectedEmployee.pan_attachment, 'pan')}
                        style={styles.modalDownloadButton}
                      >
                        Download PAN
                      </button>
                    ) : (
                      <span style={styles.detailValue}>-</span>
                    )}
                  </div>
                  <div style={styles.detailItem}>
                    <label style={styles.detailLabel}>Emergency Mobile Number:</label>
                    <span style={styles.detailValue}>{selectedEmployee.emergency_contact || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={closeViewModal} style={styles.modalButton}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => setShowDeleteConfirm(false)}>
          <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Confirm Delete</h2>
              <button onClick={() => setShowDeleteConfirm(false)} style={styles.modalClose}>×</button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.confirmMessage}>Are you sure you want to delete this employee?</p>
              <p style={styles.confirmWarning}>This action cannot be undone.</p>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowDeleteConfirm(false)} style={styles.cancelModalButton}>
                Cancel
              </button>
              <button onClick={deleteEmployee} style={styles.confirmDeleteButton}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Report Modal */}
      {showAttendanceModal && attendanceEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowAttendanceModal(false)}>
          <div style={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaCalendarAlt style={{ color: '#3b82f6', fontSize: '24px' }} />
                <div>
                  <h2 style={styles.modalTitle}>Attendance Report - {attendanceEmployee.full_name}</h2>
                  <span style={{ color: '#a0a5c0', fontSize: '13px' }}>
                    Emp ID: {attendanceEmployee.employee_id} | Department: {attendanceEmployee.department || 'N/A'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAttendanceModal(false)} style={styles.modalClose}>×</button>
            </div>

            <div style={styles.modalBody}>
              {(() => {
                const filteredAttendances = getFilteredAttendance();
                const filteredStats = getFilteredStats(filteredAttendances);
                return (
                  <>
                    {/* Month, Year & Date Range Filter Bar */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '20px', backgroundColor: '#0a0e27', padding: '14px 18px', borderRadius: '8px', border: '1px solid #2a2f4a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ color: '#a0a5c0', fontWeight: '500', fontSize: '13px' }}>Month & Year:</label>
                        <select
                          value={attendanceMonth}
                          onChange={(e) => {
                            const m = parseInt(e.target.value);
                            setAttendanceMonth(m);
                            openAttendanceReport(attendanceEmployee, m, attendanceYear);
                          }}
                          style={{ ...styles.input, width: '125px', padding: '6px' }}
                        >
                          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                            <option key={m} value={idx + 1}>{m}</option>
                          ))}
                        </select>
                        <select
                          value={attendanceYear}
                          onChange={(e) => {
                            const y = parseInt(e.target.value);
                            setAttendanceYear(y);
                            openAttendanceReport(attendanceEmployee, attendanceMonth, y);
                          }}
                          style={{ ...styles.input, width: '85px', padding: '6px' }}
                        >
                          {[2023, 2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ color: '#a0a5c0', fontWeight: '500', fontSize: '13px' }}>From:</label>
                        <input
                          type="date"
                          value={attendanceStartDate}
                          onChange={(e) => setAttendanceStartDate(e.target.value)}
                          style={{ ...styles.input, width: '135px', padding: '5px 8px' }}
                        />
                        <label style={{ color: '#a0a5c0', fontWeight: '500', fontSize: '13px' }}>To:</label>
                        <input
                          type="date"
                          value={attendanceEndDate}
                          onChange={(e) => setAttendanceEndDate(e.target.value)}
                          style={{ ...styles.input, width: '135px', padding: '5px 8px' }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <label style={{ color: '#a0a5c0', fontWeight: '500', fontSize: '13px' }}>Status:</label>
                        <select
                          value={attendanceStatusFilter}
                          onChange={(e) => setAttendanceStatusFilter(e.target.value)}
                          style={{ ...styles.input, width: '110px', padding: '6px' }}
                        >
                          <option value="all">All</option>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late / Half</option>
                        </select>
                      </div>

                      {(attendanceStartDate || attendanceEndDate || attendanceStatusFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setAttendanceStartDate('');
                            setAttendanceEndDate('');
                            setAttendanceStatusFilter('all');
                          }}
                          style={{ ...styles.modalButton, backgroundColor: '#374151', padding: '6px 12px', fontSize: '12px' }}
                        >
                          Clear Filter
                        </button>
                      )}

                      <button
                        onClick={() => downloadAttendancePDF(
                          attendanceEmployee,
                          { attendances: filteredAttendances, statistics: filteredStats },
                          attendanceMonth,
                          attendanceYear,
                          attendanceStartDate,
                          attendanceEndDate
                        )}
                        style={{ ...styles.modalButton, backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', padding: '8px 14px' }}
                      >
                        <FaDownload /> Download PDF
                      </button>
                    </div>

                    {loadingAttendance ? (
                      <p style={styles.loadingMessage}>Loading attendance data...</p>
                    ) : (
                      <>
                        {/* Stat Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '15px', marginBottom: '20px' }}>
                          <div style={{ backgroundColor: '#0a0e27', padding: '15px', borderRadius: '8px', border: '1px solid #3b82f633', textAlign: 'center' }}>
                            <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Total Tracked Days</span>
                            <h3 style={{ color: '#3b82f6', fontSize: '24px', margin: '5px 0 0 0' }}>{filteredStats.total_days}</h3>
                          </div>
                          <div style={{ backgroundColor: '#0a0e27', padding: '15px', borderRadius: '8px', border: '1px solid #10b98133', textAlign: 'center' }}>
                            <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Present Days</span>
                            <h3 style={{ color: '#10b981', fontSize: '24px', margin: '5px 0 0 0' }}>{filteredStats.present}</h3>
                          </div>
                          <div style={{ backgroundColor: '#0a0e27', padding: '15px', borderRadius: '8px', border: '1px solid #ef444433', textAlign: 'center' }}>
                            <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Absent Days</span>
                            <h3 style={{ color: '#ef4444', fontSize: '24px', margin: '5px 0 0 0' }}>{filteredStats.absent}</h3>
                          </div>
                          <div style={{ backgroundColor: '#0a0e27', padding: '15px', borderRadius: '8px', border: '1px solid #f59e0b33', textAlign: 'center' }}>
                            <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Late / Half Days</span>
                            <h3 style={{ color: '#f59e0b', fontSize: '24px', margin: '5px 0 0 0' }}>{filteredStats.late}</h3>
                          </div>
                          <div style={{ backgroundColor: '#0a0e27', padding: '15px', borderRadius: '8px', border: '1px solid #8b5cf633', textAlign: 'center' }}>
                            <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Attendance Rate</span>
                            <h3 style={{ color: '#8b5cf6', fontSize: '24px', margin: '5px 0 0 0' }}>{filteredStats.attendance_rate}%</h3>
                          </div>
                          <div style={{ backgroundColor: '#0a0e27', padding: '15px', borderRadius: '8px', border: '1px solid #06b6d433', textAlign: 'center' }}>
                            <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Total Hours Worked</span>
                            <h3 style={{ color: '#06b6d4', fontSize: '24px', margin: '5px 0 0 0' }}>{filteredStats.total_hours} hrs</h3>
                          </div>
                        </div>

                        {/* Attendance Table */}
                        <div style={styles.tableWrapper}>
                          <table style={styles.table}>
                            <thead>
                              <tr style={styles.tableHeaderRow}>
                                <th style={styles.tableHeader}>Date</th>
                                <th style={styles.tableHeader}>Check In</th>
                                <th style={styles.tableHeader}>Check Out</th>
                                <th style={styles.tableHeader}>Total Hours</th>
                                <th style={styles.tableHeader}>Overtime</th>
                                <th style={styles.tableHeader}>Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAttendances.length === 0 ? (
                                <tr>
                                  <td colSpan="6" style={{ ...styles.tableCell, textAlign: 'center', padding: '20px', color: '#a0a5c0' }}>
                                    No attendance records found for the selected date range & filters.
                                  </td>
                                </tr>
                              ) : (
                                filteredAttendances.map((rec) => (
                                  <tr key={rec.id || rec.date} style={styles.tableRow}>
                                    <td style={styles.tableCell}>{formatDate(rec.date)}</td>
                                    <td style={styles.tableCell}>{rec.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    <td style={styles.tableCell}>{rec.check_out_time ? new Date(rec.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                    <td style={styles.tableCell}>{rec.total_hours ? `${rec.total_hours} hrs` : '-'}</td>
                                    <td style={styles.tableCell}>{rec.overtime ? `${rec.overtime} hrs` : '-'}</td>
                                    <td style={styles.tableCell}>
                                      <span style={{
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        textTransform: 'capitalize',
                                        backgroundColor: rec.status === 'present' ? '#10b98122' : rec.status === 'absent' ? '#ef444422' : '#f59e0b22',
                                        color: rec.status === 'present' ? '#10b981' : rec.status === 'absent' ? '#ef4444' : '#f59e0b',
                                        border: `1px solid ${rec.status === 'present' ? '#10b981' : rec.status === 'absent' ? '#ef4444' : '#f59e0b'}`
                                      }}>
                                        {rec.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowAttendanceModal(false)} style={styles.modalButton}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Salary Report Modal */}
      {showSalaryModal && salaryEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowSalaryModal(false)}>
          <div style={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaMoneyBillWave style={{ color: '#8b5cf6', fontSize: '24px' }} />
                <div>
                  <h2 style={styles.modalTitle}>Salary Report - {salaryEmployee.full_name}</h2>
                  <span style={{ color: '#a0a5c0', fontSize: '13px' }}>
                    Emp ID: {salaryEmployee.employee_id} | Designation: {salaryEmployee.designation || 'N/A'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowSalaryModal(false)} style={styles.modalClose}>×</button>
            </div>

            <div style={styles.modalBody}>
              {/* Month & Year Selection Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', backgroundColor: '#0a0e27', padding: '12px 18px', borderRadius: '8px', border: '1px solid #2a2f4a', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ color: '#a0a5c0', fontWeight: '500', fontSize: '14px' }}>Pay Period:</label>
                  <select
                    value={salaryMonth}
                    onChange={(e) => {
                      const m = parseInt(e.target.value);
                      setSalaryMonth(m);
                      openSalaryReport(salaryEmployee, m, salaryYear);
                    }}
                    style={{ ...styles.input, width: '140px' }}
                  >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={salaryYear}
                    onChange={(e) => {
                      const y = parseInt(e.target.value);
                      setSalaryYear(y);
                      openSalaryReport(salaryEmployee, salaryMonth, y);
                    }}
                    style={{ ...styles.input, width: '100px' }}
                  >
                    {[2023, 2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                {salaryRecord && (
                  <button
                    onClick={() => downloadPayslipPDF(salaryEmployee, salaryRecord)}
                    style={{ ...styles.modalButton, backgroundColor: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <FaDownload /> Download Payslip PDF
                  </button>
                )}
              </div>

              {loadingSalary ? (
                <p style={styles.loadingMessage}>Calculating salary data...</p>
              ) : !salaryRecord ? (
                <p style={styles.emptyMessage}>No salary record found for this period.</p>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #2a2f4a' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Per Day Basic Salary</span>
                      <h3 style={{ color: '#ffffff', fontSize: '20px', margin: '6px 0 0 0' }}>₹{salaryRecord.basic_salary || 0}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #2a2f4a' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Effective Paid Days</span>
                      <h3 style={{ color: '#3b82f6', fontSize: '20px', margin: '6px 0 0 0' }}>{salaryRecord.effective_days || 0} / {salaryRecord.num_days_in_month || salaryRecord.working_days_threshold || new Date(salaryRecord.year || salaryYear, salaryRecord.month || salaryMonth, 0).getDate()}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #2a2f4a' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Gross Calculated Salary</span>
                      <h3 style={{ color: '#8b5cf6', fontSize: '20px', margin: '6px 0 0 0' }}>₹{(salaryRecord.calculated_salary || 0).toLocaleString()}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #0284c733' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Incentive / Bonus</span>
                      <h3 style={{ color: '#0284c7', fontSize: '20px', margin: '6px 0 0 0' }}>+ ₹{(salaryRecord.incentive_amount || 0).toLocaleString()}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #2a2f4a' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Advance Deducted</span>
                      <h3 style={{ color: '#ef4444', fontSize: '20px', margin: '6px 0 0 0' }}>- ₹{(salaryRecord.advance_amount || 0).toLocaleString()}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #ec489933' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Purchases Deducted</span>
                      <h3 style={{ color: '#ec4899', fontSize: '20px', margin: '6px 0 0 0' }}>- ₹{(salaryRecord.purchases_amount || 0).toLocaleString()}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #10b981' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Net Take-Home Pay</span>
                      <h3 style={{ color: '#10b981', fontSize: '22px', fontWeight: 'bold', margin: '6px 0 0 0' }}>
                        ₹{(salaryRecord.net_salary !== undefined ? salaryRecord.net_salary : Math.max(0, (salaryRecord.calculated_salary || 0) + (salaryRecord.incentive_amount || 0) - (salaryRecord.advance_amount || 0) - (salaryRecord.purchases_amount || 0))).toLocaleString()}
                      </h3>
                    </div>
                  </div>

                  {/* Salary Calculation Breakdown */}
                  <div style={styles.detailSection}>
                    <h3 style={styles.detailSectionTitle}>Salary Computation Summary</h3>
                    <div style={styles.detailGrid}>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Payment Status:</label>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          width: 'fit-content',
                          textTransform: 'uppercase',
                          backgroundColor: salaryRecord.status === 'paid' ? '#10b98122' : '#f59e0b22',
                          color: salaryRecord.status === 'paid' ? '#10b981' : '#f59e0b',
                          border: `1px solid ${salaryRecord.status === 'paid' ? '#10b981' : '#f59e0b'}`
                        }}>
                          {salaryRecord.status || 'pending'}
                        </span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Incentive / Bonus:</label>
                        <span style={{ ...styles.detailValue, color: '#0284c7', fontWeight: 'bold' }}>+ ₹{(salaryRecord.incentive_amount || 0).toLocaleString()}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Present Days:</label>
                        <span style={styles.detailValue}>{salaryRecord.present_days || 0}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Paid Leaves:</label>
                        <span style={styles.detailValue}>{salaryRecord.paid_leaves || 0}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Half Days:</label>
                        <span style={styles.detailValue}>{salaryRecord.half_days || 0}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Unpaid Leaves / Absent:</label>
                        <span style={styles.detailValue}>{(salaryRecord.unpaid_leaves || 0) + (salaryRecord.absent_days || 0)}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}>Payment Date:</label>
                        <span style={styles.detailValue}>{formatDate(salaryRecord.payment_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Purchased Products Details in Salary Modal */}
                  <div style={{ ...styles.detailSection, marginTop: '20px' }}>
                    <h3 style={{ ...styles.detailSectionTitle, color: '#ec4899', borderLeftColor: '#ec4899' }}>
                      Purchased Products Details ({salaryMonth}/{salaryYear})
                    </h3>

                    {!salaryRecord.purchased_items || salaryRecord.purchased_items.length === 0 ? (
                      <p style={{ color: '#a0a5c0', fontSize: '13px', margin: '5px 0 0 0' }}>
                        No product purchases recorded for this pay period.
                      </p>
                    ) : (
                      <div style={styles.tableWrapper}>
                        <table style={{ ...styles.table, fontSize: '13px' }}>
                          <thead>
                            <tr style={styles.tableHeaderRow}>
                              <th style={styles.tableHeader}>Bill #</th>
                              <th style={styles.tableHeader}>Date</th>
                              <th style={styles.tableHeader}>Total Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(salaryRecord.purchased_bills || salaryRecord.purchased_items || []).map((item, idx) => (
                              <tr key={idx} style={styles.tableRow}>
                                <td style={{ ...styles.tableCell, fontWeight: 'bold', color: '#c2185b' }}>{String(item.bill_number || item.billNumber || '').split('/').pop()}</td>
                                <td style={styles.tableCell}>{formatDate(item.date || item.bill_date || item.created_at)}</td>
                                <td style={{ ...styles.tableCell, fontWeight: 'bold', color: '#ef4444' }}>- ₹{(item.total !== undefined ? item.total : (item.summary?.total || 0)).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowSalaryModal(false)} style={styles.modalButton}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchased Products Report Modal */}
      {showPurchasesModal && purchasesEmployee && (
        <div style={styles.modalOverlay} onClick={() => setShowPurchasesModal(false)}>
          <div style={styles.modalLarge} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaShoppingBag style={{ color: '#ec4899', fontSize: '24px' }} />
                <div>
                  <h2 style={styles.modalTitle}>Purchased Products Details - {purchasesEmployee.full_name}</h2>
                  <span style={{ color: '#a0a5c0', fontSize: '13px' }}>
                    Emp ID: {purchasesEmployee.employee_id} | Phone: {purchasesEmployee.phone_number || 'N/A'}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowPurchasesModal(false)} style={styles.modalClose}>×</button>
            </div>

            <div style={styles.modalBody}>
              {loadingPurchases ? (
                <p style={styles.loadingMessage}>Loading purchase history...</p>
              ) : (
                <>
                  {/* KPI Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #ec489933', textAlign: 'center' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Total Orders / Bills</span>
                      <h3 style={{ color: '#ec4899', fontSize: '24px', margin: '6px 0 0 0' }}>{purchasesData.summary?.total_bills || 0}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #3b82f633', textAlign: 'center' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Total Items Purchased</span>
                      <h3 style={{ color: '#3b82f6', fontSize: '24px', margin: '6px 0 0 0' }}>{purchasesData.summary?.total_items || 0}</h3>
                    </div>
                    <div style={{ backgroundColor: '#0a0e27', padding: '16px', borderRadius: '8px', border: '1px solid #10b98133', textAlign: 'center' }}>
                      <span style={{ color: '#a0a5c0', fontSize: '12px' }}>Total Amount Spent</span>
                      <h3 style={{ color: '#10b981', fontSize: '24px', margin: '6px 0 0 0' }}>₹{(purchasesData.summary?.total_amount || 0).toLocaleString()}</h3>
                    </div>
                  </div>

                  {/* Purchased Bills List */}
                  {!purchasesData.purchases || purchasesData.purchases.length === 0 ? (
                    <p style={styles.emptyMessage}>No product purchase history found for this employee.</p>
                  ) : (
                    <div style={styles.tableWrapper}>
                      <table style={{ ...styles.table, fontSize: '13px' }}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={styles.tableHeader}>#</th>
                            <th style={styles.tableHeader}>Bill Number</th>
                            <th style={styles.tableHeader}>Date</th>
                            <th style={styles.tableHeader}>Total Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchasesData.purchases.map((bill, idx) => {
                            const billTotal = bill.summary?.total !== undefined ? bill.summary.total : (bill.total || 0);
                            const billDate = formatDate(bill.createdAt || bill.created_at || bill.date);
                            return (
                              <tr key={bill.id || idx} style={styles.tableRow}>
                                <td style={styles.tableCell}>{idx + 1}</td>
                                <td style={{ ...styles.tableCell, fontWeight: 'bold', color: '#c2185b' }}>Bill #{String(bill.billNumber || bill.bill_number || '').split('/').pop()}</td>
                                <td style={styles.tableCell}>{billDate}</td>
                                <td style={{ ...styles.tableCell, fontWeight: 'bold', color: '#10b981' }}>₹{Number(billTotal).toLocaleString()}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowPurchasesModal(false)} style={styles.modalButton}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Dark theme styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  card: {
    maxWidth: '1400px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    padding: '30px',
    border: '1px solid #334155'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    borderBottom: '2px solid #2a2f4a',
    paddingBottom: '15px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0
  },
  addButton: {
    padding: '12px 24px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  errorMessage: {
    backgroundColor: 'rgba(220, 53, 69, 0.2)',
    color: '#ff6b6b',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid #dc3545'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#ff6b6b',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 5px'
  },
  tableContainer: {
    marginTop: '20px'
  },
  subtitle: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: '20px'
  },
  tableWrapper: {
    overflowX: 'auto'
  },
  loadingMessage: {
    textAlign: 'center',
    color: '#a0a5c0',
    padding: '40px',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    fontSize: '16px'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#a0a5c0',
    padding: '40px',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    fontSize: '16px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
  },
  tableHeaderRow: {
    backgroundColor: '#0f132e',
    borderBottom: '2px solid #2a2f4a'
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: '600',
    color: '#a0a5c0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap'
  },
  tableRow: {
    borderBottom: '1px solid #2a2f4a',
    transition: 'background-color 0.2s'
  },
  tableCell: {
    padding: '12px 16px',
    fontSize: '14px',
    color: '#e0e5f0',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle'
  },
  whiteText: {
    color: '#ffffff'
  },
  smallText: {
    fontSize: '11px',
    color: '#a0a5c0',
    marginTop: '4px'
  },
  userTypeBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#4c9aff',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff'
  },
  companyBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    backgroundColor: '#51cf66',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#ffffff'
  },
  actionButtons: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
    flexWrap: 'nowrap'
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    padding: '0',
    fontSize: '14px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  viewButton: {
    backgroundColor: '#17a2b8',
    color: 'white'
  },
  editButton: {
    backgroundColor: '#4c9aff',
    color: 'white'
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    color: 'white'
  },
  docButton: {
    padding: '4px 8px',
    backgroundColor: '#51cf66',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
    margin: '2px'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease'
  },
  modal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '90%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #334155',
    animation: 'slideUp 0.3s ease'
  },
  modalLarge: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    maxWidth: '1200px',
    width: '95%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #334155',
    animation: 'slideUp 0.3s ease'
  },
  confirmModal: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    border: '1px solid #334155',
    animation: 'slideUp 0.3s ease'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #2a2f4a'
  },
  modalTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#ffffff',
    margin: 0
  },
  modalClose: {
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#a0a5c0',
    transition: 'color 0.2s',
    padding: '0 8px'
  },
  modalBody: {
    padding: '24px'
  },
  modalFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #2a2f4a',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '30px'
  },
  formSection: {
    backgroundColor: '#0a0e27',
    padding: '20px',
    borderRadius: '8px',
    border: '1px solid #2a2f4a'
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4c9aff',
    marginBottom: '20px',
    borderLeft: '3px solid #4c9aff',
    paddingLeft: '10px'
  },
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#a0a5c0'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    color: '#ffffff'
  },
  passwordContainer: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  passwordInput: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    color: '#ffffff'
  },
  eyeButton: {
    padding: '10px',
    backgroundColor: '#2a2f4a',
    border: '1px solid #3a3f5a',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    color: '#ffffff',
    fontFamily: 'inherit',
    resize: 'vertical'
  },
  fileInput: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    backgroundColor: '#0a0e27',
    border: '1px solid #2a2f4a',
    borderRadius: '6px',
    color: '#a0a5c0'
  },
  fileInfo: {
    marginTop: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '12px',
    color: '#a0a5c0'
  },
  downloadButton: {
    padding: '4px 8px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  helperText: {
    fontSize: '11px',
    color: '#a0a5c0',
    marginTop: '4px',
    display: 'block'
  },
  detailSection: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#0a0e27',
    borderRadius: '8px',
    border: '1px solid #2a2f4a'
  },
  detailSectionTitle: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#4c9aff',
    marginBottom: '16px',
    borderLeft: '3px solid #4c9aff',
    paddingLeft: '10px'
  },
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '12px'
  },
  detailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  detailLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#a0a5c0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  detailValue: {
    fontSize: '14px',
    color: '#ffffff',
    fontWeight: '500'
  },
  modalDownloadButton: {
    padding: '6px 12px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    width: 'fit-content'
  },
  modalButton: {
    padding: '10px 20px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  submitModalButton: {
    padding: '10px 20px',
    backgroundColor: '#4c9aff',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  cancelModalButton: {
    padding: '10px 20px',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  confirmDeleteButton: {
    padding: '10px 20px',
    backgroundColor: '#ff6b6b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s'
  },
  confirmMessage: {
    fontSize: '16px',
    color: '#ffffff',
    marginBottom: '12px',
    textAlign: 'center'
  },
  confirmWarning: {
    fontSize: '14px',
    color: '#ff6b6b',
    textAlign: 'center',
    margin: 0
  }
};

// Add animation keyframes
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  button:hover:not(:disabled) {
    opacity: 0.85;
    transform: translateY(-1px);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  input:focus, textarea:focus, select:focus {
    border-color: #4c9aff;
    box-shadow: 0 0 0 2px rgba(76, 154, 255, 0.2);
    outline: none;
  }
  
  tr:hover {
    background-color: #0f132e;
  }
  
  .modal-close:hover {
    color: #ff6b6b;
  }
  
  .eye-button:hover {
    background-color: #3a3f5a;
  }
`;
document.head.appendChild(styleSheet);

export default EmployeeManager;
