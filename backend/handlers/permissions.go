package handlers

import (
	"bytes"
	"io"
	"log"
	"net/http"
	"strconv"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"database/sql"

	"github.com/labstack/echo/v4"
)

// GetPermissions 権限設定一覧取得
func GetPermissions(c echo.Context) error {
	query := `
		SELECT p.id, p.employee_id, e.name as employee_name, 
		       p.can_view_other_shifts, p.can_view_payroll, 
		       p.can_edit_attendance, p.can_submit_shift_requests,
		       p.created_at, p.updated_at
		FROM permissions p
		JOIN employees e ON p.employee_id = e.id
		ORDER BY p.employee_id
	`

	rows, err := database.DB.Query(query)
	if err != nil {
		log.Printf("権限設定取得エラー: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "権限設定の取得に失敗しました",
		})
	}
	defer rows.Close()

	var permissions []models.EmployeePermission
	for rows.Next() {
		var permission models.EmployeePermission
		err := rows.Scan(
			&permission.ID,
			&permission.EmployeeID,
			&permission.EmployeeName,
			&permission.CanViewOtherShifts,
			&permission.CanViewPayroll,
			&permission.CanEditAttendance,
			&permission.CanSubmitShiftRequests,
			&permission.CreatedAt,
			&permission.UpdatedAt,
		)
		if err != nil {
			log.Printf("権限設定データスキャンエラー: %v", err)
			continue
		}
		permissions = append(permissions, permission)
	}

	log.Printf("取得した権限設定数: %d", len(permissions))
	return c.JSON(http.StatusOK, permissions)
}

// GetEmployeePermission 従業員権限取得
func GetEmployeePermission(c echo.Context) error {
	employeeID := c.Param("id")

	employeeIDInt, err := strconv.Atoi(employeeID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "従業員IDは数値で指定してください",
		})
	}

	query := `
		SELECT 
			p.id,
			p.employee_id,
			e.name as employee_name,
			p.can_view_other_shifts,
			p.can_view_payroll,
			p.can_edit_attendance,
			p.can_submit_shift_requests,
			p.created_at,
			p.updated_at
		FROM permissions p
		JOIN employees e ON p.employee_id = e.id
		WHERE p.employee_id = $1
	`

	var permission models.EmployeePermission
	err = database.DB.QueryRow(query, employeeIDInt).Scan(
		&permission.ID,
		&permission.EmployeeID,
		&permission.EmployeeName,
		&permission.CanViewOtherShifts,
		&permission.CanViewPayroll,
		&permission.CanEditAttendance,
		&permission.CanSubmitShiftRequests,
		&permission.CreatedAt,
		&permission.UpdatedAt,
	)

	if err != nil {
		// 権限設定が存在しない場合はデフォルト値を返す
		return c.JSON(http.StatusOK, models.EmployeePermission{
			EmployeeID:             employeeIDInt,
			CanViewOtherShifts:     false,
			CanViewPayroll:         false,
			CanEditAttendance:      false,
			CanSubmitShiftRequests: true, // デフォルトで許可
		})
	}

	return c.JSON(http.StatusOK, permission)
}

