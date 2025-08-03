import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { convertTimeFormat } from '../utils/dateUtils';
import styles from './EmployeeShiftView.module.css';

// シフトデータの型定義
interface Shift {
  id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  break_time: number;
  employee_name?: string;
}

// 権限データの型定義
interface EmployeePermission {
  id: number;
  employee_id: number;
  employee_name: string;
  can_view_other_shifts: boolean;
  can_view_payroll: boolean;
  can_edit_attendance: boolean;
  can_submit_shift_requests: boolean;
  created_at: string;
  updated_at: string;
}

const EmployeeShiftView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [permissions, setPermissions] = useState<EmployeePermission | null>(null);

  // 現在の年月を取得
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 権限データを取得
  const fetchPermissions = async () => {
    if (!user?.employee_id) return;

    try {
      const response = await apiClient.get(`/permissions/employee/${user.employee_id}`);
      setPermissions(response.data);
    } catch (err: any) {
      console.error('権限取得エラー:', err);
      // 権限が取得できない場合はデフォルト値を使用
      setPermissions({
        id: 0,
        employee_id: user.employee_id,
        employee_name: user.name || '',
        can_view_other_shifts: false,
        can_view_payroll: false,
        can_edit_attendance: false,
        can_submit_shift_requests: false,
        created_at: '',
        updated_at: ''
      });
    }
  };

  // シフトデータを取得
  const fetchShifts = async () => {
    if (!user?.employee_id) return;

    try {
      setLoading(true);
      const monthStr = currentMonth.toString().padStart(2, '0');
      
      // 権限に応じて取得するシフトを変更
      if (permissions?.can_view_other_shifts) {
        // 全従業員のシフトを取得
        const response = await apiClient.get(`/shifts/month?year=${currentYear}&month=${monthStr}`);
        setShifts(response.data || []);
      } else {
        // 自分のシフトのみ取得
        const response = await apiClient.get(`/shifts/month?year=${currentYear}&month=${monthStr}&employee_id=${user.employee_id}`);
        setShifts(response.data || []);
      }
    } catch (err: any) {
      console.error('シフト取得エラー:', err);
      setError('シフトデータの取得に失敗しました');
      setShifts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee_id) {
      fetchPermissions();
    }
  }, [user?.employee_id]);

  useEffect(() => {
    if (permissions) {
      fetchShifts();
    }
  }, [currentYear, currentMonth, user?.employee_id, permissions]);

  // 月を変更
  const changeMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // 指定日のシフトを取得
  const getShiftForDate = (date: string) => {
    return shifts.find(shift => shift.date === date);
  };

  // 月の日数を取得
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 曜日を取得
  const getDayOfWeek = (date: string) => {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return dayNames[new Date(date).getDay()];
  };

  // 日付クリック時の処理
  const handleDateClick = (date: string) => {
    if (permissions?.can_view_other_shifts) {
      // 権限がある場合はシフト詳細ページに遷移
      navigate(`/shift-detail/${date}`);
    }
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>シフト確認</h1>
        <div className={styles.monthSelector}>
          <button onClick={() => changeMonth('prev')} className={styles.monthButton}>
            ←
          </button>
          <span className={styles.currentMonth}>
            {currentYear}年{currentMonth}月
          </span>
          <button onClick={() => changeMonth('next')} className={styles.monthButton}>
            →
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* 権限情報表示 */}
      {permissions?.can_view_other_shifts && (
        <div className={styles.permissionInfo}>
          <span className={styles.permissionBadge}>他者シフト閲覧権限あり</span>
          <p className={styles.permissionText}>日付をクリックすると詳細を確認できます</p>
        </div>
      )}

      {/* シフトカレンダー */}
      <div className={styles.calendar}>
        {/* 曜日ヘッダー */}
        <div className={styles.weekHeader}>
          {['日', '月', '火', '水', '木', '金', '土'].map(day => (
            <div key={day} className={styles.weekDay}>{day}</div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className={styles.daysGrid}>
          {Array.from({ length: getDaysInMonth(currentYear, currentMonth) }, (_, i) => {
            const day = i + 1;
            const date = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const shift = getShiftForDate(date);
            const dayOfWeek = getDayOfWeek(date);
            const isToday = date === new Date().toISOString().split('T')[0];
            const isWeekend = dayOfWeek === '日' || dayOfWeek === '土';
            const isClickable = permissions?.can_view_other_shifts;

            return (
              <div 
                key={day} 
                className={`${styles.dayCell} ${isToday ? styles.today : ''} ${isWeekend ? styles.weekend : ''} ${isClickable ? styles.clickable : ''}`}
                onClick={() => isClickable && handleDateClick(date)}
              >
                <div className={styles.dayNumber}>{day}</div>
                <div className={styles.dayOfWeek}>{dayOfWeek}</div>
                {shift ? (
                  <div className={styles.shiftInfo}>
                    <div className={styles.shiftTime}>
                      {convertTimeFormat(shift.start_time)} - {convertTimeFormat(shift.end_time)}
                    </div>
                    {shift.break_time > 0 && (
                      <div className={styles.breakTime}>
                        休憩: {shift.break_time}分
                      </div>
                    )}
                    {permissions?.can_view_other_shifts && shift.employee_name && (
                      <div className={styles.employeeName}>
                        {shift.employee_name}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmployeeShiftView; 