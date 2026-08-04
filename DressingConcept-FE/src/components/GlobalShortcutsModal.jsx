// src/components/GlobalShortcutsModal.js
import React, { useState, useEffect } from 'react';
import { FaKeyboard, FaTimes } from 'react-icons/fa';

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

const GlobalShortcutsModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleToggle = () => setIsOpen(prev => !prev);
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('toggleShortcuts', handleToggle);
        window.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('toggleShortcuts', handleToggle);
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const shortcutCategories = [
        {
            title: "🎯 Main Navigation",
            shortcuts: [
                { keys: "D", description: "Dashboard" }
            ]
        },
        {
            title: "📦 Inventory Management",
            shortcuts: [
                { keys: "P", description: "Admin Products" },
                { keys: "EP", description: "Employee Products" },
                { keys: "C", description: "Category" },
                { keys: "SI", description: "Stock In" },
                { keys: "SO", description: "Stock Out" },
                { keys: "L", description: "Low Stock" }
            ]
        },
        {
            title: "🛡️ Warranty",
            shortcuts: [
                { keys: "W", description: "Warranty" }
            ]
        },
        {
            title: "💰 Billing Navigation",
            shortcuts: [
                { keys: "B", description: "Create Bill Page" },
                { keys: "BR", description: "Bill Reports" },
                { keys: "SV", description: "Service Bill" },
                { keys: "SB", description: "Service Bills" },
                { keys: "SE", description: "Sales Bill (Employee)" },
                { keys: "Q", description: "Quotations" },
                { keys: "DI", description: "Discount" }
            ]
        },
        {
            title: "🧾 Bill Page Controls & Shortcuts",
            shortcuts: [
                { keys: "INSERT", description: "Quick Add Product" },
                { keys: "F6", description: "Focus Cash Received" },
                { keys: "F7", description: "Focus Member ID" },
                { keys: "F8 / ALT+O", description: "Focus Online Payment Amount" },
                { keys: "F9 / ALT+C", description: "Focus Card Payment Amount" },
                { keys: "ALT+1", description: "Toggle Sale Return Mode" },
                { keys: "ALT+3 / ALT+P", description: "Open Points Redemption Popup" },
                { keys: "ALT+4", description: "Toggle Classic Mode" },
                { keys: "ALT+U", description: "Focus UPI Amount" },
                { keys: "ALT+D", description: "Focus Discount %" },
                { keys: "ALT+A", description: "Focus Discount Amount" },
                { keys: "CTRL+S", description: "Save Bill" },
                { keys: "CTRL+P", description: "Print Bill" },
                { keys: "CTRL+N", description: "Reset / New Bill" },
                { keys: "DELETE", description: "Remove Last Added Item" }
            ]
        },
        {
            title: "👥 Suppliers & HR",
            shortcuts: [
                { keys: "AS", description: "Add Supplier" },
                { keys: "SL", description: "Supplier List" },
                { keys: "PT", description: "Payment Tracking" },
                { keys: "E", description: "Employee" },
                { keys: "UT", description: "User Type" },
                { keys: "A", description: "Attendance" },
                { keys: "SA", description: "Salary" },
                { keys: "CO", description: "Company" }
            ]
        },
        {
            title: "🤝 CRM",
            shortcuts: [
                { keys: "EN", description: "Enquiries" },
                { keys: "CU", description: "Customer Details" },
                { keys: "US", description: "User Settings" }
            ]
        },
        {
            title: "⌨️ General",
            shortcuts: [
                { keys: "ALT / ALT+ENTER", description: "Restore / Toggle Full-Screen" },
                { keys: "F11", description: "Toggle Full-Screen" },
                { keys: "?", description: "Show/Hide this menu" },
                { keys: "ESC", description: "Close this menu / Exit Full-Screen" }
            ]
        }
    ];

    const styles = {
        overlay: {
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            animation: "fadeIn 0.2s ease",
        },
        modal: {
            backgroundColor: "rgba(18, 18, 18, 0.95)",
            backdropFilter: "blur(10px)",
            borderRadius: "20px",
            padding: "28px",
            maxWidth: "850px",
            width: "90%",
            maxHeight: "85vh",
            overflowY: "auto",
            border: "1px solid rgba(77, 166, 255, 0.3)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            animation: "slideUp 0.3s ease",
        },
        header: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
        },
        title: {
            fontSize: "26px",
            fontWeight: "700",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: "12px",
        },
        closeButton: {
            background: "rgba(255,255,255,0.1)",
            border: "none",
            color: "#9ca3af",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
        },
        category: {
            marginBottom: "28px",
        },
        categoryTitle: {
            fontSize: "16px",
            fontWeight: "600",
            color: "#4da6ff",
            marginBottom: "12px",
            paddingBottom: "6px",
            borderBottom: "1px solid rgba(77, 166, 255, 0.2)",
        },
        shortcutGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "10px",
        },
        shortcutItem: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 14px",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.05)",
            transition: "all 0.2s",
        },
        shortcutKeys: {
            fontFamily: "'Courier New', monospace",
            fontSize: "12px",
            fontWeight: "700",
            padding: "4px 10px",
            backgroundColor: "rgba(77, 166, 255, 0.2)",
            borderRadius: "6px",
            color: "#4da6ff",
            letterSpacing: "0.5px",
        },
        shortcutDesc: {
            color: "#cbd5e1",
            fontSize: "13px",
            fontWeight: "500",
        },
        footer: {
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
            textAlign: "center",
            fontSize: "12px",
            color: "#6b7280",
        },
    };

    return (
        <div style={styles.overlay} onClick={() => setIsOpen(false)}>
            <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div style={styles.header}>
                    <div style={styles.title}>
                        <FaKeyboard size={26} color="#4da6ff" />
                        Keyboard Shortcuts
                    </div>
                    <button
                        style={styles.closeButton}
                        onClick={() => setIsOpen(false)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"}
                    >
                        <FaTimes size={18} />
                    </button>
                </div>

                {shortcutCategories.map((category, idx) => (
                    <div key={idx} style={styles.category}>
                        <h3 style={styles.categoryTitle}>{category.title}</h3>
                        <div style={styles.shortcutGrid}>
                            {category.shortcuts.map((shortcut, sidx) => (
                                <div key={sidx} style={styles.shortcutItem}>
                                    <span style={styles.shortcutKeys}>
                                        {shortcut.keys}
                                    </span>
                                    <span style={styles.shortcutDesc}>
                                        {shortcut.description}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div style={styles.footer}>
                    <p>💡 <strong>Pro Tip:</strong> Press <strong style={{ color: "#4da6ff" }}>?</strong> anytime to view this menu</p>
                    <p style={{ marginTop: "6px" }}>Shortcuts work when not typing in input fields</p>
                </div>
            </div>
        </div>
    );
};

export default GlobalShortcutsModal;
