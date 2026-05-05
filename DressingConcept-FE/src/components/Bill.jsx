import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";
const TAX_PERCENT = 5;
const DEFAULT_UNIT = "PCS";

const pad = (value) => String(value).padStart(2, "0");

const formatDate = (date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad(date.getDate())}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

const formatDateTime = (date) => {
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${formatDate(date)} ${hours}:${minutes}:${seconds}`;
};

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const blankRows = Array.from({ length: 8 }, (_, index) => index);

export default function Bill() {
  const loggedInUserName = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.full_name || user.username || user.name || user.email || "Admin";
    } catch (err) {
      return "Admin";
    }
  }, []);

  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState([{
    productId: "",
    description: "",
    size: "",
    tax: TAX_PERCENT,
    unit: DEFAULT_UNIT,
    mrp: 0,
    unitPrice: 0,
    discountPercent: 0,
    netPrice: 0,
    quantity: 1,
    salesPerson: loggedInUserName,
  }]);
  const [billNo, setBillNo] = useState("");
  const [counter, setCounter] = useState("counter_1");
  const [customerName, setCustomerName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [salesPerson, setSalesPerson] = useState("");
  const [address, setAddress] = useState("");
  const [saleReturn, setSaleReturn] = useState(false);
  const [cardBill, setCardBill] = useState(false);
  const [noRewards, setNoRewards] = useState(false);
  const [classicCustomer, setClassicCustomer] = useState(false);
  const [cashReceived, setCashReceived] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [paidBefore, setPaidBefore] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [quickProductQuery, setQuickProductQuery] = useState("");
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [availablePoints, setAvailablePoints] = useState(0);

  // Refs for focusing inputs
  const productInputRef = useRef(null);
  const customerNameRef = useRef(null);
  const mobileRef = useRef(null);
  const memberIdRef = useRef(null);
  const salesPersonRef = useRef(null);
  const cashReceivedRef = useRef(null);
  const upiAmountRef = useRef(null);
  const cardAmountRef = useRef(null);
  const discountPercentRef = useRef(null);
  const discountAmountRef = useRef(null);
  const quickAddInputRef = useRef(null);
  const mobileContainerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setBillNo(String(Math.floor(100 + Math.random() * 900)));
    loadProducts();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (!message && !error) return undefined;
    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, error]);

  // Close mobile suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileContainerRef.current && !mobileContainerRef.current.contains(event.target)) {
        setShowMobileSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper to show temporary messages
  const showTempMessage = (type, text) => {
    if (type === "success") setMessage(text);
    else setError(text);
  };

  // Filter mobile suggestions based on input
  const filterMobileSuggestions = (input) => {
    if (!input || input.length < 2) {
      setMobileSuggestions([]);
      setShowMobileSuggestions(false);
      return;
    }

    const filtered = customers
      .filter(customer =>
        customer.phone &&
        customer.phone.toString().includes(input.toString())
      )
      .slice(0, 8); // Show top 8 matches
    setMobileSuggestions(filtered);
    setShowMobileSuggestions(filtered.length > 0);
  };

  // Handle mobile number change with suggestions
  const handleMobileChangeWithSuggestions = (value) => {
    setMobileNumber(value);
    filterMobileSuggestions(value);

    if (value.length >= 10) {
      fetchCustomerDetails(value);
    } else if (value.length < 10) {
      setAvailablePoints(0);
      if (value.length === 0) {
        setCustomerName("");
        setAddress("");
      }
    }
  };

  // Select suggestion
  const selectMobileSuggestion = (customer) => {
    setMobileNumber(customer.phone);
    setCustomerName(customer.name || "");
    setAddress(customer.address || "");
    setAvailablePoints(customer.reward_points || 0);
    setShowMobileSuggestions(false);
    // Move focus to next field after selection
    salesPersonRef.current?.focus();
  };

  // Fetch customer details from API
  const fetchCustomerDetails = async (value) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/billing/customer/${value}`);
      if (response.data?.exists) {
        const cust = response.data.customer;
        if (cust.name && cust.name !== 'Walk-in Customer') setCustomerName(cust.name);
        if (cust.address) setAddress(cust.address);
        setAvailablePoints(cust.reward_points || 0);
      } else {
        setAvailablePoints(0);
        // Don't clear customer name if user manually entered
        if (!customerName || customerName === 'Walk-in Customer') {
          setCustomerName("");
        }
      }
    } catch (err) {
      console.error("Could not fetch customer details", err);
      setAvailablePoints(0);
    }
  };

  // Keyboard Shortcuts Handler with alternatives
  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      // F2 OR Ctrl+Shift+P - Focus Product Search
      if (event.key === 'F2' || (event.ctrlKey && event.shiftKey && event.key === 'P')) {
        event.preventDefault();
        const lastRowInput = document.querySelector('.sale-grid tbody tr:last-child input');
        lastRowInput?.focus();
        showTempMessage("success", "⌨️ Product entry focused");
        return;
      }

      // F3 OR Ctrl+Shift+E - Focus Customer Name
      if (event.key === 'F3' || (event.ctrlKey && event.shiftKey && event.key === 'E')) {
        event.preventDefault();
        customerNameRef.current?.focus();
        showTempMessage("success", "⌨️ Customer name focused");
        return;
      }

      // F4 OR Ctrl+Shift+P - Focus Mobile Number
      if (event.key === 'F4' || (event.ctrlKey && event.shiftKey && event.key === 'P')) {
        event.preventDefault();
        mobileRef.current?.focus();
        showTempMessage("success", "⌨️ Mobile number focused");
        return;
      }

      // F5 OR Ctrl+Shift+S - Focus Sales Person
      if (event.key === 'F5' || (event.ctrlKey && event.shiftKey && event.key === 'S')) {
        event.preventDefault();
        salesPersonRef.current?.focus();
        showTempMessage("success", "⌨️ Sales person focused");
        return;
      }

      // F6 OR Ctrl+Shift+R - Focus Cash Received
      if (event.key === 'F6' || (event.ctrlKey && event.shiftKey && event.key === 'R')) {
        event.preventDefault();
        cashReceivedRef.current?.focus();
        showTempMessage("success", "⌨️ Cash received focused");
        return;
      }

      // F7 OR Ctrl+Shift+I - Focus Member ID
      if (event.key === 'F7' || (event.ctrlKey && event.shiftKey && event.key === 'I')) {
        event.preventDefault();
        memberIdRef.current?.focus();
        showTempMessage("success", "⌨️ Member ID focused");
        return;
      }

      // Ctrl+Shift+A - Add New Product (Alternative for Insert)
      if ((event.ctrlKey && event.shiftKey && event.key === 'A') || event.key === 'Insert') {
        event.preventDefault();
        if (!isTyping) {
          quickAddInputRef.current?.focus();
          showTempMessage("success", "⌨️ Ready to add new product");
        }
        return;
      }

      // Ctrl+Enter - Add current quick product
      if ((event.ctrlKey && event.key === 'Enter') && quickProductQuery.trim()) {
        event.preventDefault();
        addByQuery(quickProductQuery);
        setQuickProductQuery("");
        quickAddInputRef.current?.focus();
        showTempMessage("success", "⌨️ Product added");
        return;
      }

      // Ctrl+S - Save Bill
      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S') && !event.shiftKey) {
        event.preventDefault();
        if (!isTyping && rows.length > 0) {
          saveBill();
          showTempMessage("success", "⌨️ Saving bill (Ctrl+S)");
        } else if (rows.length === 0) {
          setError("Add products before saving");
        }
        return;
      }

      // Ctrl+P - Print Bill
      if ((event.ctrlKey || event.metaKey) && (event.key === 'p' || event.key === 'P') && !event.shiftKey) {
        event.preventDefault();
        if (!isTyping && rows.length > 0) {
          printBill();
          showTempMessage("success", "⌨️ Printing bill (Ctrl+P)");
        } else if (rows.length === 0) {
          setError("Add products before printing");
        }
        return;
      }

      // Ctrl+N - New/Clear Bill
      if ((event.ctrlKey || event.metaKey) && (event.key === 'n' || event.key === 'N') && !event.shiftKey) {
        event.preventDefault();
        if (!isTyping) {
          clearBill();
          showTempMessage("success", "⌨️ New bill created (Ctrl+N)");
        }
        return;
      }

      // Alt+1 - Toggle Sale Return
      if ((event.altKey && event.key === '1') || (event.ctrlKey && event.shiftKey && event.key === 'R')) {
        event.preventDefault();
        setSaleReturn(prev => !prev);
        showTempMessage("success", `⌨️ Sale Return: ${!saleReturn ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+2 - Toggle Card Bill
      if ((event.altKey && event.key === '2') || (event.ctrlKey && event.shiftKey && event.key === 'D')) {
        event.preventDefault();
        setCardBill(prev => !prev);
        showTempMessage("success", `⌨️ Card Bill: ${!cardBill ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+3 - Toggle No Rewards
      if ((event.altKey && event.key === '3') || (event.ctrlKey && event.shiftKey && event.key === 'W')) {
        event.preventDefault();
        setNoRewards(prev => !prev);
        showTempMessage("success", `⌨️ No Rewards: ${!noRewards ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+4 - Toggle Classic Customer
      if ((event.altKey && event.key === '4') || (event.ctrlKey && event.shiftKey && event.key === 'L')) {
        event.preventDefault();
        setClassicCustomer(prev => !prev);
        showTempMessage("success", `⌨️ Classic Customer: ${!classicCustomer ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+C - Focus Card Amount
      if (event.altKey && (event.key === 'c' || event.key === 'C')) {
        event.preventDefault();
        cardAmountRef.current?.focus();
        showTempMessage("success", "⌨️ Card amount focused");
        return;
      }

      // Alt+U - Focus UPI Amount
      if (event.altKey && (event.key === 'u' || event.key === 'U')) {
        event.preventDefault();
        upiAmountRef.current?.focus();
        showTempMessage("success", "⌨️ UPI amount focused");
        return;
      }

      // Alt+D - Focus Discount Percent
      if (event.altKey && (event.key === 'd' || event.key === 'D')) {
        event.preventDefault();
        discountPercentRef.current?.focus();
        showTempMessage("success", "⌨️ Discount percent focused");
        return;
      }

      // Alt+A - Focus Discount Amount
      if (event.altKey && (event.key === 'a' || event.key === 'A')) {
        event.preventDefault();
        discountAmountRef.current?.focus();
        showTempMessage("success", "⌨️ Discount amount focused");
        return;
      }

      // Ctrl+Shift+X - Remove last row
      if ((event.ctrlKey && event.shiftKey && event.key === 'X') || (event.key === 'Delete' && !isTyping)) {
        event.preventDefault();
        if (rows.length > 0) {
          removeRow(rows.length - 1);
          showTempMessage("success", "⌨️ Last product removed");
        }
        return;
      }

      // Escape - Clear error/message and blur focus
      if (event.key === 'Escape') {
        setError("");
        setMessage("");
        setShowMobileSuggestions(false);
        document.activeElement?.blur();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, saleReturn, cardBill, noRewards, classicCustomer, quickProductQuery]);

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products?page=1&per_page=1000`);
      setProducts(Array.isArray(response.data?.items) ? response.data.items : []);
    } catch (err) {
      setProducts([]);
      setError("Products not loaded. Please start backend and refresh.");
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/billing/customers`);
      setCustomers(response.data?.customers || []);
    } catch (err) {
      console.error("Customers not loaded", err);
    }
  };

  const handleMobileChange = async (value) => {
    setMobileNumber(value);
    if (value.length >= 10) {
      try {
        const response = await axios.get(`${API_BASE_URL}/billing/customer/${value}`);
        if (response.data?.exists) {
          const cust = response.data.customer;
          if (cust.name && cust.name !== 'Walk-in Customer') setCustomerName(cust.name);
          if (cust.address) setAddress(cust.address);
          setAvailablePoints(cust.reward_points || 0);
        } else {
          setAvailablePoints(0);
        }
      } catch (err) {
        console.error("Could not fetch customer details", err);
      }
    } else {
      setAvailablePoints(0);
    }
  };

  const normalizeProduct = (product) => {
    const unitPrice = money(product.sellPrice || product.sell_price);
    const mrp = money(product.mrp || product.buyPrice || product.buy_price || unitPrice);
    const discountPercent = Number(product.discountPercent || 0);
    const netPrice = money(product.netPrice || (unitPrice - (unitPrice * discountPercent / 100)));

    return {
      _dbId: product.id,
      productId: product.productCode || String(product.id),
      description: product.name || product.productName || "",
      size: product.size || product.model || "",
      tax: Number(product.tax || product.watts || TAX_PERCENT),
      unit: product.unit || product.type || DEFAULT_UNIT,
      mrp,
      unitPrice,
      discountPercent,
      netPrice,
      quantity: 1,
      salesPerson: product.salesPerson || salesPerson || loggedInUserName,
      stock: Number(product.quantity || 0),
    };
  };

  const addProduct = (product) => {
    if (!product) return;
    const next = normalizeProduct(product);

    setRows((current) => {
      const existingIndex = current.findIndex((row) => row._dbId === next._dbId);
      if (existingIndex === -1) return [...current, next];

      return current.map((row, index) => (
        index === existingIndex
          ? { ...row, quantity: Math.min(row.stock || row.quantity + 1, row.quantity + 1) }
          : row
      ));
    });
  };

  const addByQuery = async (value) => {
    const query = String(value || "").trim();
    if (!query) return;

    let found = products.find((product) => (
      String(product.id) === query ||
      String(product.productCode || "").toLowerCase() === query.toLowerCase() ||
      String(product.name || "").toLowerCase() === query.toLowerCase()
    ));

    if (!found) {
      try {
        if (/^\d+$/.test(query)) {
          const response = await axios.get(`${API_BASE_URL}/products/${query}`);
          found = response.data;
        } else {
          const response = await axios.get(`${API_BASE_URL}/billing/search-products?q=${encodeURIComponent(query)}`);
          found = Array.isArray(response.data) ? response.data[0] : null;
        }
      } catch (err) {
        found = null;
      }
    }

    if (found) {
      addProduct(found);
      setError("");
    } else {
      setError("Product not found in stock.");
    }
  };

  const updateRow = (index, field, value) => {
    const numericFields = ["mrp", "unitPrice", "discountPercent", "netPrice", "quantity", "tax"];

    if (field === "productId") {
      const query = String(value || "").trim();
      if (!query) {
        setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, productId: "" } : row)));
        return;
      }

      let found = products.find((p) => (
        String(p.id) === query ||
        String(p.productCode || "").toLowerCase() === query.toLowerCase() ||
        String(p.name || "").toLowerCase() === query.toLowerCase()
      ));

      const applyFound = (product) => {
        const normalized = normalizeProduct(product);
        setRows((current) => {
          const nextRows = current.map((row, rowIndex) => (rowIndex === index ? normalized : row));
          if (index === current.length - 1) {
            nextRows.push({
              productId: "",
              description: "",
              size: "",
              tax: TAX_PERCENT,
              unit: DEFAULT_UNIT,
              mrp: 0,
              unitPrice: 0,
              discountPercent: 0,
              netPrice: 0,
              quantity: 1,
              salesPerson: loggedInUserName,
            });
          }
          return nextRows;
        });
      };

      if (found) {
        applyFound(found);
        return;
      }

      if (/^\d+$/.test(query)) {
        axios.get(`${API_BASE_URL}/products/${query}`).then((res) => {
          if (res.data) applyFound(res.data);
        }).catch(() => {
          setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, productId: value } : row)));
        });
        return;
      }

      setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, productId: value } : row)));
      return;
    }

    setRows((current) => {
      const newRows = current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const updated = { ...row, [field]: numericFields.includes(field) ? Number(value) || 0 : value };

        if (field === "unitPrice" || field === "discountPercent") {
          const u = Number(updated.unitPrice) || 0;
          const d = Number(updated.discountPercent) || 0;
          updated.netPrice = money(u - (u * d / 100));
        }

        return updated;
      });

      // If we're updating the last row and it now has a productId or description, add a new blank row
      const lastRow = newRows[newRows.length - 1];
      if (index === current.length - 1 && (lastRow.productId || lastRow.description)) {
        newRows.push({
          productId: "",
          description: "",
          size: "",
          tax: TAX_PERCENT,
          unit: DEFAULT_UNIT,
          mrp: 0,
          unitPrice: 0,
          discountPercent: 0,
          netPrice: 0,
          quantity: 1,
          salesPerson: loggedInUserName,
        });
      }

      return newRows;
    });
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const totals = useMemo(() => {
    const activeRows = rows.filter(r => r.productId && r._dbId);
    const totalItems = activeRows.length;
    const totalQuantity = activeRows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const mrpTotal = activeRows.reduce((sum, row) => sum + (Number(row.mrp) || 0) * (Number(row.quantity) || 0), 0);
    const netBeforeDiscount = activeRows.reduce((sum, row) => {
      const quantity = Number(row.quantity) || 0;
      const netPrice = Number(row.netPrice) || 0;
      return sum + netPrice * quantity;
    }, 0);
    const manualPercentDiscount = netBeforeDiscount * ((Number(discountPercent) || 0) / 100);
    const manualDiscount = money(manualPercentDiscount + (Number(discountAmount) || 0));
    const billValue = money(Math.max(0, netBeforeDiscount - manualDiscount));
    const cardPaid = Number(cardAmount) || 0;
    const upiPaid = Number(upiAmount) || 0;
    const cashPaid = Number(cashReceived) || 0;
    const previousPaid = Number(paidBefore) || 0;
    const amountPaid = money(cardPaid + upiPaid + cashPaid + previousPaid);
    const amountToPay = money(Math.max(0, billValue - previousPaid));
    const amountToReturn = money(Math.max(0, amountPaid - billValue));
    const unitDiscount = money(Math.max(0, mrpTotal - netBeforeDiscount));

    return {
      totalItems,
      totalQuantity,
      mrpTotal: money(mrpTotal),
      unitDiscount,
      mrpDiscount: money(unitDiscount + manualDiscount),
      billValue,
      amountToPay,
      amountToReturn,
      amountPaid,
    };
  }, [rows, discountPercent, discountAmount, cardAmount, upiAmount, cashReceived, paidBefore]);

  const saveBill = async () => {
    if (rows.length === 0) {
      setError("Add at least one product before saving.");
      return null;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const paidAmount = totals.amountPaid || totals.billValue;
      const paymentMethod = cardBill || Number(cardAmount) > 0 ? "card" : Number(upiAmount) > 0 ? "upi" : "cash";
      const payload = {
        customerName: customerName || "Walk-in Customer",
        customerPhone: mobileNumber,
        customerAddress: address,
        customerType: "external",
        discount: Number(discountAmount) || Number(discountPercent) || 0,
        discountType: Number(discountPercent) > 0 ? "percentage" : "amount",
        tax: 0,
        taxType: "percentage",
        paidAmount,
        paymentMethod,
        cashReceived: Number(cashReceived) || 0,
        cardNumber,
        createdByName: salesPerson || counter,
        rewardPointsEarned: noRewards ? 0 : totals.billValue * 0.01,
        rewardPointsRedeemed: 0,
        items: rows.filter(r => r.productId && r._dbId).map((row) => ({
          productId: row._dbId,
          quantity: Number(row.quantity) || 1,
        })),
      };

      const response = await axios.post(`${API_BASE_URL}/billing/bills`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });

      const savedNumber = response.data?.billNumber || billNo;
      setBillNo(savedNumber);
      setMessage(`Bill saved: ${savedNumber}`);
      await loadProducts();
      return savedNumber;
    } catch (err) {
      const backendMessage = err.response?.data?.error || err.response?.data?.errors?.join(", ");
      setError(backendMessage || "Unable to save bill. Please check backend is running.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const printBill = async () => {
    const saved = await saveBill();
    if (saved) setTimeout(() => window.print(), 100);
  };

  const clearBill = () => {
    if (window.confirm("Clear current bill? All data will be lost.")) {
      setRows([{
        productId: "",
        description: "",
        size: "",
        tax: TAX_PERCENT,
        unit: DEFAULT_UNIT,
        mrp: 0,
        unitPrice: 0,
        discountPercent: 0,
        netPrice: 0,
        quantity: 1,
        salesPerson: loggedInUserName,
      }]);
      setCustomerName("");
      setMemberId("");
      setMobileNumber("");
      setSalesPerson("");
      setAddress("");
      setCashReceived("");
      setUpiAmount("");
      setCardAmount("");
      setCardNumber("");
      setDiscountPercent("");
      setDiscountAmount("");
      setPaidBefore("");
      setSaleReturn(false);
      setCardBill(false);
      setNoRewards(false);
      setClassicCustomer(false);
      setQuickProductQuery("");
      setMobileSuggestions([]);
      setShowMobileSuggestions(false);
      setBillNo(String(Math.floor(100 + Math.random() * 900)));
      setMessage("New bill created");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  return (
    <div className="sale-page">
      <style>{saleStyles}</style>

      {/* Shortcut Keys Bar */}
      <div className="shortcut-bar">
        <div className="shortcut-title">🔥 SHORTCUTS:</div>
        <div className="shortcut-list">
          <span><kbd>F2</kbd>/<kbd>Ctrl+Shift+P</kbd>🔍Product</span>
          <span><kbd>F3</kbd>/<kbd>Ctrl+Shift+E</kbd>👤Name</span>
          <span><kbd>F4</kbd>/<kbd>Ctrl+Shift+P</kbd>📱Mobile</span>
          <span><kbd>F5</kbd>/<kbd>Ctrl+Shift+S</kbd>👔Sales</span>
          <span><kbd>F6</kbd>/<kbd>Ctrl+Shift+R</kbd>💰Cash</span>
          <span><kbd>F7</kbd>/<kbd>Ctrl+Shift+I</kbd>🆔Member ID</span>
          <span><kbd>Ctrl+Shift+A</kbd>/<kbd>Insert</kbd>➕Add Product</span>
          <span><kbd>Ctrl+Enter</kbd>✓Add Current</span>
          <span><kbd>Ctrl+S</kbd>💾Save</span>
          <span><kbd>Ctrl+P</kbd>🖨️Print</span>
          <span><kbd>Ctrl+N</kbd>🆕New</span>
          <span><kbd>Alt+1-4</kbd>⚙️Toggles</span>
          <span><kbd>Alt+C</kbd>💳Card</span>
          <span><kbd>Alt+U</kbd>📱UPI</span>
          <span><kbd>Alt+D/A</kbd>🏷️Disc</span>
          <span><kbd>Delete</kbd>❌Remove</span>
          <span><kbd>Esc</kbd>🔇Clear</span>
        </div>
      </div>

      <div className="sale-window">
        <div className="sale-titlebar">
          <span>Sale - Billing System</span>
          <span>⌨️ Shortcuts Active</span>
        </div>

        <div className="sale-header">
          <div className="header-left">
            <div className="field-group">
              <label>Date</label>
              <input value={formatDate(now)} readOnly />
            </div>
            <div className="field-group">
              <label>Counter</label>
              <select value={counter} onChange={(event) => setCounter(event.target.value)}>
                <option>counter_1</option>
              </select>
            </div>
            <div className="field-group">
              <label>Bill No</label>
              <input value={billNo} onChange={(event) => setBillNo(event.target.value)} />
            </div>
            <div className="check-group">
              <label className="check"><input type="checkbox" checked={saleReturn} onChange={(event) => setSaleReturn(event.target.checked)} /> SALE RETURN <span className="shortcut-hint">Alt+1</span></label>
              <label className="check"><input type="checkbox" checked={cardBill} onChange={(event) => setCardBill(event.target.checked)} /> CARD BILL <span className="shortcut-hint">Alt+2</span></label>
              <label className="check"><input type="checkbox" checked={noRewards} onChange={(event) => setNoRewards(event.target.checked)} /> NO REWARDS <span className="shortcut-hint">Alt+3</span></label>
            </div>
          </div>

          <div className="customer-name">{loggedInUserName}</div>

          <div className="header-middle">
            <label className="check"><input type="checkbox" checked={classicCustomer} onChange={(event) => setClassicCustomer(event.target.checked)} /> Classic Customer <span className="shortcut-hint">Alt+4</span></label>
            <div className="field-group">
              <label>Member ID <span className="shortcut-hint">F7 / Ctrl+Shift+I</span></label>
              <input ref={memberIdRef} value={memberId} onChange={(event) => setMemberId(event.target.value)} />
            </div>
            <div className="mobile-field-group" ref={mobileContainerRef}>
              <label>Mobile Number <span className="shortcut-hint">F4 / Ctrl+Shift+P</span></label>
              <input
                ref={mobileRef}
                value={mobileNumber}
                onChange={(event) => handleMobileChangeWithSuggestions(event.target.value)}
                onFocus={() => {
                  if (mobileNumber && mobileNumber.length >= 2) {
                    filterMobileSuggestions(mobileNumber);
                  }
                }}
                placeholder="Enter mobile number"
                autoComplete="off"
              />
              {showMobileSuggestions && mobileSuggestions.length > 0 && (
                <div className="mobile-suggestions">
                  {mobileSuggestions.map((customer, idx) => (
                    <div
                      key={idx}
                      className="mobile-suggestion-item"
                      onClick={() => selectMobileSuggestion(customer)}
                    >
                      <span className="suggestion-phone">{customer.phone}</span>
                      <span className="suggestion-name">{customer.name || "No Name"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="field-group">
              <label>Sales Person <span className="shortcut-hint">F5 / Ctrl+Shift+S</span></label>
              <input ref={salesPersonRef} list="sales-persons" value={salesPerson} onChange={(event) => setSalesPerson(event.target.value)} />
            </div>
            <datalist id="sales-persons">
              {[...new Set(products.map(p => p.salesPerson).filter(Boolean))].map((sp, idx) => (
                <option key={idx} value={sp} />
              ))}
            </datalist>
          </div>

          <div className="header-right">
            <div className="clock">{formatDateTime(now)}</div>
            <div className="field-group">
              <label>Name <span className="shortcut-hint">F3 / Ctrl+Shift+E</span></label>
              <input ref={customerNameRef} value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </div>
            <button type="button" className="add-member-btn">Add New Member</button>
            <div className="field-group">
              <label>Address</label>
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows="2" />
            </div>
            <div className="stock-row">
              <div className="field-group">
                <label>Stock In Store</label>
                <input value={products.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} readOnly />
              </div>
              <div className="field-group">
                <label>Godown Stock</label>
                <input value="0" readOnly />
              </div>
            </div>
          </div>
        </div>

        {(message || error) && <div className={error ? "notice error" : "notice"}>{error || message}</div>}

        <div className="quick-add no-print">
          <div style={{ flex: 1 }}></div>
          <button type="button" onClick={saveBill} disabled={loading}>{loading ? "Saving..." : "Save Bill"}</button>
          <button type="button" className="printer" onClick={printBill} disabled={loading}>Print</button>
          <button type="button" onClick={clearBill}>Clear</button>
        </div>

        <div className="grid-wrap">
          <table className="sale-grid">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Description</th>
                <th>Size</th>
                <th>Tax</th>
                <th>Unit</th>
                <th>MRP</th>
                <th>Unit Price</th>
                <th>Disc %</th>
                <th>Net Price</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Sales Person</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const netPrice = money(row.netPrice || (row.unitPrice - row.unitPrice * ((Number(row.discountPercent) || 0) / 100)));
                const amount = money(netPrice * (Number(row.quantity) || 0));
                return (
                  <tr key={row.productId || index}>
                    <td><input value={row.productId} onChange={(event) => updateRow(index, "productId", event.target.value)} /></td>
                    <td><input value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} /></td>
                    <td><input value={row.size} onChange={(event) => updateRow(index, "size", event.target.value)} /></td>
                    <td><input type="number" value={row.tax} onChange={(event) => updateRow(index, "tax", event.target.value)} /></td>
                    <td><input value={row.unit} onChange={(event) => updateRow(index, "unit", event.target.value)} /></td>
                    <td><input type="number" value={row.mrp} onChange={(event) => updateRow(index, "mrp", event.target.value)} /></td>
                    <td><input type="number" value={row.unitPrice} onChange={(event) => updateRow(index, "unitPrice", event.target.value)} /></td>
                    <td><input type="number" value={row.discountPercent} onChange={(event) => updateRow(index, "discountPercent", event.target.value)} /></td>
                    <td><input type="number" value={netPrice} onChange={(event) => updateRow(index, "netPrice", event.target.value)} /></td>
                    <td><input type="number" min="1" max={row.stock || undefined} value={row.quantity} onChange={(event) => updateRow(index, "quantity", event.target.value)} /></td>
                    <td className="amount-cell">{amount}</td>
                    <td className="action-cell">
                      <input value={row.salesPerson || ""} onChange={(event) => updateRow(index, "salesPerson", event.target.value)} />
                      <button type="button" className="row-delete" onClick={() => removeRow(index)}>✕</button>
                    </td>
                  </tr>
                );
              })}
              {blankRows.slice(0, Math.max(0, 8 - rows.length)).map((item) => (
                <tr key={`empty-${item}`} className="empty-row">
                  <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="footer-panel">
          <div className="footer-col">
            <div className="info-row"><span>TOTAL ITEMS</span><strong>{totals.totalItems}</strong></div>
            <div className="info-row"><span>TOTAL QUANTITY</span><strong>{totals.totalQuantity}</strong></div>
            <div className="payment-mode">
              <div className="section-title">Payment Mode</div>
              <fieldset>
                <legend>Card Details <span className="shortcut-hint">Alt+C</span></legend>
                <div className="field-row"><label>Amount</label><input ref={cardAmountRef} value={cardAmount} onChange={(event) => setCardAmount(event.target.value)} /></div>
                <div className="field-row"><label>Card No</label><input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} /></div>
              </fieldset>
            </div>
            <div className="price-strip">
              <div><span>MRP Total</span><strong>₹{Math.round(totals.mrpTotal)}</strong></div>
              <div><span>Net Total</span><strong>₹{Math.round(totals.billValue)}</strong></div>
            </div>
          </div>

          <div className="footer-col">
            <div className="info-row"><span>MRP DISCOUNT</span><strong>₹{Math.round(totals.mrpDiscount)}</strong></div>
            <div className="info-row"><span>UNIT DISCOUNT</span><strong>₹{Math.round(totals.unitDiscount)}</strong></div>
          </div>

          <div className="footer-col">
            <div className="info-row"><span>SaleReturn Amount</span><input value={saleReturn ? totals.billValue : 0} readOnly /></div>
            <div className="info-row"><span>UPI Amount <span className="shortcut-hint">Alt+U</span></span><input ref={upiAmountRef} value={upiAmount} onChange={(event) => setUpiAmount(event.target.value)} /></div>
          </div>

          <div className="footer-col">
            <div className="section-title">Reward Details</div>
            <div className="info-row"><span>Available</span><input value={availablePoints} readOnly /></div>
            <div className="info-row"><span>To Redeem</span><input readOnly /></div>
            <div className="info-row"><span>Amount</span><input readOnly /></div>
            <div className="info-row"><span>Balance</span><input value={availablePoints} readOnly /></div>
          </div>

          <div className="footer-col">
            <div className="section-title">Payment Details</div>
            <div className="info-row"><span>Bill Amount</span><input value={totals.billValue} readOnly /></div>
            <div className="info-row"><span>Discount % <span className="shortcut-hint">Alt+D</span></span><input ref={discountPercentRef} value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} /></div>
            <div className="info-row"><span>Discount Amt <span className="shortcut-hint">Alt+A</span></span><input ref={discountAmountRef} value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></div>
            <div className="info-row"><span>Amount Paid</span><input value={totals.amountPaid} readOnly /></div>
            <div className="info-row"><span>Paid Before</span><input value={paidBefore} onChange={(event) => setPaidBefore(event.target.value)} /></div>
            <div className="info-row"><span>Cash Received <span className="shortcut-hint">F6 / Ctrl+Shift+R</span></span><input ref={cashReceivedRef} value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} /></div>
            <button type="button" className="print-btn" onClick={printBill}>🖨️ Print</button>
          </div>

          <div className="pay-board">
            <div className="pay-card">
              <div className="pay-label">TOTAL BILL</div>
              <div className="pay-value">₹{Math.round(totals.billValue)}</div>
            </div>
            <div className="pay-card">
              <div className="pay-label">AMOUNT TO PAY</div>
              <div className="pay-value">₹{Math.round(totals.amountToPay)}</div>
            </div>
            <div className="pay-card return-card">
              <div className="pay-label">RETURN</div>
              <div className="pay-value">₹{String(Math.round(totals.amountToReturn)).padStart(3, "0")}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-Only Thermal Receipt */}
      <div className="print-only">
        <div className="receipt-header">
          <div className="receipt-logo">
            <img src="/Dc-logo.jpg" alt="Dressing Concepts" className="receipt-logo-img" />
          </div>
          <div className="receipt-shop">DRESSING CONCEPTS</div>
          <div className="receipt-tagline">Style · Quality · Value</div>
          <div className="receipt-divider-thin" />
          <div className="receipt-addr">NO.88/70 S.R.P KOVIL STREET,</div>
          <div className="receipt-addr">AGARAM, PERAMBUR,</div>
          <div className="receipt-addr">CHENNAI - 600 082.</div>
          <div className="receipt-addr">Ph: 9840669687</div>
          <div className="receipt-addr">GSTIN:&nbsp;</div>
        </div>

        <div className="receipt-dash" />

        <div className="receipt-meta">
          <div className="receipt-meta-row"><span>Bill No: {billNo}</span><span>{formatDateTime(now)}</span></div>
          <div className="receipt-meta-row"><span>{counter}</span><span>User: {loggedInUserName}</span></div>
        </div>

        <div className="receipt-dash" />

        <table className="receipt-table">
          <thead>
            <tr>
              <th className="r-desc">Description</th>
              <th className="r-num">Qty</th>
              <th className="r-num">Rate</th>
              <th className="r-num">Amt</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => r.productId && r._dbId).map((row, index) => {
              const qty = Number(row.quantity) || 0;
              const rate = Number(row.netPrice) || Number(row.unitPrice) || 0;
              const amt = money(rate * qty);
              return (
                <tr key={index}>
                  <td className="r-desc">{row.description}</td>
                  <td className="r-num">{qty.toFixed(2)}</td>
                  <td className="r-num">{rate.toFixed(2)}</td>
                  <td className="r-num">{amt.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="receipt-dash" />

        <div className="receipt-pay">
          <span className="receipt-pay-label">Pay Amount</span>
          <span className="receipt-pay-value">₹ {Math.round(totals.billValue)}/-</span>
        </div>

        <div className="receipt-dash" />

        <div className="receipt-summary">
          <div className="receipt-row"><span>Total Pieces:</span><span>{totals.totalQuantity}</span></div>
          <div className="receipt-row"><span>MRP Total:</span><span>₹ {Math.round(totals.mrpTotal)}</span></div>
          <div className="receipt-row receipt-savings">
            <span>You Saved:</span>
            <span>₹ {Math.round(totals.mrpDiscount)}</span>
          </div>
        </div>

        <div className="receipt-dash" />

        <div className="receipt-customer">
          <div className="receipt-cust-title">Customer Details</div>
          <div className="receipt-cust-name">{customerName || "Walk-in Customer"}</div>
          {mobileNumber && <div className="receipt-cust-phone">{mobileNumber}</div>}
        </div>

        <div className="receipt-dash" />

        <div className="receipt-points">
          <div className="receipt-row"><span>Points Used:</span><span>0</span></div>
          <div className="receipt-row"><span>Points Available:</span><span>{availablePoints}</span></div>
        </div>

        <div className="receipt-dash" />

        <div className="receipt-thankyou">Thank you for shopping with us!</div>
        <div className="receipt-visit">Visit again &hearts;</div>

        <div className="receipt-qr">
          <div className="receipt-qr-item">
            <div className="receipt-qr-lbl">JOIN US</div>
            <img src="/whatsapp-qr.png" alt="WhatsApp QR" />
          </div>
          <div className="receipt-qr-item">
            <div className="receipt-qr-lbl">VISIT US</div>
            <img src="/instagram.png" alt="Instagram QR" />
          </div>
        </div>
      </div>
    </div>
  );
}

const saleStyles = `
  .sale-page {
    background: #111;
    color: #111;
    min-height: calc(100vh - 100px);
    font-family: Arial, Helvetica, sans-serif;
  }

  /* Shortcut Bar Styles */
  .shortcut-bar {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
    padding: 8px 16px;
    margin-bottom: 10px;
    border-radius: 8px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 15px;
    font-size: 11px;
    font-family: monospace;
    border: 1px solid #00bcd4;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }
  .shortcut-title {
    font-weight: bold;
    color: #00bcd4;
    font-size: 12px;
  }
  .shortcut-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .shortcut-list span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(0,0,0,0.5);
    padding: 3px 8px;
    border-radius: 15px;
  }
  .shortcut-list kbd {
    background: #2d2d44;
    border: 1px solid #00bcd4;
    border-radius: 4px;
    padding: 2px 6px;
    font-weight: bold;
    color: #00bcd4;
    font-size: 10px;
    margin-right: 4px;
  }
  .shortcut-hint {
    font-size: 9px;
    color: #ff9800;
    margin-left: 5px;
    font-family: monospace;
    background: rgba(0,0,0,0.3);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .sale-window {
    background: #96ceca;
    border: 1px solid #6faaa5;
    box-shadow: 0 8px 26px rgba(0, 0, 0, 0.35);
    min-width: 980px;
    overflow: hidden;
  }

  .sale-titlebar {
    height: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 12px;
    background: linear-gradient(90deg, #2c3e50, #1a1a2e);
    color: #fff;
    border-bottom: 1px solid #00bcd4;
    font-size: 13px;
    font-weight: bold;
  }

  /* Header Styles */
  .sale-header {
    display: grid;
    grid-template-columns: 1.2fr 170px 1fr 1.25fr;
    gap: 14px;
    padding: 10px 12px 8px;
    font-size: 12px;
    font-weight: 700;
  }

  .header-left, .header-middle, .header-right {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-group {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;
  }

  .field-group label {
    min-width: 70px;
    font-weight: 600;
    color: #333;
  }

  .field-group input, .field-group select, .field-group textarea {
    height: 26px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 8px;
    font: inherit;
    border-radius: 3px;
  }

  .field-group textarea {
    height: 42px;
    width: 180px;
    resize: none;
  }

  /* Mobile Suggestions */
  .mobile-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
  }

  .mobile-field-group label {
    min-width: 70px;
    font-weight: 600;
    color: #333;
  }

  .mobile-field-group input {
    height: 26px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 8px;
    font: inherit;
    border-radius: 3px;
    width: 180px;
  }

  .mobile-suggestions {
    position: absolute;
    top: 100%;
    left: 78px;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .mobile-suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #eee;
    transition: background 0.2s;
  }

  .mobile-suggestion-item:hover {
    background: #e3f2fd;
  }

  .suggestion-phone {
    font-weight: bold;
    color: #0066cc;
    font-family: monospace;
  }

  .suggestion-name {
    color: #555;
    font-size: 11px;
  }

  .check-group {
    display: flex;
    gap: 12px;
    margin-top: 4px;
  }

  .check {
    display: inline-flex !important;
    align-items: center;
    gap: 5px;
    margin-right: 10px;
  }

  .check input {
    width: 14px;
    height: 14px;
    margin: 0;
  }

  .customer-name {
    background: #111;
    color: #fff;
    border: 1px solid #777;
    font-weight: 800;
    padding: 8px 12px;
    text-align: center;
    border-radius: 4px;
    align-self: start;
  }

  .clock {
    background: #111;
    color: #fff;
    border: 1px solid #777;
    font-weight: 800;
    padding: 6px 10px;
    text-align: center;
    font-family: monospace;
    margin-bottom: 4px;
  }

  .add-member-btn {
    background: #4caf50;
    color: #fff;
    border: none;
    padding: 6px 12px;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 4px;
  }

  .stock-row {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }

  .stock-row .field-group input {
    width: 70px;
  }

  .notice {
    margin: 0 10px 7px;
    padding: 6px 10px;
    background: #dff6dd;
    border: 1px solid #63a55c;
    font-weight: 700;
    font-size: 12px;
    border-radius: 4px;
  }

  .notice.error {
    background: #ffe0e0;
    border-color: #c75151;
  }

  /* Quick Add */
  .quick-add {
    display: grid;
    grid-template-columns: 1fr auto auto auto auto;
    gap: 8px;
    padding: 8px 12px;
  }

  .quick-add input {
    height: 32px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 4px 10px;
    font: inherit;
    border-radius: 4px;
  }

  .quick-add button {
    border: 1px solid #444;
    background: #111;
    color: #fff;
    font-weight: 700;
    padding: 5px 16px;
    cursor: pointer;
    border-radius: 4px;
  }

  .quick-add button:hover, .printer:hover {
    background: #333;
  }

  /* Table Styles */
  .grid-wrap {
    background: #fff;
    border-top: 1px solid #7e7e7e;
    border-bottom: 1px solid #7e7e7e;
    overflow-x: auto;
  }

  .sale-grid {
    width: 100%;
    min-width: 1060px;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
  }

  .sale-grid th {
    background: #f0f0f0;
    border-right: 1px solid #d0d0d0;
    border-bottom: 1px solid #c0c0c0;
    padding: 8px 6px;
    font-size: 11px;
    text-align: left;
    font-weight: 700;
    white-space: nowrap;
  }

  .sale-grid td {
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e8e8e8;
    padding: 4px 6px;
    background: #ffffff;
  }

  .sale-grid tbody tr:nth-child(even) td {
    background: #f8f9fa;
  }

  .sale-grid tbody tr:hover td {
    background: #e3f2fd;
  }

  .sale-grid input {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
    outline: none;
    padding: 4px 0;
  }

  .sale-grid input:focus {
    background: #fff9c4;
    border-radius: 3px;
    padding-left: 4px;
  }

  .amount-cell {
    font-weight: 700;
    color: #2c3e50;
    text-align: right;
  }

  .row-delete {
    background: #dc3545;
    color: #fff;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 8px;
    font-weight: bold;
    font-size: 12px;
  }

  .row-delete:hover {
    background: #c82333;
  }

  /* Footer Panel */
  .footer-panel {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 12px;
    padding: 12px;
    background: #f5f5f5;
  }

  .footer-col {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fff;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ddd;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    font-weight: 600;
  }

  .info-row span {
    color: #555;
  }

  .info-row strong {
    background: #020202;
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 14px;
    min-width: 50px;
    text-align: center;
  }

  .info-row input {
    width: 90px;
    height: 26px;
    border: 1px solid #ccc;
    background: #fff;
    padding: 2px 6px;
    border-radius: 3px;
    text-align: right;
  }

  .section-title {
    font-weight: 700;
    margin-bottom: 6px;
    color: #2c3e50;
    font-size: 12px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 3px;
  }

  .payment-mode fieldset {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 8px;
    margin-top: 4px;
  }

  .payment-mode legend {
    font-weight: 600;
    font-size: 11px;
    padding: 0 6px;
  }

  .field-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 11px;
  }

  .field-row label {
    font-weight: 500;
  }

  .field-row input {
    width: 100px;
    height: 24px;
    border: 1px solid #ccc;
    padding: 2px 6px;
    border-radius: 3px;
  }

  .price-strip {
    margin-top: 8px;
  }

  .price-strip div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    padding: 4px 0;
    font-size: 11px;
  }

  .price-strip strong {
    background: #020202;
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 14px;
  }

  .print-btn {
    width: 100%;
    padding: 8px;
    background: #ff9800;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 8px;
  }

  /* Pay Board */
  .pay-board {
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: #fff;
    padding: 10px;
    border-radius: 6px;
    border: 1px solid #ddd;
  }

  .pay-card {
    background: linear-gradient(135deg, #667eea, #764ba2);
    padding: 10px;
    border-radius: 8px;
    text-align: center;
  }

  .return-card {
    background: linear-gradient(135deg, #f093fb, #f5576c);
  }

  .pay-label {
    font-size: 9px;
    color: rgba(255,255,255,0.8);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }

  .pay-value {
    font-size: 20px;
    font-weight: bold;
    color: #fff;
  }

  @media (max-width: 1400px) {
    .footer-panel {
      gap: 8px;
    }
    .pay-value {
      font-size: 16px;
    }
  }

  @media (max-width: 1200px) {
    .sale-window {
      min-width: 900px;
    }
    .footer-panel {
      grid-template-columns: repeat(3, 1fr);
    }
    .pay-board {
      grid-column: span 1;
    }
  }

  .print-only { display: none; }

  @media print {
    @page { size: 80mm auto; margin: 0; }
    body * { visibility: hidden; }
    .print-only, .print-only * { visibility: visible; }
    .print-only {
      display: block;
      position: absolute;
      left: 0; top: 0;
      width: 76mm;
      padding: 5mm 3mm 6mm;
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #000;
      background: #fff;
    }
    .receipt-logo-img { width: 62px; height: 62px; object-fit: contain; }
    .receipt-shop { font-size: 15px; font-weight: 900; text-align: center; }
    .receipt-dash { border-top: 1px dashed #000; margin: 5px 0; }
    .receipt-table { width: 100%; border-collapse: collapse; }
    .receipt-table th, .receipt-table td { padding: 4px 2px; }
    .r-desc { text-align: left; }
    .r-num { text-align: right; }
    .receipt-pay { display: flex; justify-content: space-between; margin: 10px 0; }
    .receipt-thankyou { text-align: center; margin-top: 10px; }
    .receipt-qr { display: flex; justify-content: space-around; margin-top: 10px; }
    .receipt-qr img { width: 52px; height: 52px; }
  }
`;