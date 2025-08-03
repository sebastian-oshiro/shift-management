import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import styles from './OwnerDashboard.module.css';

// アクティビティの型定義
interface Activity {
  id: number;
  type: string;
  description: string;
  created_at: string;
  employee_name?: string;
}

const OwnerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    employeeCount: 0,
    unassignedDays: 0,
    totalWorkHours: 0,
    totalSalary: 0
  });
  const [loading, setLoading] = useState(true);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [otherShiftViewEnabled, setOtherShiftViewEnabled] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  // 統計データを取得
  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // 従業員数を取得
      const employeesResponse = await apiClient.get('/employees');
      const employeeCount = employeesResponse.data?.length || 0;
      setEmployees(employeesResponse.data || []);
      
      // 今月のシフトデータを取得
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const shiftsResponse = await apiClient.get(`/shifts/month?year=${year}&month=${month}`);
      const shifts = shiftsResponse.data || [];
      
      // 今月の給与データを取得
      const payrollResponse = await apiClient.get(`/payroll/calculate?year=${year}&month=${month}`);
      const payrollData = payrollResponse.data || [];
      
      // 統計を計算
      const totalWorkHours = payrollData.reduce((sum: number, item: any) => sum + (item.net_hours || 0), 0);
      const totalSalary = payrollData.reduce((sum: number, item: any) => sum + (item.total_salary || 0), 0);
      
      // 未設定日の計算（改善版）
      const daysInMonth = new Date(year, now.getMonth() + 1, 0).getDate();
      // シフトが設定されている日付をユニークに取得
      const assignedDays = new Set();
      shifts.forEach((shift: any) => {
        if (shift.date) {
          assignedDays.add(shift.date);
        }
      });
      const unassignedDays = Math.max(0, daysInMonth - assignedDays.size);
      
      setStats({
        employeeCount,
        unassignedDays,
        totalWorkHours: Math.round(totalWorkHours * 10) / 10, // 小数点第1位まで表示
        totalSalary: Math.round(totalSalary)
      });
    } catch (error) {
      console.error('統計データの取得に失敗しました:', error);
      // エラー時はデフォルト値を設定
      setStats({
        employeeCount: 0,
        unassignedDays: 0,
        totalWorkHours: 0,
        totalSalary: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // 最近のアクティビティを取得
  const fetchRecentActivities = async () => {
    try {
      // シフト希望、勤怠記録、シフト追加などの最新データを取得
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      
      // シフト希望を取得
      const shiftRequestsResponse = await apiClient.get(`/shift-requests?year=${year}&month=${month}`);
      const shiftRequests = shiftRequestsResponse.data || [];
      
      // 勤怠記録を取得（最近のもの）
      const attendanceResponse = await apiClient.get('/attendance');
      const attendances = attendanceResponse.data || [];
      
      // シフトを取得（最近追加されたもの）
      const shiftsResponse = await apiClient.get(`/shifts/month?year=${year}&month=${month}`);
      const shifts = shiftsResponse.data || [];
      
      // アクティビティを生成
      const activities: Activity[] = [];
      
      // シフト希望をアクティビティに変換
      shiftRequests.forEach((request: any) => {
        activities.push({
          id: request.id,
          type: 'shift_request',
          description: `${request.employee_name || '従業員'}がシフト希望を提出しました`,
          created_at: request.created_at,
          employee_name: request.employee_name
        });
      });
      
      // 勤怠記録をアクティビティに変換
      attendances.forEach((attendance: any) => {
        if (attendance.clock_in_time) {
          activities.push({
            id: attendance.id,
            type: 'clock_in',
            description: `${attendance.employee_name || '従業員'}が出勤しました`,
            created_at: attendance.clock_in_time,
            employee_name: attendance.employee_name
          });
        }
      });
      
      // シフト追加をアクティビティに変換
      shifts.forEach((shift: any) => {
        activities.push({
          id: shift.id,
          type: 'shift_added',
          description: `${shift.employee_name || '従業員'}のシフトが追加されました`,
          created_at: shift.created_at,
          employee_name: shift.employee_name
        });
      });
      
      // 日時順にソート（新しい順）
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // 最新の10件のみ表示
      setRecentActivities(activities.slice(0, 10));
    } catch (error) {
      console.error('アクティビティの取得に失敗しました:', error);
      setRecentActivities([]);
    }
  };

  // 現在の権限設定を取得
  const fetchCurrentPermissions = async () => {
    try {
      console.log('権限設定取得開始'); // デバッグ用
      const response = await apiClient.get('/permissions');
      const permissions = response.data || [];
      console.log('取得した権限設定:', permissions); // デバッグ用
      
      // 他者シフト閲覧権限が設定されている従業員の数を確認
      const employeesWithPermission = permissions.filter((p: any) => p.can_view_other_shifts).length;
      const hasPermission = employeesWithPermission > 0;
      console.log('権限設定状態:', { employeesWithPermission, hasPermission }); // デバッグ用
      
      setOtherShiftViewEnabled(hasPermission);
    } catch (err: any) {
      console.error('権限設定取得エラー:', err); // デバッグ用
      setOtherShiftViewEnabled(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchCurrentPermissions();
    fetchRecentActivities();
  }, []);

  // 他者シフト閲覧権限を切り替え
  const handleToggleOtherShiftView = async () => {
    console.log('権限切り替え開始'); // デバッグ用
    console.log('現在の状態:', otherShiftViewEnabled); // デバッグ用
    console.log('従業員数:', employees.length); // デバッグ用
    
    if (employees.length === 0) {
      alert('従業員が登録されていません');
      return;
    }

    try {
      setPermissionLoading(true);
      const newValue = !otherShiftViewEnabled;
      console.log('新しい権限値:', newValue); // デバッグ用

      // 各従業員に対して権限設定を作成または更新
      const promises = employees.map(async (employee) => {
        const requestData = {
          employee_id: employee.id,
          can_view_other_shifts: newValue,
          can_view_payroll: false,
          can_edit_attendance: false,
          can_submit_shift_requests: true
        };
        console.log(`従業員 ${employee.name} の権限設定:`, requestData); // デバッグ用
        
        const response = await apiClient.post('/permissions', requestData);
        console.log(`従業員 ${employee.name} の設定結果:`, response.data); // デバッグ用
        return response.data;
      });

      const results = await Promise.all(promises);
      console.log('全従業員の設定完了:', results); // デバッグ用
      
      setOtherShiftViewEnabled(newValue);
      alert(`全従業員（${employees.length}名）の他者シフト閲覧権限を${newValue ? '有効' : '無効'}に設定しました`);
    } catch (err: any) {
      console.error('権限設定エラー詳細:', err); // デバッグ用
      console.error('エラーレスポンス:', err.response?.data); // デバッグ用
      alert('権限設定の変更に失敗しました: ' + (err.response?.data?.error || err.message));
    } finally {
      setPermissionLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // アクティビティの時間表示をフォーマット
  const formatActivityTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
      return '数分前';
    } else if (diffHours < 24) {
      return `${diffHours}時間前`;
    } else if (diffDays === 1) {
      return '昨日';
    } else if (diffDays < 7) {
      return `${diffDays}日前`;
    } else {
      return date.toLocaleDateString('ja-JP');
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>シフト管理システム - オーナー画面</h1>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name}さん（オーナー）</span>
            <button onClick={handleLogout} className={styles.logoutButton}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.main}>
        {/* 統計カード */}
        <section className={styles.statsSection}>
          <h2 className={styles.sectionTitle}>今月の統計</h2>
          {loading ? (
            <div className={styles.loading}>統計データを読み込み中...</div>
          ) : (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <h3>従業員数</h3>
                <p className={styles.statNumber}>{stats.employeeCount}</p>
                <p className={styles.statLabel}>人</p>
              </div>
              <div className={styles.statCard}>
                <h3>シフト未設定</h3>
                <p className={styles.statNumber}>{stats.unassignedDays}</p>
                <p className={styles.statLabel}>日</p>
              </div>
              <div className={styles.statCard}>
                <h3>今月の総労働時間</h3>
                <p className={styles.statNumber}>{stats.totalWorkHours}</p>
                <p className={styles.statLabel}>時間</p>
              </div>
              <div className={styles.statCard}>
                <h3>今月の総給与</h3>
                <p className={styles.statNumber}>¥{stats.totalSalary.toLocaleString()}</p>
                <p className={styles.statLabel}>予定</p>
              </div>
            </div>
          )}
        </section>

        {/* 権限設定セクション */}
        <section className={styles.permissionSection}>
          <h2 className={styles.sectionTitle}>他者シフト閲覧権限設定</h2>
          <div className={styles.permissionGrid}>
            <div className={styles.permissionCard}>
              <h3>他者シフト閲覧権限</h3>
              <p>従業員が他の従業員のシフトを閲覧できる権限を設定します。</p>
              <div className={styles.permissionToggle}>
                <span>無効</span>
                <label className={styles.switch}>
                  <input type="checkbox" checked={otherShiftViewEnabled} onChange={handleToggleOtherShiftView} disabled={permissionLoading} />
                  <span className={styles.slider}></span>
                </label>
                <span>有効</span>
              </div>
              {permissionLoading && <p className={styles.loadingText}>権限を更新中...</p>}
            </div>
          </div>
        </section>

        {/* 管理機能 */}
        <section className={styles.managementSection}>
          <h2 className={styles.sectionTitle}>管理機能</h2>
          <div className={styles.managementGrid}>
            <button 
              className={styles.managementButton}
              onClick={() => navigate('/shifts')}
            >
              <span className={styles.buttonIcon}>📅</span>
              <div className={styles.buttonContent}>
                <h3>シフト作成・管理</h3>
                <p>カレンダー形式でシフトを作成・編集できます</p>
              </div>
            </button>
            
            <button 
              className={styles.managementButton}
              onClick={() => navigate('/employees')}
            >
              <span className={styles.buttonIcon}>👥</span>
              <div className={styles.buttonContent}>
                <h3>従業員管理</h3>
                <p>従業員の登録・編集・削除ができます</p>
              </div>
            </button>
            
            <button 
              className={styles.managementButton}
              onClick={() => navigate('/attendance')}
            >
              <span className={styles.buttonIcon}>⏰</span>
              <div className={styles.buttonContent}>
                <h3>勤怠管理</h3>
                <p>出退勤記録の確認・編集ができます</p>
              </div>
            </button>
            
            <button 
              className={styles.managementButton}
              onClick={() => navigate('/payroll')}
            >
              <span className={styles.buttonIcon}>💰</span>
              <div className={styles.buttonContent}>
                <h3>給与計算・管理</h3>
                <p>月別給与の計算・確認・時給設定ができます</p>
              </div>
            </button>
            
            <button 
              className={styles.managementButton}
              onClick={() => navigate('/settings')}
            >
              <span className={styles.buttonIcon}>⚙️</span>
              <div className={styles.buttonContent}>
                <h3>時間帯設定</h3>
                <p>曜日別の必要人数を設定できます</p>
              </div>
            </button>
          </div>
        </section>

        {/* 最近のアクティビティ */}
        <section className={styles.activitySection}>
          <h2 className={styles.sectionTitle}>最近のアクティビティ</h2>
          <div className={styles.activityList}>
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  <span className={styles.activityTime}>{formatActivityTime(activity.created_at)}</span>
                  <span className={styles.activityText}>{activity.description}</span>
                </div>
              ))
            ) : (
              <div className={styles.activityItem}>
                <span className={styles.activityText}>最近のアクティビティはありません</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default OwnerDashboard; 