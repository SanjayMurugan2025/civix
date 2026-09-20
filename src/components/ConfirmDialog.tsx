import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                  danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{message}</p>
            <div className="mt-6 flex gap-2.5">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={busy}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow transition disabled:opacity-50 ${
                  danger ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-900 hover:bg-slate-700'
                }`}
              >
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
