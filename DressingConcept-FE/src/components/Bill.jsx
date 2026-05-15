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

  const [loading, setLoading] = useState(false);
  
  // Persistence logic: Load initial state from localStorage if available
  const getSavedState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem("bill_draft");
      if (saved) {
        const state = JSON.parse(saved);
        return state[key] !== undefined ? state[key] : defaultValue;
      }
    } catch (e) {
      console.error("Error loading saved bill state", e);
    }
    return defaultValue;
  };

  const [rows, setRows] = useState(() => getSavedState("rows", [{
    productId: "",
    description: "",
    tax: "",
    unit: "",
    mrp: "",
    discountPercent: "",
    netPrice: "",
    quantity: "",
    salesPerson: "",
  }]));
  const [billNo, setBillNo] = useState(() => getSavedState("billNo", ""));
  const [counter, setCounter] = useState(() => getSavedState("counter", "counter_1"));
  const [customerName, setCustomerName] = useState(() => getSavedState("customerName", ""));
  const [memberId, setMemberId] = useState(() => getSavedState("memberId", ""));
  const [mobileNumber, setMobileNumber] = useState(() => getSavedState("mobileNumber", ""));
  const [salesPerson, setSalesPerson] = useState(() => getSavedState("salesPerson", ""));
  const [address, setAddress] = useState(() => getSavedState("address", ""));
  const [saleReturn, setSaleReturn] = useState(() => getSavedState("saleReturn", false));
  const [cardBill, setCardBill] = useState(() => getSavedState("cardBill", false));
  const [noRewards, setNoRewards] = useState(() => getSavedState("noRewards", false));
  const [classicCustomer, setClassicCustomer] = useState(() => getSavedState("classicCustomer", false));
  const [cashReceived, setCashReceived] = useState(() => getSavedState("cashReceived", ""));
  const [upiAmount, setUpiAmount] = useState(() => getSavedState("upiAmount", ""));
  const [cardAmount, setCardAmount] = useState(() => getSavedState("cardAmount", ""));
  const [cardNumber, setCardNumber] = useState(() => getSavedState("cardNumber", ""));
  const [discountPercent, setDiscountPercent] = useState(() => getSavedState("discountPercent", ""));
  const [discountAmount, setDiscountAmount] = useState(() => getSavedState("discountAmount", ""));
  const [onlineAmount, setOnlineAmount] = useState(() => getSavedState("onlineAmount", ""));
  const [onlinePhone, setOnlinePhone] = useState(() => getSavedState("onlinePhone", ""));
  const [onlineRef, setOnlineRef] = useState(() => getSavedState("onlineRef", ""));
  const [paidBefore, setPaidBefore] = useState(() => getSavedState("paidBefore", ""));
  const [contactNumber, setContactNumber] = useState(() => getSavedState("contactNumber", ""));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(new Date());
  const [quickProductQuery, setQuickProductQuery] = useState("");
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [salesPersonSuggestions, setSalesPersonSuggestions] = useState([]);
  const [showSalesPersonSuggestions, setShowSalesPersonSuggestions] = useState(false);
  const [salesPersonList, setSalesPersonList] = useState([]);

  const [employees, setEmployees] = useState([]);
  const [spSuggestions, setSPSuggestions] = useState([]);
  const [showSPSuggestions, setShowSPSuggestions] = useState(false);
  const [activeSPIndex, setActiveSPIndex] = useState(-1);

  const [customers, setCustomers] = useState([]);
  const [availablePoints, setAvailablePoints] = useState(0);

  // Refs for focusing inputs
  const rowInputRefs = useRef([]);
  const qtyInputRefs = useRef([]);
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
  const salesPersonContainerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!billNo) setBillNo(String(Math.floor(100 + Math.random() * 900)));
    loadProducts();
    loadCustomers();
    loadEmployees();
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      rows, billNo, counter, customerName, memberId, mobileNumber, salesPerson,
      address, saleReturn, cardBill, noRewards, classicCustomer, cashReceived,
      upiAmount, cardAmount, cardNumber, discountPercent, discountAmount,
      onlineAmount, onlinePhone, onlineRef, paidBefore, contactNumber
    };
    localStorage.setItem("bill_draft", JSON.stringify(state));
  }, [
    rows, billNo, counter, customerName, memberId, mobileNumber, salesPerson,
    address, saleReturn, cardBill, noRewards, classicCustomer, cashReceived,
    upiAmount, cardAmount, cardNumber, discountPercent, discountAmount,
    onlineAmount, onlinePhone, onlineRef, paidBefore, contactNumber
  ]);

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
      if (salesPersonContainerRef.current && !salesPersonContainerRef.current.contains(event.target)) {
        setShowSalesPersonSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update rows when Classic Mode is toggled
  useEffect(() => {
    setRows((prevRows) => 
      prevRows.map((row) => {
        if (!row.productId || !row._dbId) return row;
        
        const originalProduct = products.find(p => p.id === row._dbId);
        if (!originalProduct) return row;

        const normalized = normalizeProduct(originalProduct);
        return {
          ...row,
          mrp: normalized.mrp,
          netPrice: normalized.netPrice,
          discountPercent: normalized.discountPercent
        };
      })
    );
  }, [classicCustomer, products]);

  // Build sales person list from products
  useEffect(() => {
    const uniqueSalesPersons = [...new Set(products.map(p => p.salesPerson).filter(Boolean))];
    setSalesPersonList(uniqueSalesPersons);
  }, [products]);

  // Helper to show temporary messages
  const showTempMessage = (type, text) => {
    if (type === "success") setMessage(text);
    else setError(text);
  };

  const loadEmployees = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/employees`);
      const list = Array.isArray(response.data) ? response.data : (response.data.employees || []);
      setEmployees(list);
    } catch (err) {
      console.error("Employees not loaded", err);
    }
  };

  const filterSPSuggestions = (input, index = -1) => {
    setActiveSPIndex(index);
    if (!input || input.length === 0) {
      setSPSuggestions([]);
      setShowSPSuggestions(false);
      return;
    }
    const filtered = employees.filter(emp => 
      emp.full_name && emp.full_name.toLowerCase().startsWith(input.toLowerCase())
    ).slice(0, 10);
    setSPSuggestions(filtered);
    setShowSPSuggestions(filtered.length > 0);
  };

  const selectSPSuggestion = (name, index = -1) => {
    if (index === -1) {
      setSalesPerson(name);
    } else {
      updateRow(index, "salesPerson", name);
    }
    setShowSPSuggestions(false);
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
      .slice(0, 8);
    setMobileSuggestions(filtered);
    setShowMobileSuggestions(filtered.length > 0);
  };

  // Filter sales person suggestions
  const filterSalesPersonSuggestions = (input) => {
    if (!input || input.length === 0) {
      setSalesPersonSuggestions([]);
      setShowSalesPersonSuggestions(false);
      return;
    }

    const filtered = salesPersonList
      .filter(name =>
        name &&
        name.toLowerCase().includes(input.toLowerCase())
      )
      .slice(0, 10);
    setSalesPersonSuggestions(filtered);
    setShowSalesPersonSuggestions(filtered.length > 0);
  };

  // Handle sales person change with suggestions
  const handleSalesPersonChange = (value) => {
    setSalesPerson(value);
    filterSalesPersonSuggestions(value);
  };

  // Select sales person suggestion
  const selectSalesPersonSuggestion = (name) => {
    setSalesPerson(name);
    setShowSalesPersonSuggestions(false);
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
        if (!customerName || customerName === 'Walk-in Customer') {
          setCustomerName("");
        }
      }
    } catch (err) {
      console.error("Could not fetch customer details", err);
      setAvailablePoints(0);
    }
  };

  // Helper: returns true if this product is a deleted/placeholder entry
  const isDeletedProduct = (p) => {
    const name = String(p.name || p.productName || "");
    const code = String(p.productCode || p.id || "");
    return (
      name.includes("___DELETED___") ||
      name.includes("DELETED") ||
      name.startsWith("__DELETED") ||
      code.startsWith("DEL-") ||
      code.includes("DEL-")
    );
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products?page=1&per_page=1000`);
      const all = Array.isArray(response.data?.items) ? response.data.items : [];
      const activeProducts = all.filter((p) => !isDeletedProduct(p));
      setProducts(activeProducts);
      console.log("Loaded products:", activeProducts.length);
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

  const normalizeProduct = (product) => {
    let mrp = money(product.mrp || product.sellPrice || product.sell_price || 0);
    const discountPercent = Number(product.discountPercent || 0);
    let netPrice = money(product.netPrice || (mrp - (mrp * discountPercent / 100)));
    let finalDiscountPercent = discountPercent;

    // Use Classic Mode pricing if enabled and available
    if (classicCustomer && product.classicCustomer) {
      const cp = money(product.classicCustomer);
      mrp = cp;
      netPrice = cp;
      finalDiscountPercent = 0;
    }

    return {
      _dbId: product.id,
      productId: product.productCode || String(product.id),
      description: product.name || product.productName || "",
      tax: Number(product.tax || product.watts || TAX_PERCENT),
      unit: product.unit || product.type || DEFAULT_UNIT,
      mrp,
      discountPercent: finalDiscountPercent,
      netPrice,
      quantity: 1,
      salesPerson: product.salesPerson || salesPerson || loggedInUserName,
      stock: Number(product.quantity || 0),
    };
  };

  const addOrUpdateProduct = useCallback((product, targetRowIndex = null) => {
    if (!product || isDeletedProduct(product)) {
      setError("Cannot add deleted/invalid product");
      return false;
    }

    const normalized = normalizeProduct(product);

    setRows((currentRows) => {
      const existingIndex = currentRows.findIndex((row) =>
        row._dbId === normalized._dbId ||
        (row.productId && row.productId === normalized.productId)
      );

      if (existingIndex !== -1) {
        const updatedRows = currentRows.map((row, idx) => {
          if (idx === existingIndex) {
            const newQuantity = (Number(row.quantity) || 0) + 1;
            return { ...row, quantity: newQuantity };
          }
          return row;
        });

        showTempMessage("success", `✅ Quantity increased for ${normalized.description}`);

        setTimeout(() => {
          if (rowInputRefs.current[existingIndex]) {
            rowInputRefs.current[existingIndex].focus();
            rowInputRefs.current[existingIndex].select();
          }
        }, 100);

        return updatedRows;
      } else {
        let updatedRows;

        if (targetRowIndex !== null && currentRows[targetRowIndex] && !currentRows[targetRowIndex].productId) {
          updatedRows = currentRows.map((row, idx) =>
            idx === targetRowIndex ? normalized : row
          );
        } else {
          updatedRows = [...currentRows, normalized];
        }

        const lastRow = updatedRows[updatedRows.length - 1];
        if (lastRow.productId && lastRow.productId !== "") {
          updatedRows.push({
            productId: "",
            description: "",
            tax: "",
            unit: "",
            mrp: "",
            discountPercent: "",
            netPrice: "",
            quantity: "",
            salesPerson: "",
          });
        }

        showTempMessage("success", `✅ Added ${normalized.description}`);

        const nextEmptyIndex = updatedRows.findIndex(row => !row.productId);
        setTimeout(() => {
          if (nextEmptyIndex !== -1 && rowInputRefs.current[nextEmptyIndex]) {
            rowInputRefs.current[nextEmptyIndex].focus();
            rowInputRefs.current[nextEmptyIndex].select();
          }
        }, 100);

        return updatedRows;
      }
    });

    return true;
  }, [salesPerson, loggedInUserName]);

  const addByQuery = async (value) => {
    const query = String(value || "").trim();
    if (!query) return false;

    let found = products.find((product) => (
      String(product.id) === query ||
      String(product.productCode || "").toLowerCase() === query.toLowerCase() ||
      String(product.name || "").toLowerCase() === query.toLowerCase()
    ));

    if (!found && /^\d+$/.test(query)) {
      try {
        const response = await axios.get(`${API_BASE_URL}/products/${query}`);
        if (response.data && !isDeletedProduct(response.data)) {
          found = response.data;
          setProducts(prev => [...prev, found]);
        }
      } catch (err) {
        console.log("Product not found in API");
      }
    }

    if (found) {
      const currentActiveRowIndex = activeRowIndex;
      addOrUpdateProduct(found, currentActiveRowIndex);
      setQuickProductQuery("");
      return true;
    } else {
      setError(`❌ Product "${query}" not found in stock.`);
      return false;
    }
  };

  // FIXED: Product search handler that only adds/updates on Enter
  const handleProductSearch = (index, value, onDone) => {
    const query = String(value || "").trim();
    if (!query) {
      if (onDone) onDone(index, false);
      return;
    }

    let found = products.find((p) => (
      String(p.id) === query ||
      String(p.productCode || "").toLowerCase() === query.toLowerCase() ||
      String(p.name || "").toLowerCase() === query.toLowerCase()
    ));

    const applyFound = (product) => {
      if (isDeletedProduct(product)) {
        setError("Cannot add deleted product");
        if (onDone) onDone(index, false);
        return;
      }

      const normalized = normalizeProduct(product);

      setRows((current) => {
        // Check if product already exists in the bill (excluding current row)
        const existingIndex = current.findIndex((row, rowIndex) =>
          rowIndex !== index && (row._dbId === normalized._dbId || (row.productId && row.productId === normalized.productId))
        );

        if (existingIndex !== -1) {
          // Product exists: increase quantity by 1
          showTempMessage("success", `✅ Quantity increased for ${normalized.description}`);

          const nextRows = current.map((row, rowIndex) => {
            if (rowIndex === existingIndex) {
              const newQuantity = (Number(row.quantity) || 0) + 1;
              return { ...row, quantity: newQuantity };
            }
            return row;
          });

          // Clear the current row
          const clearedRows = nextRows.map((row, rowIndex) => {
            if (rowIndex === index) {
              return {
                productId: "",
                description: "",
                tax: "",
                unit: "",
                mrp: "",
                discountPercent: "",
                netPrice: "",
                quantity: "",
                salesPerson: "",
              };
            }
            return row;
          });

          // Move to next row after processing
          if (onDone) setTimeout(() => onDone(index + 1, true), 100);
          return clearedRows;
        }

        // Product is new: add to current row
        const nextRows = current.map((row, rowIndex) => (rowIndex === index ? normalized : row));

        // Check if we need a new blank row
        const lastRow = nextRows[nextRows.length - 1];
        if (lastRow.productId && lastRow.productId !== "") {
          nextRows.push({
            productId: "",
            description: "",
            tax: "",
            unit: "",
            mrp: "",
            discountPercent: "",
            netPrice: "",
            quantity: "",
            salesPerson: "",
          });
        }

        if (onDone) setTimeout(() => onDone(index + 1, false), 100);
        return nextRows;
      });
    };

    if (found) {
      applyFound(found);
      return;
    }

    if (/^\d+$/.test(query)) {
      axios.get(`${API_BASE_URL}/products/${query}`).then((res) => {
        if (res.data && !isDeletedProduct(res.data)) {
          applyFound(res.data);
          setProducts(prev => [...prev, res.data]);
        } else {
          setError(`❌ Product "${query}" not found or is deleted.`);
          if (onDone) onDone(index, false);
        }
      }).catch(() => {
        setError(`❌ Product "${query}" not found.`);
        if (onDone) onDone(index, false);
      });
    } else {
      setError(`❌ Product "${query}" not found.`);
      if (onDone) onDone(index, false);
    }
  };

  const updateRow = (index, field, value) => {
    const numericFields = ["mrp", "discountPercent", "netPrice", "quantity", "tax"];

    if (field === "productId") {
      setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, productId: value } : row)));
      return;
    }

    setRows((current) => {
      const newRows = current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const updated = { ...row, [field]: numericFields.includes(field) ? Number(value) || 0 : value };

        if (field === "mrp" || field === "discountPercent") {
          const m = Number(updated.mrp) || 0;
          const d = Number(updated.discountPercent) || 0;
          updated.netPrice = money(m - (m * d / 100));
        }

        return updated;
      });

      return newRows;
    });
  };

  const removeRow = (index) => {
    setRows((current) => {
      const next = current.filter((_, rowIndex) => rowIndex !== index);
      if (next.length === 0) {
        return [{
          productId: "",
          description: "",
          tax: "",
          unit: "",
          mrp: "",
          discountPercent: "",
          netPrice: "",
          quantity: "",
          salesPerson: "",
        }];
      }
      return next;
    });

    setTimeout(() => {
      const newIndex = Math.max(0, Math.min(index, rows.length - 2));
      if (rowInputRefs.current[newIndex]) {
        rowInputRefs.current[newIndex].focus();
      }
    }, 50);
  };

  // Calculate payment totals
  const paymentTotals = useMemo(() => {
    const cash = Number(cashReceived) || 0;
    const upi = Number(upiAmount) || 0;
    const card = Number(cardAmount) || 0;
    const online = Number(onlineAmount) || 0;
    const previous = Number(paidBefore) || 0;

    const totalPaid = money(cash + upi + card + online + previous);

    return {
      cash,
      upi,
      card,
      online,
      previous,
      totalPaid
    };
  }, [cashReceived, upiAmount, cardAmount, onlineAmount, paidBefore]);

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
    const taxTotal = activeRows.reduce((sum, row) => {
      const quantity = Number(row.quantity) || 0;
      const netPrice = Number(row.netPrice) || 0;
      const taxPercent = Number(row.tax) || 0;
      return sum + (netPrice * quantity * taxPercent / 100);
    }, 0);
    const manualPercentDiscount = netBeforeDiscount * ((Number(discountPercent) || 0) / 100);
    const manualDiscount = money(manualPercentDiscount + (Number(discountAmount) || 0));
    const billValue = Math.round(Math.max(0, netBeforeDiscount - manualDiscount + taxTotal));

    // Calculate balance/return
    const balanceDue = money(Math.max(0, billValue - paymentTotals.totalPaid));
    const returnAmount = money(Math.max(0, paymentTotals.totalPaid - billValue));

    // For display purposes, "Total Paid" usually means "Amount applied to the bill"
    const displayPaid = Math.min(paymentTotals.totalPaid, billValue);

    // Check if payment is complete (exact amount or overpayment)
    const isPaymentComplete = paymentTotals.totalPaid >= billValue;
    const isExactPayment = paymentTotals.totalPaid === billValue;
    const isOverPayment = paymentTotals.totalPaid > billValue;

    return {
      totalItems,
      totalQuantity,
      mrpTotal: money(mrpTotal),
      netBeforeDiscount,
      manualDiscount,
      taxTotal,
      billValue,
      totalPaid: paymentTotals.totalPaid,
      displayPaid: money(displayPaid),
      balanceDue,
      returnAmount,
      isPaymentComplete,
      isExactPayment,
      isOverPayment,
      totalDiscount: manualDiscount + money(mrpTotal - netBeforeDiscount),
      canSave: paymentTotals.totalPaid >= billValue && billValue > 0,
    };
  }, [rows, discountPercent, discountAmount, paymentTotals]);

  // Update payment fields when numbers change
  const handlePaymentChange = (type, value) => {
    const numValue = value === "" ? "" : Number(value);

    switch (type) {
      case 'cash':
        setCashReceived(numValue);
        break;
      case 'upi':
        setUpiAmount(numValue);
        break;
      case 'card':
        setCardAmount(numValue);
        break;
      case 'online':
        setOnlineAmount(numValue);
        break;
      case 'paidBefore':
        setPaidBefore(numValue);
        break;
      default:
        break;
    }
  };

  const saveBill = async () => {
    // Validate payment before saving
    if (!totals.canSave) {
      if (totals.billValue === 0) {
        setError("Add at least one product before saving.");
      } else if (paymentTotals.totalPaid < totals.billValue) {
        setError(`Payment incomplete. Please pay remaining amount: ₹${totals.balanceDue}`);
      } else if (paymentTotals.totalPaid > totals.billValue) {
        setError(`Overpayment detected. Please return ₹${totals.returnAmount} to customer.`);
      }
      return null;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Determine primary payment method
      let paymentMethod = "cash";
      if (paymentTotals.card > 0) paymentMethod = "card";
      else if (paymentTotals.upi > 0) paymentMethod = "upi";
      else if (paymentTotals.online > 0) paymentMethod = "online";

      const payload = {
        customerName: customerName || "Walk-in Customer",
        customerPhone: mobileNumber,
        customerAddress: address,
        customerType: "external",
        subtotal: totals.mrpTotal,
        discount: totals.totalDiscount,
        discountType: "amount",
        tax: totals.taxTotal,
        taxType: "amount",
        total: totals.billValue,
        paidAmount: Number(totals.displayPaid),
        paymentMethod,
        cashReceived: paymentTotals.cash,
        upiAmount: paymentTotals.upi,
        cardAmount: paymentTotals.card,
        cardNumber,
        onlineAmount: paymentTotals.online,
        onlinePhone,
        onlineRef,
        paidBefore: paymentTotals.previous,
        contact: mobileNumber || contactNumber,
        createdByName: [salesPerson, ...new Set(rows.filter(r => r.salesPerson && r.productId).map(r => r.salesPerson))].filter(Boolean).join(", ") || counter,
        rewardPointsEarned: noRewards ? 0 : totals.billValue * 0.01,
        rewardPointsRedeemed: 0,
        items: rows.filter(r => r.productId && r._dbId).map((row) => ({
          productId: row._dbId,
          quantity: Number(row.quantity) || 1,
          price: Number(row.netPrice) || 0
        })),
      };

      const response = await axios.post(`${API_BASE_URL}/billing/bills`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });

      const savedNumber = response.data?.billNumber || billNo;
      setBillNo(savedNumber);
      setMessage(`Bill saved successfully! Bill No: ${savedNumber}`);
      
      // Clear persistence after successful save
      localStorage.removeItem("bill_draft");
      
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
    if (!totals.canSave) {
      if (totals.billValue === 0) {
        setError("Add products before printing");
      } else if (paymentTotals.totalPaid < totals.billValue) {
        setError(`Cannot print: Payment incomplete. Please pay ₹${totals.balanceDue}`);
      } else if (paymentTotals.totalPaid > totals.billValue) {
        setError(`Cannot print: Overpayment detected. Please return ₹${totals.returnAmount}`);
      }
      return;
    }

    const saved = await saveBill();
    if (saved) setTimeout(() => window.print(), 100);
  };

  const clearBill = () => {
    if (window.confirm("Clear current bill? All data will be lost.")) {
      setRows([{
        productId: "",
        description: "",
        tax: "",
        unit: "",
        mrp: "",
        discountPercent: "",
        netPrice: "",
        quantity: "",
        salesPerson: "",
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
      setOnlineAmount("");
      setOnlinePhone("");
      setOnlineRef("");
      setPaidBefore("");
      setSaleReturn(false);
      setCardBill(false);
      setNoRewards(false);
      setClassicCustomer(false);
      setQuickProductQuery("");
      setMobileSuggestions([]);
      setShowMobileSuggestions(false);
      setBillNo(String(Math.floor(100 + Math.random() * 900)));
      
      // Clear persistence
      localStorage.removeItem("bill_draft");
      
      setMessage("New bill created");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  // Set active row index when focusing
  const handleRowFocus = (index) => {
    setActiveRowIndex(index);
  };

  // Handle quick add key press
  const handleQuickAddKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (quickProductQuery.trim()) {
        addByQuery(quickProductQuery);
        setQuickProductQuery("");
      }
    }
  };

  // Focus quick add input
  const focusQuickAdd = () => {
    if (quickAddInputRef.current) {
      quickAddInputRef.current.focus();
      quickAddInputRef.current.select();
    }
  };

  // Focus first empty product field
  const focusFirstEmptyProductField = () => {
    let targetIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]?.productId || rows[i].productId === "") {
        targetIndex = i;
        break;
      }
    }

    if (targetIndex === -1 && rows.length > 0) {
      targetIndex = rows.length - 1;
    }

    if (targetIndex !== -1 && rowInputRefs.current[targetIndex]) {
      setActiveRowIndex(targetIndex);
      rowInputRefs.current[targetIndex].focus();
      rowInputRefs.current[targetIndex].select();
    }
  };

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      // F2 - Focus Product Search
      if (event.key === 'F2') {
        event.preventDefault();
        event.stopPropagation();
        focusFirstEmptyProductField();
        showTempMessage("success", "⌨️ Product entry active — start typing");
        return;
      }

      // Ctrl+Shift+A OR Insert - Focus Quick Add input
      if ((event.ctrlKey && event.shiftKey && event.key === 'A') || event.key === 'Insert') {
        event.preventDefault();
        focusQuickAdd();
        showTempMessage("success", "⌨️ Quick add active — type product ID/name and press Enter");
        return;
      }

      // F3 - Focus Customer Name
      if (event.key === 'F3') {
        event.preventDefault();
        customerNameRef.current?.focus();
        showTempMessage("success", "⌨️ Customer name focused");
        return;
      }

      // F4 - Focus Mobile Number
      if (event.key === 'F4') {
        event.preventDefault();
        mobileRef.current?.focus();
        showTempMessage("success", "⌨️ Mobile number focused");
        return;
      }

      // F5 - Focus Sales Person
      if (event.key === 'F5') {
        event.preventDefault();
        salesPersonRef.current?.focus();
        showTempMessage("success", "⌨️ Sales person focused");
        return;
      }

      // F6 - Focus Cash Received
      if (event.key === 'F6') {
        event.preventDefault();
        cashReceivedRef.current?.focus();
        showTempMessage("success", "⌨️ Cash received focused");
        return;
      }

      // F7 - Focus Member ID
      if (event.key === 'F7') {
        event.preventDefault();
        memberIdRef.current?.focus();
        showTempMessage("success", "⌨️ Member ID focused");
        return;
      }

      // Ctrl+Enter - Add current quick product
      if ((event.ctrlKey && event.key === 'Enter') && quickProductQuery.trim()) {
        event.preventDefault();
        addByQuery(quickProductQuery);
        setQuickProductQuery("");
        setTimeout(() => quickAddInputRef.current?.focus(), 100);
        showTempMessage("success", "⌨️ Product added");
        return;
      }

      // Ctrl+S - Save Bill
      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        if (rows.filter(r => r.productId && r._dbId).length > 0) {
          saveBill();
        } else {
          setError("Add products before saving");
        }
        return;
      }

      // Ctrl+P - Print Bill
      if ((event.ctrlKey || event.metaKey) && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        if (rows.filter(r => r.productId && r._dbId).length > 0) {
          printBill();
        } else {
          setError("Add products before printing");
        }
        return;
      }

      // Ctrl+N - New/Clear Bill
      if ((event.ctrlKey || event.metaKey) && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        clearBill();
        return;
      }

      // Alt+1 - Toggle Sale Return
      if (event.altKey && event.key === '1') {
        event.preventDefault();
        setSaleReturn(prev => !prev);
        showTempMessage("success", `⌨️ Sale Return: ${!saleReturn ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+2 - Toggle Card Bill
      if (event.altKey && event.key === '2') {
        event.preventDefault();
        setCardBill(prev => !prev);
        showTempMessage("success", `⌨️ Card Bill: ${!cardBill ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+3 - Toggle No Rewards
      if (event.altKey && event.key === '3') {
        event.preventDefault();
        setNoRewards(prev => !prev);
        showTempMessage("success", `⌨️ No Rewards: ${!noRewards ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+4 - Toggle Classic Customer
      if (event.altKey && event.key === '4') {
        event.preventDefault();
        setClassicCustomer(prev => !prev);
        showTempMessage("success", `⌨️ Classic Customer: ${!classicCustomer ? 'ON' : 'OFF'}`);
        return;
      }

      // Alt+C - Focus Card Amount
      if (event.altKey && event.key === 'c') {
        event.preventDefault();
        cardAmountRef.current?.focus();
        showTempMessage("success", "⌨️ Card amount focused");
        return;
      }

      // Alt+U - Focus UPI Amount
      if (event.altKey && event.key === 'u') {
        event.preventDefault();
        upiAmountRef.current?.focus();
        showTempMessage("success", "⌨️ UPI amount focused");
        return;
      }

      // Alt+D - Focus Discount Percent
      if (event.altKey && event.key === 'd') {
        event.preventDefault();
        discountPercentRef.current?.focus();
        showTempMessage("success", "⌨️ Discount percent focused");
        return;
      }

      // Alt+A - Focus Discount Amount
      if (event.altKey && event.key === 'a') {
        event.preventDefault();
        discountAmountRef.current?.focus();
        showTempMessage("success", "⌨️ Discount amount focused");
        return;
      }

      // Delete - Remove last product
      if (event.key === 'Delete' && !isTyping) {
        event.preventDefault();
        const filledRows = rows.filter(r => r.productId && r._dbId);
        if (filledRows.length > 0) {
          for (let i = rows.length - 1; i >= 0; i--) {
            if (rows[i].productId && rows[i]._dbId) {
              removeRow(i);
              break;
            }
          }
          showTempMessage("success", "⌨️ Last product removed");
        }
        return;
      }

      // Escape - Clear error/message and blur focus
      if (event.key === 'Escape') {
        setError("");
        setMessage("");
        setShowMobileSuggestions(false);
        setShowSalesPersonSuggestions(false);
        document.activeElement?.blur();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, saleReturn, cardBill, noRewards, classicCustomer, quickProductQuery, paymentTotals, totals]);

  return (
    <div className="sale-page">
      <style>{saleStyles}</style>

      {/* Shortcut Keys Bar */}
      <div className="shortcut-bar">
        <div className="shortcut-title">🔥 SHORTCUTS:</div>
        <div className="shortcut-list">
          <span><kbd>F2</kbd>🔍Product Entry</span>
          <span><kbd>Insert</kbd>/<kbd>Ctrl+Shift+A</kbd>➕Quick Add</span>
          <span><kbd>F3</kbd>👤Name</span>
          <span><kbd>F4</kbd>📱Mobile</span>
          <span><kbd>F5</kbd>👔Sales</span>
          <span><kbd>F6</kbd>💰Cash</span>
          <span><kbd>F7</kbd>🆔Member ID</span>
          <span><kbd>Ctrl+S</kbd>💾Save</span>
          <span><kbd>Ctrl+P</kbd>🖨️Print</span>
          <span><kbd>Ctrl+N</kbd>🆕New</span>
          <span><kbd>Alt+1-4</kbd>⚙️Toggles</span>
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
            <label className="check"><input type="checkbox" checked={classicCustomer} onChange={(event) => setClassicCustomer(event.target.checked)} /> Use Classic Mode <span className="shortcut-hint">Alt+4</span></label>
            <div className="field-group">
              <label>Member ID <span className="shortcut-hint">F7</span></label>
              <input ref={memberIdRef} value={memberId} onChange={(event) => setMemberId(event.target.value)} />
            </div>
            <div className="mobile-field-group" ref={mobileContainerRef}>
              <label>Classic Customer <span className="shortcut-hint">F4</span></label>
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
            <div className="salesperson-field-group" ref={salesPersonContainerRef}>
              <label>Sales Person <span className="shortcut-hint">F5</span></label>
              <input
                ref={salesPersonRef}
                value={salesPerson}
                onChange={(event) => handleSalesPersonChange(event.target.value)}
                onFocus={() => {
                  if (salesPerson && salesPerson.length > 0) {
                    filterSalesPersonSuggestions(salesPerson);
                  } else if (salesPersonList.length > 0) {
                    setSalesPersonSuggestions(salesPersonList.slice(0, 10));
                    setShowSalesPersonSuggestions(true);
                  }
                }}
                placeholder="Type sales person name"
                autoComplete="off"
              />
              {showSalesPersonSuggestions && salesPersonSuggestions.length > 0 && (
                <div className="salesperson-suggestions">
                  {salesPersonSuggestions.map((name, idx) => (
                    <div
                      key={idx}
                      className="salesperson-suggestion-item"
                      onClick={() => selectSalesPersonSuggestion(name)}
                    >
                      <span className="suggestion-name">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="header-right">
            <div className="clock">{formatDateTime(now)}</div>
            <div className="field-group">
              <label>Name <span className="shortcut-hint">F3</span></label>
              <input ref={customerNameRef} value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </div>
            <button type="button" className="add-member-btn">Add New Member</button>
            <div className="field-group">
              <label>Address</label>
              <textarea value={address} onChange={(event) => setAddress(event.target.value)} rows="2" />
            </div>
            <div className="field-group">
              <label>Contact</label>
              <input value={contactNumber} onChange={(event) => setContactNumber(event.target.value)} placeholder="Additional contact number" />
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 1 }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>Quick Add (<kbd style={{ background: '#333', color: '#fff', padding: '2px 6px', borderRadius: '3px' }}>Insert</kbd>):</span>
            <input
              ref={quickAddInputRef}
              value={quickProductQuery}
              onChange={(e) => setQuickProductQuery(e.target.value)}
              onKeyDown={handleQuickAddKeyDown}
              placeholder="Product ID, Code, or Name then press Enter"
              style={{ flex: 1, minWidth: '250px' }}
            />
            <span className="shortcut-hint">Press Enter to add → automatically moves to next line</span>
          </div>
          <div>
            <button type="button" onClick={saveBill} disabled={loading || !totals.canSave}>
              {loading ? "Saving..." : "Save Bill"}
            </button>
            <button type="button" className="printer" onClick={printBill} disabled={loading || !totals.canSave}>
              Print
            </button>
            <button type="button" onClick={clearBill}>Clear</button>
          </div>
        </div>

        <div className="grid-wrap">
          <table className="sale-grid">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Product Description</th>
                <th>Tax</th>
                <th>Unit</th>
                <th>MRP</th>
                <th>Disc %</th>
                <th>Net Price</th>
                <th>Qty</th>
                <th>Amount</th>
                <th>Sales Person</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const netPrice = money(row.netPrice || (Number(row.mrp) - Number(row.mrp) * ((Number(row.discountPercent) || 0) / 100)));
                const amount = money(netPrice * (Number(row.quantity) || 0));
                return (
                  <tr key={`row-${index}-${row._dbId || 'empty'}`}>
                    <td>
                      <input
                        ref={(el) => { rowInputRefs.current[index] = el; }}
                        value={row.productId}
                        onChange={(event) => updateRow(index, "productId", event.target.value)}
                        onFocus={() => handleRowFocus(index)}
                        onBlur={(event) => {
                          // No action on blur - only on Enter
                        }}
                        onKeyDown={(event) => {
                          if (event.key === '+') {
                            event.preventDefault();
                            if (index > 0) {
                              const prevQtyInput = qtyInputRefs.current[index - 1];
                              if (prevQtyInput) {
                                prevQtyInput.focus();
                                prevQtyInput.select();
                              }
                            }
                            return;
                          }
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const typedValue = event.target.value;
                            if (typedValue) {
                              handleProductSearch(index, typedValue, (targetIndex, isExisting) => {
                                setTimeout(() => {
                                  // For existing product, targetIndex already points to the row with quantity increased
                                  // For new product, targetIndex points to the next empty row
                                  const targetInput = rowInputRefs.current[targetIndex];
                                  if (targetInput) {
                                    targetInput.focus();
                                    targetInput.select();
                                  } else if (targetIndex === rows.length && !isExisting) {
                                    // If we need to focus a newly added row
                                    setTimeout(() => {
                                      const newEmptyIndex = rows.findIndex(r => !r.productId);
                                      if (newEmptyIndex !== -1 && rowInputRefs.current[newEmptyIndex]) {
                                        rowInputRefs.current[newEmptyIndex].focus();
                                      }
                                    }, 50);
                                  }
                                }, 50);
                              });
                            } else {
                              // Move to next row if empty
                              const nextIndex = index + 1;
                              if (nextIndex < rows.length && rowInputRefs.current[nextIndex]) {
                                rowInputRefs.current[nextIndex].focus();
                              } else {
                                focusFirstEmptyProductField();
                              }
                            }
                          }
                        }}
                        placeholder="Product ID (F2 to focus)"
                      />
                    </td>
                    <td><input value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} /></td>
                    <td><input type="number" value={row.tax} onChange={(event) => updateRow(index, "tax", event.target.value)} /></td>
                    <td><input value={row.unit} onChange={(event) => updateRow(index, "unit", event.target.value)} /></td>
                    <td><input type="number" value={row.mrp} onChange={(event) => updateRow(index, "mrp", event.target.value)} /></td>
                    <td><input type="number" value={row.discountPercent} onChange={(event) => updateRow(index, "discountPercent", event.target.value)} /></td>
                    <td><input type="number" value={netPrice} onChange={(event) => updateRow(index, "netPrice", event.target.value)} /></td>
                    <td><input
                      ref={(el) => { qtyInputRefs.current[index] = el; }}
                      type="number" 
                      min="1" 
                      max={row.stock || undefined} 
                      value={row.quantity} 
                      onChange={(event) => updateRow(index, "quantity", event.target.value)} 
                    /></td>
                    <td className="amount-cell">{amount}</td>
                    <td className="action-cell" style={{ position: 'relative' }}>
                      <div className="sp-suggestion-container" style={{ flex: 1 }}>
                        <input 
                          value={row.salesPerson || ""} 
                          onChange={(event) => {
                            updateRow(index, "salesPerson", event.target.value);
                            filterSPSuggestions(event.target.value, index);
                          }} 
                          onFocus={() => {
                            setActiveRowIndex(index);
                            if (row.salesPerson) filterSPSuggestions(row.salesPerson, index);
                          }}
                          autoComplete="off"
                        />
                        {showSPSuggestions && activeSPIndex === index && (
                          <div className="sp-suggestions">
                            {spSuggestions.map((sp, idx) => (
                              <div key={idx} className="sp-suggestion-item" onClick={() => selectSPSuggestion(sp.full_name, index)}>
                                {sp.full_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button type="button" className="row-delete" onClick={() => removeRow(index)}>✕</button>
                    </td>
                  </tr>
                );
              })}
              {blankRows.slice(0, Math.max(0, 8 - rows.length)).map((item) => (
                <tr key={`empty-${item}`} className="empty-row">
                  <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="footer-panel">
          <div className="footer-col">
            <div className="info-row"><span>TOTAL ITEMS</span><strong>{totals.totalItems}</strong></div>
            <div className="info-row"><span>TOTAL QUANTITY</span><strong>{totals.totalQuantity}</strong></div>
            <div className="price-strip">
              <div><span>MRP Total</span><strong>₹{Math.round(totals.mrpTotal)}</strong></div>
              <div><span>Net Total</span><strong>₹{Math.round(totals.billValue)}</strong></div>
            </div>
          </div>

          <div className="footer-col">
            <div className="section-title">Payment Details</div>
            <div className="info-row">
              <span>Bill Amount</span>
              <input value={totals.billValue} readOnly className={totals.billValue > 0 ? "amount-highlight" : ""} />
            </div>
            <div className="info-row">
              <span style={{ color: '#60a5fa' }}>Total Tax</span>
              <input value={totals.taxTotal.toFixed(2)} readOnly style={{ color: '#60a5fa', fontWeight: 'bold' }} />
            </div>
            <div className="info-row">
              <span style={{ color: '#f87171' }}>Total Discount</span>
              <input value={totals.totalDiscount.toFixed(2)} readOnly style={{ color: '#f87171', fontWeight: 'bold' }} />
            </div>
            <div className="info-row">
              <span>Discount % <span className="shortcut-hint">Alt+D</span></span>
              <input ref={discountPercentRef} value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} />
            </div>
            <div className="info-row">
              <span>Discount Amt <span className="shortcut-hint">Alt+A</span></span>
              <input ref={discountAmountRef} value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} />
            </div>
            <div className="info-row">
              <span>Cash Received <span className="shortcut-hint">F6</span></span>
              <input
                ref={cashReceivedRef}
                type="number"
                value={cashReceived}
                onChange={(event) => handlePaymentChange('cash', event.target.value)}
              />
            </div>
            <div className="info-row">
              <span>UPI Amount <span className="shortcut-hint">Alt+U</span></span>
              <input
                ref={upiAmountRef}
                type="number"
                value={upiAmount}
                onChange={(event) => handlePaymentChange('upi', event.target.value)}
              />
            </div>
            <div className="info-row">
              <span>Card Amount <span className="shortcut-hint">Alt+C</span></span>
              <input
                ref={cardAmountRef}
                type="number"
                value={cardAmount}
                onChange={(event) => handlePaymentChange('card', event.target.value)}
              />
            </div>
            <div className="info-row">
              <span>Paid Before</span>
              <input type="number" value={paidBefore} onChange={(event) => handlePaymentChange('paidBefore', event.target.value)} />
            </div>
            <div className="info-row">
              <span>Total Paid</span>
              <input value={totals.displayPaid} readOnly className={totals.totalPaid >= totals.billValue ? "payment-success" : "payment-pending"} />
            </div>
            <button type="button" className="print-btn" onClick={printBill} disabled={!totals.canSave}>
              🖨️ Print
            </button>
          </div>

          <div className="footer-col">
            <div className="section-title">Online Payment</div>
            <div className="info-row">
              <span>Online Amount</span>
              <input
                type="number"
                value={onlineAmount}
                onChange={(e) => handlePaymentChange('online', e.target.value)}
              />
            </div>
            <div className="info-row">
              <span>Phone No</span>
              <input value={onlinePhone} onChange={(e) => setOnlinePhone(e.target.value)} />
            </div>
            <div className="info-row">
              <span>Reference ID</span>
              <input value={onlineRef} onChange={(e) => setOnlineRef(e.target.value)} />
            </div>
          </div>

          <div className="footer-col">
            <div className="section-title">Card Details</div>
            <div className="info-row">
              <span>Card Number</span>
              <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
            </div>
          </div>

          <div className="footer-col">
            <div className="section-title">Reward Details</div>
            <div className="info-row"><span>Available Points</span><input value={availablePoints} readOnly /></div>
            <div className="info-row"><span>Points to Redeem</span><input readOnly placeholder="0" /></div>
            <div className="info-row"><span>Reward Amount</span><input readOnly placeholder="₹0" /></div>
          </div>

          <div className="pay-board">
            <div className="pay-card">
              <div className="pay-label">TOTAL BILL</div>
              <div className="pay-value">₹{Math.round(totals.billValue)}</div>
            </div>
            <div className="pay-card">
              <div className="pay-label">TOTAL PAID</div>
              <div className="pay-value">₹{Math.round(totals.displayPaid)}</div>
            </div>
            <div className="pay-card">
              <div className="pay-label">BALANCE DUE</div>
              <div className="pay-value" style={{ color: totals.balanceDue > 0 ? '#ff6b6b' : '#51cf66' }}>
                ₹{Math.round(totals.balanceDue)}
              </div>
            </div>
            <div className="pay-card return-card">
              <div className="pay-label">RETURN</div>
              <div className="pay-value">₹{Math.round(totals.returnAmount)}</div>
            </div>
            {!totals.canSave && totals.billValue > 0 && (
              <div className="payment-warning">
                {paymentTotals.totalPaid < totals.billValue ?
                  `⚠️ Need ₹${Math.round(totals.balanceDue)} more` :
                  paymentTotals.totalPaid > totals.billValue ?
                    `⚠️ Overpayment by ₹${Math.round(totals.returnAmount)}` :
                    "⚠️ Payment required"}
              </div>
            )}
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
            <table>
              <th className="r-desc">Description</th>
              <th className="r-num">Qty</th>
              <th className="r-num">Rate</th>
              <th className="r-num">Amt</th>
            </table>
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

        <div className="receipt-payment-breakdown">
          <div className="receipt-row"><span>Bill Amount:</span><span>₹ {Math.round(totals.billValue)}</span></div>
          {paymentTotals.cash > 0 && <div className="receipt-row"><span>Cash:</span><span>₹ {Math.round(paymentTotals.cash)}</span></div>}
          {paymentTotals.upi > 0 && <div className="receipt-row"><span>UPI:</span><span>₹ {Math.round(paymentTotals.upi)}</span></div>}
          {paymentTotals.card > 0 && <div className="receipt-row"><span>Card:</span><span>₹ {Math.round(paymentTotals.card)}</span></div>}
          {paymentTotals.online > 0 && <div className="receipt-row"><span>Online:</span><span>₹ {Math.round(paymentTotals.online)}</span></div>}
          {paymentTotals.previous > 0 && <div className="receipt-row"><span>Paid Before:</span><span>₹ {Math.round(paymentTotals.previous)}</span></div>}
          <div className="receipt-row receipt-total-paid"><span>Total Paid:</span><span>₹ {Math.round(totals.displayPaid)}</span></div>
          {totals.returnAmount > 0 && (
            <div className="receipt-row receipt-return"><span>Return Amount:</span><span>₹ {Math.round(totals.returnAmount)}</span></div>
          )}
        </div>

        <div className="receipt-dash" />

        <div className="receipt-summary">
          <div className="receipt-row"><span>Total Pieces:</span><span>{totals.totalQuantity}</span></div>
          <div className="receipt-row"><span>MRP Total:</span><span>₹ {Math.round(totals.mrpTotal)}</span></div>
          <div className="receipt-row receipt-savings">
            <span>You Saved:</span>
            <span>₹ {Math.round(totals.mrpTotal - totals.billValue)}</span>
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

  .salesperson-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
  }

  .salesperson-field-group label {
    min-width: 70px;
    font-weight: 600;
    color: #333;
  }

  .salesperson-field-group input {
    height: 26px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 8px;
    font: inherit;
    border-radius: 3px;
    width: 180px;
  }

  .salesperson-suggestions {
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

  .salesperson-suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #eee;
    transition: background 0.2s;
  }

  .salesperson-suggestion-item:hover {
    background: #e3f2fd;
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

  .quick-add {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: #e8e8e8;
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

  .quick-add button:hover:not(:disabled) {
    background: #333;
  }

  .quick-add button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

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
    width: 120px;
    height: 26px;
    border: 1px solid #ccc;
    background: #fff;
    padding: 2px 6px;
    border-radius: 3px;
    text-align: right;
  }

  .info-row input.amount-highlight {
    background: #fff3cd;
    border-color: #ffc107;
    font-weight: bold;
  }

  .info-row input.payment-success {
    background: #d4edda;
    border-color: #28a745;
    color: #155724;
    font-weight: bold;
  }

  .info-row input.payment-pending {
    background: #fff3cd;
    border-color: #ffc107;
  }

  .section-title {
    font-weight: 700;
    margin-bottom: 6px;
    color: #2c3e50;
    font-size: 12px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 3px;
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

  .print-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

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

  .payment-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 8px;
    border-radius: 6px;
    font-size: 11px;
    text-align: center;
    font-weight: bold;
    margin-top: 8px;
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
    .receipt-logo {
      text-align: center;
      margin-bottom: 6px;
    }
    .receipt-logo-img {
      width: 62px;
      height: 62px;
      object-fit: contain;
      display: inline-block;
    }
    .receipt-shop { font-size: 15px; font-weight: 900; text-align: center; }
    .receipt-dash { border-top: 1px dashed #000; margin: 5px 0; }
    .receipt-table { width: 100%; border-collapse: collapse; }
    .receipt-table th, .receipt-table td { padding: 4px 2px; }
    .r-desc { text-align: left; }
    .r-num { text-align: right; }
    .receipt-payment-breakdown { margin: 10px 0; }
    .receipt-row { display: flex; justify-content: space-between; margin: 3px 0; }
    .receipt-total-paid { font-weight: bold; margin-top: 5px; padding-top: 5px; border-top: 1px dashed #000; }
    .receipt-return { color: #dc3545; font-weight: bold; }
    .receipt-thankyou { text-align: center; margin-top: 10px; }
    .receipt-qr { display: flex; justify-content: space-around; margin-top: 10px; }
    .receipt-qr img { width: 52px; height: 52px; }
  }

  /* Sales Person Suggestions */
  .sp-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 200px;
    overflow-y: auto;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .sp-suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    font-size: 12px;
    color: #333;
    transition: background 0.2s;
    text-align: left;
  }
  .sp-suggestion-item:hover {
    background: #e3f2fd;
    color: #0066cc;
  }
  .sp-suggestion-container {
    position: relative;
    width: 100%;
  }
`;