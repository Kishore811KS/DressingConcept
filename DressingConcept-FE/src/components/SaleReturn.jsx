import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUndo, FaSearch, FaPrint, FaEye, FaCalendarAlt, FaReceipt, FaBoxOpen, FaExclamationCircle, FaTrashAlt, FaFileExcel, FaFilePdf } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BASE_URL = 'http://localhost:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default function SaleReturn() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [trashReturns, setTrashReturns] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("trashSaleReturnsData") || "[]");
    } catch (_) {
      return [];
    }
  });
  const [showTrashModal, setShowTrashModal] = useState(false);

  const handleMoveToTrash = (ret) => {
    const retIdStr = String(ret.id || ret.returnNumber);
    if (trashReturns.some(r => String(r.id || r.returnNumber) === retIdStr)) return;

    const updatedTrash = [ret, ...trashReturns];
    setTrashReturns(updatedTrash);
    try {
      localStorage.setItem("trashSaleReturnsData", JSON.stringify(updatedTrash));
    } catch (_) { }
  };

  const handleRestoreFromTrash = (retId) => {
    const updatedTrash = trashReturns.filter(r => String(r.id || r.returnNumber) !== String(retId));
    setTrashReturns(updatedTrash);
    try {
      localStorage.setItem("trashSaleReturnsData", JSON.stringify(updatedTrash));
    } catch (_) { }
  };

  const handleRemoveFromTrash = async (ret) => {
    const retId = ret.id || ret.returnNumber;
    if (!window.confirm(`⚠️ PERMANENT DELETE WARNING:\nAre you sure you want to permanently delete Sale Return #${ret.returnNumber} from the database? This cannot be undone!`)) return;

    try {
      if (ret.id) {
        await api.delete(`/sale-returns/${ret.id}`);
      }
      const updatedTrash = trashReturns.filter(r => String(r.id || r.returnNumber) !== String(retId));
      setTrashReturns(updatedTrash);
      try {
        localStorage.setItem("trashSaleReturnsData", JSON.stringify(updatedTrash));
      } catch (_) { }
      fetchSaleReturns();
    } catch (err) {
      console.error("Error deleting sale return from database:", err);
      const updatedTrash = trashReturns.filter(r => String(r.id || r.returnNumber) !== String(retId));
      setTrashReturns(updatedTrash);
      try {
        localStorage.setItem("trashSaleReturnsData", JSON.stringify(updatedTrash));
      } catch (_) { }
      fetchSaleReturns();
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("⚠️ PERMANENT DELETE WARNING:\nAre you sure you want to permanently delete ALL Sale Returns in Trash from the database? This cannot be undone!")) return;

    for (const ret of trashReturns) {
      if (ret.id) {
        try {
          await api.delete(`/sale-returns/${ret.id}`);
        } catch (err) {
          console.error(`Error deleting sale return ${ret.id}:`, err);
        }
      }
    }

    setTrashReturns([]);
    try {
      localStorage.removeItem("trashSaleReturnsData");
    } catch (_) { }
    fetchSaleReturns();
  };

  const trashReturnIds = (trashReturns || []).map(r => String(r.id || r.returnNumber));
  const visibleReturns = (returns || []).filter(r => !trashReturnIds.includes(String(r.id || r.returnNumber)));

  const fetchSaleReturns = async () => {
    setLoading(true);
    setError('');
    try {
      let url = `/sale-returns?search=${encodeURIComponent(searchTerm)}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await api.get(url);
      setReturns(response.data?.saleReturns || []);
    } catch (err) {
      console.error('Error fetching sale returns:', err);
      setError(err.response?.data?.error || 'Failed to load sale returns. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSaleReturns();
  }, [searchTerm, startDate, endDate]);

  const handlePrintReceipt = (r) => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      alert("Please allow popups to print Sale Return receipts.");
      return;
    }

    const itemsRows = (r.items || []).map((item) => {
      const qty = Number(item.returnedQuantity || item.quantity) || 1;
      const rate = Number(item.sellPrice) || 0;
      const amt = Number(item.totalAmount || (rate * qty)) || 0;
      const taxPct = Number(item.tax) || 5;
      return `
        <tr>
          <td class="r-desc">${String(item.productName || item.description || "").toUpperCase()}</td>
          <td class="r-num">${taxPct}%</td>
          <td class="r-num">${qty.toFixed(2)}</td>
          <td class="r-num">${rate.toFixed(2)}</td>
          <td class="r-num">${amt.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const totalQty = (r.items || []).reduce((sum, item) => sum + (Number(item.returnedQuantity || item.quantity) || 0), 0);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sale Return - ${r.returnNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: 11px;
              line-height: 1.35;
              color: #000;
            }
            .receipt-container {
              width: 76mm;
              padding: 4mm 3mm 6mm;
              margin: 0 auto;
            }
            .receipt-header { text-align: center; margin-bottom: 4px; }
            .receipt-logo { text-align: center; margin-bottom: 4px; }
            .receipt-logo-img { width: 120px; height: auto; object-fit: contain; display: inline-block; }
            .receipt-shop { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
            .receipt-title { font-size: 13px; font-weight: 900; text-align: center; margin: 4px 0; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0; }
            .receipt-addr { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.25; }
            .receipt-info-left { text-align: left; font-size: 11px; font-weight: 700; margin-top: 6px; }

            .receipt-meta { margin: 6px 0; font-size: 11px; font-weight: 700; }
            .receipt-meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; }

            .receipt-line { border-top: 1px solid #000; margin: 5px 0; }
            .receipt-line-dashed { border-top: 1px dashed #000; margin: 5px 0; }

            .receipt-table { width: 100%; border-collapse: collapse; margin: 4px 0; table-layout: fixed; }
            .receipt-table th { font-weight: 800; font-size: 11px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 1px; text-align: right; }
            .receipt-table td { padding: 4px 1px; font-size: 11px; font-weight: 600; vertical-align: top; text-align: right; }
            .receipt-table th.r-desc, .receipt-table td.r-desc { text-align: left; width: 38%; word-break: break-word; }
            .receipt-table th.r-tax, .receipt-table td.r-tax { text-align: left !important; width: 14%; }
            .r-qty { text-align: right; width: 14%; }
            .r-rate { text-align: right; width: 17%; }
            .r-amt { text-align: right; width: 17%; }
            .r-num { text-align: right; }

            .receipt-pay-amount {
              text-align: center;
              font-size: 15px;
              font-weight: 900;
              padding: 5px 0;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              margin: 5px 0;
            }

            .receipt-summary-block { margin: 4px 0; font-size: 11px; font-weight: 700; }
            .receipt-row { display: flex; justify-content: space-between; margin-bottom: 2px; }

            .receipt-customer { margin: 4px 0; }
            .receipt-cust-title { font-weight: 800; text-decoration: underline; margin-bottom: 2px; font-size: 11px; }
            .receipt-cust-name { font-weight: 800; font-size: 11px; text-transform: uppercase; }
            .receipt-cust-phone { font-weight: 700; font-size: 11px; }

            .receipt-qr { display: flex; justify-content: space-around; align-items: flex-end; margin: 8px 0 4px 0; }
            .receipt-qr-item { text-align: center; }
            .receipt-qr-lbl { font-size: 10px; font-weight: 800; letter-spacing: 0.5px; margin-bottom: 3px; }
            .receipt-qr-img { width: 56px; height: 56px; object-fit: contain; display: block; margin: 0 auto; }

            .receipt-footer-msg { text-align: center; margin-top: 6px; }
            .receipt-visit { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
            .receipt-thankyou { font-size: 13px; font-weight: 800; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <div class="receipt-logo">
                <img src="/Dressing_Concept.png" alt="Dressing Concepts" class="receipt-logo-img" />
              </div>
              <div class="receipt-shop">DRESSING CONCEPTS</div>
              <div class="receipt-addr">NO.88/70 S.R.P KOVIL STREET,</div>
              <div class="receipt-addr">AGARAM,PERAMBUR,</div>
              <div class="receipt-addr">CHENNAI-600 082.</div>
              <div class="receipt-info-left">
                <div>PH: 9840669687</div>
                <div>GSTIN: 33BQEPD0068G1ZD</div>
              </div>
            </div>

            <div class="receipt-title">*** SALE RETURN ***</div>

            <div class="receipt-meta">
              <div class="receipt-meta-row">
                <span>Return No:${r.returnNumber}</span>
                <span>${r.returnDate || ''} ${r.returnTime || ''}</span>
              </div>
              <div class="receipt-meta-row">
                <span>Orig Bill: #${r.originalBillNumber}</span>
                <span>User: ${r.createdByName || r.processedByName || 'Admin'}</span>
              </div>
            </div>

            <div class="receipt-line"></div>

            <table class="receipt-table">
              <thead>
                <tr>
                  <th class="r-desc">Description</th>
                  <th class="r-tax">Tax %</th>
                  <th class="r-qty r-num">Qty</th>
                  <th class="r-rate r-num">Rate</th>
                  <th class="r-amt r-num">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="receipt-pay-amount">
              Refund Amount: ${Math.round(r.totalReturnAmount)}/-
              <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 1px;">(Tax inc.)</div>
            </div>

            <div class="receipt-summary-block">
              <div class="receipt-row"><span>Total Pieces: ${totalQty}</span></div>
              <div class="receipt-row"><span>MRP Total: ${Math.round(r.subtotal || r.totalReturnAmount)}</span></div>
            </div>

            <div class="receipt-line"></div>

            <div class="receipt-customer">
              <div class="receipt-cust-title">Customer Details:</div>
              <div class="receipt-cust-name">${String(r.customerName || (r.customer && r.customer.name) || "Walk-in Customer").toUpperCase()}</div>
              ${(r.customerPhone || r.contact || r.phone || (r.customer && r.customer.phone)) ? `<div class="receipt-cust-phone">PH: ${r.customerPhone || r.contact || r.phone || (r.customer && r.customer.phone)}</div>` : ''}
              ${(r.customerAddress || (r.customer && r.customer.address)) ? `<div class="receipt-cust-phone">ADDR: ${r.customerAddress || (r.customer && r.customer.address)}</div>` : ''}
            </div>



            <div class="receipt-footer-msg">
              <div class="receipt-visit">Visit Again</div>
              <div class="receipt-thankyou">Thank You &hearts;</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 250);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    try {
      const exportData = visibleReturns.map((r, idx) => ({
        "#": idx + 1,
        "Return Number": r.returnNumber || "",
        "Original Bill No": r.originalBillNumber || "",
        "Date": r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "-",
        "Time": r.createdAt ? new Date(r.createdAt).toLocaleTimeString("en-GB", { hour12: true }) : "-",
        "Customer Name": r.customerName || "Walk-in Customer",
        "Customer Phone": r.customerPhone || "-",
        "Items Count": r.items ? r.items.length : (r.itemCount || 1),
        "Refund Amount (₹)": Number(r.totalReturnAmount || 0).toFixed(2),
        "Processed By": r.processedByName || r.createdByName || "Admin"
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sale_Returns");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(file, `Sale_Returns_Report_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("Failed to export Excel report.");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");

      doc.setFontSize(18);
      doc.setTextColor(239, 68, 68);
      doc.text("Dressing Concept - Sale Return Report", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated Date: ${new Date().toLocaleString("en-GB")}`, 14, 25);
      doc.text(`Total Returns: ${visibleReturns.length} | Total Refund Amount: Rs. ${totalReturnVal.toFixed(2)}`, 14, 30);

      doc.setDrawColor(239, 68, 68);
      doc.line(14, 34, 196, 34);

      const tableRows = visibleReturns.map((r, idx) => [
        idx + 1,
        r.returnNumber || "",
        `#${r.originalBillNumber || ""}`,
        r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-GB") : "-",
        r.customerName || "Walk-in",
        r.customerPhone || "-",
        r.items ? r.items.length : (r.itemCount || 1),
        `Rs. ${Number(r.totalReturnAmount || 0).toFixed(2)}`,
        r.processedByName || "Admin"
      ]);

      const autoTableFn = typeof autoTable === "function" ? autoTable : doc.autoTable ? doc.autoTable.bind(doc) : null;

      if (autoTableFn) {
        autoTableFn(doc, {
          startY: 38,
          head: [["#", "Return No", "Orig Bill", "Date", "Customer", "Phone", "Items", "Refund Amt", "Processed By"]],
          body: tableRows,
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 8 }
        });
      }

      doc.save(`Sale_Returns_Report_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
      alert("Failed to export PDF report.");
    }
  };

  const totalReturnVal = returns.reduce((acc, curr) => acc + (Number(curr.totalReturnAmount) || 0), 0);

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
            <FaUndo style={{ color: '#ef4444' }} /> Sale Return Report & Management
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            View, audit, export, and reprint all Sale Return transactions linked to original bills.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={exportToExcel}
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}
            title="Export Sale Returns to Excel (.xlsx)"
          >
            <FaFileExcel /> Export Excel
          </button>
          <button
            onClick={exportToPDF}
            style={{
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
            title="Export Sale Returns Report to PDF"
          >
            <FaFilePdf /> Export PDF
          </button>
          <button
            onClick={() => window.location.href = '/bill'}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            <FaUndo /> Process New Sale Return
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '14px', borderRadius: '10px', fontSize: '22px' }}>
            <FaReceipt />
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>TOTAL RETURNS</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc', marginTop: '2px' }}>{returns.length}</div>
          </div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '14px', borderRadius: '10px', fontSize: '22px' }}>
            ₹
          </div>
          <div>
            <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>TOTAL REFUND AMOUNT</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>₹{totalReturnVal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '14px', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <FaSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search Return No, Original Bill No, Customer, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaCalendarAlt style={{ color: '#94a3b8' }} />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
          <span style={{ color: '#64748b' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 12px', color: '#fff', fontSize: '14px', outline: 'none' }}
          />
        </div>

        {(searchTerm || startDate || endDate) && (
          <button
            onClick={() => { setSearchTerm(''); setStartDate(''); setEndDate(''); }}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FaExclamationCircle /> {error}
        </div>
      )}

      {/* Sale Returns Table */}
      <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.5px' }}>
              <th style={{ padding: '14px 16px' }}>Return No</th>
              <th style={{ padding: '14px 16px' }}>Orig Bill No</th>
              <th style={{ padding: '14px 16px' }}>Date & Time</th>
              <th style={{ padding: '14px 16px' }}>Customer</th>
              <th style={{ padding: '14px 16px' }}>Items</th>
              <th style={{ padding: '14px 16px', textAlign: 'right' }}>Refund Amt</th>
              <th style={{ padding: '14px 16px' }}>Processed By</th>
              <th style={{ padding: '14px 16px', textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                  Loading Sale Returns...
                </td>
              </tr>
            ) : visibleReturns.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <FaBoxOpen style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }} />
                  <div>No Sale Return records found</div>
                </td>
              </tr>
            ) : (
              visibleReturns.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #334155', transition: 'background-color 0.15s' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 'bold', color: '#ef4444' }}>
                    {r.returnNumber}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#38bdf8', fontWeight: '600' }}>
                    #{r.originalBillNumber}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '13px' }}>
                    {r.returnDate} {r.returnTime}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '600', color: '#f8fafc' }}>{r.customerName}</div>
                    {r.customerPhone && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{r.customerPhone}</div>}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#cbd5e1', fontSize: '13px' }}>
                    {(r.items || []).length} item(s)
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444', fontSize: '15px' }}>
                    ₹{Number(r.totalReturnAmount).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>
                    {r.createdByName || 'Admin'}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => { setSelectedReturn(r); setShowDetailModal(true); }}
                        title="View Details"
                        style={{ backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        <FaEye /> View
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(r)}
                        title="Print Receipt"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        <FaPrint /> Print
                      </button>
                      <button
                        onClick={() => handleMoveToTrash(r)}
                        title="Move to Trash"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '6px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetailModal && selectedReturn && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FaUndo /> Sale Return #{selectedReturn.returnNumber}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Original Bill: #{selectedReturn.originalBillNumber}</span>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Customer Details Snapshot */}
            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '14px', marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Customer Name</div>
                <div style={{ fontWeight: 'bold', color: '#f8fafc', marginTop: '2px' }}>{selectedReturn.customerName}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Contact Number</div>
                <div style={{ fontWeight: 'bold', color: '#38bdf8', marginTop: '2px' }}>{selectedReturn.customerPhone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Return Date & Time</div>
                <div style={{ color: '#cbd5e1', marginTop: '2px' }}>{selectedReturn.returnDate} {selectedReturn.returnTime}</div>
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase' }}>Processed By</div>
                <div style={{ color: '#cbd5e1', marginTop: '2px' }}>{selectedReturn.createdByName || 'Admin'}</div>
              </div>
            </div>

            {/* Items Table */}
            <h4 style={{ fontSize: '14px', fontWeight: 'bold', color: '#cbd5e1', marginBottom: '10px' }}>Returned Products</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Product</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Orig Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Ret Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(selectedReturn.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: '600', color: '#f8fafc' }}>{item.productName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Code: {item.productCode || '-'}</div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center', color: '#94a3b8' }}>{item.originalQuantity}</td>
                    <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>{item.returnedQuantity} {item.unit}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: '#cbd5e1' }}>₹{Number(item.sellPrice).toFixed(2)}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#f8fafc' }}>₹{Number(item.totalAmount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div style={{ background: '#0f172a', borderRadius: '10px', padding: '16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>Total Refund Amount</div>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#ef4444' }}>₹{Number(selectedReturn.totalReturnAmount).toFixed(2)}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handlePrintReceipt(selectedReturn)}
                style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <FaPrint /> Print Receipt
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Floating Trash Button at Bottom Right Corner ── */}
      <button
        onClick={() => setShowTrashModal(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9000,
          backgroundColor: '#1e293b',
          border: '2px solid #ef4444',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '50px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <FaTrashAlt style={{ color: '#ef4444' }} />
        <span>Trash</span>
        {trashReturns.length > 0 && (
          <span style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            fontSize: '11px',
            fontWeight: '900',
            padding: '2px 8px',
            borderRadius: '12px'
          }}>
            {trashReturns.length}
          </span>
        )}
      </button>

      {/* ── Trash Modal (Shows All Sale Return Details) ── */}
      {showTrashModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center'
        }} onClick={() => setShowTrashModal(false)}>
          <div style={{
            backgroundColor: '#0f172a', border: '2px solid #ef4444', borderRadius: '16px',
            padding: '24px', maxWidth: '850px', width: '94%', maxHeight: '88vh', display: 'flex',
            flexDirection: 'column', color: '#fff', boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaTrashAlt size={22} style={{ color: '#ef4444' }} />
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                    Sale Returns Trash Bin
                  </h3>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    Deleted Sale Returns saved in Trash ({trashReturns.length} items)
                  </span>
                </div>
              </div>
              <button
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '20px' }}
                onClick={() => setShowTrashModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              {trashReturns.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '10px' }}>✨</span>
                  Trash is empty! No deleted Sale Returns.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {trashReturns.map((tr) => (
                    <div key={tr.id || tr.returnNumber} style={{
                      backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px',
                      padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #334155', paddingBottom: '8px' }}>
                        <div>
                          <strong style={{ color: '#ef4444', fontSize: '15px' }}>Return #{tr.returnNumber}</strong>
                          <span style={{ fontSize: '12px', color: '#38bdf8', marginLeft: '12px', fontWeight: 'bold' }}>
                            Orig Bill #{tr.originalBillNumber}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setShowTrashModal(false);
                              setSelectedReturn(tr);
                              setShowDetailModal(true);
                            }}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', background: '#3b82f6',
                              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                            title="View Return Details"
                          >
                            <FaEye size={12} /> Details
                          </button>
                          <button
                            onClick={() => handleRestoreFromTrash(tr.id || tr.returnNumber)}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', background: '#059669',
                              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Restore back to Sale Returns list"
                          >
                            🔄 Restore
                          </button>
                          <button
                            onClick={() => handleRemoveFromTrash(tr)}
                            style={{
                              padding: '4px 10px', borderRadius: '6px', background: '#dc2626',
                              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px',
                              display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}
                            title="Permanently delete from database"
                          >
                            <FaTrashAlt size={12} /> Remove
                          </button>
                        </div>
                      </div>

                      {/* Summary Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '12px', color: '#cbd5e1' }}>
                        <div><strong>Customer:</strong> <span style={{ color: '#fff' }}>{tr.customerName || 'Walk-in'}</span></div>
                        <div><strong>Phone:</strong> <span style={{ color: '#fff' }}>{tr.customerPhone || 'N/A'}</span></div>
                        <div><strong>Date:</strong> <span style={{ color: '#fff' }}>{tr.returnDate || '-'}</span></div>
                        <div><strong>Processed By:</strong> <span style={{ color: '#cbd5e1' }}>{tr.createdByName || 'Admin'}</span></div>
                      </div>

                      {/* Refund Amount Totals */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#0f172a', padding: '8px 12px', borderRadius: '8px', fontSize: '13px' }}>
                        <span>Returned Items: <strong>{(tr.items || []).length} item(s)</strong></span>
                        <span>Refund Amount: <strong style={{ color: '#ef4444', fontSize: '15px' }}>₹{Number(tr.totalReturnAmount || 0).toFixed(2)}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {trashReturns.length > 0 ? (
                <button
                  type="button"
                  onClick={handleEmptyTrash}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px'
                  }}
                >
                  Empty Trash (Clear Database)
                </button>
              ) : <div />}
              <button
                type="button"
                onClick={() => setShowTrashModal(false)}
                style={{
                  padding: '8px 18px', borderRadius: '8px', background: '#334155',
                  color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                Close Trash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
