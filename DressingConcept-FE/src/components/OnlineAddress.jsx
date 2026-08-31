import React, { useState, useEffect, useRef } from "react";
import {
  FaShippingFast,
  FaPrint,
  FaCopy,
  FaSave,
  FaTrash,
  FaUndo,
  FaSearch,
  FaCheck,
  FaUser,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaBarcode,
  FaHistory,
  FaEdit,
  FaFileAlt,
  FaPlus,
  FaDownload,
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

const DEFAULT_FROM = {
  name: "DRESSING CONCEPTS",
  address: "88/70 SRP KOVIL STREET,\nAgaram\nChennai",
  pincode: "600082",
  phone: "9884858576",
};

const STORAGE_KEY_FROM = "online_address_from_config";
const STORAGE_KEY_HISTORY = "online_address_history_list";

const OnlineAddress = () => {
  // Load saved default From or fallback to standard default
  const [fromData, setFromData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FROM);
      return saved ? JSON.parse(saved) : DEFAULT_FROM;
    } catch {
      return DEFAULT_FROM;
    }
  });

  const [toData, setToData] = useState({
    orderNo: "",
    name: "",
    address: "",
    pincode: "",
    phone: "",
    notes: "",
  });

  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [fromEditMode, setFromEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [labelSize, setLabelSize] = useState("standard"); // standard, thermal, compact

  const printAreaRef = useRef(null);

  // Fetch customer suggestions if available
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get("/customers");
        if (res.data) {
          const list = Array.isArray(res.data)
            ? res.data
            : res.data.customers || [];
          setCustomers(list);
        }
      } catch (err) {
        // Fallback silently if API not reachable
      }
    };
    fetchCustomers();
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch (err) {
      console.error("Failed to save history", err);
    }
  }, [history]);

  // Handle saving customized From address as new default
  const handleSaveFromAsDefault = () => {
    try {
      localStorage.setItem(STORAGE_KEY_FROM, JSON.stringify(fromData));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setFromEditMode(false);
    } catch (err) {
      alert("Failed to save default sender address");
    }
  };

  // Handle resetting From address back to original default
  const handleResetFromToDefault = () => {
    setFromData(DEFAULT_FROM);
    try {
      localStorage.setItem(STORAGE_KEY_FROM, JSON.stringify(DEFAULT_FROM));
    } catch (err) { }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Generate plain text exact format
  const generateFormattedText = () => {
    const fromAddr = fromData.address ? fromData.address.trim() : "";
    const toAddr = toData.address ? toData.address.trim() : "";

    return `ORDER NO. ${toData.orderNo || ""}

From
NAME   ${fromData.name || ""}
ADDRESS :${fromAddr}
PINCODE : ${fromData.pincode || ""}
Phone No : ${fromData.phone || ""}

To
NAME   ${toData.name || ""}
ADDRESS :${toAddr}
PINCODE : ${toData.pincode || ""}
Phone No : ${toData.phone || ""}`;
  };

  // Copy to clipboard
  const handleCopyToClipboard = async () => {
    try {
      const text = generateFormattedText();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = generateFormattedText();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Save current slip into history
  const handleSaveSlip = () => {
    if (!toData.orderNo && !toData.name && !toData.phone) {
      alert("Please enter at least an Order No, Customer Name, or Phone Number.");
      return;
    }

    const newRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      orderNo: toData.orderNo || "N/A",
      toName: toData.name,
      toAddress: toData.address,
      toPincode: toData.pincode,
      toPhone: toData.phone,
      fromName: fromData.name,
      fromAddress: fromData.address,
      fromPincode: fromData.pincode,
      fromPhone: fromData.phone,
      notes: toData.notes,
    };

    setHistory((prev) => [newRecord, ...prev.filter((item) => item.orderNo !== toData.orderNo || toData.orderNo === "N/A")]);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Load record from history
  const handleLoadRecord = (record) => {
    setToData({
      orderNo: record.orderNo !== "N/A" ? record.orderNo : "",
      name: record.toName || "",
      address: record.toAddress || "",
      pincode: record.toPincode || "",
      phone: record.toPhone || "",
      notes: record.notes || "",
    });
    if (record.fromName) {
      setFromData({
        name: record.fromName,
        address: record.fromAddress,
        pincode: record.fromPincode,
        phone: record.fromPhone,
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete history item
  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this label from history?")) {
      setHistory((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Clear To inputs for new order
  const handleClearToForm = () => {
    setToData({
      orderNo: "",
      name: "",
      address: "",
      pincode: "",
      phone: "",
      notes: "",
    });
  };

  // Select customer from CRM suggestion
  const handleSelectCustomer = (c) => {
    const fullName = `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.customerName || "";
    setToData((prev) => ({
      ...prev,
      name: fullName,
      phone: c.customerPhone || c.phone || prev.phone,
      address: c.customerAddress || c.address || prev.address,
      pincode: c.pincode || prev.pincode,
    }));
    setShowCustomerDropdown(false);
  };

  const filteredHistory = history.filter((item) => {
    const query = searchTerm.toLowerCase();
    return (
      (item.orderNo && item.orderNo.toLowerCase().includes(query)) ||
      (item.toName && item.toName.toLowerCase().includes(query)) ||
      (item.toPhone && item.toPhone.includes(query)) ||
      (item.toPincode && item.toPincode.includes(query))
    );
  });

  return (
    <div className="online-address-container" style={styles.container}>
      {/* Dynamic Print Stylesheet */}
      <style>{`
        @page {
          size: auto;
          margin: 0mm;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .online-address-container {
            padding: 0 !important;
            margin: 0 !important;
            min-height: 0 !important;
            height: auto !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden !important;
          }
          #print-slip-area, #print-slip-area * {
            visibility: visible !important;
          }
          #print-slip-area {
            position: absolute !important;
            left: 24px !important;
            top: 24px !important;
            width: 440px !important;
            max-width: 440px !important;
            margin: 0 !important;
            padding: 20px 24px !important;
            background: #ffffff !important;
            color: #000000 !important;
            border: 2px solid #000000 !important;
            border-radius: 6px !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            break-inside: avoid !important;
            break-after: avoid !important;
          }
        }
      `}</style>

      {/* Header Banner */}
      <div style={styles.headerBanner} className="no-print">
        <div>
          <div style={styles.headerTitleRow}>
            <div style={styles.iconBadge}>
              <FaShippingFast style={{ fontSize: "22px", color: "#38bdf8" }} />
            </div>
            <div>
              <h1 style={styles.title}>Online Address & Shipping Label</h1>
              <p style={styles.subtitle}>
                Generate, format, print, and copy parcel delivery address slips
              </p>
            </div>
          </div>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={handleCopyToClipboard}
            style={{
              ...styles.btnSecondary,
              backgroundColor: copied ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.08)",
              borderColor: copied ? "#10b981" : "rgba(255,255,255,0.18)",
              color: copied ? "#34d399" : "#f1f5f9",
            }}
            title="Copy exact text format to clipboard"
          >
            {copied ? <FaCheck /> : <FaCopy />}
            <span>{copied ? "Copied!" : "Copy Text"}</span>
          </button>

          <button
            onClick={handleSaveSlip}
            style={styles.btnSecondary}
            title="Save to recent labels history"
          >
            <FaSave />
            <span>Save Label</span>
          </button>

          <button
            onClick={handlePrint}
            style={styles.btnPrint}
            title="Print this address slip"
          >
            <FaPrint />
            <span>Print Slip</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div style={styles.alertSuccess} className="no-print">
          <FaCheck style={{ marginRight: "8px" }} />
          Address details updated successfully!
        </div>
      )}

      {/* Main Grid: Input Form + Live Preview */}
      <div style={styles.gridContainer}>
        {/* Left Column: Form Controls */}
        <div style={styles.formCard} className="no-print">
          {/* Order Number Header */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionBadge}>
                <FaBarcode />
              </div>
              <h3 style={styles.sectionTitle}>Order Information</h3>
              <button
                type="button"
                onClick={handleClearToForm}
                style={styles.btnGhostSm}
                title="Clear To form inputs"
              >
                <FaPlus style={{ fontSize: "11px" }} /> New Order
              </button>
            </div>

            <div style={{ marginTop: "12px" }}>
              <label style={styles.label}>
                ORDER NO. <span style={styles.required}>*</span>
              </label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  placeholder="e.g. DC-10492 or 10492"
                  value={toData.orderNo}
                  onChange={(e) => setToData({ ...toData, orderNo: e.target.value })}
                  style={styles.inputHighlight}
                />
              </div>
            </div>
          </div>

          {/* SENDER (FROM) SECTION */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionBadge, backgroundColor: "rgba(59, 130, 246, 0.2)", color: "#60a5fa" }}>
                <FaMapMarkerAlt />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={styles.sectionTitle}>
                  From Section{" "}
                  <span style={styles.tagDefault}>Default Sender (Changeable)</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFromEditMode(!fromEditMode)}
                style={{
                  ...styles.btnGhostSm,
                  color: fromEditMode ? "#38bdf8" : "#94a3b8",
                  borderColor: fromEditMode ? "#38bdf8" : "rgba(255,255,255,0.15)",
                }}
              >
                <FaEdit /> {fromEditMode ? "Close Edit" : "Edit Sender"}
              </button>
            </div>

            {fromEditMode ? (
              <div style={styles.editFromBox}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Sender Name (NAME)</label>
                    <input
                      type="text"
                      value={fromData.name}
                      onChange={(e) => setFromData({ ...fromData, name: e.target.value })}
                      style={styles.input}
                      placeholder="DRESSING CONCEPTS"
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone No (Phone No)</label>
                    <input
                      type="text"
                      value={fromData.phone}
                      onChange={(e) => setFromData({ ...fromData, phone: e.target.value })}
                      style={styles.input}
                      placeholder="9884858576"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Sender Address (ADDRESS)</label>
                  <textarea
                    rows={3}
                    value={fromData.address}
                    onChange={(e) => setFromData({ ...fromData, address: e.target.value })}
                    style={styles.textarea}
                    placeholder="88/70 SRP KOVIL STREET,&#10;Agaram&#10;Chennai"
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Pincode (PINCODE)</label>
                    <input
                      type="text"
                      value={fromData.pincode}
                      onChange={(e) => setFromData({ ...fromData, pincode: e.target.value })}
                      style={styles.input}
                      placeholder="600082"
                    />
                  </div>
                </div>

                <div style={styles.fromActionRow}>
                  <button
                    type="button"
                    onClick={handleSaveFromAsDefault}
                    style={styles.btnPrimarySm}
                  >
                    <FaSave /> Save as Default Sender
                  </button>
                  <button
                    type="button"
                    onClick={handleResetFromToDefault}
                    style={styles.btnDangerSm}
                  >
                    <FaUndo /> Reset to Factory Default
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.senderSummaryBox}>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryKey}>NAME:</span>
                  <span style={styles.summaryVal}>{fromData.name}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryKey}>ADDRESS:</span>
                  <span style={{ ...styles.summaryVal, whiteSpace: "pre-line" }}>
                    {fromData.address}
                  </span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryKey}>PINCODE:</span>
                  <span style={styles.summaryVal}>{fromData.pincode}</span>
                </div>
                <div style={styles.summaryItem}>
                  <span style={styles.summaryKey}>Phone No:</span>
                  <span style={styles.summaryVal}>{fromData.phone}</span>
                </div>
              </div>
            )}
          </div>

          {/* RECEIVER (TO) SECTION */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <div style={{ ...styles.sectionBadge, backgroundColor: "rgba(16, 185, 129, 0.2)", color: "#34d399" }}>
                <FaUser />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={styles.sectionTitle}>
                  To Section{" "}
                  <span style={{ ...styles.tagDefault, backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                    Customer / Manual Entry
                  </span>
                </h3>
              </div>

              {customers.length > 0 && (
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    style={styles.btnGhostSm}
                    title="Fill from CRM Customer database"
                  >
                    <FaSearch /> Load CRM Customer
                  </button>

                  {showCustomerDropdown && (
                    <div style={styles.dropdownMenu}>
                      <div style={styles.dropdownHeader}>Select Customer</div>
                      <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                        {customers.slice(0, 15).map((c, idx) => (
                          <div
                            key={c.id || idx}
                            onClick={() => handleSelectCustomer(c)}
                            style={styles.dropdownItem}
                          >
                            <div style={{ fontWeight: "600", color: "#f8fafc" }}>
                              {c.firstName ? `${c.firstName} ${c.lastName || ""}` : c.customerName || "Customer"}
                            </div>
                            <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                              {c.customerPhone || c.phone || "No phone"} • {c.customerAddress || c.city || "No address"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Customer Name (NAME) <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={toData.name}
                  onChange={(e) => setToData({ ...toData, name: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. John Doe / Karthik"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Phone No (Phone No) <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={toData.phone}
                  onChange={(e) => setToData({ ...toData, phone: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. 9876543210"
                />
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>
                Delivery Address (ADDRESS) <span style={styles.required}>*</span>
              </label>
              <textarea
                rows={3}
                value={toData.address}
                onChange={(e) => setToData({ ...toData, address: e.target.value })}
                style={styles.textarea}
                placeholder="Door No, Street Name,&#10;Area / Landmark,&#10;City, State"
              />
            </div>

            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Pincode (PINCODE) <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={toData.pincode}
                  onChange={(e) => setToData({ ...toData, pincode: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. 600001"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Courier Notes / Parcel Item (Optional)</label>
                <input
                  type="text"
                  value={toData.notes}
                  onChange={(e) => setToData({ ...toData, notes: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. Shirt x 2 / Fragile / ST Courier"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Preview & Label Card */}
        <div style={styles.previewCard}>
          <div style={styles.previewHeader} className="no-print">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ ...styles.sectionBadge, backgroundColor: "rgba(245, 158, 11, 0.2)", color: "#fbbf24" }}>
                <FaFileAlt />
              </div>
              <h3 style={styles.sectionTitle}>Live Shipping Label Preview</h3>
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setLabelSize("standard")}
                style={{
                  ...styles.sizeBtn,
                  backgroundColor: labelSize === "standard" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                  color: labelSize === "standard" ? "#fff" : "#94a3b8",
                }}
              >
                Standard Slip
              </button>
              <button
                type="button"
                onClick={() => setLabelSize("thermal")}
                style={{
                  ...styles.sizeBtn,
                  backgroundColor: labelSize === "thermal" ? "#3b82f6" : "rgba(255,255,255,0.06)",
                  color: labelSize === "thermal" ? "#fff" : "#94a3b8",
                }}
              >
                Thermal Sticker
              </button>
            </div>
          </div>

          {/* PRINTABLE SLIP CONTAINER */}
          <div
            id="print-slip-area"
            ref={printAreaRef}
            style={{
              ...styles.slipContainer,
              maxWidth: labelSize === "thermal" ? "380px" : "480px",
              padding: labelSize === "thermal" ? "16px" : "24px",
            }}
          >
            {/* ORDER NO HEADER */}
            <div style={styles.slipOrderHeader}>
              <div style={styles.slipOrderTitle}>
                ORDER NO. <span style={styles.slipOrderNumber}>{toData.orderNo || "______________"}</span>
              </div>
              {toData.notes && (
                <div style={styles.slipNotesBadge}>
                  {toData.notes}
                </div>
              )}
            </div>

            <div style={styles.slipDivider} />

            {/* FROM SECTION */}
            <div style={styles.slipSection}>
              <div style={styles.slipHeading}>From,</div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>NAME</span>
                <span style={styles.slipValueBold}>{fromData.name || "DRESSING CONCEPTS"}</span>
              </div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>ADDRESS :</span>
                <span style={{ ...styles.slipValue, whiteSpace: "pre-line" }}>
                  {fromData.address || "88/70 SRP KOVIL STREET,\nAgaram\nChennai"}
                </span>
              </div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>PINCODE :</span>
                <span style={styles.slipValueBold}>{fromData.pincode || "600082"}</span>
              </div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>Phone No :</span>
                <span style={styles.slipValueBold}>{fromData.phone || "9884858576"}</span>
              </div>
            </div>

            <div style={styles.slipDividerDotted} />

            {/* TO SECTION */}
            <div style={styles.slipSection}>
              <div style={styles.slipHeading}>To</div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>NAME</span>
                <span style={styles.slipValueBold}>
                  {toData.name || "_________________________________"}
                </span>
              </div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>ADDRESS :</span>
                <span style={{ ...styles.slipValue, whiteSpace: "pre-line", minHeight: "36px" }}>
                  {toData.address || "_________________________________\n_________________________________"}
                </span>
              </div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>PINCODE :</span>
                <span style={styles.slipValueBold}>
                  {toData.pincode || "_________"}
                </span>
              </div>
              <div style={styles.slipRow}>
                <span style={styles.slipLabel}>Phone No :</span>
                <span style={styles.slipValueBold}>
                  {toData.phone || "_______________"}
                </span>
              </div>
            </div>

            {/* Slip Footer Watermark */}
            <div style={styles.slipFooter}>
              <span>ONLINE DELIVERY PARCEL</span>
              <span>DRESSING CONCEPTS</span>
            </div>
          </div>

          {/* Quick Raw Text Box with Copy */}
          <div style={styles.rawTextBox} className="no-print">
            <div style={styles.rawTextHeader}>
              <span style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8" }}>
                Formatted Raw Text (Ready to send)
              </span>
              <button
                type="button"
                onClick={handleCopyToClipboard}
                style={styles.btnGhostSm}
              >
                {copied ? <FaCheck style={{ color: "#34d399" }} /> : <FaCopy />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>
            <pre style={styles.rawPre}>{generateFormattedText()}</pre>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Saved Shipping Labels History */}
      <div style={styles.historyCard} className="no-print">
        <div style={styles.historyHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ ...styles.sectionBadge, backgroundColor: "rgba(99, 102, 241, 0.2)", color: "#a5b4fc" }}>
              <FaHistory />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Recent Online Address Labels ({history.length})</h3>
              <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
                Click any row to load into editor or reprint label
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <div style={styles.searchWrapper}>
              <FaSearch style={{ color: "#64748b", fontSize: "13px" }} />
              <input
                type="text"
                placeholder="Search order no, customer, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div style={styles.emptyHistory}>
            <FaShippingFast style={{ fontSize: "36px", color: "#334155", marginBottom: "10px" }} />
            <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>
              {searchTerm ? "No labels found matching your search." : "No saved shipping labels yet. Enter details above and click 'Save Label'."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Order No</th>
                  <th style={styles.th}>Customer Name</th>
                  <th style={styles.th}>Phone</th>
                  <th style={styles.th}>Delivery City / Address</th>
                  <th style={styles.th}>Pincode</th>
                  <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleLoadRecord(item)}
                    style={styles.tr}
                  >
                    <td style={styles.td}>
                      {new Date(item.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td style={{ ...styles.td, fontWeight: "700", color: "#38bdf8" }}>
                      {item.orderNo}
                    </td>
                    <td style={{ ...styles.td, fontWeight: "600", color: "#f8fafc" }}>
                      {item.toName || "—"}
                    </td>
                    <td style={styles.td}>{item.toPhone || "—"}</td>
                    <td style={{ ...styles.td, maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.toAddress || "—"}
                    </td>
                    <td style={{ ...styles.td, fontWeight: "600" }}>{item.toPincode || "—"}</td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadRecord(item);
                          }}
                          style={styles.actionBtn}
                          title="Load into form"
                        >
                          <FaEdit />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoadRecord(item);
                            setTimeout(() => window.print(), 100);
                          }}
                          style={{ ...styles.actionBtn, color: "#38bdf8" }}
                          title="Quick Print"
                        >
                          <FaPrint />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          style={{ ...styles.actionBtn, color: "#f87171" }}
                          title="Delete from history"
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
  );
};

const styles = {
  container: {
    padding: "16px 20px 40px",
    color: "#f8fafc",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  headerBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))",
    padding: "18px 24px",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)",
    marginBottom: "20px",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
  },
  iconBadge: {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#ffffff",
    margin: 0,
    letterSpacing: "-0.5px",
  },
  subtitle: {
    fontSize: "13px",
    color: "#94a3b8",
    margin: "4px 0 0",
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  btnPrimary: {
    padding: "10px 18px",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    border: "none",
    borderRadius: "10px",
    color: "#ffffff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.35)",
    transition: "all 0.2s ease",
  },
  btnPrint: {
    padding: "10px 20px",
    background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
    border: "none",
    borderRadius: "10px",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "14px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 14px rgba(14, 165, 233, 0.4)",
    transition: "all 0.2s ease",
  },
  btnSecondary: {
    padding: "10px 16px",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
    borderRadius: "10px",
    color: "#f1f5f9",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    transition: "all 0.2s ease",
  },
  btnGhostSm: {
    padding: "6px 12px",
    background: "rgba(255, 255, 255, 0.06)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    color: "#cbd5e1",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease",
  },
  btnPrimarySm: {
    padding: "6px 12px",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  btnDangerSm: {
    padding: "6px 12px",
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    borderRadius: "8px",
    color: "#f87171",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  alertSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.4)",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#34d399",
    fontSize: "14px",
    fontWeight: "500",
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
    gap: "20px",
    marginBottom: "24px",
  },
  formCard: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  sectionCard: {
    backgroundColor: "#1e293b",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "18px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  sectionBadge: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#f1f5f9",
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  tagDefault: {
    fontSize: "11px",
    fontWeight: "500",
    padding: "2px 8px",
    borderRadius: "6px",
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    color: "#93c5fd",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "12px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    marginBottom: "12px",
  },
  label: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  required: {
    color: "#ef4444",
  },
  input: {
    padding: "10px 14px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  },
  inputHighlight: {
    padding: "12px 14px",
    background: "rgba(15, 23, 42, 0.9)",
    border: "2px solid #38bdf8",
    borderRadius: "10px",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "700",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    letterSpacing: "0.5px",
  },
  textarea: {
    padding: "10px 14px",
    background: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    color: "#ffffff",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: "vertical",
  },
  senderSummaryBox: {
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "12px 14px",
    fontSize: "13px",
  },
  summaryItem: {
    display: "flex",
    gap: "10px",
    marginBottom: "6px",
  },
  summaryKey: {
    width: "80px",
    color: "#94a3b8",
    fontWeight: "600",
  },
  summaryVal: {
    color: "#f8fafc",
    fontWeight: "500",
    flex: 1,
  },
  editFromBox: {
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: "8px",
    border: "1px solid rgba(56, 189, 248, 0.2)",
    padding: "14px",
  },
  fromActionRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginTop: "8px",
    flexWrap: "wrap",
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    top: "100%",
    zIndex: 50,
    width: "280px",
    backgroundColor: "#1e293b",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    borderRadius: "8px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
    marginTop: "6px",
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "8px 12px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#94a3b8",
    backgroundColor: "rgba(0,0,0,0.2)",
    textTransform: "uppercase",
  },
  dropdownItem: {
    padding: "10px 12px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    transition: "background 0.15s",
  },
  previewCard: {
    backgroundColor: "#1e293b",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  previewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  sizeBtn: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.15)",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  // REALISTIC SHIPPING SLIP CONTAINER (PRINT READY)
  slipContainer: {
    backgroundColor: "#ffffff",
    color: "#000000",
    borderRadius: "8px",
    border: "2px solid #000000",
    boxShadow: "0 8px 30px rgba(0, 0, 0, 0.35)",
    fontFamily: "'Courier New', Courier, monospace",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  slipOrderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  slipOrderTitle: {
    fontSize: "16px",
    fontWeight: "900",
    color: "#000000",
    letterSpacing: "0.5px",
  },
  slipOrderNumber: {
    fontSize: "18px",
    fontWeight: "900",
    textDecoration: "underline",
    color: "#000000",
  },
  slipNotesBadge: {
    fontSize: "11px",
    fontWeight: "700",
    border: "1px solid #000",
    padding: "2px 6px",
    borderRadius: "4px",
  },
  slipDivider: {
    height: "2px",
    backgroundColor: "#000000",
    margin: "8px 0 14px 0",
  },
  slipDividerDotted: {
    borderTop: "2px dashed #000000",
    margin: "16px 0",
  },
  slipSection: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  slipHeading: {
    fontSize: "15px",
    fontWeight: "900",
    textDecoration: "underline",
    marginBottom: "4px",
    color: "#000000",
  },
  slipRow: {
    display: "flex",
    alignItems: "flex-start",
    fontSize: "13px",
    lineHeight: "1.4",
  },
  slipLabel: {
    width: "110px",
    fontWeight: "900",
    color: "#000000",
    flexShrink: 0,
  },
  slipValue: {
    color: "#111111",
    fontWeight: "600",
    flex: 1,
    wordBreak: "break-word",
  },
  slipValueBold: {
    color: "#000000",
    fontWeight: "900",
    flex: 1,
    wordBreak: "break-word",
  },
  slipFooter: {
    borderTop: "1px solid #777",
    marginTop: "16px",
    paddingTop: "8px",
    display: "flex",
    justifyContent: "space-between",
    fontSize: "10px",
    fontWeight: "700",
    color: "#444",
  },
  rawTextBox: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "12px",
  },
  rawTextHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px",
  },
  rawPre: {
    fontSize: "12px",
    fontFamily: "monospace",
    color: "#38bdf8",
    margin: 0,
    whiteSpace: "pre-wrap",
    lineHeight: "1.5",
    background: "#0b0f19",
    padding: "10px",
    borderRadius: "6px",
    maxHeight: "180px",
    overflowY: "auto",
  },
  historyCard: {
    backgroundColor: "#1e293b",
    borderRadius: "14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "18px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px",
  },
  searchWrapper: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "8px",
    padding: "8px 12px",
  },
  searchInput: {
    background: "transparent",
    border: "none",
    color: "#ffffff",
    fontSize: "13px",
    outline: "none",
    width: "240px",
  },
  emptyHistory: {
    textAlign: "center",
    padding: "36px 16px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
  },
  th: {
    textAlign: "left",
    padding: "10px 14px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
    color: "#94a3b8",
    fontWeight: "600",
    textTransform: "uppercase",
    fontSize: "11px",
    letterSpacing: "0.5px",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "12px 14px",
    color: "#cbd5e1",
  },
  actionBtn: {
    padding: "6px 8px",
    background: "rgba(255, 255, 255, 0.08)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "6px",
    color: "#e2e8f0",
    cursor: "pointer",
    fontSize: "12px",
  },
};

export default OnlineAddress;
