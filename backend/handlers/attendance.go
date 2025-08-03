package handlers

import (
	"net/http"
	"strconv"
	"time"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// GetAttendances 出退勤記録一覧を取得
func GetAttendances(c echo.Context) error {
	// クエリパラメータの取得
	employeeID := c.QueryParam("employee_id")
	startDate := c.QueryParam("start_date")
	endDate := c.QueryParam("end_date")

	query := `
		SELECT a.id, a.employee_id, a.date, a.clock_in_time, a.clock_out_time, 
		       a.actual_hours, a.status, a.created_at, a.updated_at, e.name as employee_name
		FROM attendance a
		JOIN employees e ON a.employee_id = e.id
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if employeeID != "" {
		query += " AND a.employee_id = $" + strconv.Itoa(argIndex)
		args = append(args, employeeID)
		argIndex++
	}

	if startDate != "" {
		query += " AND a.date >= $" + strconv.Itoa(argIndex)
		args = append(args, startDate)
		argIndex++
	}

	if endDate != "" {
		query += " AND a.date <= $" + strconv.Itoa(argIndex)
		args = append(args, endDate)
		argIndex++
	}

	query += " ORDER BY a.date DESC, a.created_at DESC"

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "出退勤記録一覧の取得に失敗しました",
		})
	}
	defer rows.Close()

	var attendances []models.Attendance
	for rows.Next() {
		var att models.Attendance
		err := rows.Scan(&att.ID, &att.EmployeeID, &att.Date, &att.ClockInTime,
			&att.ClockOutTime, &att.ActualHours, &att.Status, &att.CreatedAt, &att.UpdatedAt, &att.EmployeeName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		attendances = append(attendances, att)
	}

	return c.JSON(http.StatusOK, attendances)
}

// GetAttendance 出退勤記録詳細を取得
func GetAttendance(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var att models.Attendance
	err = database.DB.QueryRow(`
		SELECT a.id, a.employee_id, a.date, a.clock_in_time, a.clock_out_time, 
		       a.actual_hours, a.status, a.created_at, a.updated_at, e.name as employee_name
		FROM attendance a
		JOIN employees e ON a.employee_id = e.id
		WHERE a.id = $1
	`, id).Scan(&att.ID, &att.EmployeeID, &att.Date, &att.ClockInTime,
		&att.ClockOutTime, &att.ActualHours, &att.Status, &att.CreatedAt, &att.UpdatedAt, &att.EmployeeName)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "出退勤記録が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, att)
}

// CreateAttendance 出退勤記録を作成
func CreateAttendance(c echo.Context) error {
	var req models.CreateAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.EmployeeID == 0 || req.Date == "" {
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

	// 同じ日付の記録が既に存在するかチェック
	var existingID int
	err = database.DB.QueryRow("SELECT id FROM attendance WHERE employee_id = $1 AND date = $2", req.EmployeeID, req.Date).Scan(&existingID)
	if err == nil {
		return c.JSON(http.StatusConflict, map[string]string{
			"error": "同じ日付の出退勤記録が既に存在します",
		})
	}

	// ステータスのデフォルト値設定
	if req.Status == "" {
		req.Status = "present"
	}

	var attendance models.Attendance
	err = database.DB.QueryRow(`
		INSERT INTO attendance (employee_id, date, clock_in_time, clock_out_time, status) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id, employee_id, date, clock_in_time, clock_out_time, actual_hours, status, created_at, updated_at
	`, req.EmployeeID, req.Date, req.ClockInTime, req.ClockOutTime, req.Status).Scan(
		&attendance.ID, &attendance.EmployeeID, &attendance.Date, &attendance.ClockInTime,
		&attendance.ClockOutTime, &attendance.ActualHours, &attendance.Status, &attendance.CreatedAt, &attendance.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "出退勤記録の作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, attendance)
}

// UpdateAttendance 出退勤記録を更新
func UpdateAttendance(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.UpdateAttendanceRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// ステータスのバリデーション
	if req.Status != "" && req.Status != "present" && req.Status != "absent" && req.Status != "late" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なステータスです",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE attendance 
		SET clock_in_time = COALESCE($1, clock_in_time),
		    clock_out_time = COALESCE($2, clock_out_time),
		    status = COALESCE($3, status),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $4
	`, req.ClockInTime, req.ClockOutTime, req.Status, id)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "出退勤記録の更新に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "出退勤記録が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "出退勤記録が更新されました",
	})
}

// DeleteAttendance 出退勤記録を削除
func DeleteAttendance(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	result, err := database.DB.Exec("DELETE FROM attendance WHERE id = $1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "出退勤記録の削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "出退勤記録が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "出退勤記録が削除されました",
	})
}

// ClockIn 出勤記録
func ClockIn(c echo.Context) error {
	var req models.ClockInRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.EmployeeID == 0 || req.Date == "" || req.Time == "" {
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

	// 既存の記録を確認
	var existingID int
	err = database.DB.QueryRow("SELECT id FROM attendance WHERE employee_id = $1 AND date = $2", req.EmployeeID, req.Date).Scan(&existingID)

	if err != nil {
		// 記録が存在しない場合は新規作成
		var attendance models.Attendance
		err = database.DB.QueryRow(`
			INSERT INTO attendance (employee_id, date, clock_in_time, status) 
			VALUES ($1, $2, $3, 'present') 
			RETURNING id, employee_id, date, clock_in_time, clock_out_time, actual_hours, status, created_at, updated_at
		`, req.EmployeeID, req.Date, req.Time).Scan(
			&attendance.ID, &attendance.EmployeeID, &attendance.Date, &attendance.ClockInTime,
			&attendance.ClockOutTime, &attendance.ActualHours, &attendance.Status, &attendance.CreatedAt, &attendance.UpdatedAt)

		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "出勤記録の作成に失敗しました",
			})
		}

		return c.JSON(http.StatusCreated, attendance)
	} else {
		// 既存の記録を更新
		_, err = database.DB.Exec(`
			UPDATE attendance 
			SET clock_in_time = $1, updated_at = CURRENT_TIMESTAMP
			WHERE id = $2
		`, req.Time, existingID)

		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "出勤記録の更新に失敗しました",
			})
		}

		return c.JSON(http.StatusOK, map[string]string{
			"message": "出勤記録が更新されました",
		})
	}
}

// ClockOut 退勤記録
func ClockOut(c echo.Context) error {
	var req models.ClockOutRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.EmployeeID == 0 || req.Date == "" || req.Time == "" {
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

	// 既存の記録を確認
	var existingID int
	var clockInTime string
	err = database.DB.QueryRow("SELECT id, clock_in_time FROM attendance WHERE employee_id = $1 AND date = $2", req.EmployeeID, req.Date).Scan(&existingID, &clockInTime)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "出勤記録が見つかりません。先に出勤記録を作成してください",
		})
	}

	// 退勤時間を更新
	_, err = database.DB.Exec(`
		UPDATE attendance 
		SET clock_out_time = $1, updated_at = CURRENT_TIMESTAMP
		WHERE id = $2
	`, req.Time, existingID)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "退勤記録の更新に失敗しました",
		})
	}

	// 実際の勤務時間を計算
	if clockInTime != "" {
		clockIn, _ := time.Parse("15:04", clockInTime)
		clockOut, _ := time.Parse("15:04", req.Time)
		actualHours := clockOut.Sub(clockIn).Hours()

		_, err = database.DB.Exec(`
			UPDATE attendance 
			SET actual_hours = $1
			WHERE id = $2
		`, actualHours, existingID)
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "退勤記録が更新されました",
	})
}
