import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import OwnerDashboard from './pages/OwnerDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeList from './pages/EmployeeList';
import ShiftCalendar from './pages/ShiftCalendar';
import ShiftDetail from './pages/ShiftDetail';
import Attendance from './pages/Attendance';
import EmployeeShiftView from './pages/EmployeeShiftView';
import ShiftRequestForm from './pages/ShiftRequestForm';
import EmployeePayroll from './pages/EmployeePayroll';
import EmployeeAttendance from './pages/EmployeeAttendance';
import TimeSlotSettings from './pages/TimeSlotSettings';
import PayrollManagement from './pages/PayrollManagement';
import PermissionSettings from './pages/PermissionSettings';
import './App.css';

// 認証が必要なページを保護するコンポーネント
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 認証済みユーザーがアクセスできないページ（ログインページなど）
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>読み込み中...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// ロール別ダッシュボードコンポーネント
const RoleBasedDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // オーナーの場合はオーナーダッシュボード、従業員の場合は従業員ダッシュボードを表示
  if (user?.role === 'owner') {
    return <OwnerDashboard />;
  } else {
    return <EmployeeDashboard />;
  }
};



function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* パブリックルート */}
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            
            {/* 保護されたルート */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <RoleBasedDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/employees" 
              element={
                <ProtectedRoute>
                  <EmployeeList />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/shifts" 
              element={
                <ProtectedRoute>
                  <ShiftCalendar />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/shift-detail/:date" 
              element={
                <ProtectedRoute>
                  <ShiftDetail />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute>
                  <Attendance />
                </ProtectedRoute>
              } 
            />
            
            {/* 従業員専用ページ */}
            <Route 
              path="/my-shifts" 
              element={
                <ProtectedRoute>
                  <EmployeeShiftView />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/shift-request" 
              element={
                <ProtectedRoute>
                  <ShiftRequestForm />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/my-payroll" 
              element={
                <ProtectedRoute>
                  <EmployeePayroll />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/my-attendance" 
              element={
                <ProtectedRoute>
                  <EmployeeAttendance />
                </ProtectedRoute>
              } 
            />
            
            {/* オーナー専用ページ */}
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute>
                  <TimeSlotSettings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/payroll" 
              element={
                <ProtectedRoute>
                  <PayrollManagement />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/permissions" 
              element={
                <ProtectedRoute>
                  <PermissionSettings />
                </ProtectedRoute>
              } 
            />
            
            {/* デフォルトルート */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
