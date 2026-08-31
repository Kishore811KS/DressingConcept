// ServiceBillView.jsx
import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Calendar,
  User,
  Phone,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Wrench
} from 'lucide-react';
import axios from 'axios';

const BASE_URL = 'http://localhost:5000';
const API_BASE_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const ServiceBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    customer_name: '',
    from_date: '',
    to_date: '',
    page: 1,
    bill_number: 'HPS'
  });
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 1,
    current_page: 1,
  });
  const [selectedBill, setSelectedBill] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [dialogLoading, setDialogLoading] = useState(false);

  useEffect(() => {
    fetchBills();
  }, [filters.page]);

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', filters.page);
      params.append('per_page', '10');

      if (filters.customer_name) {
        params.append('customer_name', filters.customer_name);
      }
      if (filters.from_date) {
        params.append('from_date', filters.from_date);
      }
      if (filters.to_date) {
        params.append('to_date', filters.to_date);
      }
      params.append('bill_number', 'HPS');

      const response = await api.get(`/service-bills?${params.toString()}`);

      if (response.data) {
        const hpsBills = (response.data.bills || []).filter(bill =>
          bill.billNumber && bill.billNumber.startsWith('HPS')
        );

        setBills(hpsBills);
        setPagination({
          total: hpsBills.length,
          pages: Math.ceil(hpsBills.length / 10) || 1,
          current_page: response.data.current_page || 1,
        });
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError(err.response?.data?.error || 'Failed to fetch service bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetails = async (billId) => {
    setDialogLoading(true);
    try {
      const response = await api.get(`/service-bills/${billId}`);
      if (response.data) {
        setSelectedBill(response.data);
        setOpenDialog(true);
      }
    } catch (err) {
      console.error('Error fetching bill details:', err);
      setError(err.response?.data?.error || 'Failed to fetch bill details');
    } finally {
      setDialogLoading(false);
    }
  };

  const fetchServiceItems = async (billId) => {
    try {
      const response = await api.get(`/bills/${billId}/service-items`);
      return response.data || [];
    } catch (err) {
      console.error('Error fetching service items:', err);
      return [];
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1,
    }));
  };

  const handleSearch = () => {
    fetchBills();
  };

  const handleReset = () => {
    setFilters({
      customer_name: '',
      from_date: '',
      to_date: '',
      page: 1,
      bill_number: 'HPS',
    });
    setTimeout(() => fetchBills(), 0);
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const toggleRowExpand = (billId) => {
    setExpandedRows(prev => ({
      ...prev,
      [billId]: !prev[billId]
    }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'paid') {
      return (
        <span style={{
          background: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase'
        }}>
          PAID
        </span>
      );
    } else if (s === 'partial') {
      return (
        <span style={{
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase'
        }}>
          PARTIAL
        </span>
      );
    }
    return (
      <span style={{
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#f87171',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '700',
        textTransform: 'uppercase'
      }}>
        PENDING
      </span>
    );
  };

  const Row = ({ bill }) => {
    const [items, setItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const isExpanded = Boolean(expandedRows[bill.id]);

    useEffect(() => {
      const loadItems = async () => {
        if (isExpanded && items.length === 0) {
          setLoadingItems(true);
          const data = await fetchServiceItems(bill.id);
          setItems(data);
          setLoadingItems(false);
        }
      };
      if (isExpanded) {
        loadItems();
      }
    }, [isExpanded, bill.id, items.length]);

    return (
      <React.Fragment>
        <tr style={{
          borderBottom: isExpanded ? 'none' : '1px solid #334155',
          background: isExpanded ? '#0f172a' : 'transparent',
          transition: 'background 0.15s ease'
        }}>
          <td style={{ padding: '12px 14px', textAlign: 'center', width: '40px' }}>
            <button
              onClick={() => toggleRowExpand(bill.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px',
                transition: 'color 0.2s'
              }}
              title="Expand Service Items"
            >
              {isExpanded ? <ChevronUp size={16} color="#38bdf8" /> : <ChevronDown size={16} />}
            </button>
          </td>
          <td style={{ padding: '12px 14px', fontWeight: '700', color: '#38bdf8', fontSize: '13px' }}>
            {bill.billNumber}
          </td>
          <td style={{ padding: '12px 14px', color: '#f8fafc', fontWeight: '600', fontSize: '13px' }}>
            {bill.customerName || 'Walk-in Customer'}
          </td>
          <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '13px' }}>
            {bill.customerPhone || '-'}
          </td>
          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#f8fafc', fontSize: '13px' }}>
            {formatCurrency(bill.total)}
          </td>
          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: '700', color: '#34d399', fontSize: '13px' }}>
            {formatCurrency(bill.paidAmount)}
          </td>
          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
            {getStatusBadge(bill.paymentStatus)}
          </td>
          <td style={{ padding: '12px 14px', color: '#94a3b8', fontSize: '13px' }}>
            {formatDate(bill.createdAt)}
          </td>
          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <button
                onClick={() => fetchBillDetails(bill.id)}
                style={{
                  background: 'rgba(2, 132, 199, 0.15)',
                  border: '1px solid rgba(2, 132, 199, 0.3)',
                  color: '#38bdf8',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                title="View Bill Details"
              >
                <Eye size={14} /> View
              </button>
            </div>
          </td>
        </tr>

        {isExpanded && (
          <tr style={{ background: '#0b1329', borderBottom: '1px solid #334155' }}>
            <td colSpan={9} style={{ padding: '16px 20px' }}>
              <div style={{
                background: '#1e293b',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #334155'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Wrench size={16} color="#38bdf8" />
                  <span style={{ fontWeight: '700', color: '#f8fafc', fontSize: '13px' }}>Service Items</span>
                </div>

                {loadingItems ? (
                  <div style={{ textAlign: 'center', padding: '15px', color: '#94a3b8', fontSize: '12px' }}>
                    Loading service items...
                  </div>
                ) : items.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Service Name</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left' }}>Description</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Price</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Quantity</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>GST %</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>GST Amount</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #33415540', color: '#f8fafc' }}>
                            <td style={{ padding: '8px 10px', fontWeight: '600' }}>{item.serviceName}</td>
                            <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{item.serviceDescription || '-'}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#38bdf8' }}>{formatCurrency(item.price)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{item.quantity}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', color: '#f87171' }}>{item.gstRate}%</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>{formatCurrency(item.gstAmount)}</td>
                            <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: '700', color: '#34d399' }}>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '15px', color: '#64748b', fontSize: '12px' }}>
                    No service items recorded for this bill.
                  </div>
                )}
              </div>
            </td>
          </tr>
        )}
      </React.Fragment>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b1329',
      color: '#f8fafc',
      padding: '24px',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* Header & Filter Card */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              padding: '10px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
            }}>
              <FileText size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: '#f8fafc' }}>
                Service Bills (HPS Records)
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Manage, search, and view historical service invoices
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: 'rgba(2, 132, 199, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(2, 132, 199, 0.3)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Receipt size={14} /> HPS Service Bills
            </span>
            <button
              onClick={fetchBills}
              disabled={loading}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                padding: '8px 14px',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.2s'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          alignItems: 'flex-end'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
              Customer Name
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search by customer name..."
                value={filters.customer_name}
                onChange={(e) => handleFilterChange('customer_name', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
              From Date
            </label>
            <input
              type="date"
              value={filters.from_date}
              onChange={(e) => handleFilterChange('from_date', e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>
              To Date
            </label>
            <input
              type="date"
              value={filters.to_date}
              onChange={(e) => handleFilterChange('to_date', e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#ffffff',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSearch}
              disabled={loading}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(2,132,199,0.3)'
              }}
            >
              <Search size={15} /> Search
            </button>
            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                background: '#334155',
                color: '#f8fafc',
                border: '1px solid #475569',
                padding: '10px 14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Main Table */}
      <div style={{
        background: '#1e293b',
        borderRadius: '12px',
        border: '1px solid #334155',
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '14px', width: '40px' }}></th>
                <th style={{ padding: '14px', textAlign: 'left' }}>Bill Number</th>
                <th style={{ padding: '14px', textAlign: 'left' }}>Customer Name</th>
                <th style={{ padding: '14px', textAlign: 'left' }}>Phone</th>
                <th style={{ padding: '14px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '14px', textAlign: 'right' }}>Paid</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '14px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '14px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                    <div>Loading service bills...</div>
                  </td>
                </tr>
              ) : bills.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <FileText size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>No HPS service bills found</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search criteria</div>
                  </td>
                </tr>
              ) : (
                bills.map(bill => <Row key={bill.id} bill={bill} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 20px',
            borderTop: '1px solid #334155',
            background: '#0f172a',
            fontSize: '13px'
          }}>
            <span style={{ color: '#94a3b8' }}>
              Showing {bills.length} of {pagination.total} records
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                disabled={filters.page === 1 || loading}
                onClick={() => handlePageChange(filters.page - 1)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: filters.page === 1 ? 'not-allowed' : 'pointer',
                  opacity: filters.page === 1 ? 0.5 : 1
                }}
              >
                Previous
              </button>
              <span style={{ color: '#38bdf8', fontWeight: '700' }}>
                Page {filters.page} of {pagination.pages}
              </span>
              <button
                disabled={filters.page === pagination.pages || loading}
                onClick={() => handlePageChange(filters.page + 1)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: filters.page === pagination.pages ? 'not-allowed' : 'pointer',
                  opacity: filters.page === pagination.pages ? 0.5 : 1
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bill Details Modal */}
      {openDialog && selectedBill && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '14px',
            border: '1px solid #334155',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.75)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #334155',
              background: '#0f172a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Receipt size={20} color="#38bdf8" />
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: '700' }}>
                  Bill Details — <span style={{ color: '#38bdf8' }}>{selectedBill.bill?.billNumber}</span>
                </h3>
              </div>
              <button
                onClick={() => setOpenDialog(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              {dialogLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
                  <div>Loading details...</div>
                </div>
              ) : (
                <>
                  {/* Customer Info Card */}
                  <div style={{
                    background: '#0f172a',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#38bdf8', fontWeight: '700' }}>
                      Customer Information
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Name:</span> <strong style={{ color: '#f8fafc' }}>{selectedBill.bill?.customerName || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Phone:</span> <strong style={{ color: '#f8fafc' }}>{selectedBill.bill?.customerPhone || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Email:</span> <strong style={{ color: '#f8fafc' }}>{selectedBill.bill?.customerEmail || 'N/A'}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94a3b8' }}>GST:</span> <strong style={{ color: '#f8fafc' }}>{selectedBill.bill?.customerGST || 'N/A'}</strong>
                      </div>
                      {selectedBill.bill?.customerAddress && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <span style={{ color: '#94a3b8' }}>Address:</span> <strong style={{ color: '#f8fafc' }}>{selectedBill.bill.customerAddress}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Service Items Table */}
                  <div style={{
                    background: '#0f172a',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    padding: '16px',
                    marginBottom: '16px'
                  }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#38bdf8', fontWeight: '700' }}>
                      Service Items ({selectedBill.items?.length || 0})
                    </h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: '#1e293b', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Service</th>
                            <th style={{ padding: '8px', textAlign: 'left' }}>Description</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>GST %</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>GST Amt</th>
                            <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBill.items && selectedBill.items.length > 0 ? (
                            selectedBill.items.map(item => (
                              <tr key={item.id} style={{ borderBottom: '1px solid #33415540', color: '#f8fafc' }}>
                                <td style={{ padding: '8px', fontWeight: '600' }}>{item.serviceName}</td>
                                <td style={{ padding: '8px', color: '#94a3b8' }}>{item.serviceDescription || '-'}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#38bdf8' }}>{formatCurrency(item.price)}</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{item.quantity}</td>
                                <td style={{ padding: '8px', textAlign: 'right', color: '#f87171' }}>{item.gstRate}%</td>
                                <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(item.gstAmount)}</td>
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: '700', color: '#34d399' }}>{formatCurrency(item.total)}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} style={{ padding: '15px', textAlign: 'center', color: '#64748b' }}>
                                No items found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Summary Breakdown */}
                  <div style={{
                    background: '#0f172a',
                    borderRadius: '10px',
                    border: '1px solid #334155',
                    padding: '16px'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                      <div style={{ color: '#94a3b8' }}>Subtotal:</div>
                      <div style={{ textAlign: 'right', color: '#f8fafc', fontWeight: '600' }}>{formatCurrency(selectedBill.bill?.subtotal)}</div>

                      <div style={{ color: '#94a3b8' }}>Tax (GST):</div>
                      <div style={{ textAlign: 'right', color: '#f87171', fontWeight: '600' }}>+{formatCurrency(selectedBill.bill?.tax)}</div>

                      <div style={{ color: '#94a3b8' }}>Discount:</div>
                      <div style={{ textAlign: 'right', color: '#34d399', fontWeight: '600' }}>
                        -{formatCurrency(selectedBill.bill?.discount)}
                        {selectedBill.bill?.discountType && ` (${selectedBill.bill.discountType})`}
                      </div>

                      <div style={{ color: '#f8fafc', fontWeight: '800', borderTop: '1px solid #334155', paddingTop: '8px', fontSize: '15px' }}>Total Amount:</div>
                      <div style={{ textAlign: 'right', color: '#38bdf8', fontWeight: '800', borderTop: '1px solid #334155', paddingTop: '8px', fontSize: '15px' }}>
                        {formatCurrency(selectedBill.bill?.total)}
                      </div>

                      <div style={{ color: '#94a3b8', marginTop: '6px' }}>Paid Amount:</div>
                      <div style={{ textAlign: 'right', color: '#34d399', fontWeight: '700', marginTop: '6px' }}>{formatCurrency(selectedBill.bill?.paidAmount)}</div>

                      <div style={{ color: '#94a3b8' }}>Due Amount:</div>
                      <div style={{ textAlign: 'right', color: '#f87171', fontWeight: '700' }}>
                        {formatCurrency(Math.max(0, (selectedBill.bill?.total || 0) - (selectedBill.bill?.paidAmount || 0)))}
                      </div>

                      <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        {getStatusBadge(selectedBill.bill?.paymentStatus)}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #334155',
              background: '#0f172a',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px'
            }}>
              <button
                onClick={() => setOpenDialog(false)}
                style={{
                  background: '#334155',
                  color: '#f8fafc',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
              <button
                onClick={() => window.open(`${BASE_URL}/api/service-bills/${selectedBill.bill?.id}/pdf`, '_blank')}
                disabled={!selectedBill.bill?.id}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                }}
              >
                <Download size={15} /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceBills;
