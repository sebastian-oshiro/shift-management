import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import PermissionGuard from '../components/PermissionGuard';
import { calculateWorkHours, convertTimeFormat } from '../utils/dateUtils';
import styles from './EmployeeDashboard.module.css';

// 勤怠データの型定義
interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  actual_hours?: number;
  status: string;
}

// 統計データの型定義
interface EmployeeStats {
  workDays: number;
  totalHours: number;
  overtimeHours: number;
  estimatedSalary: number;
}

const EmployeeDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [stats, setStats] = useState<EmployeeStats>({
    workDays: 0,
    totalHours: 0,
    overtimeHours: 0,
    estimatedSalary: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 出退勤取り消し機能の状態
  const [lastAction, setLastAction] = useState<'clock_in' | 'clock_out' | null>(null);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  // 今日の日付を取得（useMemoで最適化）
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 今日の勤怠記録を取得
  const fetchTodayAttendance = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/attendance?employee_id=${user?.employee_id}&start_date=${today}&end_date=${today}`);
      const attendances = response.data || [];
      setTodayAttendance(attendances.length > 0 ? attendances[0] : null);
    } catch (err: any) {
      console.error('勤怠取得エラー:', err);
      setError('勤怠情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 今月の統計データを取得（useCallbackで最適化）
  const fetchMonthlyStats = useCallback(async () => {
    if (!user?.employee_id) return;

    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // 今月の勤怠データを取得
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`;
      
      const attendanceResponse = await apiClient.get(`/attendance?employee_id=${user.employee_id}&start_date=${startDate}&end_date=${endDate}`);
      const attendances = attendanceResponse.data || [];
      
      // 今月の給与データを取得
      const payrollResponse = await apiClient.get(`/payroll/calculate?year=${year}&month=${month}&employee_id=${user.employee_id}`);
      const payrollData = payrollResponse.data || [];
      
      // 統計を計算
      const workDays = attendances.filter((att: Attendance) => {
        const { hours, minutes } = calculateWorkHours(att.clock_in_time || '', att.clock_out_time || '');
        return hours > 0 || minutes > 0;
      }).length;
      
      const totalHours = attendances.reduce((sum: number, att: Attendance) => {
        const { hours, minutes } = calculateWorkHours(att.clock_in_time || '', att.clock_out_time || '');
        return sum + hours + (minutes / 60);
      }, 0);
      
      // 残業時間の計算（1日8時間を超える部分）
      const overtimeHours = attendances.reduce((sum: number, att: Attendance) => {
        const { hours, minutes } = calculateWorkHours(att.clock_in_time || '', att.clock_out_time || '');
        const dailyHours = hours + (minutes / 60);
        return sum + Math.max(0, dailyHours - 8);
      }, 0);
      
      // 予想給与の計算
      const estimatedSalary = payrollData.length > 0 ? payrollData[0].total_salary || 0 : 0;
      
      setStats({
        workDays,
        totalHours: Math.round(totalHours * 10) / 10,
        overtimeHours: Math.round(overtimeHours * 10) / 10,
        estimatedSalary: Math.round(estimatedSalary)
      });
    } catch (err: any) {
      console.error('統計データの取得に失敗しました:', err);
      // エラー時はデフォルト値を設定
      setStats({
        workDays: 0,
        totalHours: 0,
        overtimeHours: 0,
        estimatedSalary: 0
      });
    }
  }, [user?.employee_id]);

  // 取り消しタイマーをクリア
  const clearUndoTimer = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    setShowUndo(false);
    setLastAction(null);
  };

  // 取り消し処理
  const handleUndo = async () => {
    if (!user?.employee_id || !lastAction) return;

    try {
      setLoading(true);
      
      if (lastAction === 'clock_in') {
        // 出勤を取り消し（退勤記録を削除）
        await apiClient.delete(`/attendance/${todayAttendance?.id}`);
      } else if (lastAction === 'clock_out') {
        // 退勤を取り消し（退勤時間をクリア）
        await apiClient.put(`/attendance/${todayAttendance?.id}`, {
          clock_out_time: null,
          status: 'clocked_in'
        });
      }
      
      await fetchTodayAttendance();
      await fetchMonthlyStats();
      clearUndoTimer();
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '取り消しに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee_id) {
      fetchTodayAttendance();
      fetchMonthlyStats();
    }
  }, [user?.employee_id, fetchMonthlyStats]);

  const handleLogout = async () => {
    await logout();
  };

  // 出勤記録
  const handleClockIn = async () => {
    if (!user?.employee_id) return;

    try {
      setLoading(true);
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);

      await apiClient.post('/attendance/clock-in', {
        employee_id: user.employee_id,
        date: today,
        time: time
      });
      
      await fetchTodayAttendance();
      await fetchMonthlyStats();
      setError('');
      
      // 取り消し機能を設定
      setLastAction('clock_in');
      setShowUndo(true);
      const timer = setTimeout(() => {
        setShowUndo(false);
        setLastAction(null);
      }, 5000); // 5秒間取り消し可能
      setUndoTimer(timer);
    } catch (err: any) {
      setError(err.response?.data?.error || '出勤記録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 退勤記録
  const handleClockOut = async () => {
    if (!user?.employee_id) return;

    try {
      setLoading(true);
      const now = new Date();
      const time = now.toTimeString().slice(0, 5);

      await apiClient.post('/attendance/clock-out', {
        employee_id: user.employee_id,
        date: today,
        time: time
      });
      
      await fetchTodayAttendance();
      await fetchMonthlyStats();
      setError('');
      
      // 取り消し機能を設定
      setLastAction('clock_out');
      setShowUndo(true);
      const timer = setTimeout(() => {
        setShowUndo(false);
        setLastAction(null);
      }, 5000); // 5秒間取り消し可能
      setUndoTimer(timer);
    } catch (err: any) {
      setError(err.response?.data?.error || '退勤記録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>シフト管理システム - 従業員画面</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}さん</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* 今日の出退勤 */}
        <section className={styles.clockSection}>
          <h2 className={styles.sectionTitle}>今日の出退勤</h2>
          <div className={styles.clockCard}>
            <div className={styles.dateInfo}>
              <span className={styles.date}>{new Date().toLocaleDateString('ja-JP', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}</span>
            </div>
            
            {error && (
              <div className={styles.error}>
                {error}
              </div>
            )}

            {/* 取り消し通知 */}
            {showUndo && (
              <div className={styles.undoNotification}>
                <span>
                  {lastAction === 'clock_in' ? '出勤' : '退勤'}を記録しました
                </span>
                <button onClick={handleUndo} className={styles.undoButton}>
                  取り消し
                </button>
              </div>
            )}

            <div className={styles.clockStatus}>
              {todayAttendance ? (
                <div className={styles.statusInfo}>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>出勤時間:</span>
                    <span className={styles.statusValue}>
                      {todayAttendance.clock_in_time ? convertTimeFormat(todayAttendance.clock_in_time) : '未記録'}
                    </span>
                  </div>
                  <div className={styles.statusItem}>
                    <span className={styles.statusLabel}>退勤時間:</span>
                    <span className={styles.statusValue}>
                      {todayAttendance.clock_out_time ? convertTimeFormat(todayAttendance.clock_out_time) : '未記録'}
                    </span>
                  </div>
                  {todayAttendance.actual_hours && (
                    <div className={styles.statusItem}>
                      <span className={styles.statusLabel}>勤務時間:</span>
                      <span className={styles.statusValue}>
                        {todayAttendance.actual_hours}時間
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className={styles.noRecord}>
                  今日の勤怠記録はありません
                </div>
              )}
            </div>

            <div className={styles.clockButtons}>
              <button
                onClick={handleClockIn}
                disabled={loading || !!todayAttendance?.clock_in_time}
                className={`${styles.clockButton} ${styles.clockInButton}`}
              >
                {loading ? '処理中...' : '出勤'}
              </button>
              <button
                onClick={handleClockOut}
                disabled={loading || !todayAttendance?.clock_in_time || !!todayAttendance?.clock_out_time}
                className={`${styles.clockButton} ${styles.clockOutButton}`}
              >
                {loading ? '処理中...' : '退勤'}
              </button>
            </div>
          </div>
        </section>

        {/* 機能メニュー */}
        <section className={styles.menuSection}>
          <h2 className={styles.sectionTitle}>メニュー</h2>
          <div className={styles.menuGrid}>
            <button 
              className={styles.menuButton}
              onClick={() => navigate('/my-shifts')}
            >
              <span className={styles.buttonIcon}>📅</span>
              <div className={styles.buttonContent}>
                <h3>シフト確認</h3>
                <p>今月のシフトを確認できます</p>
              </div>
            </button>
            
            <PermissionGuard requiredPermission="can_submit_shift_requests">
              <button 
                className={styles.menuButton}
                onClick={() => navigate('/shift-request')}
              >
                <span className={styles.buttonIcon}>📝</span>
                <div className={styles.buttonContent}>
                  <h3>シフト希望提出</h3>
                  <p>希望するシフトを提出できます</p>
                </div>
              </button>
            </PermissionGuard>
            
            <PermissionGuard requiredPermission="can_view_payroll">
              <button 
                className={styles.menuButton}
                onClick={() => navigate('/my-payroll')}
              >
                <span className={styles.buttonIcon}>💰</span>
                <div className={styles.buttonContent}>
                  <h3>給与確認</h3>
                  <p>今月の給与を確認できます</p>
                </div>
              </button>
            </PermissionGuard>
            
            <PermissionGuard requiredPermission="can_edit_attendance">
              <button 
                className={styles.menuButton}
                onClick={() => navigate('/my-attendance')}
              >
                <span className={styles.buttonIcon}>📊</span>
                <div className={styles.buttonContent}>
                  <h3>勤怠履歴</h3>
                  <p>過去の勤怠記録を確認できます</p>
                </div>
              </button>
            </PermissionGuard>
          </div>
        </section>

        {/* 今月の統計 */}
        <section className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>今月の統計</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <h3>勤務日数</h3>
              <p className={styles.statNumber}>{stats.workDays}</p>
              <p className={styles.statLabel}>日</p>
            </div>
            <div className={styles.statCard}>
              <h3>総勤務時間</h3>
              <p className={styles.statNumber}>{stats.totalHours}</p>
              <p className={styles.statLabel}>時間</p>
            </div>
            <div className={styles.statCard}>
              <h3>残業時間</h3>
              <p className={styles.statNumber}>{stats.overtimeHours}</p>
              <p className={styles.statLabel}>時間</p>
            </div>
            <div className={styles.statCard}>
              <h3>予想給与</h3>
              <p className={styles.statNumber}>¥{stats.estimatedSalary.toLocaleString()}</p>
              <p className={styles.statLabel}>予定</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default EmployeeDashboard; 