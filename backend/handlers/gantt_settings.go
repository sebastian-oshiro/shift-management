package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"shift-management-backend/database"
	"time"

	"github.com/labstack/echo/v4"
)

// GanttSettings ガントチャート設定の構造体
type GanttSettings struct {
	ID        int       `json:"id"`
	StartHour int       `json:"start_hour"`
	EndHour   int       `json:"end_hour"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// GetGanttSettings ガントチャート設定を取得
func GetGanttSettings(c echo.Context) error {
	db := database.DB

	var settings GanttSettings
	query := `SELECT id, start_hour, end_hour, created_at, updated_at FROM gantt_settings ORDER BY id DESC LIMIT 1`

	err := db.QueryRow(query).Scan(&settings.ID, &settings.StartHour, &settings.EndHour, &settings.CreatedAt, &settings.UpdatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			// 設定が存在しない場合はデフォルト値を返す
			settings = GanttSettings{
				StartHour: 0,
				EndHour:   24,
			}
		} else {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "ガントチャート設定の取得に失敗しました"})
		}
	}

	return c.JSON(http.StatusOK, settings)
}

// TestGanttSettings ガントチャート設定のテスト用エンドポイント
func TestGanttSettings(c echo.Context) error {
	db := database.DB

	// データベース接続確認
	if db == nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "データベース接続がnilです"})
	}

	// データベース接続テスト
	pingErr := db.Ping()
	if pingErr != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("データベース接続テスト失敗: %v", pingErr)})
	}

	// テーブル存在確認
	var tableExists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'gantt_settings'
		)
	`).Scan(&tableExists)

	if err != nil {
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("テーブル確認エラー: %v", err)})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"database_connected": true,
		"table_exists":       tableExists,
		"message":            "テスト成功",
	})
}

// CreateGanttSettings ガントチャート設定を作成・更新
func CreateGanttSettings(c echo.Context) error {
	db := database.DB

	// データベース接続確認
	if db == nil {
		fmt.Println("データベース接続がnilです")
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "データベース接続エラー"})
	}

	// データベース接続テスト
	pingErr := db.Ping()
	if pingErr != nil {
		fmt.Printf("データベース接続テスト失敗: %v\n", pingErr)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "データベース接続テスト失敗"})
	}
	fmt.Println("データベース接続テスト成功")

	var settings GanttSettings
	if err := json.NewDecoder(c.Request().Body).Decode(&settings); err != nil {
		fmt.Printf("JSON解析エラー: %v\n", err)
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "リクエストの解析に失敗しました"})
	}

	// デバッグログ
	fmt.Printf("受信した設定: start_hour=%d, end_hour=%d\n", settings.StartHour, settings.EndHour)

	// バリデーション
	if settings.StartHour < 0 || settings.StartHour > 23 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "開始時間は0-23の範囲で指定してください"})
	}
	if settings.EndHour < 0 || settings.EndHour > 48 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "終了時間は0-48の範囲で指定してください"})
	}
	if settings.EndHour <= settings.StartHour && settings.EndHour < 24 {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": "終了時間は開始時間より後である必要があります"})
	}

	// テーブル存在確認
	var tableExists bool
	err := db.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'gantt_settings'
		)
	`).Scan(&tableExists)

	if err != nil {
		fmt.Printf("テーブル存在確認エラー: %v\n", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "テーブル確認に失敗しました"})
	}

	fmt.Printf("gantt_settingsテーブル存在確認: %v\n", tableExists)

	if !tableExists {
		fmt.Println("gantt_settingsテーブルが存在しません。テーブルを作成します...")

		// テーブルを作成
		createTableSQL := `
			CREATE TABLE IF NOT EXISTS gantt_settings (
				id SERIAL PRIMARY KEY,
				start_hour INTEGER NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
				end_hour INTEGER NOT NULL CHECK (end_hour BETWEEN 0 AND 48),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`

		_, createErr := db.Exec(createTableSQL)
		if createErr != nil {
			fmt.Printf("テーブル作成エラー: %v\n", createErr)
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "テーブル作成に失敗しました"})
		}

		fmt.Println("gantt_settingsテーブルを作成しました")
	}

	// 既存の設定を削除
	_, err = db.Exec("DELETE FROM gantt_settings")
	if err != nil {
		fmt.Printf("既存設定削除エラー: %v\n", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": "既存設定の削除に失敗しました"})
	}

	// 新しい設定を挿入
	query := `INSERT INTO gantt_settings (start_hour, end_hour, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id`
	fmt.Printf("実行するSQL: %s (start_hour=%d, end_hour=%d)\n", query, settings.StartHour, settings.EndHour)

	var id int
	err = db.QueryRow(query, settings.StartHour, settings.EndHour).Scan(&id)
	if err != nil {
		fmt.Printf("設定保存エラー詳細: %v\n", err)
		fmt.Printf("エラータイプ: %T\n", err)
		return c.JSON(http.StatusInternalServerError, map[string]string{"error": fmt.Sprintf("ガントチャート設定の保存に失敗しました: %v", err)})
	}

	settings.ID = id
	settings.CreatedAt = time.Now()
	settings.UpdatedAt = time.Now()

	return c.JSON(http.StatusOK, settings)
}
