import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportIssuePage from './pages/ReportIssuePage';
import ComplaintDetailsPage from './pages/ComplaintDetailsPage';
import OfficerCommandCenter from './pages/OfficerCommandCenter';
import IssueDetailsPage from './pages/IssueDetailsPage';
import CityMapPage from './pages/CityMapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import TrackPage from './pages/TrackPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <Layout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="citizen" />} />
          <Route path="/officer/login" element={<AuthPage mode="officer" />} />
          <Route path="/track" element={<TrackPage />} />
          <Route path="/city-map" element={<CityMapPage />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <CitizenDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportIssuePage />
              </ProtectedRoute>
            }
          />
          <Route path="/complaints/:id" element={<ComplaintDetailsPage />} />
          <Route path="/issues/:id" element={<IssueDetailsPage />} />

          <Route
            path="/officer"
            element={
              <ProtectedRoute roles={['officer', 'admin']}>
                <OfficerCommandCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/map"
            element={
              <ProtectedRoute roles={['officer', 'admin']}>
                <CityMapPage officer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/officer/analytics"
            element={
              <ProtectedRoute roles={['officer', 'admin']}>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />

          <Route path="/analytics" element={<Navigate to="/officer/analytics" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  </BrowserRouter>
);
}
