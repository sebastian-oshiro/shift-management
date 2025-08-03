import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import styles from './ShiftRequestForm.module.css';

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

const ShiftRequestForm: React.FC = () => {
  const { user } = useAuth();
  const [shiftRequests, setShiftRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [formData, setFormData] = useState({
    date: '',
    preferredStartTime: '',
    preferredEndTime: ''
  });

  // 現在の年月を取得
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // シフト希望一覧を取得
  const fetchShiftRequests = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/shift-requests?employee_id=${user?.employee_id}`);
      setShiftRequests(response.data || []);
    } catch (err: any) {
      console.error('シフト希望取得エラー:', err);
      setError(err.response?.data?.error || 'シフト希望の取得に失敗しました');
      setShiftRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee_id) {
      fetchShiftRequests();
    }
  }, [user?.employee_id]);

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // シフト希望を追加
  const handleAddShiftRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.preferredStartTime || !formData.preferredEndTime) {
      setError('必須項目を入力してください');
      return;
    }

    try {
      const response = await apiClient.post('/shift-requests', {
        employee_id: user?.employee_id,
        date: formData.date,
        preferred_start_time: formData.preferredStartTime,
        preferred_end_time: formData.preferredEndTime
      });
      
      setShiftRequests(prev => [response.data, ...prev]);
      setShowAddModal(false);
      setFormData({ date: '', preferredStartTime: '', preferredEndTime: '' });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'シフト希望の提出に失敗しました');
    }
  };

  // シフト希望を削除
  const handleDeleteShiftRequest = async (requestId: number) => {
    if (!window.confirm('このシフト希望を削除しますか？')) {
      return;
    }

    try {
      await apiClient.delete(`/shift-requests/${requestId}`);
      setShiftRequests(prev => prev.filter(req => req.id !== requestId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'シフト希望の削除に失敗しました');
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowAddModal(false);
    setFormData({ date: '', preferredStartTime: '', preferredEndTime: '' });
    setError('');
  };

  // ステータスの日本語表示
  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted': return '提出済み';
      case 'processed': return '処理済み';
      default: return status;
    }
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

  // 月の日数を取得
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  // 曜日を取得
  const getDayOfWeek = (date: string) => {
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return dayNames[new Date(date).getDay()];
  };

  // 指定日のシフト希望を取得
  const getShiftRequestForDate = (date: string) => {
    return shiftRequests.find(request => request.date === date);
  };

  // 日付クリック時の処理
  const handleDateClick = (date: string) => {
    const existingRequest = getShiftRequestForDate(date);
    if (existingRequest) {
      // 既存の希望がある場合は削除確認
      if (window.confirm('この日のシフト希望を削除しますか？')) {
        handleDeleteShiftRequest(existingRequest.id);
      }
    } else {
      // 新しい希望を追加
      setFormData(prev => ({ ...prev, date }));
      setShowAddModal(true);
    }
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>シフト希望提出</h1>
        <div className={styles.headerInfo}>
          <p className={styles.infoText}>日付をクリックしてシフト希望を提出できます</p>
          <p className={styles.infoText}>既に提出済みの日付をクリックすると削除できます</p>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* シフト希望カレンダー */}
      <section className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <h2 className={styles.sectionTitle}>シフト希望カレンダー</h2>
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

        {/* カレンダー */}
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
              const shiftRequest = getShiftRequestForDate(date);
              const dayOfWeek = getDayOfWeek(date);
              const isToday = date === new Date().toISOString().split('T')[0];
              const isWeekend = dayOfWeek === '日' || dayOfWeek === '土';
              const isPast = new Date(date) < new Date(new Date().toISOString().split('T')[0]);

              return (
                <div 
                  key={day} 
                  className={`${styles.dayCell} ${isToday ? styles.today : ''} ${isWeekend ? styles.weekend : ''} ${isPast ? styles.past : ''} ${shiftRequest ? styles.hasRequest : ''}`}
                  onClick={() => !isPast && handleDateClick(date)}
                >
                  <div className={styles.dayNumber}>{day}</div>
                  <div className={styles.dayOfWeek}>{dayOfWeek}</div>
                  {shiftRequest ? (
                    <div className={styles.requestInfo}>
                      <div className={styles.requestTime}>
                        {shiftRequest.preferred_start_time} - {shiftRequest.preferred_end_time}
                      </div>
                      <div className={styles.requestStatus}>
                        <span className={`${styles.statusBadge} ${styles[shiftRequest.status]}`}>
                          {getStatusText(shiftRequest.status)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    !isPast && <div className={styles.noRequest}>クリックして希望提出</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* シフト希望提出モーダル */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>シフト希望を提出</h2>
            <p className={styles.selectedDate}>
              選択日: {(() => {
                const date = new Date(formData.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const weekday = date.toLocaleDateString('ja-JP', { weekday: 'long' });
                return `${year}年${month}月${day}日（${weekday}）`;
              })()}
            </p>
            <form onSubmit={handleAddShiftRequest}>
              <div className={styles.formGroup}>
                <label htmlFor="preferredStartTime">希望開始時間</label>
                <input
                  type="time"
                  id="preferredStartTime"
                  name="preferredStartTime"
                  value={formData.preferredStartTime}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="preferredEndTime">希望終了時間</label>
                <input
                  type="time"
                  id="preferredEndTime"
                  name="preferredEndTime"
                  value={formData.preferredEndTime}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>
                  キャンセル
                </button>
                <button type="submit" className={styles.submitButton}>
                  提出
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftRequestForm; 