import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shift, Employee } from '../types';
import apiClient from '../services/api';
import { convertTimeFormat } from '../utils/dateUtils';
import styles from './ShiftCalendar.module.css';

// シフト希望の型定義
interface ShiftRequest {
  id: number;
  employee_id: number;
  date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  status: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
}

const ShiftCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    startTime: '',
    endTime: '',
    breakTime: '0'
  });


  const [ganttStartHour, setGanttStartHour] = useState(0); // ガントチャート開始時間
  const [ganttEndHour, setGanttEndHour] = useState(24); // ガントチャート終了時間

  // カバレッジデータの型定義


  // 現在の年月を取得
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // 月別シフトを取得
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const monthStr = currentMonth.toString().padStart(2, '0');
      const url = `/shifts/month?year=${currentYear}&month=${monthStr}`;
      console.log('シフト取得URL:', url);
      
      const response = await apiClient.get(url);
      console.log('シフト取得レスポンス:', response.data);
      setShifts(response.data || []);
    } catch (err: any) {
      console.error('シフト取得エラー:', err);
      setError(err.response?.data?.error || 'シフトの取得に失敗しました');
      setShifts([]);
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

  // シフト希望一覧を取得
  const fetchShiftRequests = async () => {
    try {
      const monthStr = currentMonth.toString().padStart(2, '0');
      const response = await apiClient.get(`/shift-requests?year=${currentYear}&month=${monthStr}`);
      setShiftRequests(response.data || []);
    } catch (err: any) {
      console.error('シフト希望取得エラー:', err);
      setShiftRequests([]);
    }
  };



  // ガントチャート設定を取得
  const fetchGanttSettings = async () => {
    try {
      const response = await apiClient.get('/gantt-settings');
      if (response.data) {
        setGanttStartHour(response.data.start_hour || 0);
        setGanttEndHour(response.data.end_hour || 24);
      }
    } catch (err: any) {
      console.error('ガントチャート設定取得エラー:', err);
      // デフォルト値を使用
    }
  };

  useEffect(() => {
    fetchShifts();
    fetchShiftRequests();
    fetchEmployees();
    fetchGanttSettings();
  }, [currentYear, currentMonth]);

  // 初回読み込み時のエラーハンドリングを改善
  useEffect(() => {
    if (shifts === null) {
      setShifts([]);
    }
  }, [shifts]);

  // カレンダーの日付を生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  // 指定日のシフトを取得
  const getShiftsForDate = (date: Date) => {
    // ローカルタイムゾーンで日付を取得
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // シフトの日付を正規化（ISO形式からYYYY-MM-DD形式に変換）
    const dayShifts = shifts?.filter(shift => {
      const shiftDate = new Date(shift.date).toISOString().split('T')[0];
      return shiftDate === dateStr;
    }) || [];
    
    console.log(`日付 ${dateStr} のシフト:`, dayShifts);
    console.log('全シフト:', shifts);
    console.log('フィルタリング対象の日付:', dateStr);
    return dayShifts;
  };

  // 指定日のシフト希望を取得
  const getShiftRequestsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayRequests = shiftRequests?.filter(request => {
      const requestDate = new Date(request.date).toISOString().split('T')[0];
      return requestDate === dateStr;
    }) || [];
    
    return dayRequests;
  };

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

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 日付をクリックして詳細モーダルを開く
  const handleDateClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    navigate(`/shift-detail/${dateStr}`);
  };

  // シフト追加モーダルを開く
  const handleAddShiftClick = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    setSelectedDate(dateStr);
    setFormData({
      employeeId: '',
      date: dateStr,
      startTime: '',
      endTime: '',
      breakTime: '0'
    });
    setShowAddModal(true);
  };

  // シフトを追加
  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.startTime || !formData.endTime) {
      setError('必須項目を入力してください');
      return;
    }

    try {
      // 開始時間と終了時間を比較して日付をまたぐかどうかを判定
      const startHour = parseInt(formData.startTime.split(':')[0]);
      const startMinute = parseInt(formData.startTime.split(':')[1]);
      const endHour = parseInt(formData.endTime.split(':')[0]);
      const endMinute = parseInt(formData.endTime.split(':')[1]);
      
      const startTimeMinutes = startHour * 60 + startMinute;
      const endTimeMinutes = endHour * 60 + endMinute;
      
      // 終了時間が開始時間より早い場合は翌日として扱う
      const endDate = endTimeMinutes < startTimeMinutes 
        ? new Date(formData.date)
        : new Date(formData.date);
      
      if (endTimeMinutes < startTimeMinutes) {
        endDate.setDate(endDate.getDate() + 1);
      }
      
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // 開始日時と終了日時を組み合わせ
      const startDateTime = `${formData.date}T${formData.startTime}`;
      const endDateTime = `${endDateStr}T${formData.endTime}`;
      
      const response = await apiClient.post('/shifts', {
        employee_id: parseInt(formData.employeeId),
        date: formData.date,
        start_time: startDateTime,
        end_time: endDateTime,
        break_time: parseInt(formData.breakTime)
      });
      
      // 追加されたシフトに従業員名を含める
      const newShift = {
        ...response.data,
        employee_name: employees.find(emp => emp.id === parseInt(formData.employeeId))?.name || ''
      };
      
      setShifts(prev => {
        const updatedShifts = [...prev, newShift];
        console.log('更新後のシフト一覧:', updatedShifts);
        return updatedShifts;
      });
      setShowAddModal(false);
      setFormData({ employeeId: '', date: '', startTime: '', endTime: '', breakTime: '0' });
      setError('');
      
      console.log('シフトが追加されました:', newShift);
    } catch (err: any) {
      setError(err.response?.data?.error || 'シフトの追加に失敗しました');
      console.error('シフト追加エラー:', err);
    }
  };

  // シフトを削除
  const handleDeleteShift = async (shiftId: number) => {
    if (!window.confirm('このシフトを削除しますか？')) {
      return;
    }

    try {
      await apiClient.delete(`/shifts/${shiftId}`);
      setShifts(prev => prev.filter(shift => shift.id !== shiftId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'シフトの削除に失敗しました');
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowAddModal(false);
    setEditingShift(null);
    setFormData({ employeeId: '', date: '', startTime: '', endTime: '', breakTime: '0' });
    setError('');
  };



  const calendarDays = generateCalendarDays();

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>シフト管理</h1>
        <div className={styles.headerControls}>
          <div className={styles.monthNavigation}>
            <button onClick={() => changeMonth('prev')} className={styles.navButton}>
              ←
            </button>
            <span className={styles.currentMonth}>
              {currentYear}年{currentMonth}月
            </span>
            <button onClick={() => changeMonth('next')} className={styles.navButton}>
              →
            </button>
          </div>


        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.calendar}>
        <div className={styles.weekdays}>
          <div className={styles.weekday}>日</div>
          <div className={styles.weekday}>月</div>
          <div className={styles.weekday}>火</div>
          <div className={styles.weekday}>水</div>
          <div className={styles.weekday}>木</div>
          <div className={styles.weekday}>金</div>
          <div className={styles.weekday}>土</div>
        </div>

        <div className={styles.days}>
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const dayShifts = getShiftsForDate(date);
            const dayRequests = getShiftRequestsForDate(date);
            
            return (
              <div 
                key={index} 
                className={`${styles.day} ${!isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className={styles.dayNumber}>{date.getDate()}</div>
                
                                        {/* シフト数表示 */}
                        {(dayShifts.length > 0 || dayRequests.length > 0) && (
                          <div className={styles.daySummary}>
                            {dayShifts.length > 0 && (
                              <div className={styles.shiftCount}>
                                <span className={styles.countIcon}>📅</span>
                                <span className={styles.countText}>{dayShifts.length}</span>
                              </div>
                            )}
                            {dayRequests.length > 0 && (
                              <div className={styles.requestCount}>
                                <span className={styles.countIcon}>📝</span>
                                <span className={styles.countText}>{dayRequests.length}</span>
                              </div>
                            )}
                          </div>
                        )}
              </div>
            );
          })}
        </div>
      </div>



      {/* シフト追加モーダル */}
      {showAddModal && (
        <div className={`${styles.modalOverlay} ${styles.addShiftModal}`}>
          <div className={styles.modal}>
            <h2>シフトを追加</h2>
            <p className={styles.selectedDate}>日付: {(() => {
              const date = new Date(selectedDate);
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
              return `${year}/${month}/${day}（${weekday}）`;
            })()}</p>
            <form onSubmit={handleAddShift}>
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
                <label htmlFor="startTime">開始時間</label>
                <input
                  type="time"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="endTime">終了時間</label>
                <input
                  type="time"
                  id="endTime"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              {/* シフト希望表示エリア */}
              <div className={styles.formGroup}>
                <label>この日のシフト希望</label>
                <div className={styles.shiftRequestsList}>
                  {getShiftRequestsForDate(new Date(selectedDate)).length > 0 ? (
                    getShiftRequestsForDate(new Date(selectedDate)).map((request) => (
                      <div key={request.id} className={styles.shiftRequestItem}>
                        <span className={styles.requestEmployee}>{request.employee_name}</span>
                        <span className={styles.requestTime}>
                          {(() => {
                            const date = new Date(request.date);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const weekday = date.toLocaleDateString('ja-JP', { weekday: 'short' });
                            return `${year}/${month}/${day}（${weekday}）`;
                          })()} {convertTimeFormat(request.preferred_start_time)} - {convertTimeFormat(request.preferred_end_time)}
                        </span>
                        <span className={styles.requestStatus}>希望</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noRequests}>シフト希望はありません</div>
                  )}
                </div>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="breakTime">休憩時間（分）</label>
                <input
                  type="number"
                  id="breakTime"
                  name="breakTime"
                  value={formData.breakTime}
                  onChange={handleInputChange}
                  min="0"
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

export default ShiftCalendar; 