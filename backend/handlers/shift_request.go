package handlers

import (
	"net/http"
	"strconv"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// GetShiftRequests シフト希望一覧を取得
func GetShiftRequests(c echo.Context) error {
	rows, err := database.DB.Query(`
		SELECT sr.id, sr.employee_id, sr.date, sr.preferred_start_time, sr.preferred_end_time, 
		       sr.status, sr.created_at, sr.updated_at, e.name as employee_name
		FROM shift_requests sr
		JOIN employees e ON sr.employee_id = e.id
		ORDER BY sr.date DESC, sr.created_at DESC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフト希望一覧の取得に失敗しました",
		})
	}
	defer rows.Close()

	var requests []models.ShiftRequest
	for rows.Next() {
		var req models.ShiftRequest
		err := rows.Scan(&req.ID, &req.EmployeeID, &req.Date, &req.PreferredStartTime,
			&req.PreferredEndTime, &req.Status, &req.CreatedAt, &req.UpdatedAt, &req.EmployeeName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		requests = append(requests, req)
	}

	return c.JSON(http.StatusOK, requests)
}

// GetShiftRequest シフト希望詳細を取得
func GetShiftRequest(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.ShiftRequest
	err = database.DB.QueryRow(`
		SELECT sr.id, sr.employee_id, sr.date, sr.preferred_start_time, sr.preferred_end_time, 
		       sr.status, sr.created_at, sr.updated_at, e.name as employee_name
		FROM shift_requests sr
		JOIN employees e ON sr.employee_id = e.id
		WHERE sr.id = $1
	`, id).Scan(&req.ID, &req.EmployeeID, &req.Date, &req.PreferredStartTime,
		&req.PreferredEndTime, &req.Status, &req.CreatedAt, &req.UpdatedAt, &req.EmployeeName)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "シフト希望が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, req)
}

// CreateShiftRequest シフト希望を作成
func CreateShiftRequest(c echo.Context) error {
	var req models.CreateShiftRequestRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.EmployeeID == 0 || req.Date == "" || req.PreferredStartTime == "" || req.PreferredEndTime == "" {
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

	var shiftReq models.ShiftRequest
	err = database.DB.QueryRow(`
		INSERT INTO shift_requests (employee_id, date, preferred_start_time, preferred_end_time, status) 
		VALUES ($1, $2, $3, $4, 'submitted') 
		RETURNING id, employee_id, date, preferred_start_time, preferred_end_time, status, created_at, updated_at
	`, req.EmployeeID, req.Date, req.PreferredStartTime, req.PreferredEndTime).Scan(
		&shiftReq.ID, &shiftReq.EmployeeID, &shiftReq.Date, &shiftReq.PreferredStartTime,
		&shiftReq.PreferredEndTime, &shiftReq.Status, &shiftReq.CreatedAt, &shiftReq.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフト希望の作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, shiftReq)
}

// UpdateShiftRequest シフト希望を更新
func UpdateShiftRequest(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.UpdateShiftRequestRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// ステータスのバリデーション
	if req.Status != "" && req.Status != "submitted" && req.Status != "processed" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なステータスです",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE shift_requests 
		SET date = COALESCE($1, date),
		    preferred_start_time = COALESCE($2, preferred_start_time),
		    preferred_end_time = COALESCE($3, preferred_end_time),
		    status = COALESCE($4, status),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $5
	`, req.Date, req.PreferredStartTime, req.PreferredEndTime, req.Status, id)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフト希望の更新に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "シフト希望が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "シフト希望が更新されました",
	})
}

// DeleteShiftRequest シフト希望を削除
func DeleteShiftRequest(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	result, err := database.DB.Exec("DELETE FROM shift_requests WHERE id = $1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフト希望の削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "シフト希望が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "シフト希望が削除されました",
	})
}
