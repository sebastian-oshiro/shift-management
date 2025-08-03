package main

import (
	"log"
	"net/http"
	"os"

	"shift-management-backend/database"
	"shift-management-backend/handlers"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	// データベース接続の初期化
	log.Println("データベース接続を初期化中...")
	if err := database.InitDB(); err != nil {
		log.Fatal("データベース接続エラー:", err)
	}
	defer database.CloseDB()

	// テーブルの作成
	log.Println("データベーステーブルを作成中...")
	if err := database.CreateTables(); err != nil {
		log.Fatal("テーブル作成エラー:", err)
	}
	log.Println("データベーステーブルの作成が完了しました")

	// Echoインスタンスの作成
	e := echo.New()

	// ミドルウェアの設定
	e.Use(middleware.Logger())  // ログ出力
	e.Use(middleware.Recover()) // パニック復旧

	// CORS設定を詳細に設定
	e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000", "null"},
		AllowMethods:     []string{http.MethodGet, http.MethodHead, http.MethodPut, http.MethodPatch, http.MethodPost, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
		AllowCredentials: true,
	}))

	// ルートの設定
	e.GET("/", func(c echo.Context) error {
		return c.String(http.StatusOK, "シフト管理APIサーバーが起動しています")
	})

	// ヘルスチェックエンドポイント
	e.GET("/health", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"status":  "healthy",
			"message": "サーバーは正常に動作しています",
		})
	})

	// APIルートの設定
	api := e.Group("/api")

	// 従業員管理API
	employees := api.Group("/employees")
	employees.GET("", handlers.GetEmployees)          // 従業員一覧取得
	employees.GET("/:id", handlers.GetEmployee)       // 従業員詳細取得
	employees.POST("", handlers.CreateEmployee)       // 従業員作成
	employees.PUT("/:id", handlers.UpdateEmployee)    // 従業員更新
	employees.DELETE("/:id", handlers.DeleteEmployee) // 従業員削除

	// シフト管理API
	shifts := api.Group("/shifts")
	shifts.GET("", handlers.GetShifts)              // シフト一覧取得
	shifts.GET("/month", handlers.GetShiftsByMonth) // 月別シフト取得
	shifts.GET("/:id", handlers.GetShift)           // シフト詳細取得
	shifts.POST("", handlers.CreateShift)           // シフト作成
	shifts.PUT("/:id", handlers.UpdateShift)        // シフト更新
	shifts.DELETE("/:id", handlers.DeleteShift)     // シフト削除

	// 認証API
	auth := api.Group("/auth")
	auth.POST("/login", handlers.Login)                             // ログイン
	auth.POST("/logout", handlers.Logout)                           // ログアウト
	auth.GET("/profile", handlers.GetProfile)                       // プロフィール取得
	auth.POST("/register", handlers.Register)                       // ユーザー登録
	auth.POST("/create-test-user", handlers.CreateTestUser)         // テストユーザー作成
	auth.POST("/create-test-employee", handlers.CreateTestEmployee) // テスト従業員作成
	auth.DELETE("/delete-test-user", handlers.DeleteTestUser)       // テストユーザー削除

	// シフト希望API
	shiftRequests := api.Group("/shift-requests")
	shiftRequests.GET("", handlers.GetShiftRequests)          // シフト希望一覧取得
	shiftRequests.GET("/:id", handlers.GetShiftRequest)       // シフト希望詳細取得
	shiftRequests.POST("", handlers.CreateShiftRequest)       // シフト希望作成
	shiftRequests.PUT("/:id", handlers.UpdateShiftRequest)    // シフト希望更新
	shiftRequests.DELETE("/:id", handlers.DeleteShiftRequest) // シフト希望削除

	// 出退勤API
	attendance := api.Group("/attendance")
	attendance.GET("", handlers.GetAttendances)          // 出退勤記録一覧取得
	attendance.GET("/:id", handlers.GetAttendance)       // 出退勤記録詳細取得
	attendance.POST("", handlers.CreateAttendance)       // 出退勤記録作成
	attendance.PUT("/:id", handlers.UpdateAttendance)    // 出退勤記録更新
	attendance.DELETE("/:id", handlers.DeleteAttendance) // 出退勤記録削除
	attendance.POST("/clock-in", handlers.ClockIn)       // 出勤記録
	attendance.POST("/clock-out", handlers.ClockOut)     // 退勤記録

	// 時給管理API
	hourlyWages := api.Group("/hourly-wages")
	hourlyWages.GET("", handlers.GetHourlyWages)               // 時給設定一覧取得
	hourlyWages.GET("/:id", handlers.GetHourlyWage)            // 時給設定詳細取得
	hourlyWages.POST("", handlers.CreateHourlyWage)            // 時給設定作成
	hourlyWages.PUT("/:id", handlers.UpdateHourlyWage)         // 時給設定更新
	hourlyWages.DELETE("/:id", handlers.DeleteHourlyWage)      // 時給設定削除
	hourlyWages.GET("/history", handlers.GetHourlyWageHistory) // 時給履歴取得
	hourlyWages.GET("/current", handlers.GetCurrentHourlyWage) // 現在の時給取得

	// 時間帯設定API
	timeSlots := api.Group("/time-slots")
	timeSlots.GET("", handlers.GetTimeSlots)                // 時間帯設定一覧取得
	timeSlots.GET("/:id", handlers.GetTimeSlot)             // 時間帯設定詳細取得
	timeSlots.POST("", handlers.CreateTimeSlot)             // 時間帯設定作成
	timeSlots.PUT("/:id", handlers.UpdateTimeSlot)          // 時間帯設定更新
	timeSlots.DELETE("/:id", handlers.DeleteTimeSlot)       // 時間帯設定削除
	timeSlots.GET("/coverage", handlers.GetCoverageSummary) // カバレッジサマリー取得

	// 給与計算API
	payroll := api.Group("/payroll")
	payroll.GET("/calculate", handlers.CalculatePayroll)      // 給与計算
	payroll.GET("/employee/:id", handlers.GetEmployeePayroll) // 従業員給与取得

	// 権限管理API
	permissions := api.Group("/permissions")
	permissions.GET("", handlers.GetPermissions)                     // 権限設定一覧取得
	permissions.GET("/employee/:id", handlers.GetEmployeePermission) // 従業員権限取得
	permissions.POST("", handlers.CreatePermission)                  // 権限設定作成・更新
	permissions.DELETE("/:id", handlers.DeletePermission)            // 権限設定削除

	// ガントチャート設定API
	ganttSettings := api.Group("/gantt-settings")
	ganttSettings.GET("", handlers.GetGanttSettings)       // ガントチャート設定取得
	ganttSettings.POST("", handlers.CreateGanttSettings)   // ガントチャート設定作成・更新
	ganttSettings.GET("/test", handlers.TestGanttSettings) // テスト用エンドポイント

	// サーバーの起動
	port := ":8080"
	if envPort := os.Getenv("PORT"); envPort != "" {
		port = ":" + envPort
	}
	log.Println("サーバーを起動しています...")
	log.Printf("http://localhost%s でアクセスできます", port)

	if err := e.Start(port); err != nil {
		log.Fatal("サーバーの起動に失敗しました:", err)
	}
}
