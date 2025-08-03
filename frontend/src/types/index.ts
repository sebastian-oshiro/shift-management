// 従業員関連の型定義
export interface Employee {
  id: number;
  name: string;
  hourly_wage: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeRequest {
  name: string;
  hourly_wage: number;
}

export interface UpdateEmployeeRequest {
  name: string;
  hourly_wage: number;
}

// シフト関連の型定義
export interface Shift {
  id: number;
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  break_time: number;
  created_at: string;
  updated_at: string;
  employee_name?: string;
}

export interface CreateShiftRequest {
  employee_id: number;
  date: string;
  start_time: string;
  end_time: string;
  break_time?: number;
}

export interface UpdateShiftRequest {
  date?: string;
  start_time?: string;
  end_time?: string;
  break_time?: number;
}

// シフト希望関連の型定義
export interface ShiftRequest {
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

export interface CreateShiftRequestRequest {
  employee_id: number;
  date: string;
  preferred_start_time: string;
  preferred_end_time: string;
}

export interface UpdateShiftRequestRequest {
  date?: string;
  preferred_start_time?: string;
  preferred_end_time?: string;
  status?: string;
}

// 出退勤関連の型定義
export interface Attendance {
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

export interface CreateAttendanceRequest {
  employee_id: number;
  date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  status?: string;
}

export interface ClockInRequest {
  employee_id: number;
  date: string;
  time: string;
}

export interface ClockOutRequest {
  employee_id: number;
  date: string;
  time: string;
}

// 時給関連の型定義
export interface HourlyWage {
  id: number;
  employee_id: number;
  hourly_wage: number;
  effective_date: string;
  created_at: string;
  updated_at: string;
  employee_name?: string;
}

export interface CreateHourlyWageRequest {
  employee_id: number;
  hourly_wage: number;
  effective_date: string;
}

export interface HourlyWageHistory {
  employee_id: number;
  employee_name: string;
  hourly_wage: number;
  effective_date: string;
  created_at: string;
}

// 認証関連の型定義
export interface User {
  id: number;
  email: string;
  role: string;
  name: string;
  employee_id?: number;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  role: string;
  employee_id?: number;
}

// 時間帯設定関連の型定義
export interface TimeSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  position: string;
  required_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTimeSlotRequest {
  day_of_week: number;
  start_time: string;
  end_time: string;
  position: string;
  required_count: number;
}

export interface UpdateTimeSlotRequest {
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
  position?: string;
  required_count?: number;
}

export interface CoverageSummary {
  date: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  position: string;
  required_count: number;
  actual_count: number;
  shortage: number;
  status: string;
}

// APIレスポンスの型定義
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// ページネーション関連の型定義
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 