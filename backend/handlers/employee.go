package handlers

import (
	"net/http"
	"strconv"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// GetEmployees 従業員一覧を取得
func GetEmployees(c echo.Context) error {
	rows, err := database.DB.Query(`
		SELECT id, name, hourly_wage, created_at, updated_at 
		FROM employees 
		ORDER BY id ASC
	`)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "従業員一覧の取得に失敗しました",
		})
	}
	defer rows.Close()

	var employees []models.Employee
	for rows.Next() {
		var emp models.Employee
		err := rows.Scan(&emp.ID, &emp.Name, &emp.HourlyWage, &emp.CreatedAt, &emp.UpdatedAt)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		employees = append(employees, emp)
	}

	return c.JSON(http.StatusOK, employees)
}

// GetEmployee 従業員詳細を取得
func GetEmployee(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var emp models.Employee
	err = database.DB.QueryRow(`
		SELECT id, name, hourly_wage, created_at, updated_at 
		FROM employees 
		WHERE id = $1
	`, id).Scan(&emp.ID, &emp.Name, &emp.HourlyWage, &emp.CreatedAt, &emp.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "従業員が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, emp)
}

// CreateEmployee 従業員を作成
func CreateEmployee(c echo.Context) error {
	var req models.CreateEmployeeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	if req.Name == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "名前は必須です",
		})
	}

	if req.HourlyWage <= 0 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "時給は1円以上である必要があります",
		})
	}

	var emp models.Employee
	err := database.DB.QueryRow(`
		INSERT INTO employees (name, hourly_wage) 
		VALUES ($1, $2) 
		RETURNING id, name, hourly_wage, created_at, updated_at
	`, req.Name, req.HourlyWage).Scan(&emp.ID, &emp.Name, &emp.HourlyWage, &emp.CreatedAt, &emp.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "従業員の作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, emp)
}

// UpdateEmployee 従業員を更新
func UpdateEmployee(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.UpdateEmployeeRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	result, err := database.DB.Exec(`
		UPDATE employees 
		SET name = $1, 
		    hourly_wage = $2,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = $3
	`, req.Name, req.HourlyWage, id)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "従業員の更新に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "従業員が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "従業員が更新されました",
	})
}

// DeleteEmployee 従業員を削除
func DeleteEmployee(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	result, err := database.DB.Exec("DELETE FROM employees WHERE id = $1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "従業員の削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "従業員が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "従業員が削除されました",
	})
}
