-- Dynamic Screen configuration tables for customizable user screens
-- Widget registry table - defines available widget types and their configurations
CREATE TABLE dynamic_screen_widget_registry (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    component_name TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dynamic_screen_widget_registry_code ON dynamic_screen_widget_registry(code);
CREATE INDEX idx_dynamic_screen_registry_name ON dynamic_screen_widget_registry(name);

-- User dynamic screen configuration table - stores user's dynamic screen layouts
CREATE TABLE dynamic_screen_user_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL DEFAULT 'Dashboard',
    layout JSONB NOT NULL DEFAULT '{"lg": [], "md": [], "sm": [], "xs": []}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_dynamic_screen_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT unique_user_dynamic_screen_name UNIQUE (user_id, name)
);

CREATE INDEX idx_dynamic_screen_user_config_user_id ON dynamic_screen_user_config(user_id);

-- User widget configuration table - stores user-specific widget settings
CREATE TABLE dynamic_screen_user_widget_config (
    id SERIAL PRIMARY KEY,
    dynamic_screen_config_id INTEGER NOT NULL,
    widget_code TEXT NOT NULL,
    widget_id TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_widget_config_dynamic_screen FOREIGN KEY (dynamic_screen_config_id) REFERENCES dynamic_screen_user_config(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_widget_config_widget FOREIGN KEY (widget_code) REFERENCES dynamic_screen_widget_registry(code),
    CONSTRAINT unique_widget_instance UNIQUE (dynamic_screen_config_id, widget_id)
);

CREATE INDEX idx_user_widget_config_dynamic_screen_id ON dynamic_screen_user_widget_config(dynamic_screen_config_id);
CREATE INDEX idx_user_widget_config_widget_code ON dynamic_screen_user_widget_config(widget_code);
CREATE INDEX idx_user_widget_config_widget_id ON dynamic_screen_user_widget_config(widget_id);

-- Insert default widget types
INSERT INTO dynamic_screen_widget_registry (code, name, description, component_name) VALUES
('alert-summary', 'Alert Summary', 'Displays summary statistics for user alerts', 'AlertSummaryWidget'),
('alert-assignment', 'Alert Assignment', 'Displays statistics on the alert assigned to the user directly and via teams', 'AlertAssignment'),
('alert-handled', 'Alerts Handled', 'Displays a chart showing the alerts handled by a user', 'AlertHandledChartWidget'),
('notifications', 'notifications', 'List of unread and read notifications sent to this user', 'NotificationWidget'),
('team-assignment-chart', 'Team Assignment Chart', 'Displays a chart of the alerts assigned to each time and their priority', 'TeamAssignmentChartWidget'),
('agent-usage', 'Agent Usage', 'Displays a chart showing the Agent Token cost over time', 'AgentUsageChartWidget');

UPDATE dynamic_screen_user_config 
SET layout = jsonb_build_object(
  'lg', layout,
  'md', layout,
  'sm', layout,
  'xs', layout
) WHERE jsonb_typeof(layout) = 'array';
