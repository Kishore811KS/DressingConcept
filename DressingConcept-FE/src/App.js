import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Login from "./Login";
import Dashboard from "./components/Dashboard";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import AdminProduct from "./components/AdminProduct";
import EmployeeProduct from "./components/EmployeeProduct";
import Bill from "./components/Bill";
import VisitBillPage from "./components/VisitPage";
import SupplierPage from "./components/Supplier";
import SupplierDuplicatePage from "./components/SupplierList";
import ItemsPage from "./components/SuppliedItemLIst";
import Type from "./components/Type";
import LowStock from "./components/Lowstock";
import StockOut from "./components/StockOut";
import Quotation from "./components/Quotation";
import Invoice from "./components/Invoice";
import Service from "./components/ServiceBill";
import ServiceBillView from "./components/ServiceBillView";
import UserType from "./components/UserType";
import Employee from "./components/Employee";
import Attendance from "./components/Attendance";
import Salary from "./components/Salary";
import UserSettings from "./components/UserSetting";
import DiscountPage from "./components/DiscountPage";
import CurrentCompany from "./components/CurrentCompany";
import EnquiryPage from "./components/Enquiry";
import CustomerPage from "./components/Customer";
import EmployeeBill from "./components/EmployeeBill";
import Warranty from "./components/Warranty";
import PaymentTracking from "./components/PaymentTracking";
import GlobalShortcutsModal from "./components/GlobalShortcutsModal";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts";

// Component to handle keyboard shortcuts globally
const KeyboardShortcutsInitializer = () => {
  useKeyboardShortcuts();
  return null;
};

function Layout() {
  const location = useLocation();

  const isBillPage = location.pathname.toLowerCase() === "/bill";
  // Hide layout on login page or bill page
  const hideLayout = location.pathname === "/" || isBillPage;

  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen((prev) => !prev);
  };

  const contentStyle = {
    marginLeft: hideLayout ? "0" : isOpen ? "220px" : "70px",
    padding: hideLayout ? "0" : "80px 20px 20px 20px",
    minHeight: "100vh",
    height: isBillPage ? "100vh" : "auto",
    width: isBillPage ? "100vw" : "auto",
    background: isBillPage ? "#111" : "#0f172a",
    transition: "all 0.3s ease",
    overflow: isBillPage ? "hidden" : "visible",
  };

  return (
    <>
      {/* Initialize keyboard shortcuts globally */}
      {location.pathname !== "/" && <KeyboardShortcutsInitializer />}

      {!hideLayout && <Sidebar isOpen={isOpen} />}

      <div style={contentStyle}>
        {!hideLayout && (
          <Header
            toggleSidebar={toggleSidebar}
            isOpen={isOpen}
          />
        )}

        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin-product" element={<AdminProduct />} />
          <Route path="/employee-product" element={<EmployeeProduct />} />
          <Route path="/bill" element={<Bill />} />
          <Route path="/Bill" element={<Bill />} />
          <Route path="/billreport" element={<VisitBillPage />} />
          <Route path="/supplier" element={<SupplierPage />} />
          <Route path="/supplierList" element={<SupplierDuplicatePage />} />
          <Route path="/itemlist" element={<ItemsPage />} />
          <Route path="/type" element={<Type />} />
          <Route path="/lowstock" element={<LowStock />} />
          <Route path="/stockout" element={<StockOut />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/service" element={<Service />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/salary" element={<Salary />} />
          <Route path="/userSettings" element={<UserSettings />} />
          <Route path="/discount" element={<DiscountPage />} />
          <Route path="/Company" element={<CurrentCompany />} />
          <Route path="/enquiry" element={<EnquiryPage />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/employeebill" element={<EmployeeBill />} />
          <Route path="/employee" element={<Employee />} />
          <Route path="/usertype" element={<UserType />} />
          <Route path="/serviceBillView" element={<ServiceBillView />} />
          <Route path="/warranty" element={<Warranty />} />
          <Route path="/paymenttracking" element={<PaymentTracking />} />
        </Routes>
      </div>

      {/* Global Shortcuts Modal */}
      {location.pathname !== "/" && <GlobalShortcutsModal />}
    </>
  );
}

function App() {
  return (
    <Router>
      <Layout />
    </Router>
  );
}

export default App;
