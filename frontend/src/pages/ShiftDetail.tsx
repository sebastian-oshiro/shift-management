import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shift, Employee } from '../types';
import apiClient from '../services/api';
import { convertTimeFormat } from '../utils/dateUtils';
import styles from './ShiftDetail.module.css';

// UTC時間を日本時間に変換する関数
const convertToJST = (utcTimeString: string): string => {
  if (!utcTimeString) return '';
  
  const utcDate = new Date(utcTimeString);
  const jstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
  
  const hours = jstDate.getHours().toString().padStart(2, '0');
  const minutes = jstDate.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
};

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

const ShiftDetail: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ganttStartHour, setGanttStartHour] = useState(0);
  const [ganttEndHour, setGanttEndHour] = useState(24);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    startTime: '',
    endTime: '',
    breakTime: '0'
  });

  // 日付をDateオブジェクトに変換
  const selectedDate = date ? new Date(date) : new Date();

  // 月別シフトを取得
  const fetchShifts = async () => {
    try {
      setLoading(true);
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const url = `/shifts/month?year=${year}&month=${month}`;
      
      const response = await apiClient.get(url);
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
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const response = await apiClient.get(`/shift-requests?year=${year}&month=${month}`);
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
  }, [date]);

  // 指定日のシフトを取得
  const getShiftsForDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    const dayShifts = shifts?.filter(shift => {
      const shiftDate = new Date(shift.date).toISOString().split('T')[0];
      return shiftDate === dateStr;
    }) || [];
    
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

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // シフトを追加
  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.employeeId || !formData.startTime || !formData.endTime) {
      setError('すべての項目を入力してください');
      return;
    }

    try {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const shiftData = {
        employee_id: parseInt(formData.employeeId),
        date: dateStr,
        start_time: `${dateStr}T${formData.startTime}:00`,
        end_time: `${dateStr}T${formData.endTime}:00`,
        break_time: parseInt(formData.breakTime)
      };

      const response = await apiClient.post('/shifts', shiftData);
      setShifts(prev => [...prev, response.data]);
      setShowAddModal(false);
      setFormData({
        employeeId: '',
        startTime: '',
        endTime: '',
        breakTime: '0'
      });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'シフトの追加に失敗しました');
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowAddModal(false);
    setFormData({
      employeeId: '',
      startTime: '',
      endTime: '',
      breakTime: '0'
    });
    setError('');
  };

  // 削除モーダルを閉じる
  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setError('');
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

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  const dayShifts = getShiftsForDate(selectedDate);
  const dayRequests = getShiftRequestsForDate(selectedDate);

  // デバッグ用ログ
  console.log('ガントチャート設定:', { ganttStartHour, ganttEndHour });
  console.log('その日のシフト数:', dayShifts.length);
  console.log('シフト一覧:', dayShifts.map(s => ({ name: s.employee_name, start: s.start_time, end: s.end_time })));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {selectedDate.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })} のシフト
        </h1>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* シフト希望 */}
      {dayRequests.length > 0 && (
        <section className={styles.shiftRequestsSection}>
          <h2 className={styles.sectionTitle}>シフト希望</h2>
          <div className={styles.shiftRequestsList}>
            {dayRequests.map(request => (
              <div key={request.id} className={styles.shiftRequestItem}>
                <span className={styles.requestEmployee}>{request.employee_name}</span>
                <span className={styles.requestTime}>
                  {convertTimeFormat(request.preferred_start_time)} - {convertTimeFormat(request.preferred_end_time)}
                </span>
                <span className={styles.requestStatus}>{request.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* シフトガントチャート */}
      <section className={styles.shiftsSection}>
        <h2 className={styles.sectionTitle}>シフトタイムライン</h2>
        
        {dayShifts.length > 0 ? (
          <div className={styles.ganttChart}>
            {/* 時間軸ヘッダー */}
            <div className={styles.ganttHeader}>
              <div className={styles.dayLabel}></div>
              {Array.from({ length: ganttEndHour - ganttStartHour }, (_, index) => {
                const hour = ganttStartHour + index;
                return (
                  <div key={hour} className={styles.timeLabel}>
                    {hour.toString().padStart(2, '0')}:00
                  </div>
                );
              })}
            </div>
            
            {/* 従業員別のガントチャート */}
            {dayShifts
              .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
              .map(shift => {
                // デバッグ用ログ
                console.log('シフト処理中:', shift.employee_name, '開始:', shift.start_time, '終了:', shift.end_time);
                
                // UTC時間を日本時間に変換
                const startTime = new Date(shift.start_time);
                const endTime = new Date(shift.end_time);
                
                // 日本時間のオフセット（+9時間）を適用
                const jstStartTime = new Date(startTime.getTime() + (9 * 60 * 60 * 1000));
                const jstEndTime = new Date(endTime.getTime() + (9 * 60 * 60 * 1000));
                
                const startHour = jstStartTime.getHours();
                let endHour = jstEndTime.getHours();
                
                // 日付をまたぐシフトの処理
                if (endHour < startHour) {
                  endHour += 24;
                }
                
                // ガントチャート設定に基づいて位置を計算
                const totalHours = ganttEndHour - ganttStartHour;
                
                // 開始時間が設定範囲外の場合は調整
                let adjustedStartHour = startHour;
                let adjustedEndHour = endHour;
                
                if (startHour < ganttStartHour) {
                  adjustedStartHour = ganttStartHour;
                }
                if (endHour > ganttEndHour) {
                  adjustedEndHour = ganttEndHour;
                }
                
                // デバッグ用ログ
                console.log('時間計算:', {
                  employee: shift.employee_name,
                  startHour,
                  endHour,
                  ganttStartHour,
                  ganttEndHour,
                  adjustedStartHour,
                  adjustedEndHour,
                  condition: adjustedEndHour > ganttStartHour && adjustedStartHour < ganttEndHour
                });

                // シフトが表示範囲と重なる場合のみ表示
                if (adjustedEndHour > ganttStartHour && adjustedStartHour < ganttEndHour) {
                  const left = ((adjustedStartHour - ganttStartHour) / totalHours) * 100;
                  const width = ((adjustedEndHour - adjustedStartHour) / totalHours) * 100;
                  
                  return (
                    <div key={shift.id} className={styles.ganttRow}>
                      <div className={styles.dayLabel}>
                        {shift.employee_name}
                      </div>
                      <div className={styles.ganttTimeline}>
                        <div
                          className={styles.ganttBar}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`
                          }}
                          title={`${shift.employee_name}: ${convertToJST(shift.start_time)} - ${convertToJST(shift.end_time)}`}
                        >
                          <div className={styles.ganttBarContent}>
                            <span className={styles.ganttTime}>
                              {convertToJST(shift.start_time)}-{convertToJST(shift.end_time)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteShift(shift.id)}
                            className={styles.ganttDeleteButton}
                            title="シフトを削除"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
          </div>
        ) : (
          <div className={styles.noData}>
            この日にはシフトがありません
          </div>
        )}
      </section>

      {/* アクションボタン */}
      <div className={styles.actionButtons}>
        <button 
          onClick={() => setShowAddModal(true)}
          className={styles.actionButton}
        >
          📅 シフトを追加
        </button>
        <button 
          onClick={() => setShowDeleteModal(true)}
          className={`${styles.actionButton} ${styles.deleteButton}`}
        >
          🗑️ シフト削除
        </button>
      </div>

      {/* シフト追加モーダル */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>シフトを追加</h2>
            <p className={styles.selectedDate}>日付: {(() => {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              const weekday = selectedDate.toLocaleDateString('ja-JP', { weekday: 'short' });
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
                />
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
                  max="480"
                />
              </div>
              
              {/* シフト希望表示エリア */}
              <div className={styles.formGroup}>
                <label>この日のシフト希望</label>
                <div className={styles.shiftRequestsList}>
                  {dayRequests.length > 0 ? (
                    dayRequests.map((request) => (
                      <div key={request.id} className={styles.shiftRequestItem}>
                        <span className={styles.requestEmployee}>{request.employee_name}</span>
                        <span className={styles.requestTime}>
                          {(() => {
                            const year = selectedDate.getFullYear();
                            const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const day = String(selectedDate.getDate()).padStart(2, '0');
                            const weekday = selectedDate.toLocaleDateString('ja-JP', { weekday: 'short' });
                            return `${year}/${month}/${day}（${weekday}）`;
                          })()} {convertToJST(request.preferred_start_time)} - {convertToJST(request.preferred_end_time)}
                        </span>
                        <span className={styles.requestStatus}>希望</span>
                      </div>
                    ))
                  ) : (
                    <div className={styles.noRequests}>シフト希望はありません</div>
                  )}
                </div>
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

      {/* シフト削除モーダル */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>シフト削除</h2>
            <p className={styles.selectedDate}>日付: {(() => {
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              const weekday = selectedDate.toLocaleDateString('ja-JP', { weekday: 'short' });
              return `${year}/${month}/${day}（${weekday}）`;
            })()}</p>
            
            {dayShifts.length > 0 ? (
              <div className={styles.shiftsList}>
                {dayShifts.map(shift => (
                  <div key={shift.id} className={styles.shiftItem}>
                    <div className={styles.shiftInfo}>
                      <div className={styles.shiftEmployee}>{shift.employee_name}</div>
                      <div className={styles.shiftTime}>
                        {convertToJST(shift.start_time)} - {convertToJST(shift.end_time)}
                      </div>
                      <div className={styles.shiftBreak}>
                        休憩: {shift.break_time}分
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteShift(shift.id)}
                      className={styles.deleteShiftButton}
                      title="このシフトを削除"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.noShifts}>この日にはシフトがありません</div>
            )}

            <div className={styles.modalActions}>
              <button type="button" onClick={closeDeleteModal} className={styles.cancelButton}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftDetail; 