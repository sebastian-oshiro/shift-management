package models

import "time"

// Shift シフトモデル
type Shift struct {
	ID         int       `json:"id"`
	EmployeeID int       `json:"employee_id"`
	Date       string    `json:"date"`
	StartTime  string    `json:"start_time"`
	EndTime    string    `json:"end_time"`
	BreakTime  int       `json:"break_time"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	// 関連データ
	EmployeeName string `json:"employee_name,omitempty"`
}

// CreateShiftRequest シフト作成リクエスト
type CreateShiftRequest struct {
	EmployeeID int    `json:"employee_id" validate:"required"`
	Date       string `json:"date" validate:"required"`
	StartTime  string `json:"start_time" validate:"required"`
	EndTime    string `json:"end_time" validate:"required"`
	BreakTime  int    `json:"break_time"`
}

// UpdateShiftRequest シフト更新リクエスト
type UpdateShiftRequest struct {
	EmployeeID int    `json:"employee_id"`
	Date       string `json:"date"`
	StartTime  string `json:"start_time"`
	EndTime    string `json:"end_time"`
	BreakTime  int    `json:"break_time"`
}
