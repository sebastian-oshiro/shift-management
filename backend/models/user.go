package models

import "time"

// User ユーザーモデル
type User struct {
	ID           int       `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // パスワードはJSONに含めない
	Role         string    `json:"role"`
	Name         string    `json:"name"`
	EmployeeID   *int      `json:"employee_id,omitempty"` // 従業員の場合のみ
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// LoginRequest ログインリクエスト
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// RegisterRequest ユーザー登録リクエスト
type RegisterRequest struct {
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required,min=6"`
	Role       string `json:"role" validate:"required,oneof=owner employee"`
	Name       string `json:"name" validate:"required"`
	EmployeeID *int   `json:"employee_id,omitempty"`
}

// LoginResponse ログインレスポンス
type LoginResponse struct {
	User  User   `json:"user"`
	Token string `json:"token"`
}