// CreatePermission 権限設定作成
func CreatePermission(c echo.Context) error {
	var request models.CreatePermissionRequest

	// リクエストボディをログ出力
	bodyBytes, err := io.ReadAll(c.Request().Body)
	if err != nil {
		log.Printf("CreatePermission - リクエストボディ読み取りエラー: %v", err)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました: " + err.Error(),
		})
	}

	log.Printf("受信したリクエストボディ: %s", string(bodyBytes))

	// ボディを再設定（後でBindで使用するため）
	c.Request().Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

	if err := c.Bind(&request); err != nil {
		log.Printf("CreatePermission - リクエスト解析エラー詳細: %v", err)
		log.Printf("CreatePermission - リクエストヘッダー: %v", c.Request().Header)
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました: " + err.Error(),
		})
	}

	log.Printf("権限設定作成リクエスト: %+v", request)

	// 既存の権限設定をチェック
	var existingID int
	err = database.DB.QueryRow("SELECT id FROM permissions WHERE employee_id = $1", request.EmployeeID).Scan(&existingID)

	if err == nil {
		// 既存の権限設定が見つかった場合、更新処理を実行
		log.Printf("既存の権限設定が見つかりました。更新処理に移行します。ID: %d", existingID)

		// 更新処理を直接実行
		query := `
			UPDATE permissions SET
				can_view_other_shifts = $2,
				can_view_payroll = $3,
				can_edit_attendance = $4,
				can_submit_shift_requests = $5,
				updated_at = CURRENT_TIMESTAMP
			WHERE employee_id = $1
			RETURNING id, created_at, updated_at
		`

		var permission models.EmployeePermission
		err = database.DB.QueryRow(
			query,
			request.EmployeeID,
			request.CanViewOtherShifts,
			request.CanViewPayroll,
			request.CanEditAttendance,
			request.CanSubmitShiftRequests,
		).Scan(&permission.ID, &permission.CreatedAt, &permission.UpdatedAt)

		if err != nil {
			log.Printf("権限設定更新エラー: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "権限設定の更新に失敗しました: " + err.Error(),
			})
		}

		// 従業員名を取得
		err = database.DB.QueryRow("SELECT name FROM employees WHERE id = $1", request.EmployeeID).Scan(&permission.EmployeeName)
		if err != nil {
			log.Printf("従業員名取得エラー: %v", err)
			permission.EmployeeName = "Unknown"
		}

		permission.EmployeeID = request.EmployeeID
		permission.CanViewOtherShifts = request.CanViewOtherShifts
		permission.CanViewPayroll = request.CanViewPayroll
		permission.CanEditAttendance = request.CanEditAttendance
		permission.CanSubmitShiftRequests = request.CanSubmitShiftRequests

		log.Printf("権限設定更新完了: %+v", permission)
		return c.JSON(http.StatusOK, permission)
	} else if err != sql.ErrNoRows {
		// データベースエラーの場合
		log.Printf("既存権限設定チェックエラー: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "権限設定の確認に失敗しました: " + err.Error(),
		})
	}

	// 新規作成処理（既存の権限設定がない場合）
	query := `
		INSERT INTO permissions (employee_id, can_view_other_shifts, can_view_payroll, can_edit_attendance, can_submit_shift_requests)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`

	var permission models.EmployeePermission
	err = database.DB.QueryRow(
		query,
		request.EmployeeID,
		request.CanViewOtherShifts,
		request.CanViewPayroll,
		request.CanEditAttendance,
		request.CanSubmitShiftRequests,
	).Scan(&permission.ID, &permission.CreatedAt, &permission.UpdatedAt)

	if err != nil {
		log.Printf("権限設定作成エラー: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "権限設定の作成に失敗しました: " + err.Error(),
		})
	}

	// 従業員名を取得
	err = database.DB.QueryRow("SELECT name FROM employees WHERE id = $1", request.EmployeeID).Scan(&permission.EmployeeName)
	if err != nil {
		log.Printf("従業員名取得エラー: %v", err)
		permission.EmployeeName = "Unknown"
	}

	permission.EmployeeID = request.EmployeeID
	permission.CanViewOtherShifts = request.CanViewOtherShifts
	permission.CanViewPayroll = request.CanViewPayroll
	permission.CanEditAttendance = request.CanEditAttendance
	permission.CanSubmitShiftRequests = request.CanSubmitShiftRequests

	log.Printf("権限設定作成完了: %+v", permission)
	return c.JSON(http.StatusCreated, permission)
}

// DeletePermission 権限設定削除
func DeletePermission(c echo.Context) error {
	permissionID := c.Param("id")

	permissionIDInt, err := strconv.Atoi(permissionID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "権限設定IDは数値で指定してください",
		})
	}

	result, err := database.DB.Exec("DELETE FROM permissions WHERE id = $1", permissionIDInt)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "権限設定の削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "指定された権限設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "権限設定を削除しました",
	})
}
