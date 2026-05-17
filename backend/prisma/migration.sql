-- AtomQuest Goal Setting & Tracking Portal
-- Database Migration SQL
-- Run this directly on PostgreSQL if not using Prisma migrate

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

CREATE TYPE role_enum AS ENUM ('EMPLOYEE', 'MANAGER', 'ADMIN');
CREATE TYPE uom_type AS ENUM ('MIN_NUMERIC', 'MAX_NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED');
CREATE TYPE goal_status AS ENUM ('DRAFT', 'SUBMITTED', 'RETURNED', 'APPROVED', 'UNLOCKED');
CREATE TYPE checkin_status AS ENUM ('NOT_STARTED', 'ON_TRACK', 'COMPLETED');
CREATE TYPE quarter_enum AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- ─── USERS ──────────────────────────────────────────────────────────────────

CREATE TABLE users (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        role_enum NOT NULL DEFAULT 'EMPLOYEE',
    department  TEXT,
    manager_id  TEXT REFERENCES users(id),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_manager_id ON users(manager_id);
CREATE INDEX idx_users_role ON users(role);

-- ─── CYCLE CONFIG ───────────────────────────────────────────────────────────

CREATE TABLE cycle_configs (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    year           INT NOT NULL,
    is_active      BOOLEAN DEFAULT TRUE,
    goal_set_open  TIMESTAMPTZ NOT NULL,
    goal_set_close TIMESTAMPTZ NOT NULL,
    q1_open        TIMESTAMPTZ NOT NULL,
    q2_open        TIMESTAMPTZ NOT NULL,
    q3_open        TIMESTAMPTZ NOT NULL,
    q4_open        TIMESTAMPTZ NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GOAL SHEETS ────────────────────────────────────────────────────────────

CREATE TABLE goal_sheets (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    employee_id     TEXT NOT NULL REFERENCES users(id),
    cycle_id        TEXT NOT NULL REFERENCES cycle_configs(id),
    manager_id      TEXT REFERENCES users(id),
    status          goal_status NOT NULL DEFAULT 'DRAFT',
    total_weightage FLOAT DEFAULT 0,
    submitted_at    TIMESTAMPTZ,
    approved_at     TIMESTAMPTZ,
    return_reason   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, cycle_id)
);

CREATE INDEX idx_goal_sheets_employee ON goal_sheets(employee_id);
CREATE INDEX idx_goal_sheets_manager ON goal_sheets(manager_id);
CREATE INDEX idx_goal_sheets_status ON goal_sheets(status);

-- ─── SHARED GOALS ───────────────────────────────────────────────────────────

CREATE TABLE shared_goals (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    owner_id    TEXT NOT NULL REFERENCES users(id),
    thrust_area TEXT NOT NULL,
    title       TEXT NOT NULL,
    description TEXT,
    uom_type    uom_type NOT NULL,
    target      FLOAT NOT NULL,
    target_date TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GOALS ──────────────────────────────────────────────────────────────────

CREATE TABLE goals (
    id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    sheet_id       TEXT NOT NULL REFERENCES goal_sheets(id) ON DELETE CASCADE,
    thrust_area    TEXT NOT NULL,
    title          TEXT NOT NULL,
    description    TEXT,
    uom_type       uom_type NOT NULL,
    target         FLOAT NOT NULL,
    target_date    TIMESTAMPTZ,
    weightage      FLOAT NOT NULL CHECK (weightage >= 10),
    is_shared      BOOLEAN DEFAULT FALSE,
    shared_goal_id TEXT REFERENCES shared_goals(id),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_goals_sheet_id ON goals(sheet_id);

-- Trigger: enforce max 8 goals per sheet
CREATE OR REPLACE FUNCTION check_max_goals()
RETURNS TRIGGER AS $$
DECLARE
    goal_count INT;
BEGIN
    SELECT COUNT(*) INTO goal_count FROM goals WHERE sheet_id = NEW.sheet_id;
    IF goal_count >= 8 THEN
        RAISE EXCEPTION 'Maximum 8 goals per employee per cycle';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_max_goals
BEFORE INSERT ON goals
FOR EACH ROW EXECUTE FUNCTION check_max_goals();

-- ─── CHECK-INS ──────────────────────────────────────────────────────────────

CREATE TABLE check_ins (
    id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    goal_id              TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    quarter              quarter_enum NOT NULL,
    actual_achievement   FLOAT,
    completion_date      TIMESTAMPTZ,
    status               checkin_status DEFAULT 'NOT_STARTED',
    score                FLOAT,
    manager_comment      TEXT,
    manager_id           TEXT REFERENCES users(id),
    commented_at         TIMESTAMPTZ,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(goal_id, quarter)
);

CREATE INDEX idx_checkins_goal_id ON check_ins(goal_id);

-- ─── SHARED CHECK-INS ───────────────────────────────────────────────────────

CREATE TABLE shared_check_ins (
    id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    shared_goal_id       TEXT NOT NULL REFERENCES shared_goals(id),
    quarter              quarter_enum NOT NULL,
    actual_achievement   FLOAT,
    completion_date      TIMESTAMPTZ,
    status               checkin_status DEFAULT 'NOT_STARTED',
    score                FLOAT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(shared_goal_id, quarter)
);

-- ─── AUDIT LOGS ─────────────────────────────────────────────────────────────

CREATE TABLE audit_logs (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    goal_id     TEXT REFERENCES goals(id),
    user_id     TEXT NOT NULL REFERENCES users(id),
    action      TEXT NOT NULL,
    field_name  TEXT,
    old_value   TEXT,
    new_value   TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_goal_id ON audit_logs(goal_id);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at);

-- ─── SEED DATA ──────────────────────────────────────────────────────────────

-- Demo users (passwords are bcrypt hash of "Demo@123")
INSERT INTO users (id, name, email, password, role, department) VALUES
('user_admin_1', 'Admin User', 'admin@demo.com',
 '$2b$10$examplehashforadmin', 'ADMIN', 'HR'),
('user_mgr_1', 'Manager One', 'manager@demo.com',
 '$2b$10$examplehashformanager', 'MANAGER', 'Engineering'),
('user_emp_1', 'Employee One', 'employee@demo.com',
 '$2b$10$examplehashforemployee', 'EMPLOYEE', 'Engineering');

UPDATE users SET manager_id = 'user_mgr_1' WHERE id = 'user_emp_1';

-- Active cycle config for current year
INSERT INTO cycle_configs (id, year, is_active, goal_set_open, goal_set_close,
    q1_open, q2_open, q3_open, q4_open) VALUES
('cycle_2025', 2025, TRUE,
    '2025-05-01', '2025-06-30',
    '2025-07-01', '2025-10-01',
    '2026-01-01', '2026-03-01');
