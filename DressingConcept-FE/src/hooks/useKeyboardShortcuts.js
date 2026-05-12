// src/hooks/useKeyboardShortcuts.js - Quick Fix Version
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const useKeyboardShortcuts = () => {
    const navigate = useNavigate();
    const lastKeyTimeRef = useRef(0);
    const pendingKeysRef = useRef('');

    // Define all shortcuts mapping
    const shortcuts = {
        // Single letter
        'd': '/dashboard',
        'p': '/product',
        'c': '/type',
        'l': '/lowstock',
        'w': '/warranty',
        'b': '/bill',
        'q': '/quotation',
        'e': '/employee',
        'a': '/attendance',

        'r': '/billreport',
        'i': '/discount',
        's': '/supplier',
        't': '/paymenttracking',
        'z': '/company',
        'n': '/enquiry',
        'f': '/customer',
        'v': '/itemlist',
        'o': '/stockout',
        'g': '/service',
        'x': '/serviceBillView',
        'y': '/employeebill',
        'k': '/supplierList',
        'ut': '/usertype',
        'm': '/salary',
        'us': '/usersettings',
    };

    useEffect(() => {
        const handleKeyPress = (event) => {
            // Check if typing in input fields
            const target = event.target;
            const isTyping = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.tagName === 'SELECT';

            if (isTyping) {
                pendingKeysRef.current = '';
                return;
            }

            const key = event.key.toLowerCase();
            const currentTime = Date.now();

            // Handle '?' shortcut
            if (key === '?' || (event.shiftKey && key === '/')) {
                event.preventDefault();
                window.dispatchEvent(new CustomEvent('toggleShortcuts'));
                pendingKeysRef.current = '';
                return;
            }

            // If last key was pressed more than 500ms ago, reset
            if (currentTime - lastKeyTimeRef.current > 500) {
                pendingKeysRef.current = '';
            }

            // Add current key to pending
            const newPending = pendingKeysRef.current + key;

            // Check if new pending matches any two-letter shortcut
            if (shortcuts[newPending]) {
                event.preventDefault();
                navigate(shortcuts[newPending]);
                pendingKeysRef.current = '';
                lastKeyTimeRef.current = 0;
                return;
            }

            // Check if single key shortcut exists and no pending keys
            if (shortcuts[key] && pendingKeysRef.current === '') {
                event.preventDefault();
                navigate(shortcuts[key]);
                pendingKeysRef.current = '';
                lastKeyTimeRef.current = 0;
                return;
            }

            // Store the pending keys
            pendingKeysRef.current = newPending;
            lastKeyTimeRef.current = currentTime;

            // Reset after 500ms if no match
            setTimeout(() => {
                if (Date.now() - lastKeyTimeRef.current >= 500) {
                    pendingKeysRef.current = '';
                }
            }, 500);
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [navigate]);

    return shortcuts;
};

export default useKeyboardShortcuts;