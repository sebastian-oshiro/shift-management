import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import apiClient from '../services/api';
import { convertTimeFormat, formatWorkHours, convertDateFormat } from '../utils/dateUtils';
import styles from './Attendance.module.css';

// UTC時間を日本時間に変換する関数
const convertToJST = (utcTimeString: string): string => {
  if (!utcTimeString) return '';
  
  const utcDate = new Date(utcTimeString);
  const jstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
  
  const hours = jstDate.getHours().toString().padStart(2, '0');
  const minutes = jstDate.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

// 日本時間での勤務時間計算
const calculateWorkHoursJST = (clockIn: string, clockOut: string): string => {
  if (!clockIn || !clockOut) return '0:00';
  
  const startTime = convertToJST(clockIn);
  const endTime = convertToJST(clockOut);
  
  if (!startTime || !endTime) return '0:00';
  
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  
  // 日付をまたぐ場合の処理
  if (end < start) {
    end.setDate(end.getDate() + 1);
  }
  
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours}:${minutes.toString().padStart(2, '0')}`;
};

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
  employee_name?: string;
}

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

const Attendance: React.FC = () => {
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    clockInTime: '',
    clockOutTime: ''
  });

  // 現在の年月を取得
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 勤怠記録を取得
  const fetchAttendances = async () => {
    try {
      setLoading(true);
      let url = '/attendance';
      const params = new URLSearchParams();

      if (selectedEmployee) {
        params.append('employee_id', selectedEmployee);
      }
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await apiClient.get(url);
      const attendances = response.data || [];
      // 日付順（新しい順）にソート
      attendances.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setAttendances(attendances);
    } catch (err: any) {
      console.error('勤怠取得エラー:', err);
      setError(err.response?.data?.error || '勤怠記録の取得に失敗しました');
      setAttendances([]);
    } finally {
      setLoading(false);
    }
  };

  // 従業員一覧を取得
  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || '従業員一覧の取得に失敗しました');
      setEmployees([]);
    }
  };

  // シフト一覧を取得（比較用）
  const fetchShifts = async () => {
    try {
      const monthStr = currentMonth.toString().padStart(2, '0');
      const response = await apiClient.get(`/shifts/month?year=${currentYear}&month=${monthStr}`);
      setShifts(response.data || []);
    } catch (err: any) {
      console.error('シフト取得エラー:', err);
      setShifts([]);
    }
  };

  useEffect(() => {
    fetchAttendances();
    fetchEmployees();
    fetchShifts();
  }, [selectedEmployee, startDate, endDate, currentYear, currentMonth]);

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 勤怠記録を追加
  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.date) {
      setError('必須項目を入力してください');
      return;
    }

    try {
      const response = await apiClient.post('/attendance', {
        employee_id: parseInt(formData.employeeId),
        date: formData.date,
        clock_in_time: formData.clockInTime || null,
        clock_out_time: formData.clockOutTime || null
      });
      
      setAttendances(prev => [response.data, ...prev]);
      setShowAddModal(false);
      setFormData({ employeeId: '', date: '', clockInTime: '', clockOutTime: '' });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '勤怠記録の追加に失敗しました');
    }
  };

  // 勤怠記録を削除
  const handleDeleteAttendance = async (attendanceId: number) => {
    if (!window.confirm('この勤怠記録を削除しますか？')) {
      return;
    }

    try {
      await apiClient.delete(`/attendance/${attendanceId}`);
      setAttendances(prev => prev.filter(att => att.id !== attendanceId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '勤怠記録の削除に失敗しました');
    }
  };

  // 出勤記録
  const handleClockIn = async (employeeId: number) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);

    try {
      await apiClient.post('/attendance/clock-in', {
        employee_id: employeeId,
        date: date,
        time: time
      });
      
      fetchAttendances(); // 一覧を再取得
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '出勤記録に失敗しました');
    }
  };

  // 退勤記録
  const handleClockOut = async (employeeId: number) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);

    try {
      await apiClient.post('/attendance/clock-out', {
        employee_id: employeeId,
        date: date,
        time: time
      });
      
      fetchAttendances(); // 一覧を再取得
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '退勤記録に失敗しました');
    }
  };

  // 指定日のシフトを取得
  const getShiftForDate = (date: string, employeeId: number) => {
    return shifts.find(shift => 
      shift.date === date && shift.employee_id === employeeId
    );
  };





  // モーダルを閉じる
  const closeModal = () => {
    setShowAddModal(false);
    setEditingAttendance(null);
    setFormData({ employeeId: '', date: '', clockInTime: '', clockOutTime: '' });
    setError('');
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>勤怠管理</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className={styles.addButton}
        >
          勤怠記録を追加
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* フィルター */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="employee">従業員:</label>
          <select
            id="employee"
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className={styles.select}
          >
            <option value="">全員</option>
            {employees.map(employee => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="startDate">開始日:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.input}
          />
          <small className={styles.helpText}>表示する期間の開始日を設定</small>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="endDate">終了日:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.input}
          />
          <small className={styles.helpText}>表示する期間の終了日を設定</small>
        </div>
      </div>



      {/* 勤怠一覧 */}
      <div className={styles.attendanceList}>
        <h2>勤怠記録一覧</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>日付</th>
                <th>従業員</th>
                <th>出勤時間</th>
                <th>退勤時間</th>
                <th>勤務時間</th>
                <th>勤怠状態</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map(attendance => {
                const shift = getShiftForDate(attendance.date, attendance.employee_id);
                const workTime = calculateWorkHoursJST(
                  attendance.clock_in_time || '', 
                  attendance.clock_out_time || ''
                );
                
                // デバッグ用ログ
                console.log('勤務時間計算:', {
                  employee: attendance.employee_name,
                  clockIn: attendance.clock_in_time,
                  clockOut: attendance.clock_out_time,
                  workTime: workTime
                });
                
                return (
                  <tr key={attendance.id}>
                    <td>{(() => {
                      const date = new Date(attendance.date);
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
                      return `${year}/${month}/${day}（${weekday}）`;
                    })()}</td>
                    <td>{attendance.employee_name}</td>
                    <td>{convertToJST(attendance.clock_in_time || '') || '-'}</td>
                    <td>{convertToJST(attendance.clock_out_time || '') || '-'}</td>
                    <td>
                      {workTime !== '0:00' ? (
                        attendance.clock_out_time ? 
                          workTime : 
                          `${workTime} (進行中)`
                      ) : attendance.clock_in_time ? 
                        '0:00' : '-'}
                    </td>
                    <td>
                      <div className={styles.actions}>
                        {!attendance.clock_in_time ? (
                          <button
                            onClick={() => handleClockIn(attendance.employee_id)}
                            className={styles.clockInButton}
                            title="現在時刻で出勤を記録します"
                          >
                            出勤
                          </button>
                        ) : !attendance.clock_out_time ? (
                          <span className={styles.statusBadge + ' ' + styles.working}>
                            出勤中
                          </span>
                        ) : (
                          <span className={styles.statusBadge + ' ' + styles.completed}>
                            退勤済み
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteAttendance(attendance.id)}
                          className={styles.deleteButton}
                          title="この勤怠記録を削除します"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 勤怠記録追加モーダル */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>勤怠記録を追加</h2>
            <form onSubmit={handleAddAttendance}>
              <div className={styles.formGroup}>
                <label htmlFor="employeeId">従業員</label>
                <select
                  id="employeeId"
                  name="employeeId"
                  value={formData.employeeId}
                  onChange={handleInputChange}
                  required
                  className={styles.select}
                >
                  <option value="">従業員を選択</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="date">日付</label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="clockInTime">出勤時間</label>
                <input
                  type="time"
                  id="clockInTime"
                  name="clockInTime"
                  value={formData.clockInTime}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="clockOutTime">退勤時間</label>
                <input
                  type="time"
                  id="clockOutTime"
                  name="clockOutTime"
                  value={formData.clockOutTime}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>
                  キャンセル
                </button>
                <button type="submit" className={styles.submitButton}>
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance; 