import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import styles from './PayrollManagement.module.css';

// 給与データの型定義
interface PayrollData {
  employee_id: number;
  employee_name: string;
  total_hours: number;
  total_break_time: number;
  net_hours: number;
  hourly_wage: number;
  total_salary: number;
  shift_count: number;
}

// 時給設定の型定義
interface HourlyWage {
  id: number;
  employee_id: number;
  employee_name: string;
  hourly_wage: number;
  effective_date: string;
  created_at: string;
}

const PayrollManagement: React.FC = () => {
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [hourlyWages, setHourlyWages] = useState<HourlyWage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showWageModal, setShowWageModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [wageFormData, setWageFormData] = useState({
    employeeId: '',
    hourlyWage: '',
    effectiveDate: ''
  });

  // 給与データを取得
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const response = await apiClient.get(`/payroll/calculate?year=${selectedYear}&month=${monthStr}`);
      setPayrollData(response.data || []);
    } catch (err: any) {
      console.error('給与データ取得エラー:', err);
      setError(err.response?.data?.error || '給与データの取得に失敗しました');
      setPayrollData([]);
    } finally {
      setLoading(false);
    }
  };

  // 時給設定を取得
  const fetchHourlyWages = async () => {
    try {
      const response = await apiClient.get('/hourly-wages');
      console.log('取得した時給設定:', response.data);
      setHourlyWages(response.data || []);
    } catch (err: any) {
      console.error('時給設定取得エラー:', err);
      setHourlyWages([]);
    }
  };

  useEffect(() => {
    fetchPayrollData();
    fetchHourlyWages();
  }, [selectedYear, selectedMonth]);

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setWageFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 時給設定を追加
  const handleAddHourlyWage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!wageFormData.employeeId || !wageFormData.hourlyWage || !wageFormData.effectiveDate) {
      setError('必須項目を入力してください');
      return;
    }

    try {
      // デバッグログ
      console.log('時給設定追加開始:', {
        employeeId: wageFormData.employeeId,
        hourlyWage: wageFormData.hourlyWage,
        effectiveDate: wageFormData.effectiveDate,
        currentHourlyWages: hourlyWages
      });

      // 既存の時給設定があるかチェック
      const existingWage = hourlyWages.find(wage => 
        wage.employee_id === parseInt(wageFormData.employeeId)
      );

      console.log('既存の時給設定:', existingWage);

      if (existingWage) {
        // 既存の設定がある場合は確認ダイアログを表示
        const confirmMessage = `${existingWage.employee_name}の既存の時給設定（¥${existingWage.hourly_wage.toLocaleString()}）を新しい設定で上書きしますか？`;
        if (!window.confirm(confirmMessage)) {
          return;
        }

        // 既存の設定を先に削除
        console.log('既存設定を削除中:', existingWage.id);
        await apiClient.delete(`/hourly-wages/${existingWage.id}`);
        console.log('既存設定削除完了');
      }

      // 新しい設定を追加
      const response = await apiClient.post('/hourly-wages', {
        employee_id: parseInt(wageFormData.employeeId),
        hourly_wage: parseInt(wageFormData.hourlyWage),
        effective_date: wageFormData.effectiveDate
      });
      
      console.log('API応答:', response.data);
      
      // 従業員名を追加して新しい時給設定を作成
      const employee = employees.find(emp => emp.id === parseInt(wageFormData.employeeId));
      const newWageWithName = {
        ...response.data,
        employee_name: employee ? employee.name : 'Unknown'
      };
      
      // 時給設定一覧を更新
      if (existingWage) {
        setHourlyWages(prev => {
          const filtered = prev.filter(wage => wage.id !== existingWage.id);
          const updated = [...filtered, newWageWithName];
          console.log('更新後の時給設定:', updated);
          return updated;
        });
      } else {
        setHourlyWages(prev => {
          const updated = [...prev, newWageWithName];
          console.log('更新後の時給設定:', updated);
          return updated;
        });
      }
      
      setShowWageModal(false);
      setWageFormData({ employeeId: '', hourlyWage: '', effectiveDate: '' });
      setError('');
      
      // 給与データを再計算
      fetchPayrollData();
    } catch (err: any) {
      console.error('時給設定追加エラー:', err);
      setError(err.response?.data?.error || '時給設定の追加に失敗しました');
    }
  };

  // 時給設定を削除
  const handleDeleteHourlyWage = async (wageId: number) => {
    if (!window.confirm('この時給設定を削除しますか？')) {
      return;
    }

    try {
      await apiClient.delete(`/hourly-wages/${wageId}`);
      setHourlyWages(prev => prev.filter(wage => wage.id !== wageId));
      setError('');
      
      // 給与データを再計算
      fetchPayrollData();
    } catch (err: any) {
      setError(err.response?.data?.error || '時給設定の削除に失敗しました');
    }
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowWageModal(false);
    setWageFormData({ employeeId: '', hourlyWage: '', effectiveDate: '' });
    setError('');
  };

  // 従業員を選択して時給設定モーダルを開く
  const openWageModal = (employeeId: number) => {
    setSelectedEmployee(employeeId);
    
    // 既存の時給設定があれば表示
    const existingWage = hourlyWages.find(wage => wage.employee_id === employeeId);
    
    setWageFormData(prev => ({
      ...prev,
      employeeId: employeeId.toString(),
      hourlyWage: existingWage ? existingWage.hourly_wage.toString() : '',
      effectiveDate: existingWage ? existingWage.effective_date : ''
    }));
    setShowWageModal(true);
  };

  // 総給与を計算
  const totalSalary = payrollData.reduce((sum, item) => sum + item.total_salary, 0);

  // 従業員一覧を取得（時給設定用）
  const [employees, setEmployees] = useState<any[]>([]);
  
  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data || []);
    } catch (err: any) {
      console.error('従業員取得エラー:', err);
      setEmployees([]);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>給与計算・管理</h1>
        <div className={styles.periodSelector}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={styles.yearSelect}
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className={styles.monthSelect}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
              <option key={month} value={month}>{month}月</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* 給与概要 */}
      <section className={styles.summarySection}>
        <h2 className={styles.sectionTitle}>給与概要</h2>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <h3>対象従業員数</h3>
            <p className={styles.summaryNumber}>{payrollData.length}人</p>
          </div>
          <div className={styles.summaryCard}>
            <h3>総労働時間</h3>
            <p className={styles.summaryNumber}>
              {(() => {
                const totalHours = payrollData.reduce((sum, item) => sum + item.net_hours, 0);
                const hours = Math.floor(totalHours);
                const minutes = Math.round((totalHours - hours) * 60);
                return `${hours}:${minutes.toString().padStart(2, '0')}`;
              })()}
            </p>
          </div>
          <div className={styles.summaryCard}>
            <h3>総給与</h3>
            <p className={styles.summaryNumber}>¥{totalSalary.toLocaleString()}</p>
          </div>
        </div>
      </section>

      {/* 給与詳細 */}
      <section className={styles.payrollSection}>
        <h2 className={styles.sectionTitle}>給与詳細</h2>
        
        {payrollData.length > 0 ? (
          <div className={styles.payrollTable}>
            <table>
              <thead>
                <tr>
                  <th>従業員名</th>
                  <th>総労働時間</th>
                  <th>休憩時間</th>
                  <th>実労働時間</th>
                  <th>時給</th>
                  <th>給与</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map(item => (
                  <tr key={item.employee_id}>
                    <td>{item.employee_name}</td>
                    <td>{(() => {
                      const hours = Math.floor(item.total_hours);
                      const minutes = Math.round((item.total_hours - hours) * 60);
                      return `${hours}:${minutes.toString().padStart(2, '0')}`;
                    })()}</td>
                    <td>{(() => {
                      const hours = Math.floor(item.total_break_time / 60);
                      const minutes = item.total_break_time % 60;
                      return `${hours}:${minutes.toString().padStart(2, '0')}`;
                    })()}</td>
                    <td>{(() => {
                      const hours = Math.floor(item.net_hours);
                      const minutes = Math.round((item.net_hours - hours) * 60);
                      return `${hours}:${minutes.toString().padStart(2, '0')}`;
                    })()}</td>
                    <td>¥{item.hourly_wage.toLocaleString()}</td>
                    <td className={styles.salaryCell}>¥{item.total_salary.toLocaleString()}</td>
                    <td>
                      <button
                        onClick={() => openWageModal(item.employee_id)}
                        className={styles.wageButton}
                      >
                        時給設定
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.noData}>
            指定月の給与データがありません
          </div>
        )}
      </section>



      {/* 時給設定モーダル */}
      {showWageModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>
              {selectedEmployee && hourlyWages.find(w => w.employee_id === selectedEmployee) 
                ? '時給設定変更' 
                : '時給設定追加'
              }
            </h2>
            <form onSubmit={handleAddHourlyWage}>
              <div className={styles.formGroup}>
                <label htmlFor="employeeId">従業員</label>
                <select
                  id="employeeId"
                  name="employeeId"
                  value={wageFormData.employeeId}
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
                <label htmlFor="hourlyWage">時給（円）</label>
                <input
                  type="number"
                  id="hourlyWage"
                  name="hourlyWage"
                  value={wageFormData.hourlyWage}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="effectiveDate">適用日</label>
                <input
                  type="date"
                  id="effectiveDate"
                  name="effectiveDate"
                  value={wageFormData.effectiveDate}
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
                  設定
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement; 