// src/hooks/useKeyboardShortcuts.js - Quick Fix Version
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const useKeyboardShortcuts = () => {
    const navigate = useNavigate();
    const pendingKeysRef = useRef('');
    const timerRef = useRef(null);

    // Define all shortcuts mapping
    const shortcuts = {
        // Single letter
        'd': '/dashboard',
        'p': '/admin-product',
        'c': '/type',
        'l': '/lowstock',
        'w': '/warranty',
        'b': '/bill',
        'q': '/quotation',
        'e': '/employee',
        'ep': '/employee-product',
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

    const toggleFullscreen = () => {
        const elem = document.documentElement;
        const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
        if (!isFullscreen) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch((err) => {
                    console.warn("Fullscreen request failed:", err);
                });
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch((err) => console.warn("Exit fullscreen error:", err));
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    };

    useEffect(() => {
        const handleKeyPress = (event) => {
            // Fullscreen shortcuts: Alt, Alt+Enter, Alt+F, F11
            const isFullscreenShortcut =
                event.key === 'Alt' ||
                (event.altKey && (event.key === 'Enter' || event.key.toLowerCase() === 'f')) ||
                event.key === 'F11';

            if (isFullscreenShortcut) {
                event.preventDefault();
                toggleFullscreen();
                pendingKeysRef.current = '';
                return;
            }

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

            // Clear any pending single-key execution
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }

            const newPending = pendingKeysRef.current + key;

            // Check if exact match for multi-key (e.g. 'ep', 'ut')
            if (newPending.length > 1 && shortcuts[newPending]) {
                event.preventDefault();
                navigate(shortcuts[newPending]);
                pendingKeysRef.current = '';
                return;
            }

            // Check if newPending is a prefix for any longer shortcut
            const isPrefix = Object.keys(shortcuts).some(k => k.length > newPending.length && k.startsWith(newPending));

            if (shortcuts[newPending]) {
                event.preventDefault();
                if (isPrefix) {
                    // Valid shortcut but also a prefix for a longer one. Wait a bit to see if user types more.
                    pendingKeysRef.current = newPending;
                    timerRef.current = setTimeout(() => {
                        navigate(shortcuts[newPending]);
                        pendingKeysRef.current = '';
                    }, 400); // 400ms delay to wait for second key
                } else {
                    // Valid shortcut and not a prefix, trigger immediately
                    navigate(shortcuts[newPending]);
                    pendingKeysRef.current = '';
                }
            } else if (isPrefix) {
                // Not a valid shortcut yet, but is a prefix (e.g., 'u' for 'ut')
                pendingKeysRef.current = newPending;

                // Clear pending keys after a timeout if user stops typing
                setTimeout(() => {
                    if (pendingKeysRef.current === newPending) {
                        pendingKeysRef.current = '';
                    }
                }, 500);
            } else {
                // Neither a valid shortcut nor a prefix
                pendingKeysRef.current = '';
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [navigate]);

    return shortcuts;
};

export default useKeyboardShortcuts;
