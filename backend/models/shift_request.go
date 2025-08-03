package models

import "time"

// ShiftRequest シフト希望モデル
type ShiftRequest struct {
	ID                 int       `json:"id"`
	EmployeeID         int       `json:"employee_id"`
	Date               string    `json:"date"`
	PreferredStartTime string    `json:"preferred_start_time"`
	PreferredEndTime   string    `json:"preferred_end_time"`
	Status             string    `json:"status"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
	// 関連データ
	EmployeeName string `json:"employee_name,omitempty"`
}

// CreateShiftRequestRequest シフト希望作成リクエスト
type CreateShiftRequestRequest struct {
	EmployeeID         int    `json:"employee_id" validate:"required"`
	Date               string `json:"date" validate:"required"`
	PreferredStartTime string `json:"preferred_start_time" validate:"required"`
	PreferredEndTime   string `json:"preferred_end_time" validate:"required"`
}

// UpdateShiftRequestRequest シフト希望更新リクエスト
type UpdateShiftRequestRequest struct {
	Date               string `json:"date"`
	PreferredStartTime string `json:"preferred_start_time"`
	PreferredEndTime   string `json:"preferred_end_time"`
	Status             string `json:"status"`
}
