"use client";

import { useContext } from "react";
import { ToastContext } from "./ToastProvider";

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return context;
}
