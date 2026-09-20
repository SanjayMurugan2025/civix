import { Link } from 'react-router-dom';
import { Inbox, ArrowRight, RefreshCw } from 'lucide-react';

export default function EmptyState({
  title,
  message,
  actionLabel,
  actionTo,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <Inbox className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {(actionLabel && actionTo) || (actionLabel && onAction) ? (
        actionTo ? (
          <Link
            to={actionTo}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
          >
            {actionLabel} <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-slate-700"
          >
            {actionLabel} <ArrowRight className="h-4 w-4" />
          </button>
        )
      ) : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <p className="text-sm font-semibold text-red-800">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-red-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-red-500"
        >
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  );
}
