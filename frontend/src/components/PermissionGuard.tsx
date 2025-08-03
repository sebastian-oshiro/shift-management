import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';

// 権限の型定義
interface UserPermission {
  can_view_other_shifts: boolean;
  can_view_payroll: boolean;
  can_edit_attendance: boolean;
  can_submit_shift_requests: boolean;
}

interface PermissionGuardProps {
  children: React.ReactNode;
  requiredPermission: keyof UserPermission;
  fallback?: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  children, 
  requiredPermission, 
  fallback 
}) => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);

  // ユーザーの権限を取得
  const fetchUserPermissions = async () => {
    try {
      if (user?.role === 'owner') {
        // オーナーは全ての権限を持つ
        setPermissions({
          can_view_other_shifts: true,
          can_view_payroll: true,
          can_edit_attendance: true,
          can_submit_shift_requests: true
        });
      } else if (user?.employee_id) {
        // 従業員の権限を取得
        const response = await apiClient.get(`/permissions/employee/${user.employee_id}`);
        setPermissions(response.data || {
          can_view_other_shifts: false,
          can_view_payroll: false,
          can_edit_attendance: false,
          can_submit_shift_requests: true // デフォルトで許可
        });
      } else {
        setPermissions(null);
      }
    } catch (err) {
      console.error('権限取得エラー:', err);
      // エラーの場合はデフォルト権限を設定
      setPermissions({
        can_view_other_shifts: false,
        can_view_payroll: false,
        can_edit_attendance: false,
        can_submit_shift_requests: true
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserPermissions();
  }, [user]);

  if (loading) {
    return <div>読み込み中...</div>;
  }

  // 権限がない場合はfallbackまたはnullを表示
  if (!permissions || !permissions[requiredPermission]) {
    return fallback ? <>{fallback}</> : null;
  }

  // 権限がある場合は子コンポーネントを表示
  return <>{children}</>;
};

export default PermissionGuard; 