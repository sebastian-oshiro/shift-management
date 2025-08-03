package models

import "time"

// Employee 従業員モデル
type Employee struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"`
	HourlyWage int       `json:"hourly_wage"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CreateEmployeeRequest 従業員作成リクエスト
type CreateEmployeeRequest struct {
	Name       string `json:"name" validate:"required"`
	HourlyWage int    `json:"hourly_wage" validate:"required,min=1"`
}

// UpdateEmployeeRequest 従業員更新リクエスト
type UpdateEmployeeRequest struct {
	Name       string `json:"name" validate:"required"`
	HourlyWage int    `json:"hourly_wage" validate:"required,min=1"`
}
