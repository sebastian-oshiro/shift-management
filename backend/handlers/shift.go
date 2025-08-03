package handlers

import (
	"fmt"
	"net/http"
	"strconv"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// GetShifts シフト一覧を取得
func GetShifts(c echo.Context) error {
	rows, err := database.DB.Query(`
		SELECT s.id, s.employee_id, s.date, s.start_time, s.end_time, s.break_time, 
		       s.created_at, s.updated_at, e.name as employee_name
		FROM shifts s
		JOIN employees e ON s.employee_id = e.id
		ORDER BY s.date DESC, s.start_time
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフト一覧の取得に失敗しました",
		})
	}
	defer rows.Close()

	var shifts []models.Shift
	for rows.Next() {
		var shift models.Shift
		err := rows.Scan(&shift.ID, &shift.EmployeeID, &shift.Date, &shift.StartTime,
			&shift.EndTime, &shift.BreakTime, &shift.CreatedAt, &shift.UpdatedAt, &shift.EmployeeName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		shifts = append(shifts, shift)
	}

	return c.JSON(http.StatusOK, shifts)
}

// GetShift シフト詳細を取得
func GetShift(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var shift models.Shift
	err = database.DB.QueryRow(`
		SELECT s.id, s.employee_id, s.date, s.start_time, s.end_time, s.break_time, 
		       s.created_at, s.updated_at, e.name as employee_name
		FROM shifts s
		JOIN employees e ON s.employee_id = e.id
		WHERE s.id = $1
	`, id).Scan(&shift.ID, &shift.EmployeeID, &shift.Date, &shift.StartTime,
		&shift.EndTime, &shift.BreakTime, &shift.CreatedAt, &shift.UpdatedAt, &shift.EmployeeName)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "シフトが見つかりません",
		})
	}

	return c.JSON(http.StatusOK, shift)
}

// CreateShift シフトを作成
func CreateShift(c echo.Context) error {
	var req models.CreateShiftRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.EmployeeID == 0 || req.Date == "" || req.StartTime == "" || req.EndTime == "" {
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

	// 重複チェック（同じ従業員の同じ日付のシフトが既に存在するか）
	var duplicateExists bool
	err = database.DB.QueryRow(`
		SELECT EXISTS(
			SELECT 1 FROM shifts 
			WHERE employee_id = $1 AND date = $2
		)
	`, req.EmployeeID, req.Date).Scan(&duplicateExists)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "重複チェックに失敗しました",
		})
	}

	if duplicateExists {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "この従業員は既に同じ日付のシフトが設定されています",
		})
	}

	var shift models.Shift
	err = database.DB.QueryRow(`
		INSERT INTO shifts (employee_id, date, start_time, end_time, break_time) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id, employee_id, date, start_time, end_time, break_time, created_at, updated_at
	`, req.EmployeeID, req.Date, req.StartTime, req.EndTime, req.BreakTime).Scan(
		&shift.ID, &shift.EmployeeID, &shift.Date, &shift.StartTime, &shift.EndTime, &shift.BreakTime, &shift.CreatedAt, &shift.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフトの作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, shift)
}

// UpdateShift シフトを更新
func UpdateShift(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.UpdateShiftRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// 従業員の存在確認（employee_idが指定されている場合）
	if req.EmployeeID != 0 {
		var employeeExists bool
		err := database.DB.QueryRow("SELECT EXISTS(SELECT 1 FROM employees WHERE id = $1)", req.EmployeeID).Scan(&employeeExists)
		if err != nil || !employeeExists {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "指定された従業員が存在しません",
			})
		}
	}

	result, err := database.DB.Exec(`
		UPDATE shifts 
		SET employee_id = COALESCE($1, employee_id),
		    date = COALESCE($2, date),
		    start_time = COALESCE($3, start_time),
		    end_time = COALESCE($4, end_time),
		    break_time = COALESCE($5, break_time),
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $6
	`, req.EmployeeID, req.Date, req.StartTime, req.EndTime, req.BreakTime, id)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフトの更新に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "シフトが見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "シフトが更新されました",
	})
}

// DeleteShift シフトを削除
func DeleteShift(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	result, err := database.DB.Exec("DELETE FROM shifts WHERE id = $1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフトの削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "シフトが見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "シフトが削除されました",
	})
}

// GetShiftsByMonth 月別シフトを取得
func GetShiftsByMonth(c echo.Context) error {
	year := c.QueryParam("year")
	month := c.QueryParam("month")

	if year == "" || month == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "年と月を指定してください",
		})
	}

	// デバッグ用ログ
	fmt.Printf("月別シフト取得: year=%s, month=%s\n", year, month)

	// 月の開始日と終了日を計算
	startDate := year + "-" + month + "-01"

	// 月の終了日を正確に計算
	var endDate string
	switch month {
	case "02":
		// 2月の処理（うるう年を考慮）
		yearInt, _ := strconv.Atoi(year)
		if (yearInt%4 == 0 && yearInt%100 != 0) || (yearInt%400 == 0) {
			endDate = year + "-02-29" // うるう年
		} else {
			endDate = year + "-02-28" // 平年
		}
	case "04", "06", "09", "11":
		// 30日の月
		endDate = year + "-" + month + "-30"
	default:
		// 31日の月
		endDate = year + "-" + month + "-31"
	}

	// デバッグ用ログ
	fmt.Printf("検索期間: %s から %s\n", startDate, endDate)

	rows, err := database.DB.Query(`
		SELECT s.id, s.employee_id, s.date, s.start_time, s.end_time, s.break_time, 
		       s.created_at, s.updated_at, e.name as employee_name
		FROM shifts s
		JOIN employees e ON s.employee_id = e.id
		WHERE s.date >= $1 AND s.date <= $2
		ORDER BY s.date ASC, s.start_time ASC
	`, startDate, endDate)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "月別シフトの取得に失敗しました",
		})
	}
	defer rows.Close()

	var shifts []models.Shift
	for rows.Next() {
		var shift models.Shift
		err := rows.Scan(&shift.ID, &shift.EmployeeID, &shift.Date, &shift.StartTime,
			&shift.EndTime, &shift.BreakTime, &shift.CreatedAt, &shift.UpdatedAt, &shift.EmployeeName)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		shifts = append(shifts, shift)
	}

	return c.JSON(http.StatusOK, shifts)
}
