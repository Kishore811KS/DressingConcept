import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaUndo, FaSearch, FaPrint, FaEye, FaCalendarAlt, FaReceipt, FaBoxOpen, FaExclamationCircle } from 'react-icons/fa';

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

            .receipt-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
            .receipt-table th { font-weight: 800; font-size: 11px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; text-align: left; }
            .receipt-table td { padding: 4px 0; font-size: 11px; font-weight: 600; vertical-align: top; }
            .r-desc { text-align: left; width: 45%; }
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
                <div>GSTIN:</div>
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
                  <th class="r-num">Tax %</th>
                  <th class="r-num">Qty</th>
                  <th class="r-num">Rate</th>
                  <th class="r-num">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="receipt-pay-amount">
              Refund Amount: ${Math.round(r.totalReturnAmount)}/-
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

            <div class="receipt-line-dashed"></div>

            <div class="receipt-qr">
              <div class="receipt-qr-item">
                <div class="receipt-qr-lbl">JOIN US</div>
                <img src="/whatsapp-qr.png" alt="WhatsApp QR" class="receipt-qr-img" />
              </div>
              <div class="receipt-qr-item">
                <div class="receipt-qr-lbl">VISIT US</div>
                <img src="/instagram.png" alt="Instagram QR" class="receipt-qr-img" />
              </div>
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

  const totalReturnVal = returns.reduce((acc, curr) => acc + (Number(curr.totalReturnAmount) || 0), 0);

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8' }}>
            <FaUndo style={{ color: '#ef4444' }} /> Sale Return Report & Management
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            View, audit, and reprint all Sale Return transactions linked to original bills.
          </p>
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
            ) : returns.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  <FaBoxOpen style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }} />
                  <div>No Sale Return records found</div>
                </td>
              </tr>
            ) : (
              returns.map((r) => (
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
    </div>
  );
}
