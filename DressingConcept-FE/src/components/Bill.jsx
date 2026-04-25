// Bill.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const Bill = () => {
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [barcode, setBarcode] = useState('');

  // Bill information
  const [billNumber, setBillNumber] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // Customer information
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGST, setCustomerGST] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerType, setCustomerType] = useState('external'); // 'internal' or 'external'
  const [customerDiscount, setCustomerDiscount] = useState(0); // Default discount for customer type
  const [memberId, setMemberId] = useState('');
  const [isClassicCustomer, setIsClassicCustomer] = useState(false);
  const [salesPerson, setSalesPerson] = useState('');
  const [counter, setCounter] = useState('Counter_1');
  const [isSaleReturn, setIsSaleReturn] = useState(false);
  const [isCardBill, setIsCardBill] = useState(false);
  const [noRewards, setNoRewards] = useState(false);

  // Company information (from selected company)
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);

  // User information (bill created by)
  const [createdBy, setCreatedBy] = useState('');

  // Discount information
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' or 'fixed'
  const [manualDiscount, setManualDiscount] = useState(false); // Track if discount is manually set

  // Tax information
  const [tax, setTax] = useState(0);
  const [taxType, setTaxType] = useState('percentage'); // 'percentage' or 'fixed'

  // Payment information
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('pending');

  // Payment details for different methods
  const [cashReceived, setCashReceived] = useState(0);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [bankName, setBankName] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [billSaved, setBillSaved] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [lastGeneratedBill, setLastGeneratedBill] = useState(null);
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [savedBillId, setSavedBillId] = useState(null);
  const [fetchingCustomer, setFetchingCustomer] = useState(false);
  const [productIdInput, setProductIdInput] = useState('');
  const [availablePoints, setAvailablePoints] = useState(0);
  const [redeemedPoints, setRedeemedPoints] = useState(0);

  // Shop details (will be overridden by selected company)
  const defaultShopDetails = {
    name: 'Dressing Concept',
    address: 'No.71, M.T.H.road (Opp padi post office)',
    city: 'Padi, Chennai - 600 050',
    phone: '',
    gst: '',
  };

  const [shopDetails, setShopDetails] = useState(defaultShopDetails);
  const REWARD_POINTS_PER_RUPEE = 0.01;

  // Refs
  const billPaperRef = useRef(null);
  const downloadLinkRef = useRef(null);

  // Create axios instance with credentials
  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add request interceptor for debugging
  api.interceptors.request.use(request => {
    console.log('Starting Request:', request.url);
    return request;
  });

  // Add response interceptor for error handling
  api.interceptors.response.use(
    response => {
      console.log('Response:', response.status);
      return response;
    },
    error => {
      console.log('Response Error:', error.response?.status, error.response?.data);
      if (error.response?.status === 401) {
        setIsAuthenticated(false);
        setError('Session expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
      return Promise.reject(error);
    }
  );

  // Base styles (without dynamic values)
  const baseStyles = {
    container: {
      display: 'grid',
      gridTemplateColumns: '1fr 400px',
      gap: '24px',
      padding: '24px',
      minHeight: '100vh',
      background: '#f4f6f8',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    },
    productPanel: {
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      overflow: 'auto',
      maxHeight: 'calc(100vh - 48px)',
    },
    productPanelTitle: {
      marginBottom: '24px',
      color: '#1a1a1a',
      borderBottom: '2px solid #e9ecef',
      paddingBottom: '12px',
      fontSize: '24px',
      fontWeight: '600',
    },
    alert: {
      padding: '14px 16px',
      borderRadius: '8px',
      marginBottom: '16px',
      fontWeight: '500',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    alertError: {
      background: '#fff5f5',
      color: '#c53030',
      border: '1px solid #fed7d7',
    },
    alertSuccess: {
      background: '#f0fff4',
      color: '#276749',
      border: '1px solid #c6f6d5',
    },
    searchSection: {
      background: '#f8faff',
      padding: '20px',
      borderRadius: '10px',
      marginBottom: '20px',
      border: '1px solid #e2e8f0',
    },
    searchBox: {
      marginBottom: '14px',
      position: 'relative',
    },
    searchLabel: {
      display: 'block',
      marginBottom: '6px',
      fontWeight: '600',
      color: '#2d3748',
      fontSize: '13px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    searchInput: {
      width: '100%',
      padding: '12px 16px',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      fontSize: '15px',
      fontFamily: 'inherit',
      transition: 'border-color 0.2s',
      outline: 'none',
      boxSizing: 'border-box',
    },
    searchLoading: {
      position: 'absolute',
      right: '10px',
      top: '40px',
      color: '#666',
      fontSize: '12px',
      background: 'white',
      padding: '2px 8px',
      borderRadius: '3px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    },
    barcodeInput: {
      display: 'flex',
      gap: '10px',
      marginBottom: '16px',
      alignItems: 'stretch',
    },
    barcodeField: {
      flex: 1,
      padding: '12px 16px',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      fontSize: '15px',
      fontFamily: 'inherit',
      outline: 'none',
      boxSizing: 'border-box',
      minWidth: 0,
    },
    barcodeButton: {
      padding: '0 24px',
      background: '#28a745',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '15px',
      transition: 'background 0.2s',
      whiteSpace: 'nowrap',
    },
    barcodeButtonDisabled: {
      background: '#6c757d',
      cursor: 'not-allowed',
      opacity: 0.7,
    },
    searchResults: {
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '5px',
      maxHeight: '300px',
      overflowY: 'auto',
      marginTop: '10px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      position: 'absolute',
      width: 'calc(100% - 40px)',
      zIndex: 1000,
    },
    searchResultItem: {
      padding: '12px',
      borderBottom: '1px solid #eee',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      transition: 'background 0.2s',
    },
    resultInfo: {
      flex: 1,
    },
    resultName: {
      fontWeight: 'bold',
      color: '#333',
    },
    resultDetails: {
      fontSize: '12px',
      color: '#666',
      marginTop: '2px',
    },
    resultPrice: {
      fontWeight: 'bold',
      color: '#28a745',
      fontSize: '16px',
    },
    selectedProducts: {
      marginTop: '24px',
    },
    selectedProductsTitle: {
      marginBottom: '14px',
      color: '#2d3748',
      borderBottom: '2px solid #e2e8f0',
      paddingBottom: '10px',
      fontSize: '16px',
      fontWeight: '600',
    },
    noItems: {
      textAlign: 'center',
      color: '#a0aec0',
      padding: '36px 20px',
      fontStyle: 'italic',
      background: '#f7fafc',
      borderRadius: '8px',
      border: '1px dashed #e2e8f0',
      fontSize: '14px',
    },
    selectedItemsList: {
      maxHeight: '420px',
      overflowY: 'auto',
    },
    selectedItem: {
      display: 'grid',
      gridTemplateColumns: '2fr 80px 80px 90px 36px',
      gap: '10px',
      padding: '12px 14px',
      background: '#fff',
      marginBottom: '8px',
      borderRadius: '8px',
      alignItems: 'center',
      border: '1px solid #e2e8f0',
      transition: 'box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    },
    itemInfo: {
      display: 'flex',
      flexDirection: 'column',
      gap: '2px',
    },
    itemName: {
      fontWeight: '600',
      color: '#2d3748',
      fontSize: '14px',
    },
    itemModel: {
      fontSize: '11px',
      color: '#718096',
    },
    itemPrice: {
      fontWeight: '600',
      color: '#2f855a',
      textAlign: 'right',
      fontSize: '13px',
    },
    itemTotal: {
      fontWeight: '700',
      color: '#2d3748',
      textAlign: 'right',
      fontSize: '14px',
    },
    itemQuantity: {
      width: '100%',
      padding: '6px 4px',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      textAlign: 'center',
      fontFamily: 'inherit',
      fontSize: '14px',
      fontWeight: '600',
    },
    removeBtn: {
      background: '#fff5f5',
      color: '#e53e3e',
      border: '1px solid #fed7d7',
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.15s',
    },
    billPanel: {
      background: '#f7f9fc',
      borderRadius: '12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      position: 'sticky',
      top: '24px',
      height: 'fit-content',
      maxHeight: 'calc(100vh - 48px)',
      overflow: 'auto',
      border: '1px solid #e2e8f0',
    },
    billContainer: {
      padding: '16px',
    },
    billPaper: {
      background: 'white',
      padding: '24px 16px',
      border: '1px solid #e9ecef',
      boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
      position: 'relative',
      marginBottom: '20px',
      borderRadius: '8px',
      width: '100%',
      maxWidth: '360px',
      margin: '0 auto',
      fontFamily: "'Courier New', monospace",
      fontSize: '12px',
      lineHeight: '1.4',
    },
    billHeader: {
      textAlign: 'center',
      marginBottom: '16px',
      paddingBottom: '12px',
      borderBottom: '1px dashed #333',
    },
    billHeaderH1: {
      fontSize: '16px',
      letterSpacing: '1px',
      marginBottom: '3px',
      color: '#333',
      fontWeight: 'bold',
    },
    billHeaderP: {
      fontSize: '9px',
      color: '#666',
      margin: '1px 0',
      lineHeight: '1.2',
    },
    billInfo: {
      margin: '10px 0',
      padding: '6px 0',
      borderTop: '1px dashed #333',
      borderBottom: '1px dashed #333',
    },
    billInfoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '2px',
      fontSize: '10px',
    },
    billNumber: {
      fontWeight: 'bold',
      color: '#007bff',
    },
    customerSection: {
      margin: '10px 0',
      padding: '8px',
      background: '#f9f9f9',
      borderRadius: '2px',
      border: '1px solid #e9ecef',
    },
    customerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '4px',
      fontSize: '10px',
    },
    customerLabel: {
      fontWeight: 'bold',
      color: '#555',
    },
    customerValue: {
      color: '#333',
      maxWidth: '180px',
      textAlign: 'right',
    },
    customerTypeBadge: {
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
    },
    internalBadge: {
      background: '#cce5ff',
      color: '#004085',
    },
    externalBadge: {
      background: '#fff3cd',
      color: '#856404',
    },
    customerInput: {
      width: '100%',
      padding: '6px 8px',
      marginBottom: '5px',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '11px',
      outline: 'none',
      transition: 'border-color 0.2s',
      boxSizing: 'border-box',
    },
    customerTypeSelect: {
      width: '100%',
      padding: '6px 8px',
      marginBottom: '5px',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '11px',
      outline: 'none',
    },
    billItems: {
      margin: '10px 0',
    },
    billItemsHeader: {
      display: 'grid',
      gridTemplateColumns: '3fr 1fr 1.2fr 0.8fr 1.2fr',
      fontWeight: 'bold',
      padding: '6px 4px',
      borderBottom: '1px dashed #333',
      fontSize: '11px',
      background: '#f8f9fa',
    },
    billItem: {
      display: 'grid',
      gridTemplateColumns: '3fr 1fr 1.2fr 0.8fr 1.2fr',
      padding: '4px 4px',
      borderBottom: '1px dotted #ccc',
      fontSize: '10px',
      alignItems: 'center',
    },
    billItemEmpty: {
      textAlign: 'center',
      color: '#999',
      padding: '10px',
      fontStyle: 'italic',
      fontSize: '10px',
    },
    billItemName: {
      display: 'flex',
      flexDirection: 'column',
    },
    billItemSmall: {
      fontSize: '7px',
      color: '#666',
    },
    billSummary: {
      margin: '10px 0',
      padding: '8px 0',
      borderTop: '1px solid #333',
    },
    summaryRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '3px',
      fontSize: '10px',
    },
    summaryRowTotal: {
      fontWeight: 'bold',
      fontSize: '12px',
      borderTop: '1px dashed #333',
      paddingTop: '6px',
      marginTop: '6px',
      color: '#333',
    },
    discountSection: {
      margin: '8px 0',
      padding: '6px',
      background: '#f0f7ff',
      borderRadius: '3px',
      border: '1px solid #b8daff',
    },
    discountHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '5px',
      cursor: 'pointer',
    },
    discountTitle: {
      fontWeight: 'bold',
      color: '#004085',
      fontSize: '11px',
    },
    discountToggle: {
      color: '#007bff',
      fontSize: '12px',
    },
    discountControls: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '5px',
      marginTop: '5px',
    },
    discountInput: {
      padding: '4px',
      border: '1px solid #ddd',
      borderRadius: '3px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      width: '100%',
    },
    discountTypeSelect: {
      padding: '4px',
      border: '1px solid #ddd',
      borderRadius: '3px',
      fontFamily: "'Courier New', monospace",
      fontSize: '10px',
      width: '100%',
    },
    discountAmount: {
      fontSize: '10px',
      color: '#28a745',
      fontWeight: 'bold',
      marginTop: '3px',
    },
    summaryInput: {
      width: '50px',
      padding: '2px',
      border: '1px solid #ddd',
      borderRadius: '2px',
      textAlign: 'right',
      fontFamily: "'Courier New', monospace",
      fontSize: '9px',
      marginLeft: '3px',
    },
    paymentSection: {
      margin: '10px 0',
      padding: '10px',
      background: '#fff',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      fontSize: '11px',
    },
    paymentRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '6px',
      alignItems: 'center',
    },
    paymentSelect: {
      padding: '5px 8px',
      width: '110px',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '11px',
      outline: 'none',
    },
    paymentInput: {
      width: '85px',
      padding: '4px 6px',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      textAlign: 'right',
      fontFamily: 'inherit',
      fontSize: '11px',
      outline: 'none',
    },
    paymentDetails: {
      marginTop: '8px',
      padding: '8px',
      background: '#f7fafc',
      borderRadius: '5px',
      border: '1px solid #e2e8f0',
    },
    paymentDetailsInput: {
      width: '100%',
      padding: '6px 8px',
      marginBottom: '5px',
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      fontFamily: 'inherit',
      fontSize: '11px',
      outline: 'none',
      boxSizing: 'border-box',
    },
    billFooter: {
      textAlign: 'center',
      marginTop: '12px',
      paddingTop: '10px',
      borderTop: '1px dashed #aaa',
      fontSize: '9px',
    },
    billFooterP: {
      marginBottom: '2px',
      color: '#666',
    },
    actionButtons: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px',
      marginTop: '16px',
    },
    whatsappButton: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '11px',
      marginTop: '10px',
      background: '#25D366',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background 0.2s',
      textDecoration: 'none',
      width: '100%',
    },
    btn: {
      padding: '10px 12px',
      border: 'none',
      borderRadius: '7px',
      fontWeight: '600',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'all 0.15s',
      fontFamily: 'inherit',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '4px',
    },
    btnDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    btnPrimary: {
      background: '#007bff',
      color: 'white',
    },
    btnSuccess: {
      background: '#28a745',
      color: 'white',
    },
    btnDanger: {
      background: '#dc3545',
      color: 'white',
    },
    btnSecondary: {
      background: '#6c757d',
      color: 'white',
    },
    btnInfo: {
      background: '#17a2b8',
      color: 'white',
    },
    btnWarning: {
      background: '#ffc107',
      color: '#333',
    },
    downloadLink: {
      display: 'none',
    },
    companySelector: {
      marginBottom: '16px',
      padding: '12px 14px',
      background: '#ebf4ff',
      borderRadius: '8px',
      cursor: 'pointer',
      border: '1px solid #bee3f8',
    },
    companyName: {
      fontWeight: '700',
      color: '#2b6cb0',
      fontSize: '14px',
    },
    companyDropdown: {
      marginTop: '8px',
      padding: '4px',
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '6px',
      maxHeight: '200px',
      overflowY: 'auto',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    },
    companyOption: {
      padding: '10px 12px',
      cursor: 'pointer',
      borderBottom: '1px solid #f7fafc',
      transition: 'background 0.15s',
      fontSize: '14px',
      borderRadius: '4px',
    },
    companyOptionHover: {
      background: '#ebf8ff',
    },
  };

  // Check authentication on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        // Set the name for display and the ID for saving
        setCreatedBy(userData.full_name || userData.name || userData.username || 'System');
      } catch (e) {
        setCreatedBy('System');
      }
    } else {
      setIsAuthenticated(false);
      setError('Please login first');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
  }, []);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch companies from API
  const fetchCompanies = async () => {
    try {
      const response = await api.get('/companies/list');
      if (response.data && response.data.length > 0) {
        setCompanies(response.data);
        // Auto-select first company if available
        const firstCompany = response.data[0];
        setSelectedCompany(firstCompany);
        fetchCompanyDetails(firstCompany.id);
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      setError('Failed to fetch companies');
    }
  };

  // Fetch company details by ID
  const fetchCompanyDetails = async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      if (response.data) {
        const company = response.data;
        setShopDetails({
          name: company.name || defaultShopDetails.name,
          address: company.address || defaultShopDetails.address,
          city: company.city || defaultShopDetails.city,
          phone: company.phone || '',
          gst: company.gst_number || '',
        });
      }
    } catch (err) {
      console.error('Error fetching company details:', err);
    }
  };

  // Handle company selection
  const handleCompanySelect = async (company) => {
    setSelectedCompany(company);
    setShowCompanySelector(false);
    await fetchCompanyDetails(company.id);
    setSuccess(`Switched to ${company.name}`);
    setTimeout(() => setSuccess(''), 2000);
  };

  // Generate random bill number (for display only, backend will generate unique)
  const generateBillNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 8; i++) {
      random += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    setBillNumber(`BT-${year}${month}${day}-${random}`);
  };

  // Update date and time
  const updateDateTime = () => {
    const now = new Date();
    setCurrentDate(now.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }));
    setCurrentTime(now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }));
  };

  // Initialize
  useEffect(() => {
    generateBillNumber();
    updateDateTime();

    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Search products with debounce
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.length >= 2) {
        searchProducts();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Update payment status when paid amount changes
  useEffect(() => {
    const total = calculateTotal();
    if (paidAmount === 0) {
      setPaymentStatus('pending');
    } else if (paidAmount < total) {
      setPaymentStatus('partial');
    } else if (paidAmount >= total) {
      setPaymentStatus('paid');
    }
  }, [paidAmount, selectedProducts, discount, tax, discountType, taxType, redeemedPoints, availablePoints, noRewards]);

  // Set discount based on customer type (only if not manually set)
  useEffect(() => {
    if (!manualDiscount) {
      if (customerType === 'internal') {
        setCustomerDiscount(10); // 10% discount for internal customers
        setDiscount(10);
        setDiscountType('percentage');
      } else {
        setCustomerDiscount(0);
        setDiscount(0);
        setDiscountType('percentage');
      }
    }
  }, [customerType, manualDiscount]);

  // Add thermal print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
          margin: 0 !important;
          padding: 0 !important;
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
        
        #billPaper, #billPaper * {
          visibility: visible !important;
          background: white !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
        
        #billPaper {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 280px !important;
          margin: 0 !important;
          padding: 12px !important;
          border: none !important;
          box-shadow: none !important;
          background: white !important;
        }
        
        #billPaper div,
        #billPaper span,
        #billPaper p,
        #billPaper h1,
        #billPaper h2,
        #billPaper h3,
        #billPaper table,
        #billPaper tr,
        #billPaper td,
        #billPaper th {
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
          background: white !important;
        }
        
        #billPaper .bill-header {
          border-bottom: 1px dashed #000 !important;
        }
        
        #billPaper .bill-info {
          border-top: 1px dashed #000 !important;
          border-bottom: 1px dashed #000 !important;
        }
        
        #billPaper .bill-items-header {
          border-bottom: 1px solid #000 !important;
        }
        
        #billPaper .bill-item {
          border-bottom: 1px dotted #000 !important;
        }
        
        #billPaper .bill-summary {
          border-top: 1px solid #000 !important;
        }
        
        #billPaper .bill-footer {
          border-top: 1px dashed #000 !important;
        }
        
        #billPaper * {
          background: white !important;
          color: black !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        #billPaper input,
        #billPaper select,
        #billPaper button,
        #billPaper .no-print {
          display: none !important;
        }
        
        #billPaper .payment-section {
          display: none !important;
        }
        
        #billPaper .customer-section input,
        #billPaper .customer-section select,
        #billPaper .customer-section button {
          display: none !important;
        }
        
        #billPaper .customer-section {
          border: none !important;
          padding: 0 !important;
          margin: 10px 0 !important;
        }
        
        #billPaper .discount-section {
          display: none !important;
        }
        
        @page {
          size: 80mm auto !important;
          margin: 0 !important;
        }
        
        .no-print {
          display: none !important;
        }
      }
      
      @media screen {
        #billPaper input,
        #billPaper select,
        #billPaper button {
          display: block;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Clear payment method specific fields when method changes
  useEffect(() => {
    setShowPaymentDetails(true);
    switch (paymentMethod) {
      case 'cash':
        setCardNumber('');
        setCardHolderName('');
        setUpiId('');
        setTransactionId('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'card':
        setCashReceived(0);
        setUpiId('');
        setTransactionId('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'upi':
        setCashReceived(0);
        setCardNumber('');
        setCardHolderName('');
        setBankName('');
        setChequeNumber('');
        break;
      case 'cheque':
        setCashReceived(0);
        setCardNumber('');
        setCardHolderName('');
        setUpiId('');
        setTransactionId('');
        break;
      default:
        break;
    }
  }, [paymentMethod]);

  // Fetch customer by phone
  const fetchCustomerByPhone = async (phone) => {
    if (phone.length < 10) return;

    setFetchingCustomer(true);
    try {
      const response = await api.get(`/billing/customer/${phone}`);
      if (response.data && response.data.exists) {
        const customer = response.data.customer;
        setCustomerName(customer.name || 'Walk-in Customer');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
        setCustomerGST(customer.gst || '');
        setCustomerType(customer.type || 'external');
        setMemberId(customer.memberId || customer.member_id || phone);
        setAvailablePoints(parseFloat(customer.rewardPoints || customer.reward_points || 0) || 0);
        setRedeemedPoints(0);
        setSuccess('Customer found! Details auto-filled.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Error fetching customer:', err);
    } finally {
      setFetchingCustomer(false);
    }
  };

  // Auto-fetch customer when phone reaches 10 digits
  useEffect(() => {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      fetchCustomerByPhone(cleanPhone);
    } else if (!memberId || memberId.length <= 10) {
      setMemberId(cleanPhone);
    }
  }, [customerPhone]);




  // Search products API call
  const searchProducts = async () => {
    if (!isAuthenticated) return;

    setSearchLoading(true);
    setError('');

    try {
      const response = await api.get(`/billing/search-products?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Failed to search products');
      }
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Get product by barcode
  const getProductByBarcode = async () => {
    if (!isAuthenticated) return;
    if (!barcode.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/billing/product/barcode/${barcode}`);
      addProductToBill(response.data);
      setBarcode('');
    } catch (err) {
      console.error('Barcode error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.error || 'Product not found');
      }
    } finally {
      setLoading(false);
    }
  };

  const getProductById = async () => {
    if (!isAuthenticated) return;
    if (!productIdInput.trim()) return;

    setLoading(true);
    setError('');
    const lookup = productIdInput.trim();

    try {
      let product = null;
      try {
        const response = await api.get(`/billing/product/${encodeURIComponent(lookup)}`);
        product = response.data;
      } catch (_) {}

      if (!product) {
        try {
          const response = await api.get(`/billing/product/code/${encodeURIComponent(lookup)}`);
          product = response.data;
        } catch (_) {}
      }

      if (!product) {
        const response = await api.get(`/billing/search-products?q=${encodeURIComponent(lookup)}`);
        if (Array.isArray(response.data) && response.data.length) {
          product =
            response.data.find((p) => String(p.productCode || p.code || '').toLowerCase() === lookup.toLowerCase()) ||
            response.data.find((p) => String(p.id) === String(lookup)) ||
            response.data[0];
        }
      }

      if (!product) throw new Error('Product not found');
      addProductToBill(product);
      setProductIdInput('');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Product not found by Product ID');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Add product to bill
  const addProductToBill = (product) => {
    const existingProduct = selectedProducts.find(p => p.id === product.id);

    if (existingProduct) {
      if (existingProduct.quantity < product.quantity) {
        const updatedProducts = selectedProducts.map(p =>
          p.id === product.id
            ? {
              ...p,
              quantity: p.quantity + 1,
              total: (p.quantity + 1) * p.sellPrice
            }
            : p
        );
        setSelectedProducts(updatedProducts);
        setSuccess(`Added another ${product.name}`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError(`Insufficient stock! Max available: ${product.quantity}`);
        setTimeout(() => setError(''), 3000);
      }
    } else {
      if (product.quantity > 0) {
        setSelectedProducts([
          ...selectedProducts,
          {
            id: product.id,
            productCode: product.productCode || product.code || product.id,
            name: product.name,
            model: product.model || '',
            description: product.description || product.name || '',
            size: product.size || product.model || '',
            unit: product.unit || 'PCS',
            tax: parseFloat(product.tax || 0),
            mrp: parseFloat(product.mrp || product.sellPrice || 0),
            sellPrice: product.sellPrice,
            discountPercent: parseFloat(product.discountPercent || 0),
            netPrice: parseFloat(product.netPrice || product.sellPrice || 0),
            quantity: 1,
            total: product.sellPrice,
            maxQuantity: product.quantity
          }
        ]);
        setSuccess(`${product.name} added to bill`);
        setTimeout(() => setSuccess(''), 2000);
      } else {
        setError('Out of stock!');
        setTimeout(() => setError(''), 3000);
      }
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  // Update quantity - Now sets to 0 instead of deleting
  const updateQuantity = (productId, newQuantity) => {
    const product = selectedProducts.find(p => p.id === productId);

    if (product) {
      newQuantity = parseInt(newQuantity) || 0;

      // Allow quantity to be 0 (will show as 0 quantity item)
      if (newQuantity >= 0 && newQuantity <= product.maxQuantity) {
        const updatedProducts = selectedProducts.map(p =>
          p.id === productId
            ? { ...p, quantity: newQuantity, total: newQuantity * p.sellPrice }
            : p
        );
        setSelectedProducts(updatedProducts);

        if (newQuantity === 0) {
          setSuccess(`${product.name} quantity set to 0`);
        } else {
          setSuccess(`Updated ${product.name} quantity`);
        }
        setTimeout(() => setSuccess(''), 2000);
      } else if (newQuantity > product.maxQuantity) {
        setError(`Invalid quantity! Max available: ${product.maxQuantity}`);
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Remove product - Only for complete removal (separate function)
  const removeProduct = (productId) => {
    const product = selectedProducts.find(p => p.id === productId);
    setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    setSuccess(`${product.name} removed from bill`);
    setTimeout(() => setSuccess(''), 2000);
  };

  // Calculate subtotal (only items with quantity > 0)
  const calculateSubtotal = () => {
    return selectedProducts
      .filter(p => p.quantity > 0)
      .reduce((sum, p) => sum + p.total, 0);
  };

  // Calculate discount amount
  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) return 0;

    if (discountType === 'percentage') {
      return (subtotal * discount) / 100;
    }
    return Math.min(discount, subtotal); // Fixed amount cannot exceed subtotal
  };

  // Calculate tax amount (applied after discount)
  const calculateTaxAmount = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const afterDiscount = subtotal - discountAmount;

    if (afterDiscount <= 0) return 0;

    if (taxType === 'percentage') {
      return (afterDiscount * tax) / 100;
    }
    return Math.min(tax, afterDiscount); // Fixed tax cannot exceed after discount amount
  };

  const calculateBaseTotal = () => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    return Math.max(0, subtotal - discountAmount + taxAmount);
  };

  const calculateRedeemValue = () => {
    const baseTotal = calculateBaseTotal();
    const safeAvailable = Math.max(0, parseFloat(availablePoints) || 0);
    const safeRedeemed = Math.max(0, parseFloat(redeemedPoints) || 0);
    return Math.min(safeRedeemed, safeAvailable, baseTotal);
  };

  // Calculate total (subtotal - discount + tax - redeemed points)
  const calculateTotal = () => {
    const baseTotal = calculateBaseTotal();
    const redeemValue = calculateRedeemValue();
    return Math.max(0, baseTotal - redeemValue);
  };

  const calculateEarnedPoints = () => {
    if (noRewards) return 0;
    return Math.max(0, Math.floor(calculateTotal() * REWARD_POINTS_PER_RUPEE));
  };

  const calculateRemainingPoints = () => {
    const safeAvailable = Math.max(0, parseFloat(availablePoints) || 0);
    const safeRedeemed = Math.max(0, parseFloat(redeemedPoints) || 0);
    return Math.max(0, safeAvailable - safeRedeemed + calculateEarnedPoints());
  };

  // Calculate change
  const calculateChange = () => {
    const total = calculateTotal();
    return Math.max(0, paidAmount - total);
  };

  // Calculate due amount
  const calculateDue = () => {
    const total = calculateTotal();
    return Math.max(0, total - paidAmount);
  };

  // Handle discount change
  const handleDiscountChange = (value) => {
    setManualDiscount(true); // Mark as manually set
    const numValue = parseFloat(value) || 0;
    const subtotal = calculateSubtotal();

    // Validate based on discount type
    if (discountType === 'percentage') {
      if (numValue > 100) {
        setError('Percentage discount cannot exceed 100%');
        setDiscount(100);
      } else if (numValue < 0) {
        setDiscount(0);
      } else {
        setDiscount(numValue);
      }
    } else {
      if (numValue > subtotal) {
        setError('Fixed discount cannot exceed subtotal');
        setDiscount(subtotal);
      } else if (numValue < 0) {
        setDiscount(0);
      } else {
        setDiscount(numValue);
      }
    }

    // Clear error after 3 seconds
    setTimeout(() => setError(''), 3000);
  };

  // Handle discount type change
  const handleDiscountTypeChange = (type) => {
    setManualDiscount(true); // Mark as manually set
    const subtotal = calculateSubtotal();
    setDiscountType(type);

    // Convert discount value when type changes
    if (type === 'percentage') {
      // If switching to percentage, convert fixed amount to percentage
      if (discountType === 'fixed' && subtotal > 0) {
        const percentage = (discount / subtotal) * 100;
        setDiscount(Math.min(100, Math.round(percentage * 100) / 100));
      } else if (discount > 100) {
        setDiscount(100);
      }
    } else {
      // If switching to fixed, convert percentage to fixed amount
      if (discountType === 'percentage' && subtotal > 0) {
        const fixed = (subtotal * discount) / 100;
        setDiscount(Math.min(subtotal, Math.round(fixed * 100) / 100));
      } else if (discount > subtotal) {
        setDiscount(subtotal);
      }
    }
  };

  // Reset discount to customer default
  const resetDiscountToDefault = () => {
    setManualDiscount(false);
    if (customerType === 'internal') {
      setDiscount(10);
      setDiscountType('percentage');
    } else {
      setDiscount(0);
      setDiscountType('percentage');
    }
  };

  // Handle cash payment
  const handleCashPayment = (received) => {
    const amount = parseFloat(received) || 0;
    setCashReceived(amount);
    setPaidAmount(amount);
  };

  // Handle exact payment
  const handleExactPayment = () => {
    const total = calculateTotal();
    setPaidAmount(total);
    if (paymentMethod === 'cash') {
      setCashReceived(total);
    }
  };

  // Save bill to database
  const saveBillToDatabase = async () => {
    const activeProducts = selectedProducts.filter(p => p.quantity > 0);

    if (activeProducts.length === 0) {
      setError('No items with quantity > 0 to save!');
      return null;
    }

    setLoading(true);
    setError('');

    try {
      // Prepare bill data for API
      const billData = {
        customerName: customerName,
        customerPhone: customerPhone,
        customerEmail: customerEmail,
        customerGST: customerGST,
        customerAddress: customerAddress,
        customerType: customerType === 'internal' ? 'internal' : 'regular',
        memberId: memberId,
        isClassicCustomer: isClassicCustomer,
        salesPerson: salesPerson,
        counter: counter,
        isSaleReturn: isSaleReturn,
        isCardBill: isCardBill,
        noRewards: noRewards,
        rewardPointsAvailable: availablePoints,
        rewardPointsRedeemed: redeemedPoints,
        rewardPointsEarned: calculateEarnedPoints(),
        rewardPointsBalance: calculateRemainingPoints(),
        amountGiven: paidAmount,
        balanceReturned: calculateChange(),
        companyId: selectedCompany?.id,
        discount: discount,
        discountType: discountType === 'percentage' ? 'percentage' : 'amount',
        tax: tax,
        taxType: taxType === 'percentage' ? 'percentage' : 'amount',
        paidAmount: paidAmount,
        paymentMethod: paymentMethod,
        createdBy: JSON.parse(localStorage.getItem('user'))?.id,
        createdByName: createdBy, // Using the state variable which now has the correct name
        items: activeProducts.map(p => ({
          productId: p.id,
          quantity: p.quantity,
          mrp: p.mrp || p.sellPrice || 0,
          unit: p.unit || 'PCS',
          tax: p.tax || 0,
          size: p.size || p.model || '',
          discountPercent: p.discountPercent || 0,
          netPrice: p.netPrice || p.sellPrice || 0
        }))
      };

      console.log('Saving bill:', billData);

      const response = await api.post('/billing/bills', billData);

      if (response.data.success) {
        setSuccess('Bill saved successfully!');
        setSavedBillId(response.data.billId);
        setBillNumber(response.data.billNumber); // Update with actual bill number from backend
        setLastGeneratedBill({
          billNumber: response.data.billNumber,
          customerPhone: customerPhone,
          customerName: customerName
        });
        setShowWhatsApp(true);
        setBillSaved(true);

        return {
          billId: response.data.billId,
          billNumber: response.data.billNumber
        };
      } else {
        throw new Error(response.data.error || 'Failed to save bill');
      }
    } catch (err) {
      console.error('Save bill error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to save bill');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Generate HTML content for bill with updated shop details
  const generateBillHTML = (overrideBillNumber = null) => {
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    const total = calculateTotal();
    const due = calculateDue();
    const change = calculateChange();
    const earnedPoints = calculateEarnedPoints();
    const remainingPoints = calculateRemainingPoints();
    const activeProducts = selectedProducts.filter(p => p.quantity > 0);
    // Use provided bill number or fall back to state
    const displayBillNumber = overrideBillNumber || billNumber;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill - ${displayBillNumber}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            @page {
              size: A4 portrait;
              margin: 12mm;
            }

            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 14px;
              line-height: 1.5;
              background: white;
              color: #1f2937;
            }
            
            #billPaper {
              width: 100%;
              max-width: 180mm;
              margin: 0 auto;
              padding: 0;
              background: white;
            }
            
            .bill-header {
              text-align: center;
              margin-bottom: 24px;
            }
            .bill-logo {
              max-width: 120px;
              max-height: 60px;
              margin-bottom: 5px;
              object-fit: contain;
            }
            .bill-header h1 {
              font-size: 24px;
              letter-spacing: 1px;
              margin-bottom: 5px;
              color: #333;
              font-weight: bold;
            }
            
            .bill-header .owner {
              font-size: 12px;
              font-weight: bold;
              color: #333;
              margin: 4px 0;
            }
            
            .bill-header p {
              font-size: 12px;
              color: #666;
              margin: 2px 0;
              line-height: 1.4;
            }
            
            .bill-info {
              margin: 15px 0;
              padding: 10px 0;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
            }
            
            .bill-info-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 12px;
            }
            
            .bill-number {
              font-weight: bold;
              color: #007bff;
            }
            
            .customer-section {
              margin: 10px 0;
              padding: 8px;
              background: #f9f9f9;
              border-radius: 2px;
              border: 1px solid #e9ecef;
            }
            
            .customer-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              font-size: 10px;
            }
            
            .customer-label {
              font-weight: bold;
              color: #555;
            }
            
            .customer-value {
              color: #333;
              max-width: 180px;
              text-align: right;
            }
            
            .customer-type-badge {
              padding: 2px 6px;
              border-radius: 3px;
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
            }
            
            .internal-badge {
              background: #cce5ff;
              color: #004085;
            }
            
            .external-badge {
              background: #fff3cd;
              color: #856404;
            }
            
            .bill-items {
              margin: 10px 0;
            }
            
            .bill-items-header {
              display: grid;
              grid-template-columns: 3fr 1fr 1.2fr 0.8fr 1.2fr;
              font-weight: bold;
              padding: 8px 4px;
              border-bottom: 2px solid #000;
              font-size: 13px;
              background: #f8f9fa;
            }
            
            .bill-item {
              display: grid;
              grid-template-columns: 3fr 1fr 1.2fr 0.8fr 1.2fr;
              padding: 6px 4px;
              border-bottom: 1px solid #e9ecef;
              font-size: 12px;
              align-items: center;
            }
            
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            
            .bill-item-empty {
              text-align: center;
              color: #999;
              padding: 15px;
              font-style: italic;
              font-size: 12px;
            }
            
            .bill-item-name {
              display: flex;
              flex-direction: column;
            }
            
            .bill-item-small {
              font-size: 10px;
              color: #666;
            }
            
            .bill-summary {
              margin: 15px 0;
              padding: 10px 0;
              border-top: 2px solid #000;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
              font-size: 14px;
            }
            
            .summary-row-total {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-top: 10px;
              color: #000;
            }
            
            .payment-section {
              margin: 10px 0;
              padding: 8px;
              background: #f0f0f0;
              border-radius: 2px;
              border: 1px solid #ddd;
              font-size: 10px;
            }
            .reward-section {
              margin: 10px 0;
              padding: 8px;
              background: #eef6ff;
              border-radius: 2px;
              border: 1px solid #bfdbfe;
              font-size: 10px;
            }
            
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
              align-items: center;
            }
            
            .bill-footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 8px;
            }
            
            .bill-footer p {
              margin-bottom: 2px;
              color: #666;
            }
            
            .change-amount {
              font-weight: bold;
              color: ${paidAmount >= total ? '#28a745' : '#dc3545'};
              font-size: 10px;
            }
            
            .created-by {
              margin-top: 8px;
              padding-top: 5px;
              border-top: 1px dotted #ccc;
              font-size: 8px;
              text-align: center;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div id="billPaper">
            <div class="bill-header">
              <img src="/avva-logo.jpeg" class="bill-logo" alt="Avva Inventory Logo">
              <h1>${shopDetails.name}</h1>
              <p>${shopDetails.address}</p>
              <p>${shopDetails.city}</p>
              ${shopDetails.phone ? `<p>Ph: ${shopDetails.phone}</p>` : ''}
              ${shopDetails.gst ? `<p>GST: ${shopDetails.gst}</p>` : ''}
            </div>
            
            <div class="bill-info">
              <div class="bill-info-row">
                <span>Bill No:</span>
                <span class="bill-number">${displayBillNumber}</span>
              </div>
              <div class="bill-info-row">
                <span>Date:</span>
                <span>${currentDate}</span>
              </div>
              <div class="bill-info-row">
                <span>Time:</span>
                <span>${currentTime}</span>
              </div>
              <div class="bill-info-row">
                <span>Counter:</span>
                <span>${counter}</span>
              </div>
              ${memberId ? `
              <div class="bill-info-row">
                <span>Member ID:</span>
                <span>${memberId}</span>
              </div>
              ` : ''}
              ${salesPerson ? `
              <div class="bill-info-row">
                <span>Sales Person:</span>
                <span>${salesPerson}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="customer-section">
              <div class="customer-row">
                <span class="customer-label">Customer Type:</span>
                <span class="customer-type-badge ${customerType === 'internal' ? 'internal-badge' : 'external-badge'}">
                  ${customerType === 'internal' ? '🏢 INTERNAL' : '👤 EXTERNAL'}
                </span>
              </div>
              
              <div class="customer-row">
                <span class="customer-label">Name:</span>
                <span class="customer-value">${customerName}</span>
              </div>
              
              ${customerPhone ? `
              <div class="customer-row">
                <span class="customer-label">Phone:</span>
                <span class="customer-value">${customerPhone}</span>
              </div>
              ` : ''}
              
              ${customerEmail ? `
              <div class="customer-row">
                <span class="customer-label">Email:</span>
                <span class="customer-value">${customerEmail}</span>
              </div>
              ` : ''}
              
              ${customerAddress ? `
              <div class="customer-row">
                <span class="customer-label">Address:</span>
                <span class="customer-value">${customerAddress}</span>
              </div>
              ` : ''}
              
              ${customerGST ? `
              <div class="customer-row">
                <span class="customer-label">GST:</span>
                <span class="customer-value">${customerGST}</span>
              </div>
              ` : ''}
            </div>
            <div class="customer-section">
              <div class="customer-row"><span class="customer-label">Classic Customer:</span><span class="customer-value">${isClassicCustomer ? 'Yes' : 'No'}</span></div>
              <div class="customer-row"><span class="customer-label">Sale Return:</span><span class="customer-value">${isSaleReturn ? 'Yes' : 'No'}</span></div>
              <div class="customer-row"><span class="customer-label">Card Bill:</span><span class="customer-value">${isCardBill ? 'Yes' : 'No'}</span></div>
              <div class="customer-row"><span class="customer-label">No Rewards:</span><span class="customer-value">${noRewards ? 'Yes' : 'No'}</span></div>
            </div>
            
            
            ${discount > 0 ? `
            <div class="discount-section">
              <div class="discount-amount">
                Discount Amount: -₹${discountAmount.toFixed(2)}
                ${!manualDiscount && customerType === 'internal' ? ' (Staff discount)' : ''}
              </div>
            </div>
            ` : ''}
            
            <div class="bill-items">
              <div class="bill-items-header">
                <span>Item</span>
                <span class="text-right">MRP</span>
                <span class="text-right">Unit Price</span>
                <span class="text-center">Qty</span>
                <span class="text-right">Total</span>
              </div>
              <div>
                ${activeProducts.length === 0 ? `
                  <div class="bill-item-empty">
                    <span>--- No items in bill ---</span>
                  </div>
                ` : activeProducts.map(product => `
                  <div class="bill-item">
                    <span class="bill-item-name">
                      ${product.name.length > 12 ? product.name.substring(0, 10) + '...' : product.name}
                      ${product.model ? `<small class="bill-item-small">${product.model}</small>` : ''}
                    </span>
                    <span class="text-right">₹${(parseFloat(product.mrp || product.sellPrice || 0)).toFixed(2)}</span>
                    <span class="text-right">₹${(parseFloat(product.sellPrice || 0)).toFixed(2)}</span>
                    <span class="text-center">${product.quantity}</span>
                    <span class="text-right">₹${product.total.toFixed(2)}</span>
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="bill-summary">
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${subtotal.toFixed(2)}</span>
              </div>
              
              ${discount > 0 ? `
              <div class="summary-row">
                <span>Discount (${discount}${discountType === 'percentage' ? '%' : '₹'}):</span>
                <span>-₹${discountAmount.toFixed(2)}</span>
              </div>
              ` : ''}
              
              <div class="summary-row">
                <span>After Discount:</span>
                <span>₹${(subtotal - discountAmount).toFixed(2)}</span>
              </div>
              
              ${tax > 0 ? `
              <div class="summary-row">
                <span>Tax (${tax}${taxType === 'percentage' ? '%' : '₹'}):</span>
                <span>+₹${taxAmount.toFixed(2)}</span>
              </div>
              ` : ''}
              
              <div class="summary-row summary-row-total">
                <span>Total:</span>
                <span>₹${total.toFixed(2)}</span>
              </div>
            </div>
            <div class="reward-section">
              <div class="payment-row"><span>Available Points:</span><span>${availablePoints.toFixed(2)}</span></div>
              <div class="payment-row"><span>Redeemed Points:</span><span>${redeemedPoints.toFixed(2)}</span></div>
              <div class="payment-row"><span>Earned Points:</span><span>${earnedPoints.toFixed(2)}</span></div>
              <div class="payment-row"><span>Remaining Points:</span><span>${remainingPoints.toFixed(2)}</span></div>
            </div>
            
            <div class="payment-section">
              <div class="payment-row">
                <span>Payment Method:</span>
                <span>${paymentMethod.toUpperCase()}</span>
              </div>
              
              <div class="payment-row">
                <span>Amount Given:</span>
                <span>₹${paidAmount.toFixed(2)}</span>
              </div>
              
              <div class="payment-row">
                <span>Payment Status:</span>
                <span style="color: ${paymentStatus === 'paid' ? '#28a745' : paymentStatus === 'partial' ? '#ffc107' : '#dc3545'}; font-weight: bold;">
                  ${paymentStatus.toUpperCase()}
                </span>
              </div>
              
              ${due > 0 && paymentStatus !== 'pending' ? `
              <div class="payment-row">
                <span>Due Amount:</span>
                <span>₹${due.toFixed(2)}</span>
              </div>
              ` : ''}
              
              ${paymentMethod === 'cash' && paidAmount >= total ? `
              <div class="payment-row">
                <span>Balance Returned:</span>
                <span class="change-amount">₹${change.toFixed(2)}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="bill-footer">
              <p>Thank you for your purchase!</p>
              <p>Goods once sold not returnable</p>
              <p>** Computer generated bill **</p>
              ${paymentMethod !== 'cash' && transactionId ? `
              <p>${paymentMethod.toUpperCase()}: ${transactionId}</p>
              ` : ''}
              <div class="created-by">
                Bill created by: ${createdBy}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Download bill as HTML file
  const downloadBill = () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('No items with quantity > 0 to download!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const billHTML = generateBillHTML();
    const blob = new Blob([billHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bill_${billNumber.replace(/[\/\\]/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccess('Bill downloaded successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Handle payment completion - Save to DB then download/print
  const handlePaymentComplete = async () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('No items with quantity > 0 in bill!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Save to database first
    const savedData = await saveBillToDatabase();

    if (savedData) {
      // Then download the bill
      downloadBill();
    }
  };

  // Handle print - Save to DB then print
  const handlePrint = async () => {
    const subtotal = calculateSubtotal();
    if (subtotal === 0) {
      setError('No items with quantity > 0 to print!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Save to database first
    const savedData = await saveBillToDatabase();

    if (savedData) {
      // Use the saved bill number from backend response
      const confirmedBillNumber = savedData.billNumber;

      // Generate fresh HTML with the confirmed bill number from backend
      const printHTML = generateBillHTML(confirmedBillNumber).replace(
        '</body>',
        `<script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }, 250);
          };
        </script></body>`
      );

      // Create a new window for printing
      const printWindow = window.open('', '_blank');

      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
      } else {
        setError('Pop-up blocked! Please allow pop-ups for this site to print.');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  // Handle WhatsApp share
  const handleWhatsAppShare = () => {
    if (!customerPhone) {
      setError('Please enter customer phone number to share via WhatsApp');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Clean phone number (remove non-digits)
    const cleanPhone = customerPhone.replace(/\D/g, '');

    // Check if phone number is valid
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      setTimeout(() => setError(''), 3000);
      return;
    }

    // Format phone number for WhatsApp (add country code if not present)
    const whatsappNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    // Create message
    const subtotal = calculateSubtotal();
    const discountAmount = calculateDiscountAmount();
    const taxAmount = calculateTaxAmount();
    const total = calculateTotal();
    const due = calculateDue();
    const activeProducts = selectedProducts.filter(p => p.quantity > 0);

    let message = `*Avva Inventory*\n`;
    message += `${shopDetails.address}\n`;
    message += `${shopDetails.city}\n`;
    if (shopDetails.phone) message += `Ph: ${shopDetails.phone}\n`;
    message += `Bill No: ${billNumber}\n`;
    message += `Date: ${currentDate} ${currentTime}\n`;
    message += `Customer: ${customerName}\n`;
    message += `Type: ${customerType === 'internal' ? 'INTERNAL' : 'EXTERNAL'}\n`;
    message += `================\n`;
    message += `ITEMS:\n`;

    activeProducts.forEach(p => {
      message += `${p.name.substring(0, 15)}... ${p.quantity}x ₹${p.sellPrice} = ₹${p.total.toFixed(2)}\n`;
    });

    message += `================\n`;
    message += `Subtotal: ₹${subtotal.toFixed(2)}\n`;
    if (discountAmount > 0) message += `Discount: -₹${discountAmount.toFixed(2)}\n`;
    if (taxAmount > 0) message += `Tax: +₹${taxAmount.toFixed(2)}\n`;
    message += `*TOTAL: ₹${total.toFixed(2)}*\n`;
    message += `================\n`;
    message += `Payment: ${paymentMethod.toUpperCase()}\n`;
    message += `Paid: ₹${paidAmount.toFixed(2)}\n`;
    message += `Status: ${paymentStatus.toUpperCase()}\n`;
    if (due > 0) message += `Due: ₹${due.toFixed(2)}\n`;
    message += `================\n`;
    message += `Thank you for shopping with us!\n`;
    message += `Goods once sold not returnable\n`;
    message += `Created by: ${createdBy}`;

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp with customer's number
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');

    setSuccess('WhatsApp opened with bill details!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Clear bill
  const clearBill = () => {
    if (window.confirm('Clear all items?')) {
      setSelectedProducts([]);
      setCustomerName('Walk-in Customer');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerGST('');
      setCustomerAddress('');
      setCustomerType('external');
      setCustomerDiscount(0);
      setMemberId('');
      setIsClassicCustomer(false);
      setSalesPerson('');
      setCounter('Counter_1');
      setIsSaleReturn(false);
      setIsCardBill(false);
      setNoRewards(false);
      setAvailablePoints(0);
      setRedeemedPoints(0);
      setProductIdInput('');
      setDiscount(0);
      setDiscountType('percentage');
      setManualDiscount(false);
      setTax(0);
      setTaxType('percentage');
      setPaidAmount(0);
      setCashReceived(0);
      setPaymentMethod('cash');
      setPaymentStatus('pending');
      setCardNumber('');
      setCardHolderName('');
      setUpiId('');
      setTransactionId('');
      setBankName('');
      setChequeNumber('');
      setError('');
      setSuccess('');
      setBillSaved(false);
      setShowWhatsApp(false);
      setLastGeneratedBill(null);
      setSavedBillId(null);
      generateBillNumber();
    }
  };

  // Handle new bill
  const handleNewBill = () => {
    clearBill();
  };

  // Handle key press for barcode
  const handleBarcodeKeyPress = (e) => {
    if (e.key === 'Enter') {
      getProductByBarcode();
    }
  };

  const handleProductIdKeyPress = (e) => {
    if (e.key === 'Enter') {
      getProductById();
    }
  };

  // Test API connection
  const testAPIConnection = async () => {
    try {
      const response = await api.get('/health');
      console.log('API Health:', response.data);
    } catch (err) {
      console.error('API Health Check Failed:', err);
    }
  };

  // Run API test on mount
  useEffect(() => {
    testAPIConnection();
  }, []);

  // Filter out items with quantity 0 for display in bill summary
  const activeProducts = selectedProducts.filter(p => p.quantity > 0);
  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscountAmount();
  const taxAmount = calculateTaxAmount();
  const total = calculateTotal();
  const due = calculateDue();
  const change = calculateChange();
  const earnedPoints = calculateEarnedPoints();
  const remainingPoints = calculateRemainingPoints();

  // Dynamic styles that depend on state
  const dynamicStyles = {
    changeAmount: {
      fontWeight: 'bold',
      color: paidAmount >= total ? '#28a745' : '#dc3545',
      fontSize: '10px',
    },
    zeroQuantity: {
      opacity: 0.5,
      background: '#fff3cd',
    }
  };

  // Show login required message if not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ ...baseStyles.container, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '10px', textAlign: 'center' }}>
          <h2>🔒 Authentication Required</h2>
          <p style={{ color: '#dc3545', margin: '20px 0' }}>{error || 'Please login to access billing'}</p>
          <button
            style={{ ...baseStyles.btn, ...baseStyles.btnPrimary, padding: '10px 30px' }}
            onClick={() => window.location.href = '/login'}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Handle phone number input change
  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) {
      setCustomerPhone(value);
      setMemberId(value);
    }
  };

  return (
    <div style={baseStyles.container}>
      {/* Left Panel - Product Selection */}
      <div style={baseStyles.productPanel} className="no-print">
        <h2 style={baseStyles.productPanelTitle}>🧾 Create New Bill</h2>

        {/* Company Selector */}
        {companies.length > 0 && (
          <div style={baseStyles.companySelector}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => setShowCompanySelector(!showCompanySelector)}
            >
              <span>
                🏢 <span style={baseStyles.companyName}>
                  {selectedCompany ? selectedCompany.name : 'Select Company'}
                </span>
              </span>
              <span style={{ fontSize: '12px' }}>{showCompanySelector ? '▲' : '▼'}</span>
            </div>
            {showCompanySelector && (
              <div style={baseStyles.companyDropdown}>
                {companies.map(company => (
                  <div
                    key={company.id}
                    style={baseStyles.companyOption}
                    onClick={() => handleCompanySelect(company)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {company.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ ...baseStyles.alert, ...baseStyles.alertError }}>
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div style={{ ...baseStyles.alert, ...baseStyles.alertSuccess }}>
            ✅ {success}
          </div>
        )}

        <div style={baseStyles.searchSection}>
          <div style={baseStyles.searchBox}>
            <label style={baseStyles.searchLabel}>🔍 Search Products:</label>
            <input
              type="text"
              style={baseStyles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type product name or model..."
              autoComplete="off"
              onFocus={(e) => e.target.style.borderColor = '#007bff'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            {searchLoading && <div style={baseStyles.searchLoading}>Searching...</div>}
          </div>

          <div style={baseStyles.barcodeInput}>
            <input
              type="text"
              style={baseStyles.barcodeField}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              onKeyPress={handleBarcodeKeyPress}
              placeholder="📱 Scan barcode..."
              onFocus={(e) => e.target.style.borderColor = '#28a745'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <button
              style={{
                ...baseStyles.barcodeButton,
                ...(loading ? baseStyles.barcodeButtonDisabled : {})
              }}
              onClick={getProductByBarcode}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>

          <div style={baseStyles.barcodeInput}>
            <input
              type="text"
              style={baseStyles.barcodeField}
              value={productIdInput}
              onChange={(e) => setProductIdInput(e.target.value)}
              onKeyPress={handleProductIdKeyPress}
              placeholder="🔢 Enter Product ID / Product Code..."
              onFocus={(e) => e.target.style.borderColor = '#28a745'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <button
              style={{
                ...baseStyles.barcodeButton,
                ...(loading ? baseStyles.barcodeButtonDisabled : {})
              }}
              onClick={getProductById}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add by ID'}
            </button>
          </div>

          {searchResults.length > 0 && (
            <div style={baseStyles.searchResults}>
              {searchResults.map(product => (
                <div
                  key={product.id}
                  style={baseStyles.searchResultItem}
                  onClick={() => addProductToBill(product)}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={baseStyles.resultInfo}>
                    <div style={baseStyles.resultName}>{product.name}</div>
                    <div style={baseStyles.resultDetails}>
                      {(product.productCode || product.code || product.id)} | {product.model || ''} | Stock: {product.quantity}
                    </div>
                  </div>
                  <div style={baseStyles.resultPrice}>₹{product.sellPrice}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={baseStyles.selectedProducts}>
          <h3 style={baseStyles.selectedProductsTitle}>
            🛒 Current Bill Items ({activeProducts.length} active / {selectedProducts.length} total)
          </h3>
          <div style={baseStyles.selectedItemsList}>
            {selectedProducts.length === 0 ? (
              <p style={baseStyles.noItems}>No items added yet. Search or scan products to add.</p>
            ) : (
              selectedProducts.map(product => (
                <div
                  key={product.id}
                  style={{
                    ...baseStyles.selectedItem,
                    ...(product.quantity === 0 ? dynamicStyles.zeroQuantity : {})
                  }}
                >
                  <div style={baseStyles.itemInfo}>
                    <span style={baseStyles.itemName}>{product.name}</span>
                    {product.model && (
                      <span style={baseStyles.itemModel}>{product.model}</span>
                    )}
                    {product.quantity === 0 && (
                      <span style={{ fontSize: '9px', color: '#856404' }}>(Zero quantity)</span>
                    )}
                  </div>
                  <div style={baseStyles.itemPrice}>₹{product.sellPrice}</div>
                  <input
                    type="number"
                    style={baseStyles.itemQuantity}
                    value={product.quantity}
                    min="0"
                    max={product.maxQuantity}
                    onChange={(e) => updateQuantity(product.id, e.target.value)}
                  />
                  <div style={baseStyles.itemTotal}>₹{product.total.toFixed(2)}</div>
                  <button
                    style={baseStyles.removeBtn}
                    onClick={() => removeProduct(product.id)}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#c82333'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#dc3545'}
                    title="Remove completely"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
          {selectedProducts.length > 0 && (
            <p style={{ fontSize: '11px', color: '#666', marginTop: '10px', textAlign: 'center' }}>
              💡 Set quantity to 0 to keep item in list (will not be billed)
            </p>
          )}
        </div>
      </div>

      {/* Right Panel - Thermal Bill */}
      <div style={baseStyles.billPanel} className="no-print">
        <div style={baseStyles.billContainer}>
          <div
            style={baseStyles.billPaper}
            id="billPaper"
            ref={billPaperRef}
          >
            <div className="bill-header">
              <img src="/avva-logo.jpeg" alt="Avva Inventory Logo" style={{ maxWidth: '100px', marginBottom: '5px', display: 'block', marginLeft: 'auto', marginRight: 'auto' }} />
              <h1 style={baseStyles.billHeaderH1}>{shopDetails.name}</h1>
              <p style={baseStyles.billHeaderP}>{shopDetails.address}</p>
              <p style={baseStyles.billHeaderP}>{shopDetails.city}</p>
              {shopDetails.phone && <p style={baseStyles.billHeaderP}>Ph: {shopDetails.phone}</p>}
              {shopDetails.gst && <p style={baseStyles.billHeaderP}>GST: {shopDetails.gst}</p>}
            </div>

            <div className="bill-info">
              <div style={baseStyles.billInfoRow}>
                <span>Bill No:</span>
                <span style={baseStyles.billNumber}>{billNumber}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Date:</span>
                <span>{currentDate}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Time:</span>
                <span>{currentTime}</span>
              </div>
              <div style={baseStyles.billInfoRow}>
                <span>Counter:</span>
                <span>{counter}</span>
              </div>
            </div>

            <div style={{ ...baseStyles.customerSection, marginTop: '5px', padding: '8px' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '10px' }}>
                <span>{isSaleReturn ? '☑' : '☐'} SALE RETURN</span>
                <span>{isCardBill ? '☑' : '☐'} CARD BILL</span>
                <span>{noRewards ? '☑' : '☐'} NO REWARDS</span>
                <span>{isClassicCustomer ? '☑' : '☐'} CLASSIC CUSTOMER</span>
              </div>
              {(memberId || salesPerson) && (
                <div style={{ marginTop: '5px', fontSize: '10px', display: 'grid', gap: '2px' }}>
                  {memberId && <div><strong>Member ID:</strong> {memberId}</div>}
                  {salesPerson && <div><strong>Sales Person:</strong> {salesPerson}</div>}
                </div>
              )}
            </div>

            <div className="customer-section">
              <div style={baseStyles.customerRow}>
                <span style={baseStyles.customerLabel}>Customer Type:</span>
                <span
                  style={{
                    ...baseStyles.customerTypeBadge,
                    ...(customerType === 'internal' ? baseStyles.internalBadge : baseStyles.externalBadge)
                  }}
                >
                  {customerType === 'internal' ? '🏢 INTERNAL' : '👤 EXTERNAL'}
                </span>
              </div>

              <div style={baseStyles.customerRow}>
                <span style={baseStyles.customerLabel}>Name:</span>
                <span style={baseStyles.customerValue}>{customerName}</span>
              </div>

              {customerPhone && (
                <div style={baseStyles.customerRow}>
                  <span style={{ ...baseStyles.customerLabel, color: '#007bff' }}>Phone Number:</span>
                  <span style={baseStyles.customerValue}>{customerPhone}</span>
                </div>
              )}

              {customerEmail && (
                <div style={baseStyles.customerRow}>
                  <span style={baseStyles.customerLabel}>Email:</span>
                  <span style={baseStyles.customerValue}>{customerEmail}</span>
                </div>
              )}

              {customerAddress && (
                <div style={baseStyles.customerRow}>
                  <span style={baseStyles.customerLabel}>Address:</span>
                  <span style={baseStyles.customerValue}>{customerAddress}</span>
                </div>
              )}

              {customerGST && (
                <div style={baseStyles.customerRow}>
                  <span style={baseStyles.customerLabel}>GST:</span>
                  <span style={baseStyles.customerValue}>{customerGST}</span>
                </div>
              )}
            </div>

            <div style={baseStyles.customerSection} className="no-print">
              <input
                type="text"
                style={baseStyles.customerInput}
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
                placeholder="Counter (e.g., Counter_1)"
              />

              <select
                style={baseStyles.customerTypeSelect}
                value={customerType}
                onChange={(e) => {
                  setCustomerType(e.target.value);
                  setManualDiscount(false); // Reset manual discount flag when customer type changes
                }}
              >
                <option value="external">👤 External Customer</option>
                <option value="internal">🏢 Internal (Staff)</option>
              </select>

              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
              />

              <input
                type="text"
                style={{
                  ...baseStyles.customerInput,
                  borderColor: fetchingCustomer ? '#007bff' : '#ddd',
                  background: fetchingCustomer ? '#f0f7ff' : 'white'
                }}
                value={customerPhone}
                onChange={handlePhoneChange}
                placeholder={fetchingCustomer ? "Searching..." : "Phone Number"}
                maxLength="10"
              />

              <input
                type="email"
                style={baseStyles.customerInput}
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Email Address"
              />

              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Address"
              />

              <input
                type="text"
                style={baseStyles.customerInput}
                value={customerGST}
                onChange={(e) => setCustomerGST(e.target.value)}
                placeholder="GST Number (if applicable)"
              />

              <input
                type="text"
                style={baseStyles.customerInput}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="Member ID"
              />

              <input
                type="text"
                style={baseStyles.customerInput}
                value={salesPerson}
                onChange={(e) => setSalesPerson(e.target.value)}
                placeholder="Sales Person"
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '4px' }}>
                <label style={{ fontSize: '10px' }}>
                  <input type="checkbox" checked={isClassicCustomer} onChange={(e) => setIsClassicCustomer(e.target.checked)} /> Classic Customer
                </label>
                <label style={{ fontSize: '10px' }}>
                  <input type="checkbox" checked={isSaleReturn} onChange={(e) => setIsSaleReturn(e.target.checked)} /> Sale Return
                </label>
                <label style={{ fontSize: '10px' }}>
                  <input type="checkbox" checked={isCardBill} onChange={(e) => setIsCardBill(e.target.checked)} /> Card Bill
                </label>
                <label style={{ fontSize: '10px' }}>
                  <input type="checkbox" checked={noRewards} onChange={(e) => setNoRewards(e.target.checked)} /> No Rewards
                </label>
              </div>
            </div>

            {/* Discount Section - Enhanced */}
            <div style={baseStyles.discountSection} className="no-print">
              <div
                style={baseStyles.discountHeader}
                onClick={() => setShowDiscountInput(!showDiscountInput)}
              >
                <span style={baseStyles.discountTitle}>
                  {manualDiscount ? '✏️ Manual Discount' : '💰 Default Discount'}
                </span>
                <span style={baseStyles.discountToggle}>
                  {showDiscountInput ? '▼' : '▶'}
                </span>
              </div>

              {showDiscountInput && (
                <div style={baseStyles.discountControls}>
                  <select
                    style={baseStyles.discountTypeSelect}
                    value={discountType}
                    onChange={(e) => handleDiscountTypeChange(e.target.value)}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>

                  <input
                    type="number"
                    style={baseStyles.discountInput}
                    value={discount}
                    onChange={(e) => handleDiscountChange(e.target.value)}
                    min="0"
                    max={discountType === 'percentage' ? 100 : subtotal}
                    step={discountType === 'percentage' ? '1' : '0.01'}
                    placeholder={discountType === 'percentage' ? 'Enter %' : 'Enter amount'}
                  />
                </div>
              )}

              <div style={baseStyles.discountAmount}>
                Discount Amount: -₹{discountAmount.toFixed(2)}
                {!manualDiscount && customerType === 'internal' && (
                  <span style={{ fontSize: '8px', marginLeft: '5px', color: '#666' }}>
                    (Staff discount)
                  </span>
                )}
              </div>

              {manualDiscount && (
                <button
                  style={{
                    ...baseStyles.btn,
                    ...baseStyles.btnSecondary,
                    fontSize: '9px',
                    padding: '2px 5px',
                    marginTop: '5px',
                    width: '100%'
                  }}
                  onClick={resetDiscountToDefault}
                >
                  Reset to Default
                </button>
              )}
            </div>

            <div className="bill-items" style={baseStyles.billItems}>
              <div className="bill-items-header" style={baseStyles.billItemsHeader}>
                <span>Item</span>
                <span style={{ textAlign: 'right' }}>MRP</span>
                <span style={{ textAlign: 'right' }}>Unit Price</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Total</span>
              </div>
              <div>
                {activeProducts.length === 0 ? (
                  <div style={baseStyles.billItemEmpty}>
                    <span>--- No items in bill ---</span>
                  </div>
                ) : (
                  activeProducts.map(product => (
                    <div key={product.id} className="bill-item" style={baseStyles.billItem}>
                      <span style={baseStyles.billItemName}>
                        {product.name.length > 12
                          ? product.name.substring(0, 10) + '...'
                          : product.name
                        }
                        {product.model && (
                          <small style={baseStyles.billItemSmall}>{product.model}</small>
                        )}
                      </span>
                      <span style={{ textAlign: 'right' }}>₹{parseFloat(product.mrp || product.sellPrice || 0).toFixed(2)}</span>
                      <span style={{ textAlign: 'right' }}>₹{parseFloat(product.sellPrice || 0).toFixed(2)}</span>
                      <span style={{ textAlign: 'center' }}>{product.quantity}</span>
                      <span style={{ textAlign: 'right', fontWeight: 'bold' }}>₹{product.total.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bill-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>
                  Discount
                  {discount > 0 && (
                    <span style={{ fontSize: '8px', color: '#666' }}>
                      {' '}({discount}{discountType === 'percentage' ? '%' : '₹'})
                    </span>
                  )}:
                </span>
                <span>-₹{discountAmount.toFixed(2)}</span>
              </div>

              <div className="summary-row">
                <span>After Discount:</span>
                <span>₹{(subtotal - discountAmount).toFixed(2)}</span>
              </div>

              {tax > 0 && (
                <div className="summary-row">
                  <span>
                    Tax
                    {tax > 0 && (
                      <span style={{ fontSize: '8px', color: '#666' }}>
                        {' '}({tax}{taxType === 'percentage' ? '%' : '₹'})
                      </span>
                    )}:
                  </span>
                  <span>+₹{taxAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="summary-row summary-row-total">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="payment-section">
              <div style={baseStyles.paymentRow}>
                <span>Payment Method:</span>
                <select
                  style={baseStyles.paymentSelect}
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                  <option value="upi">📱 UPI</option>
                  <option value="cheque">📝 Cheque</option>
                  <option value="mixed">🔄 Mixed</option>
                </select>
              </div>

              {showPaymentDetails && (
                <div style={baseStyles.paymentDetails}>
                  {paymentMethod === 'cash' && (
                    <>
                      <div style={baseStyles.paymentRow}>
                        <span>Cash Received:</span>
                        <input
                          type="number"
                          style={baseStyles.paymentInput}
                          value={cashReceived}
                          onChange={(e) => handleCashPayment(e.target.value)}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div style={baseStyles.paymentRow}>
                        <span>Balance Returned:</span>
                        <span style={dynamicStyles.changeAmount}>₹{change.toFixed(2)}</span>
                      </div>
                    </>
                  )}

                  {paymentMethod === 'card' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="Card Number (last 4 digits)"
                        maxLength="4"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={cardHolderName}
                        onChange={(e) => setCardHolderName(e.target.value)}
                        placeholder="Card Holder Name"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                      />
                    </>
                  )}

                  {paymentMethod === 'upi' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="UPI ID"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                        placeholder="Transaction ID"
                      />
                    </>
                  )}

                  {paymentMethod === 'cheque' && (
                    <>
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        placeholder="Cheque Number"
                      />
                      <input
                        type="text"
                        style={baseStyles.paymentDetailsInput}
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Bank Name"
                      />
                    </>
                  )}

                  {paymentMethod === 'mixed' && (
                    <div style={{ fontSize: '9px', color: '#666' }}>
                      <p>Mixed payment - Please enter details in POS</p>
                    </div>
                  )}
                </div>
              )}

              <div style={baseStyles.paymentRow}>
                <span>Amount Given:</span>
                <input
                  type="number"
                  style={baseStyles.paymentInput}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div style={baseStyles.paymentRow}>
                <span>Total Amount:</span>
                <span style={{ fontWeight: 'bold' }}>₹{total.toFixed(2)}</span>
              </div>

              <div style={baseStyles.paymentRow}>
                <span>Payment Status:</span>
                <span style={{
                  color: paymentStatus === 'paid' ? '#28a745' :
                    paymentStatus === 'partial' ? '#ffc107' : '#dc3545',
                  fontWeight: 'bold'
                }}>
                  {paymentStatus.toUpperCase()}
                </span>
              </div>

              {due > 0 && paymentStatus !== 'pending' && (
                <div style={baseStyles.paymentRow}>
                  <span>Due Amount:</span>
                  <span>₹{due.toFixed(2)}</span>
                </div>
              )}

              <button
                style={{
                  ...baseStyles.btn,
                  ...baseStyles.btnSecondary,
                  width: '100%',
                  marginTop: '5px',
                  padding: '5px'
                }}
                onClick={handleExactPayment}
              >
                Exact Amount
              </button>
            </div>

            <div style={{ ...baseStyles.paymentSection, background: '#eef6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ ...baseStyles.paymentRow, fontWeight: 'bold' }}>
                <span>Reward Points Details</span>
                <span />
              </div>
              <div style={baseStyles.paymentRow}>
                <span>Available Points:</span>
                <span>{availablePoints.toFixed(2)}</span>
              </div>
              <div style={baseStyles.paymentRow}>
                <span>Redeemed Points:</span>
                <input
                  type="number"
                  style={baseStyles.paymentInput}
                  value={redeemedPoints}
                  min="0"
                  max={availablePoints}
                  step="1"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0;
                    setRedeemedPoints(Math.max(0, Math.min(value, availablePoints)));
                  }}
                  disabled={noRewards}
                />
              </div>
              <div style={baseStyles.paymentRow}>
                <span>Earned Points:</span>
                <span>{earnedPoints.toFixed(2)}</span>
              </div>
              <div style={baseStyles.paymentRow}>
                <span>Remaining Balance Points:</span>
                <span style={{ fontWeight: 'bold' }}>{remainingPoints.toFixed(2)}</span>
              </div>
            </div>

            <div className="bill-footer">
              <p style={baseStyles.billFooterP}>Thank you for your purchase!</p>
              <p style={baseStyles.billFooterP}>Goods once sold not returnable</p>
              <p style={baseStyles.billFooterP}>** Computer generated bill **</p>
              {paymentMethod !== 'cash' && transactionId && (
                <p style={baseStyles.billFooterP}>
                  {paymentMethod.toUpperCase()}: {transactionId}
                </p>
              )}
              <div style={{ marginTop: '5px', paddingTop: '3px', borderTop: '1px dotted #ccc', fontSize: '8px', color: '#666' }}>
                Bill created by: {createdBy}
              </div>
            </div>
          </div>

          <div style={baseStyles.actionButtons} className="no-print">
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnPrimary,
                ...(loading || activeProducts.length === 0 ? baseStyles.btnDisabled : {})
              }}
              onClick={handlePrint}
              disabled={loading || activeProducts.length === 0}
            >
              {loading ? '⏳ Saving...' : '🖨️ Print'}
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnSuccess,
                ...(loading || activeProducts.length === 0 ? baseStyles.btnDisabled : {})
              }}
              onClick={handlePaymentComplete}
              disabled={loading || activeProducts.length === 0}
            >
              {loading ? '⏳ Saving...' : '💰 Pay & Download'}
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnInfo,
                ...(loading ? baseStyles.btnDisabled : {})
              }}
              onClick={handleNewBill}
              disabled={loading}
            >
              🆕 New
            </button>
            <button
              style={{
                ...baseStyles.btn,
                ...baseStyles.btnDanger,
                ...(loading ? baseStyles.btnDisabled : {})
              }}
              onClick={clearBill}
              disabled={loading}
            >
              🗑️ Clear
            </button>
          </div>

          {/* WhatsApp Share Button - Always visible when bill is saved */}
          {showWhatsApp && lastGeneratedBill && (
            <button
              style={baseStyles.whatsappButton}
              onClick={handleWhatsAppShare}
              onMouseEnter={(e) => e.currentTarget.style.background = '#128C7E'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
            >
              <span>📱</span>
              Share Bill on WhatsApp to {customerPhone || 'Customer'}
            </button>
          )}

          {billSaved && (
            <p style={{ fontSize: '10px', color: '#28a745', textAlign: 'center', marginTop: '5px' }}>
              ✓ Bill saved to database
            </p>
          )}
        </div>
      </div>

      {/* Hidden download link */}
      <a ref={downloadLinkRef} style={baseStyles.downloadLink}></a>
    </div>
  );
};

export default Bill;