-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'agent',
    senior BOOLEAN DEFAULT false,
    working_hours_start TIME,
    working_hours_end TIME,
    timezone VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Skills table
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Skills junction table
CREATE TABLE user_skills (
    user_id INTEGER REFERENCES users(id),
    skill_id INTEGER REFERENCES skills(id),
    proficiency_level INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (user_id, skill_id)
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Categories junction table
CREATE TABLE user_categories (
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    PRIMARY KEY (user_id, category_id)
);

-- Task Skills junction table
CREATE TABLE task_skills (
    task_id INTEGER REFERENCES tasks(id),
    skill_id INTEGER REFERENCES skills(id),
    PRIMARY KEY (task_id, skill_id)
);

-- Boards table
CREATE TABLE boards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'todo',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    category VARCHAR(50),
    board_id INTEGER REFERENCES boards(id),
    assigned_to INTEGER REFERENCES users(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE,
    sla_id INTEGER REFERENCES slas(id),
    source VARCHAR(20) NOT NULL DEFAULT 'manual',
    archived BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_automation_run TIMESTAMP WITH TIME ZONE,
    automation_disabled BOOLEAN DEFAULT false,
    predicted_category VARCHAR(50),
    predicted_priority VARCHAR(20),
    category_confidence DECIMAL(5,4),
    priority_confidence DECIMAL(5,4),
    predicted_keywords JSONB,
    predicted_sentiment JSONB,
    last_ml_update TIMESTAMP WITH TIME ZONE,
    ml_processing_enabled BOOLEAN DEFAULT true
);

-- Labels table
CREATE TABLE labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,
    board_id INTEGER REFERENCES boards(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task Labels junction table
CREATE TABLE task_labels (
    task_id INTEGER REFERENCES tasks(id),
    label_id INTEGER REFERENCES labels(id),
    PRIMARY KEY (task_id, label_id)
);

-- SLAs table
CREATE TABLE slas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    response_time INTERVAL NOT NULL,
    resolution_time INTERVAL NOT NULL,
    category VARCHAR(50),
    priority VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'manual',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Threads table
CREATE TABLE conversation_threads (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id) UNIQUE,
    subject VARCHAR(200) NOT NULL,
    last_message_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Messages table
CREATE TABLE conversation_messages (
    id SERIAL PRIMARY KEY,
    thread_id INTEGER REFERENCES conversation_threads(id),
    sender VARCHAR(255) NOT NULL,
    content_text TEXT,
    content_html TEXT,
    message_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Task Attachments table
CREATE TABLE task_attachments (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    filename VARCHAR(255) NOT NULL,
    filepath VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_sla ON tasks(sla_id);
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_conversation_messages_thread ON conversation_messages(thread_id);
CREATE INDEX idx_task_attachments_task ON task_attachments(task_id);
CREATE INDEX idx_tasks_automation ON tasks(last_automation_run);
CREATE INDEX idx_tasks_archived ON tasks(archived);
CREATE INDEX idx_tasks_ml_update ON tasks(last_ml_update);
CREATE INDEX idx_tasks_ml_processing ON tasks(ml_processing_enabled);

-- Timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create task automation logs table
CREATE TABLE task_automation_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tasks(id),
    rule_name VARCHAR(100) NOT NULL,
    actions JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for automation logs
CREATE INDEX idx_task_automation_logs_task ON task_automation_logs(task_id);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boards_updated_at
    BEFORE UPDATE ON boards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON labels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
