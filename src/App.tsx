import { HashRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Spin } from 'antd';
import AuthGuard from '@/components/layout/AuthGuard';
import AdminLayout from '@/components/layout/AdminLayout';
import LoginPage from '@/pages/login/LoginPage';

const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'));
const AdminListPage = lazy(() => import('@/pages/admin/AdminListPage'));
const MemberListPage = lazy(() => import('@/pages/member/MemberListPage'));
const MemberDetailPage = lazy(() => import('@/pages/member/MemberDetailPage'));
const TechnicianListPage = lazy(() => import('@/pages/technician/TechnicianListPage'));
const TechnicianDetailPage = lazy(() => import('@/pages/technician/TechnicianDetailPage'));
const ServiceListPage = lazy(() => import('@/pages/service/ServiceListPage'));
const AppointmentListPage = lazy(() => import('@/pages/appointment/AppointmentListPage'));
const FinancePage = lazy(() => import('@/pages/finance/FinancePage'));
const CommissionPage = lazy(() => import('@/pages/commission/CommissionPage'));
const MemberCardPage = lazy(() => import('@/pages/member-card/MemberCardPage'));
const OperationLogPage = lazy(() => import('@/pages/operation-log/OperationLogPage'));
const MemberRelationPage = lazy(() => import('@/pages/member/MemberRelationPage'));

const LazyFallback = (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 200 }}>
    <Spin size="large" />
  </div>
);

function App() {
  return (
    <HashRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthGuard>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AdminLayout />}>
            <Route index element={<Suspense fallback={LazyFallback}><DashboardPage /></Suspense>} />
            <Route path="admin" element={<Suspense fallback={LazyFallback}><AdminListPage /></Suspense>} />
            <Route path="members" element={<Suspense fallback={LazyFallback}><MemberListPage /></Suspense>} />
            <Route path="members/:id" element={<Suspense fallback={LazyFallback}><MemberDetailPage /></Suspense>} />
            <Route path="technicians" element={<Suspense fallback={LazyFallback}><TechnicianListPage /></Suspense>} />
            <Route path="technicians/:id" element={<Suspense fallback={LazyFallback}><TechnicianDetailPage /></Suspense>} />
            <Route path="services" element={<Suspense fallback={LazyFallback}><ServiceListPage /></Suspense>} />
            <Route path="appointments" element={<Suspense fallback={LazyFallback}><AppointmentListPage /></Suspense>} />
            <Route path="finance" element={<Suspense fallback={LazyFallback}><FinancePage /></Suspense>} />
            <Route path="commission" element={<Suspense fallback={LazyFallback}><CommissionPage /></Suspense>} />
            <Route path="member-relations" element={<Suspense fallback={LazyFallback}><MemberRelationPage /></Suspense>} />
            <Route path="member-cards" element={<Suspense fallback={LazyFallback}><MemberCardPage /></Suspense>} />
            <Route path="operation-logs" element={<Suspense fallback={LazyFallback}><OperationLogPage /></Suspense>} />
          </Route>
        </Routes>
      </AuthGuard>
    </HashRouter>
  );
}

export default App;
