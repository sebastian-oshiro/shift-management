package models

import "time"

// TimeSlot 時間帯設定モデル
type TimeSlot struct {
	ID            int       `json:"id"`
	DayOfWeek     int       `json:"day_of_week"`
	StartTime     string    `json:"start_time"`
	EndTime       string    `json:"end_time"`
	Position      string    `json:"position"`
	RequiredCount int       `json:"required_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// CreateTimeSlotRequest 時間帯設定作成リクエスト
type CreateTimeSlotRequest struct {
	DayOfWeek     int    `json:"day_of_week" validate:"required,min=0,max=6"`
	StartTime     string `json:"start_time" validate:"required"`
	EndTime       string `json:"end_time" validate:"required"`
	Position      string `json:"position" validate:"required"`
	RequiredCount int    `json:"required_count" validate:"required,min=1"`
}

// UpdateTimeSlotRequest 時間帯設定更新リクエスト
type UpdateTimeSlotRequest struct {
	DayOfWeek     *int    `json:"day_of_week,omitempty"`
	StartTime     *string `json:"start_time,omitempty"`
	EndTime       *string `json:"end_time,omitempty"`
	Position      *string `json:"position,omitempty"`
	RequiredCount *int    `json:"required_count,omitempty"`
}

// ShiftCoverage シフトカバレッジモデル
type ShiftCoverage struct {
	ID            int       `json:"id"`
	Date          string    `json:"date"`
	TimeSlotID    int       `json:"time_slot_id"`
	Position      string    `json:"position"`
	RequiredCount int       `json:"required_count"`
	ActualCount   int       `json:"actual_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	// 関連データ
	TimeSlot *TimeSlot `json:"time_slot,omitempty"`
}

// CoverageSummary カバレッジサマリーモデル
type CoverageSummary struct {
	Date          string `json:"date"`
	DayOfWeek     int    `json:"day_of_week"`
	StartTime     string `json:"start_time"`
	EndTime       string `json:"end_time"`
	Position      string `json:"position"`
	RequiredCount int    `json:"required_count"`
	ActualCount   int    `json:"actual_count"`
	Shortage      int    `json:"shortage"`
	Status        string `json:"status"` // 'sufficient', 'shortage', 'excess'
}

// DayOfWeekNames 曜日の日本語名
var DayOfWeekNames = map[int]string{
	0: "日曜日",
	1: "月曜日",
	2: "火曜日",
	3: "水曜日",
	4: "木曜日",
	5: "金曜日",
	6: "土曜日",
}

// GetDayOfWeekName 曜日の日本語名を取得
func GetDayOfWeekName(dayOfWeek int) string {
	if name, exists := DayOfWeekNames[dayOfWeek]; exists {
		return name
	}
	return "不明"
}

// GetStatus カバレッジのステータスを取得
func (cs *CoverageSummary) GetStatus() string {
	if cs.ActualCount >= cs.RequiredCount {
		return "sufficient"
	} else {
		return "shortage"
	}
}
