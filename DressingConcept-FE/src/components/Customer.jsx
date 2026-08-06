// CustomerDetailsPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';

const BASE_URL = 'http://localhost:5000';
const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

/* ─── helpers ─────────────────────────────────────────────────── */
const formatDate = (d) => {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const fmtCur = (n) => `₹${(n || 0).toFixed(2)}`;

const inputStyle = {
  padding: '10px 14px', background: 'rgba(255,255,255,0.12)',
  border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px',
  color: '#fff', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', colorScheme: 'dark'
};
const modalInputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  color: '#111', background: '#fff', boxSizing: 'border-box', fontSize: '13px'
};
const btnPrimary = {
  padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  border: 'none', borderRadius: '10px', color: '#fff', fontWeight: '700',
  fontSize: '14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
};
const btnGhost = {
  padding: '10px 16px', background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.25)', borderRadius: '10px',
  color: '#fff', fontWeight: '600', fontSize: '13px', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px'
};

/* ─── Export helpers (EXCEL .xlsx ONLY) ───────────────────────── */
function exportToExcel(customers, filename = 'customer_details.xlsx') {
  const data = customers.map(c => ({
    'First_Name': (c.firstName && c.firstName !== '—' ? c.firstName : ''),
    'Last_Name': (c.lastName && c.lastName !== '—' ? c.lastName : ''),
    'Date_of_Birth': c.dateOfBirth ? (typeof c.dateOfBirth === 'string' && c.dateOfBirth.includes('T') ? c.dateOfBirth.split('T')[0] : c.dateOfBirth) : '',
    'Mobile_Number': c.customerPhone || '',
    'Email_ID': c.customerEmail || '',
    'Address': c.customerAddress || '',
    'Rewards_Point': Number((c.rewardPoints || 0).toFixed(2)),
    'Member_ID': c.memberId || '',
    'Wedding_Anniversary': c.weddingAnniversary ? (typeof c.weddingAnniversary === 'string' && c.weddingAnniversary.includes('T') ? c.weddingAnniversary.split('T')[0] : c.weddingAnniversary) : '',
    'Celebration_Date': c.celebrationDate ? (typeof c.celebrationDate === 'string' && c.celebrationDate.includes('T') ? c.celebrationDate.split('T')[0] : c.celebrationDate) : '',
    'isClassic_Customer': c.isClassicCustomer ? 'TRUE' : 'FALSE',
    'ISSUPPLIER': c.isSupplier ? 'TRUE' : 'FALSE',
    'ISSUPPLIER_IGST': Number((c.supplierIGST || 0).toFixed(2))
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
  XLSX.writeFile(workbook, filename);
}

function exportBillsToExcel(bills, filename = 'customer_bills.xlsx') {
  const data = bills.map(b => ({
    'Bill Number': b.billNumber || '',
    'Bill Date': b.billDate || '',
    'Bill Time': b.billTime || '',
    'Customer Name': b.customerName || '',
    'Customer Phone': b.customerPhone || '',
    'Customer GST': b.customerGST || '',
    'Items Count': (b.items || []).length,
    'Subtotal': Number((b.subtotal || 0).toFixed(2)),
    'Discount': Number((b.discount || 0).toFixed(2)),
    'Tax': Number((b.tax || 0).toFixed(2)),
    'Total': Number((b.total || 0).toFixed(2)),
    'Paid Amount': Number((b.paidAmount || 0).toFixed(2)),
    'Payment Method': b.paymentMethod || '',
    'Payment Status': b.paymentStatus || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Bills');
  XLSX.writeFile(workbook, filename);
}

/* ─── Professional PDF Generator (jsPDF + autoTable) ───────────── */
function exportToPDF(customersList, companyName = 'Dressing Concept') {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const totalPagesExp = '{total_pages_count_string}';
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const headers = [[
    '#', 'First Name', 'Last Name', 'DOB', 'Mobile Number', 'Email ID',
    'Address', 'Points', 'Member ID', 'Anniversary', 'Celebration', 'Classic', 'Supplier', 'IGST'
  ]];

  const data = customersList.map((c, i) => [
    i + 1,
    c.firstName && c.firstName !== '—' ? c.firstName : '',
    c.lastName && c.lastName !== '—' ? c.lastName : '',
    c.dateOfBirth ? formatDate(c.dateOfBirth) : '—',
    c.customerPhone || '—',
    c.customerEmail || '—',
    c.customerAddress || '—',
    Number(c.rewardPoints || 0).toFixed(2),
    c.memberId || '—',
    c.weddingAnniversary ? formatDate(c.weddingAnniversary) : '—',
    c.celebrationDate ? formatDate(c.celebrationDate) : '—',
    c.isClassicCustomer ? 'Yes' : 'No',
    c.isSupplier ? 'Yes' : 'No',
    c.supplierIGST ? `${Number(c.supplierIGST).toFixed(2)}%` : '0%'
  ]);

  autoTable(doc, {
    head: headers,
    body: data,
    startY: 32,
    margin: { top: 32, right: 10, bottom: 18, left: 10 },
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      overflow: 'linebreak',
      valign: 'middle',
      textColor: [30, 41, 59],
      font: 'helvetica'
    },
    headStyles: {
      fillColor: [55, 48, 163], // Deep Indigo
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },    // #
      1: { cellWidth: 21 },                     // First Name
      2: { cellWidth: 21 },                     // Last Name
      3: { cellWidth: 19 },                     // DOB
      4: { cellWidth: 24, fontStyle: 'bold' },  // Mobile
      5: { cellWidth: 30 },                     // Email
      6: { cellWidth: 34 },                     // Address
      7: { halign: 'right', cellWidth: 16 },    // Points
      8: { cellWidth: 18 },                     // Member ID
      9: { cellWidth: 19 },                     // Anniversary
      10: { cellWidth: 19 },                    // Celebration
      11: { halign: 'center', cellWidth: 16 },  // Classic
      12: { halign: 'center', cellWidth: 16 },  // Supplier
      13: { halign: 'right', cellWidth: 16 }     // IGST
    },
    didDrawPage: (pageData) => {
      // ── Company / Brand Header Bar ──
      doc.setFillColor(79, 70, 229);
      doc.rect(10, 8, 4, 18, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(30, 41, 59);
      doc.text(companyName, 18, 14);

      doc.setFontSize(11);
      doc.setTextColor(79, 70, 229);
      doc.text('CUSTOMER DETAILS REPORT', 18, 21);

      // Report metadata on right side
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${dateStr} at ${timeStr}`, 287, 14, { align: 'right' });
      doc.text(`Total Customers: ${customersList.length}`, 287, 20, { align: 'right' });

      // Header Rule
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(10, 27, 287, 27);

      // ── Footer ──
      const pageStr = `Page ${doc.internal.getNumberOfPages()} of ${totalPagesExp}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);

      doc.line(10, 196, 287, 196);
      doc.text('Confidential — For Internal Business Use Only', 10, 202);
      doc.text(pageStr, 287, 202, { align: 'right' });
    }
  });

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  const fileDate = now.toISOString().split('T')[0];
  doc.save(`Customer_Details_Report_${fileDate}.pdf`);
}

/* ─── Component ────────────────────────────────────────────────── */
const CustomerDetailsPage = () => {
  const navigate = useNavigate();

  // ── Customer list state ──
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // ── Unified search + date range ──
  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // ── Bill search results ──
  const [billSearchResults, setBillSearchResults] = useState(null);
  const [billSearchLoading, setBillSearchLoading] = useState(false);
  const [billSearchError, setBillSearchError] = useState('');
  const billResultsRef = useRef(null);

  // ── Import state ──
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showImportResultModal, setShowImportResultModal] = useState(false);

  // ── Add Customer modal state ──
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    dateOfBirth: '',
    memberId: '',
    weddingAnniversary: '',
    celebrationDate: '',
    isClassicCustomer: false,
    isSupplier: false,
    supplierIGST: 0
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  // ── Edit Customer modal state ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCustomer, setEditCustomer] = useState({
    originalPhone: '',
    firstName: '',
    lastName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    dateOfBirth: '',
    memberId: '',
    weddingAnniversary: '',
    celebrationDate: '',
    isClassicCustomer: false,
    isSupplier: false,
    supplierIGST: 0,
    rewardPoints: 0
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // ── Bill detail modal ──
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBills, setCustomerBills] = useState([]);
  const [loadingBills, setLoadingBills] = useState(false);

  /* ── Fetch customers ── */
  useEffect(() => { fetchAllCustomers(); }, []);

  const fetchAllCustomers = async () => {
    try {
      setLoading(true); setError(null);
      const res = await api.get('/billing/customers');
      const raw = res.data?.customers || [];
      const formatted = raw.map(c => {
        let fName = c.firstName || '';
        let lName = c.lastName || '';
        if (!fName && c.name) {
          const parts = c.name.trim().split(' ');
          fName = parts[0] || '';
          lName = parts.slice(1).join(' ') || '';
        }
        return {
          id: c.phone || c.name,
          customerName: c.name || `${fName} ${lName}`.trim() || 'Walk-in Customer',
          firstName: fName || '—',
          lastName: lName || '—',
          dateOfBirth: c.dateOfBirth || '',
          customerPhone: c.phone || '',
          customerEmail: c.email || '',
          customerAddress: c.address || '',
          rewardPoints: c.rewardPoints || 0,
          memberId: c.memberId || '',
          weddingAnniversary: c.weddingAnniversary || '',
          celebrationDate: c.celebrationDate || '',
          isClassicCustomer: Boolean(c.isClassicCustomer || c.type === 'classic'),
          isSupplier: Boolean(c.isSupplier),
          supplierIGST: c.supplierIGST || 0,
          customerGST: c.gst || '',
          customerType: c.type || 'regular',
          totalSpent: c.totalSpent || 0,
          billCount: c.billCount || 0,
          lastBillDate: c.lastVisit || new Date().toISOString()
        };
      });
      setCustomers(formatted);
      setFilteredCustomers(formatted);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── File Import Handler (.xlsx / .xls / .csv) ── */
  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    setError(null);
    try {
      const res = await api.post('/billing/customers/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResult(res.data);
      setShowImportResultModal(true);
      fetchAllCustomers();
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to import customers file.';
      alert(`Import Failed: ${msg}`);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  /* ── Filter customer list on search ── */
  useEffect(() => {
    const t = searchTerm.toLowerCase().trim();
    if (billSearchResults) return;
    const filtered = customers.filter(c =>
      !t ||
      (c.firstName && c.firstName.toLowerCase().includes(t)) ||
      (c.lastName && c.lastName.toLowerCase().includes(t)) ||
      (c.customerName && c.customerName.toLowerCase().includes(t)) ||
      (c.customerPhone && c.customerPhone.includes(t)) ||
      (c.customerEmail && c.customerEmail.toLowerCase().includes(t)) ||
      (c.memberId && c.memberId.toLowerCase().includes(t)) ||
      (c.customerGST && c.customerGST.toLowerCase().includes(t))
    );
    setFilteredCustomers(filtered);
    setCurrentPage(1);
  }, [searchTerm, customers, billSearchResults]);

  /* ── Unified bill search ── */
  const handleBillSearch = async () => {
    if (!searchTerm.trim() && !fromDate && !toDate) {
      setBillSearchError('Enter a search term or select a date range.');
      return;
    }
    setBillSearchLoading(true);
    setBillSearchError('');
    setBillSearchResults(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      const res = await api.get(`/billing/customer-bills?${params.toString()}`);
      setBillSearchResults(res.data);
      if (!res.data.bills || res.data.bills.length === 0) {
        setBillSearchError('No bills found matching your search criteria.');
      } else {
        setTimeout(() => billResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch (err) {
      setBillSearchError(err.response?.data?.error || 'Failed to search bills.');
    } finally {
      setBillSearchLoading(false);
    }
  };

  const clearBillSearch = () => {
    setSearchTerm(''); setFromDate(''); setToDate('');
    setBillSearchResults(null); setBillSearchError('');
  };

  /* ── Add customer ── */
  const handleAddCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomer.customerPhone) { alert('Phone number is required'); return; }
    setSavingCustomer(true);
    try {
      const fullName = `${newCustomer.firstName} ${newCustomer.lastName}`.trim() || 'Walk-in Customer';
      await api.post('/billing/customers', {
        name: fullName,
        firstName: newCustomer.firstName,
        lastName: newCustomer.lastName,
        phone: newCustomer.customerPhone,
        email: newCustomer.customerEmail,
        address: newCustomer.customerAddress,
        dateOfBirth: newCustomer.dateOfBirth,
        memberId: newCustomer.memberId,
        weddingAnniversary: newCustomer.weddingAnniversary,
        celebrationDate: newCustomer.celebrationDate,
        isClassicCustomer: newCustomer.isClassicCustomer,
        isSupplier: newCustomer.isSupplier,
        supplierIGST: parseFloat(newCustomer.supplierIGST || 0),
        type: newCustomer.isClassicCustomer ? 'classic' : 'regular'
      });
      setShowAddModal(false);
      setNewCustomer({
        firstName: '', lastName: '', customerPhone: '', customerEmail: '', customerAddress: '',
        dateOfBirth: '', memberId: '', weddingAnniversary: '', celebrationDate: '',
        isClassicCustomer: false, isSupplier: false, supplierIGST: 0
      });
      fetchAllCustomers();
    } catch (err) { alert(err.response?.data?.error || 'Failed to save customer'); }
    finally { setSavingCustomer(false); }
  };

  /* ── Edit customer ── */
  const handleEditCustomerClick = (customer) => {
    setEditCustomer({
      originalPhone: customer.customerPhone || '',
      firstName: customer.firstName && customer.firstName !== '—' ? customer.firstName : '',
      lastName: customer.lastName && customer.lastName !== '—' ? customer.lastName : '',
      customerPhone: customer.customerPhone || '',
      customerEmail: customer.customerEmail || '',
      customerAddress: customer.customerAddress || '',
      dateOfBirth: customer.dateOfBirth ? (typeof customer.dateOfBirth === 'string' && customer.dateOfBirth.includes('T') ? customer.dateOfBirth.split('T')[0] : customer.dateOfBirth) : '',
      memberId: customer.memberId || '',
      weddingAnniversary: customer.weddingAnniversary ? (typeof customer.weddingAnniversary === 'string' && customer.weddingAnniversary.includes('T') ? customer.weddingAnniversary.split('T')[0] : customer.weddingAnniversary) : '',
      celebrationDate: customer.celebrationDate ? (typeof customer.celebrationDate === 'string' && customer.celebrationDate.includes('T') ? customer.celebrationDate.split('T')[0] : customer.celebrationDate) : '',
      isClassicCustomer: Boolean(customer.isClassicCustomer),
      isSupplier: Boolean(customer.isSupplier),
      supplierIGST: customer.supplierIGST || 0,
      rewardPoints: customer.rewardPoints || 0
    });
    setShowEditModal(true);
  };

  const handleEditCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!editCustomer.customerPhone) { alert('Phone number is required'); return; }
    setSavingEdit(true);
    try {
      const fullName = `${editCustomer.firstName} ${editCustomer.lastName}`.trim() || 'Walk-in Customer';
      await api.put(`/billing/customers/${encodeURIComponent(editCustomer.originalPhone)}`, {
        name: fullName,
        firstName: editCustomer.firstName,
        lastName: editCustomer.lastName,
        phone: editCustomer.customerPhone,
        email: editCustomer.customerEmail,
        address: editCustomer.customerAddress,
        dateOfBirth: editCustomer.dateOfBirth,
        memberId: editCustomer.memberId,
        weddingAnniversary: editCustomer.weddingAnniversary,
        celebrationDate: editCustomer.celebrationDate,
        isClassicCustomer: editCustomer.isClassicCustomer,
        isSupplier: editCustomer.isSupplier,
        supplierIGST: parseFloat(editCustomer.supplierIGST || 0),
        rewardPoints: parseFloat(editCustomer.rewardPoints || 0),
        type: editCustomer.isClassicCustomer ? 'classic' : 'regular'
      });
      setShowEditModal(false);
      fetchAllCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update customer');
    } finally {
      setSavingEdit(false);
    }
  };

  /* ── Delete customer ── */
  const handleDeleteCustomer = async (customer) => {
    const custName = customer.customerName || `${customer.firstName} ${customer.lastName}`.trim() || customer.customerPhone;
    if (!window.confirm(`Are you sure you want to delete customer "${custName}" (Phone: ${customer.customerPhone})?`)) {
      return;
    }
    try {
      await api.delete(`/billing/customers/${encodeURIComponent(customer.customerPhone)}`);
      fetchAllCustomers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete customer');
    }
  };

  /* ── View Bills modal ── */
  const handleViewCustomerBills = async (customer) => {
    setSelectedCustomer(customer); setShowBillModal(true); setLoadingBills(true);
    try {
      let allBills = [], page = 1, hasMore = true;
      while (hasMore) {
        const res = await api.get(`/billing/bills?page=${page}&per_page=100`);
        const filtered = res.data.bills.filter(b =>
          (b.customerPhone && b.customerPhone === customer.customerPhone) ||
          (b.customerName && b.customerName === customer.customerName)
        );
        allBills = [...allBills, ...filtered];
        hasMore = page < res.data.pages; page++;
      }
      setCustomerBills(allBills);
    } catch { setError('Failed to fetch customer bills'); }
    finally { setLoadingBills(false); }
  };
  const closeBillModal = () => { setShowBillModal(false); setSelectedCustomer(null); setCustomerBills([]); };

  /* ── Pagination ── */
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  /* ── Loading screen ── */
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, border: '4px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: 20, color: '#fff', fontSize: 16 }}>Loading customer details...</p>
      </div>
    </div>
  );

  /* ─────────────────────────────────── RENDER ──────────────────── */
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', padding: '32px 24px' }}>
      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { transform:translateX(-100%); } to { transform:translateX(0); } }
        .cust-row { transition: all .25s; }
        .cust-row:hover { background: rgba(255,255,255,0.12) !important; transform: translateX(3px); }
        .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); backdrop-filter:blur(8px); display:flex; justify-content:center; align-items:center; z-index:1000; animation:fadeIn .3s ease; }
        .modal-content { background:#fff; border-radius:20px; max-width:95%; width:1040px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,.3); }
        .modal-content::-webkit-scrollbar { width:7px; }
        .modal-content::-webkit-scrollbar-thumb { background:#888; border-radius:10px; }
        input:focus, select:focus { outline: none; }
        .btn-icon:hover { opacity: .85; transform: translateY(-1px); }
        .bill-card { background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.16); border-radius:14px; overflow:hidden; margin-bottom:14px; animation:fadeIn .3s ease; }
        .bill-card-hdr { display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:13px 20px; background:rgba(0,0,0,0.2); border-bottom:1px solid rgba(255,255,255,0.1); }
        .tbl-cell { padding: 12px 14px; white-space: nowrap; font-size: 13px; color: #fff; }
        .tbl-hdr { padding: 14px 14px; font-size: 11px; fontWeight: 700; color: #e0e7ff; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.15); }
      `}</style>

      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, animation: 'fadeIn .5s ease' }}>
          <div>
            <h1 style={{ fontSize: 38, fontWeight: 'bold', color: '#fff', marginBottom: 6, textShadow: '2px 2px 4px rgba(0,0,0,.2)' }}>Customer Details</h1>
            <p style={{ color: '#e0e7ff', fontSize: 15 }}>View and manage all customer information</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Import Excel / CSV */}
            <label title="Import customers from Excel (.xlsx/.xls) or CSV" style={{ ...btnGhost, cursor: importing ? 'wait' : 'pointer', background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.45)' }}>
              {importing ? '⏳ Importing...' : '📥 Import Excel'}
              <input type="file" accept=".xlsx,.xls,.csv" disabled={importing} style={{ display: 'none' }} onChange={handleFileImport} />
            </label>
            {/* Export Excel (.xlsx) */}
            <button style={{ ...btnGhost, background: 'rgba(59,130,246,0.25)', border: '1px solid rgba(59,130,246,0.45)' }} className="btn-icon" title="Export customers as Excel (.xlsx)" onClick={() => exportToExcel(filteredCustomers)}>
              📤 Export Excel
            </button>
            {/* Excel Download (.xlsx) */}
            <button style={{ ...btnGhost, background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.45)' }} className="btn-icon" title="Download Excel (.xlsx)"
              onClick={() => {
                if (billSearchResults && billSearchResults.bills?.length > 0)
                  exportBillsToExcel(billSearchResults.bills, 'bill_search_results.xlsx');
                else
                  exportToExcel(filteredCustomers, 'customer_details.xlsx');
              }}>
              📊 Excel Download
            </button>
            {/* PDF Report Generation */}
            <button style={{ ...btnGhost, background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.45)' }} className="btn-icon" title="Download Professional PDF Report"
              onClick={() => exportToPDF(filteredCustomers)}>
              📄 PDF Report
            </button>
            {/* Add Customer */}
            <button onClick={() => setShowAddModal(true)} style={{ ...btnPrimary, background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,.4)' }}>
              ➕ Add Customer
            </button>
          </div>
        </div>

        {/* ── Unified Search + Date Range ── */}
        <div style={{ background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(12px)', borderRadius: 18, border: '1px solid rgba(255,255,255,0.22)', padding: '18px 22px', marginBottom: 22, animation: 'fadeIn .5s ease .1s backwards' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            {/* Universal Search */}
            <div style={{ flex: '2 1 220px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e0e7ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                🔍 Search — Bill No / Mobile / Customer Name
              </label>
              <input
                type="text"
                placeholder="Enter bill number, mobile number, or customer name..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); if (billSearchResults) setBillSearchResults(null); }}
                onKeyDown={e => e.key === 'Enter' && handleBillSearch()}
                style={inputStyle}
              />
            </div>
            {/* From Date */}
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e0e7ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>📅 From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inputStyle} />
            </div>
            {/* To Date */}
            <div style={{ flex: '1 1 150px' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#e0e7ff', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>📅 To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inputStyle} />
            </div>
            {/* Buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 1 }}>
              <button onClick={handleBillSearch} disabled={billSearchLoading} style={{ ...btnPrimary, opacity: billSearchLoading ? .7 : 1, cursor: billSearchLoading ? 'not-allowed' : 'pointer' }}>
                {billSearchLoading ? '⏳ Searching...' : '🔍 Search'}
              </button>
              {(searchTerm || fromDate || toDate || billSearchResults) && (
                <button onClick={clearBillSearch} style={btnGhost}>✕ Clear</button>
              )}
            </div>
          </div>

          {/* Result badge */}
          {billSearchResults && billSearchResults.totalBills > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(16,185,129,0.5)', color: '#6ee7b7', padding: '3px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                ✅ {billSearchResults.totalBills} Bill{billSearchResults.totalBills > 1 ? 's' : ''} Found
              </span>
              <span style={{ color: '#bfdbfe', fontSize: 12 }}>
                Across {Object.keys(billSearchResults.customers || {}).length} customer{Object.keys(billSearchResults.customers || {}).length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {billSearchError && (
            <div style={{ marginTop: 10, color: '#fca5a5', fontSize: 13 }}>⚠️ {billSearchError}</div>
          )}
        </div>

        {/* ── Bill Search Results ── */}
        {billSearchResults && billSearchResults.bills && billSearchResults.bills.length > 0 && (
          <div ref={billResultsRef} id="pdf-bill-results" style={{ marginBottom: 28, animation: 'fadeIn .4s ease' }}>
            {/* Customer summary cards */}
            {Object.values(billSearchResults.customers || {}).map(cust => (
              <div key={cust.phone || cust.name} style={{ background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 14, padding: '14px 20px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
                <div style={{ fontSize: 22 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{cust.name}</div>
                  <div style={{ fontSize: 12, color: '#c7d2fe', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 14 }}>
                    {cust.phone && <span>📱 {cust.phone}</span>}
                    {cust.email && <span>✉️ {cust.email}</span>}
                    {cust.gst && <span>🏢 GST: {cust.gst}</span>}
                    {cust.address && <span>📍 {cust.address}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#a5f3fc' }}>
                    {billSearchResults.bills.filter(b => (b.customerPhone || b.customerName) === (cust.phone || cust.name)).length}
                  </div>
                  <div style={{ fontSize: 11, color: '#bfdbfe', fontWeight: 600 }}>BILLS</div>
                </div>
              </div>
            ))}

            {/* Individual Bill Cards */}
            {billSearchResults.bills.map((bill) => (
              <div key={bill.id} className="bill-card">
                {/* Header */}
                <div className="bill-card-hdr">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', borderRadius: 10, padding: '5px 14px', fontWeight: 800, fontSize: 15, letterSpacing: 1 }}>
                      #{bill.billNumber}
                    </div>
                    <div>
                      <div style={{ color: '#e0e7ff', fontSize: 13, fontWeight: 600 }}>📅 {bill.billDate} &nbsp;🕐 {bill.billTime}</div>
                      <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                        {bill.customerName} • {bill.customerPhone}
                        {bill.createdBy && ` • By: ${bill.createdBy}`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      background: bill.paymentStatus === 'paid' ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)',
                      border: `1px solid ${bill.paymentStatus === 'paid' ? 'rgba(16,185,129,.5)' : 'rgba(245,158,11,.5)'}`,
                      color: bill.paymentStatus === 'paid' ? '#6ee7b7' : '#fcd34d',
                      padding: '3px 12px', borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase'
                    }}>{bill.paymentStatus}</span>
                    <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 600 }}>💳 {bill.paymentMethod || 'N/A'}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: '#a5f3fc' }}>₹{bill.total?.toFixed(2)}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>Paid: ₹{bill.paidAmount?.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.15)' }}>
                        {['#', 'Product', 'Code', 'Qty', 'MRP', 'Price', 'Discount', 'Tax %', 'Total'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', color: '#bfdbfe', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', textAlign: ['#', 'Qty'].includes(h) ? 'center' : 'left', borderBottom: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(bill.items || []).map((item, i) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '9px 12px', color: '#94a3b8', textAlign: 'center', fontWeight: 600 }}>{i + 1}</td>
                          <td style={{ padding: '9px 12px', color: '#f1f5f9', fontWeight: 600 }}>
                            {item.productName}
                            {item.description && <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.description}</div>}
                          </td>
                          <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: 11 }}>{item.productCode || '-'}</td>
                          <td style={{ padding: '9px 12px', color: '#e0e7ff', textAlign: 'center', fontWeight: 700 }}>{item.quantity} {item.unit}</td>
                          <td style={{ padding: '9px 12px', color: '#94a3b8' }}>₹{item.mrp?.toFixed(2)}</td>
                          <td style={{ padding: '9px 12px', color: '#f1f5f9', fontWeight: 600 }}>₹{item.sellingPrice?.toFixed(2)}</td>
                          <td style={{ padding: '9px 12px', color: '#fcd34d' }}>{item.discount > 0 ? `₹${item.discount?.toFixed(2)}` : '-'}</td>
                          <td style={{ padding: '9px 12px', color: '#86efac', fontWeight: 600 }}>{item.tax ? `${item.tax}%` : '5%'}</td>
                          <td style={{ padding: '9px 12px', color: '#a5f3fc', fontWeight: 700 }}>₹{item.total?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div style={{ padding: '10px 20px', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Subtotal: <strong style={{ color: '#f1f5f9' }}>₹{bill.subtotal?.toFixed(2)}</strong></span>
                  {bill.discount > 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>Discount: <strong style={{ color: '#fcd34d' }}>-₹{bill.discount?.toFixed(2)}</strong></span>}
                  {bill.tax > 0 && <span style={{ fontSize: 12, color: '#94a3b8' }}>Tax: <strong style={{ color: '#86efac' }}>₹{bill.tax?.toFixed(2)}</strong></span>}
                  <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 700 }}>Total: <strong style={{ color: '#a5f3fc', fontSize: 15 }}>₹{bill.total?.toFixed(2)}</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{ marginBottom: 20, background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 12, padding: 14 }}>
            <p style={{ fontSize: 14, color: '#fecaca' }}>{error}</p>
          </div>
        )}

        {/* ── Main Customers Table ── */}
        {!billSearchResults && (
          <div id="pdf-customer-table" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden', animation: 'fadeIn .5s ease .2s backwards' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: 'rgba(0,0,0,0.35)' }}>
                  <tr>
                    {[
                      'First Name',
                      'Last Name',
                      'Date of Birth',
                      'Mobile Number',
                      'Email ID',
                      'Address',
                      'Rewards Points',
                      'Member ID',
                      'Wedding Anniversary',
                      'Celebration Date',
                      'Classic Customer',
                      'Supplier',
                      'Supplier IGST',
                      'Action'
                    ].map(h => (
                      <th key={h} className="tbl-hdr" style={{ textAlign: ['Rewards Points', 'Action'].includes(h) ? 'center' : 'left' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={14} style={{ padding: '60px 24px', textAlign: 'center', color: '#e0e7ff', fontSize: 16 }}>
                        <svg style={{ width: 64, height: 64, margin: '0 auto 14px', opacity: .4 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p>No customers found</p>
                      </td>
                    </tr>
                  ) : currentCustomers.map((c, i) => (
                    <tr key={i} className="cust-row" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>

                      {/* 1. First Name */}
                      <td className="tbl-cell" style={{ fontWeight: 600, color: '#fff' }}>
                        {c.firstName || '—'}
                      </td>

                      {/* 2. Last Name */}
                      <td className="tbl-cell" style={{ fontWeight: 500, color: '#e0e7ff' }}>
                        {c.lastName || '—'}
                      </td>

                      {/* 3. Date of Birth */}
                      <td className="tbl-cell" style={{ color: '#cbd5e1' }}>
                        {c.dateOfBirth ? formatDate(c.dateOfBirth) : '—'}
                      </td>

                      {/* 4. Mobile Number */}
                      <td className="tbl-cell" style={{ fontWeight: 600, color: '#a5f3fc' }}>
                        {c.customerPhone ? `📞 ${c.customerPhone}` : '—'}
                      </td>

                      {/* 5. Email ID */}
                      <td className="tbl-cell" style={{ color: '#cbd5e1' }}>
                        {c.customerEmail ? `✉️ ${c.customerEmail}` : '—'}
                      </td>

                      {/* 6. Address */}
                      <td className="tbl-cell" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', color: '#cbd5e1' }}>
                        {c.customerAddress ? (c.customerAddress.length > 25 ? `${c.customerAddress.substring(0, 25)}…` : c.customerAddress) : '—'}
                      </td>

                      {/* 7. Rewards Points */}
                      <td className="tbl-cell" style={{ textAlign: 'center' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(234,179,8,0.2)', padding: '4px 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, color: '#fef08a', border: '1px solid rgba(234,179,8,0.4)' }}>
                          ⭐ {Number(c.rewardPoints || 0).toFixed(2)}
                        </span>
                      </td>

                      {/* 8. Member ID */}
                      <td className="tbl-cell" style={{ fontFamily: 'monospace', color: '#fbbf24', fontWeight: 600 }}>
                        {c.memberId || '—'}
                      </td>

                      {/* 9. Wedding Anniversary */}
                      <td className="tbl-cell" style={{ color: '#cbd5e1' }}>
                        {c.weddingAnniversary ? formatDate(c.weddingAnniversary) : '—'}
                      </td>

                      {/* 10. Celebration Date */}
                      <td className="tbl-cell" style={{ color: '#cbd5e1' }}>
                        {c.celebrationDate ? formatDate(c.celebrationDate) : '—'}
                      </td>

                      {/* 11. Classic Customer */}
                      <td className="tbl-cell">
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: c.isClassicCustomer ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)',
                          color: c.isClassicCustomer ? '#6ee7b7' : '#94a3b8',
                          border: `1px solid ${c.isClassicCustomer ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.15)'}`
                        }}>
                          {c.isClassicCustomer ? 'Yes' : 'No'}
                        </span>
                      </td>

                      {/* 12. Supplier */}
                      <td className="tbl-cell">
                        <span style={{
                          padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                          background: c.isSupplier ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.08)',
                          color: c.isSupplier ? '#c084fc' : '#94a3b8',
                          border: `1px solid ${c.isSupplier ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.15)'}`
                        }}>
                          {c.isSupplier ? 'Yes' : 'No'}
                        </span>
                      </td>

                      {/* 13. Supplier IGST */}
                      <td className="tbl-cell" style={{ color: '#86efac', fontWeight: 600 }}>
                        {c.supplierIGST ? `${Number(c.supplierIGST).toFixed(2)}%` : '0%'}
                      </td>

                      {/* 14. Action */}
                      <td className="tbl-cell" style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', alignItems: 'center' }}>
                          <button onClick={() => handleViewCustomerBills(c)} style={{ background: 'linear-gradient(135deg,rgba(59,130,246,.8),rgba(59,130,246,.6))', border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px', borderRadius: 8, color: '#fff', fontWeight: 500 }}
                            title="View Customer Bills"
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(59,130,246,.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                            📋 Bills
                          </button>
                          <button onClick={() => handleEditCustomerClick(c)} style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.8),rgba(139,92,246,.8))', border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px', borderRadius: 8, color: '#fff', fontWeight: 500 }}
                            title="Edit Customer Details"
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDeleteCustomer(c)} style={{ background: 'linear-gradient(135deg,rgba(239,68,68,.8),rgba(220,38,38,.8))', border: 'none', cursor: 'pointer', fontSize: 12, padding: '6px 11px', borderRadius: 8, color: '#fff', fontWeight: 500 }}
                            title="Delete Customer"
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(239,68,68,.4)'; }}
                            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px 22px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: '7px 18px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? .4 : 1 }}>← Prev</button>
                  {[...Array(Math.min(5, totalPages))].map((_, i) => {
                    let pg = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                    return <button key={i} onClick={() => setCurrentPage(pg)} style={{ padding: '7px 14px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, background: currentPage === pg ? 'rgba(99,102,241,.6)' : 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', fontWeight: currentPage === pg ? 700 : 400 }}>{pg}</button>;
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: '7px 18px', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 9, background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? .4 : 1 }}>Next →</button>
                </div>
                <p style={{ fontSize: 13, color: '#e0e7ff' }}>Showing {indexOfFirst + 1}–{Math.min(indexOfLast, filteredCustomers.length)} of {filteredCustomers.length}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Import Result Summary Modal ── */}
      {showImportResultModal && importResult && (
        <div className="modal-overlay" onClick={() => setShowImportResultModal(false)}>
          <div className="modal-content" style={{ maxWidth: 560, padding: 26, color: '#111' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#111', display: 'flex', alignItems: 'center', gap: 8 }}>
                📥 Excel Import Summary
              </h2>
              <button onClick={() => setShowImportResultModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {/* Metrics cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#047857' }}>{importResult.importedCount}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#065f46', textTransform: 'uppercase' }}>New Imported</div>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1d4ed8' }}>{importResult.updatedCount}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase' }}>Updated</div>
              </div>
              <div style={{ background: importResult.errors?.length ? '#fff1f2' : '#f9fafb', border: `1px solid ${importResult.errors?.length ? '#fecdd3' : '#e5e7eb'}`, borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: importResult.errors?.length ? '#e11d48' : '#6b7280' }}>{importResult.errors?.length || 0}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: importResult.errors?.length ? '#9f1239' : '#374151', textTransform: 'uppercase' }}>Warnings / Errors</div>
              </div>
            </div>

            {/* Detailed row errors if any */}
            {importResult.errors && importResult.errors.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#9f1239', marginBottom: 6 }}>
                  ⚠️ Validation Details / Affected Rows:
                </label>
                <div style={{ maxHeight: 180, overflowY: 'auto', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 8, padding: '10px 14px' }}>
                  {importResult.errors.map((err, idx) => (
                    <div key={idx} style={{ fontSize: 12, color: '#9f1239', padding: '3px 0', borderBottom: idx < importResult.errors.length - 1 ? '1px solid #ffe4e6' : 'none' }}>
                      • {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button onClick={() => setShowImportResultModal(false)} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" style={{ maxWidth: 640, padding: 28, color: '#111827' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#111' }}>Add New Customer</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleAddCustomerSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* First Name & Last Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>First Name</label>
                    <input type="text" value={newCustomer.firstName} onChange={e => setNewCustomer({ ...newCustomer, firstName: e.target.value })} style={modalInputStyle} placeholder="First Name" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Last Name</label>
                    <input type="text" value={newCustomer.lastName} onChange={e => setNewCustomer({ ...newCustomer, lastName: e.target.value })} style={modalInputStyle} placeholder="Last Name" />
                  </div>
                </div>

                {/* Mobile Number & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Mobile Number *</label>
                    <input type="text" required value={newCustomer.customerPhone} onChange={e => setNewCustomer({ ...newCustomer, customerPhone: e.target.value })} style={modalInputStyle} placeholder="Mobile Number" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Email ID</label>
                    <input type="email" value={newCustomer.customerEmail} onChange={e => setNewCustomer({ ...newCustomer, customerEmail: e.target.value })} style={modalInputStyle} placeholder="Email Address" />
                  </div>
                </div>

                {/* Date of Birth & Member ID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Date of Birth</label>
                    <input type="date" value={newCustomer.dateOfBirth} onChange={e => setNewCustomer({ ...newCustomer, dateOfBirth: e.target.value })} style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Member ID</label>
                    <input type="text" value={newCustomer.memberId} onChange={e => setNewCustomer({ ...newCustomer, memberId: e.target.value })} style={modalInputStyle} placeholder="Member ID" />
                  </div>
                </div>

                {/* Wedding Anniversary & Celebration Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Wedding Anniversary</label>
                    <input type="date" value={newCustomer.weddingAnniversary} onChange={e => setNewCustomer({ ...newCustomer, weddingAnniversary: e.target.value })} style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Celebration Date</label>
                    <input type="date" value={newCustomer.celebrationDate} onChange={e => setNewCustomer({ ...newCustomer, celebrationDate: e.target.value })} style={modalInputStyle} />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Address</label>
                  <textarea rows={2} value={newCustomer.customerAddress} onChange={e => setNewCustomer({ ...newCustomer, customerAddress: e.target.value })} style={modalInputStyle} placeholder="Customer Address" />
                </div>

                {/* Classic Customer, Supplier, Supplier IGST */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'center', background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newCustomer.isClassicCustomer} onChange={e => setNewCustomer({ ...newCustomer, isClassicCustomer: e.target.checked })} />
                    Classic Customer
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={newCustomer.isSupplier} onChange={e => setNewCustomer({ ...newCustomer, isSupplier: e.target.checked })} />
                    Supplier
                  </label>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2, color: '#374151' }}>Supplier IGST (%)</label>
                    <input type="number" step="0.01" value={newCustomer.supplierIGST} onChange={e => setNewCustomer({ ...newCustomer, supplierIGST: e.target.value })} style={modalInputStyle} placeholder="0.00" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                  <button type="submit" disabled={savingCustomer} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>{savingCustomer ? 'Saving…' : 'Save Customer'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Customer Modal ── */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" style={{ maxWidth: 640, padding: 28, color: '#111827' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 20, fontWeight: 'bold', color: '#111' }}>Edit Customer Details</h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <form onSubmit={handleEditCustomerSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* First Name & Last Name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>First Name</label>
                    <input type="text" value={editCustomer.firstName} onChange={e => setEditCustomer({ ...editCustomer, firstName: e.target.value })} style={modalInputStyle} placeholder="First Name" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Last Name</label>
                    <input type="text" value={editCustomer.lastName} onChange={e => setEditCustomer({ ...editCustomer, lastName: e.target.value })} style={modalInputStyle} placeholder="Last Name" />
                  </div>
                </div>

                {/* Mobile Number & Email */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Mobile Number *</label>
                    <input type="text" required value={editCustomer.customerPhone} onChange={e => setEditCustomer({ ...editCustomer, customerPhone: e.target.value })} style={modalInputStyle} placeholder="Mobile Number" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Email ID</label>
                    <input type="email" value={editCustomer.customerEmail} onChange={e => setEditCustomer({ ...editCustomer, customerEmail: e.target.value })} style={modalInputStyle} placeholder="Email Address" />
                  </div>
                </div>

                {/* Date of Birth & Member ID */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Date of Birth</label>
                    <input type="date" value={editCustomer.dateOfBirth} onChange={e => setEditCustomer({ ...editCustomer, dateOfBirth: e.target.value })} style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Member ID</label>
                    <input type="text" value={editCustomer.memberId} onChange={e => setEditCustomer({ ...editCustomer, memberId: e.target.value })} style={modalInputStyle} placeholder="Member ID" />
                  </div>
                </div>

                {/* Wedding Anniversary & Celebration Date */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Wedding Anniversary</label>
                    <input type="date" value={editCustomer.weddingAnniversary} onChange={e => setEditCustomer({ ...editCustomer, weddingAnniversary: e.target.value })} style={modalInputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Celebration Date</label>
                    <input type="date" value={editCustomer.celebrationDate} onChange={e => setEditCustomer({ ...editCustomer, celebrationDate: e.target.value })} style={modalInputStyle} />
                  </div>
                </div>

                {/* Reward Points */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Reward Points ⭐</label>
                  <input type="number" step="0.01" value={editCustomer.rewardPoints} onChange={e => setEditCustomer({ ...editCustomer, rewardPoints: e.target.value })} style={modalInputStyle} placeholder="Reward Points" />
                </div>

                {/* Address */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Address</label>
                  <textarea rows={2} value={editCustomer.customerAddress} onChange={e => setEditCustomer({ ...editCustomer, customerAddress: e.target.value })} style={modalInputStyle} placeholder="Customer Address" />
                </div>

                {/* Classic Customer, Supplier, Supplier IGST */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, alignItems: 'center', background: '#f9fafb', padding: 12, borderRadius: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editCustomer.isClassicCustomer} onChange={e => setEditCustomer({ ...editCustomer, isClassicCustomer: e.target.checked })} />
                    Classic Customer
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editCustomer.isSupplier} onChange={e => setEditCustomer({ ...editCustomer, isSupplier: e.target.checked })} />
                    Supplier
                  </label>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, marginBottom: 2, color: '#374151' }}>Supplier IGST (%)</label>
                    <input type="number" step="0.01" value={editCustomer.supplierIGST} onChange={e => setEditCustomer({ ...editCustomer, supplierIGST: e.target.value })} style={modalInputStyle} placeholder="0.00" />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <button type="button" onClick={() => setShowEditModal(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#f3f4f6', color: '#374151', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                  <button type="submit" disabled={savingEdit} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>{savingEdit ? 'Updating…' : 'Update Customer'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Bills Modal ── */}
      {showBillModal && selectedCustomer && (
        <div className="modal-overlay" onClick={closeBillModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ padding: '22px 26px', background: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)', borderRadius: '20px 20px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 6 }}>Bill Details</h2>
                <p style={{ fontSize: 13, color: '#e0e7ff' }}>{selectedCustomer.customerName}</p>
                <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: '#f3f4f6' }}>
                  <span>📞 {selectedCustomer.customerPhone || 'N/A'}</span>
                  <span>🏷️ GST: {selectedCustomer.customerGST || 'N/A'}</span>
                  <span>📄 {customerBills.length} Bills</span>
                </div>
              </div>
              <button onClick={closeBillModal} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', fontSize: 22, cursor: 'pointer', color: '#fff', padding: '7px 14px', borderRadius: 10 }}>✕</button>
            </div>
            <div style={{ padding: 22 }}>
              {loadingBills ? (
                <div style={{ textAlign: 'center', padding: 60 }}>
                  <div style={{ width: 48, height: 48, border: '3px solid #e5e7eb', borderTopColor: '#667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  <p style={{ marginTop: 16, color: '#6b7280' }}>Loading bills…</p>
                </div>
              ) : customerBills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#6b7280' }}>No bills found for this customer.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        {['#', 'Bill ID', 'Bill No', 'Date', 'Points', 'Total', 'Status'].map(h => (
                          <th key={h} style={{ padding: '12px 10px', textAlign: h === 'Total' ? 'right' : h === 'Points' || h === 'Status' ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {customerBills.map((bill, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }} onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                          <td style={{ padding: '11px 10px', fontSize: 13, color: '#6b7280' }}>{idx + 1}</td>
                          <td style={{ padding: '11px 10px', fontSize: 13, fontWeight: 500, color: '#111' }}>#{bill.id}</td>
                          <td style={{ padding: '11px 10px', fontSize: 13, color: '#6b7280' }}>{bill.billNumber || 'N/A'}</td>
                          <td style={{ padding: '11px 10px', fontSize: 13, color: '#6b7280' }}>{formatDate(bill.createdAt)}</td>
                          <td style={{ padding: '11px 10px', fontSize: 13, color: '#f59e0b', textAlign: 'center', fontWeight: 600 }}>+{((bill.total || 0) * 0.01).toFixed(2)}</td>
                          <td style={{ padding: '11px 10px', fontSize: 13, fontWeight: 700, color: '#10b981', textAlign: 'right' }}>{fmtCur(bill.total || 0)}</td>
                          <td style={{ padding: '11px 10px', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: bill.paymentStatus === 'paid' ? '#d1fae5' : '#fee2e2', color: bill.paymentStatus === 'paid' ? '#065f46' : '#991b1b' }}>
                              {(bill.paymentStatus || 'pending').charAt(0).toUpperCase() + (bill.paymentStatus || 'pending').slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f9fafb', borderTop: '2px solid #e5e7eb' }}>
                        <td colSpan={5} style={{ padding: '14px 10px', fontSize: 15, fontWeight: 700, color: '#111', textAlign: 'right' }}>Total Spent:</td>
                        <td style={{ padding: '14px 10px', fontSize: 18, fontWeight: 'bold', color: '#10b981', textAlign: 'right' }}>{fmtCur(selectedCustomer.totalSpent)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetailsPage;
