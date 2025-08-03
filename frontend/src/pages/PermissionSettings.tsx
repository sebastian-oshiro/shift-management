import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import styles from './PermissionSettings.module.css';

// 従業員の型定義
interface Employee {
  id: number;
  name: string;
  email: string;
  position: string;
  hire_date: string;
}

// 権限設定の型定義
interface PermissionSettings {
  can_view_other_shifts: boolean;
}

const PermissionSettings: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [permissionSettings, setPermissionSettings] = useState<PermissionSettings>({
    can_view_other_shifts: false
  });

  // 従業員一覧を取得
  const fetchEmployees = async () => {
    try {
      const response = await apiClient.get('/employees');
      setEmployees(response.data || []);
    } catch (err: any) {
      console.error('従業員取得エラー:', err);
      setError(err.response?.data?.error || '従業員一覧の取得に失敗しました');
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // 現在の権限設定を取得
  const fetchCurrentPermissions = async () => {
    try {
      const response = await apiClient.get('/permissions');
      const permissions = response.data || [];
      
      // 他者シフト閲覧権限が設定されている従業員の数を確認
      const employeesWithPermission = permissions.filter((p: any) => p.can_view_other_shifts).length;
      const hasPermission = employeesWithPermission > 0;
      
      setPermissionSettings({
        can_view_other_shifts: hasPermission
      });
    } catch (err: any) {
      console.error('権限設定取得エラー:', err);
      // エラーの場合はデフォルト値を使用
      setPermissionSettings({
        can_view_other_shifts: false
      });
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCurrentPermissions();
  }, []);

  // 権限設定の変更処理
  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = e.target;
    setPermissionSettings({
      can_view_other_shifts: checked
    });
  };

  // 全従業員に権限を一斉設定
  const handleApplyToAllEmployees = async () => {
    if (employees.length === 0) {
      setError('従業員が登録されていません');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      console.log('全従業員に権限を一斉設定開始'); // デバッグ用
      console.log('設定する権限:', permissionSettings); // デバッグ用

      // 各従業員に対して権限設定を作成または更新
      const promises = employees.map(async (employee) => {
        const response = await apiClient.post('/permissions', {
          employee_id: employee.id,
          can_view_other_shifts: permissionSettings.can_view_other_shifts,
          can_view_payroll: false,
          can_edit_attendance: false,
          can_submit_shift_requests: true
        });
        return response.data;
      });

      await Promise.all(promises);
      
      setSuccessMessage(`全従業員（${employees.length}名）の他者シフト閲覧権限を${permissionSettings.can_view_other_shifts ? '有効' : '無効'}に設定しました`);
      console.log('権限設定完了'); // デバッグ用
    } catch (err: any) {
      console.error('権限設定エラー:', err); // デバッグ用
      setError(err.response?.data?.error || '権限設定の適用に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>権限設定</h1>
        <p className={styles.subtitle}>全従業員の他者シフト閲覧権限を一斉管理できます</p>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className={styles.success}>
          {successMessage}
        </div>
      )}

      {/* 権限設定セクション */}
      <section className={styles.permissionsSection}>
        <h2 className={styles.sectionTitle}>全従業員権限設定</h2>
        
        <div className={styles.permissionCard}>
          <div className={styles.permissionHeader}>
            <h3>他者シフト閲覧権限</h3>
            <p>他の従業員のシフトを閲覧する権限を設定します</p>
          </div>
          
          <div className={styles.permissionControl}>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={permissionSettings.can_view_other_shifts}
                onChange={handlePermissionChange}
                className={styles.switch}
              />
              <span className={styles.slider}></span>
              <span className={styles.switchText}>
                {permissionSettings.can_view_other_shifts ? '有効' : '無効'}
              </span>
            </label>
          </div>
          
          <div className={styles.permissionInfo}>
            <p><strong>現在の状態:</strong> {permissionSettings.can_view_other_shifts ? '全従業員が他者シフトを閲覧可能' : '他者シフト閲覧は制限されています'}</p>
            <p><strong>対象従業員数:</strong> {employees.length}名</p>
          </div>
          
          <button
            onClick={handleApplyToAllEmployees}
            disabled={loading}
            className={styles.applyButton}
          >
            {loading ? '設定中...' : '全従業員に適用'}
          </button>
        </div>
      </section>

      {/* 従業員一覧 */}
      <section className={styles.employeesSection}>
        <h2 className={styles.sectionTitle}>対象従業員一覧</h2>
        
        {employees.length > 0 ? (
          <div className={styles.employeesGrid}>
            {employees.map(employee => (
              <div key={employee.id} className={styles.employeeCard}>
                <div className={styles.employeeInfo}>
                  <h3 className={styles.employeeName}>{employee.name}</h3>
                  <p className={styles.employeePosition}>{employee.position}</p>
                  <p className={styles.employeeEmail}>{employee.email}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.noData}>
            従業員が登録されていません
          </div>
        )}
      </section>
    </div>
  );
};

export default PermissionSettings; 