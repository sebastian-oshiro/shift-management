package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
	"golang.org/x/crypto/bcrypt"
)

// セッション管理（簡易版）
var sessions = make(map[string]models.User)

// Login ログイン処理
func Login(c echo.Context) error {
	var req models.LoginRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.Email == "" || req.Password == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "メールアドレスとパスワードは必須です",
		})
	}

	// ユーザーを検索
	var user models.User
	err := database.DB.QueryRow(`
		SELECT id, email, password_hash, role, name, employee_id, created_at, updated_at
		FROM users 
		WHERE email = $1
	`, req.Email).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.Name, &user.EmployeeID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "メールアドレスまたはパスワードが正しくありません",
		})
	}

	// パスワード検証
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "メールアドレスまたはパスワードが正しくありません",
		})
	}

	// セッショントークンを生成
	token := generateToken()
	sessions[token] = user

	// レスポンス
	response := models.LoginResponse{
		User:  user,
		Token: token,
	}

	return c.JSON(http.StatusOK, response)
}

// Logout ログアウト処理
func Logout(c echo.Context) error {
	token := c.Request().Header.Get("Authorization")
	if token != "" {
		// Bearer プレフィックスを除去
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}
		delete(sessions, token)
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "ログアウトしました",
	})
}

// GetProfile プロフィール取得
func GetProfile(c echo.Context) error {
	token := c.Request().Header.Get("Authorization")
	if token == "" {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "認証が必要です",
		})
	}

	// Bearer プレフィックスを除去
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	user, exists := sessions[token]
	if !exists {
		return c.JSON(http.StatusUnauthorized, map[string]string{
			"error": "無効なトークンです",
		})
	}

	return c.JSON(http.StatusOK, user)
}

// Register ユーザー登録
func Register(c echo.Context) error {
	var req models.RegisterRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.Email == "" || req.Password == "" || req.Name == "" || req.Role == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "必須項目が不足しています",
		})
	}

	if req.Role != "owner" && req.Role != "employee" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効な役割です",
		})
	}

	// パスワードの暗号化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "パスワードの暗号化に失敗しました",
		})
	}

	// 従業員の存在確認（employee_idが指定されている場合）
	if req.EmployeeID != nil {
		var employeeExists bool
		err := database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM employees WHERE id = $1)", *req.EmployeeID).Scan(&employeeExists)
		if err != nil || !employeeExists {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "指定された従業員が存在しません",
			})
		}
	}

	// ユーザーを作成
	var user models.User
	err = database.DB.QueryRow(`
		INSERT INTO users (email, password_hash, role, name, employee_id) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id, email, role, name, employee_id, created_at, updated_at
	`, req.Email, string(hashedPassword), req.Role, req.Name, req.EmployeeID).Scan(
		&user.ID, &user.Email, &user.Role, &user.Name, &user.EmployeeID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "ユーザーの作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, user)
}

// generateToken セッショントークンを生成
func generateToken() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// CreateTestUser テスト用ユーザーを作成
func CreateTestUser(c echo.Context) error {
	// テスト用のオーナーユーザーを作成（より安全なパスワード）
	testUser := models.RegisterRequest{
		Email:    "owner@test.com",
		Password: "Shift2024!Secure#Test",
		Role:     "owner",
		Name:     "テストオーナー",
	}

	// パスワードの暗号化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testUser.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "パスワードの暗号化に失敗しました",
		})
	}

	// ユーザーが既に存在するかチェック
	var exists bool
	err = database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", testUser.Email).Scan(&exists)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "ユーザー存在チェックに失敗しました",
		})
	}

	if exists {
		return c.JSON(http.StatusOK, map[string]string{
			"message":  "テストユーザーは既に存在します",
			"email":    testUser.Email,
			"password": testUser.Password,
		})
	}

	// ユーザーを作成
	var user models.User
	err = database.DB.QueryRow(`
		INSERT INTO users (email, password_hash, role, name) 
		VALUES ($1, $2, $3, $4) 
		RETURNING id, email, role, name, created_at, updated_at
	`, testUser.Email, string(hashedPassword), testUser.Role, testUser.Name).Scan(
		&user.ID, &user.Email, &user.Role, &user.Name, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "ユーザーの作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "テストユーザーが作成されました",
		"user":    user,
		"login_credentials": map[string]string{
			"email":    testUser.Email,
			"password": testUser.Password,
		},
	})
}

// CreateTestEmployee テスト用従業員ユーザーを作成
func CreateTestEmployee(c echo.Context) error {
	// テスト用の従業員ユーザーを作成
	testEmployee := models.RegisterRequest{
		Email:    "employee@test.com",
		Password: "Employee2024!Test",
		Role:     "employee",
		Name:     "テスト従業員",
	}

	// パスワードの暗号化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(testEmployee.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "パスワードの暗号化に失敗しました",
		})
	}

	// ユーザーが既に存在するかチェック
	var exists bool
	err = database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", testEmployee.Email).Scan(&exists)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "ユーザー存在チェックに失敗しました",
		})
	}

	if exists {
		return c.JSON(http.StatusOK, map[string]string{
			"message":  "テスト従業員ユーザーは既に存在します",
			"email":    testEmployee.Email,
			"password": testEmployee.Password,
		})
	}

	// 従業員レコードを作成
	var employeeID int
	err = database.DB.QueryRow(`
		INSERT INTO employees (name, email, hourly_wage) 
		VALUES ($1, $2, $3) 
		RETURNING id
	`, testEmployee.Name, testEmployee.Email, 1000).Scan(&employeeID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "従業員レコードの作成に失敗しました",
		})
	}

	// ユーザーを作成
	var user models.User
	err = database.DB.QueryRow(`
		INSERT INTO users (email, password_hash, role, name, employee_id) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id, email, role, name, employee_id, created_at, updated_at
	`, testEmployee.Email, string(hashedPassword), testEmployee.Role, testEmployee.Name, employeeID).Scan(
		&user.ID, &user.Email, &user.Role, &user.Name, &user.EmployeeID, &user.CreatedAt, &user.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "ユーザーの作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"message": "テスト従業員ユーザーが作成されました",
		"user":    user,
		"login_credentials": map[string]string{
			"email":    testEmployee.Email,
			"password": testEmployee.Password,
		},
	})
}

// DeleteTestUser テスト用ユーザーを削除
func DeleteTestUser(c echo.Context) error {
	// テストユーザーを削除
	result, err := database.DB.Exec("DELETE FROM users WHERE email = 'owner@test.com'")
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "ユーザー削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	return c.JSON(http.StatusOK, map[string]interface{}{
		"message":       "テストユーザーを削除しました",
		"rows_affected": rowsAffected,
	})
}

// GetCurrentUser 現在のユーザーを取得（ミドルウェア用）
func GetCurrentUser(c echo.Context) (models.User, bool) {
	token := c.Request().Header.Get("Authorization")
	if token == "" {
		return models.User{}, false
	}

	// Bearer プレフィックスを除去
	if len(token) > 7 && token[:7] == "Bearer " {
		token = token[7:]
	}

	user, exists := sessions[token]
	return user, exists
}
