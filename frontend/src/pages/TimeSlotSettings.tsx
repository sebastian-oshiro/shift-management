import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { convertTimeFormat } from '../utils/dateUtils';
import styles from './TimeSlotSettings.module.css';

// 時間帯設定の型定義
interface TimeSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  position: string;
  required_count: number;
  created_at: string;
  updated_at: string;
}



const TimeSlotSettings: React.FC = () => {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTimeSlot, setEditingTimeSlot] = useState<TimeSlot | null>(null);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: '',
    endTime: '',
    position: '',
    requiredCount: 1
  });

  // 複数曜日選択用の状態
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // デフォルトで月曜日を選択
  const [useMultipleDays, setUseMultipleDays] = useState(false);

  // ガントチャート設定用の状態
  const [ganttStartHour, setGanttStartHour] = useState(0);
  const [ganttEndHour, setGanttEndHour] = useState(24);
  const [showGanttSettings, setShowGanttSettings] = useState(false);

  // ガントチャートの表示範囲を計算（設定がない場合のデフォルト値）
  const displayStartHour = ganttStartHour;
  const displayEndHour = ganttEndHour;

  // 曜日の日本語名
  const dayOfWeekNames = {
    0: '日曜日',
    1: '月曜日',
    2: '火曜日',
    3: '水曜日',
    4: '木曜日',
    5: '金曜日',
    6: '土曜日'
  };

  // 時間帯設定を取得
  const fetchTimeSlots = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/time-slots');
      setTimeSlots(response.data || []);
    } catch (err: any) {
      console.error('時間帯設定取得エラー:', err);
      setError(err.response?.data?.error || '時間帯設定の取得に失敗しました');
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  // ガントチャート設定を取得
  const fetchGanttSettings = async () => {
    try {
      const response = await apiClient.get('/gantt-settings');
      if (response.data) {
        setGanttStartHour(response.data.start_hour || 0);
        setGanttEndHour(response.data.end_hour || 24);
        console.log('ガントチャート設定を取得しました:', response.data);
      }
    } catch (err: any) {
      console.error('ガントチャート設定取得エラー:', err);
      console.error('エラーレスポンス:', err.response?.data);
      // デフォルト値を使用
    }
  };

  // ガントチャート設定を保存
  const saveGanttSettings = async () => {
    try {
      console.log('保存する設定:', { start_hour: ganttStartHour, end_hour: ganttEndHour });
      const response = await apiClient.post('/gantt-settings', {
        start_hour: ganttStartHour,
        end_hour: ganttEndHour
      });
      console.log('保存成功:', response.data);
      setShowGanttSettings(false);
    } catch (err: any) {
      console.error('ガントチャート設定保存エラー:', err);
      console.error('エラーレスポンス:', err.response?.data);
      setError(`ガントチャート設定の保存に失敗しました: ${err.response?.data?.error || err.message}`);
    }
  };

  useEffect(() => {
    fetchTimeSlots();
    fetchGanttSettings();
  }, []);

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('入力変更:', name, value); // デバッグ用
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: name === 'dayOfWeek' || name === 'requiredCount' ? parseInt(value) : value
      };
      console.log('新しいフォームデータ:', newData); // デバッグ用
      return newData;
    });
  };

  // 複数曜日選択の処理
  const handleDaySelection = (dayOfWeek: number) => {
    setSelectedDays(prev => {
      if (prev.includes(dayOfWeek)) {
        // 選択解除（最低1つは選択状態を保つ）
        const newSelection = prev.filter(day => day !== dayOfWeek);
        return newSelection.length > 0 ? newSelection : [dayOfWeek];
      } else {
        // 選択追加
        return [...prev, dayOfWeek].sort();
      }
    });
  };

  // 曜日選択モードの切り替え
  const handleModeToggle = () => {
    setUseMultipleDays(!useMultipleDays);
    if (!useMultipleDays) {
      // 複数選択モードに切り替える場合、現在の曜日を選択状態にする
      setSelectedDays([formData.dayOfWeek]);
    } else {
      // 単一選択モードに切り替える場合、最初の選択された曜日を設定
      setFormData(prev => ({ ...prev, dayOfWeek: selectedDays[0] }));
    }
  };

  // 時間帯設定を追加
  const handleAddTimeSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('フォームデータ:', formData); // デバッグ用
    console.log('選択された曜日:', selectedDays); // デバッグ用
    
    if (!formData.startTime || !formData.endTime) {
      setError('開始時間と終了時間は必須です');
      console.log('バリデーションエラー: 時間が不足'); // デバッグ用
      return;
    }

    try {
      console.log('APIリクエスト送信開始'); // デバッグ用
      
      // 選択された曜日に対して時間帯設定を作成
      const promises = selectedDays.map(async (dayOfWeek) => {
        const response = await apiClient.post('/time-slots', {
          day_of_week: dayOfWeek,
          start_time: formData.startTime,
          end_time: formData.endTime,
          position: formData.position || '', // 空の場合は空文字列を送信
          required_count: formData.requiredCount
        });
        return response.data;
      });
      
      const results = await Promise.all(promises);
      console.log('APIレスポンス:', results); // デバッグ用
      
      setTimeSlots(prev => [...prev, ...results]);
      setShowAddModal(false);
      setFormData({ dayOfWeek: 1, startTime: '', endTime: '', position: '', requiredCount: 1 });
      setSelectedDays([1]); // デフォルトに戻す
      setUseMultipleDays(false); // モードをリセット
      setError('');
    } catch (err: any) {
      console.error('APIエラー詳細:', err); // デバッグ用
      console.error('エラーレスポンス:', err.response?.data); // デバッグ用
      
      let errorMessage = '時間帯設定の追加に失敗しました';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  // 時間帯設定を削除
  const handleDeleteTimeSlot = async (timeSlotId: number) => {
    if (!window.confirm('この時間帯設定を削除しますか？')) {
      return;
    }

    try {
      await apiClient.delete(`/time-slots/${timeSlotId}`);
      setTimeSlots(prev => prev.filter(ts => ts.id !== timeSlotId));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '時間帯設定の削除に失敗しました');
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    console.log('モーダルを閉じる'); // デバッグ用
    setShowAddModal(false);
    setEditingTimeSlot(null);
    setFormData({ dayOfWeek: 1, startTime: '', endTime: '', position: '', requiredCount: 1 });
    setSelectedDays([1]); // デフォルトに戻す
    setUseMultipleDays(false); // モードをリセット
    setError('');
  };

  // 曜日別に時間帯設定をグループ化
  const groupedTimeSlots = timeSlots.reduce((groups, timeSlot) => {
    const day = timeSlot.day_of_week;
    if (!groups[day]) {
      groups[day] = [];
    }
    groups[day].push(timeSlot);
    return groups;
  }, {} as Record<number, TimeSlot[]>);

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>時間帯設定</h1>
        <div className={styles.headerButtons}>
          <button 
            onClick={() => setShowGanttSettings(true)}
            className={styles.settingsButton}
          >
            ⚙️ ガントチャート設定
          </button>
          <button 
            onClick={() => {
              console.log('追加ボタンがクリックされました'); // デバッグ用
              setShowAddModal(true);
            }}
            className={styles.addButton}
          >
            時間帯設定を追加
          </button>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}



      {/* 時間帯設定ガントチャート */}
      <section className={styles.timeSlotsSection}>
        <h2 className={styles.sectionTitle}>時間帯設定ガントチャート</h2>
        
        {Object.keys(groupedTimeSlots).length > 0 ? (
          <div className={styles.ganttChart}>
            {/* 時間軸ヘッダー */}
            <div className={styles.ganttHeader}>
              <div className={styles.dayLabel}></div>
              {Array.from({ length: displayEndHour - displayStartHour }, (_, i) => {
                const hour = displayStartHour + i;
                const displayHour = hour >= 24 ? hour - 24 : hour;
                return (
                  <div key={hour} className={styles.timeLabel}>
                    <div>{displayHour.toString().padStart(2, '0')}:00</div>
                  </div>
                );
              })}
            </div>
            
            {/* 曜日別のガントチャート */}
            {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => {
              const daySlots = groupedTimeSlots[dayOfWeek] || [];
              return (
                <div key={dayOfWeek} className={styles.ganttRow}>
                  <div className={styles.dayLabel}>
                    {dayOfWeekNames[dayOfWeek as keyof typeof dayOfWeekNames]}
                  </div>
                  <div className={styles.ganttTimeline}>
                    {daySlots.map(slot => {
                      const startHour = parseInt(convertTimeFormat(slot.start_time).split(':')[0]);
                      const startMinute = parseInt(convertTimeFormat(slot.start_time).split(':')[1]);
                      const endHour = parseInt(convertTimeFormat(slot.end_time).split(':')[0]);
                      const endMinute = parseInt(convertTimeFormat(slot.end_time).split(':')[1]);
                      
                                                                   const timeRange = displayEndHour - displayStartHour;
                      const startPosition = Math.max((startHour + startMinute / 60 - displayStartHour) / timeRange * 100, 0);
                      const width = Math.max(((endHour + endMinute / 60) - (startHour + startMinute / 60)) / timeRange * 100, 2);
                      
                      return (
                        <div
                          key={slot.id}
                          className={styles.ganttBar}
                          style={{
                            left: `${startPosition}%`,
                            width: `${width}%`
                          }}
                                                     title={`${convertTimeFormat(slot.start_time)} - ${convertTimeFormat(slot.end_time)} | ${slot.required_count}人`}
                        >
                          <div className={styles.ganttBarContent}>
                                                       <span className={styles.ganttTime}>
                             {convertTimeFormat(slot.start_time)}-{convertTimeFormat(slot.end_time)}
                           </span>
                           <span className={styles.ganttCount}>
                             {slot.required_count}人
                           </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTimeSlot(slot.id);
                            }}
                            className={styles.ganttDeleteButton}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.noData}>
            時間帯設定がありません
          </div>
        )}
      </section>

      {/* 時間帯設定追加モーダル */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>時間帯設定を追加</h2>
            <form onSubmit={handleAddTimeSlot}>
              <div className={styles.formGroup}>
                <div className={styles.modeToggle}>
                  <label>
                    <input
                      type="checkbox"
                      checked={useMultipleDays}
                      onChange={handleModeToggle}
                      className={styles.checkbox}
                    />
                    複数曜日を一斉設定
                  </label>
                </div>
                
                {useMultipleDays ? (
                  <div className={styles.multipleDaysSelection}>
                    <label>曜日を選択</label>
                    <div className={styles.daysGrid}>
                      {Object.entries(dayOfWeekNames).map(([value, name]) => (
                        <label key={value} className={styles.dayCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedDays.includes(parseInt(value))}
                            onChange={() => handleDaySelection(parseInt(value))}
                            className={styles.checkbox}
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                    <small className={styles.helpText}>
                      複数の曜日を選択すると、同じ時間帯設定が一斉に作成されます
                    </small>
                  </div>
                ) : (
                  <div className={styles.singleDaySelection}>
                    <label htmlFor="dayOfWeek">曜日</label>
                    <select
                      id="dayOfWeek"
                      name="dayOfWeek"
                      value={formData.dayOfWeek}
                      onChange={handleInputChange}
                      required
                      className={styles.select}
                    >
                      {Object.entries(dayOfWeekNames).map(([value, name]) => (
                        <option key={value} value={value}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
              <div className={styles.formGroup}>
                <label htmlFor="position">メモ（任意）</label>
                <input
                  type="text"
                  id="position"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="例: ホール担当、キッチン補助など"
                  className={styles.input}
                />
                <small className={styles.helpText}>
                  時間帯に関するメモを自由に入力できます（任意項目）
                </small>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="requiredCount">必要人数</label>
                <input
                  type="number"
                  id="requiredCount"
                  name="requiredCount"
                  value={formData.requiredCount}
                  onChange={handleInputChange}
                  min="1"
                  required
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

      {/* ガントチャート設定モーダル */}
      {showGanttSettings && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>ガントチャート設定</h2>
            <p>この設定は時間帯設定ガントチャートとシフト作成画面の両方に適用されます</p>
            
            <div className={styles.formGroup}>
              <label>デフォルト開始時間:</label>
              <div className={styles.timeRangeInput}>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={ganttStartHour}
                  onChange={(e) => setGanttStartHour(parseInt(e.target.value) || 0)}
                  className={styles.timeInput}
                />
                <span>:00</span>
              </div>
            </div>
            
            <div className={styles.formGroup}>
              <label>デフォルト終了時間:</label>
              <div className={styles.timeRangeInput}>
                <input
                  type="number"
                  min="0"
                  max="48"
                  value={ganttEndHour}
                  onChange={(e) => setGanttEndHour(parseInt(e.target.value) || 24)}
                  className={styles.timeInput}
                />
                <span>:00</span>
                <small className={styles.helpText}>
                  24を超える値は翌日として扱われます（例：26 = 翌日2:00）
                </small>
              </div>
            </div>
            
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setShowGanttSettings(false)} className={styles.cancelButton}>
                キャンセル
              </button>
              <button type="button" onClick={saveGanttSettings} className={styles.submitButton}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeSlotSettings; 