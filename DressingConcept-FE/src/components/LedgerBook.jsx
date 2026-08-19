import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Book,
  Search,
  Download,
  Receipt,
  TrendingUp,
  Eye,
  X,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Landmark,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Wallet,
  RotateCcw,
  Printer
} from "lucide-react";

const BASE_URL = "http://localhost:5000";

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json"
  }
});

const paymentMethodMap = {
  cash: { name: "Cash", color: "#10b981", icon: <DollarSign size={13} /> },
  upi: { name: "UPI", color: "#8b5cf6", icon: <CreditCard size={13} /> },
  card: { name: "Card", color: "#3b82f6", icon: <CreditCard size={13} /> },
  online: { name: "Online", color: "#06b6d4", icon: <CreditCard size={13} /> },
  sales_return: { name: "Sales Return", color: "#ef4444", icon: <RotateCcw size={13} /> },
  salary_deduction: { name: "Salary Deduct", color: "#f59e0b", icon: <Wallet size={13} /> }
};

const customerTypeMap = {
  external: { name: "External", color: "#3b82f6" },
  employee: { name: "Employee", color: "#8b5cf6" },
  wholesale: { name: "Wholesale", color: "#10b981" }
};

const formatBillNo = (billNo) => {
  if (!billNo) return "";
  const str = String(billNo).trim();
  return str.includes("/") ? str.split("/").pop() : str;
};

