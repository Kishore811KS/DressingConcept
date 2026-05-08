import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Search,
  Eye,
  Printer,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Smartphone,
  FileText,
  FileSpreadsheet,
  FileJson,
  Filter,
  Download,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  Hash,
  Tag,
  Package,
  IndianRupee,
  Receipt,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Home,
  Briefcase,
  Users,
  TrendingUp,
  Wallet,
  Banknote,
  Landmark,
  MessageCircle,
  Building2,
  Store,
  Globe
} from 'lucide-react';

// Crown icon component for VIP customers
const Crown = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={props.size || 24}
    height={props.size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 4l3 12h14l3-12-6 3-4-6-4 3-6-3z" />
  </svg>
);

const VisitBillPage = () => {
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [copiedBillNo, setCopiedBillNo] = useState(null);
  const [whatsappStatus, setWhatsappStatus] = useState({});

  // Company/Shop Details from Backend
  const [companyDetails, setCompanyDetails] = useState({
    name: "Dressing Concept",
    address: "88/70, Sundaraj Perumal Koil St S, Agaram, Perambur, Chennai, Tamil Nadu 600082",
    city: "Chennai",
    phone: "98848 58576",
    email: "",
    gst: "",
    logo: null,
    logoUrl: null
  });

  const [selectedCompanyId, setSelectedCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [showCompanySelector, setShowCompanySelector] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [filterCustomerType, setFilterCustomerType] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [quickDate, setQuickDate] = useState('today');
  const [sortBy, setSortBy] = useState('newest');

  const API_BASE_URL = 'http://localhost:5000/api';

  // Create axios instance with credentials
  const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Payment method icons and colors
  const paymentMethodMap = {
    cash: { icon: <DollarSign size={14} />, color: '#059669', label: 'Cash' },
    card: { icon: <CreditCard size={14} />, color: '#3b82f6', label: 'Card' },
    upi: { icon: <Smartphone size={14} />, color: '#8b5cf6', label: 'UPI' },
    online: { icon: <Globe size={14} />, color: '#10b981', label: 'Online' },
    netbanking: { icon: <Landmark size={14} />, color: '#0284c7', label: 'Netbanking' },
    cheque: { icon: <FileText size={14} />, color: '#f59e0b', label: 'Cheque' },
    mixed: { icon: <Filter size={14} />, color: '#6b7280', label: 'Mixed' }
  };

  // Customer type icons and colors
  const customerTypeMap = {
    internal: { icon: <Briefcase size={14} />, color: '#3b82f6', label: 'Internal' },
    external: { icon: <Users size={14} />, color: '#f59e0b', label: 'External' },
    regular: { icon: <User size={14} />, color: '#6b7280', label: 'Regular' },
    wholesale: { icon: <TrendingUp size={14} />, color: '#8b5cf6', label: 'Wholesale' },
    vip: { icon: <Crown size={14} />, color: '#d97706', label: 'VIP' },
    corporate: { icon: <Briefcase size={14} />, color: '#2563eb', label: 'Corporate' }
  };

  // Calculate current bills for pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBills = filteredBills.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

  // Sales Summary calculation
  const salesSummary = React.useMemo(() => {
    const summary = {
      cash: { count: 0, amount: 0 },
      card: { count: 0, amount: 0 },
      upi: { count: 0, amount: 0 },
      online: { count: 0, amount: 0 },
      netbanking: { count: 0, amount: 0 },
      cheque: { count: 0, amount: 0 },
      mixed: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 }
    };

    filteredBills.forEach(bill => {
      const method = (bill.paymentMethod || 'cash').toLowerCase();
      const amount = parseFloat(bill.total || 0);

      if (summary[method]) {
        summary[method].count += 1;
        summary[method].amount += amount;
      } else {
        // Fallback to cash if unknown method
        summary.cash.count += 1;
        summary.cash.amount += amount;
      }

      summary.total.count += 1;
      summary.total.amount += amount;
    });

    return summary;
  }, [filteredBills]);

  // Keyboard Shortcut Handler
  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeElement = document.activeElement;
      const isTyping = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.isContentEditable;

      // F8 / Ctrl+Shift+V - View Bill Details
      if (event.key === 'F8' || (event.ctrlKey && event.shiftKey && event.key === 'V')) {
        event.preventDefault();
        if (currentBills.length > 0 && !isTyping) {
          const firstBill = currentBills[0];
          fetchBillDetails(firstBill.id);
          showMessage("success", "⌨️ Viewing bill details (F8)");
        } else if (currentBills.length === 0) {
          showMessage("error", "No bills to view");
        }
        return;
      }

      // F9 / Ctrl+Shift+B - Print Bill
      if (event.key === 'F9' || (event.ctrlKey && event.shiftKey && event.key === 'B')) {
        event.preventDefault();
        if (currentBills.length > 0 && !isTyping) {
          const firstBill = currentBills[0];
          handlePrintBill(firstBill);
          showMessage("success", "⌨️ Printing bill (F9)");
        } else if (currentBills.length === 0) {
          showMessage("error", "No bills to print");
        }
        return;
      }

      // F10 / Ctrl+Shift+W - WhatsApp Share
      if (event.key === 'F10' || (event.ctrlKey && event.shiftKey && event.key === 'W')) {
        event.preventDefault();
        if (currentBills.length > 0 && !isTyping) {
          const firstBill = currentBills[0];
          if (firstBill.customerPhone) {
            handleWhatsAppShare(firstBill);
            showMessage("success", "⌨️ Opening WhatsApp (F10)");
          } else {
            showMessage("error", "No phone number available");
          }
        } else if (currentBills.length === 0) {
          showMessage("error", "No bills to share");
        }
        return;
      }

      // Ctrl+F - Focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
        event.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        searchInput?.focus();
        showMessage("success", "⌨️ Search focused (Ctrl+F)");
        return;
      }

      // Ctrl+R - Refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        fetchBills();
        showMessage("success", "⌨️ Refreshing bills (Ctrl+R)");
        return;
      }

      // Escape - Clear messages
      if (event.key === 'Escape') {
        setMessage({ type: "", text: "" });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentBills]);

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Load bills on component mount
  useEffect(() => {
    if (selectedCompanyId) {
      fetchBills();
    }
  }, [selectedCompanyId]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [bills, searchTerm, filterPaymentMethod, filterCustomerType, dateRange, sortBy]);

  // Auto-hide message after 3 seconds
  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
  };

  // Fetch companies from backend
  const fetchCompanies = async () => {
    setLoadingCompany(true);
    try {
      const response = await api.get('/companies/list');
      console.log('Companies response:', response.data);

      if (response.data && response.data.length > 0) {
        setCompanies(response.data);
        const firstCompany = response.data[0];
        setSelectedCompanyId(firstCompany.id);
        await fetchCompanyDetails(firstCompany.id);
      } else {
        setCompanyDetails({
          name: "Dressing Concept",
          address: "88/70, Sundaraj Perumal Koil St S, Agaram, Perambur, Chennai, Tamil Nadu 600082",
          city: "Chennai",
          phone: "98848 58576",
          email: "",
          gst: "",
          logo: null,
          logoUrl: null
        });
      }
    } catch (err) {
      console.error('Error fetching companies:', err);
      showMessage("error", "❌ Failed to fetch company details");
      setCompanyDetails({
        name: "Dressing Concept",
        address: "88/70, Sundaraj Perumal Koil St S, Agaram, Perambur, Chennai, Tamil Nadu 600082",
        city: "Chennai",
        phone: "98848 58576",
        email: "",
        gst: "",
        logo: null,
        logoUrl: null
      });
    } finally {
      setSelectedCompanyId((current) => current || 'default');
      setLoadingCompany(false);
    }
  };

  // Fetch company details by ID
  const fetchCompanyDetails = async (companyId) => {
    try {
      const response = await api.get(`/companies/${companyId}`);
      console.log('Company details:', response.data);

      const company = response.data;
      setCompanyDetails({
        name: company.name || "Dressing Concept",
        address: company.address || "88/70, Sundaraj Perumal Koil St S, Agaram, Perambur, Chennai, Tamil Nadu 600082",
        city: company.city || "Chennai",
        phone: company.phone || "98848 58576",
        email: company.email || "",
        gst: company.gst_number || company.gst || "",
        logo: company.logo || null,
        logoUrl: company.logo_url || null
      });
    } catch (err) {
      console.error('Error fetching company details:', err);
    }
  };

  // Handle company selection
  const handleCompanySelect = async (company) => {
    setSelectedCompanyId(company.id);
    setShowCompanySelector(false);
    await fetchCompanyDetails(company.id);
    showMessage("success", `✅ Switched to ${company.name}`);
    fetchBills();
  };

  const fetchBills = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoints = [
        `${API_BASE_URL}/billing/bills`,
        `${API_BASE_URL}/bills`,
        `${API_BASE_URL}/visit-bills`,
        `${API_BASE_URL}/billing/visit-bills`
      ];

      let response = null;
      let success = false;

      for (const endpoint of endpoints) {
        try {
          console.log('Trying endpoint:', endpoint);
          response = await api.get(endpoint);
          if (response.data) {
            success = true;
            console.log('Success with endpoint:', endpoint);
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.message);
        }
      }

      if (!success || !response) {
        throw new Error('Could not fetch bills from any endpoint');
      }

      console.log('API Response:', response.data);

      let billsData = [];

      if (Array.isArray(response.data)) {
        billsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        billsData = response.data.data;
      } else if (response.data.bills && Array.isArray(response.data.bills)) {
        billsData = response.data.bills;
      } else if (response.data.results && Array.isArray(response.data.results)) {
        billsData = response.data.results;
      } else if (typeof response.data === 'object') {
        for (const key in response.data) {
          if (Array.isArray(response.data[key])) {
            billsData = response.data[key];
            break;
          }
        }
      }

      if (billsData.length === 0) {
        console.log('No bills data found in response');
        setBills([]);
        setFilteredBills([]);
        showMessage("info", "ℹ️ No bills found");
        setLoading(false);
        return;
      }

      const processedBills = billsData.map(bill => {
        let discountValue = parseFloat(bill.discount || bill.discount_amount || 0);
        let discountType = bill.discountType || bill.discount_type || 'amount';
        let subtotal = parseFloat(bill.subtotal || bill.sub_total || 0);

        let discountAmount = discountValue;
        if (discountType === 'percentage' && subtotal > 0) {
          discountAmount = (subtotal * discountValue) / 100;
        }

        return {
          id: bill.id || bill._id || Math.random().toString(),
          billNumber: bill.billNumber || bill.bill_number || bill.billNo || bill.invoiceNo || `BILL-${Date.now()}`,
          customerName: bill.customerName || bill.customer_name || bill.customer?.name || 'Walk-in Customer',
          customerPhone: bill.customerPhone || bill.customer_phone || bill.customer?.phone || '',
          customerEmail: bill.customerEmail || bill.customer_email || bill.customer?.email || '',
          customerGst: bill.customerGst || bill.customer_gst || bill.customer?.gst || '',
          customerAddress: bill.customerAddress || bill.customer_address || bill.customer?.address || '',
          customerType: bill.customerType || bill.customer_type || bill.customer?.type || 'external',
          memberId: bill.memberId || bill.member_id || '',
          salesPerson: bill.salesPerson || bill.sales_person || '',
          counter: bill.counter || '',
          isClassicCustomer: Boolean(bill.isClassicCustomer || bill.is_classic_customer),
          isSaleReturn: Boolean(bill.isSaleReturn || bill.is_sale_return),
          isCardBill: Boolean(bill.isCardBill || bill.is_card_bill),
          noRewards: Boolean(bill.noRewards || bill.no_rewards),
          rewardPointsAvailable: parseFloat(bill.rewardPointsAvailable || bill.reward_points_available || 0),
          rewardPointsRedeemed: parseFloat(bill.rewardPointsRedeemed || bill.reward_points_redeemed || 0),
          rewardPointsEarned: parseFloat(bill.rewardPointsEarned || bill.reward_points_earned || 0),
          rewardPointsBalance: parseFloat(bill.rewardPointsBalance || bill.reward_points_balance || 0),
          amountGiven: parseFloat(bill.amountGiven || bill.amount_given || bill.paidAmount || bill.paid_amount || 0),
          balanceReturned: parseFloat(bill.balanceReturned || bill.balance_returned || bill.changeAmount || bill.change_amount || 0),
          subtotal: subtotal,
          discountValue: discountValue,
          discountAmount: discountAmount,
          discountType: discountType,
          tax: parseFloat(bill.tax || bill.taxAmount || 0),
          taxType: bill.taxType || bill.tax_type || 'percentage',
          total: parseFloat(bill.total || bill.grandTotal || bill.amount || 0),
          paidAmount: parseFloat(bill.paidAmount || bill.paid_amount || bill.paid || 0),
          changeAmount: parseFloat(bill.changeAmount || bill.change_amount || bill.change || 0),
          paymentMethod: bill.paymentMethod || bill.payment_method || bill.payment?.method || 'cash',
          createdAt: bill.createdAt || bill.created_at || bill.date || new Date().toISOString(),
          updatedAt: bill.updatedAt || bill.updated_at,
          createdBy: bill.createdBy || bill.created_by,
          items: Array.isArray(bill.items) ? bill.items.map(item => ({
            id: item.id || item._id,
            productId: item.productId || item.product_id || item.product,
            productName: item.productName || item.product_name || item.name || 'Unknown',
            productModel: item.productModel || item.product_model || item.model || '',
            productType: item.productType || item.product_type || item.type || '',
            mrp: parseFloat(item.mrp || item.MRP || item.sellPrice || item.sell_price || item.price || 0),
            unit: item.unit || 'PCS',
            sellPrice: parseFloat(item.sellPrice || item.sell_price || item.price || 0),
            quantity: parseInt(item.quantity || item.qty || 1),
            total: parseFloat(item.total || item.subtotal || 0),
          })) : [],
          payments: Array.isArray(bill.payments) ? bill.payments.map(payment => ({
            id: payment.id || payment._id,
            paymentId: payment.paymentId || payment.payment_id,
            amount: parseFloat(payment.amount || 0),
            method: payment.method || 'cash',
            status: payment.status || 'completed',
            reference: payment.reference || '',
            notes: payment.notes || '',
            createdAt: payment.createdAt || payment.created_at
          })) : []
        };
      });

      processedBills.forEach(bill => {
        bill.itemCount = bill.itemCount || (bill.items ? bill.items.length : 0);
        bill.dueAmount = bill.total - bill.paidAmount;
      });

      console.log('Processed Bills:', processedBills);

      setBills(processedBills);
      setFilteredBills(processedBills);

      showMessage("success", `✅ Loaded ${processedBills.length} bills successfully!`);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load bills. Please try again.');
      showMessage("error", "❌ Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    try {
      setLoading(true);

      const existingBill = bills.find(b => b.id === billId);
      if (existingBill && existingBill.items && existingBill.items.length > 0) {
        console.log('Using existing bill data');
        setSelectedBill(existingBill);
        setShowBillModal(true);
        setLoading(false);
        return;
      }

      const endpoints = [
        `${API_BASE_URL}/billing/bills/${billId}`,
        `${API_BASE_URL}/bills/${billId}`,
        `${API_BASE_URL}/visit-bills/${billId}`,
        `${API_BASE_URL}/billing/visit-bills/${billId}`
      ];

      let response = null;
      let success = false;

      for (const endpoint of endpoints) {
        try {
          console.log('Trying details endpoint:', endpoint);
          response = await api.get(endpoint);
          if (response.data) {
            success = true;
            console.log('Success with details endpoint:', endpoint);
            break;
          }
        } catch (err) {
          console.log(`Endpoint ${endpoint} failed:`, err.message);
        }
      }

      if (!success || !response) {
        const billFromList = bills.find(b => b.id === billId);
        if (billFromList) {
          console.log('Using bill from list as fallback');
          setSelectedBill(billFromList);
          setShowBillModal(true);
          setLoading(false);
          return;
        }
        throw new Error('Could not fetch bill details');
      }

      console.log('Bill Details Response:', response.data);

      const billData = response.data;

      let discountValue = parseFloat(billData.discount || billData.discount_amount || 0);
      let discountType = billData.discountType || billData.discount_type || 'amount';
      let subtotal = parseFloat(billData.subtotal || billData.sub_total || 0);

      let discountAmount = discountValue;
      if (discountType === 'percentage' && subtotal > 0) {
        discountAmount = (subtotal * discountValue) / 100;
      }

      const processedBill = {
        id: billData.id || billData._id || billId,
        billNumber: billData.billNumber || billData.bill_number || billData.billNo || 'N/A',
        customerName: billData.customerName || billData.customer_name || billData.customer?.name || 'Walk-in Customer',
        customerPhone: billData.customerPhone || billData.customer_phone || billData.customer?.phone || '',
        customerEmail: billData.customerEmail || billData.customer_email || billData.customer?.email || '',
        customerGst: billData.customerGst || billData.customer_gst || billData.customer?.gst || '',
        customerAddress: billData.customerAddress || billData.customer_address || billData.customer?.address || '',
        customerType: billData.customerType || billData.customer_type || billData.customer?.type || 'external',
        memberId: billData.memberId || billData.member_id || '',
        salesPerson: billData.salesPerson || billData.sales_person || '',
        counter: billData.counter || '',
        isClassicCustomer: Boolean(billData.isClassicCustomer || billData.is_classic_customer),
        isSaleReturn: Boolean(billData.isSaleReturn || billData.is_sale_return),
        isCardBill: Boolean(billData.isCardBill || billData.is_card_bill),
        noRewards: Boolean(billData.noRewards || billData.no_rewards),
        rewardPointsAvailable: parseFloat(billData.rewardPointsAvailable || billData.reward_points_available || 0),
        rewardPointsRedeemed: parseFloat(billData.rewardPointsRedeemed || billData.reward_points_redeemed || 0),
        rewardPointsEarned: parseFloat(billData.rewardPointsEarned || billData.reward_points_earned || 0),
        rewardPointsBalance: parseFloat(billData.rewardPointsBalance || billData.reward_points_balance || 0),
        amountGiven: parseFloat(billData.amountGiven || billData.amount_given || billData.paidAmount || billData.paid_amount || 0),
        balanceReturned: parseFloat(billData.balanceReturned || billData.balance_returned || billData.changeAmount || billData.change_amount || 0),
        subtotal: subtotal,
        discountValue: discountValue,
        discountAmount: discountAmount,
        discountType: discountType,
        tax: parseFloat(billData.tax || billData.taxAmount || 0),
        taxType: billData.taxType || billData.tax_type || 'percentage',
        total: parseFloat(billData.total || billData.grandTotal || billData.amount || 0),
        paidAmount: parseFloat(billData.paidAmount || billData.paid_amount || billData.paid || 0),
        changeAmount: parseFloat(billData.changeAmount || billData.change_amount || billData.change || 0),
        paymentMethod: billData.paymentMethod || billData.payment_method || billData.payment?.method || 'cash',
        createdAt: billData.createdAt || billData.created_at || billData.date || new Date().toISOString(),
        updatedAt: billData.updatedAt || billData.updated_at,
        createdBy: billData.createdBy || billData.created_by,
        items: Array.isArray(billData.items) ? billData.items.map(item => ({
          id: item.id || item._id,
          productId: item.productId || item.product_id || item.product,
          productName: item.productName || item.product_name || item.name || 'Unknown',
          productModel: item.productModel || item.product_model || item.model || '',
          productType: item.productType || item.product_type || item.type || '',
          mrp: parseFloat(item.mrp || item.MRP || item.sellPrice || item.sell_price || item.price || 0),
          unit: item.unit || 'PCS',
          sellPrice: parseFloat(item.sellPrice || item.sell_price || item.price || 0),
          quantity: parseInt(item.quantity || item.qty || 1),
          total: parseFloat(item.total || item.subtotal || 0),
        })) : [],
        payments: Array.isArray(billData.payments) ? billData.payments.map(payment => ({
          id: payment.id || payment._id,
          paymentId: payment.paymentId || payment.payment_id,
          amount: parseFloat(payment.amount || 0),
          method: payment.method || 'cash',
          status: payment.status || 'completed',
          reference: payment.reference || '',
          notes: payment.notes || '',
          createdAt: payment.createdAt || payment.created_at
        })) : []
      };

      processedBill.itemCount = processedBill.itemCount || (processedBill.items ? processedBill.items.length : 0);
      processedBill.dueAmount = processedBill.total - processedBill.paidAmount;

      console.log('Processed Bill Details:', processedBill);

      setSelectedBill(processedBill);
      setShowBillModal(true);
    } catch (err) {
      console.error('Error fetching bill details:', err);

      const billFromList = bills.find(b => b.id === billId);
      if (billFromList) {
        console.log('Using bill from list as fallback after error');
        setSelectedBill(billFromList);
        setShowBillModal(true);
      } else {
        showMessage("error", "❌ Failed to load bill details");
      }
    } finally {
      setLoading(false);
    }
  };

  // Enhanced Print Bill with thermal receipt design including logo, thank you, and QR codes
  const handlePrintBill = (bill) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showMessage("error", "❌ Please allow pop-ups to print.");
      return;
    }

    const processedBill = {
      ...bill,
      subtotal: parseFloat(bill.subtotal) || 0,
      discountValue: parseFloat(bill.discountValue) || 0,
      discountAmount: parseFloat(bill.discountAmount) || 0,
      discountType: bill.discountType || 'amount',
      tax: parseFloat(bill.tax) || 0,
      total: parseFloat(bill.total) || 0,
      paidAmount: parseFloat(bill.paidAmount) || 0,
      changeAmount: parseFloat(bill.changeAmount) || 0,
      dueAmount: (parseFloat(bill.total) || 0) - (parseFloat(bill.paidAmount) || 0)
    };

    let discountDisplay = '';
    if (processedBill.discountType === 'percentage') {
      discountDisplay = `${processedBill.discountValue}% (₹${processedBill.discountAmount.toFixed(2)})`;
    } else {
      discountDisplay = `₹${processedBill.discountAmount.toFixed(2)}`;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Bill - ${processedBill.billNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 100%;
              margin: 0;
              padding: 5mm 3mm;
              background: white;
              color: black;
              box-sizing: border-box;
            }
            .receipt {
              width: 100%;
              max-width: 74mm;
              margin: 0 auto;
              padding: 0;
              box-sizing: border-box;
            }
            .receipt-header {
              text-align: center;
              margin-bottom: 10px;
            }
            .receipt-logo {
              text-align: center;
              margin-bottom: 5px;
            }
            .receipt-logo-img {
              width: 70px;
              height: 70px;
              object-fit: contain;
            }
            .receipt-shop {
              font-size: 16px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 2px 0;
            }
            .receipt-tagline {
              font-size: 9px;
              letter-spacing: 0.5px;
              color: #666;
              margin-bottom: 3px;
            }
            .receipt-addr {
              font-size: 9px;
              margin: 1px 0;
              line-height: 1.2;
            }
            .receipt-divider-thin {
              border-top: 1px dotted #000;
              margin: 4px 0;
            }
            .receipt-dash {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .receipt-meta {
              margin: 6px 0;
            }
            .receipt-meta-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              margin: 2px 0;
            }
            .receipt-table {
              width: 100%;
              border-collapse: collapse;
              margin: 8px 0;
            }
            .receipt-table th, .receipt-table td {
              padding: 4px 2px;
              font-size: 10px;
            }
            .receipt-table th {
              border-bottom: 1px solid #000;
              text-align: left;
              font-weight: bold;
            }
            .r-desc {
              text-align: left;
              width: 50%;
            }
            .r-num {
              text-align: right;
            }
            .receipt-pay {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              font-weight: bold;
              font-size: 14px;
            }
            .receipt-summary {
              margin: 8px 0;
            }
            .receipt-row {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              margin: 3px 0;
            }
            .receipt-savings {
              color: #059669;
              font-weight: bold;
            }
            .receipt-customer {
              margin: 8px 0;
              padding: 5px;
              background: #f5f5f5;
              border: 1px solid #ddd;
            }
            .receipt-cust-title {
              font-weight: bold;
              font-size: 10px;
              margin-bottom: 3px;
            }
            .receipt-cust-name, .receipt-cust-phone {
              font-size: 9px;
              margin: 2px 0;
            }
            .receipt-points {
              margin: 8px 0;
            }
            .receipt-thankyou {
              text-align: center;
              margin-top: 10px;
              font-weight: bold;
              font-size: 11px;
            }
            .receipt-visit {
              text-align: center;
              font-size: 10px;
              color: #666;
              margin-top: 3px;
            }
            .receipt-qr {
              display: flex;
              justify-content: space-around;
              margin-top: 12px;
            }
            .receipt-qr-item {
              text-align: center;
            }
            .receipt-qr-lbl {
              font-size: 8px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .receipt-qr-item img {
              width: 45px;
              height: 45px;
              object-fit: contain;
            }
            .text-center {
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Header with Logo -->
            <div class="receipt-header">
              <div class="receipt-logo">
                <img src="/Dc-logo.jpg" alt="Dressing Concepts" class="receipt-logo-img" onerror="this.style.display='none'" />
              </div>
              <div class="receipt-shop">${companyDetails.name || "DRESSING CONCEPTS"}</div>
              <div class="receipt-tagline">Style · Quality · Value</div>
              <div class="receipt-divider-thin"></div>
              <div class="receipt-addr">${companyDetails.address || "NO.88/70 S.R.P KOVIL STREET, AGARAM, PERAMBUR"}</div>
              <div class="receipt-addr">${companyDetails.city || "CHENNAI - 600 082"}</div>
              <div class="receipt-addr">Ph: ${companyDetails.phone || "9840669687"}</div>
              ${companyDetails.gst ? `<div class="receipt-addr">GSTIN: ${companyDetails.gst}</div>` : ''}
            </div>

            <div class="receipt-dash"></div>

            <!-- Bill Meta Info -->
            <div class="receipt-meta">
              <div class="receipt-meta-row"><span>Bill No: ${processedBill.billNumber}</span><span>${new Date(processedBill.createdAt).toLocaleDateString()}</span></div>
              <div class="receipt-meta-row"><span>Time: ${new Date(processedBill.createdAt).toLocaleTimeString()}</span><span>User: ${processedBill.createdBy || 'Admin'}</span></div>
              ${processedBill.counter ? `<div class="receipt-meta-row"><span>Counter: ${processedBill.counter}</span><span></span></div>` : ''}
            </div>

            <div class="receipt-dash"></div>

            <!-- Items Table -->
            <table class="receipt-table">
              <thead>
                <tr>
                  <th class="r-desc">Description</th>
                  <th class="r-num">Qty</th>
                  <th class="r-num">Price</th>
                  <th class="r-num">Amt</th>
                </tr>
              </thead>
              <tbody>
                ${processedBill.items && processedBill.items.length > 0 ? processedBill.items.map(item => {
      const productName = item.productName || 'Unknown';
      const sellPrice = parseFloat(item.sellPrice) || 0;
      const quantity = item.quantity || 0;
      const total = parseFloat(item.total) || 0;
      return `
                    <tr>
                      <td class="r-desc">${productName.substring(0, 20)}${productName.length > 20 ? '...' : ''}</td>
                      <td class="r-num">${quantity}</td>
                      <td class="r-num">₹${sellPrice.toFixed(2)}</td>
                      <td class="r-num">₹${total.toFixed(2)}</td>
                    </tr>
                  `;
    }).join('') : '<tr><td colspan="4" class="text-center">No items found</td></tr>'}
              </tbody>
            </table>

            <div class="receipt-dash"></div>

            <!-- Payment Summary -->
            <div class="receipt-pay">
              <span>Pay Amount</span>
              <span>₹ ${processedBill.total.toFixed(2)}/-</span>
            </div>

            <div class="receipt-dash"></div>

            <div class="receipt-summary">
              <div class="receipt-row"><span>Total Pieces:</span><span>${processedBill.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}</span></div>
              <div class="receipt-row"><span>Subtotal:</span><span>₹ ${processedBill.subtotal.toFixed(2)}</span></div>
              ${processedBill.discountAmount > 0 ? `<div class="receipt-row"><span>Discount:</span><span>- ₹ ${processedBill.discountAmount.toFixed(2)}</span></div>` : ''}
              ${processedBill.tax > 0 ? `<div class="receipt-row"><span>Tax:</span><span>₹ ${processedBill.tax.toFixed(2)}</span></div>` : ''}
              <div class="receipt-row receipt-savings"><span>You Saved:</span><span>₹ ${(processedBill.subtotal - processedBill.total).toFixed(2)}</span></div>
            </div>

            <div class="receipt-dash"></div>

            <!-- Customer Details -->
            <div class="receipt-customer">
              <div class="receipt-cust-title">Customer Details</div>
              <div class="receipt-cust-name">${processedBill.customerName || "Walk-in Customer"}</div>
              ${processedBill.customerPhone ? `<div class="receipt-cust-phone">📱 ${processedBill.customerPhone}</div>` : ''}
              ${processedBill.customerAddress ? `<div class="receipt-cust-phone">📍 ${processedBill.customerAddress.substring(0, 30)}</div>` : ''}
            </div>

            <div class="receipt-dash"></div>

            <!-- Payment Details -->
            <div class="receipt-summary">
              <div class="receipt-row"><span>Amount Paid:</span><span>₹ ${processedBill.paidAmount.toFixed(2)}</span></div>
              ${processedBill.dueAmount > 0 ? `<div class="receipt-row"><span>Due Amount:</span><span>₹ ${processedBill.dueAmount.toFixed(2)}</span></div>` : ''}
              ${processedBill.changeAmount > 0 ? `<div class="receipt-row"><span>Change:</span><span>₹ ${processedBill.changeAmount.toFixed(2)}</span></div>` : ''}
              <div class="receipt-row"><span>Payment Mode:</span><span>${(processedBill.paymentMethod || 'cash').toUpperCase()}</span></div>
            </div>

            <div class="receipt-dash"></div>

            <!-- Rewards Points -->
            <div class="receipt-points">
              <div class="receipt-row"><span>Points Used:</span><span>0</span></div>
              <div class="receipt-row"><span>Points Available:</span><span>${processedBill.rewardPointsAvailable || 0}</span></div>
              <div class="receipt-row"><span>Points Earned:</span><span>${processedBill.noRewards ? "0" : Math.floor(processedBill.total * 0.01)}</span></div>
            </div>

            <div class="receipt-dash"></div>

            <!-- Thank You Message -->
            <div class="receipt-thankyou">Thank you for shopping with us!</div>
            <div class="receipt-visit">Visit again ❤️</div>

            <!-- QR Codes Section -->
            <div class="receipt-qr">
              <div class="receipt-qr-item">
                <div class="receipt-qr-lbl">JOIN US</div>
                <img src="/whatsapp-qr.png" alt="WhatsApp QR" onerror="this.style.display='none'" />
              </div>
              <div class="receipt-qr-item">
                <div class="receipt-qr-lbl">VISIT US</div>
                <img src="/instagram.png" alt="Instagram QR" onerror="this.style.display='none'" />
              </div>
            </div>

            <div class="receipt-divider-thin"></div>
            <div class="receipt-visit" style="font-size: 8px;">** Computer generated bill **</div>
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

  // WhatsApp share function with company details
  const handleWhatsAppShare = (bill) => {
    if (!bill.customerPhone) {
      showMessage("error", "❌ No phone number available for this customer");
      return;
    }

    setWhatsappStatus(prev => ({ ...prev, [bill.id]: 'sending' }));

    const cleanPhone = bill.customerPhone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      showMessage("error", "❌ Please enter a valid 10-digit phone number");
      setWhatsappStatus(prev => ({ ...prev, [bill.id]: 'error' }));
      setTimeout(() => {
        setWhatsappStatus(prev => ({ ...prev, [bill.id]: null }));
      }, 2000);
      return;
    }

    const whatsappNumber = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const dueAmount = (bill.total || 0) - (bill.paidAmount || 0);
    const items = bill.items || [];

    let message = `*${companyDetails.name}*\n`;
    message += `${companyDetails.address}\n`;
    message += `${companyDetails.city}\n`;
    if (companyDetails.phone) message += `Ph: ${companyDetails.phone}\n`;
    if (companyDetails.email) message += `Email: ${companyDetails.email}\n`;
    if (companyDetails.gst) message += `GST: ${companyDetails.gst}\n`;
    message += `═══════════════════════\n`;
    message += `*BILL DETAILS*\n`;
    message += `═══════════════════════\n`;
    message += `*Bill No:* ${bill.billNumber}\n`;
    message += `*Date:* ${new Date(bill.createdAt).toLocaleDateString()}\n`;
    message += `*Time:* ${new Date(bill.createdAt).toLocaleTimeString()}\n`;
    message += `*Customer:* ${bill.customerName || 'Walk-in Customer'}\n`;
    message += `*Type:* ${(bill.customerType || 'external').toUpperCase()}\n`;

    if (bill.customerPhone) {
      message += `*Phone:* ${bill.customerPhone}\n`;
    }

    message += `═══════════════════════\n`;
    message += `*ITEMS PURCHASED:*\n`;

    items.slice(0, 5).forEach(item => {
      const productName = item.productName || item.product_name || 'Unknown';
      const qty = item.quantity || 0;
      const price = parseFloat(item.sellPrice || item.sell_price || 0);
      const total = parseFloat(item.total || 0);
      message += `• ${productName.substring(0, 20)}${productName.length > 20 ? '...' : ''}\n`;
      message += `  ${qty} x ₹${price.toFixed(2)} = ₹${total.toFixed(2)}\n`;
    });

    if (items.length > 5) {
      message += `  ...and ${items.length - 5} more items\n`;
    }

    message += `═══════════════════════\n`;
    message += `*Subtotal:* ₹${(bill.subtotal || 0).toFixed(2)}\n`;

    if (bill.discountAmount > 0) {
      if (bill.discountType === 'percentage') {
        message += `*Discount:* ${bill.discountValue}% (₹${bill.discountAmount.toFixed(2)})\n`;
      } else {
        message += `*Discount:* ₹${bill.discountAmount.toFixed(2)}\n`;
      }
    }

    if (bill.tax > 0) {
      message += `*Tax:* ₹${(bill.tax || 0).toFixed(2)}\n`;
    }

    message += `*TOTAL AMOUNT:* ₹${(bill.total || 0).toFixed(2)}\n`;
    message += `*Paid:* ₹${(bill.paidAmount || 0).toFixed(2)}\n`;

    if (dueAmount > 0) {
      message += `*Due:* ₹${dueAmount.toFixed(2)}\n`;
    }

    if (bill.changeAmount > 0) {
      message += `*Change:* ₹${bill.changeAmount.toFixed(2)}\n`;
    }

    message += `*Payment Method:* ${(bill.paymentMethod || 'cash').toUpperCase()}\n`;
    message += `═══════════════════════\n`;
    message += `Thank you for shopping with us!\n`;
    message += `Goods once sold will not be taken back\n`;
    message += `** Computer generated bill **\n`;

    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${whatsappNumber}?text=${encodedMessage}`, '_blank');

    setWhatsappStatus(prev => ({ ...prev, [bill.id]: 'sent' }));
    showMessage("success", "✅ WhatsApp opened successfully!");

    setTimeout(() => {
      setWhatsappStatus(prev => ({ ...prev, [bill.id]: null }));
    }, 3000);
  };

  const applyFilters = () => {
    let filtered = [...bills];

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(bill =>
        (bill.billNumber?.toLowerCase().includes(term)) ||
        (bill.customerName?.toLowerCase().includes(term)) ||
        (bill.customerPhone?.toLowerCase().includes(term)) ||
        (bill.customerEmail?.toLowerCase().includes(term)) ||
        (bill.customerGst?.toLowerCase().includes(term))
      );
    }

    if (filterPaymentMethod !== 'all') {
      filtered = filtered.filter(bill =>
        bill.paymentMethod?.toLowerCase() === filterPaymentMethod.toLowerCase()
      );
    }

    if (filterCustomerType !== 'all') {
      filtered = filtered.filter(bill =>
        bill.customerType?.toLowerCase() === filterCustomerType.toLowerCase()
      );
    }

    if (dateRange.start && dateRange.end) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter(bill => {
        const billDate = new Date(bill.createdAt);
        return billDate >= start && billDate <= end;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest':
          return (b.total || 0) - (a.total || 0);
        case 'lowest':
          return (a.total || 0) - (b.total || 0);
        default:
          return 0;
      }
    });

    setFilteredBills(filtered);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setFilterPaymentMethod('all');
    setFilterCustomerType('all');
    setDateRange({ start: '', end: '' });
    setSortBy('newest');
    setFilteredBills(bills);
    setCurrentPage(1);
    setQuickDate('all');
    showMessage("info", "🔍 Filters cleared");
  };

  const handleQuickDateChange = (option) => {
    setQuickDate(option);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let start = '';
    let end = todayStr;

    switch(option) {
      case 'today':
        start = todayStr;
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        start = yesterday.toISOString().split('T')[0];
        end = start;
        break;
      case 'past2days':
        const p2d = new Date();
        p2d.setDate(today.getDate() - 1);
        start = p2d.toISOString().split('T')[0];
        break;
      case 'thisweek':
        const week = new Date();
        week.setDate(today.getDate() - 7);
        start = week.toISOString().split('T')[0];
        break;
      case 'thismonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        start = monthStart.toISOString().split('T')[0];
        break;
      case 'all':
        start = '';
        end = '';
        break;
      default:
        return;
    }
    
    setDateRange({ start, end });
  };

  const handleExportExcel = () => {
    try {
      const exportData = filteredBills.map(bill => ({
        'Bill Number': bill.billNumber || '',
        'Date': new Date(bill.createdAt).toLocaleDateString(),
        'Time': new Date(bill.createdAt).toLocaleTimeString(),
        'Customer Name': bill.customerName || 'Walk-in Customer',
        'Customer Phone': bill.customerPhone || '',
        'Customer Email': bill.customerEmail || '',
        'Customer Type': (bill.customerType || 'external').toUpperCase(),
        'Items Count': bill.itemCount || 0,
        'Subtotal (₹)': (bill.subtotal || 0).toFixed(2),
        'Discount Value': bill.discountType === 'percentage' ? `${bill.discountValue}%` : `₹${bill.discountValue.toFixed(2)}`,
        'Discount Amount (₹)': (bill.discountAmount || 0).toFixed(2),
        'Discount Type': bill.discountType || 'amount',
        'Tax (₹)': (bill.tax || 0).toFixed(2),
        'Total (₹)': (bill.total || 0).toFixed(2),
        'Paid (₹)': (bill.paidAmount || 0).toFixed(2),
        'Change (₹)': (bill.changeAmount || 0).toFixed(2),
        'Due (₹)': ((bill.total || 0) - (bill.paidAmount || 0)).toFixed(2),
        'Payment Method': (bill.paymentMethod || 'cash').toUpperCase()
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Bills");

      const wscols = [
        { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 25 }, { wch: 15 },
        { wch: 25 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 },
        { wch: 12 }, { wch: 12 }, { wch: 15 }
      ];
      worksheet['!cols'] = wscols;

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const file = new Blob([excelBuffer], {
        type: "application/octet-stream",
      });

      const date = new Date().toISOString().split('T')[0];
      saveAs(file, `Bills_${date}.xlsx`);

      showMessage("success", `✅ Exported ${filteredBills.length} bills to Excel`);
    } catch (err) {
      console.error("Export error:", err);
      showMessage("error", "❌ Failed to export to Excel");
    }
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();

      doc.setFontSize(20);
      doc.setTextColor(99, 102, 241);
      doc.text('Bills Report', 14, 22);

      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`${companyDetails.name}`, 14, 30);
      doc.text(`${companyDetails.address}, ${companyDetails.city}`, 14, 35);
      if (companyDetails.phone) doc.text(`Ph: ${companyDetails.phone}`, 14, 40);
      if (companyDetails.gst) doc.text(`GST: ${companyDetails.gst}`, 14, 45);

      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 52);

      let filterY = 59;
      if (searchTerm) {
        doc.text(`Search: "${searchTerm}"`, 14, filterY);
        filterY += 5;
      }
      if (filterPaymentMethod !== 'all') {
        doc.text(`Payment Method: ${filterPaymentMethod}`, 14, filterY);
        filterY += 5;
      }
      if (filterCustomerType !== 'all') {
        doc.text(`Customer Type: ${filterCustomerType}`, 14, filterY);
        filterY += 5;
      }
      if (dateRange.start && dateRange.end) {
        doc.text(`Date Range: ${dateRange.start} to ${dateRange.end}`, 14, filterY);
        filterY += 5;
      }

      const totalAmount = filteredBills.reduce((sum, bill) => sum + (bill.total || 0), 0);
      const totalPaid = filteredBills.reduce((sum, bill) => sum + (bill.paidAmount || 0), 0);
      const totalDue = totalAmount - totalPaid;
      const totalDiscount = filteredBills.reduce((sum, bill) => sum + (bill.discountAmount || 0), 0);

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text(`Total Bills: ${filteredBills.length}`, 14, filterY + 5);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, filterY + 12);
      doc.text(`Total Discount: ₹${totalDiscount.toFixed(2)}`, 14, filterY + 19);
      doc.text(`Total Paid: ₹${totalPaid.toFixed(2)}`, 14, filterY + 26);
      doc.text(`Total Due: ₹${totalDue.toFixed(2)}`, 14, filterY + 33);

      const tableColumn = [
        'Bill No', 'Date', 'Customer', 'Type', 'Items', 'Subtotal', 'Discount',
        'Total (₹)', 'Paid (₹)', 'Due (₹)', 'Method'
      ];

      const tableRows = filteredBills.map(bill => {
        let discountDisplay = '';
        if (bill.discountType === 'percentage') {
          discountDisplay = `${bill.discountValue}%`;
        } else {
          discountDisplay = `₹${bill.discountAmount.toFixed(2)}`;
        }

        return [
          bill.billNumber || '',
          new Date(bill.createdAt).toLocaleDateString(),
          (bill.customerName || 'Walk-in').substring(0, 20),
          (bill.customerType || 'ext').substring(0, 3).toUpperCase(),
          bill.itemCount || 0,
          (bill.subtotal || 0).toFixed(2),
          discountDisplay,
          (bill.total || 0).toFixed(2),
          (bill.paidAmount || 0).toFixed(2),
          ((bill.total || 0) - (bill.paidAmount || 0)).toFixed(2),
          (bill.paymentMethod || 'cash').substring(0, 3).toUpperCase()
        ];
      });

      const startY = filterY + 42;

      doc.autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: startY,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      });

      const date = new Date().toISOString().split('T')[0];
      doc.save(`Bills_Report_${date}.pdf`);

      showMessage("success", `✅ Exported ${filteredBills.length} bills to PDF`);
    } catch (err) {
      console.error("PDF export error:", err);
      showMessage("error", "❌ Failed to export to PDF");
    }
  };

  const handleCopyBillNumber = (billNumber) => {
    navigator.clipboard.writeText(billNumber);
    setCopiedBillNo(billNumber);
    setTimeout(() => setCopiedBillNo(null), 2000);
    showMessage("success", "📋 Bill number copied!");
  };

  // Pagination functions
  const paginate = (pageNumber) => {
    if (pageNumber > 0 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getPaymentIcon = (method) => {
    return paymentMethodMap[method?.toLowerCase()]?.icon || <DollarSign size={14} />;
  };

  const getPaymentColor = (method) => {
    return paymentMethodMap[method?.toLowerCase()]?.color || '#6b7280';
  };

  const getCustomerTypeIcon = (type) => {
    return customerTypeMap[type?.toLowerCase()]?.icon || <User size={14} />;
  };

  const getCustomerTypeColor = (type) => {
    return customerTypeMap[type?.toLowerCase()]?.color || '#6b7280';
  };

  const formatCurrency = (amount) => {
    return `₹${(parseFloat(amount) || 0).toFixed(2)}`;
  };

  // Dark Theme Styles
  const styles = {
    container: {
      padding: "20px",
      minHeight: "100vh",
      backgroundColor: "#111827",
      backgroundImage: "url('/image1.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      color: "#f9fafb",
      fontFamily: "Inter, Arial, sans-serif",
    },
    shortcutBar: {
      backgroundColor: "#1f2937",
      padding: "8px 16px",
      borderRadius: "8px",
      marginBottom: "20px",
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "20px",
      border: "1px solid #374151",
      fontSize: "12px",
    },
    shortcutTitle: {
      color: "#6366f1",
      fontWeight: "bold",
      fontSize: "12px",
    },
    shortcutList: {
      display: "flex",
      flexWrap: "wrap",
      gap: "15px",
    },
    shortcutItem: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      backgroundColor: "rgba(0,0,0,0.3)",
      padding: "3px 10px",
      borderRadius: "15px",
      fontSize: "11px",
    },
    kbd: {
      backgroundColor: "#2d2d44",
      border: "1px solid #6366f1",
      borderRadius: "4px",
      padding: "2px 6px",
      fontWeight: "bold",
      color: "#6366f1",
      fontSize: "10px",
      marginRight: "3px",
    },
    shopHeader: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "15px",
    },
    shopInfo: {
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      flex: 1,
    },
    shopLogo: {
      width: "60px",
      height: "60px",
      borderRadius: "8px",
      objectFit: "cover",
      marginRight: "15px",
    },
    shopName: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#6366f1",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    shopAddress: {
      fontSize: "14px",
      color: "#d1d5db",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    shopContact: {
      fontSize: "14px",
      color: "#d1d5db",
      margin: 0,
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    companySelector: {
      backgroundColor: "#111827",
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      border: "1px solid #374151",
      transition: "all 0.2s",
    },
    companyDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      borderRadius: "6px",
      marginTop: "5px",
      zIndex: 100,
      minWidth: "200px",
      maxHeight: "300px",
      overflowY: "auto",
    },
    companyOption: {
      padding: "10px 15px",
      cursor: "pointer",
      transition: "background 0.2s",
      color: "#e5e7eb",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "25px",
      flexWrap: "wrap",
      gap: "15px",
    },
    headerTitle: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    title: {
      fontSize: "28px",
      fontWeight: "600",
      margin: 0,
      color: "#f9fafb",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    refreshButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s",
    },
    buttonGroup: {
      display: "flex",
      gap: "10px",
      flexWrap: "wrap",
    },
    button: {
      display: "flex",
      alignItems: "center",
      gap: "6px",
      padding: "8px 14px",
      borderRadius: "6px",
      backgroundColor: "#1f2937",
      color: "#f9fafb",
      border: "1px solid #374151",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "500",
      transition: "all 0.2s",
    },
    primaryButton: {
      backgroundColor: "#6366f1",
      color: "#fff",
      border: "none",
    },
    successButton: {
      backgroundColor: "#059669",
      color: "#fff",
      border: "none",
    },
    infoButton: {
      backgroundColor: "#3b82f6",
      color: "#fff",
      border: "none",
    },
    filterBar: {
      backgroundColor: "#1f2937",
      padding: "20px",
      borderRadius: "8px",
      border: "1px solid #374151",
      marginBottom: "20px",
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr auto",
      gap: "12px",
      alignItems: "center",
    },
    searchBox: {
      position: "relative",
      width: "100%",
    },
    searchIcon: {
      position: "absolute",
      left: "12px",
      top: "50%",
      transform: "translateY(-50%)",
      color: "#6b7280",
    },
    searchInput: {
      width: "100%",
      padding: "10px 12px 10px 38px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    filterSelect: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      cursor: "pointer",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    dateInput: {
      width: "100%",
      padding: "10px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      outline: "none",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    filterButton: {
      padding: "10px 16px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      fontWeight: "500",
      transition: "all 0.2s",
      whiteSpace: "nowrap",
      height: "41px",
    },
    tableContainer: {
      backgroundColor: "#1f2937",
      borderRadius: "8px",
      border: "1px solid #374151",
      overflow: "auto",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: "1400px",
    },
    th: {
      backgroundColor: "#374151",
      padding: "14px 12px",
      textAlign: "left",
      fontSize: "12px",
      fontWeight: "600",
      color: "#f3f4f6",
      borderBottom: "1px solid #4b5563",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    },
    td: {
      padding: "14px 12px",
      borderBottom: "1px solid #374151",
      fontSize: "13px",
      color: "#f9fafb",
    },
    paymentBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    customerTypeBadge: {
      padding: "4px 10px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: "600",
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
    },
    actionButton: {
      padding: "6px 10px",
      margin: "0 2px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    whatsappButton: {
      padding: "6px 10px",
      margin: "0 2px",
      border: "none",
      borderRadius: "4px",
      cursor: "pointer",
      transition: "all 0.2s",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#25D366",
      color: "white",
    },
    message: {
      padding: "12px 20px",
      borderRadius: "6px",
      marginBottom: "20px",
      fontSize: "14px",
      fontWeight: "500",
      whiteSpace: "pre-line",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    successMessage: {
      backgroundColor: "rgba(5, 150, 105, 0.2)",
      color: "#34d399",
      border: "1px solid #059669",
    },
    errorMessage: {
      backgroundColor: "rgba(220, 38, 38, 0.2)",
      color: "#f87171",
      border: "1px solid #dc2626",
    },
    infoMessage: {
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      color: "#60a5fa",
      border: "1px solid #3b82f6",
    },
    loadingSpinner: {
      textAlign: "center",
      padding: "60px",
      color: "#9ca3af",
      fontSize: "16px",
    },
    noData: {
      textAlign: "center",
      padding: "60px",
      color: "#6b7280",
      fontStyle: "italic",
    },
    pagination: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "20px",
      padding: "10px 0",
    },
    paginationInfo: {
      color: "#9ca3af",
      fontSize: "13px",
    },
    paginationControls: {
      display: "flex",
      gap: "8px",
      alignItems: "center",
    },
    pageButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "8px 12px",
      backgroundColor: "#1f2937",
      border: "1px solid #374151",
      color: "#f9fafb",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "13px",
      transition: "all 0.2s",
      minWidth: "38px",
    },
    activePageButton: {
      backgroundColor: "#6366f1",
      borderColor: "#6366f1",
    },
    disabledButton: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    pageNumbers: {
      display: "flex",
      gap: "4px",
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
      backdropFilter: "blur(4px)",
    },
    modalContent: {
      backgroundColor: "#1f2937",
      padding: "30px",
      borderRadius: "12px",
      maxWidth: "700px",
      width: "95%",
      maxHeight: "85vh",
      overflow: "auto",
      position: "relative",
      border: "1px solid #374151",
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
    },
    modalClose: {
      position: "absolute",
      top: "15px",
      right: "15px",
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "4px",
    },
    modalTitle: {
      fontSize: "22px",
      fontWeight: "600",
      color: "#f9fafb",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    modalSection: {
      marginBottom: "20px",
      padding: "15px",
      backgroundColor: "#111827",
      borderRadius: "8px",
      border: "1px solid #374151",
    },
    modalText: {
      color: "#d1d5db",
      fontSize: "14px",
      lineHeight: "1.6",
      marginBottom: "6px",
    },
    modalTable: {
      width: "100%",
      borderCollapse: "collapse",
      marginBottom: "20px",
    },
    modalTh: {
      backgroundColor: "#374151",
      padding: "10px",
      textAlign: "left",
      color: "#f3f4f6",
      fontWeight: "500",
      fontSize: "12px",
    },
    modalTd: {
      padding: "8px",
      borderBottom: "1px solid #374151",
      color: "#f9fafb",
      fontSize: "13px",
    },
    modalFooter: {
      display: "flex",
      gap: "10px",
      marginTop: "20px",
    },
    itemsPerPageSelect: {
      padding: "8px",
      backgroundColor: "#111827",
      border: "1px solid #374151",
      color: "#fff",
      borderRadius: "6px",
      fontSize: "13px",
      marginLeft: "10px",
    },
    copyButton: {
      background: "none",
      border: "none",
      color: "#9ca3af",
      cursor: "pointer",
      padding: "4px",
      marginLeft: "5px",
    },
  };

  if (loading && bills.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <RefreshCw size={30} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
          <div>Loading Bills...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Shortcut Keys Bar */}
      <div style={styles.shortcutBar}>
        <div style={styles.shortcutTitle}>🔥 SHORTCUTS:</div>
        <div style={styles.shortcutList}>
          <div style={styles.shortcutItem}><kbd style={styles.kbd}>F8</kbd>/<kbd style={styles.kbd}>Ctrl+Shift+V</kbd>👁️View</div>
          <div style={styles.shortcutItem}><kbd style={styles.kbd}>F9</kbd>/<kbd style={styles.kbd}>Ctrl+Shift+B</kbd>🖨️Print</div>
          <div style={styles.shortcutItem}><kbd style={styles.kbd}>F10</kbd>/<kbd style={styles.kbd}>Ctrl+Shift+W</kbd>💬WhatsApp</div>
          <div style={styles.shortcutItem}><kbd style={styles.kbd}>Ctrl+F</kbd>🔍Search</div>
          <div style={styles.shortcutItem}><kbd style={styles.kbd}>Ctrl+R</kbd>🔄Refresh</div>
          <div style={styles.shortcutItem}><kbd style={styles.kbd}>Esc</kbd>🔇Clear</div>
        </div>
      </div>

      {/* Shop Header with Company Details */}
      <div style={styles.shopHeader}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          {companyDetails.logoUrl && (
            <img
              src={companyDetails.logoUrl}
              alt="Company Logo"
              style={styles.shopLogo}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          )}
          <div style={styles.shopInfo}>
            <h1 style={styles.shopName}>
              <Store size={28} color="#6366f1" />
              {companyDetails.name}
            </h1>
            <p style={styles.shopAddress}>
              <MapPin size={14} color="#9ca3af" />
              {companyDetails.address}, {companyDetails.city}
            </p>
            <p style={styles.shopContact}>
              <Phone size={14} color="#9ca3af" />
              {companyDetails.phone}
              {companyDetails.email && (
                <>
                  <Mail size={14} color="#9ca3af" style={{ marginLeft: '15px' }} />
                  {companyDetails.email}
                </>
              )}
              {companyDetails.gst && (
                <>
                  <Building2 size={14} color="#9ca3af" style={{ marginLeft: '15px' }} />
                  GST: {companyDetails.gst}
                </>
              )}
            </p>
          </div>
        </div>

        {/* Company Selector */}
        {companies.length > 0 && (
          <div style={{ position: 'relative' }}>
            <div
              style={styles.companySelector}
              onClick={() => setShowCompanySelector(!showCompanySelector)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1f2937';
                e.currentTarget.style.borderColor = '#6366f1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#111827';
                e.currentTarget.style.borderColor = '#374151';
              }}
            >
              <Building2 size={16} style={{ marginRight: '8px' }} />
              {companies.find(c => c.id === selectedCompanyId)?.name || 'Select Company'}
              <span style={{ marginLeft: '8px' }}>{showCompanySelector ? '▲' : '▼'}</span>
            </div>

            {showCompanySelector && (
              <div style={styles.companyDropdown}>
                {companies.map(company => (
                  <div
                    key={company.id}
                    style={{
                      ...styles.companyOption,
                      backgroundColor: selectedCompanyId === company.id ? '#374151' : 'transparent'
                    }}
                    onClick={() => handleCompanySelect(company)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d3748'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedCompanyId === company.id ? '#374151' : 'transparent'}
                  >
                    <Building2 size={14} style={{ marginRight: '8px', display: 'inline' }} />
                    {company.name}
                    {company.gst_number && (
                      <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '8px' }}>
                        GST: {company.gst_number}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message Display */}
      {message.text && (
        <div style={{
          ...styles.message,
          ...(message.type === "success" ? styles.successMessage :
            message.type === "error" ? styles.errorMessage :
              styles.infoMessage)
        }}>
          {message.type === "success" && <CheckCircle size={18} />}
          {message.type === "error" && <AlertCircle size={18} />}
          {message.type === "info" && <Filter size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <h1 style={styles.title}>
            <Receipt size={32} color="#6366f1" />
            Visit Bills (BT Series)
          </h1>
          <button
            style={styles.refreshButton}
            onClick={fetchBills}
            title="Refresh (Ctrl+R)"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f9fafb';
              e.currentTarget.style.backgroundColor = '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <RefreshCw size={18} />
          </button>
          <select
            style={styles.itemsPerPageSelect}
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div style={styles.buttonGroup}>
          <button
            style={{ ...styles.button, ...styles.infoButton }}
            onClick={handleExportExcel}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <FileSpreadsheet size={16} /> Excel
          </button>
          <button
            style={{ ...styles.button, ...styles.successButton }}
            onClick={handleExportPDF}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <FileJson size={16} /> PDF
          </button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <TrendingUp size={14} color="#6366f1" /> TOTAL SALES
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{formatCurrency(salesSummary.total.amount)}</div>
          <div style={{ fontSize: '11px', color: '#6366f1' }}>{salesSummary.total.count} Bills</div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151', borderLeft: '4px solid #059669' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
             <DollarSign size={14} color="#059669" /> CASH
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(salesSummary.cash.amount)}</div>
          <div style={{ fontSize: '11px', color: '#059669' }}>{salesSummary.cash.count} Bills</div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
             <CreditCard size={14} color="#3b82f6" /> CARD
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(salesSummary.card.amount)}</div>
          <div style={{ fontSize: '11px', color: '#3b82f6' }}>{salesSummary.card.count} Bills</div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
             <Smartphone size={14} color="#8b5cf6" /> UPI
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(salesSummary.upi.amount)}</div>
          <div style={{ fontSize: '11px', color: '#8b5cf6' }}>{salesSummary.upi.count} Bills</div>
        </div>

        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
             <Globe size={14} color="#10b981" /> ONLINE
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{formatCurrency(salesSummary.online.amount)}</div>
          <div style={{ fontSize: '11px', color: '#10b981' }}>{salesSummary.online.count} Bills</div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        <div style={styles.searchBox}>
          <Search size={16} style={styles.searchIcon} />
          <input
            type="text"
            style={styles.searchInput}
            placeholder="Search bill no, customer name, phone, email... (Ctrl+F)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          style={styles.filterSelect}
          value={quickDate}
          onChange={(e) => handleQuickDateChange(e.target.value)}
        >
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
          <option value="past2days">Past 2 Days</option>
          <option value="thisweek">Last 7 Days</option>
          <option value="thismonth">This Month</option>
          <option value="all">Custom Range</option>
        </select>

        <select
          style={styles.filterSelect}
          value={filterPaymentMethod}
          onChange={(e) => setFilterPaymentMethod(e.target.value)}
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="upi">UPI</option>
          <option value="online">Online</option>
          <option value="netbanking">Netbanking</option>
          <option value="cheque">Cheque</option>
          <option value="mixed">Mixed</option>
        </select>

        <select
          style={styles.filterSelect}
          value={filterCustomerType}
          onChange={(e) => setFilterCustomerType(e.target.value)}
        >
          <option value="all">All Customers</option>
          <option value="internal">Internal (Staff)</option>
          <option value="external">External</option>
          <option value="regular">Regular</option>
          <option value="wholesale">Wholesale</option>
          <option value="vip">VIP</option>
          <option value="corporate">Corporate</option>
        </select>

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
          placeholder="From Date"
        />

        <input
          type="date"
          style={styles.dateInput}
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
          placeholder="To Date"
        />

        <select
          style={styles.filterSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>

        <button
          style={styles.filterButton}
          onClick={resetFilters}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2d3748';
            e.currentTarget.style.borderColor = '#4b5563';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#1f2937';
            e.currentTarget.style.borderColor = '#374151';
          }}
        >
          <X size={16} /> Clear
        </button>
      </div>

      {/* Bills Table */}
      <div style={styles.tableContainer}>
        {error && <div style={{ padding: '30px', color: '#f87171', textAlign: 'center' }}>{error}</div>}

        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Bill No.</th>
              <th style={styles.th}>Date & Time</th>
              <th style={styles.th}>Customer</th>
              <th style={styles.th}>Type</th>
              <th style={styles.th}>Member / Sales</th>
              <th style={styles.th}>Contact</th>
              <th style={styles.th}>Items</th>
              <th style={styles.th}>Subtotal</th>
              <th style={styles.th}>Discount</th>
              <th style={styles.th}>Tax</th>
              <th style={styles.th}>Total</th>
              <th style={styles.th}>Paid</th>
              <th style={styles.th}>Due</th>
              <th style={styles.th}>Payment</th>
              <th style={styles.th}>Flags</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentBills.length === 0 ? (
              <tr>
                <td colSpan="16" style={styles.noData}>
                  {searchTerm || filterPaymentMethod !== 'all' || filterCustomerType !== 'all' || dateRange.start
                    ? <div>
                      <Filter size={30} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <div>No bills match your filters</div>
                      <button
                        onClick={resetFilters}
                        style={{ ...styles.button, marginTop: '15px', display: 'inline-flex' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2d3748';
                          e.currentTarget.style.borderColor = '#4b5563';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#1f2937';
                          e.currentTarget.style.borderColor = '#374151';
                        }}
                      >
                        <X size={14} /> Clear Filters
                      </button>
                    </div>
                    : <div>
                      <Receipt size={30} style={{ marginBottom: '10px', opacity: 0.5 }} />
                      <div>No bills found</div>
                    </div>}
                </td>
              </tr>
            ) : (
              currentBills.map((bill) => {
                const dueAmount = (bill.total || 0) - (bill.paidAmount || 0);

                let discountDisplay = '';
                if (bill.discountType === 'percentage') {
                  discountDisplay = `${bill.discountValue}%`;
                } else {
                  discountDisplay = formatCurrency(bill.discountAmount);
                }

                return (
                  <tr key={bill.id}>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <strong>{bill.billNumber}</strong>
                        <button
                          style={styles.copyButton}
                          onClick={() => handleCopyBillNumber(bill.billNumber)}
                          title="Copy bill number"
                          onMouseEnter={(e) => e.currentTarget.style.color = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                          {copiedBillNo === bill.billNumber ? <CheckCircle size={14} color="#059669" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div>{new Date(bill.createdAt).toLocaleDateString()}</div>
                      <small style={{ color: '#9ca3af', fontSize: '11px' }}>
                        {new Date(bill.createdAt).toLocaleTimeString()}
                      </small>
                    </td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} color="#9ca3af" />
                        <span>{bill.customerName || 'Walk-in'}</span>
                      </div>
                      {bill.customerEmail && (
                        <small style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          <Mail size={10} /> {bill.customerEmail}
                        </small>
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.customerTypeBadge,
                        backgroundColor: `${getCustomerTypeColor(bill.customerType)}20`,
                        color: getCustomerTypeColor(bill.customerType),
                        border: `1px solid ${getCustomerTypeColor(bill.customerType)}40`
                      }}>
                        {getCustomerTypeIcon(bill.customerType)}
                        <span style={{ textTransform: 'capitalize' }}>{bill.customerType || 'external'}</span>
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div>{bill.memberId || '-'}</div>
                      <small style={{ color: '#9ca3af', fontSize: '10px' }}>{bill.salesPerson || '-'}</small>
                    </td>
                    <td style={styles.td}>
                      {bill.customerPhone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={10} color="#9ca3af" />
                          <span>{bill.customerPhone}</span>
                        </div>
                      )}
                      {bill.customerGst && (
                        <small style={{ color: '#9ca3af', fontSize: '10px' }}>
                          GST: {bill.customerGst}
                        </small>
                      )}
                    </td>
                    <td style={styles.td}>{bill.itemCount || 0}</td>
                    <td style={styles.td}>{formatCurrency(bill.subtotal)}</td>
                    <td style={styles.td}>
                      <span title={`${bill.discountType === 'percentage' ? 'Percentage' : 'Fixed'} discount`}>
                        {discountDisplay}
                        {bill.discountType === 'percentage' && (
                          <small style={{ color: '#9ca3af', marginLeft: '4px', fontSize: '10px' }}>
                            (₹{bill.discountAmount.toFixed(2)})
                          </small>
                        )}
                      </span>
                    </td>
                    <td style={styles.td}>{formatCurrency(bill.tax)}</td>
                    <td style={styles.td}><strong>{formatCurrency(bill.total)}</strong></td>
                    <td style={styles.td}>
                      <div>{formatCurrency(bill.amountGiven || bill.paidAmount)}</div>
                      <small style={{ color: '#9ca3af', fontSize: '10px' }}>
                        Return: {formatCurrency(bill.balanceReturned || bill.changeAmount)}
                      </small>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        color: dueAmount > 0 ? '#f87171' : '#34d399',
                        fontWeight: '600'
                      }}>
                        {formatCurrency(dueAmount)}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <div style={{
                        ...styles.paymentBadge,
                        color: getPaymentColor(bill.paymentMethod),
                        border: `1px solid ${getPaymentColor(bill.paymentMethod)}30`
                      }}>
                        {getPaymentIcon(bill.paymentMethod)}
                        <span style={{ textTransform: 'capitalize' }}>{bill.paymentMethod}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <div style={{ fontSize: '11px' }}>
                        {bill.isClassicCustomer ? 'Classic' : 'Regular'} / {bill.counter || '-'}
                      </div>
                      <small style={{ color: '#9ca3af', fontSize: '10px' }}>
                        {bill.isSaleReturn ? 'SaleReturn ' : ''}{bill.isCardBill ? 'CardBill ' : ''}{bill.noRewards ? 'NoRewards' : ''}
                      </small>
                    </td>
                    <td style={styles.td}>
                      <button
                        style={{ ...styles.actionButton, backgroundColor: '#3b82f6', color: 'white', marginRight: '4px' }}
                        onClick={() => fetchBillDetails(bill.id)}
                        title="View Details (F8)"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#2563eb';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#3b82f6';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        style={{ ...styles.actionButton, backgroundColor: '#059669', color: 'white', marginRight: '4px' }}
                        onClick={() => handlePrintBill(bill)}
                        title="Print Bill (F9)"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#047857';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#059669';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        style={{
                          ...styles.whatsappButton,
                          opacity: whatsappStatus[bill.id] === 'sending' ? 0.7 : 1,
                          cursor: whatsappStatus[bill.id] === 'sending' ? 'wait' : 'pointer',
                          backgroundColor: whatsappStatus[bill.id] === 'sent' ? '#059669' : '#25D366'
                        }}
                        onClick={() => handleWhatsAppShare(bill)}
                        title="Share on WhatsApp (F10)"
                        disabled={whatsappStatus[bill.id] === 'sending'}
                        onMouseEnter={(e) => {
                          if (!whatsappStatus[bill.id]) {
                            e.currentTarget.style.backgroundColor = '#128C7E';
                            e.currentTarget.style.transform = 'scale(1.05)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!whatsappStatus[bill.id]) {
                            e.currentTarget.style.backgroundColor = '#25D366';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        {whatsappStatus[bill.id] === 'sending' ? (
                          <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : whatsappStatus[bill.id] === 'sent' ? (
                          <CheckCircle size={14} />
                        ) : (
                          <MessageCircle size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredBills.length > 0 && (
        <div style={styles.pagination}>
          <div style={styles.paginationInfo}>
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredBills.length)} of {filteredBills.length} BT bills
          </div>

          <div style={styles.paginationControls}>
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              style={{
                ...styles.pageButton,
                ...(currentPage === 1 ? styles.disabledButton : {})
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = '#2d3748';
                  e.currentTarget.style.borderColor = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                  e.currentTarget.style.borderColor = '#374151';
                }
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div style={styles.pageNumbers}>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      style={{
                        ...styles.pageButton,
                        ...(currentPage === pageNumber ? styles.activePageButton : {})
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== pageNumber) {
                          e.currentTarget.style.backgroundColor = '#2d3748';
                          e.currentTarget.style.borderColor = '#4b5563';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== pageNumber) {
                          e.currentTarget.style.backgroundColor = '#1f2937';
                          e.currentTarget.style.borderColor = '#374151';
                        }
                      }}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 3 ||
                  pageNumber === currentPage + 3
                ) {
                  return <span key={pageNumber} style={{ color: '#9ca3af', padding: '0 4px' }}>...</span>;
                }
                return null;
              })}
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              style={{
                ...styles.pageButton,
                ...(currentPage === totalPages ? styles.disabledButton : {})
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = '#2d3748';
                  e.currentTarget.style.borderColor = '#4b5563';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.backgroundColor = '#1f2937';
                  e.currentTarget.style.borderColor = '#374151';
                }
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {showBillModal && selectedBill && (
        <div style={styles.modal} onClick={() => setShowBillModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              style={styles.modalClose}
              onClick={() => setShowBillModal(false)}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f9fafb';
                e.currentTarget.style.backgroundColor = '#374151';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9ca3af';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <X size={20} />
            </button>

            <h2 style={styles.modalTitle}>
              <Receipt size={24} color="#6366f1" />
              Bill Details - {selectedBill.billNumber}
            </h2>

            <div style={styles.modalSection}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
                <div>
                  <p style={styles.modalText}>
                    <strong>Bill Number:</strong> {selectedBill.billNumber}
                  </p>
                  <p style={styles.modalText}>
                    <strong>Date:</strong> {new Date(selectedBill.createdAt).toLocaleDateString()}
                  </p>
                  <p style={styles.modalText}>
                    <strong>Time:</strong> {new Date(selectedBill.createdAt).toLocaleTimeString()}
                  </p>
                  <p style={styles.modalText}>
                    <strong>Customer Type:</strong>{' '}
                    <span style={{
                      color: getCustomerTypeColor(selectedBill.customerType),
                      fontWeight: '600'
                    }}>
                      {(selectedBill.customerType || 'external').toUpperCase()}
                    </span>
                  </p>
                </div>
                <div>
                  <p style={styles.modalText}>
                    <strong>Customer:</strong> {selectedBill.customerName || 'Walk-in Customer'}
                  </p>
                  {selectedBill.memberId && (
                    <p style={styles.modalText}>
                      <strong>Member ID:</strong> {selectedBill.memberId}
                    </p>
                  )}
                  {selectedBill.salesPerson && (
                    <p style={styles.modalText}>
                      <strong>Sales Person:</strong> {selectedBill.salesPerson}
                    </p>
                  )}
                  {selectedBill.counter && (
                    <p style={styles.modalText}>
                      <strong>Counter:</strong> {selectedBill.counter}
                    </p>
                  )}
                  {selectedBill.customerPhone && (
                    <p style={styles.modalText}>
                      <strong>Phone:</strong> {selectedBill.customerPhone}
                    </p>
                  )}
                  {selectedBill.customerEmail && (
                    <p style={styles.modalText}>
                      <strong>Email:</strong> {selectedBill.customerEmail}
                    </p>
                  )}
                </div>
              </div>

              {selectedBill.customerAddress && (
                <p style={styles.modalText}>
                  <strong>Address:</strong> {selectedBill.customerAddress}
                </p>
              )}
              {selectedBill.customerGst && (
                <p style={styles.modalText}>
                  <strong>GST:</strong> {selectedBill.customerGst}
                </p>
              )}
              <p style={styles.modalText}>
                <strong>Flags:</strong> {selectedBill.isClassicCustomer ? 'Classic Customer' : 'Regular'}
                {selectedBill.isSaleReturn ? ' | Sale Return' : ''}
                {selectedBill.isCardBill ? ' | Card Bill' : ''}
                {selectedBill.noRewards ? ' | No Rewards' : ''}
              </p>
              <p style={styles.modalText}><strong>Available Points:</strong> {(selectedBill.rewardPointsAvailable || 0).toFixed(2)}</p>
              <p style={styles.modalText}><strong>Redeemed Points:</strong> {(selectedBill.rewardPointsRedeemed || 0).toFixed(2)}</p>
              <p style={styles.modalText}><strong>Earned Points:</strong> {(selectedBill.rewardPointsEarned || 0).toFixed(2)}</p>
              <p style={styles.modalText}><strong>Remaining Points:</strong> {(selectedBill.rewardPointsBalance || 0).toFixed(2)}</p>
            </div>

            <h3 style={{ color: '#f9fafb', marginBottom: '10px', fontSize: '16px' }}>
              Items ({selectedBill.items?.length || 0})
            </h3>

            <table style={styles.modalTable}>
              <thead>
                <tr>
                  <th style={styles.modalTh}>Product Description</th>
                  <th style={styles.modalTh}>Unit</th>
                  <th style={styles.modalTh}>Price</th>
                  <th style={styles.modalTh}>Qty</th>
                  <th style={styles.modalTh}>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items && selectedBill.items.length > 0 ? (
                  selectedBill.items.map((item, index) => {
                    const productName = item.productName || item.product_name || 'Unknown';
                    const unit = item.unit || 'PCS';
                    const sellPrice = parseFloat(item.sellPrice || item.sell_price || 0);
                    const quantity = item.quantity || 0;
                    const total = parseFloat(item.total || 0);

                    return (
                      <tr key={index}>
                        <td style={styles.modalTd}>
                          <strong>{productName.substring(0, 30)}</strong>
                        </td>
                        <td style={styles.modalTd}>{unit}</td>
                        <td style={styles.modalTd}>₹{sellPrice.toFixed(2)}</td>
                        <td style={styles.modalTd}>{quantity}</td>
                        <td style={styles.modalTd}>₹{total.toFixed(2)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" style={{ ...styles.modalTd, textAlign: 'center', color: '#9ca3af' }}>
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {selectedBill.payments && selectedBill.payments.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <h4 style={{ color: '#f9fafb', marginBottom: '10px', fontSize: '14px' }}>Payment History</h4>
                <div style={{ backgroundColor: '#111827', borderRadius: '6px', padding: '10px' }}>
                  {selectedBill.payments.map((payment, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      borderBottom: index < selectedBill.payments.length - 1 ? '1px solid #374151' : 'none'
                    }}>
                      <span style={{ color: '#d1d5db', fontSize: '12px' }}>
                        {new Date(payment.createdAt).toLocaleTimeString()} - {payment.method?.toUpperCase()}
                      </span>
                      <span style={{ color: '#f9fafb', fontWeight: '500' }}>
                        ₹{payment.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={styles.modalFooter}>
              <button
                style={{ ...styles.actionButton, backgroundColor: '#059669', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}
                onClick={() => {
                  setShowBillModal(false);
                  handlePrintBill(selectedBill);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#047857';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Printer size={16} /> Print Bill (F9)
              </button>
              <button
                style={{ ...styles.actionButton, backgroundColor: '#25D366', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}
                onClick={() => {
                  setShowBillModal(false);
                  handleWhatsAppShare(selectedBill);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#128C7E';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#25D366';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                disabled={!selectedBill.customerPhone}
                title={!selectedBill.customerPhone ? "No phone number available" : "Share on WhatsApp (F10)"}
              >
                <MessageCircle size={16} /> WhatsApp (F10)
              </button>
              <button
                style={{ ...styles.actionButton, backgroundColor: '#374151', color: 'white', padding: '12px 20px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', borderRadius: '6px', fontSize: '14px', fontWeight: '500' }}
                onClick={() => setShowBillModal(false)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4b5563';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Close (Esc)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add keyframe animation for spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default VisitBillPage;