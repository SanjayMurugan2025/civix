import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastCtx {
  toast: (kind: ToastKind, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const Ctx = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
});

const ICONS: Record<ToastKind, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const COLORS: Record<ToastKind, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-sky-500',
  warning: 'text-amber-500',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      const id = idRef.current++;
      setToasts((prev) => [...prev.slice(-4), { id, kind, title, message }]);
      setTimeout(() => dismiss(id), 4600);
    },
    [dismiss]
  );

  const value = useMemo<ToastCtx>(
    () => ({
      toast,
      success: (t, m) => toast('success', t, m),
      error: (t, m) => toast('error', t, m),
      info: (t, m) => toast('info', t, m),
      warning: (t, m) => toast('warning', t, m),
    }),
    [toast]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = ICONS[t.kind];
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 60, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.96 }}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-white/10 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur"
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${COLORS[t.kind]}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">{t.title}</p>
                  {t.message && <p className="mt-0.5 break-words text-xs leading-relaxed text-slate-300">{t.message}</p>}
                </div>
                <button
                  onClick={() => dismiss(t.id)}
                  className="rounded p-0.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