const LedgerBook = () => {
  const [loading, setLoading] = useState(true);
  const [availableFyYears, setAvailableFyYears] = useState([]);
  const [fySummaries, setFySummaries] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedFy, setSelectedFy] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [customerTypeFilter, setCustomerTypeFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // Selected Bill Modal state
  const [selectedBill, setSelectedBill] = useState(null);

  const fetchLedgerData = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/billing/ledger-book${selectedFy !== "all" ? `?fy=${selectedFy}` : ""}`);
      if (response.data?.success) {
        setAvailableFyYears(response.data.available_fy_years || []);
        setFySummaries(response.data.fy_summaries || []);
        setBills(response.data.bills || []);
      }
    } catch (err) {
      console.error("Error fetching Ledger Book data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedgerData();
  }, [selectedFy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, paymentFilter, customerTypeFilter, selectedFy]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        !searchTerm.trim() ||
        String(b.billNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.rawBillNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.customerName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(b.customerPhone || "").includes(searchTerm);

      const matchesPayment =
        paymentFilter === "all" ||
        String(b.paymentMethod || "").toLowerCase() === paymentFilter.toLowerCase();

      const matchesCustomerType =
        customerTypeFilter === "all" ||
        String(b.customerType || "").toLowerCase() === customerTypeFilter.toLowerCase();

      return matchesSearch && matchesPayment && matchesCustomerType;
    });
  }, [bills, searchTerm, paymentFilter, customerTypeFilter]);

  const grandTotals = useMemo(() => {
    const totalSales = fySummaries.reduce((sum, s) => sum + (s.total_sales_amount || 0), 0);
    const totalReturns = fySummaries.reduce((sum, s) => sum + (s.total_return_amount || 0), 0);
    const netRev = totalSales - totalReturns;
    const totalBillsCount = fySummaries.reduce((sum, s) => sum + (s.total_bills || 0), 0);
    return { totalSales, totalReturns, netRev, totalBillsCount };
  }, [fySummaries]);

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBills = filteredBills.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage) || 1;

  const handleViewBillDetails = async (billId) => {
    try {
      const res = await api.get(`/billing/bills/${billId}`);
      setSelectedBill(res.data?.bill || res.data);
    } catch (err) {
      console.error("Error fetching bill details:", err);
    }
  };

  const handlePrintBill = (bill) => {
    if (!bill) return;

    const formattedBillNo = formatBillNo(bill.billNumber || bill.bill_number || bill.rawBillNumber);
    const customerName = bill.customer_name || bill.customerName || bill.customer?.name || "Walk-in Customer";
    const customerPhone = bill.customer_phone || bill.customerPhone || bill.customer?.phone || "";
    const customerAddress = bill.customer_address || bill.customerAddress || bill.address || "";
    
    const createdDate = bill.created_at || bill.createdAt ? new Date(bill.created_at || bill.createdAt) : new Date();
    const dateStr = isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleDateString("en-GB");
    const timeStr = isNaN(createdDate.getTime()) ? '' : createdDate.toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateTimeStr = `${dateStr} ${timeStr}`.trim();
    
    const paymentMethod = String(bill.payment_method || bill.paymentMethod || bill.payment?.method || "Cash").toLowerCase();
    const isCard = paymentMethod.includes('card');
    const isCash = paymentMethod.includes('cash');
    const isUpi = paymentMethod.includes('upi');
    const isOnline = paymentMethod.includes('online');

    const items = bill.items || [];
    const totalPieces = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const total = Number(bill.summary?.total ?? bill.total ?? bill.grandTotal ?? 0);
    const subtotal = Number(bill.summary?.subtotal ?? bill.subtotal ?? total);
    const mrpTotal = items.reduce((sum, item) => sum + ((Number(item.mrp) || Number(item.sellPrice) || 0) * (Number(item.quantity) || 1)), 0) || subtotal || total;
    const taxTotal = Number(bill.summary?.tax ?? bill.tax ?? 0);
    const taxableTotal = Math.max(0, total - taxTotal);
    const paid = Number(bill.payment?.paidAmount ?? bill.paidAmount ?? bill.paid_amount ?? (bill.payments && bill.payments.length > 0 ? bill.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : total));
    const due = Math.max(0, total - paid);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Thermal Receipt #${formattedBillNo}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 3mm 2mm 5mm;
              background: #fff;
              color: #000;
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: 11px;
              line-height: 1.3;
              width: 76mm;
              box-sizing: border-box;
            }
            .receipt { width: 100%; max-width: 76mm; margin: 0 auto; }
            .receipt-header { text-align: center; margin-bottom: 4px; }
            .receipt-logo { text-align: center; margin-bottom: 4px; }
            .receipt-logo-img { width: 120px; height: auto; object-fit: contain; display: inline-block; }
            .receipt-shop { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-align: center; margin-bottom: 2px; text-transform: uppercase; }
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

            .receipt-footer-msg { text-align: center; margin-top: 6px; }
            .receipt-visit { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }
            .receipt-thankyou { font-size: 13px; font-weight: 800; margin-top: 2px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="receipt-header">
              <div class="receipt-logo">
                <img src="/Dressing_Concept.png" alt="Dressing Concepts" class="receipt-logo-img" onerror="this.style.display='none'" />
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

            <div class="receipt-meta">
              <div class="receipt-meta-row">
                <span>Bill No:${formattedBillNo}</span>
                <span>${dateTimeStr}</span>
              </div>
              <div class="receipt-meta-row">
                <span>${bill.counter || ''}</span>
                <span>User: ${bill.createdBy || bill.salesPerson || 'Admin'}</span>
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
                ${items.length > 0 ? items.map(item => {
                  const pName = String(item.product_name || item.productName || item.name || 'ITEM').toUpperCase();
                  const qty = Number(item.quantity) || 1;
                  const rate = Number(item.sell_price || item.sellPrice || item.mrp || 0);
                  const amt = Number(item.total || (rate * qty));
                  const taxPct = Number(item.tax || item.taxPct || 5);
                  return `
                    <tr>
                      <td class="r-desc">${pName}</td>
                      <td class="r-tax">${taxPct}%</td>
                      <td class="r-qty r-num">${qty.toFixed(2)}</td>
                      <td class="r-rate r-num">${rate.toFixed(2)}</td>
                      <td class="r-amt r-num">${amt.toFixed(2)}</td>
                    </tr>
                  `;
                }).join('') : `<tr><td colspan="5" style="text-align:center;">No items listed</td></tr>`}
              </tbody>
            </table>

            <div class="receipt-pay-amount">
              Pay Amount: ${Math.round(total)}/-
              <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 1px;">(Tax inc.)</div>
            </div>

            <div class="receipt-summary-block">
              <div class="receipt-row"><span>Total Pieces: ${totalPieces}</span></div>
              <div class="receipt-row"><span>MRP Total: ${Math.round(mrpTotal)}</span></div>
              <div class="receipt-row"><span>Taxable Amt (Excl. GST):</span><span>₹${taxableTotal.toFixed(2)}</span></div>
              <div class="receipt-row" style="font-weight: bold;"><span>GST Inclusive Amt:</span><span>₹${total.toFixed(2)}</span></div>
            </div>

            <div class="receipt-summary-block">
              ${isCard ? `<div class="receipt-row"><span>Card Amt: ${Math.round(paid)}</span></div>` : ''}
              ${isCash ? `<div class="receipt-row"><span>Cash Amt: ${Math.round(paid)}</span></div>` : ''}
              ${isUpi ? `<div class="receipt-row"><span>UPI Amt: ${Math.round(paid)}</span></div>` : ''}
              ${isOnline ? `<div class="receipt-row"><span>Online Amt: ${Math.round(paid)}</span></div>` : ''}
              ${due > 0 ? `<div class="receipt-row" style="color:red;"><span>Due Amt: ${Math.round(due)}</span></div>` : ''}
            </div>

            <div class="receipt-line"></div>

            <div class="receipt-customer">
              <div class="receipt-cust-title">Customer Details:</div>
              <div class="receipt-cust-name">${String(customerName).toUpperCase()}</div>
              ${customerPhone && customerPhone !== "N/A" ? `<div class="receipt-cust-phone">PH: ${customerPhone}</div>` : ''}
              ${customerAddress ? `<div class="receipt-cust-phone">ADDR: ${customerAddress}</div>` : ''}
            </div>

            <div class="receipt-line"></div>

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
              }, 300);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setPaymentFilter("all");
    setCustomerTypeFilter("all");
    setSelectedFy("all");
  };

  const exportLedgerExcel = () => {
    try {
      const exportData = filteredBills.map((bill, idx) => ({
        "#": idx + 1,
        "Bill Number": formatBillNo(bill.billNumber || bill.rawBillNumber),
        "Financial Year": `FY ${bill.fy || ""}`,
        "Date": bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-GB") : "-",
        "Time": bill.createdAt ? new Date(bill.createdAt).toLocaleTimeString("en-GB", { hour12: false }) : "-",
        "Customer Name": bill.customerName || "Walk-in Customer",
        "Customer Phone": bill.customerPhone || "-",
        "Customer Type": (bill.customerType || "external").toUpperCase(),
        "Payment Method": (bill.paymentMethod || "cash").toUpperCase(),
        "Item Count": bill.itemCount || 1,
        "Total Amount (₹)": Number(bill.total || 0).toFixed(2),
        "Paid Amount (₹)": Number(bill.paidAmount || 0).toFixed(2),
        "Created By": bill.createdByName || "Admin"
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger_Bills");

      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const file = new Blob([excelBuffer], { type: "application/octet-stream" });
      saveAs(file, `Ledger_Book_Report_${selectedFy}_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Excel Export Error:", err);
    }
  };

  const exportLedgerPDF = () => {
    try {
      const doc = new jsPDF("p", "mm", "a4");

      doc.setFontSize(18);
      doc.setTextColor(99, 102, 241);
      doc.text("Dressing Concept - Multi-FY Ledger Book Report", 14, 18);

      doc.setFontSize(9);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated Date: ${new Date().toLocaleString("en-GB")}`, 14, 25);
      doc.text(`Financial Year Filter: ${selectedFy === "all" ? "All Financial Years (Master)" : `FY ${selectedFy}`}`, 14, 30);

      doc.setDrawColor(55, 65, 81);
      doc.line(14, 34, 196, 34);

      // Summary Table of FYs
      const fyTableRows = fySummaries.map((s, idx) => [
        idx + 1,
        `FY ${s.fy}`,
        s.total_bills,
        `Rs. ${Number(s.total_sales_amount).toLocaleString()}`,
        `Rs. ${Number(s.total_return_amount).toLocaleString()}`,
        `Rs. ${Number(s.net_revenue).toLocaleString()}`,
        s.total_items_sold
      ]);

      const autoTableFn = typeof autoTable === "function" ? autoTable : doc.autoTable ? doc.autoTable.bind(doc) : null;

      if (autoTableFn) {
        autoTableFn(doc, {
          startY: 38,
          head: [["#", "Financial Year", "Total Bills", "Gross Sales", "Returns Payout", "Net Revenue", "Items Sold"]],
          body: fyTableRows,
          theme: "grid",
          headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 9 }
        });

        let finalY = doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY + 10 : 80;
        doc.setFontSize(12);
        doc.setTextColor(99, 102, 241);
        doc.text("Detailed Master Ledger Bills List", 14, finalY);

        const billsTableRows = filteredBills.map((b, idx) => [
          idx + 1,
          formatBillNo(b.billNumber || b.rawBillNumber),
          `FY ${b.fy}`,
          b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-GB") : "-",
          b.customerName || "Walk-in",
          b.customerPhone || "-",
          (b.paymentMethod || "Cash").toUpperCase(),
          `Rs. ${Number(b.total).toLocaleString()}`
        ]);

        autoTableFn(doc, {
          startY: finalY + 4,
          head: [["#", "Bill No", "FY", "Date", "Customer Name", "Phone", "Payment", "Amount"]],
          body: billsTableRows,
          theme: "striped",
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
          styles: { fontSize: 8 }
        });
      }

      doc.save(`Ledger_Book_Report_${selectedFy}.pdf`);
    } catch (err) {
      console.error("PDF Export Error:", err);
    }
  };

  return (
    <div style={styles.container}>
      {/* ── Top Header Banner ── */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <div style={styles.headerIconBox}>
            <Book size={24} color="#6366f1" />
          </div>
          <div>
            <h1 style={styles.title}>Ledger Book</h1>
            <p style={styles.subtitle}>
              Multi-Year Financial Bills, Returns & Revenue Reports Archive
            </p>
          </div>
        </div>

        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={fetchLedgerData} title="Refresh Ledger Data">
            <RefreshCw size={15} color="#9ca3af" />
          </button>
          <button style={{ ...styles.button, ...styles.successButton }} onClick={exportLedgerExcel}>
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          <button style={{ ...styles.button, ...styles.primaryButton }} onClick={exportLedgerPDF}>
            <FileText size={15} /> Export PDF Report
          </button>
        </div>
      </div>

      {/* ── Multi-FY Grand Summary KPI Cards ── */}
      <div style={styles.kpiGrid}>
        <div style={{ ...styles.kpiCard, borderLeft: "4px solid #6366f1" }}>
          <div style={styles.kpiHeaderRow}>
            <span style={styles.kpiLabel}>MULTI-FY GROSS REVENUE</span>
            <TrendingUp size={16} color="#6366f1" />
          </div>
          <div style={{ ...styles.kpiValue, color: "#6366f1" }}>
            ₹{grandTotals.totalSales.toLocaleString()}
          </div>
          <div style={styles.kpiSub}>Total Gross Billing Value</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: "4px solid #10b981" }}>
          <div style={styles.kpiHeaderRow}>
            <span style={styles.kpiLabel}>NET REVENUE</span>
            <IndianRupee size={16} color="#10b981" />
          </div>
          <div style={{ ...styles.kpiValue, color: "#10b981" }}>
            ₹{grandTotals.netRev.toLocaleString()}
          </div>
          <div style={styles.kpiSub}>After Sales Returns Deductions</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: "4px solid #ef4444" }}>
          <div style={styles.kpiHeaderRow}>
            <span style={styles.kpiLabel}>SALES RETURNS PAYOUT</span>
            <RotateCcw size={16} color="#ef4444" />
          </div>
          <div style={{ ...styles.kpiValue, color: "#ef4444" }}>
            - ₹{grandTotals.totalReturns.toLocaleString()}
          </div>
          <div style={styles.kpiSub}>Total Refunded via Returns</div>
        </div>

        <div style={{ ...styles.kpiCard, borderLeft: "4px solid #f59e0b" }}>
          <div style={styles.kpiHeaderRow}>
            <span style={styles.kpiLabel}>TOTAL HISTORICAL BILLS</span>
            <Receipt size={16} color="#f59e0b" />
          </div>
          <div style={{ ...styles.kpiValue, color: "#f59e0b" }}>
            {grandTotals.totalBillsCount}
          </div>
          <div style={styles.kpiSub}>Across All Financial Years</div>
        </div>
      </div>

      {/* ── Financial Years Breakdown Section ── */}
      <div style={styles.sectionWrap}>
        <h2 style={styles.sectionHeader}>
          <Landmark size={18} style={{ marginRight: 8, color: "#6366f1" }} />
          Financial Years Summary Breakdown
        </h2>

        <div style={styles.fyCardsContainer}>
          {fySummaries.map((summary) => {
            const isSelected = selectedFy === summary.fy;
            return (
              <div
                key={summary.fy}
                style={{
                  ...styles.fyCard,
                  ...(isSelected ? styles.fyCardActive : {})
                }}
                onClick={() => setSelectedFy(summary.fy)}
              >
                <div style={styles.fyCardHeader}>
                  <span style={styles.fyBadge}>FY {summary.fy}</span>
                  <span style={styles.fyBillCount}>{summary.total_bills} Bills</span>
                </div>
                <div style={styles.fyMetricRow}>
                  <span style={styles.fyMetricLabel}>Gross Revenue:</span>
                  <span style={{ ...styles.fyMetricVal, color: "#38bdf8" }}>
                    ₹{Number(summary.total_sales_amount).toLocaleString()}
                  </span>
                </div>
                <div style={styles.fyMetricRow}>
                  <span style={styles.fyMetricLabel}>Returns Payout:</span>
                  <span style={{ ...styles.fyMetricVal, color: "#f87171" }}>
                    - ₹{Number(summary.total_return_amount).toLocaleString()}
                  </span>
                </div>
                <div style={styles.fyMetricRow}>
                  <span style={styles.fyMetricLabel}>Net Revenue:</span>
                  <span style={{ ...styles.fyMetricVal, color: "#4ade80", fontWeight: "bold" }}>
                    ₹{Number(summary.net_revenue).toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by Bill No, Customer Name, Phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <select
          style={styles.filterSelect}
          value={selectedFy}
          onChange={(e) => setSelectedFy(e.target.value)}
        >
          <option value="all">All Financial Years (Master)</option>
          {availableFyYears.map((fy) => (
            <option key={fy} value={fy}>
              FY {fy}
            </option>
          ))}
        </select>

        <select
          style={styles.filterSelect}
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="online">Online</option>
          <option value="sales_return">Sales Return</option>
          <option value="salary_deduction">Salary Deduction</option>
        </select>

        <select
          style={styles.filterSelect}
          value={customerTypeFilter}
          onChange={(e) => setCustomerTypeFilter(e.target.value)}
        >
          <option value="all">All Customer Types</option>
          <option value="external">External</option>
          <option value="employee">Employee</option>
          <option value="wholesale">Wholesale</option>
        </select>

        <button style={styles.clearFilterButton} onClick={handleClearFilters} title="Clear Filters">
          <X size={15} /> Clear
        </button>
      </div>

      {/* ── Master Bills Ledger Table ── */}
      <div style={styles.tableContainer}>
        <div style={styles.tableHeaderRow}>
          <h3 style={styles.tableTitle}>
            <Receipt size={18} style={{ marginRight: 8, color: "#6366f1" }} />
            Ledger Bills List {selectedFy !== "all" ? `(FY ${selectedFy})` : "(All Financial Years)"}
          </h3>
          <span style={styles.recordCountBadge}>{filteredBills.length} Records Found</span>
        </div>

        {loading ? (
          <div style={styles.loadingSpinner}>Loading Multi-FY Ledger Data...</div>
        ) : filteredBills.length === 0 ? (
          <div style={styles.noData}>No bills found for the selected Financial Year or filter criteria.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>#</th>
                  <th style={styles.th}>Bill Number</th>
                  <th style={styles.th}>FY</th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Customer</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Payment Method</th>
                  <th style={styles.th}>Total Amount</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {currentBills.map((bill, index) => {
                  const payMeta = paymentMethodMap[String(bill.paymentMethod || "cash").toLowerCase()] || {
                    name: (bill.paymentMethod || "Cash").toUpperCase(),
                    color: "#9ca3af",
                    icon: <CreditCard size={13} />
                  };
                  const custMeta = customerTypeMap[String(bill.customerType || "external").toLowerCase()] || {
                    name: bill.customerType || "External",
                    color: "#3b82f6"
                  };

                  return (
                    <tr key={bill.id || index} style={styles.tr}>
                      <td style={styles.td}>{indexOfFirstItem + index + 1}</td>
                      <td style={{ ...styles.td, fontWeight: "bold", color: "#ec4899" }}>
                        #{formatBillNo(bill.billNumber || bill.rawBillNumber)}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.fyBadgeTag}>FY {bill.fy}</span>
                      </td>
                      <td style={styles.td}>
                        {bill.createdAt ? new Date(bill.createdAt).toLocaleDateString("en-GB") : "-"}
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: "600", color: "#f9fafb" }}>{bill.customerName}</div>
                        {bill.customerPhone && (
                          <div style={{ fontSize: "11px", color: "#9ca3af" }}>
                            PH: {bill.customerPhone}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.customerTypeBadge,
                            backgroundColor: `${custMeta.color}20`,
                            color: custMeta.color,
                            border: `1px solid ${custMeta.color}40`
                          }}
                        >
                          {custMeta.name}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.paymentBadge,
                            backgroundColor: `${payMeta.color}20`,
                            color: payMeta.color,
                            border: `1px solid ${payMeta.color}40`
                          }}
                        >
                          {payMeta.icon}
                          {payMeta.name}
                        </span>
                      </td>
                      <td style={{ ...styles.td, fontWeight: "bold", color: "#10b981", fontSize: "14px" }}>
                        ₹{Number(bill.total).toLocaleString()}
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            style={styles.viewBtn}
                            onClick={() => handleViewBillDetails(bill.id)}
                            title="View Bill Details"
                          >
                            <Eye size={13} /> View
                          </button>
                          <button
                            style={{ ...styles.viewBtn, backgroundColor: "#059669" }}
                            onClick={async () => {
                              try {
                                const res = await api.get(`/billing/bills/${bill.id}`);
                                handlePrintBill(res.data?.bill || res.data || bill);
                              } catch (err) {
                                handlePrintBill(bill);
                              }
                            }}
                            title="Print Bill Receipt"
                          >
                            <Printer size={13} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination Footer ── */}
      {!loading && filteredBills.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBills.length)} of {filteredBills.length} records
          </div>
          <div style={styles.paginationControls}>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.disabledButton : {})
              }}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "13px", color: "#9ca3af", padding: "0 8px" }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.disabledButton : {})
              }}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bill Details View Modal ── */}
      {selectedBill && (
        <div style={styles.modal} onClick={() => setSelectedBill(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setSelectedBill(null)}>
              <X size={18} />
            </button>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", paddingRight: "36px" }}>
              <h3 style={{ ...styles.modalTitle, marginBottom: 0 }}>
                <Receipt size={20} color="#6366f1" />
                Bill Details - #{formatBillNo(selectedBill.billNumber || selectedBill.bill_number)}
              </h3>
              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  border: "none",
                  padding: "7px 14px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)"
                }}
                onClick={() => handlePrintBill(selectedBill)}
                title="Print Bill Receipt"
              >
                <Printer size={15} /> Print Bill
              </button>
            </div>

            {(() => {
              const billTotal = Number(
                selectedBill.summary?.total ??
                selectedBill.total ??
                selectedBill.grandTotal ??
                0
              );
              const billPaid = Number(
                selectedBill.payment?.paidAmount ??
                selectedBill.paidAmount ??
                selectedBill.paid_amount ??
                (selectedBill.payments && selectedBill.payments.length > 0
                  ? selectedBill.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                  : billTotal)
              );
              const billDue = Math.max(0, billTotal - billPaid);

              return (
                <>
                  <div style={styles.modalSection}>
                    <div style={styles.modalGrid}>
                      <div>
                        <p style={styles.modalText}>
                          <strong>Customer:</strong> {selectedBill.customer?.name || selectedBill.customer_name || selectedBill.customerName || "Walk-in Customer"}
                        </p>
                        <p style={styles.modalText}>
                          <strong>Phone:</strong> {selectedBill.customer?.phone || selectedBill.customer_phone || selectedBill.customerPhone || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p style={styles.modalText}>
                          <strong>Date:</strong> {selectedBill.created_at || selectedBill.createdAt ? new Date(selectedBill.created_at || selectedBill.createdAt).toLocaleDateString("en-GB") : "-"}
                        </p>
                        <p style={styles.modalText}>
                          <strong>Payment Method:</strong> {(selectedBill.payment?.method || selectedBill.payment_method || selectedBill.paymentMethod || "Cash").toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <h4 style={{ marginTop: "16px", marginBottom: "10px", color: "#f3f4f6", fontSize: "14px", fontWeight: "600" }}>
                    Purchased Items:
                  </h4>
                  <table style={styles.modalTable}>
                    <thead>
                      <tr>
                        <th style={styles.modalTh}>Item</th>
                        <th style={styles.modalTh}>Qty</th>
                        <th style={styles.modalTh}>Rate</th>
                        <th style={styles.modalTh}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedBill.items || []).map((item, idx) => (
                        <tr key={idx}>
                          <td style={styles.modalTd}>{item.product_name || item.productName || "Product"}</td>
                          <td style={styles.modalTd}>{item.quantity || 1}</td>
                          <td style={styles.modalTd}>₹{item.sell_price || item.sellPrice || item.sellingPrice || 0}</td>
                          <td style={{ ...styles.modalTd, fontWeight: "bold", color: "#10b981" }}>
                            ₹{item.total || (item.sell_price || item.sellPrice || item.sellingPrice || 0) * (item.quantity || 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #374151" }}>
                    <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Total Bill: <strong style={{ color: "#f9fafb" }}>₹{billTotal.toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                      Due / Balance: <strong style={{ color: billDue > 0 ? "#ef4444" : "#10b981" }}>₹{billDue.toLocaleString()}</strong>
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#10b981" }}>
                      Total Paid: ₹{billPaid.toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                    <button
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        backgroundColor: "#059669",
                        color: "#ffffff",
                        border: "none",
                        padding: "9px 18px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)"
                      }}
                      onClick={() => handlePrintBill(selectedBill)}
                    >
                      <Printer size={16} /> Print Bill Receipt
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// Dark Theme Styles matching Bill Reports (VisitPage.jsx)
const styles = {
  container: {
    padding: "24px",
    backgroundColor: "#111827",
    minHeight: "100vh",
    color: "#f9fafb",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
    boxSizing: "border-box"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
    flexWrap: "wrap",
    gap: "16px"
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: "14px"
  },
  headerIconBox: {
    width: "48px",
    height: "48px",
    borderRadius: "10px",
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    fontSize: "24px",
    fontWeight: "700",
    margin: 0,
    color: "#f9fafb"
  },
  subtitle: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: "4px 0 0 0"
  },
  buttonGroup: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  button: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 16px",
    borderRadius: "6px",
    backgroundColor: "#1f2937",
    color: "#f9fafb",
    border: "1px solid #374151",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.2s"
  },
  primaryButton: {
    backgroundColor: "#6366f1",
    color: "#ffffff",
    border: "none"
  },
  successButton: {
    backgroundColor: "#059669",
    color: "#ffffff",
    border: "none"
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px"
  },
  kpiCard: {
    backgroundColor: "#1f2937",
    padding: "18px 20px",
    borderRadius: "10px",
    border: "1px solid #374151"
  },
  kpiHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px"
  },
  kpiLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#9ca3af",
    letterSpacing: "0.5px"
  },
  kpiValue: {
    fontSize: "24px",
    fontWeight: "800",
    margin: "4px 0 2px 0"
  },
  kpiSub: {
    fontSize: "11px",
    color: "#6b7280"
  },
  sectionWrap: {
    backgroundColor: "#1f2937",
    padding: "20px 24px",
    borderRadius: "10px",
    border: "1px solid #374151",
    marginBottom: "24px"
  },
  sectionHeader: {
    margin: "0 0 16px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#f3f4f6",
    display: "flex",
    alignItems: "center"
  },
  fyCardsContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "14px"
  },
  fyCard: {
    backgroundColor: "#111827",
    border: "1px solid #374151",
    borderRadius: "8px",
    padding: "14px 16px",
    cursor: "pointer",
    transition: "all 0.2s ease"
  },
  fyCardActive: {
    borderColor: "#6366f1",
    boxShadow: "0 0 15px rgba(99, 102, 241, 0.3)",
    backgroundColor: "#1e1b4b"
  },
  fyCardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px"
  },
  fyBadge: {
    backgroundColor: "#6366f1",
    color: "#ffffff",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "700"
  },
  fyBillCount: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#9ca3af"
  },
  fyMetricRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "12px",
    marginBottom: "4px"
  },
  fyMetricLabel: {
    color: "#9ca3af"
  },
  fyMetricVal: {
    fontWeight: "600"
  },
  filterBar: {
    backgroundColor: "#1f2937",
    padding: "16px 20px",
    borderRadius: "10px",
    border: "1px solid #374151",
    marginBottom: "24px",
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    alignItems: "center"
  },
  searchBox: {
    position: "relative",
    flex: 1,
    minWidth: "260px"
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#6b7280"
  },
  searchInput: {
    width: "100%",
    padding: "9px 12px 9px 38px",
    backgroundColor: "#111827",
    border: "1px solid #374151",
    color: "#ffffff",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box"
  },
  filterSelect: {
    padding: "9px 12px",
    backgroundColor: "#111827",
    border: "1px solid #374151",
    color: "#ffffff",
    borderRadius: "6px",
    fontSize: "13px",
    outline: "none",
    cursor: "pointer"
  },
  clearFilterButton: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 14px",
    backgroundColor: "#111827",
    border: "1px solid #374151",
    color: "#9ca3af",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500"
  },
  tableContainer: {
    backgroundColor: "#1f2937",
    borderRadius: "10px",
    border: "1px solid #374151",
    padding: "20px"
  },
  tableHeaderRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  tableTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "700",
    color: "#f3f4f6",
    display: "flex",
    alignItems: "center"
  },
  recordCountBadge: {
    backgroundColor: "#111827",
    color: "#9ca3af",
    padding: "4px 10px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    border: "1px solid #374151"
  },
  loadingSpinner: {
    textAlign: "center",
    padding: "40px",
    color: "#9ca3af",
    fontWeight: "600"
  },
  noData: {
    textAlign: "center",
    padding: "40px",
    color: "#6b7280",
    fontSize: "14px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    backgroundColor: "#374151",
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "12px",
    fontWeight: "600",
    color: "#f3f4f6",
    borderBottom: "1px solid #4b5563",
    textTransform: "uppercase",
    letterSpacing: "0.5px"
  },
  tr: {
    borderBottom: "1px solid #374151"
  },
  td: {
    padding: "12px 14px",
    fontSize: "13px",
    color: "#f9fafb"
  },
  fyBadgeTag: {
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    padding: "3px 8px",
    borderRadius: "6px",
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid rgba(56, 189, 248, 0.3)"
  },
  paymentBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  },
  customerTypeBadge: {
    padding: "4px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "600",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px"
  },
  viewBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    backgroundColor: "#6366f1",
    color: "#ffffff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  pagination: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "20px",
    padding: "10px 0"
  },
  paginationInfo: {
    color: "#9ca3af",
    fontSize: "13px"
  },
  paginationControls: {
    display: "flex",
    gap: "8px",
    alignItems: "center"
  },
  pageButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 10px",
    backgroundColor: "#1f2937",
    border: "1px solid #374151",
    color: "#f9fafb",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.2s"
  },
  disabledButton: {
    opacity: 0.4,
    cursor: "not-allowed"
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    backdropFilter: "blur(4px)"
  },
  modalContent: {
    backgroundColor: "#1f2937",
    padding: "26px",
    borderRadius: "12px",
    maxWidth: "650px",
    width: "95%",
    maxHeight: "85vh",
    overflow: "auto",
    position: "relative",
    border: "1px solid #374151",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)"
  },
  modalClose: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px"
  },
  modalTitle: {
    fontSize: "20px",
    fontWeight: "600",
    color: "#f9fafb",
    marginBottom: "18px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  modalSection: {
    marginBottom: "18px",
    padding: "14px",
    backgroundColor: "#111827",
    borderRadius: "8px",
    border: "1px solid #374151"
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px"
  },
  modalText: {
    color: "#d1d5db",
    fontSize: "13px",
    margin: "0 0 6px 0"
  },
  modalTable: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "16px"
  },
  modalTh: {
    backgroundColor: "#374151",
    padding: "10px 12px",
    textAlign: "left",
    color: "#f3f4f6",
    fontWeight: "600",
    fontSize: "12px"
  },
  modalTd: {
    padding: "10px 12px",
    borderBottom: "1px solid #374151",
    color: "#f9fafb",
    fontSize: "13px"
  }
};

export default LedgerBook;
