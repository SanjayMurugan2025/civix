import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';
import LoadingScreen from './LoadingScreen';

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: Array<'citizen' | 'officer' | 'admin'>;
}) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen label="Checking your session…" />;

  if (!user) {
    const next = roles?.includes('officer') || roles?.includes('admin') ? '/officer/login' : '/login';
    return <Navigate to={next} replace state={{ from: location.pathname }} />;
  }

  if (roles && roles.length > 0) {
    const role = profile?.role || 'citizen';
    const allowed =
      roles.includes(role as 'citizen' | 'officer' | 'admin') ||
      (role === 'admin' && (roles.includes('officer') || roles.includes('citizen')));
    if (!profile) return <LoadingScreen label="Loading your profile…" />;
    if (!allowed) {
      return <Navigate to={role === 'citizen' ? '/dashboard' : '/officer'} replace />;
    }
  }

  return <>{children}</>;
}
