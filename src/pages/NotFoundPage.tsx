import { Link } from 'react-router-dom';
import { Home, SearchX } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-200 text-slate-500">
        <SearchX className="h-8 w-8" />
      </span>
      <h1 className="mt-5 text-4xl font-black text-slate-900">404</h1>
      <p className="mt-2 text-sm text-slate-500">This page wandered off like an unassigned grievance. Let's get you back on track.</p>
      <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700">
        <Home className="h-4 w-4" /> Back to home
      </Link>
    </div>
  );
}
