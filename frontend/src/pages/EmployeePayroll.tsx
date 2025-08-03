import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import styles from './EmployeePayroll.module.css';

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

const EmployeePayroll: React.FC = () => {
  const { user } = useAuth();
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // 時間をhh:mm形式に変換
  const formatTime = (hours: number): string => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 分をhh:mm形式に変換
  const formatMinutes = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // 給与データを取得
  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const monthStr = selectedMonth.toString().padStart(2, '0');
      const response = await apiClient.get(`/payroll/employee/${user?.employee_id}?year=${selectedYear}&month=${monthStr}`);
      setPayrollData(response.data || null);
    } catch (err: any) {
      console.error('給与データ取得エラー:', err);
      setError(err.response?.data?.error || '給与データの取得に失敗しました');
      setPayrollData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.employee_id) {
      fetchPayrollData();
    }
  }, [user?.employee_id, selectedYear, selectedMonth]);

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>給与確認</h1>
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

      {payrollData ? (
        <div className={styles.payrollContent}>
          {/* 給与サマリー */}
          <section className={styles.summarySection}>
            <h2 className={styles.sectionTitle}>{selectedYear}年{selectedMonth}月の給与</h2>
            <div className={styles.summaryCard}>
              <div className={styles.salaryAmount}>
                ¥{payrollData.total_salary.toLocaleString()}
              </div>
              <div className={styles.salaryLabel}>総給与</div>
            </div>
          </section>

          {/* 詳細情報 */}
          <section className={styles.detailsSection}>
            <h3 className={styles.detailsTitle}>勤務詳細</h3>
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>シフト数</span>
                <span className={styles.detailValue}>{payrollData.shift_count}回</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>総労働時間</span>
                <span className={styles.detailValue}>{formatTime(payrollData.total_hours)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>休憩時間</span>
                <span className={styles.detailValue}>{formatMinutes(payrollData.total_break_time)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>実労働時間</span>
                <span className={styles.detailValue}>{formatTime(payrollData.net_hours)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>時給</span>
                <span className={styles.detailValue}>¥{payrollData.hourly_wage.toLocaleString()}</span>
              </div>
            </div>
          </section>

          {/* 計算式 */}
          <section className={styles.calculationSection}>
            <h3 className={styles.calculationTitle}>給与計算式</h3>
            <div className={styles.calculationFormula}>
              <div className={styles.formulaItem}>
                <span>実労働時間: {formatTime(payrollData.net_hours)}</span>
              </div>
              <div className={styles.formulaItem}>
                <span>× 時給: ¥{payrollData.hourly_wage.toLocaleString()}</span>
              </div>
              <div className={styles.formulaResult}>
                <span>= 総給与: ¥{payrollData.total_salary.toLocaleString()}</span>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.noData}>
          <h2>給与データがありません</h2>
          <p>指定月の給与データが存在しません。</p>
          <p>シフトが登録されているかご確認ください。</p>
        </div>
      )}
    </div>
  );
};

export default EmployeePayroll; 