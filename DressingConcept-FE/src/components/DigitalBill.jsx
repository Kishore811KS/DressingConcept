import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const DigitalBill = () => {
  const [step, setStep] = useState('verification'); // 'verification' or 'view'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [billData, setBillData] = useState(null);

  // Get bill number from URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bill = params.get('billNo');
    if (bill) {
      setBillNumber(bill);
    }
  }, []);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!billNumber.trim()) {
      setError('Bill number not found. Please use the link from your message.');
      return;
    }

    setLoading(true);

    try {
      // Format phone number (remove any non-digits)
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      
      const response = await axios.get(
        `${API_BASE_URL}/billing/digital-bill/${billNumber}/${formattedPhone}`
      );

      setBillData(response.data);
      setStep('view');
      setMessage('Phone number verified! Here is your digital receipt.');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Bill not found. Please check the link and try again.');
      } else if (err.response?.status === 403) {
        setError('Phone number does not match the bill on record. Please check and try again.');
      } else {
        setError(err.response?.data?.error || 'Error retrieving your bill. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!billData) return;

    // Create a simple PDF-like document
    const doc = document.createElement('div');
    doc.innerHTML = generateBillHTML();
    
    // Print or save as PDF (using browser's print dialog)
    window.print();
  };

  const generateBillHTML = () => {
    if (!billData) return '';

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
      }).format(value);
    };

    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    let itemsHTML = billData.items.map((item, idx) => `
      <tr>
        <td style="text-align: center; padding: 8px;">${idx + 1}</td>
        <td style="padding: 8px;">${item.productName} ${item.productModel ? '(' + item.productModel + ')' : ''}</td>
        <td style="text-align: center; padding: 8px;">${item.quantity}</td>
        <td style="text-align: right; padding: 8px;">${formatCurrency(item.price)}</td>
        <td style="text-align: right; padding: 8px;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    return `
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
          }
          .bill-container {
            background-color: white;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px;
            border: 1px solid #ddd;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .bill-header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .bill-header h1 {
            margin: 0;
            font-size: 28px;
            color: #333;
          }
          .bill-header p {
            margin: 5px 0;
            color: #666;
          }
          .bill-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border: 1px solid #eee;
            padding: 15px;
          }
          .bill-details div {
            flex: 1;
          }
          .bill-details label {
            font-weight: bold;
            color: #333;
            display: block;
            margin-bottom: 5px;
          }
          .bill-details span {
            color: #666;
          }
          .bill-items {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          .bill-items th {
            background-color: #f0f0f0;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #333;
            font-weight: bold;
          }
          .bill-items td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .bill-summary {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
          }
          .summary-box {
            width: 300px;
            border: 1px solid #ddd;
            padding: 15px;
          }
          .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
          }
          .summary-row.total {
            border-bottom: 2px solid #333;
            font-weight: bold;
            font-size: 16px;
            margin-top: 10px;
            padding: 10px 0;
          }
          .bill-footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
            margin-top: 30px;
          }
          @media print {
            body {
              background-color: white;
              padding: 0;
            }
            .bill-container {
              box-shadow: none;
              border: none;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="bill-container">
          <div class="bill-header">
            <h1>DRESSING CONCEPT</h1>
            <p>Digital Bill Receipt</p>
          </div>

          <div class="bill-details">
            <div>
              <label>Bill Number:</label>
              <span>${billData.billNumber}</span>
            </div>
            <div>
              <label>Date & Time:</label>
              <span>${formatDate(billData.createdAt)}</span>
            </div>
            <div>
              <label>Payment Method:</label>
              <span>${billData.paymentMethod}</span>
            </div>
          </div>

          <div class="bill-details">
            <div>
              <label>Customer Name:</label>
              <span>${billData.customerName}</span>
            </div>
            <div>
              <label>Mobile:</label>
              <span>${billData.customerPhone}</span>
            </div>
            <div>
              <label>Address:</label>
              <span>${billData.customerAddress || 'N/A'}</span>
            </div>
          </div>

          <table class="bill-items">
            <thead>
              <tr>
                <th style="width: 5%">S.No</th>
                <th style="width: 45%">Product Description</th>
                <th style="width: 15%; text-align: center">Quantity</th>
                <th style="width: 15%; text-align: right">Unit Price</th>
                <th style="width: 20%; text-align: right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
          </table>

          <div class="bill-summary">
            <div class="summary-box">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>${formatCurrency(billData.subtotal)}</span>
              </div>
              <div class="summary-row">
                <span>Discount:</span>
                <span>-${formatCurrency(billData.discount)}</span>
              </div>
              <div class="summary-row">
                <span>Tax:</span>
                <span>${formatCurrency(billData.tax)}</span>
              </div>
              <div class="summary-row total">
                <span>Total Amount:</span>
                <span>${formatCurrency(billData.totalAmount)}</span>
              </div>
              <div class="summary-row">
                <span>Paid Amount:</span>
                <span>${formatCurrency(billData.paidAmount)}</span>
              </div>
            </div>
          </div>

          <div class="bill-footer">
            <p>Thank you for shopping at Dressing Concept!</p>
            <p style="margin-top: 20px; font-size: 11px">This is a digitally generated receipt. No signature required.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleBackToVerification = () => {
    setStep('verification');
    setBillData(null);
    setMessage('');
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      padding: '20px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      padding: '40px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '500px',
      width: '100%'
    },
    header: {
      textAlign: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#333',
      marginBottom: '10px'
    },
    subtitle: {
      fontSize: '14px',
      color: '#666',
      marginBottom: '5px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#333',
      marginBottom: '5px'
    },
    input: {
      padding: '12px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif'
    },
    button: {
      padding: '12px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      marginTop: '10px'
    },
    buttonDisabled: {
      opacity: '0.6',
      cursor: 'not-allowed'
    },
    buttonSecondary: {
      backgroundColor: '#6c757d',
      marginTop: '10px'
    },
    error: {
      color: '#dc3545',
      fontSize: '14px',
      padding: '12px',
      backgroundColor: '#f8d7da',
      borderRadius: '4px',
      marginBottom: '15px',
      border: '1px solid #f5c6cb'
    },
    success: {
      color: '#155724',
      fontSize: '14px',
      padding: '12px',
      backgroundColor: '#d4edda',
      borderRadius: '4px',
      marginBottom: '15px',
      border: '1px solid #c3e6cb'
    },
    billContainer: {
      backgroundColor: '#f9f9f9',
      padding: '20px',
      borderRadius: '4px',
      marginBottom: '20px'
    },
    billRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '10px 0',
      borderBottom: '1px solid #ddd'
    },
    billRowLabel: {
      fontWeight: '600',
      color: '#333'
    },
    billRowValue: {
      color: '#666'
    },
    itemsTable: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '20px'
    },
    tableHeader: {
      backgroundColor: '#f0f0f0',
      padding: '10px',
      fontWeight: '600',
      textAlign: 'left',
      borderBottom: '2px solid #ddd'
    },
    tableCell: {
      padding: '10px',
      borderBottom: '1px solid #ddd'
    }
  };

  if (step === 'verification') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>Digital Bill Access</h1>
            <p style={styles.subtitle}>Verify your phone number to view your receipt</p>
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <form onSubmit={handlePhoneSubmit} style={styles.form}>
            <div>
              <label style={styles.label}>
                Enter the phone number used for this purchase:
              </label>
              <input
                type="tel"
                style={styles.input}
                placeholder="e.g., 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              style={{
                ...styles.button,
                ...(loading ? styles.buttonDisabled : {})
              }}
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & View Receipt'}
            </button>
          </form>

          <p style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center'
          }}>
            We only need your phone number to verify your identity and display your bill.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'view' && billData) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <h1 style={styles.title}>Digital Receipt</h1>
            <p style={styles.subtitle}>{billData.billNumber}</p>
          </div>

          {message && <div style={styles.success}>{message}</div>}

          <div style={styles.billContainer}>
            <div style={styles.billRow}>
              <span style={styles.billRowLabel}>Bill Number:</span>
              <span style={styles.billRowValue}>{billData.billNumber}</span>
            </div>
            <div style={styles.billRow}>
              <span style={styles.billRowLabel}>Date & Time:</span>
              <span style={styles.billRowValue}>
                {new Date(billData.createdAt).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div style={styles.billRow}>
              <span style={styles.billRowLabel}>Customer:</span>
              <span style={styles.billRowValue}>{billData.customerName}</span>
            </div>
            <div style={styles.billRow}>
              <span style={styles.billRowLabel}>Payment Method:</span>
              <span style={styles.billRowValue}>{billData.paymentMethod}</span>
            </div>
          </div>

          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#333' }}>Items:</h3>
          <table style={styles.itemsTable}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ ...styles.tableHeader, width: '5%' }}>S.No</th>
                <th style={{ ...styles.tableHeader, width: '45%' }}>Product</th>
                <th style={{ ...styles.tableHeader, width: '15%', textAlign: 'center' }}>Qty</th>
                <th style={{ ...styles.tableHeader, width: '15%', textAlign: 'right' }}>Price</th>
                <th style={{ ...styles.tableHeader, width: '20%', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {billData.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ ...styles.tableCell, textAlign: 'center' }}>{idx + 1}</td>
                  <td style={styles.tableCell}>
                    {item.productName}
                    {item.productModel && ` (${item.productModel})`}
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'center' }}>{item.quantity}</td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                    ₹{item.price.toFixed(2)}
                  </td>
                  <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <div style={styles.billRow}>
              <span style={styles.billRowLabel}>Subtotal:</span>
              <span style={styles.billRowValue}>₹{billData.subtotal.toFixed(2)}</span>
            </div>
            {billData.discount > 0 && (
              <div style={styles.billRow}>
                <span style={styles.billRowLabel}>Discount:</span>
                <span style={styles.billRowValue}>-₹{billData.discount.toFixed(2)}</span>
              </div>
            )}
            {billData.tax > 0 && (
              <div style={styles.billRow}>
                <span style={styles.billRowLabel}>Tax:</span>
                <span style={styles.billRowValue}>₹{billData.tax.toFixed(2)}</span>
              </div>
            )}
            <div style={{ ...styles.billRow, borderBottom: '2px solid #333', fontWeight: 'bold' }}>
              <span style={styles.billRowLabel}>Total Amount:</span>
              <span style={{ ...styles.billRowValue, fontSize: '16px', fontWeight: 'bold' }}>
                ₹{billData.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            onClick={handleDownloadPDF}
            style={{ ...styles.button }}
          >
            📥 Download as PDF
          </button>

          <button
            onClick={handleBackToVerification}
            style={{ ...styles.button, ...styles.buttonSecondary }}
          >
            ← Back
          </button>

          <p style={{
            marginTop: '20px',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center'
          }}>
            Thank you for shopping at Dressing Concept!
          </p>
        </div>
      </div>
    );
  }

  return null;
};

export default DigitalBill;
