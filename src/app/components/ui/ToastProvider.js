"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Toast from "./Toast";

export const ToastContext = createContext(null);

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutsRef = useRef(new Map());
  const signaturesRef = useRef(new Set());

  const dismiss = useCallback((id) => {
    setToasts((current) => {
      const target = current.find((toast) => toast.id === id);
      if (target) {
        signaturesRef.current.delete(target.signature);
      }
      return current.filter((toast) => toast.id !== id);
    });

    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    ({ title, description = "", variant = "default", duration = 3000 }) => {
      const signature = `${variant}:${title}:${description}`;
      if (signaturesRef.current.has(signature)) {
        return null;
      }

      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      signaturesRef.current.add(signature);

      setToasts((current) => {
        const next = [
          ...current,
          { id, title, description, variant, signature },
        ];

        if (next.length <= 3) {
          return next;
        }

        const removed = next[0];
        signaturesRef.current.delete(removed.signature);
        const timeout = timeoutsRef.current.get(removed.id);
        if (timeout) {
          clearTimeout(timeout);
          timeoutsRef.current.delete(removed.id);
        }
        return next.slice(-3);
      });

      const timeout = setTimeout(() => {
        dismiss(id);
      }, duration);

      timeoutsRef.current.set(id, timeout);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  useEffect(() => {
    const timeouts = timeoutsRef.current;
    const signatures = signaturesRef.current;
    return () => {
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();
      signatures.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="true">
        {toasts.map((item) => (
          <Toast key={item.id} {...item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
