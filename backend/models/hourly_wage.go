package models

import "time"

// HourlyWage 時給設定モデル
type HourlyWage struct {
	ID            int       `json:"id"`
	EmployeeID    int       `json:"employee_id"`
	HourlyWage    int       `json:"hourly_wage"`
	EffectiveDate string    `json:"effective_date"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	// 関連データ
	EmployeeName string `json:"employee_name,omitempty"`
}

// CreateHourlyWageRequest 時給設定作成リクエスト
type CreateHourlyWageRequest struct {
	EmployeeID    int    `json:"employee_id" validate:"required"`
	HourlyWage    int    `json:"hourly_wage" validate:"required,min=1"`
	EffectiveDate string `json:"effective_date" validate:"required"`
}

// UpdateHourlyWageRequest 時給設定更新リクエスト
type UpdateHourlyWageRequest struct {
	HourlyWage    int    `json:"hourly_wage" validate:"required,min=1"`
	EffectiveDate string `json:"effective_date" validate:"required"`
}

// HourlyWageHistory 時給履歴
type HourlyWageHistory struct {
	EmployeeID    int       `json:"employee_id"`
	EmployeeName  string    `json:"employee_name"`
	HourlyWage    int       `json:"hourly_wage"`
	EffectiveDate string    `json:"effective_date"`
	CreatedAt     time.Time `json:"created_at"`
}
