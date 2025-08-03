package database

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// InitDB データベース接続を初期化
func InitDB() error {
	// データベース接続情報
	host := "localhost"
	port := 5432
	user := "postgres"
	password := "Seba2004"
	dbname := "shift-management"

	// 接続文字列の作成
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		host, port, user, password, dbname)

	// データベースに接続
	var err error
	DB, err = sql.Open("postgres", psqlInfo)
	if err != nil {
		return fmt.Errorf("データベース接続エラー: %v", err)
	}

	// 接続テスト
	err = DB.Ping()
	if err != nil {
		return fmt.Errorf("データベース接続テスト失敗: %v", err)
	}

	log.Println("PostgreSQLデータベースに接続しました")
	return nil
}

// CreateTables テーブルを作成
func CreateTables() error {
	// time_slotsテーブルが既に存在するかチェック
	var exists bool
	err := DB.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'time_slots'
		)
	`).Scan(&exists)

	if err != nil {
		return fmt.Errorf("テーブル存在チェックエラー: %v", err)
	}

	if exists {
		log.Println("time_slotsテーブルは既に存在します")
	} else {
		log.Println("time_slotsテーブルが存在しません。テーブルを作成します...")

		// time_slotsテーブルを作成
		createTimeSlotsTable := `
			CREATE TABLE IF NOT EXISTS time_slots (
				id SERIAL PRIMARY KEY,
				day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
				start_time TIME NOT NULL,
				end_time TIME NOT NULL,
				position VARCHAR(50) NOT NULL,
				required_count INTEGER NOT NULL DEFAULT 1,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
			
			CREATE INDEX IF NOT EXISTS idx_time_slots_day_time ON time_slots(day_of_week, start_time);
		`

		_, err = DB.Exec(createTimeSlotsTable)
		if err != nil {
			return fmt.Errorf("time_slotsテーブル作成エラー: %v", err)
		}

		log.Println("time_slotsテーブルが作成されました")
	}

	// shift_coverageテーブルが既に存在するかチェック
	err = DB.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'shift_coverage'
		)
	`).Scan(&exists)

	if err != nil {
		return fmt.Errorf("shift_coverageテーブル存在チェックエラー: %v", err)
	}

	if exists {
		log.Println("shift_coverageテーブルは既に存在します")
	} else {
		log.Println("shift_coverageテーブルが存在しません。テーブルを作成します...")

		// shift_coverageテーブルを作成
		createShiftCoverageTable := `
			CREATE TABLE IF NOT EXISTS shift_coverage (
				id SERIAL PRIMARY KEY,
				date DATE NOT NULL,
				time_slot_id INTEGER REFERENCES time_slots(id),
				position VARCHAR(50) NOT NULL,
				required_count INTEGER NOT NULL,
				actual_count INTEGER DEFAULT 0,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
			
			CREATE INDEX IF NOT EXISTS idx_shift_coverage_date ON shift_coverage(date);
		`

		_, err = DB.Exec(createShiftCoverageTable)
		if err != nil {
			return fmt.Errorf("shift_coverageテーブル作成エラー: %v", err)
		}

		log.Println("shift_coverageテーブルが作成されました")
	}

	// permissionsテーブルが既に存在するかチェック
	err = DB.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'permissions'
		)
	`).Scan(&exists)

	if err != nil {
		return fmt.Errorf("permissionsテーブル存在チェックエラー: %v", err)
	}

	if exists {
		log.Println("permissionsテーブルは既に存在します")
	} else {
		log.Println("permissionsテーブルが存在しません。テーブルを作成します...")

		// permissionsテーブルを作成
		createPermissionsTable := `
			CREATE TABLE IF NOT EXISTS permissions (
				id SERIAL PRIMARY KEY,
				employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
				can_view_other_shifts BOOLEAN DEFAULT FALSE,
				can_view_payroll BOOLEAN DEFAULT FALSE,
				can_edit_attendance BOOLEAN DEFAULT FALSE,
				can_submit_shift_requests BOOLEAN DEFAULT TRUE,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(employee_id)
			);
			
			CREATE INDEX IF NOT EXISTS idx_permissions_employee_id ON permissions(employee_id);
		`

		_, err = DB.Exec(createPermissionsTable)
		if err != nil {
			return fmt.Errorf("permissionsテーブル作成エラー: %v", err)
		}

		log.Println("permissionsテーブルが作成されました")
	}

	// gantt_settingsテーブルが既に存在するかチェック
	err = DB.QueryRow(`
		SELECT EXISTS (
			SELECT FROM information_schema.tables 
			WHERE table_name = 'gantt_settings'
		)
	`).Scan(&exists)

	if err != nil {
		return fmt.Errorf("gantt_settingsテーブル存在チェックエラー: %v", err)
	}

	if exists {
		log.Println("gantt_settingsテーブルは既に存在します")
	} else {
		log.Println("gantt_settingsテーブルが存在しません。テーブルを作成します...")

		// gantt_settingsテーブルを作成
		createGanttSettingsTable := `
			CREATE TABLE IF NOT EXISTS gantt_settings (
				id SERIAL PRIMARY KEY,
				start_hour INTEGER NOT NULL CHECK (start_hour BETWEEN 0 AND 23),
				end_hour INTEGER NOT NULL CHECK (end_hour BETWEEN 0 AND 48),
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);
		`

		_, err = DB.Exec(createGanttSettingsTable)
		if err != nil {
			log.Printf("gantt_settingsテーブル作成エラー詳細: %v", err)
			return fmt.Errorf("gantt_settingsテーブル作成エラー: %v", err)
		}

		log.Println("gantt_settingsテーブルが作成されました")
	}

	// テーブル作成後の確認
	log.Println("すべてのテーブルの作成が完了しました")
	return nil
}

// CloseDB データベース接続を閉じる
func CloseDB() {
	if DB != nil {
		DB.Close()
		log.Println("データベース接続を閉じました")
	}
}
