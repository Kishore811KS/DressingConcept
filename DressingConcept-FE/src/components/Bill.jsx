import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

const TAX_PERCENT = 5;
const DEFAULT_UNIT = "PCS";

const pad = (value) => String(value).padStart(2, "0");

const formatBillNo = (val, type = 'N') => {
  if (val === null || val === undefined || val === "") return type === 'R' ? "1R" : "1N";
  const str = String(val).trim();
  const rawSeq = str.includes('/') ? str.split('/').pop() : str;
  const cleanDigits = rawSeq.replace(/\D/g, "");
  if (!cleanDigits) return str;
  const num = parseInt(cleanDigits, 10);
  let suffix = type === 'R' ? 'R' : 'N';
  if (rawSeq.toUpperCase().endsWith('R')) suffix = 'R';
  else if (rawSeq.toUpperCase().endsWith('N')) suffix = 'N';
  return isNaN(num) ? str : `${num}${suffix}`;
};

const formatDate = (date) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${pad(date.getDate())}-${months[date.getMonth()]}-${date.getFullYear()}`;
};

const formatDateTime = (date) => {
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const displayHours = pad(date.getHours() % 12 || 12);
  return `${formatDate(date)} ${displayHours}:${minutes} ${ampm}`;
};

const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
const blankRows = Array.from({ length: 8 }, (_, index) => index);

export default function Bill() {
  const navigate = useNavigate();
  const location = useLocation();

  const requestFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err) => console.warn("Fullscreen request error:", err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      }
    }
  };

  // Fullscreen mode auto-trigger and auto-restore on entering Bill page
  useEffect(() => {
    requestFullScreen();

    const handleGlobalClick = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) {
        requestFullScreen();
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  const loggedInUserName = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.full_name || user.username || user.name || user.email || "Admin";
    } catch (err) {
      return "Admin";
    }
  }, []);

  const [loading, setLoading] = useState(false);

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
  const [showSaleReturnModal, setShowSaleReturnModal] = useState(false);
  const [saleReturnBillInput, setSaleReturnBillInput] = useState("");
  const [isSaleReturnMode, setIsSaleReturnMode] = useState(false);
  const [originalBillNumber, setOriginalBillNumber] = useState("");
  const saleReturnBillInputRef = useRef(null);
  const [redeemedPoints, setRedeemedPoints] = useState(() => getSavedState("redeemedPoints", 0));
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsInput, setPointsInput] = useState("");
  const [pointsError, setPointsError] = useState("");
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
  const [salesReturnAmount, setSalesReturnAmount] = useState(() => getSavedState("salesReturnAmount", ""));
  const [isEmployeeCustomer, setIsEmployeeCustomer] = useState(() => getSavedState("isEmployeeCustomer", false));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Handle pre-filled employee/customer data passed via route navigation
  useEffect(() => {
    if (location.state?.selectedCustomer || location.state?.employee) {
      const cust = location.state.selectedCustomer || location.state.employee;
      if (cust.name || cust.full_name) {
        setCustomerName(cust.name || cust.full_name);
      }
      if (cust.phone || cust.phone_number) {
        setMobileNumber(cust.phone || cust.phone_number);
        setContactNumber(cust.phone || cust.phone_number);
      }
      if (cust.memberId || cust.employee_id) {
        setMemberId(cust.memberId || cust.employee_id);
      }
      const pts = Number(cust.reward_points || cust.rewardPoints || cust.points || 0);
      if (!isNaN(pts)) setAvailablePoints(pts);

      setIsEmployeeCustomer(true);
      setMessage(`💼 Pre-loaded Employee: ${cust.name || cust.full_name}`);
    }
  }, [location.state]);
  const [now, setNow] = useState(new Date());
  const [quickProductQuery, setQuickProductQuery] = useState("");
  const [mobileSuggestions, setMobileSuggestions] = useState([]);
  const [showMobileSuggestions, setShowMobileSuggestions] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState(0);

  const [employees, setEmployees] = useState([]);
  const [spSuggestions, setSPSuggestions] = useState([]);
  const [showSPSuggestions, setShowSPSuggestions] = useState(false);
  const [activeSPIndex, setActiveSPIndex] = useState(-1);
  const [products, setProducts] = useState([]);
  const [totalStockInStore, setTotalStockInStore] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [memberIdSuggestions, setMemberIdSuggestions] = useState([]);
  const [showMemberIdSuggestions, setShowMemberIdSuggestions] = useState(false);
  const [highlightedMemberIdIndex, setHighlightedMemberIdIndex] = useState(-1);
  const [customerNameSuggestions, setCustomerNameSuggestions] = useState([]);
  const [showCustomerNameSuggestions, setShowCustomerNameSuggestions] = useState(false);
  const [highlightedCustomerNameIndex, setHighlightedCustomerNameIndex] = useState(0);
  const [availablePoints, setAvailablePoints] = useState(() => getSavedState("availablePoints", 0));
  const [billNumberSuggestions, setBillNumberSuggestions] = useState([]);
  const [showBillNumberSuggestions, setShowBillNumberSuggestions] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isReprintMode, setIsReprintMode] = useState(false);

  // ── Permissions Check for Edit Bill Number ──
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const userType = user?.user_type || "";
  const [permissions, setPermissions] = useState(user?.permissions || []);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const employeeId = user.id || user.employee_id || "";
        const response = await api.get(`/permissions?userType=${userType}&employeeId=${employeeId}`);
        if (Array.isArray(response.data)) {
          setPermissions(response.data);
        }
      } catch (err) {
        console.error("Error fetching permissions:", err);
      }
    };
    fetchPermissions();
  }, [userType]);

  const canEditBillNo = useMemo(() => {
    const roleLower = String(userType).toLowerCase();
    if (roleLower === 'admin' || roleLower === 'super admin') return true;
    if (!Array.isArray(permissions)) return false;
    const perm = permissions.find(p => p.submodule_id === 'bill_number_edit');
    return perm ? (perm.view === true || perm.edit === true) : false;
  }, [userType, permissions]);

  // ── Member Registration Form State ──
  const [regName, setRegName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regAddress, setRegAddress] = useState("");
  const [regError, setRegError] = useState("");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const rowInputRefs = useRef([]);
  const qtyInputRefs = useRef([]);
  const customerNameRef = useRef(null);
  const mobileRef = useRef(null);
  const memberIdRef = useRef(null);
  const salesPersonRef = useRef(null);
  const cashReceivedRef = useRef(null);
  const upiAmountRef = useRef(null);
  const cardAmountRef = useRef(null);
  const onlineAmountRef = useRef(null);
  const salesReturnAmountRef = useRef(null);
  const discountPercentRef = useRef(null);
  const discountAmountRef = useRef(null);
  const quickAddInputRef = useRef(null);
  const printButtonRef = useRef(null);
  const mobileContainerRef = useRef(null);
  const salesPersonContainerRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const filterMemberIdSuggestions = (query) => {
    const q = String(query || "").trim().toLowerCase();
    if (!q || q.length < 1) {
      setMemberIdSuggestions([]);
      setShowMemberIdSuggestions(false);
      setHighlightedMemberIdIndex(-1);
      return;
    }
    const matches = (customers || []).filter((c) => {
      const phoneStr = String(c.phone || c.contact || c.mobile || "");
      const idStr = String(c.member_id || c.id || "");
      const nameStr = String(c.name || c.full_name || "").toLowerCase();
      return phoneStr.includes(q) || idStr.includes(q) || nameStr.includes(q);
    }).slice(0, 8);

    setMemberIdSuggestions(matches);
    setShowMemberIdSuggestions(matches.length > 0);
    setHighlightedMemberIdIndex(matches.length > 0 ? 0 : -1);
  };

  const selectMemberIdSuggestion = (customer) => {
    const phone = customer.phone || customer.contact || customer.mobile || "";
    const name = customer.name || customer.full_name || customer.customer_name || "Walk-in Customer";
    const addr = customer.address || "";
    const points = customer.reward_points || customer.rewardPoints || 0;
    const id = customer.member_id || customer.id || phone;

    setMemberId(String(id));
    if (name !== 'Walk-in Customer') setCustomerName(name);
    if (phone) setMobileNumber(phone);
    if (phone) setContactNumber(phone);
    if (addr) setAddress(addr);
    setAvailablePoints(points);
    const returnAmt = Number(customer.salesReturnAmount || customer.sales_return_amount || customer.salesReturn || 0);
    if (returnAmt > 0) {
      setSalesReturnAmount(returnAmt);
    }

    setSelectedMember({
      memberId: String(id),
      name,
      phone,
      address: addr,
      points,
      salesReturnAmount: returnAmt,
      isFound: true
    });
    setShowMemberIdSuggestions(false);
    setShowMemberModal(true);
  };

  const filterCustomerNameSuggestions = (value) => {
    const query = String(value || "").trim().toLowerCase();
    if (!query) {
      setCustomerNameSuggestions([]);
      setShowCustomerNameSuggestions(false);
      return;
    }
    const matches = (customers || []).filter((c) => {
      const name = String(c.name || c.full_name || c.customer_name || "").toLowerCase();
      const phone = String(c.phone || c.contact || "").toLowerCase();
      return name.includes(query) || phone.includes(query);
    }).slice(0, 10);

    setCustomerNameSuggestions(matches);
    setShowCustomerNameSuggestions(matches.length > 0);
    setHighlightedCustomerNameIndex(0);
  };

  const selectCustomerNameSuggestion = (cust) => {
    const name = cust.name || cust.full_name || cust.customer_name || "Walk-in Customer";
    const phone = cust.phone || cust.contact || cust.mobile || cust.contact_number || "";
    const addr = cust.address || "";
    const points = cust.reward_points || cust.rewardPoints || 0;
    const id = cust.member_id || cust.id || phone;

    setCustomerName(name);
    if (phone) {
      setMemberId(String(phone));
      setMobileNumber(phone);
      setContactNumber(phone);
    }
    if (addr) setAddress(addr);
    setAvailablePoints(points);
    const returnAmt = Number(cust.salesReturnAmount || cust.sales_return_amount || cust.salesReturn || 0);
    if (returnAmt > 0) {
      setSalesReturnAmount(returnAmt);
    }
    setShowCustomerNameSuggestions(false);
    showTempMessage("success", `✅ Selected Customer: ${name} (${points} Pts${returnAmt > 0 ? `, Return: ₹${returnAmt}` : ''})`);
  };

  const handleCustomerNameKeyDown = async (e) => {
    if (showCustomerNameSuggestions && customerNameSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedCustomerNameIndex((prev) => (prev + 1) % customerNameSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedCustomerNameIndex((prev) => (prev - 1 + customerNameSuggestions.length) % customerNameSuggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const indexToSelect = highlightedCustomerNameIndex >= 0 && highlightedCustomerNameIndex < customerNameSuggestions.length
          ? highlightedCustomerNameIndex
          : 0;
        selectCustomerNameSuggestion(customerNameSuggestions[indexToSelect]);
        return;
      }
      if (e.key === 'Escape') {
        setShowCustomerNameSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const query = String(customerName || "").trim();
      if (!query) {
        showTempMessage("error", "Please enter a Customer Name");
        return;
      }

      setShowCustomerNameSuggestions(false);

      const queryLower = query.toLowerCase();
      let matchedCust = (customers || []).find((c) => {
        const name = String(c.name || c.full_name || c.customer_name || "").toLowerCase();
        const phone = String(c.phone || c.contact || c.mobile || "").toLowerCase();
        return name === queryLower || phone === queryLower || name.includes(queryLower);
      });

      if (!matchedCust) {
        try {
          const response = await api.get(`/billing/customer/${encodeURIComponent(query)}`);
          if (response.data?.exists && response.data?.customer) {
            matchedCust = response.data.customer;
          }
        } catch (_) { }
      }

      if (matchedCust) {
        selectCustomerNameSuggestion(matchedCust);
      } else {
        showTempMessage("info", `Customer Name set: ${query}`);
      }
    }
  };

  const handleMemberIdKeyDown = async (e) => {
    if (showMemberIdSuggestions && memberIdSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedMemberIdIndex((prev) => (prev + 1) % memberIdSuggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedMemberIdIndex((prev) => (prev - 1 + memberIdSuggestions.length) % memberIdSuggestions.length);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedMemberIdIndex >= 0 && highlightedMemberIdIndex < memberIdSuggestions.length) {
          selectMemberIdSuggestion(memberIdSuggestions[highlightedMemberIdIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setShowMemberIdSuggestions(false);
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const query = memberId.trim();
      if (!query) {
        showTempMessage("error", "Please enter a Member ID");
        return;
      }
      setShowMemberIdSuggestions(false);
      setLoading(true);
      try {
        let memberData = null;

        // Try direct API lookup
        try {
          const response = await api.get(`/billing/customer/${encodeURIComponent(query)}`);
          if (response.data?.exists && response.data?.customer) {
            memberData = response.data.customer;
          }
        } catch (_) { }

        // Fallback search in loaded customers array
        if (!memberData) {
          memberData = customers.find(c =>
            String(c.id) === query ||
            String(c.phone) === query ||
            (c.member_id && String(c.member_id) === query) ||
            (c.name && c.name.toLowerCase() === query.toLowerCase())
          );
        }

        if (memberData) {
          const name = memberData.name || memberData.full_name || memberData.customer_name || "N/A";
          const phone = memberData.phone || memberData.contact || memberData.mobile || memberData.contact_number || "N/A";
          const addr = memberData.address || "N/A";
          const points = memberData.reward_points || memberData.rewardPoints || 0;

          setCustomerName(name);
          setMobileNumber(phone !== "N/A" ? phone : "");
          setContactNumber(phone !== "N/A" ? phone : "");
          setAddress(addr !== "N/A" ? addr : "");
          setAvailablePoints(points);

          setSelectedMember({
            memberId: query,
            name,
            phone,
            address: addr,
            points,
            isFound: true
          });
          setShowMemberModal(true);
          showTempMessage("success", "Member details retrieved");
        } else {
          // Member Not Found -> Prepare registration form inside pop-up modal
          setSelectedMember({
            memberId: query,
            isFound: false
          });
          setRegName("");
          setRegPhone(query);
          setRegAddress("");
          setRegError("");
          setShowMemberModal(true);
        }
      } catch (err) {
        console.error("Error fetching member details:", err);
        setSelectedMember({
          memberId: query,
          isFound: false
        });
        setRegName("");
        setRegPhone(query);
        setRegAddress("");
        setRegError("");
        setShowMemberModal(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSaveNewCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!regName.trim()) {
      setRegError("Customer Name is required");
      return;
    }
    if (!regPhone.trim()) {
      setRegError("Contact Number is required");
      return;
    }

    setSavingCustomer(true);
    setRegError("");

    try {
      const payload = {
        name: regName.trim(),
        phone: regPhone.trim(),
        address: regAddress.trim()
      };

      await api.post('/billing/customers', payload);

      const newCust = {
        name: regName.trim(),
        phone: regPhone.trim(),
        address: regAddress.trim(),
        reward_points: 0
      };

      // Automatically link newly created customer to current bill
      setMemberId(regPhone.trim());
      setCustomerName(regName.trim());
      setContactNumber(regPhone.trim());
      setMobileNumber(regPhone.trim());
      setAddress(regAddress.trim());
      setAvailablePoints(0);

      // Update local customers cache
      setCustomers(prev => {
        const exists = prev.some(c => c.phone === newCust.phone);
        return exists ? prev : [...prev, newCust];
      });

      setShowMemberModal(false);
      showTempMessage("success", `✅ Customer "${regName.trim()}" registered and linked to current bill!`);
    } catch (err) {
      console.error("Error registering new customer:", err);
      setRegError(err.response?.data?.error || "Failed to save customer. Please check server connection.");
    } finally {
      setSavingCustomer(false);
    }
  };

  const fetchNextBillNumber = async (type = 'N') => {
    try {
      const response = await api.get(`/billing/next-bill-number?type=${type}`);
      if (response.data?.nextBillNumber) {
        setBillNo(response.data.nextBillNumber);
        return response.data.nextBillNumber;
      }
    } catch (err) {
      console.error("Error fetching next bill number:", err);
    }
    const fallback = `${String(Math.floor(1000 + Math.random() * 8999)).padStart(4, "0")}${type}`;
    setBillNo(fallback);
    return fallback;
  };

  useEffect(() => {
    fetchNextBillNumber();
    loadProducts();
    loadCustomers();
    loadEmployees();
    loadStockStatistics();
    const statsInterval = setInterval(loadStockStatistics, 10000);
    return () => clearInterval(statsInterval);
  }, []);

  const loadStockStatistics = async () => {
    try {
      const response = await api.get(`/products/statistics`);
      setTotalStockInStore(response.data.total_quantity || 0);
    } catch (err) {
      console.error("Error loading statistics:", err);
    }
  };

  useEffect(() => {
    const state = {
      rows, billNo, counter, customerName, memberId, mobileNumber, salesPerson,
      address, saleReturn, redeemedPoints, classicCustomer, cashReceived,
      upiAmount, cardAmount, cardNumber, discountPercent, discountAmount,
      onlineAmount, onlinePhone, onlineRef, paidBefore, contactNumber, salesReturnAmount,
      isEmployeeCustomer, availablePoints
    };
    localStorage.setItem("bill_draft", JSON.stringify(state));
  }, [
    rows, billNo, counter, customerName, memberId, mobileNumber, salesPerson,
    address, saleReturn, redeemedPoints, classicCustomer, cashReceived,
    upiAmount, cardAmount, cardNumber, discountPercent, discountAmount,
    onlineAmount, onlinePhone, onlineRef, paidBefore, contactNumber, salesReturnAmount,
    isEmployeeCustomer, availablePoints
  ]);

  useEffect(() => {
    if (!message && !error) return undefined;
    const timer = setTimeout(() => {
      setMessage("");
      setError("");
    }, 3500);
    return () => clearTimeout(timer);
  }, [message, error]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileContainerRef.current && !mobileContainerRef.current.contains(event.target)) {
        setShowMobileSuggestions(false);
      }
      if (salesPersonContainerRef.current && !salesPersonContainerRef.current.contains(event.target)) {
        setShowSPSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const formatPts = (val) => {
    const num = Number(val) || 0;
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  useEffect(() => {
    const queryPhone = String(mobileNumber || contactNumber || "").trim();
    const queryId = String(memberId || "").trim();
    const queryName = String(customerName || "").trim().toLowerCase();

    if (!queryPhone && !queryId && (!queryName || queryName === "walk-in customer")) {
      setAvailablePoints(0);
      return;
    }

    if (!customers || customers.length === 0) return;

    const matchedCust = customers.find(c => {
      const p = String(c.phone || c.contact || c.mobile || "").trim();
      const id = String(c.member_id || c.id || "").trim();
      const n = String(c.name || c.full_name || c.customer_name || "").trim().toLowerCase();
      return (queryPhone && p && p === queryPhone) ||
        (queryId && id && id === queryId) ||
        (queryName && queryName !== "walk-in customer" && n === queryName);
    });

    if (matchedCust) {
      const pts = Number(matchedCust.reward_points || matchedCust.rewardPoints || matchedCust.points || 0);
      setAvailablePoints(isNaN(pts) ? 0 : pts);
    } else {
      // New customer not yet in DB -> prior available points are 0
      setAvailablePoints(0);
    }
  }, [customers, mobileNumber, memberId, customerName, contactNumber]);

  const showTempMessage = (type, text) => {
    if (type === "success") setMessage(text);
    else setError(text);
  };

  const loadEmployees = async () => {
    try {
      const response = await api.get(`/employees`);
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

  const handleSalesPersonChange = (value) => {
    setSalesPerson(value);
    filterSPSuggestions(value, -1);
  };

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

  const selectMobileSuggestion = (customer) => {
    setMobileNumber(customer.phone);
    if (customer.name && customer.name !== 'Walk-in Customer') setCustomerName(customer.name);
    if (customer.address) setAddress(customer.address);
    if (customer.type === 'classic') setClassicCustomer(true);
    setAvailablePoints(customer.reward_points || customer.rewardPoints || 0);
    const returnAmt = Number(customer.salesReturnAmount || customer.sales_return_amount || customer.salesReturn || 0);
    if (returnAmt > 0) {
      setSalesReturnAmount(returnAmt);
    }
    setShowMobileSuggestions(false);
    salesPersonRef.current?.focus();
  };

  const fetchCustomerDetails = async (value) => {
    try {
      const response = await api.get(`/billing/customer/${value}`);
      if (response.data?.exists) {
        const cust = response.data.customer;
        if (cust.name && cust.name !== 'Walk-in Customer') setCustomerName(cust.name);
        if (cust.address) setAddress(cust.address);
        if (cust.type === 'classic') setClassicCustomer(true);
        const pts = Number(cust.reward_points || cust.rewardPoints || cust.points || 0);
        setAvailablePoints(isNaN(pts) ? 0 : pts);
        const returnAmt = Number(cust.salesReturnAmount || cust.sales_return_amount || cust.salesReturn || 0);
        if (returnAmt > 0) {
          setSalesReturnAmount(returnAmt);
        }
      } else {
        const match = (customers || []).find(c =>
          String(c.phone || c.contact || c.mobile || "") === String(value) ||
          String(c.member_id || c.id || "") === String(value)
        );
        if (match) {
          const pts = Number(match.reward_points || match.rewardPoints || match.points || 0);
          setAvailablePoints(isNaN(pts) ? 0 : pts);
          const returnAmt = Number(match.salesReturnAmount || match.sales_return_amount || match.salesReturn || 0);
          if (returnAmt > 0) {
            setSalesReturnAmount(returnAmt);
          }
        } else {
          setAvailablePoints(0);
        }
        if (!customerName || customerName === 'Walk-in Customer') {
          setCustomerName("");
        }
      }
    } catch (err) {
      console.error("Could not fetch customer details", err);
      const match = (customers || []).find(c =>
        String(c.phone || c.contact || c.mobile || "") === String(value) ||
        String(c.member_id || c.id || "") === String(value)
      );
      if (match) {
        const pts = Number(match.reward_points || match.rewardPoints || match.points || 0);
        setAvailablePoints(isNaN(pts) ? 0 : pts);
      } else {
        setAvailablePoints(0);
      }
    }
  };

  const handleApplyPoints = () => {
    const pts = Number(pointsInput);
    if (pointsInput === "" || isNaN(pts) || pts < 0) {
      setPointsError("Please enter a valid non-negative number of points.");
      return;
    }
    if (pts > availablePoints) {
      setPointsError(`Cannot redeem ${pts} points. Customer only has ${availablePoints} available points.`);
      return;
    }
    const netBeforePoints = totals.netBeforeDiscount - totals.manualDiscount;
    if (pts * 2 > netBeforePoints && netBeforePoints > 0) {
      setPointsError(`Redemption value (₹${pts * 2}) cannot exceed net bill amount (₹${netBeforePoints}).`);
      return;
    }

    setRedeemedPoints(pts);
    setShowPointsModal(false);
    showTempMessage("success", `Applied ${pts} reward points (-₹${pts * 2} discount)`);
  };

  const handleRemovePoints = () => {
    setRedeemedPoints(0);
    setPointsInput("");
    setShowPointsModal(false);
    showTempMessage("success", "Cleared points redemption");
  };


  const fetchBillForReprint = async (queryBillNo) => {
    if (!queryBillNo || String(queryBillNo).trim().length === 0) return;
    const formatted = formatBillNo(String(queryBillNo).trim());
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.get(`/billing/bills/number/${formatted}`);
      if (response.data) {
        const bill = response.data;

        // 1. Customer Details
        const custPhone = bill.customer?.phone || bill.customer_phone || bill.contact || bill.customerPhone || "";
        const custName = bill.customer?.name || bill.customer_name || bill.customerName || "Walk-in Customer";
        const custAddr = bill.customer?.address || bill.customer_address || bill.customerAddress || "";

        setBillNo(bill.billNumber || formatted);
        setCustomerName(custName);
        setMobileNumber(custPhone);
        setContactNumber(custPhone);
        setAddress(custAddr);
        setSalesPerson(bill.createdByName || bill.created_by_name || "");

        // 2. Items / Products Details
        if (Array.isArray(bill.items) && bill.items.length > 0) {
          const loadedRows = bill.items.map((item) => {
            const sellPrice = item.sellPrice || item.sell_price || item.mrp || 0;
            const qty = item.quantity || 1;
            const disc = item.discountPercent || item.discount_percent || 0;
            return {
              productId: item.productCode || item.product_code || String(item.productId || item.product_id || ""),
              _dbId: item.productId || item.product_id,
              description: item.productName || item.product_name || "",
              tax: item.tax || 0,
              unit: item.unit || "PCS",
              mrp: sellPrice,
              discountPercent: disc,
              netPrice: sellPrice,
              quantity: qty,
              salesPerson: bill.createdByName || bill.created_by_name || "",
            };
          });
          setRows(loadedRows);
        }

        // 3. Payment & Discount Details
        const pay = bill.paymentDetails || bill.payment || {};
        const method = (bill.payment_method || pay.method || "cash").toLowerCase();

        setCashReceived("");
        setUpiAmount("");
        setCardAmount("");
        setCardNumber("");
        setSalesReturnAmount("");

        const totalVal = bill.summary?.total || bill.total || 0;
        if (method === "cash" || bill.cash_received > 0) {
          setCashReceived(bill.cash_received || totalVal);
        }
        if (method === "upi" || pay.upiId) {
          setUpiAmount(totalVal);
        }
        if (method === "card" || pay.cardNumber) {
          setCardAmount(totalVal);
          setCardNumber(pay.cardNumber || bill.payment_card_number || "");
        }
        if (bill.summary?.discount > 0 || bill.discount > 0) {
          setDiscountAmount(bill.summary?.discount || bill.discount || 0);
        }

        setIsReprintMode(true);
        setShowBillNumberSuggestions(false);
        setMessage(`✅ Bill #${formatted} retrieved successfully. Ready for reprint.`);
      }
    } catch (err) {
      console.log("Bill reprint error", err);
      setIsReprintMode(false);
      setShowBillNumberSuggestions(false);
      setError("Bill Number not found.");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = (billNumber) => {
    fetchBillForReprint(billNumber);
  };

  const handleCloseSaleReturnModal = () => {
    setShowSaleReturnModal(false);
    if (!isSaleReturnMode) {
      setSaleReturn(false);
    }
  };

  const switchToSaleReturnMode = () => {
    performClear();
    setIsSaleReturnMode(true);
    setSaleReturn(true);
    fetchNextBillNumber('R');
    showTempMessage("success", "🔄 Switched to Sale Return Mode (Blank Bill)");
  };

  const handleOpenSaleReturnModal = () => {
    setSaleReturn(true);
    setSaleReturnBillInput("");
    setShowSaleReturnModal(true);
    setTimeout(() => saleReturnBillInputRef.current?.focus(), 100);
  };

  const printSaleReturnReceipt = (r) => {
    const printWindow = window.open('', '_blank', 'width=450,height=600');
    if (!printWindow) {
      setTimeout(() => {
        window.print();
      }, 100);
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

  const fetchBillForSaleReturn = async (inputBillNo) => {
    if (!inputBillNo || String(inputBillNo).trim().length === 0) return;
    const formatted = formatBillNo(String(inputBillNo).trim(), 'N');
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const response = await api.get(`/billing/bills/return-details/${encodeURIComponent(formatted)}`);
      if (response.data) {
        const billData = response.data;
        const bill = billData.bill || billData;

        const custPhone = bill.customer?.phone || bill.customer_phone || bill.contact || bill.customerPhone || "";
        const custName = bill.customer?.name || bill.customer_name || bill.customerName || "Walk-in Customer";
        const custAddr = bill.customer?.address || bill.customer_address || bill.customerAddress || "";

        setCustomerName(custName);
        setMobileNumber(custPhone);
        setContactNumber(custPhone);
        setAddress(custAddr);

        const returnableItems = billData.items || [];

        if (Array.isArray(returnableItems) && returnableItems.length > 0) {
          const loadedRows = returnableItems.map((item) => {
            const sellPrice = item.sellPrice || item.sell_price || item.mrp || 0;
            const qty = (item.remainingQuantity !== undefined && item.remainingQuantity > 0)
              ? item.remainingQuantity
              : (item.originalQuantity || item.quantity || 1);
            const disc = item.discountPercent || item.discount_percent || 0;
            return {
              productId: item.productCode || item.product_code || String(item.productId || item.product_id || ""),
              _dbId: item.productId || item.product_id,
              description: item.productName || item.product_name || "",
              tax: item.tax || 0,
              unit: item.unit || "PCS",
              mrp: sellPrice,
              discountPercent: disc,
              netPrice: sellPrice,
              originalQuantity: item.originalQuantity || item.quantity || qty,
              remainingQuantity: qty,
              quantity: qty,
              salesPerson: bill.createdByName || bill.created_by_name || "",
            };
          });
          setRows(loadedRows);
        }

        setSaleReturn(true);
        setIsSaleReturnMode(true);
        setOriginalBillNumber(formatted);
        fetchNextBillNumber('R');
        setShowSaleReturnModal(false);
        setMessage(`🔄 Loaded Bill #${formatted} into Sale Return mode! Adjust returned quantities and print.`);
      }
    } catch (err) {
      console.log("Sale Return bill fetch error", err);
      setError(`Bill Number #${formatted} not found. Sale Return mode cancelled.`);
      setSaleReturn(false);
      setIsSaleReturnMode(false);
      setOriginalBillNumber("");
    } finally {
      setLoading(false);
    }
  };

  const saveSaleReturn = async () => {
    if (loading) return null;

    const validItems = rows.filter(r => r.productId && (Number(r.quantity) || 0) > 0);
    if (validItems.length === 0) {
      setError("Add or adjust at least one returned item.");
      return null;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      let paymentMethod = "cash";
      if (paymentTotals.card > 0) paymentMethod = "card";
      else if (paymentTotals.upi > 0) paymentMethod = "upi";
      else if (paymentTotals.online > 0) paymentMethod = "online";

      const totalReturnAmount = totals.billValue;
      const pointsDeducted = 0;

      const payload = {
        originalBillNumber: originalBillNumber || "DIRECT",
        returnNumber: formatBillNo(billNo, 'R'),
        customerName: customerName || "Walk-in Customer",
        customerPhone: mobileNumber || contactNumber || memberId || "",
        customerAddress: address || "",
        subtotal: totals.mrpTotal,
        discount: totals.totalDiscount,
        tax: totals.taxTotal,
        totalReturnAmount,
        rewardPointsDeducted: 0,
        paymentMethod,
        processedByName: loggedInUserName,
        items: validItems.map((row) => ({
          productId: row._dbId,
          productCode: row.productId,
          productName: row.description,
          unit: row.unit,
          tax: row.tax,
          mrp: row.mrp,
          sellPrice: row.netPrice,
          originalQuantity: row.originalQuantity || Number(row.quantity) || 1,
          returnedQuantity: Number(row.quantity) || 1,
          salesPerson: row.salesPerson
        })),
      };

      const response = await api.post(`/sale-returns`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });

      const savedReturn = response.data?.saleReturn;
      if (savedReturn?.returnNumber) {
        setBillNo(savedReturn.returnNumber);
      }
      setMessage(`Sale Return ${savedReturn?.returnNumber || ''} processed successfully!`);
      localStorage.removeItem("bill_draft");
      await loadProducts();

      return savedReturn;
    } catch (err) {
      const backendMessage = err.response?.data?.error || err.response?.data?.errors?.join(", ");
      setError(backendMessage || "Unable to save Sale Return.");
      return null;
    } finally {
      setLoading(false);
    }
  };

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
      const response = await api.get(`/products?page=1&per_page=1000`);
      const all = Array.isArray(response.data?.items) ? response.data.items : [];
      const activeProducts = all.filter((p) => !isDeletedProduct(p));
      setProducts(activeProducts);
      loadStockStatistics();
    } catch (err) {
      setProducts([]);
      setError("Products not loaded. Please start backend and refresh.");
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await api.get(`/billing/customers`);
      setCustomers(response.data?.customers || []);
    } catch (err) {
      console.error("Customers not loaded", err);
    }
  };

  const normalizeProduct = (product) => {
    const mrp = money(product.mrp || 0);

    // In Product page schema, Selling Price is stored in discountAmount / discount_amount / sellPrice / sell_price
    const getSellingPrice = () => {
      const candidates = [
        product.discountAmount,
        product.discount_amount,
        product.discountAmt,
        product.sellPrice,
        product.sell_price,
        product.sellingPrice,
        product.selling_price,
        product.netPrice,
        product.net_price
      ];
      for (const c of candidates) {
        if (c !== undefined && c !== null && c !== "" && !isNaN(Number(c)) && Number(c) > 0) {
          return money(Number(c));
        }
      }
      return mrp > 0 ? mrp : 0;
    };

    let sellingPrice = getSellingPrice();

    if (classicCustomer && product.classicCustomer) {
      const cp = money(product.classicCustomer);
      if (cp > 0) {
        sellingPrice = cp;
      }
    }

    return {
      _dbId: product.id,
      productId: product.productCode || String(product.id),
      description: product.name || product.productName || "",
      tax: Number(product.tax || product.watts || TAX_PERCENT),
      unit: product.unit || product.type || DEFAULT_UNIT,
      mrp,
      sellPrice: sellingPrice,
      baseNetPrice: sellingPrice,
      discountPercent: 0,
      netPrice: sellingPrice,
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
        let updatedRows = currentRows.map((row, idx) => {
          if (idx === existingIndex) {
            const newQuantity = (Number(row.quantity) || 0) + 1;
            return { ...row, quantity: newQuantity };
          }
          return row;
        });

        // Remove draft row if targetRowIndex is passed and different from existingIndex
        if (targetRowIndex !== null && targetRowIndex !== existingIndex && targetRowIndex < updatedRows.length) {
          if (!updatedRows[targetRowIndex]._dbId) {
            updatedRows.splice(targetRowIndex, 1);
          }
        }

        const lastRow = updatedRows[updatedRows.length - 1];
        if (!lastRow || (lastRow.productId && lastRow.productId !== "")) {
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

        showTempMessage("success", `✅ Quantity increased for ${normalized.description}`);

        setTimeout(() => {
          if (qtyInputRefs.current[existingIndex]) {
            qtyInputRefs.current[existingIndex].focus();
            qtyInputRefs.current[existingIndex].select();
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

    const queryLower = query.toLowerCase();
    let found = products.find((product) => String(product.productCode || "").toLowerCase() === queryLower)
      || products.find((product) => String(product.id) === query)
      || products.find((product) => String(product.name || "").toLowerCase() === queryLower);

    if (!found) {
      try {
        const response = await api.get(`/billing/search-products?q=${encodeURIComponent(query)}`);
        const list = response.data || [];
        found = list.find(p => String(p.productCode || "").toLowerCase() === queryLower)
          || list.find(p => String(p.id) === query)
          || list[0];
        if (found && !isDeletedProduct(found)) {
          setProducts(prev => [...prev, found]);
        } else {
          found = null;
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

  const handleProductSearch = (index, value, onDone) => {
    const query = String(value || "").trim();
    if (!query) {
      if (onDone) onDone(index, false);
      return;
    }

    const queryLower = query.toLowerCase();
    let found = products.find((p) => String(p.productCode || "").toLowerCase() === queryLower)
      || products.find((p) => String(p.id) === query)
      || products.find((p) => String(p.name || "").toLowerCase() === queryLower);

    const applyFound = (product) => {
      if (isDeletedProduct(product)) {
        setError("Cannot add deleted product");
        if (onDone) onDone(index, false);
        return;
      }

      const normalized = normalizeProduct(product);

      setRows((current) => {
        const existingIndex = current.findIndex((row, rowIndex) =>
          rowIndex !== index && (row._dbId === normalized._dbId || (row.productId && row.productId === normalized.productId))
        );

        if (existingIndex !== -1) {
          showTempMessage("success", `✅ Quantity increased for ${normalized.description}`);

          let nextRows = current.map((row, rowIndex) => {
            if (rowIndex === existingIndex) {
              const newQuantity = (Number(row.quantity) || 0) + 1;
              return { ...row, quantity: newQuantity };
            }
            return row;
          });

          // Always splice out the duplicate attempt row `index`
          if (index !== existingIndex && index < nextRows.length) {
            nextRows.splice(index, 1);
          }

          // Ensure trailing empty row exists if last row is filled
          const lastRow = nextRows[nextRows.length - 1];
          if (!lastRow || (lastRow.productId && lastRow.productId !== "")) {
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

          setTimeout(() => {
            if (qtyInputRefs.current[existingIndex]) {
              qtyInputRefs.current[existingIndex].focus();
              qtyInputRefs.current[existingIndex].select();
            }
          }, 100);

          if (onDone) onDone(existingIndex, true);
          return nextRows;
        }

        const nextRows = current.map((row, rowIndex) => (rowIndex === index ? normalized : row));

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

        setTimeout(() => {
          if (qtyInputRefs.current[index]) {
            qtyInputRefs.current[index].focus();
            qtyInputRefs.current[index].select();
          }
        }, 60);

        if (onDone) setTimeout(() => onDone(index, true), 60);
        return nextRows;
      });
    };

    const handleNotFound = () => {
      setError(`❌ Product "${query}" not found or is deleted.`);
      if (onDone) onDone(index, false);
      setTimeout(() => {
        if (rowInputRefs.current[index]) {
          rowInputRefs.current[index].focus();
          rowInputRefs.current[index].select();
        }
      }, 60);
    };

    if (found) {
      applyFound(found);
      return;
    }

    api.get(`/billing/search-products?q=${encodeURIComponent(query)}`).then((res) => {
      const list = res.data || [];
      const matched = list.find(p => String(p.productCode || "").toLowerCase() === queryLower)
        || list.find(p => String(p.id) === query)
        || list[0];
      if (matched && !isDeletedProduct(matched)) {
        applyFound(matched);
        setProducts(prev => [...prev, matched]);
      } else {
        handleNotFound();
      }
    }).catch(() => {
      handleNotFound();
    });
  };

  const updateRow = (index, field, value) => {
    const numericFields = ["mrp", "sellPrice", "baseNetPrice", "discountPercent", "netPrice", "quantity", "tax"];

    if (field === "productId") {
      setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, productId: value } : row)));
      return;
    }

    setRows((current) => {
      const newRows = current.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        let numVal = value;
        if (numericFields.includes(field)) {
          if (value === "" || value === null || value === undefined) {
            numVal = "";
          } else {
            const parsed = Number(value);
            numVal = isNaN(parsed) ? value : parsed;
          }
        }

        const updated = { ...row, [field]: numVal };

        if (field === "discountPercent" || field === "sellPrice") {
          const base = Number(updated.sellPrice || updated.baseNetPrice || updated.netPrice || updated.mrp) || 0;
          const d = Number(updated.discountPercent) || 0;
          if (d >= 0) {
            updated.baseNetPrice = base;
            updated.netPrice = money(base - (base * d / 100));
          }
        } else if (field === "netPrice") {
          const n = Number(updated.netPrice) || 0;
          const d = Number(updated.discountPercent) || 0;
          if (d > 0) {
            updated.baseNetPrice = money(n / (1 - d / 100));
          } else {
            updated.baseNetPrice = n;
            updated.sellPrice = n;
          }
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

  // ─── Focus qty field for a given row index ────────────────────────────────
  const focusQtyField = (index) => {
    setTimeout(() => {
      const qtyInput = qtyInputRefs.current[index];
      if (qtyInput) {
        qtyInput.focus();
        qtyInput.select();
      }
    }, 50);
  };

  // ─── After qty is confirmed, move to next row's product-id field ──────────
  const moveToNextRow = (currentIndex) => {
    setRows((current) => {
      // Ensure there is a blank row after the current one
      const nextIndex = currentIndex + 1;
      if (nextIndex >= current.length) {
        const blank = {
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
        setTimeout(() => {
          const el = rowInputRefs.current[nextIndex];
          if (el) { el.focus(); el.select(); }
        }, 60);
        return [...current, blank];
      }
      setTimeout(() => {
        const el = rowInputRefs.current[nextIndex];
        if (el) { el.focus(); el.select(); }
      }, 60);
      return current;
    });
  };

  const paymentTotals = useMemo(() => {
    const cash = Number(cashReceived) || 0;
    const upi = Number(upiAmount) || 0;
    const card = Number(cardAmount) || 0;
    const online = Number(onlineAmount) || 0;
    const previous = Number(paidBefore) || 0;

    const activeRows = rows.filter(r => r.productId && r._dbId);
    const netBeforeDiscount = activeRows.reduce((sum, row) => sum + (Number(row.netPrice) || 0) * (Number(row.quantity) || 0), 0);
    const pointsDisc = money((Number(redeemedPoints) || 0) * 2);
    let manualDisc = 0;
    const discAmtNum = Number(discountAmount);
    const discPctNum = Number(discountPercent);
    if (discountAmount !== "" && !isNaN(discAmtNum) && discAmtNum > 0) {
      manualDisc = money(discAmtNum);
    } else if (discountPercent !== "" && !isNaN(discPctNum) && discPctNum > 0) {
      manualDisc = money((netBeforeDiscount * discPctNum) / 100);
    }
    const currentBillVal = Math.round(Math.max(0, netBeforeDiscount - manualDisc - pointsDisc));

    const rawSalesReturn = Number(salesReturnAmount) || 0;
    const maxCreditNeeded = Math.max(0, currentBillVal - cash - upi - card - online - previous);
    const salesReturn = Math.min(rawSalesReturn, maxCreditNeeded);

    const totalPaid = money(cash + upi + card + online + previous + salesReturn);
    return { cash, upi, card, online, previous, salary: 0, salesReturn, rawSalesReturn, totalPaid };
  }, [cashReceived, upiAmount, cardAmount, onlineAmount, paidBefore, salesReturnAmount, rows, discountPercent, discountAmount, redeemedPoints]);

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
    // Inclusive Tax calculation: extract tax from tax-inclusive product prices
    const taxTotal = activeRows.reduce((sum, row) => {
      const quantity = Number(row.quantity) || 0;
      const netPrice = Number(row.netPrice) || 0;
      const taxPercent = Number(row.tax) || 0;
      const lineTotal = netPrice * quantity;
      return sum + (taxPercent > 0 ? (lineTotal * taxPercent / (100 + taxPercent)) : 0);
    }, 0);
    const pointsDiscount = money((Number(redeemedPoints) || 0) * 2);
    let manualDiscount = 0;
    const discAmtNum = Number(discountAmount);
    const discPctNum = Number(discountPercent);
    if (discountAmount !== "" && !isNaN(discAmtNum) && discAmtNum > 0) {
      manualDiscount = money(discAmtNum);
    } else if (discountPercent !== "" && !isNaN(discPctNum) && discPctNum > 0) {
      manualDiscount = money((netBeforeDiscount * discPctNum) / 100);
    }
    // Billed amount matches entered product price (inclusive of tax) minus manual discount and points discount
    const netAfterDiscount = Math.max(0, netBeforeDiscount - manualDiscount - pointsDiscount);
    const billValue = Math.round(netAfterDiscount);
    const taxableTotal = money(Math.max(0, netAfterDiscount - taxTotal));

    const balanceDue = money(Math.max(0, billValue - paymentTotals.totalPaid));
    const returnAmount = money(Math.max(0, paymentTotals.totalPaid - billValue));
    const displayPaid = Math.min(paymentTotals.totalPaid, billValue);
    const isPaymentComplete = paymentTotals.totalPaid >= billValue;
    const isExactPayment = paymentTotals.totalPaid === billValue;
    const isOverPayment = paymentTotals.totalPaid > billValue;

    return {
      totalItems,
      totalQuantity,
      mrpTotal: money(mrpTotal),
      netBeforeDiscount,
      manualDiscount,
      pointsDiscount,
      redeemedPoints: Number(redeemedPoints) || 0,
      taxTotal: money(taxTotal),
      taxableTotal,
      billValue,
      totalPaid: paymentTotals.totalPaid,
      displayPaid: money(displayPaid),
      balanceDue,
      returnAmount,
      isPaymentComplete,
      isExactPayment,
      isOverPayment,
      totalDiscount: manualDiscount + pointsDiscount,
      canSave: paymentTotals.totalPaid >= billValue && billValue > 0,
    };
  }, [rows, discountPercent, discountAmount, paymentTotals, redeemedPoints]);

  const handlePaymentChange = (type, value) => {
    const numValue = value === "" ? "" : Number(value);
    switch (type) {
      case 'cash': setCashReceived(numValue); break;
      case 'upi': setUpiAmount(numValue); break;
      case 'card': setCardAmount(numValue); break;
      case 'online': setOnlineAmount(numValue); break;
      case 'salesReturn': setSalesReturnAmount(numValue); break;
      case 'paidBefore': setPaidBefore(numValue); break;
      default: break;
    }
  };

  const saveBill = async () => {
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
      let paymentMethod = "cash";
      if (paymentTotals.salesReturn > 0 && paymentTotals.cash === 0 && paymentTotals.card === 0 && paymentTotals.upi === 0 && paymentTotals.online === 0) paymentMethod = "sales_return";
      else if (paymentTotals.card > 0) paymentMethod = "card";
      else if (paymentTotals.upi > 0) paymentMethod = "upi";
      else if (paymentTotals.online > 0) paymentMethod = "online";

      const payload = {
        billNumber: formatBillNo(billNo),
        customerName: customerName || "Walk-in Customer",
        customerPhone: mobileNumber || contactNumber || memberId || "",
        customerAddress: address || "",
        customerType: isEmployeeCustomer ? "employee" : "external",
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
        salaryDeductionAmount: 0,
        salesReturnAmount: paymentTotals.salesReturn,
        deductFromSalary: false,
        paidBefore: paymentTotals.previous,
        contact: mobileNumber || contactNumber || memberId || "",
        createdByName: [salesPerson, ...new Set(rows.filter(r => r.salesPerson && r.productId).map(r => r.salesPerson))].filter(Boolean).join(", ") || counter,
        rewardPointsEarned: Math.floor(Math.max(0, totals.billValue - Number(paymentTotals.salesReturn || 0)) / 100),
        rewardPointsRedeemed: Number(redeemedPoints) || 0,
        isClassic: classicCustomer,
        items: rows.filter(r => r.productId && r._dbId).map((row) => ({
          productId: row._dbId,
          quantity: Number(row.quantity) || 1,
          price: Number(row.netPrice) || 0
        })),
      };

      const response = await api.post(`/billing/bills`, payload, {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
      });

      const savedNumber = formatBillNo(response.data?.billNumber || billNo);
      setBillNo(savedNumber);
      setMessage(`Bill saved successfully! Bill No: ${savedNumber}`);
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

  const handleSaveBillAndReset = async () => {
    const savedNum = await saveBill();
    if (savedNum) {
      performClear();
      setMessage(`Bill #${savedNum} saved successfully! Ready for next bill.`);
    }
  };

  const performClear = () => {
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
    setContactNumber("");
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
    setSalesReturnAmount("");
    setIsEmployeeCustomer(false);
    setSaleReturn(false);
    setRedeemedPoints(0);
    setPointsInput("");
    setAvailablePoints(0);
    setClassicCustomer(false);
    setQuickProductQuery("");
    setMobileSuggestions([]);
    setShowMobileSuggestions(false);
    setIsReprintMode(false);
    setIsSaleReturnMode(false);
    setOriginalBillNumber("");
    fetchNextBillNumber();
    localStorage.removeItem("bill_draft");
    loadProducts();
    loadCustomers();
    setTimeout(() => {
      if (quickAddInputRef.current) {
        quickAddInputRef.current.focus();
      } else if (rowInputRefs.current[0]) {
        rowInputRefs.current[0].focus();
      }
    }, 150);
  };

  const printBill = async () => {
    if (isSaleReturnMode) {
      const saved = await saveSaleReturn();
      if (saved) {
        let resetDone = false;
        const doReset = () => {
          if (!resetDone) {
            resetDone = true;
            performClear();
            setMessage("Sale return processed successfully! Ready for next bill.");
            window.removeEventListener('afterprint', doReset);
            setTimeout(requestFullScreen, 300);
          }
        };
        window.addEventListener('afterprint', doReset);
        setTimeout(doReset, 1500);
        setTimeout(() => {
          window.print();
        }, 100);
      }
      return;
    }

    if (isReprintMode) {
      let resetDone = false;
      const doReset = () => {
        if (!resetDone) {
          resetDone = true;
          performClear();
          setMessage("Bill reprinted! Form reset and ready for next bill.");
          window.removeEventListener('afterprint', doReset);
          setTimeout(requestFullScreen, 300);
        }
      };
      window.addEventListener('afterprint', doReset);
      setTimeout(doReset, 1500);
      setTimeout(() => {
        window.print();
      }, 100);
      return;
    }

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
    if (saved) {
      let resetDone = false;
      const doReset = () => {
        if (!resetDone) {
          resetDone = true;
          performClear();
          setMessage("Bill saved & printed successfully! Form reset for next bill.");
          window.removeEventListener('afterprint', doReset);
          setTimeout(requestFullScreen, 300);
        }
      };
      window.addEventListener('afterprint', doReset);
      setTimeout(doReset, 1500);
      setTimeout(() => {
        window.print();
      }, 100);
    }
  };

  const clearBill = () => {
    if (window.confirm("Clear current bill? All data will be lost.")) {
      performClear();
      setMessage("New bill created");
      setTimeout(() => setMessage(""), 2000);
    }
  };

  const handleRowFocus = (index) => {
    setActiveRowIndex(index);
  };

  const handleQuickAddKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (quickProductQuery.trim()) {
        addByQuery(quickProductQuery);
        setQuickProductQuery("");
      }
    }
  };

  const focusQuickAdd = () => {
    if (quickAddInputRef.current) {
      quickAddInputRef.current.focus();
      quickAddInputRef.current.select();
    }
  };

  const focusFirstEmptyProductField = () => {
    let targetIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i]?.productId || rows[i].productId === "") {
        targetIndex = i;
        break;
      }
    }
    if (targetIndex === -1 && rows.length > 0) targetIndex = rows.length - 1;
    if (targetIndex !== -1 && rowInputRefs.current[targetIndex]) {
      setActiveRowIndex(targetIndex);
      rowInputRefs.current[targetIndex].focus();
      rowInputRefs.current[targetIndex].select();
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      if (event.key === 'F2') {
        event.preventDefault();
        event.stopPropagation();
        focusFirstEmptyProductField();
        showTempMessage("success", "⌨️ Product entry active — start typing");
        return;
      }

      if ((event.ctrlKey && event.shiftKey && event.key === 'A') || event.key === 'Insert') {
        event.preventDefault();
        focusQuickAdd();
        showTempMessage("success", "⌨️ Quick add active — type product ID/name and press Enter");
        return;
      }

      if (event.key === 'F3') {
        event.preventDefault();
        customerNameRef.current?.focus();
        showTempMessage("success", "⌨️ Customer name focused");
        return;
      }

      if (event.key === 'F4') {
        event.preventDefault();
        mobileRef.current?.focus();
        showTempMessage("success", "⌨️ Mobile number focused");
        return;
      }

      if (event.key === 'F5') {
        event.preventDefault();
        salesPersonRef.current?.focus();
        showTempMessage("success", "⌨️ Sales person focused");
        return;
      }

      if (event.key === 'F2') {
        event.preventDefault();
        const activeIdx = activeRowIndex >= 0 ? activeRowIndex : 0;
        const nextIdx = activeIdx + 1;

        setRows((prevRows) => {
          let updated = [...prevRows];
          if (nextIdx >= updated.length) {
            updated.push({
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
          return updated;
        });

        setTimeout(() => {
          setActiveRowIndex(nextIdx);
          if (rowInputRefs.current[nextIdx]) {
            rowInputRefs.current[nextIdx].focus();
            rowInputRefs.current[nextIdx].select();
          }
        }, 100);
        showTempMessage("success", `⌨️ F2: Moved to product row ${nextIdx + 1}`);
        return;
      }

      if (event.key === 'F6') {
        event.preventDefault();
        cashReceivedRef.current?.focus();
        showTempMessage("success", "⌨️ Cash received focused");
        return;
      }

      if (event.key === 'F7') {
        event.preventDefault();
        memberIdRef.current?.focus();
        memberIdRef.current?.select();
        showTempMessage("success", "⌨️ Member ID focused");
        return;
      }

      if (event.key === 'F8' || (event.altKey && (event.key === 'o' || event.key === 'O'))) {
        event.preventDefault();
        onlineAmountRef.current?.focus();
        onlineAmountRef.current?.select();
        showTempMessage("success", "⌨️ Online payment focused");
        return;
      }

      if (event.key === 'F9' || (event.altKey && (event.key === 'c' || event.key === 'C'))) {
        event.preventDefault();
        cardAmountRef.current?.focus();
        cardAmountRef.current?.select();
        showTempMessage("success", "⌨️ Card payment focused");
        return;
      }

      if ((event.ctrlKey && event.key === 'Enter') && quickProductQuery.trim()) {
        event.preventDefault();
        addByQuery(quickProductQuery);
        setQuickProductQuery("");
        setTimeout(() => quickAddInputRef.current?.focus(), 100);
        showTempMessage("success", "⌨️ Product added");
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 's' || event.key === 'S')) {
        event.preventDefault();
        if (rows.filter(r => r.productId && r._dbId).length > 0) {
          saveBill();
        } else {
          setError("Add products before saving");
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'p' || event.key === 'P')) {
        event.preventDefault();
        if (rows.filter(r => r.productId && r._dbId).length > 0) {
          printBill();
        } else {
          setError("Add products before printing");
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (event.key === 'n' || event.key === 'N')) {
        event.preventDefault();
        clearBill();
        return;
      }

      if ((event.altKey && (event.key === 's' || event.key === 'S')) || (event.altKey && event.key === '1')) {
        event.preventDefault();
        switchToSaleReturnMode();
        return;
      }

      if ((event.altKey && event.key === '3') || (event.altKey && (event.key === 'p' || event.key === 'P'))) {
        event.preventDefault();
        setPointsInput(redeemedPoints > 0 ? String(redeemedPoints) : "");
        setPointsError("");
        setShowPointsModal(true);
        showTempMessage("success", "⌨️ Points Redemption Opened");
        return;
      }

      if (event.altKey && event.key === '4') {
        event.preventDefault();
        setClassicCustomer(prev => !prev);
        showTempMessage("success", `⌨️ Classic Customer: ${!classicCustomer ? 'ON' : 'OFF'}`);
        return;
      }

      if (event.altKey && event.key === 'u') {
        event.preventDefault();
        upiAmountRef.current?.focus();
        showTempMessage("success", "⌨️ UPI amount focused");
        return;
      }

      if (event.altKey && event.key === 'd') {
        event.preventDefault();
        discountPercentRef.current?.focus();
        showTempMessage("success", "⌨️ Discount percent focused");
        return;
      }

      if (event.altKey && event.key === 'a') {
        event.preventDefault();
        discountAmountRef.current?.focus();
        showTempMessage("success", "⌨️ Discount amount focused");
        return;
      }

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

      if (showMemberModal && selectedMember?.isFound) {
        if (event.key === 'Enter') {
          event.preventDefault();
          setShowMemberModal(false);
          return;
        }
      }

      if (event.key === 'Escape') {
        if (showSaleReturnModal || showPointsModal || showMemberModal || showMobileSuggestions || showSPSuggestions) {
          setShowSaleReturnModal(false);
          setShowPointsModal(false);
          setShowMemberModal(false);
          setShowMobileSuggestions(false);
          setShowSPSuggestions(false);
          setError("");
          setMessage("");
          document.activeElement?.blur();
          return;
        }

        // Exit full-screen mode and return to dashboard/previous screen
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch((err) => console.warn("Exit error:", err));
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
          }
        }
        navigate("/dashboard");
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, saleReturn, redeemedPoints, showPointsModal, classicCustomer, quickProductQuery, paymentTotals, totals, showMemberModal, showMobileSuggestions, showSPSuggestions, navigate]);

  return (
    <div className="sale-page">
      <style>{saleStyles}</style>

      <div className="sale-window">
        <div className="sale-titlebar">
          <span>Sale - Billing System</span>
          <div
            className="shortcuts-active-btn"
            onClick={() => window.dispatchEvent(new CustomEvent('toggleShortcuts'))}
            title="Click to view all keyboard shortcuts (Press ?)"
          >
            <span>⌨️ Shortcuts Active</span>
            <span className="shortcuts-key-badge">Press ?</span>
          </div>
        </div>

        {isSaleReturnMode && (
          <div style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
          }}>
            <span>🔄 SALE RETURN MODE — Original Bill: #{originalBillNumber}</span>
            <button
              type="button"
              style={{
                background: '#ffffff',
                color: '#dc2626',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
              onClick={performClear}
            >
              Exit Sale Return Mode
            </button>
          </div>
        )}

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
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>Bill No {!canEditBillNo && <span style={{ fontSize: "10px", color: "#94a3b8" }}>(Auto)</span>}</span>
                {isReprintMode && (
                  <span style={{ background: '#f59e0b', color: '#fff', fontSize: '10px', padding: '1px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    🖨️ REPRINT MODE
                  </span>
                )}
              </label>
              <input
                value={billNo}
                readOnly={!canEditBillNo}
                disabled={!canEditBillNo}
                onChange={(event) => {
                  if (!canEditBillNo) return;
                  setBillNo(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    if (canEditBillNo && billNo && billNo.trim().length > 0) {
                      fetchBillForReprint(billNo);
                    }
                  }
                }}
                onFocus={() => {
                  if (canEditBillNo && billNo && billNo.length > 2) {
                    setShowBillNumberSuggestions(true);
                  }
                }}
                onBlur={(event) => {
                  if (canEditBillNo && event.target.value && /^\d+$/.test(event.target.value.trim())) {
                    setBillNo(formatBillNo(event.target.value));
                  }
                  setTimeout(() => setShowBillNumberSuggestions(false), 200);
                }}
                placeholder={canEditBillNo ? "Enter bill no & press Enter" : "Auto-generated"}
                style={isReprintMode ? { backgroundColor: '#fffbeb', borderColor: '#f59e0b', fontWeight: 'bold' } : (!canEditBillNo ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed', opacity: 0.85 } : {})}
              />
            </div>
            <div className="billing-mode-selector" style={{ display: 'flex', gap: '4px', background: '#1e293b', padding: '3px', borderRadius: '8px', border: '1px solid #334155', height: '32px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  if (isSaleReturnMode) {
                    performClear();
                    setIsSaleReturnMode(false);
                    fetchNextBillNumber('N');
                  }
                }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: !isSaleReturnMode ? '#0284c7' : 'transparent',
                  color: !isSaleReturnMode ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  height: '26px'
                }}
              >
                📄 Normal Bill (N)
              </button>
              <button
                type="button"
                onClick={switchToSaleReturnMode}
                style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: isSaleReturnMode ? '#dc2626' : 'transparent',
                  color: isSaleReturnMode ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  height: '26px'
                }}
              >
                🔄 Sales Return (R) <span className="shortcut-hint" style={{ color: 'rgba(255,255,255,0.8)', fontSize: '9px' }}>Alt+1</span>
              </button>
            </div>
            <div className="check-group">
              <button
                type="button"
                className="points-header-btn"
                onClick={() => {
                  setPointsInput(redeemedPoints > 0 ? String(redeemedPoints) : "");
                  setPointsError("");
                  setShowPointsModal(true);
                }}
                style={{
                  padding: '6px 14px',
                  background: redeemedPoints > 0 ? 'linear-gradient(135deg, #059669, #10b981)' : 'linear-gradient(135deg, #d97706, #f59e0b)',
                  color: '#ffffff',
                  border: '1px solid #fbbf24',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 3px 10px rgba(245, 158, 11, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                🎁 Redeem Points ({availablePoints || 0} Pts) <span className="shortcut-hint" style={{ color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '4px', fontSize: '10px' }}>Alt+3</span>
              </button>
              <label className="check"><input type="checkbox" checked={classicCustomer} onChange={(event) => setClassicCustomer(event.target.checked)} /> Use Classic Mode <span className="shortcut-hint">Alt+4</span></label>
            </div>
          </div>

          <div className="header-middle" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 16px', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '380px' }}>
              {/* Option 1: Member ID / Phone */}
              <div className="field-group" style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#4da6ff', marginBottom: '2px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Member ID / Phone <span className="shortcut-hint">F7</span></span>
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'normal' }}>Type or press Enter</span>
                </label>
                <input
                  ref={memberIdRef}
                  value={memberId}
                  onChange={(event) => {
                    setMemberId(event.target.value);
                    filterMemberIdSuggestions(event.target.value);
                  }}
                  onKeyDown={handleMemberIdKeyDown}
                  onBlur={() => setTimeout(() => setShowMemberIdSuggestions(false), 200)}
                  placeholder="Enter Member ID or Phone..."
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: '1px solid #4da6ff',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    outline: 'none',
                    width: '100%'
                  }}
                />
                {showMemberIdSuggestions && memberIdSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 2500,
                    backgroundColor: '#1e293b',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    marginTop: '2px',
                    overflow: 'hidden'
                  }}>
                    {memberIdSuggestions.map((cust, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: idx === highlightedMemberIdIndex ? '#0284c7' : 'transparent',
                          color: idx === highlightedMemberIdIndex ? '#ffffff' : '#e2e8f0',
                          borderBottom: '1px solid #334155',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectMemberIdSuggestion(cust);
                        }}
                      >
                        <div>
                          <strong style={{ color: idx === highlightedMemberIdIndex ? '#fff' : '#38bdf8' }}>
                            {cust.name || cust.full_name || 'Customer'}
                          </strong>
                          <div style={{ fontSize: '10px', color: idx === highlightedMemberIdIndex ? '#e0f2fe' : '#94a3b8' }}>
                            ID: {cust.member_id || cust.id || 'N/A'} | PH: {cust.phone || cust.contact || 'N/A'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: idx === highlightedMemberIdIndex ? '#fff' : '#4ade80', display: 'block' }}>
                            💎 {cust.reward_points || cust.rewardPoints || 0} Pts
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: idx === highlightedMemberIdIndex ? '#fef08a' : '#f59e0b', marginTop: '2px', display: 'block' }}>
                            ↩️ Return: ₹{Number(cust.salesReturnAmount || cust.sales_return_amount || cust.salesReturn || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Option 2: Customer Name (with autocomplete dropdown of saved customers) */}
              <div className="field-group" style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '2px', display: 'block' }}>
                  <span>Customer Name</span>
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => {
                    const val = event.target.value;
                    setCustomerName(val);
                    filterCustomerNameSuggestions(val);
                  }}
                  onFocus={(event) => {
                    if (event.target.value) {
                      filterCustomerNameSuggestions(event.target.value);
                    }
                  }}
                  onKeyDown={handleCustomerNameKeyDown}
                  onBlur={() => setTimeout(() => setShowCustomerNameSuggestions(false), 200)}
                  placeholder="Enter Customer Name..."
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: '1px solid #38bdf8',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    outline: 'none',
                    width: '100%'
                  }}
                />
                {showCustomerNameSuggestions && customerNameSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 2500,
                    backgroundColor: '#1e293b',
                    border: '1px solid #38bdf8',
                    borderRadius: '8px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    marginTop: '2px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {customerNameSuggestions.map((cust, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: idx === highlightedCustomerNameIndex ? '#0284c7' : 'transparent',
                          color: idx === highlightedCustomerNameIndex ? '#ffffff' : '#e2e8f0',
                          borderBottom: '1px solid #334155',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectCustomerNameSuggestion(cust);
                        }}
                      >
                        <div>
                          <strong style={{ color: idx === highlightedCustomerNameIndex ? '#fff' : '#38bdf8' }}>
                            👤 {cust.name || cust.full_name || 'Customer'}
                          </strong>
                          <div style={{ fontSize: '10px', color: idx === highlightedCustomerNameIndex ? '#e0f2fe' : '#94a3b8' }}>
                            PH: {cust.phone || cust.contact || 'N/A'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '11px', fontWeight: 'bold', color: idx === highlightedCustomerNameIndex ? '#fff' : '#4ade80', display: 'block' }}>
                            💎 {cust.reward_points || cust.rewardPoints || 0} Pts
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 'bold', color: idx === highlightedCustomerNameIndex ? '#fef08a' : '#f59e0b', marginTop: '2px', display: 'block' }}>
                            ↩️ Return: ₹{Number(cust.salesReturnAmount || cust.sales_return_amount || cust.salesReturn || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(() => {
              const pointsEarned = isSaleReturnMode ? 0 : Math.floor(Math.max(0, (totals.billValue || 0) - Number(salesReturnAmount || 0)) / 100);
              const remainingPts = Math.max(0, (availablePoints || 0) - (redeemedPoints || 0));
              const totalBalance = remainingPts + pointsEarned;
              const returnAmt = Number(salesReturnAmount || 0);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Points Available Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #064e3b 0%, #022c22 100%)',
                    border: '2px solid #34d399',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    minWidth: '180px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                  }}>
                    <span style={{ fontSize: '24px' }}>🎁</span>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.8px', fontWeight: '800' }}>
                        POINTS AVAILABLE
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#fbbf24', marginTop: '1px' }}>
                        {formatPts(totalBalance)} Pts
                      </div>
                      {!isSaleReturnMode && pointsEarned > 0 && (
                        <div style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 'bold', marginTop: '1px' }}>
                          + Earned: {formatPts(pointsEarned)} Pts
                        </div>
                      )}
                      {redeemedPoints > 0 && (
                        <div style={{ fontSize: '10px', color: '#6ee7b7', fontWeight: 'bold', marginTop: '1px' }}>
                          ✓ Used: {formatPts(redeemedPoints)} Pts
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sales Return Amount Card */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
                    border: '2px solid #f59e0b',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    minWidth: '170px',
                    boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
                  }}>
                    <span style={{ fontSize: '24px' }}>↩️</span>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#ffffff', letterSpacing: '0.8px', fontWeight: '800' }}>
                        SALES RETURN AMT
                      </div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: '#fef08a', marginTop: '1px' }}>
                        ₹{returnAmt}
                      </div>
                      <div style={{ fontSize: '10px', color: '#fde68a', fontWeight: '600', marginTop: '1px' }}>
                        {returnAmt > 0 ? 'Credit Available' : 'No Return Credit'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="header-right">
            <div className="clock">{formatDateTime(now)}</div>
            <div className="customer-name" style={{ marginTop: '8px', padding: '6px 12px', background: '#1e293b', borderRadius: '6px', fontSize: '13px', color: '#94a3b8' }}>
              User: <strong style={{ color: '#fff' }}>{loggedInUserName}</strong>
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
            <button type="button" onClick={handleSaveBillAndReset} disabled={loading || !totals.canSave}>
              {loading ? "Saving..." : "Save Bill"}
            </button>
            <button ref={printButtonRef} type="button" className="printer" onClick={printBill} disabled={loading || !totals.canSave}>
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
                <th>Tax (%)</th>
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
                const basePrice = Number(row.sellPrice ?? row.baseNetPrice ?? row.netPrice ?? 0);
                const discPct = Number(row.discountPercent) || 0;
                const netPrice = money(row.netPrice !== "" && row.netPrice !== undefined ? row.netPrice : (basePrice - (basePrice * discPct / 100)));
                const amount = money(netPrice * (Number(row.quantity) || 0));
                return (
                  <tr key={`row-${index}-${row._dbId || 'empty'}`}>
                    {/* ── Product ID cell ── */}
                    <td>
                      <input
                        ref={(el) => { rowInputRefs.current[index] = el; }}
                        value={row.productId}
                        onChange={(event) => updateRow(index, "productId", event.target.value)}
                        onFocus={() => handleRowFocus(index)}
                        onKeyDown={(event) => {
                          // ── '+' key: jump to Qty field of THIS row ──────────
                          if (event.key === '+') {
                            event.preventDefault();
                            // If the row already has a product loaded, jump to its qty
                            if (row._dbId) {
                              focusQtyField(index);
                            } else if (index > 0) {
                              // Jump to previous row's qty (legacy behaviour for empty row)
                              focusQtyField(index - 1);
                            }
                            return;
                          }

                          if (event.key === 'Enter') {
                            event.preventDefault();
                            const typedValue = event.target.value;
                            if (typedValue) {
                              handleProductSearch(index, typedValue, (targetIndex, isSuccess) => {
                                if (isSuccess) {
                                  moveToNextRow(targetIndex !== undefined ? targetIndex : index);
                                } else {
                                  setTimeout(() => {
                                    if (rowInputRefs.current[index]) {
                                      rowInputRefs.current[index].focus();
                                      rowInputRefs.current[index].select();
                                    }
                                  }, 50);
                                }
                              });
                            } else {
                              // Empty product field pressed Enter:
                              // If there are already filled product rows → jump to payment section
                              const hasProducts = rows.some(r => r.productId && r._dbId);
                              if (hasProducts) {
                                // Jump straight to Cash Received for fast checkout
                                setTimeout(() => {
                                  if (cashReceivedRef.current) {
                                    cashReceivedRef.current.focus();
                                    cashReceivedRef.current.select();
                                  }
                                }, 50);
                              } else {
                                const nextIndex = index + 1;
                                if (nextIndex < rows.length && rowInputRefs.current[nextIndex]) {
                                  rowInputRefs.current[nextIndex].focus();
                                } else {
                                  focusFirstEmptyProductField();
                                }
                              }
                            }
                          }
                        }}
                        placeholder="Product ID (F2)"
                      />
                    </td>

                    <td><input value={row.description} onChange={(event) => updateRow(index, "description", event.target.value)} /></td>
                    <td><input type="number" value={row.tax} onChange={(event) => updateRow(index, "tax", event.target.value)} /></td>
                    <td><input value={row.unit} onChange={(event) => updateRow(index, "unit", event.target.value)} /></td>
                    <td><input type="number" value={row.mrp} onChange={(event) => updateRow(index, "mrp", event.target.value)} /></td>
                    <td><input type="number" value={row.discountPercent} onChange={(event) => updateRow(index, "discountPercent", event.target.value)} /></td>
                    <td><input type="number" value={netPrice} onChange={(event) => updateRow(index, "netPrice", event.target.value)} /></td>

                    {/* ── Qty cell: Enter saves and moves to next row ── */}
                    <td>
                      <input
                        ref={(el) => { qtyInputRefs.current[index] = el; }}
                        type="number"
                        min="1"
                        max={row.stock || undefined}
                        value={row.quantity !== undefined && row.quantity !== null ? row.quantity : ""}
                        onChange={(event) => updateRow(index, "quantity", event.target.value)}
                        onFocus={(event) => {
                          handleRowFocus(index);
                          // Select all on focus so user can type straight away
                          event.target.select();
                        }}
                        onBlur={() => {
                          if ((row.quantity === "" || row.quantity === null || row.quantity === undefined || Number(row.quantity) <= 0) && row.productId) {
                            updateRow(index, "quantity", 1);
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === '+') {
                            event.preventDefault();
                            moveToNextRow(index);
                          }
                        }}
                      />
                    </td>

                    <td className="amount-cell">{amount}</td>

                    {/* ── Sales Person cell ── */}
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
          {/* ── Col 1: Summary Items & Totals ── */}
          <div className="footer-col">
            <div className="section-title">Summary</div>
            <div className="info-row"><span>TOTAL ITEMS</span><strong>{totals.totalItems}</strong></div>
            <div className="info-row"><span>TOTAL QUANTITY</span><strong>{totals.totalQuantity}</strong></div>
            <div className="price-strip">
              <div><span>MRP Total</span><strong>₹{Math.round(totals.mrpTotal)}</strong></div>
              <div><span>Net Total</span><strong>₹{Math.round(totals.billValue)}</strong></div>
            </div>
            <button type="button" className="print-btn" onClick={printBill} disabled={!totals.canSave}>
              🖨️ Print Bill
            </button>
          </div>

          {/* ── Col 2: Bill & Discounts ── */}
          <div className="footer-col">
            <div className="section-title">Bill & Discounts</div>
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
              <input
                ref={discountPercentRef}
                value={discountPercent}
                onChange={(event) => {
                  const val = event.target.value;
                  setDiscountPercent(val);
                  if (val === "") {
                    setDiscountAmount("");
                  } else {
                    const p = Number(val);
                    if (!isNaN(p) && p > 0 && totals.netBeforeDiscount > 0) {
                      setDiscountAmount(money((totals.netBeforeDiscount * p) / 100).toString());
                    } else if (p === 0) {
                      setDiscountAmount("0");
                    }
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); discountAmountRef.current?.focus(); discountAmountRef.current?.select(); } }}
              />
            </div>
            <div className="info-row">
              <span>Discount Amt <span className="shortcut-hint">Alt+A</span></span>
              <input
                ref={discountAmountRef}
                value={discountAmount}
                onChange={(event) => {
                  const val = event.target.value;
                  setDiscountAmount(val);
                  if (val === "") {
                    setDiscountPercent("");
                  } else {
                    const a = Number(val);
                    if (!isNaN(a) && a > 0 && totals.netBeforeDiscount > 0) {
                      setDiscountPercent(((a / totals.netBeforeDiscount) * 100).toFixed(2));
                    } else if (a === 0) {
                      setDiscountPercent("0");
                    }
                  }
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); cashReceivedRef.current?.focus(); cashReceivedRef.current?.select(); } }}
              />
            </div>
            {totals.pointsDiscount > 0 && (
              <div className="info-row">
                <span style={{ color: '#38bdf8' }}>Points Disc</span>
                <input value={`-₹${totals.pointsDiscount}`} readOnly style={{ color: '#38bdf8', fontWeight: 'bold' }} />
              </div>
            )}
          </div>

          {/* ── Col 3: Cash & Payment Breakdown ── */}
          <div className="footer-col">
            <div className="section-title">Payment Received</div>
            <div className="info-row">
              <span>Cash Received <span className="shortcut-hint">F6</span></span>
              <input
                ref={cashReceivedRef}
                type="number"
                value={cashReceived}
                onChange={(event) => handlePaymentChange('cash', event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // If payment is already complete → trigger print directly
                    if (totals.canSave) {
                      printBill();
                    } else {
                      upiAmountRef.current?.focus();
                      upiAmountRef.current?.select();
                    }
                  }
                }}
              />
            </div>
            <div className="info-row">
              <span>UPI Amount <span className="shortcut-hint">Alt+U</span></span>
              <input
                ref={upiAmountRef}
                type="number"
                value={upiAmount}
                onChange={(event) => handlePaymentChange('upi', event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (totals.canSave) {
                      printBill();
                    } else {
                      cardAmountRef.current?.focus();
                      cardAmountRef.current?.select();
                    }
                  }
                }}
              />
            </div>
            <div className="info-row">
              <span>Card Amount <span className="shortcut-hint">F9/Alt+C</span></span>
              <input
                ref={cardAmountRef}
                type="number"
                value={cardAmount}
                onChange={(event) => handlePaymentChange('card', event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (totals.canSave) {
                      printBill();
                    } else {
                      salesReturnAmountRef.current?.focus();
                      salesReturnAmountRef.current?.select();
                    }
                  }
                }}
              />
            </div>
            <div className="info-row">
              <span>Sales Return</span>
              <input
                ref={salesReturnAmountRef}
                type="number"
                value={salesReturnAmount}
                onChange={(event) => handlePaymentChange('salesReturn', event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (totals.canSave) {
                      printBill();
                    } else {
                      onlineAmountRef.current?.focus();
                      onlineAmountRef.current?.select();
                    }
                  }
                }}
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
          </div>

          {/* ── Col 4: Online, Card & Reward Details ── */}
          <div className="footer-col">
            <div className="section-title">Online & Rewards</div>
            <div className="info-row">
              <span>Online Amt <span className="shortcut-hint">F8</span></span>
              <input
                ref={onlineAmountRef}
                type="number"
                value={onlineAmount}
                onChange={(e) => handlePaymentChange('online', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // Final payment field → trigger print/save
                    if (totals.canSave) {
                      printBill();
                    } else if (printButtonRef.current) {
                      printButtonRef.current.focus();
                    }
                  }
                }}
              />
            </div>
            <div className="info-row">
              <span>Online Phone</span>
              <input value={onlinePhone} onChange={(e) => setOnlinePhone(e.target.value)} placeholder="Phone No" />
            </div>
            <div className="info-row">
              <span>Ref ID</span>
              <input value={onlineRef} onChange={(e) => setOnlineRef(e.target.value)} placeholder="Reference" />
            </div>
            <div className="info-row">
              <span>Card No</span>
              <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} placeholder="Card Number" />
            </div>
            {(() => {
              const pointsEarned = isSaleReturnMode ? 0 : Math.floor(Math.max(0, (totals.billValue || 0) - Number(salesReturnAmount || 0)) / 100);
              const remainingPts = Math.max(0, (availablePoints || 0) - (redeemedPoints || 0));
              const totalBalance = remainingPts + pointsEarned;
              return (
                <>
                  {!isSaleReturnMode && pointsEarned > 0 && (
                    <div className="info-row">
                      <span style={{ color: '#fbbf24' }}>Points Earned</span>
                      <input value={`${formatPts(pointsEarned)} Pts`} readOnly style={{ fontWeight: 'bold', color: '#fbbf24' }} />
                    </div>
                  )}
                  <div className="info-row">
                    <span style={{ color: '#38bdf8' }}>Points Available</span>
                    <input value={`${formatPts(totalBalance)} Pts`} readOnly style={{ fontWeight: 'bold', color: '#38bdf8' }} />
                  </div>
                  {redeemedPoints > 0 && (
                    <div className="info-row">
                      <span style={{ color: '#4ade80' }}>Points Used</span>
                      <input value={`${formatPts(redeemedPoints)} Pts`} readOnly style={{ fontWeight: 'bold', color: '#4ade80' }} />
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* ── Col 5: Pay Board Summary ── */}
          <div className="pay-board">
            {isSaleReturnMode ? (
              <>
                <div className="pay-card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: '#f87171' }}>
                  <div className="pay-label" style={{ color: '#f87171' }}>TOTAL RETURN VALUE</div>
                  <div className="pay-value" style={{ color: '#f87171' }}>₹{Math.round(totals.billValue)}</div>
                </div>
                <div className="pay-card">
                  <div className="pay-label">REFUND PAYOUT</div>
                  <div className="pay-value">₹{Math.round(totals.displayPaid)}</div>
                </div>
                <div className="pay-card">
                  <div className="pay-label">BALANCE DUE</div>
                  <div className="pay-value" style={{ color: totals.balanceDue > 0 ? '#ff6b6b' : '#51cf66' }}>
                    ₹{Math.round(totals.balanceDue)}
                  </div>
                </div>
              </>
            ) : (
              <>
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
                  <div className="pay-value">
                    ₹{Math.round(
                      paymentTotals.rawSalesReturn > 0
                        ? Math.max(totals.returnAmount, paymentTotals.rawSalesReturn - paymentTotals.salesReturn)
                        : totals.returnAmount
                    )}
                  </div>
                </div>
              </>
            )}
            {!totals.canSave && totals.billValue > 0 && (
              <div className="payment-warning">
                {paymentTotals.totalPaid < totals.billValue ?
                  `⚠️ Need ₹${Math.round(totals.balanceDue)}` :
                  paymentTotals.totalPaid > totals.billValue ?
                    `⚠️ Overpaid ₹${Math.round(totals.returnAmount)}` :
                    "⚠️ Payment required"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print-Only Thermal Receipt matching reference image */}
      <div className="print-only">
        <div className="receipt-header">
          <div className="receipt-logo">
            <img src="/Dressing_Concept.png" alt="Dressing Concepts" className="receipt-logo-img" />
          </div>
          <div className="receipt-shop">DRESSING CONCEPTS</div>
          <div className="receipt-addr">NO.88/70 S.R.P KOVIL STREET,</div>
          <div className="receipt-addr">AGARAM,PERAMBUR,</div>
          <div className="receipt-addr">CHENNAI-600 082.</div>
          <div className="receipt-info-left">
            <div>PH: 9840669687</div>
            <div>GSTIN:</div>
          </div>
        </div>

        {isSaleReturnMode && (
          <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px', borderTop: '1px solid #000', borderBottom: '1px solid #000', margin: '4px 0', padding: '2px 0' }}>
            *** SALE RETURN ***
          </div>
        )}

        <div className="receipt-meta">
          <div className="receipt-meta-row">
            <span>{isSaleReturnMode ? `Return No: ${billNo}` : `Bill No:${formatBillNo(billNo)}`}</span>
            <span>{formatDateTime(now)}</span>
          </div>
          {isSaleReturnMode ? (
            <div className="receipt-meta-row">
              <span>Orig Bill: #{originalBillNumber}</span>
              <span>User: {loggedInUserName}</span>
            </div>
          ) : (
            <div className="receipt-meta-row">
              <span>{counter}</span>
              <span>User: {loggedInUserName}</span>
            </div>
          )}
        </div>

        <div className="receipt-line" />

        <table className="receipt-table">
          <thead>
            <tr>
              <th className="r-desc">Description</th>
              <th className="r-num">Tax %</th>
              <th className="r-num">Qty</th>
              <th className="r-num">Rate</th>
              <th className="r-num">Amt</th>
            </tr>
          </thead>
          <tbody>
            {rows.filter(r => r.productId && (Number(r.quantity) || 0) > 0).map((row, index) => {
              const qty = Number(row.quantity) || 0;
              const rate = Number(row.netPrice) || Number(row.mrp) || 0;
              const amt = money(rate * qty);
              const taxPct = Number(row.tax) || 5;
              return (
                <tr key={index}>
                  <td className="r-desc">{String(row.description || "").toUpperCase()}</td>
                  <td className="r-num">{taxPct}%</td>
                  <td className="r-num">{qty.toFixed(2)}</td>
                  <td className="r-num">{rate.toFixed(2)}</td>
                  <td className="r-num">{amt.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="receipt-pay-amount">
          {isSaleReturnMode ? `Refund Amount: ${Math.round(totals.billValue)}/-` : `Pay Amount: ${Math.round(totals.billValue)}/-`}
        </div>

        <div className="receipt-summary-block">
          <div className="receipt-row"><span>Total Pieces: {totals.totalQuantity}</span></div>
          <div className="receipt-row"><span>MRP Total: {Math.round(totals.mrpTotal)}</span></div>
        </div>

        {!isSaleReturnMode && (
          <div className="receipt-summary-block">
            {paymentTotals.card > 0 && <div className="receipt-row"><span>Card Amt: {Math.round(paymentTotals.card)}</span></div>}
            {paymentTotals.cash > 0 && <div className="receipt-row"><span>Cash Amt: {Math.round(paymentTotals.cash)}</span></div>}
            {paymentTotals.upi > 0 && <div className="receipt-row"><span>UPI Amt: {Math.round(paymentTotals.upi)}</span></div>}
            {paymentTotals.online > 0 && <div className="receipt-row"><span>Online Amt: {Math.round(paymentTotals.online)}</span></div>}
            {paymentTotals.salesReturn > 0 && <div className="receipt-row"><span>Sales Return: {Math.round(paymentTotals.salesReturn)}</span></div>}
            {paymentTotals.previous > 0 && <div className="receipt-row"><span>Paid Before: {Math.round(paymentTotals.previous)}</span></div>}
          </div>
        )}

        <div className="receipt-line" />

        <div className="receipt-customer">
          <div className="receipt-cust-title">Customer Details:</div>
          <div className="receipt-cust-name">{String(customerName || "Walk-in Customer").toUpperCase()}</div>
          {(mobileNumber || contactNumber || memberId) && (
            <div className="receipt-cust-phone">
              PH: {mobileNumber || contactNumber || memberId}
            </div>
          )}
          {address && (
            <div className="receipt-cust-phone">
              ADDR: {address}
            </div>
          )}
        </div>

        {(() => {
          const pointsEarned = isSaleReturnMode ? 0 : Math.floor(Math.max(0, (totals.billValue || 0) - Number(salesReturnAmount || 0)) / 100);
          const remainingPts = Math.max(0, (availablePoints || 0) - (redeemedPoints || 0));
          const totalBalance = remainingPts + pointsEarned;
          return (
            <>
              <div className="receipt-line" />
              <div className="receipt-summary-block">
                {!isSaleReturnMode && pointsEarned > 0 && <div className="receipt-row"><span>Points Earned:</span><span>{formatPts(pointsEarned)} Pts</span></div>}
                {redeemedPoints > 0 && <div className="receipt-row"><span>Points Used:</span><span>{formatPts(redeemedPoints)} Pts</span></div>}
                <div className="receipt-row" style={{ fontWeight: 'bold' }}><span>Points Available:</span><span>{formatPts(totalBalance)} Pts</span></div>
              </div>
            </>
          );
        })()}

        <div className="receipt-line-dashed" />

        {/* QR Codes Section: Instagram & WhatsApp */}
        <div className="receipt-qr">
          <div className="receipt-qr-item">
            <div className="receipt-qr-lbl">JOIN US</div>
            <img src="/whatsapp-qr.png" alt="WhatsApp QR" className="receipt-qr-img" />
          </div>
          <div className="receipt-qr-item">
            <div className="receipt-qr-lbl">VISIT US</div>
            <img src="/instagram.png" alt="Instagram QR" className="receipt-qr-img" />
          </div>
        </div>

        {/* Footer Messages: Visit Again & Thank You */}
        <div className="receipt-footer-msg">
          <div className="receipt-visit">Visit Again</div>
          <div className="receipt-thankyou">Thank You &hearts;</div>
        </div>
      </div>

      {/* ── Points Redemption Pop-up Window ── */}
      {showPointsModal && (
        <div className="member-modal-overlay" onClick={() => setShowPointsModal(false)}>
          <div className="member-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="member-modal-header">
              <div className="modal-header-title">
                <span className="modal-header-icon found-icon">🎁</span>
                <div>
                  <h3>Redeem Reward Points</h3>
                  <span className="modal-subtitle">Each 1 Point = ₹2 Discount</span>
                </div>
              </div>
              <button className="member-modal-close" onClick={() => setShowPointsModal(false)} title="Close">✕</button>
            </div>

            <div className="member-modal-body" style={{ padding: '20px 24px' }}>
              <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 100%)', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px', border: '2px solid #34d399', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)' }}>
                <div style={{ fontSize: '12px', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '800' }}>CUSTOMER AVAILABLE POINTS</div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#fbbf24', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{availablePoints} Points</span>
                </div>
                {customerName && <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '6px', fontWeight: '500' }}>Customer: <strong style={{ color: '#38bdf8' }}>{customerName}</strong> {mobileNumber && `(${mobileNumber})`}</div>}
              </div>

              {pointsError && <div className="reg-error-msg" style={{ marginBottom: '12px' }}>⚠️ {pointsError}</div>}

              <div className="reg-field-group">
                <label style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '600', marginBottom: '6px', display: 'block' }}>
                  Enter Points to Redeem
                </label>
                <div className="input-wrapper">
                  <span className="input-icon">💎</span>
                  <input
                    type="number"
                    min="0"
                    max={availablePoints}
                    placeholder="Enter points (e.g. 50)"
                    value={pointsInput}
                    onChange={(e) => {
                      setPointsInput(e.target.value);
                      setPointsError("");
                    }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyPoints();
                      }
                    }}
                    style={{ fontSize: '16px', fontWeight: 'bold' }}
                  />
                </div>
              </div>

              {/* Live Preview Calculation */}
              {pointsInput !== "" && !isNaN(Number(pointsInput)) && Number(pointsInput) > 0 && (
                <div style={{ marginTop: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px', color: '#cbd5e1' }}>
                    <span>Points Discount (1 pt = ₹2):</span>
                    <strong style={{ color: '#4ade80' }}>-₹{Number(pointsInput) * 2}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fff', fontWeight: 'bold' }}>
                    <span>New Payable Amount:</span>
                    <span style={{ color: '#38bdf8' }}>₹{Math.max(0, totals.netBeforeDiscount - totals.manualDiscount - (Number(pointsInput) * 2))}</span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="modal-submit-btn"
                  onClick={handleApplyPoints}
                  style={{ flex: 1, padding: '10px 16px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  ✓ Apply Points
                </button>
                {redeemedPoints > 0 && (
                  <button
                    type="button"
                    onClick={handleRemovePoints}
                    style={{ padding: '10px 16px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Clear Points
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPointsModal(false)}
                  style={{ padding: '10px 16px', background: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Member Details & Registration Pop-up Window ── */}
      {showMemberModal && selectedMember && (
        <div className="member-modal-overlay" onClick={() => setShowMemberModal(false)}>
          <div className="member-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="member-modal-header">
              <div className="modal-header-title">
                {selectedMember.isFound ? (
                  <>
                    <span className="modal-header-icon found-icon">👤</span>
                    <div>
                      <h3>Member Details</h3>
                      <span className="modal-subtitle">Verified customer account</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="modal-header-icon not-found-icon">⚠️</span>
                    <div>
                      <h3>Member Not Found</h3>
                      <span className="modal-subtitle">Register & Link New Customer</span>
                    </div>
                  </>
                )}
              </div>
              <button className="member-modal-close" onClick={() => setShowMemberModal(false)} title="Close Modal">✕</button>
            </div>

            <div className="member-modal-body">
              {selectedMember.isFound ? (
                <div className="member-details-grid">
                  <div className="member-detail-card">
                    <span className="detail-label">MEMBER ID</span>
                    <span className="detail-value highlight-badge">{selectedMember.memberId}</span>
                  </div>
                  <div className="member-detail-card">
                    <span className="detail-label">CUSTOMER NAME</span>
                    <span className="detail-value text-bold">{selectedMember.name}</span>
                  </div>
                  <div className="member-detail-card">
                    <span className="detail-label">CONTACT NUMBER</span>
                    <span className="detail-value">{selectedMember.phone || 'N/A'}</span>
                  </div>
                  <div className="member-detail-card">
                    <span className="detail-label">ADDRESS</span>
                    <span className="detail-value">{selectedMember.address || 'N/A'}</span>
                  </div>
                  {selectedMember.points !== undefined && (
                    <div className="member-detail-card">
                      <span className="detail-label">REWARD POINTS</span>
                      <span className="detail-value points-badge">💎 {selectedMember.points} PTS</span>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSaveNewCustomer} className="registration-form">
                  <div className="not-found-banner">
                    <div className="banner-icon">ℹ️</div>
                    <div className="banner-text">
                      Member ID <strong>{selectedMember.memberId}</strong> was not found in database. Enter details below to register and auto-link to this bill.
                    </div>
                  </div>

                  {regError && <div className="reg-error-msg">⚠️ {regError}</div>}

                  <div className="reg-field-group">
                    <label>Customer Name <span className="req-star">*</span></label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input
                        type="text"
                        placeholder="Enter Customer Name"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        autoFocus
                        required
                      />
                    </div>
                  </div>

                  <div className="reg-field-group">
                    <label>Contact / Mobile Number <span className="req-star">*</span></label>
                    <div className="input-wrapper">
                      <span className="input-icon">📞</span>
                      <input
                        type="text"
                        placeholder="Enter Contact Number"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="reg-field-group">
                    <label>Address</label>
                    <div className="input-wrapper">
                      <span className="input-icon textarea-icon">🏠</span>
                      <textarea
                        placeholder="Enter Customer Address"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        rows="3"
                      />
                    </div>
                  </div>

                  <div className="reg-modal-actions">
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => setShowMemberModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-save-customer"
                      disabled={savingCustomer}
                    >
                      {savingCustomer ? "Saving Customer..." : "💾 Save Customer & Link to Bill"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {selectedMember.isFound && (
              <div className="member-modal-footer">
                <button
                  className="member-modal-ok-btn"
                  autoFocus
                  onClick={() => setShowMemberModal(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setShowMemberModal(false);
                    }
                  }}
                >
                  OK / Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

const saleStyles = `
  /* ── Member Details & Registration Modal Professional Styling ── */
  .member-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(10, 15, 30, 0.82);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    animation: fadeInOverlay 0.25s ease-out;
  }
  @keyframes fadeInOverlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .member-modal-content {
    background: linear-gradient(145deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(77, 166, 255, 0.35);
    border-radius: 16px;
    width: 92%;
    max-width: 520px;
    box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px rgba(37, 99, 235, 0.25);
    color: #f8fafc;
    overflow: hidden;
    animation: modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  @keyframes modalSlideIn {
    from { opacity: 0; transform: translateY(-24px) scale(0.96); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .member-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 24px;
    background: rgba(15, 23, 42, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .modal-header-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .modal-header-icon {
    font-size: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
  .found-icon {
    background: rgba(59, 130, 246, 0.15);
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  .not-found-icon {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
  .modal-header-title h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #f8fafc;
    letter-spacing: 0.3px;
  }
  .modal-subtitle {
    font-size: 12px;
    color: #94a3b8;
    display: block;
    margin-top: 2px;
  }
  .member-modal-close {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-size: 16px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }
  .member-modal-close:hover {
    color: #fff;
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.5);
  }
  .member-modal-body {
    padding: 24px;
  }

  /* ── Not Found Alert Banner ── */
  .not-found-banner {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(217, 119, 6, 0.08) 100%);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
  .banner-icon {
    font-size: 18px;
    line-height: 1;
    margin-top: 2px;
  }
  .banner-text {
    font-size: 13px;
    color: #fef3c7;
    line-height: 1.5;
  }
  .banner-text strong {
    color: #fbbf24;
    font-family: monospace;
    font-size: 14px;
    background: rgba(0,0,0,0.3);
    padding: 1px 6px;
    border-radius: 4px;
  }

  .reg-error-msg {
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fca5a5;
    padding: 10px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  /* ── Form Layout ── */
  .registration-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .reg-field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .reg-field-group label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #94a3b8;
    text-align: left;
  }
  .req-star {
    color: #ef4444;
    margin-left: 2px;
  }
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon {
    position: absolute;
    left: 12px;
    font-size: 15px;
    color: #64748b;
    pointer-events: none;
  }
  .input-icon.textarea-icon {
    top: 12px;
  }
  .input-wrapper input, .input-wrapper textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 14px 11px 38px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(15, 23, 42, 0.7);
    color: #f8fafc;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .input-wrapper textarea {
    resize: vertical;
    min-height: 75px;
    line-height: 1.5;
  }
  .input-wrapper input:focus, .input-wrapper textarea:focus {
    border-color: #3b82f6;
    background: #0f172a;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  .input-wrapper input::placeholder, .input-wrapper textarea::placeholder {
    color: #475569;
  }

  /* ── Form Action Buttons ── */
  .reg-modal-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .btn-cancel {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    padding: 10px 18px;
    border-radius: 9px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
  .btn-save-customer {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #ffffff;
    border: none;
    padding: 11px 22px;
    border-radius: 9px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-save-customer:hover {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
    transform: translateY(-1px);
  }

  /* ── Member Details Grid (When Member Found) ── */
  .member-details-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .member-detail-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .detail-label {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
  }
  .detail-value {
    color: #f8fafc;
    font-size: 14px;
    font-weight: 500;
  }
  .highlight-badge {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: monospace;
    font-weight: 700;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  .points-badge {
    color: #fbbf24;
    font-weight: 700;
  }
  .member-modal-footer {
    padding: 16px 24px;
    background: rgba(15, 23, 42, 0.85);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: flex-end;
  }
  /* ── Zero-Scroll Single-Screen Responsive Layout ── */
  .sale-page {
    background: #96ceca;
    color: #111;
    height: 100vh;
    max-height: 100vh;
    width: 100vw;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  }

  .shortcut-bar {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
    padding: 6px 12px;
    margin-bottom: 6px;
    border-radius: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    font-family: monospace;
    border: 1px solid #00bcd4;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    flex-shrink: 0;
  }
  .shortcut-title {
    font-weight: bold;
    color: #00bcd4;
    font-size: 11px;
  }
  .shortcut-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .shortcut-list span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(0,0,0,0.5);
    padding: 2px 6px;
    border-radius: 12px;
  }
  .shortcut-list kbd {
    background: #2d2d44;
    border: 1px solid #00bcd4;
    border-radius: 4px;
    padding: 1px 5px;
    text-align: left;
  }
  .req-star {
    color: #ef4444;
    margin-left: 2px;
  }
  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }
  .input-icon {
    position: absolute;
    left: 12px;
    font-size: 15px;
    color: #64748b;
    pointer-events: none;
  }
  .input-icon.textarea-icon {
    top: 12px;
  }
  .input-wrapper input, .input-wrapper textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 14px 11px 38px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(15, 23, 42, 0.7);
    color: #f8fafc;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    font-family: inherit;
  }
  .input-wrapper textarea {
    resize: vertical;
    min-height: 75px;
    line-height: 1.5;
  }
  .input-wrapper input:focus, .input-wrapper textarea:focus {
    border-color: #3b82f6;
    background: #0f172a;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
  }
  .input-wrapper input::placeholder, .input-wrapper textarea::placeholder {
    color: #475569;
  }

  /* ── Form Action Buttons ── */
  .reg-modal-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
    padding-top: 18px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
  .btn-cancel {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #cbd5e1;
    padding: 10px 18px;
    border-radius: 9px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
  }
  .btn-save-customer {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
    color: #ffffff;
    border: none;
    padding: 11px 22px;
    border-radius: 9px;
    font-weight: 700;
    font-size: 14px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(37, 99, 235, 0.35);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .btn-save-customer:hover {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.5);
    transform: translateY(-1px);
  }

  /* ── Member Details Grid (When Member Found) ── */
  .member-details-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .member-detail-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: rgba(15, 23, 42, 0.6);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.06);
  }
  .detail-label {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.6px;
  }
  .detail-value {
    color: #f8fafc;
    font-size: 14px;
    font-weight: 500;
  }
  .highlight-badge {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    padding: 4px 10px;
    border-radius: 6px;
    font-family: monospace;
    font-weight: 700;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  .points-badge {
    color: #fbbf24;
    font-weight: 700;
  }
  .member-modal-footer {
    padding: 16px 24px;
    background: rgba(15, 23, 42, 0.85);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: flex-end;
  }
  /* ── Zero-Scroll Single-Screen Responsive Layout ── */
  .sale-page {
    background: #96ceca;
    color: #111;
    height: 100vh;
    max-height: 100vh;
    width: 100vw;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 0;
    margin: 0;
    font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  }

  .shortcut-bar {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    color: #fff;
    padding: 6px 12px;
    margin-bottom: 6px;
    border-radius: 6px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    font-size: 11px;
    font-family: monospace;
    border: 1px solid #00bcd4;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    flex-shrink: 0;
  }

  .shortcuts-active-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 188, 212, 0.25);
    border: 1px solid #00bcd4;
    color: #00e5ff;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
  }

  .shortcuts-active-btn:hover {
    background: rgba(0, 188, 212, 0.45);
    box-shadow: 0 0 10px rgba(0, 188, 212, 0.6);
    transform: scale(1.02);
  }

  .shortcuts-key-badge {
    background: #00bcd4;
    color: #000;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: bold;
  }
  .shortcut-title {
    font-weight: bold;
    color: #00bcd4;
    font-size: 11px;
  }
  .shortcut-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .shortcut-list span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(0,0,0,0.5);
    padding: 2px 6px;
    border-radius: 12px;
  }
  .shortcut-list kbd {
    background: #2d2d44;
    border: 1px solid #00bcd4;
    border-radius: 4px;
    padding: 1px 5px;
    font-weight: bold;
    color: #00bcd4;
    font-size: 10px;
    margin-right: 4px;
  }
  .shortcut-hint {
    font-size: 9px;
    color: #ff9800;
    margin-left: 4px;
    font-family: monospace;
    background: rgba(0,0,0,0.3);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .sale-window {
    background: #96ceca;
    border: none;
    box-shadow: none;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 0;
    flex: 1;
    box-sizing: border-box;
  }

  .sale-titlebar {
    height: 22px;
    min-height: 22px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 16px;
    background: linear-gradient(90deg, #2c3e50, #1a1a2e);
    color: #fff;
    border-bottom: 1px solid #00bcd4;
    font-size: 11px;
    font-weight: bold;
    flex-shrink: 0;
  }

  .sale-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
    background: #96ceca;
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 280px;
  }

  .header-middle {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0 10px;
  }

  .header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 160px;
  }

  .field-group {
    display: flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }

  .field-group label {
    min-width: 60px;
    font-weight: 600;
    color: #222;
    font-size: 11px;
  }

  .field-group input, .field-group select, .field-group textarea {
    height: 22px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 6px;
    font: inherit;
    font-size: 11px;
    border-radius: 3px;
  }

  .field-group textarea {
    height: 36px;
    width: 160px;
    resize: none;
  }

  .mobile-field-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
    position: relative;
  }

  .mobile-field-group label {
    min-width: 60px;
    font-weight: 600;
    color: #333;
    font-size: 11px;
  }

  .mobile-field-group input {
    height: 22px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 6px;
    font: inherit;
    border-radius: 3px;
    width: 160px;
    font-size: 11px;
  }

  .mobile-suggestions {
    position: absolute;
    top: 100%;
    left: 68px;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 180px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .mobile-suggestion-item {
    padding: 6px 10px;
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
    min-width: 60px;
    font-weight: 600;
    color: #333;
    font-size: 11px;
  }

  .salesperson-field-group input {
    height: 22px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 6px;
    font: inherit;
    border-radius: 3px;
    width: 160px;
    font-size: 11px;
  }

  .salesperson-suggestions {
    position: absolute;
    top: 100%;
    left: 68px;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 180px;
    overflow-y: auto;
    z-index: 1000;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .salesperson-suggestion-item {
    padding: 6px 10px;
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
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 2px;
  }

  .check {
    display: inline-flex !important;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 700;
    color: #1e293b;
    cursor: pointer;
  }

  .check input {
    width: 13px;
    height: 13px;
    margin: 0;
    cursor: pointer;
  }

  .customer-name {
    background: #f1f5f9;
    color: #1e293b;
    border: 1px solid #cbd5e1;
    font-weight: 600;
    padding: 4px 10px;
    text-align: center;
    border-radius: 6px;
    font-size: 11px;
  }

  .clock {
    background: #e0f2fe;
    color: #0369a1;
    border: 1px solid #7dd3fc;
    font-weight: 800;
    padding: 3px 8px;
    text-align: center;
    font-family: monospace;
    border-radius: 4px;
    font-size: 11px;
  }

  .add-member-btn {
    background: #4caf50;
    color: #fff;
    border: none;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 2px;
    font-size: 11px;
  }

  .stock-row {
    display: flex;
    gap: 8px;
    margin-top: 2px;
  }

  .stock-row .field-group input {
    width: 60px;
  }

  .notice {
    margin: 0 10px 4px;
    padding: 4px 8px;
    background: #dff6dd;
    border: 1px solid #63a55c;
    font-weight: 700;
    font-size: 11px;
    border-radius: 4px;
    flex-shrink: 0;
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
    padding: 4px 10px;
    background: #e8e8e8;
    flex-shrink: 0;
  }

  .quick-add input {
    height: 26px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 8px;
    font-size: 11px;
    border-radius: 4px;
  }

  .quick-add button {
    border: 1px solid #000;
    background: #111;
    color: #fff;
    font-weight: 700;
    padding: 4px 14px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 11px;
    margin-left: 4px;
    transition: background 0.2s;
  }

  .quick-add button:hover:not(:disabled) {
    background: #333;
  }

  .quick-add button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Scrollable Flex Grid Wrap ── */
  .grid-wrap {
    background: #fff;
    border-top: 1px solid #7e7e7e;
    border-bottom: 1px solid #7e7e7e;
    flex: 1;
    min-height: 100px;
    overflow-y: auto;
    overflow-x: auto;
  }

  .sale-grid {
    width: 100%;
    min-width: 880px;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11px;
  }

  .sale-grid th {
    background: #f0f0f0;
    border-right: 1px solid #d0d0d0;
    border-bottom: 1px solid #c0c0c0;
    padding: 5px 6px;
    font-size: 10px;
    text-align: left;
    font-weight: 700;
    white-space: nowrap;
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .sale-grid td {
    border-right: 1px solid #e0e0e0;
    border-bottom: 1px solid #e8e8e8;
    padding: 2px 4px;
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
    padding: 2px 0;
    height: 20px;
  }

  .sale-grid input:focus {
    background: #fff9c4;
    border-radius: 3px;
    padding-left: 4px;
  }

  .sale-grid td:nth-child(8) input:focus {
    background: #e8f5e9;
    border: 1px solid #4caf50 !important;
    border-radius: 3px;
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
    width: 20px;
    height: 20px;
    border-radius: 3px;
    cursor: pointer;
    margin-left: 4px;
    font-weight: bold;
    font-size: 11px;
  }

  .row-delete:hover {
    background: #c82333;
  }

  /* ── Compact Zero-Scroll Footer Panel ── */
  .footer-panel {
    display: grid;
    grid-template-columns: 1.1fr 1.8fr 1.8fr 1.5fr 1.3fr;
    gap: 6px;
    padding: 6px;
    background: #f5f5f5;
    flex-shrink: 0;
    box-sizing: border-box;
  }

  .footer-col {
    display: flex;
    flex-direction: column;
    gap: 3px;
    background: #fff;
    padding: 5px 7px;
    border-radius: 5px;
    border: 1px solid #ddd;
    box-sizing: border-box;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    font-weight: 600;
  }

  .info-row span {
    color: #444;
    white-space: nowrap;
  }

  .info-row strong {
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #cbd5e1;
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 11px;
    min-width: 36px;
    text-align: center;
  }

  .info-row input {
    width: 75px;
    height: 19px;
    border: 1px solid #ccc;
    background: #fff;
    padding: 1px 4px;
    border-radius: 3px;
    text-align: right;
    font-size: 10px;
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
    margin-bottom: 2px;
    color: #2c3e50;
    font-size: 10px;
    border-bottom: 1px solid #eee;
    padding-bottom: 2px;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  .price-strip {
    margin-top: 2px;
  }

  .price-strip div {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
    padding: 1px 0;
    font-size: 10px;
  }

  .price-strip strong {
    background: #f1f5f9;
    color: #0f172a;
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid #cbd5e1;
  }

  .print-btn {
    width: 100%;
    padding: 4px;
    background: #ff9800;
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    margin-top: 4px;
    font-size: 11px;
  }

  .print-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pay-board {
    display: flex;
    flex-direction: column;
    gap: 4px;
    background: #fff;
    padding: 6px;
    border-radius: 5px;
    border: 1px solid #ddd;
  }

  .pay-card {
    background: linear-gradient(135deg, #667eea, #764ba2);
    padding: 4px 6px;
    border-radius: 6px;
    text-align: center;
  }

  .return-card {
    background: linear-gradient(135deg, #f093fb, #f5576c);
  }

  .pay-label {
    font-size: 8px;
    color: rgba(255,255,255,0.85);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 1px;
  }

  .pay-value {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
  }

  .payment-warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    color: #856404;
    padding: 3px 4px;
    border-radius: 4px;
    font-size: 9px;
    text-align: center;
    font-weight: bold;
    margin-top: 3px;
  }

  /* Responsive screen queries */
  @media (max-width: 1280px) {
    .footer-panel { grid-template-columns: 1fr 1.5fr 1.5fr 1.3fr 1.1fr; gap: 4px; padding: 4px; }
    .pay-value { font-size: 12px; }
    .info-row input { width: 65px; }
  }

  @media (max-height: 800px) {
    .sale-header { padding: 4px 8px; }
    .quick-add { padding: 2px 8px; }
    .footer-panel { padding: 4px 6px; gap: 4px; }
    .footer-col { padding: 4px 6px; gap: 2px; }
    .pay-card { padding: 3px 4px; }
    .pay-value { font-size: 13px; }
  }

  .print-only { display: none; }

  @media print {
    @page { size: 80mm auto; margin: 0; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
    }
    header, nav, .sidebar, .sale-titlebar, .sale-header, .quick-add, .grid-wrap, .footer-panel, .notice, .sp-suggestions, .modal-backdrop {
      display: none !important;
    }
    .sale-page, .sale-window {
      display: block !important;
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      box-shadow: none !important;
      border: none !important;
      height: auto !important;
      min-height: 0 !important;
    }
    .print-only {
      display: block !important;
      visibility: visible !important;
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: 76mm !important;
      padding: 3mm 2mm 5mm !important;
      margin: 0 auto !important;
      font-family: 'Courier New', Courier, monospace, monospace;
      font-size: 11px;
      line-height: 1.3;
      color: #000;
      background: #fff;
      page-break-after: avoid !important;
      page-break-before: avoid !important;
      page-break-inside: avoid !important;
    }
    .print-only * { visibility: visible !important; color: #000 !important; }
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

    .receipt-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .receipt-table th { font-weight: 800; font-size: 11px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; }
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
  }

  .sp-suggestions {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ccc;
    border-radius: 4px;
    max-height: 180px;
    overflow-y: auto;
    z-index: 1001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .sp-suggestion-item {
    padding: 6px 10px;
    cursor: pointer;
    border-bottom: 1px solid #eee;
    font-size: 11px;
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
