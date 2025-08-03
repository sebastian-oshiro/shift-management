package handlers

import (
	"log"
	"net/http"
	"strconv"
	"time"

	"shift-management-backend/database"
	"shift-management-backend/models"

	"github.com/labstack/echo/v4"
)

// GetTimeSlots 時間帯設定一覧を取得
func GetTimeSlots(c echo.Context) error {
	// クエリパラメータの取得
	dayOfWeek := c.QueryParam("day_of_week")

	query := `
		SELECT id, day_of_week, start_time, end_time, position, required_count, created_at, updated_at
		FROM time_slots
		WHERE 1=1
	`
	args := []interface{}{}
	argIndex := 1

	if dayOfWeek != "" {
		query += " AND day_of_week = $" + strconv.Itoa(argIndex)
		args = append(args, dayOfWeek)
		argIndex++
	}

	query += " ORDER BY day_of_week, start_time, position"

	// デバッグ用ログ
	log.Printf("実行するクエリ: %s", query)
	log.Printf("クエリパラメータ: %v", args)

	rows, err := database.DB.Query(query, args...)
	if err != nil {
		log.Printf("データベースクエリエラー: %v", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時間帯設定一覧の取得に失敗しました: " + err.Error(),
		})
	}
	defer rows.Close()

	var timeSlots []models.TimeSlot
	for rows.Next() {
		var ts models.TimeSlot
		err := rows.Scan(&ts.ID, &ts.DayOfWeek, &ts.StartTime, &ts.EndTime,
			&ts.Position, &ts.RequiredCount, &ts.CreatedAt, &ts.UpdatedAt)
		if err != nil {
			log.Printf("データスキャンエラー: %v", err)
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました: " + err.Error(),
			})
		}
		timeSlots = append(timeSlots, ts)
	}

	log.Printf("取得した時間帯設定数: %d", len(timeSlots))
	return c.JSON(http.StatusOK, timeSlots)
}

// GetTimeSlot 時間帯設定詳細を取得
func GetTimeSlot(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var ts models.TimeSlot
	err = database.DB.QueryRow(`
		SELECT id, day_of_week, start_time, end_time, position, required_count, created_at, updated_at
		FROM time_slots
		WHERE id = $1
	`, id).Scan(&ts.ID, &ts.DayOfWeek, &ts.StartTime, &ts.EndTime,
		&ts.Position, &ts.RequiredCount, &ts.CreatedAt, &ts.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時間帯設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, ts)
}

// CreateTimeSlot 時間帯設定を作成
func CreateTimeSlot(c echo.Context) error {
	var req models.CreateTimeSlotRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// バリデーション
	if req.DayOfWeek < 0 || req.DayOfWeek > 6 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "曜日は0-6の範囲で指定してください",
		})
	}

	if req.RequiredCount < 1 {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "必要人数は1以上で指定してください",
		})
	}

	var timeSlot models.TimeSlot
	err := database.DB.QueryRow(`
		INSERT INTO time_slots (day_of_week, start_time, end_time, position, required_count) 
		VALUES ($1, $2, $3, $4, $5) 
		RETURNING id, day_of_week, start_time, end_time, position, required_count, created_at, updated_at
	`, req.DayOfWeek, req.StartTime, req.EndTime, req.Position, req.RequiredCount).Scan(
		&timeSlot.ID, &timeSlot.DayOfWeek, &timeSlot.StartTime, &timeSlot.EndTime,
		&timeSlot.Position, &timeSlot.RequiredCount, &timeSlot.CreatedAt, &timeSlot.UpdatedAt)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時間帯設定の作成に失敗しました",
		})
	}

	return c.JSON(http.StatusCreated, timeSlot)
}

// UpdateTimeSlot 時間帯設定を更新
func UpdateTimeSlot(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	var req models.UpdateTimeSlotRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "リクエストの解析に失敗しました",
		})
	}

	// 更新用のクエリを構築
	query := "UPDATE time_slots SET updated_at = CURRENT_TIMESTAMP"
	args := []interface{}{}
	argIndex := 1

	if req.DayOfWeek != nil {
		if *req.DayOfWeek < 0 || *req.DayOfWeek > 6 {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "曜日は0-6の範囲で指定してください",
			})
		}
		query += ", day_of_week = $" + strconv.Itoa(argIndex)
		args = append(args, *req.DayOfWeek)
		argIndex++
	}

	if req.StartTime != nil {
		query += ", start_time = $" + strconv.Itoa(argIndex)
		args = append(args, *req.StartTime)
		argIndex++
	}

	if req.EndTime != nil {
		query += ", end_time = $" + strconv.Itoa(argIndex)
		args = append(args, *req.EndTime)
		argIndex++
	}

	if req.Position != nil {
		query += ", position = $" + strconv.Itoa(argIndex)
		args = append(args, *req.Position)
		argIndex++
	}

	if req.RequiredCount != nil {
		if *req.RequiredCount < 1 {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "必要人数は1以上で指定してください",
			})
		}
		query += ", required_count = $" + strconv.Itoa(argIndex)
		args = append(args, *req.RequiredCount)
		argIndex++
	}

	query += " WHERE id = $" + strconv.Itoa(argIndex)
	args = append(args, id)

	result, err := database.DB.Exec(query, args...)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時間帯設定の更新に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時間帯設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "時間帯設定が更新されました",
	})
}

// DeleteTimeSlot 時間帯設定を削除
func DeleteTimeSlot(c echo.Context) error {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効なIDです",
		})
	}

	result, err := database.DB.Exec("DELETE FROM time_slots WHERE id = $1", id)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "時間帯設定の削除に失敗しました",
		})
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return c.JSON(http.StatusNotFound, map[string]string{
			"error": "時間帯設定が見つかりません",
		})
	}

	return c.JSON(http.StatusOK, map[string]string{
		"message": "時間帯設定が削除されました",
	})
}

// GetCoverageSummary 指定日のカバレッジサマリーを取得
func GetCoverageSummary(c echo.Context) error {
	date := c.QueryParam("date")
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	// 指定日の曜日を取得
	targetDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{
			"error": "無効な日付です",
		})
	}
	dayOfWeek := int(targetDate.Weekday())

	query := `
		SELECT 
			$1 as date,
			ts.day_of_week,
			ts.start_time,
			ts.end_time,
			ts.position,
			ts.required_count,
			COALESCE(sc.actual_count, 0) as actual_count,
			ts.required_count - COALESCE(sc.actual_count, 0) as shortage
		FROM time_slots ts
		LEFT JOIN shift_coverage sc ON ts.id = sc.time_slot_id AND sc.date = $1
		WHERE ts.day_of_week = $2
		ORDER BY ts.start_time, ts.position
	`

	rows, err := database.DB.Query(query, date, dayOfWeek)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{
			"error": "カバレッジサマリーの取得に失敗しました",
		})
	}
	defer rows.Close()

	var summaries []models.CoverageSummary
	for rows.Next() {
		var summary models.CoverageSummary
		err := rows.Scan(&summary.Date, &summary.DayOfWeek, &summary.StartTime,
			&summary.EndTime, &summary.Position, &summary.RequiredCount,
			&summary.ActualCount, &summary.Shortage)
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{
				"error": "データの読み込みに失敗しました",
			})
		}
		summary.Status = summary.GetStatus()
		summaries = append(summaries, summary)
	}

	return c.JSON(http.StatusOK, summaries)
}
