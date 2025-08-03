-- シフト管理アプリケーション データベーススキーマ
-- PostgreSQL用

-- 1. employees（従業員）テーブル
CREATE TABLE employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    hourly_wage INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. shifts（シフト）テーブル
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_time INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. users（認証）テーブル
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'employee')),
    name VARCHAR(100),
    employee_id INTEGER REFERENCES employees(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. shift_requests（シフト希望）テーブル
CREATE TABLE shift_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    date DATE NOT NULL,
    preferred_start_time TIME NOT NULL,
    preferred_end_time TIME NOT NULL,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'processed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. attendance（出退勤記録）テーブル
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    date DATE NOT NULL,
    clock_in_time TIME,
    clock_out_time TIME,
    actual_hours DECIMAL(4,2),
    status VARCHAR(20) DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. hourly_wages（時給設定）テーブル
CREATE TABLE hourly_wages (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id),
    hourly_wage INTEGER NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. time_slots（時間帯設定）テーブル
CREATE TABLE time_slots (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=日曜日, 1=月曜日, ..., 6=土曜日
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    position VARCHAR(50) NOT NULL, -- 'ホール', 'キッチン', 'レジ' など
    required_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. shift_coverage（シフトカバレッジ）テーブル
CREATE TABLE shift_coverage (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    time_slot_id INTEGER REFERENCES time_slots(id),
    position VARCHAR(50) NOT NULL,
    required_count INTEGER NOT NULL,
    actual_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX idx_shifts_employee_date ON shifts(employee_id, date);
-- 9. permissions（権限設定）テーブル
CREATE TABLE permissions (
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

CREATE INDEX idx_shifts_date ON shifts(date);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_shift_requests_employee_date ON shift_requests(employee_id, date);
CREATE INDEX idx_hourly_wages_employee_date ON hourly_wages(employee_id, effective_date);
CREATE INDEX idx_time_slots_day_time ON time_slots(day_of_week, start_time);
CREATE INDEX idx_shift_coverage_date ON shift_coverage(date);
CREATE INDEX idx_permissions_employee_id ON permissions(employee_id); 