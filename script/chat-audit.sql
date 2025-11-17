-- Chat Auditing Schema for Financial Crime Compliance
-- Creates tables to track all chat interactions with AI agents for audit purposes
-- Links to workflow entities (alerts, cases) for complete transaction traceability

-- Chat session container linking to workflow entities
CREATE TABLE chat_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code TEXT NOT NULL,
    entity_id UUID NOT NULL,
    user_id INTEGER NOT NULL,
    agent_name TEXT NOT NULL,
    org_unit_code TEXT NOT NULL,
    session_start_time TIMESTAMP NOT NULL DEFAULT NOW(),
    session_last_activity TIMESTAMP NOT NULL DEFAULT NOW(),
    session_title TEXT, -- Optional human-readable title
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code)
);

-- Indexes for performance and compliance queries
CREATE INDEX idx_chat_session_id ON chat_session(id);
CREATE INDEX idx_chat_session_entity ON chat_session(entity_code, entity_id);
CREATE INDEX idx_chat_session_user ON chat_session(user_id);
CREATE INDEX idx_chat_session_org_unit ON chat_session(org_unit_code);
CREATE INDEX idx_chat_session_start_time ON chat_session(session_start_time);
CREATE INDEX idx_chat_session_last_activity ON chat_session(session_last_activity);

-- Individual messages within chat sessions
CREATE TABLE chat_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    message_sequence INTEGER NOT NULL, -- Order within session
    message_type TEXT NOT NULL CHECK (message_type IN ('user', 'agent')),
    message_content TEXT NOT NULL, -- Raw text content
    message_metadata JSONB, -- Complex streaming data, UI elements, tool calls
    template_context JSONB, -- Context variables passed to agent
    agent_reasoning JSONB, -- Agent's reasoning/thinking process
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_chat_session FOREIGN KEY (session_id) REFERENCES chat_session(id) ON DELETE CASCADE,
    CONSTRAINT unique_session_sequence UNIQUE (session_id, message_sequence)
);

-- Indexes for message retrieval and analysis
CREATE INDEX idx_chat_message_id ON chat_message(id);
CREATE INDEX idx_chat_message_session ON chat_message(session_id);
CREATE INDEX idx_chat_message_sequence ON chat_message(session_id, message_sequence);
CREATE INDEX idx_chat_message_type ON chat_message(message_type);
CREATE INDEX idx_chat_message_created_at ON chat_message(created_at);

-- Audit trail for compliance reporting and investigation
CREATE TABLE chat_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    message_id UUID,
    event_type TEXT NOT NULL, -- 'session_start', 'message_sent', 'message_received', 'session_end'
    user_id INTEGER NOT NULL,
    entity_code TEXT NOT NULL,
    entity_id UUID NOT NULL,
    agent_name TEXT,
    event_details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_chat_session FOREIGN KEY (session_id) REFERENCES chat_session(id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_message FOREIGN KEY (message_id) REFERENCES chat_message(id) ON DELETE CASCADE,
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
);

-- Indexes for audit compliance and investigation
CREATE INDEX idx_chat_audit_log_id ON chat_audit_log(id);
CREATE INDEX idx_chat_audit_log_session ON chat_audit_log(session_id);
CREATE INDEX idx_chat_audit_log_message ON chat_audit_log(message_id);
CREATE INDEX idx_chat_audit_log_user ON chat_audit_log(user_id);
CREATE INDEX idx_chat_audit_log_entity ON chat_audit_log(entity_code, entity_id);
CREATE INDEX idx_chat_audit_log_event_type ON chat_audit_log(event_type);
CREATE INDEX idx_chat_audit_log_created_at ON chat_audit_log(created_at);

-- Composite indexes for common compliance queries
CREATE INDEX idx_chat_audit_user_time ON chat_audit_log(user_id, created_at);
CREATE INDEX idx_chat_audit_entity_time ON chat_audit_log(entity_code, entity_id, created_at);

-- Function to automatically update session_last_activity when messages are added
CREATE OR REPLACE FUNCTION update_chat_session_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE chat_session 
    SET session_last_activity = NOW() 
    WHERE id = NEW.session_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity timestamp
CREATE TRIGGER trigger_update_chat_session_last_activity
    AFTER INSERT ON chat_message
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_session_last_activity();

-- Function to automatically create audit log entries
CREATE OR REPLACE FUNCTION create_chat_audit_entry()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO chat_audit_log (
        session_id, 
        message_id, 
        event_type, 
        user_id, 
        entity_code, 
        entity_id, 
        agent_name,
        event_details
    )
    SELECT 
        NEW.session_id,
        NEW.id,
        CASE 
            WHEN NEW.message_type = 'user' THEN 'message_sent'
            WHEN NEW.message_type = 'agent' THEN 'message_received'
        END,
        cs.user_id,
        cs.entity_code,
        cs.entity_id,
        cs.agent_name,
        jsonb_build_object(
            'message_type', NEW.message_type,
            'message_sequence', NEW.message_sequence,
            'has_metadata', CASE WHEN NEW.message_metadata IS NOT NULL THEN true ELSE false END,
            'has_context', CASE WHEN NEW.template_context IS NOT NULL THEN true ELSE false END
        )
    FROM chat_session cs
    WHERE cs.id = NEW.session_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create audit entries
CREATE TRIGGER trigger_create_chat_audit_entry
    AFTER INSERT ON chat_message
    FOR EACH ROW
    EXECUTE FUNCTION create_chat_audit_entry();

-- Function to create session start audit entry
CREATE OR REPLACE FUNCTION create_session_start_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO chat_audit_log (
        session_id, 
        event_type, 
        user_id, 
        entity_code, 
        entity_id, 
        agent_name,
        event_details
    )
    VALUES (
        NEW.id,
        'session_start',
        NEW.user_id,
        NEW.entity_code,
        NEW.entity_id,
        NEW.agent_name,
        jsonb_build_object(
            'org_unit_code', NEW.org_unit_code,
            'session_title', NEW.session_title
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create session start audit entry
CREATE TRIGGER trigger_create_session_start_audit
    AFTER INSERT ON chat_session
    FOR EACH ROW
    EXECUTE FUNCTION create_session_start_audit();