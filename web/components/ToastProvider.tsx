"use client";
import React, { createContext, useContext, useMemo, useState } from "react";

type Toast = { id: number; text: string; kind?: "success" | "error" };
type Ctx = { show: (text: string, kind?: Toast["kind"]) => void };

const ToastCtx = createContext<Ctx | null>(null);
export const useToast = () => {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider />");
  return v;
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const show: Ctx["show"] = (text, kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((a) => [...a, { id, text, kind }]);
    setTimeout(() => setItems((a) => a.filter((t) => t.id !== id)), 2200);
  };

  const value = useMemo(() => ({ show }), []);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      {/* viewport */}
      <div className="fixed bottom-4 right-4 z-[9999] space-y-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded-lg text-sm shadow-lg border
              ${t.kind === "error"
                ? "bg-red-900/70 border-red-400 text-red-50"
                : "bg-emerald-900/70 border-emerald-400 text-emerald-50"}`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
