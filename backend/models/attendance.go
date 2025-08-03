package models

import "time"

// Attendance 出退勤記録モデル
type Attendance struct {
	ID           int       `json:"id"`
	EmployeeID   int       `json:"employee_id"`
	Date         string    `json:"date"`
	ClockInTime  *string   `json:"clock_in_time,omitempty"`
	ClockOutTime *string   `json:"clock_out_time,omitempty"`
	ActualHours  *float64  `json:"actual_hours,omitempty"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
	// 関連データ
	EmployeeName string `json:"employee_name,omitempty"`
}

// CreateAttendanceRequest 出退勤記録作成リクエスト
type CreateAttendanceRequest struct {
	EmployeeID   int     `json:"employee_id" validate:"required"`
	Date         string  `json:"date" validate:"required"`
	ClockInTime  *string `json:"clock_in_time"`
	ClockOutTime *string `json:"clock_out_time"`
	Status       string  `json:"status"`
}

// UpdateAttendanceRequest 出退勤記録更新リクエスト
type UpdateAttendanceRequest struct {
	ClockInTime  *string `json:"clock_in_time"`
	ClockOutTime *string `json:"clock_out_time"`
	Status       string  `json:"status"`
}

// ClockInRequest 出勤記録リクエスト
type ClockInRequest struct {
	EmployeeID int    `json:"employee_id" validate:"required"`
	Date       string `json:"date" validate:"required"`
	Time       string `json:"time" validate:"required"`
}

// ClockOutRequest 退勤記録リクエスト
type ClockOutRequest struct {
	EmployeeID int    `json:"employee_id" validate:"required"`
	Date       string `json:"date" validate:"required"`
	Time       string `json:"time" validate:"required"`
}

// PayrollData 給与データ
type PayrollData struct {
	EmployeeID     int     `json:"employee_id"`
	EmployeeName   string  `json:"employee_name"`
	TotalHours     float64 `json:"total_hours"`
	TotalBreakTime int     `json:"total_break_time"`
	NetHours       float64 `json:"net_hours"`
	HourlyWage     int     `json:"hourly_wage"`
	TotalSalary    int     `json:"total_salary"`
	ShiftCount     int     `json:"shift_count"`
}

// EmployeePermission 従業員権限
type EmployeePermission struct {
	ID                     int    `json:"id"`
	EmployeeID             int    `json:"employee_id"`
	EmployeeName           string `json:"employee_name"`
	CanViewOtherShifts     bool   `json:"can_view_other_shifts"`
	CanViewPayroll         bool   `json:"can_view_payroll"`
	CanEditAttendance      bool   `json:"can_edit_attendance"`
	CanSubmitShiftRequests bool   `json:"can_submit_shift_requests"`
	CreatedAt              string `json:"created_at"`
	UpdatedAt              string `json:"updated_at"`
}

// CreatePermissionRequest 権限設定作成リクエスト
type CreatePermissionRequest struct {
	EmployeeID             int  `json:"employee_id"`
	CanViewOtherShifts     bool `json:"can_view_other_shifts"`
	CanViewPayroll         bool `json:"can_view_payroll"`
	CanEditAttendance      bool `json:"can_edit_attendance"`
	CanSubmitShiftRequests bool `json:"can_submit_shift_requests"`
}
