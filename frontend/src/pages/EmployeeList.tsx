import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import apiClient from '../services/api';
import styles from './EmployeeList.module.css';

const EmployeeList: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    hourlyWage: ''
  });

  // 従業員一覧を取得
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/employees');
      setEmployees(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '従業員一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  // フォームの入力処理
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 従業員を追加
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.hourlyWage.trim()) {
      setError('名前と時給を入力してください');
      return;
    }

    try {
      const response = await apiClient.post('/employees', {
        name: formData.name.trim(),
        hourly_wage: parseInt(formData.hourlyWage)
      });
      
      setEmployees(prev => [...prev, response.data]);
      setShowAddModal(false);
      setFormData({ name: '', hourlyWage: '' });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '従業員の追加に失敗しました');
    }
  };

  // 従業員を編集
  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEmployee || !formData.name.trim() || !formData.hourlyWage.trim()) {
      setError('名前と時給を入力してください');
      return;
    }

    try {
      await apiClient.put(`/employees/${editingEmployee.id}`, {
        name: formData.name.trim(),
        hourly_wage: parseInt(formData.hourlyWage)
      });
      
      setEmployees(prev => prev.map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, name: formData.name.trim(), hourly_wage: parseInt(formData.hourlyWage) }
          : emp
      ));
      
      setEditingEmployee(null);
      setFormData({ name: '', hourlyWage: '' });
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '従業員の更新に失敗しました');
    }
  };

  // 従業員を削除
  const handleDeleteEmployee = async (id: number) => {
    if (!window.confirm('この従業員を削除しますか？')) {
      return;
    }

    try {
      await apiClient.delete(`/employees/${id}`);
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || '従業員の削除に失敗しました');
    }
  };

  // 編集モーダルを開く
  const openEditModal = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      name: employee.name,
      hourlyWage: employee.hourly_wage.toString()
    });
  };

  // モーダルを閉じる
  const closeModal = () => {
    setShowAddModal(false);
    setEditingEmployee(null);
    setFormData({ name: '', hourlyWage: '' });
    setError('');
  };

  if (loading) {
    return <div className={styles.loading}>読み込み中...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>従業員管理</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className={styles.addButton}
        >
          ＋ 従業員を追加
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.employeeGrid}>
        {employees.map(employee => (
          <div key={employee.id} className={styles.employeeCard}>
            <div className={styles.employeeInfo}>
              <h3 className={styles.employeeName}>{employee.name}</h3>
              <p className={styles.employeeWage}>
                時給: {employee.hourly_wage.toLocaleString()}円
              </p>
              <p className={styles.employeeDate}>
                登録日: {new Date(employee.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className={styles.employeeActions}>
              <button 
                onClick={() => openEditModal(employee)}
                className={styles.editButton}
              >
                編集
              </button>
              <button 
                onClick={() => handleDeleteEmployee(employee.id)}
                className={styles.deleteButton}
              >
                削除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 追加モーダル */}
      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>従業員を追加</h2>
            <form onSubmit={handleAddEmployee}>
              <div className={styles.formGroup}>
                <label htmlFor="name">名前</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="hourlyWage">時給（円）</label>
                <input
                  type="number"
                  id="hourlyWage"
                  name="hourlyWage"
                  value={formData.hourlyWage}
                  onChange={handleInputChange}
                  required
                  min="1"
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

      {/* 編集モーダル */}
      {editingEmployee && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>従業員を編集</h2>
            <form onSubmit={handleEditEmployee}>
              <div className={styles.formGroup}>
                <label htmlFor="editName">名前</label>
                <input
                  type="text"
                  id="editName"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="editHourlyWage">時給（円）</label>
                <input
                  type="number"
                  id="editHourlyWage"
                  name="hourlyWage"
                  value={formData.hourlyWage}
                  onChange={handleInputChange}
                  required
                  min="1"
                  className={styles.input}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" onClick={closeModal} className={styles.cancelButton}>
                  キャンセル
                </button>
                <button type="submit" className={styles.submitButton}>
                  更新
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList; 