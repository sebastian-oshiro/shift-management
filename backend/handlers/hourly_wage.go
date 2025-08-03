package handlers

import (
	"net/http"
	"strconv"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// GetHourlyWages 時給設定一覧を取得
func GetHourlyWages(c echo.Context) error {
	// クエリパラメータの取得
	employeeID := c.QueryParam("employee_id")

	query := `
		SELECT hw.id, hw.employee_id, hw.hourly_wage, hw.effective_date, 
		       hw.created_at, hw.updated_at, e.name as employee_name
		FROM hourly_wages hw
		JOIN employees e ON hw.employee_id = e.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if employeeID != "" {
		query += " AND hw.employee_id = $" + strconv.Itoa(argIndex)
		args = append(args, employeeID)
		argIndex++
	}

	query += " ORDER BY hw.effective_date DESC, hw.created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時給設定一覧の取得に失敗しました",
		})
	}
	defer rows.Close()

	var hourlyWages []models.HourlyWage
	for rows.Next() {
		var hw models.HourlyWage
		err := rows.Scan(&hw.ID, &hw.EmployeeID, &hw.HourlyWage, &hw.EffectiveDate,
			&hw.CreatedAt, &hw.UpdatedAt, &hw.EmployeeName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		hourlyWages = append(hourlyWages, hw)
	}

	return c.JSON(http.StatusOK, hourlyWages)
}

// GetHourlyWage 時給設定詳細を取得
func GetHourlyWage(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var hw models.HourlyWage
	err = database.DB.QueryRow(`
		SELECT hw.id, hw.employee_id, hw.hourly_wage, hw.effective_date, 
		       hw.created_at, hw.updated_at, e.name as employee_name
		FROM hourly_wages hw
		JOIN employees e ON hw.employee_id = e.id
		WHERE hw.id = $1
	`, id).Scan(&hw.ID, &hw.EmployeeID, &hw.HourlyWage, &hw.EffectiveDate,
		&hw.CreatedAt, &hw.UpdatedAt, &hw.EmployeeName)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時給設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, hw)
}

// CreateHourlyWage 時給設定を作成
func CreateHourlyWage(c echo.Context) error {
	var req models.CreateHourlyWageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.EmployeeID == 0 || req.HourlyWage <= 0 || req.EffectiveDate == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "必須項目が不足しています",
		})
	}

	// 従業員の存在確認
	var employeeExists bool
	err := database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM employees WHERE id = $1)", req.EmployeeID).Scan(&employeeExists)
	if err != nil || !employeeExists {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "指定された従業員が存在しません",
		})
	}

	// 同じ日付の設定が既に存在するかチェック
	var existingID int
	err = database.DB.QueryRow("SELECT id FROM hourly_wages WHERE employee_id = $1 AND effective_date = $2", req.EmployeeID, req.EffectiveDate).Scan(&existingID)
	if err == nil {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": "同じ日付の時給設定が既に存在します",
		})
	}

	var hourlyWage models.HourlyWage
	err = database.DB.QueryRow(`
		INSERT INTO hourly_wages (employee_id, hourly_wage, effective_date) 
		VALUES ($1, $2, $3) 
		RETURNING id, employee_id, hourly_wage, effective_date, created_at, updated_at
	`, req.EmployeeID, req.HourlyWage, req.EffectiveDate).Scan(
		&hourlyWage.ID, &hourlyWage.EmployeeID, &hourlyWage.HourlyWage, &hourlyWage.EffectiveDate, &hourlyWage.CreatedAt, &hourlyWage.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時給設定の作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, hourlyWage)
}

// UpdateHourlyWage 時給設定を更新
func UpdateHourlyWage(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.UpdateHourlyWageRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.HourlyWage <= 0 || req.EffectiveDate == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効な時給または適用日です",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE hourly_wages 
		SET hourly_wage = $1, effective_date = $2, updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, req.HourlyWage, req.EffectiveDate, id)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時給設定の更新に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時給設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "時給設定が更新されました",
	})
}

// DeleteHourlyWage 時給設定を削除
func DeleteHourlyWage(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	result, err := database.DB.Exec("DELETE FROM hourly_wages WHERE id = $1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時給設定の削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時給設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "時給設定が削除されました",
	})
}

// GetHourlyWageHistory 時給履歴を取得
func GetHourlyWageHistory(c echo.Context) error {
	employeeID := c.QueryParam("employee_id")
	if employeeID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "従業員IDが必要です",
		})
	}

	rows, err := database.DB.Query(`
		SELECT hw.employee_id, e.name as employee_name, hw.hourly_wage, 
		       hw.effective_date, hw.created_at
		FROM hourly_wages hw
		JOIN employees e ON hw.employee_id = e.id
		WHERE hw.employee_id = $1
		ORDER BY hw.effective_date DESC, hw.created_at DESC
	`, employeeID)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時給履歴の取得に失敗しました",
		})
	}
	defer rows.Close()

	var history []models.HourlyWageHistory
	for rows.Next() {
		var h models.HourlyWageHistory
		err := rows.Scan(&h.EmployeeID, &h.EmployeeName, &h.HourlyWage, &h.EffectiveDate, &h.CreatedAt)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		history = append(history, h)
	}

	return c.JSON(http.StatusOK, history)
}

// GetCurrentHourlyWage 現在の時給を取得
func GetCurrentHourlyWage(c echo.Context) error {
	employeeID := c.QueryParam("employee_id")
	if employeeID == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "従業員IDが必要です",
		})
	}

	var hw models.HourlyWage
	err := database.DB.QueryRow(`
		SELECT hw.id, hw.employee_id, hw.hourly_wage, hw.effective_date, 
		       hw.created_at, hw.updated_at, e.name as employee_name
		FROM hourly_wages hw
		JOIN employees e ON hw.employee_id = e.id
		WHERE hw.employee_id = $1
		ORDER BY hw.effective_date DESC, hw.created_at DESC
		LIMIT 1
	`, employeeID).Scan(&hw.ID, &hw.EmployeeID, &hw.HourlyWage, &hw.EffectiveDate,
		&hw.CreatedAt, &hw.UpdatedAt, &hw.EmployeeName)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時給設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, hw)
}
