import React, { useEffect, useMemo, useState } from "react";
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
  const [rows, setRows] = useState([]);
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

  const [customers, setCustomers] = useState([]);
  const [availablePoints, setAvailablePoints] = useState(0);

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
        setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? normalized : row)));
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

    setRows((current) => current.map((row, rowIndex) => (
      rowIndex === index
        ? (() => {
          const updated = { ...row, [field]: numericFields.includes(field) ? value : value };

          if (field === "unitPrice" || field === "discountPercent") {
            const u = Number(updated.unitPrice) || 0;
            const d = Number(updated.discountPercent) || 0;
            updated.netPrice = money(u - (u * d / 100));
          }

          return updated;
        })()
        : row
    )));
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  };

  const totals = useMemo(() => {
    const totalItems = rows.length;
    const totalQuantity = rows.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
    const mrpTotal = rows.reduce((sum, row) => sum + (Number(row.mrp) || 0) * (Number(row.quantity) || 0), 0);
    const netBeforeDiscount = rows.reduce((sum, row) => {
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
        items: rows.map((row) => ({
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
    setRows([]);
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
    setBillNo(String(Math.floor(100 + Math.random() * 900)));
  };

  return (
    <div className="sale-page">
      <style>{saleStyles}</style>

      <div className="sale-window">
        <div className="sale-titlebar">
          <span>Sale</span>
          <span>-</span>
        </div>

        <div className="sale-header">
          <div className="header-left">
            <label>Date <input value={formatDate(now)} readOnly /></label>
            <label>Counter <select value={counter} onChange={(event) => setCounter(event.target.value)}><option>counter_1</option></select></label>
            <label>Bill_No <input value={billNo} onChange={(event) => setBillNo(event.target.value)} /></label>
            <label className="check"><input type="checkbox" checked={saleReturn} onChange={(event) => setSaleReturn(event.target.checked)} /> SALE RETURN</label>
            <label className="check"><input type="checkbox" checked={cardBill} onChange={(event) => setCardBill(event.target.checked)} /> CARD BILL</label>
            <label className="check"><input type="checkbox" checked={noRewards} onChange={(event) => setNoRewards(event.target.checked)} /> NO REWARDS</label>
          </div>

          <div className="customer-name">{loggedInUserName}</div>

          <div className="header-middle">
            <label className="check"><input type="checkbox" checked={classicCustomer} onChange={(event) => setClassicCustomer(event.target.checked)} /> Classic Customer</label>
            <label>Member ID <input value={memberId} onChange={(event) => setMemberId(event.target.value)} /></label>
            <label>Mobile Number
              <input list="customer-phones" value={mobileNumber} onChange={(event) => handleMobileChange(event.target.value)} />
            </label>
            <datalist id="customer-phones">
              {customers.map((c, idx) => (
                <option key={idx} value={c.phone}>{c.name}</option>
              ))}
            </datalist>
            <label>Sales Person
              <input list="sales-persons" value={salesPerson} onChange={(event) => setSalesPerson(event.target.value)} />
            </label>
            <datalist id="sales-persons">
              {[...new Set(products.map(p => p.salesPerson).filter(Boolean))].map((sp, idx) => (
                <option key={idx} value={sp} />
              ))}
            </datalist>
          </div>

          <div className="header-right">
            <div className="clock">{formatDateTime(now)}</div>
            <label>Name <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></label>
            <button type="button">Add New Member</button>
            <label>Address <textarea value={address} onChange={(event) => setAddress(event.target.value)} /></label>
            <div className="stock-row">
              <label>Stock In Store <input value={products.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)} readOnly /></label>
              <label>Godown Stock <input value="0" readOnly /></label>
            </div>
          </div>
        </div>

        {(message || error) && <div className={error ? "notice error" : "notice"}>{error || message}</div>}

        <div className="quick-add no-print">
          <input
            placeholder="Enter Product_Id or Product_Description and press Enter"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                addByQuery(event.currentTarget.value);
                event.currentTarget.value = "";
              }
            }}
          />
          <button type="button" onClick={saveBill} disabled={loading}>{loading ? "Saving..." : "Save Bill"}</button>
          <button type="button" className="printer" onClick={printBill} disabled={loading}>Print</button>
          <button type="button" onClick={clearBill}>Clear</button>
        </div>

        <div className="grid-wrap">
          <table className="sale-grid">
            <thead>
              <tr>
                <th>Product_Id</th>
                <th>Product_Description</th>
                <th>Size</th>
                <th>Tax</th>
                <th>Unit</th>
                <th>MRP</th>
                <th>Unit_Price</th>
                <th>Dis %</th>
                <th>NetPrice</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>SalesPerson</th>
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
                    <td>{amount}</td>
                    <td>
                      <input value={row.salesPerson || ""} onChange={(event) => updateRow(index, "salesPerson", event.target.value)} />
                      <button type="button" className="row-delete no-print" onClick={() => removeRow(index)}>x</button>
                    </td>
                  </tr>
                );
              })}

              {blankRows.map((item) => (
                <tr key={`empty-${item}`} className="empty-row">
                  <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="footer-panel">
          <div className="totals-left">
            <div className="small-total"><span>TOTAL ITEMS</span><strong>{totals.totalItems}</strong></div>
            <div className="small-total"><span>TOTAL QUANTITY</span><strong>{totals.totalQuantity}</strong></div>
            <div className="payment-mode">
              <b>Payment Mode</b>
              <fieldset>
                <legend>Card Details [Ctrl+C]</legend>
                <label>Amount <input value={cardAmount} onChange={(event) => setCardAmount(event.target.value)} /></label>
                <label>Card Number <input value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} /></label>
              </fieldset>
            </div>
            <div className="price-strip">
              <span>MRP</span><strong>{Math.round(totals.mrpTotal)}</strong>
              <span>UNIT<br />PRICE</span><strong>{Math.round(totals.billValue)}</strong>
            </div>
          </div>

          <div className="discount-panel">
            <div className="small-total"><span>MRP DISCOUNT</span><strong>{Math.round(totals.mrpDiscount)}</strong></div>
            <div className="small-total"><span>UNIT DISCOUNT</span><strong>{Math.round(totals.unitDiscount)}</strong></div>
          </div>

          <div className="amount-entry">
            <label>SaleReturn Amount <input value={saleReturn ? totals.billValue : 0} readOnly /></label>
            <label>UPI Amount [Alt+C] <input value={upiAmount} onChange={(event) => setUpiAmount(event.target.value)} /></label>
          </div>

          <div className="reward-entry">
            <b>Reward Details</b>
            <label>Available <input value={availablePoints} readOnly /></label>
            <label>To Redeem <input readOnly /></label>
            <label>Amount <input readOnly /></label>
            <label>Balance <input value={availablePoints} readOnly /></label>
          </div>

          <div className="payment-details">
            <b>Payment Details</b>
            <label>Bill Amount <input value={totals.billValue} readOnly /></label>
            <label>Discount(%) <input value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} /></label>
            <label>DiscountAmt <input value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></label>
            <label>Amount Paid <input value={totals.amountPaid} readOnly /></label>
            <label>Paid Before <input value={paidBefore} onChange={(event) => setPaidBefore(event.target.value)} /></label>
            <label>Cash Received <input value={cashReceived} onChange={(event) => setCashReceived(event.target.value)} /></label>
            <button type="button" className="printer" onClick={printBill}>Print</button>
          </div>

          <div className="pay-board">
            <label>TOTAL BILL VALUE <strong>{Math.round(totals.billValue)}</strong></label>
            <label>AMOUNT TO PAY <strong>{Math.round(totals.amountToPay)}</strong></label>
            <label>AMOUNT TO RETURN <strong>{String(Math.round(totals.amountToReturn)).padStart(3, "0")}</strong></label>
          </div>
        </div>
      </div>

      {/* ── Print-Only Thermal Receipt ── */}
      <div className="print-only">

        <div className="receipt-header">
          {/* ── LOGO: replaced SVG with actual /Dc-logo.jpg ── */}
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
            {rows.map((row, index) => {
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

  .sale-window {
    background: #96ceca;
    border: 1px solid #6faaa5;
    box-shadow: 0 8px 26px rgba(0, 0, 0, 0.35);
    min-width: 980px;
    overflow: hidden;
  }

  .sale-titlebar {
    height: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 8px;
    background: #f2f2f2;
    border-bottom: 1px solid #b9b9b9;
    font-size: 12px;
  }

  .sale-header {
    display: grid;
    grid-template-columns: 1.2fr 170px 1fr 1.25fr;
    gap: 14px;
    padding: 10px 12px 8px;
    font-size: 12px;
    font-weight: 700;
  }

  .sale-header label,
  .payment-details label,
  .amount-entry label,
  .payment-mode label,
  .pay-board label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 7px;
  }

  .sale-header input,
  .sale-header select,
  .sale-header textarea,
  .payment-details input,
  .amount-entry input,
  .payment-mode input,
  .quick-add input {
    height: 22px;
    border: 1px solid #8f8f8f;
    background: #fff;
    padding: 2px 5px;
    font: inherit;
  }

  .sale-header textarea {
    height: 42px;
    width: 210px;
    resize: none;
  }

  .check {
    display: inline-flex !important;
    margin-right: 10px;
  }

  .check input {
    width: 13px;
    height: 13px;
  }

  .customer-name,
  .clock,
  .sale-header button {
    background: #111;
    color: #fff;
    border: 1px solid #777;
    font-weight: 800;
    height: max-content;
    padding: 3px 9px;
    text-align: center;
  }

  .clock {
    margin-bottom: 7px;
    margin-left: auto;
  }

  .stock-row {
    display: flex;
    gap: 10px;
  }

  .stock-row input {
    width: 70px;
  }

  .notice {
    margin: 0 10px 7px;
    padding: 6px 10px;
    background: #dff6dd;
    border: 1px solid #63a55c;
    font-weight: 700;
    font-size: 12px;
  }

  .notice.error {
    background: #ffe0e0;
    border-color: #c75151;
  }

  .quick-add {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    gap: 8px;
    padding: 0 10px 7px;
  }

  .quick-add button,
  .printer {
    border: 1px solid #444;
    background: #111;
    color: #fff;
    font-weight: 700;
    padding: 4px 12px;
    cursor: pointer;
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
    font-size: 13px;
  }

  .sale-grid th:nth-child(1),
  .sale-grid td:nth-child(1) { width: 105px; min-width: 105px; }

  .sale-grid th:nth-child(2),
  .sale-grid td:nth-child(2) { width: 230px; min-width: 230px; }

  .sale-grid th:nth-child(3),
  .sale-grid td:nth-child(3) { width: 90px; min-width: 90px; }

  .sale-grid th:nth-child(4),
  .sale-grid td:nth-child(4) { width: 70px; min-width: 70px; }

  .sale-grid th:nth-child(5),
  .sale-grid td:nth-child(5) { width: 80px; min-width: 80px; }

  .sale-grid th:nth-child(6),
  .sale-grid td:nth-child(6),
  .sale-grid th:nth-child(7),
  .sale-grid td:nth-child(7),
  .sale-grid th:nth-child(8),
  .sale-grid td:nth-child(8),
  .sale-grid th:nth-child(9),
  .sale-grid td:nth-child(9),
  .sale-grid th:nth-child(10),
  .sale-grid td:nth-child(10),
  .sale-grid th:nth-child(11),
  .sale-grid td:nth-child(11) { width: 105px; min-width: 105px; }

  .sale-grid th:nth-child(12),
  .sale-grid td:nth-child(12) { width: 120px; min-width: 120px; }

  .sale-grid th {
    background: #fff;
    border-right: 1px solid #c8c8c8;
    border-bottom: 1px solid #a5a5a5;
    padding: 5px 4px;
    font-size: 15px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: clip;
  }

  .sale-grid td {
    border-right: 1px solid #c8c8c8;
    border-bottom: 1px solid #d2d2d2;
    height: 22px;
    padding: 0 3px;
  }

  .sale-grid tbody tr:nth-child(even) {
    background: #86c5bf;
  }

  .sale-grid input {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
    outline: none;
  }

  .row-delete {
    background: #111;
    color: #fff;
    border: 0;
    width: 20px;
    height: 18px;
    cursor: pointer;
  }

  .footer-panel {
    display: grid;
    grid-template-columns: 1.25fr 1fr 1.1fr 1.1fr 1.2fr 1fr;
    gap: 16px;
    padding: 8px 12px 10px;
    font-size: 12px;
    font-weight: 800;
  }

  .small-total {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 10px;
    margin-bottom: 13px;
  }

  .small-total strong,
  .price-strip strong,
  .pay-board strong {
    background: #020202;
    color: #fff;
    display: inline-block;
    min-width: 28px;
    padding: 3px 7px;
    font-size: 20px;
    text-align: center;
  }

  .payment-mode fieldset {
    border: 1px solid rgba(255, 255, 255, 0.35);
    padding: 8px;
  }

  .payment-mode input {
    width: 110px;
  }

  .price-strip {
    display: grid;
    grid-template-columns: auto auto auto auto;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    font-size: 20px;
  }

  .amount-entry input,
  .reward-entry input,
  .payment-details input {
    width: 100px;
    margin-left: auto;
  }

  .payment-details,
  .reward-entry {
    border: 1px solid rgba(255, 255, 255, 0.35);
    padding: 5px 12px;
  }

  .reward-entry label,
  .amount-entry label,
  .payment-details label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    white-space: nowrap;
  }

  .printer {
    width: 85px;
    height: 54px;
    margin: 8px auto 0;
    display: block;
    border-radius: 2px;
  }

  .pay-board {
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .pay-board label {
    display: grid;
    gap: 4px;
  }

  .pay-board strong {
    width: 96px;
    min-height: 48px;
    font-size: 42px;
    line-height: 48px;
  }

  @media (max-width: 1200px) {
    .sale-window {
      min-width: 900px;
    }
  }

  /* ── Hide receipt on screen ── */
  .print-only { display: none; }

  /* ════════════════════════════════════════
     PRINT STYLES — 80mm thermal receipt
  ════════════════════════════════════════ */
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

    /* ── Logo ── */
    .receipt-logo {
      display: flex;
      justify-content: center;
      margin-bottom: 5px;
    }
    .receipt-logo-img {
      width: 62px;
      height: 62px;
      object-fit: contain;
    }

    /* ── Shop header ── */
    .receipt-header {
      text-align: center;
      margin-bottom: 4px;
    }
    .receipt-shop {
      font-size: 15px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin: 3px 0 2px;
    }
    .receipt-tagline {
      font-size: 9px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #555;
      margin-bottom: 4px;
    }
    .receipt-divider-thin {
      border: none;
      border-top: 1px solid #000;
      margin: 4px 10% 5px;
    }
    .receipt-addr {
      font-size: 10.5px;
      margin: 1.5px 0;
      line-height: 1.45;
    }

    /* ── Dashed divider ── */
    .receipt-dash {
      border: none;
      border-top: 1px dashed #000;
      margin: 5px 0;
    }

    /* ── Bill meta ── */
    .receipt-meta { font-size: 10.5px; }
    .receipt-meta-row {
      display: flex;
      justify-content: space-between;
      margin: 2.5px 0;
    }

    /* ── Items table ── */
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin: 3px 0;
    }
    .receipt-table thead tr { border-bottom: 1px dashed #000; }
    .receipt-table th {
      padding: 3px 2px 4px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .receipt-table td { padding: 3px 2px; vertical-align: top; }
    .r-desc { text-align: left; width: 52%; }
    .r-num  { text-align: right; }

    /* ── Pay Amount ── */
    .receipt-pay {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 5px 2px;
    }
    .receipt-pay-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .receipt-pay-value {
      font-size: 15px;
      font-weight: 900;
    }

    /* ── Summary rows ── */
    .receipt-summary, .receipt-points {
      font-size: 10.5px;
      margin: 3px 0;
    }
    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin: 2.5px 0;
    }
    .receipt-savings {
      font-weight: 700;
    }

    /* ── Customer ── */
    .receipt-customer { font-size: 10.5px; margin: 3px 0; }
    .receipt-cust-title {
      font-weight: 700;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 3px;
    }
    .receipt-cust-name { font-weight: 700; }
    .receipt-cust-phone { color: #333; }

    /* ── Thank you ── */
    .receipt-thankyou {
      text-align: center;
      font-size: 11px;
      font-weight: 700;
      margin: 6px 0 2px;
    }
    .receipt-visit {
      text-align: center;
      font-size: 10px;
      color: #444;
      margin-bottom: 6px;
    }

    /* ── QR codes ── */
    .receipt-qr {
      display: flex;
      justify-content: space-around;
      margin-top: 6px;
      text-align: center;
    }
    .receipt-qr-item { display: flex; flex-direction: column; align-items: center; }
    .receipt-qr-lbl {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .receipt-qr img { width: 52px; height: 52px; }
  }
`;