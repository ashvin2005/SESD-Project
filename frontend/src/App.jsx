import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransactionsPage from './pages/TransactionsPage';
import CategoriesPage from './pages/CategoriesPage';
import BudgetsPage from './pages/BudgetsPage';
import ReportsPage from './pages/ReportsPage';
import ChatPage from './pages/ChatPage';
import BankImportPage from './pages/BankImportPage';
import AnomaliesPage from './pages/AnomaliesPage';
import GoalPlanPage from './pages/GoalPlanPage';
import BudgetRecommendationsPage from './pages/BudgetRecommendationsPage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import ReceiptsPage from './pages/ReceiptsPage';
import InvestmentsPage from './pages/InvestmentsPage';

function LayoutRoute({ children }) {
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/oauth-callback" element={<OAuthCallbackPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<LayoutRoute><DashboardPage /></LayoutRoute>} />
            <Route path="/transactions" element={<LayoutRoute><TransactionsPage /></LayoutRoute>} />
            <Route path="/categories" element={<LayoutRoute><CategoriesPage /></LayoutRoute>} />
            <Route path="/budgets" element={<LayoutRoute><BudgetsPage /></LayoutRoute>} />
            <Route path="/reports" element={<LayoutRoute><ReportsPage /></LayoutRoute>} />
            <Route path="/chat" element={<LayoutRoute><ChatPage /></LayoutRoute>} />
            <Route path="/import" element={<LayoutRoute><BankImportPage /></LayoutRoute>} />
            <Route path="/anomalies" element={<LayoutRoute><AnomaliesPage /></LayoutRoute>} />
            <Route path="/goal-plan" element={<LayoutRoute><GoalPlanPage /></LayoutRoute>} />
            <Route path="/budget-recs" element={<LayoutRoute><BudgetRecommendationsPage /></LayoutRoute>} />
            <Route path="/receipts" element={<LayoutRoute><ReceiptsPage /></LayoutRoute>} />
            <Route path="/investments" element={<LayoutRoute><InvestmentsPage /></LayoutRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
