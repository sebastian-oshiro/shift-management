package handlers

import (
	"net/http"
	"strconv"
	"time"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// CalculatePayroll 月別給与計算
func CalculatePayroll(c echo.Context) error {
	year := c.QueryParam("year")
	month := c.QueryParam("month")

	if year == "" || month == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "年と月のパラメータが必要です",
		})
	}

	yearInt, err := strconv.Atoi(year)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "年は数値で指定してください",
		})
	}

	monthInt, err := strconv.Atoi(month)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "月は数値で指定してください",
		})
	}

	// 月の開始日と終了日を計算
	startDate := time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	// シフトデータを取得
	query := `
		SELECT 
			s.id,
			s.employee_id,
			e.name as employee_name,
			s.date,
			s.start_time,
			s.end_time,
			s.break_time,
			COALESCE(hw.hourly_wage, 1000) as hourly_wage
		FROM shifts s
		JOIN employees e ON s.employee_id = e.id
		LEFT JOIN hourly_wages hw ON s.employee_id = hw.employee_id 
			AND hw.effective_date <= s.date
			AND hw.id = (
				SELECT MAX(id) FROM hourly_wages hw2 
				WHERE hw2.employee_id = s.employee_id 
				AND hw2.effective_date <= s.date
			)
		WHERE s.date >= $1 AND s.date <= $2
		ORDER BY s.employee_id, s.date
	`

	rows, err := database.DB.Query(query, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフトデータの取得に失敗しました",
		})
	}
	defer rows.Close()

	// 従業員別にデータを集計
	employeeData := make(map[int]*models.PayrollData)

	for rows.Next() {
		var shift struct {
			ID           int       `json:"id"`
			EmployeeID   int       `json:"employee_id"`
			EmployeeName string    `json:"employee_name"`
			Date         time.Time `json:"date"`
			StartTime    time.Time `json:"start_time"`
			EndTime      time.Time `json:"end_time"`
			BreakTime    int       `json:"break_time"`
			HourlyWage   int       `json:"hourly_wage"`
		}

		err := rows.Scan(
			&shift.ID,
			&shift.EmployeeID,
			&shift.EmployeeName,
			&shift.Date,
			&shift.StartTime,
			&shift.EndTime,
			&shift.BreakTime,
			&shift.HourlyWage,
		)
		if err != nil {
			continue
		}

		// 労働時間を計算
		duration := shift.EndTime.Sub(shift.StartTime)
		totalHours := duration.Hours()
		netHours := totalHours - float64(shift.BreakTime)/60.0

		if data, exists := employeeData[shift.EmployeeID]; exists {
			data.TotalHours += totalHours
			data.TotalBreakTime += shift.BreakTime
			data.NetHours += netHours
			data.ShiftCount++
			// 最新の時給を使用
			if shift.HourlyWage > data.HourlyWage {
				data.HourlyWage = shift.HourlyWage
			}
		} else {
			employeeData[shift.EmployeeID] = &models.PayrollData{
				EmployeeID:     shift.EmployeeID,
				EmployeeName:   shift.EmployeeName,
				TotalHours:     totalHours,
				TotalBreakTime: shift.BreakTime,
				NetHours:       netHours,
				HourlyWage:     shift.HourlyWage,
				ShiftCount:     1,
			}
		}
	}

	// 給与を計算
	var result []models.PayrollData
	for _, data := range employeeData {
		data.TotalSalary = int(data.NetHours * float64(data.HourlyWage))
		result = append(result, *data)
	}

	return c.JSON(http.StatusOK, result)
}

// GetEmployeePayroll 従業員個人の給与取得
func GetEmployeePayroll(c echo.Context) error {
	employeeID := c.Param("id")
	year := c.QueryParam("year")
	month := c.QueryParam("month")

	if year == "" || month == "" {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "年と月のパラメータが必要です",
		})
	}

	yearInt, err := strconv.Atoi(year)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "年は数値で指定してください",
		})
	}

	monthInt, err := strconv.Atoi(month)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "月は数値で指定してください",
		})
	}

	employeeIDInt, err := strconv.Atoi(employeeID)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "従業員IDは数値で指定してください",
		})
	}

	// 月の開始日と終了日を計算
	startDate := time.Date(yearInt, time.Month(monthInt), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, -1)

	// 従業員のシフトデータを取得
	query := `
		SELECT 
			s.id,
			s.employee_id,
			e.name as employee_name,
			s.date,
			s.start_time,
			s.end_time,
			s.break_time,
			COALESCE(hw.hourly_wage, 1000) as hourly_wage
		FROM shifts s
		JOIN employees e ON s.employee_id = e.id
		LEFT JOIN hourly_wages hw ON s.employee_id = hw.employee_id 
			AND hw.effective_date <= s.date
			AND hw.id = (
				SELECT MAX(id) FROM hourly_wages hw2 
				WHERE hw2.employee_id = s.employee_id 
				AND hw2.effective_date <= s.date
			)
		WHERE s.employee_id = $1 AND s.date >= $2 AND s.date <= $3
		ORDER BY s.date
	`

	rows, err := database.DB.Query(query, employeeIDInt, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "シフトデータの取得に失敗しました",
		})
	}
	defer rows.Close()

	var totalHours, totalBreakTime, netHours float64
	var shiftCount int
	var hourlyWage int
	var employeeName string

	for rows.Next() {
		var shift struct {
			ID           int       `json:"id"`
			EmployeeID   int       `json:"employee_id"`
			EmployeeName string    `json:"employee_name"`
			Date         time.Time `json:"date"`
			StartTime    time.Time `json:"start_time"`
			EndTime      time.Time `json:"end_time"`
			BreakTime    int       `json:"break_time"`
			HourlyWage   int       `json:"hourly_wage"`
		}

		err := rows.Scan(
			&shift.ID,
			&shift.EmployeeID,
			&shift.EmployeeName,
			&shift.Date,
			&shift.StartTime,
			&shift.EndTime,
			&shift.BreakTime,
			&shift.HourlyWage,
		)
		if err != nil {
			continue
		}

		employeeName = shift.EmployeeName
		duration := shift.EndTime.Sub(shift.StartTime)
		totalHours += duration.Hours()
		totalBreakTime += float64(shift.BreakTime)
		netHours += duration.Hours() - float64(shift.BreakTime)/60.0
		shiftCount++
		// 最新の時給を使用
		if shift.HourlyWage > hourlyWage {
			hourlyWage = shift.HourlyWage
		}
	}

	if shiftCount == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "指定月のシフトデータが見つかりません",
		})
	}

	totalSalary := int(netHours * float64(hourlyWage))

	result := models.PayrollData{
		EmployeeID:     employeeIDInt,
		EmployeeName:   employeeName,
		TotalHours:     totalHours,
		TotalBreakTime: int(totalBreakTime),
		NetHours:       netHours,
		HourlyWage:     hourlyWage,
		TotalSalary:    totalSalary,
		ShiftCount:     shiftCount,
	}

	return c.JSON(http.StatusOK, result)
}
