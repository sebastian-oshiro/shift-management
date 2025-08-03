import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { convertTimeFormat } from '../utils/dateUtils';
import styles from './EmployeeAttendance.module.css';

// 勤怠データの型定義
interface Attendance {
  id: number;
  employee_id: number;
  date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  actual_hours?: number;
  status: string;
  created_at: string;
  updated_at: string;
}

const EmployeeAttendance: React.FC = () => {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 勤怠データを取得
  const fetchAttendances = async () => {
    if (!user?.employee_id) return;

    try {
      setLoading(true);
      const response = await apiClient.get(`/attendance?employee_id=${user.employee_id}`);
      const data = response.data || [];
      
      // 日付でソート（新しい順）
      const sortedData = data.sort((a: Attendance, b: Attendance) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      setAttendances(sortedData);
    } catch (err: any) {
      console.error('勤怠取得エラー:', err);
      setError('勤怠データの取得に失敗しました');
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee_id) {
      fetchAttendances();
    }
  }, [user?.employee_id]);

  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
    return `${year}/${month}/${day}（${weekday}）`;
  };

  // 勤務時間を計算
  const calculateWorkHours = (clockIn: string, clockOut: string) => {
    if (!clockIn || !clockOut) return '0時間0分';
    
    const start = new Date(`2000-01-01T${clockIn}`);
    const end = new Date(`2000-01-01T${clockOut}`);
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}時間${minutes}分`;
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>勤怠履歴</h1>
        <p className={styles.subtitle}>{user?.name}さんの勤怠記録</p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.content}>
        {attendances.length > 0 ? (
          <div className={styles.attendanceList}>
            {attendances.map(attendance => (
              <div key={attendance.id} className={styles.attendanceCard}>
                <div className={styles.dateInfo}>
                  <span className={styles.date}>{formatDate(attendance.date)}</span>
                  <span className={styles.status}>
                    {attendance.status === 'completed' ? '完了' : 
                     attendance.status === 'clocked_in' ? '出勤中' : '未記録'}
                  </span>
                </div>
                
                <div className={styles.timeInfo}>
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>出勤時間:</span>
                    <span className={styles.timeValue}>
                      {attendance.clock_in_time ? convertTimeFormat(attendance.clock_in_time) : '未記録'}
                    </span>
                  </div>
                  <div className={styles.timeItem}>
                    <span className={styles.timeLabel}>退勤時間:</span>
                    <span className={styles.timeValue}>
                      {attendance.clock_out_time ? convertTimeFormat(attendance.clock_out_time) : '未記録'}
                    </span>
                  </div>
                  {attendance.clock_in_time && attendance.clock_out_time && (
                    <div className={styles.timeItem}>
                      <span className={styles.timeLabel}>勤務時間:</span>
                      <span className={styles.timeValue}>
                        {calculateWorkHours(attendance.clock_in_time, attendance.clock_out_time)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>
            <h2>📊 勤怠記録がありません</h2>
            <p>まだ勤怠記録がありません。</p>
            <p>ダッシュボードから出退勤を記録してください。</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeAttendance; 