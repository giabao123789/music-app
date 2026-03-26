"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
};

type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider />");
  return ctx;
}

type InternalState =
  | null
  | (ConfirmOptions & {
      resolve: (v: boolean) => void;
    });

export default function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<InternalState>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const close = (v: boolean) => {
    if (!state) return;
    state.resolve(v);
    setState(null);
    setBusy(false);
  };

  return (
    <ConfirmContext.Provider value={value}>
      {children}

      {/* Modal */}
      {state && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => (!busy ? close(false) : null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-300/20 bg-slate-950/85 p-5 shadow-[0_0_60px_rgba(76,201,240,0.16)]">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-0 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold text-white">
                  {state.title || "Xác nhận"}
                </div>
                {state.description && (
                  <div className="mt-2 text-sm text-slate-300 whitespace-pre-line">
                    {state.description}
                  </div>
                )}
              </div>

              <button
                className="rounded-full border border-cyan-300/20 bg-slate-900/40 px-2 py-1 text-xs text-slate-200 hover:bg-slate-900/60"
                onClick={() => (!busy ? close(false) : null)}
                title="Đóng"
              >
                ✕
              </button>
            </div>

            <div className="relative mt-5 flex items-center justify-end gap-2">
              <button
                className="rounded-full border border-cyan-300/15 bg-slate-900/35 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/55 disabled:opacity-50"
                disabled={busy}
                onClick={() => close(false)}
              >
                {state.cancelText || "Huỷ"}
              </button>

              <button
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50",
                  state.danger
                    ? "bg-rose-500/90 text-white hover:bg-rose-500 shadow-[0_0_22px_rgba(244,63,94,0.18)]"
                    : "bg-gradient-to-r from-cyan-300 to-violet-300 text-slate-950 hover:opacity-95 shadow-[0_0_22px_rgba(76,201,240,0.16)]",
                ].join(" ")}
                disabled={busy}
                onClick={async () => {
                  try {
                    setBusy(true);
                    close(true);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {state.confirmText || "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
