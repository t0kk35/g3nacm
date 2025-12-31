-- Agent Configuration Tables.
CREATE TYPE agent_provider AS ENUM ('openai', 'anthropic');
CREATE TYPE agent_type AS ENUM ('streaming', 'text', 'object');

CREATE TABLE agent_model (
  code TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  provider agent_provider NOT NULL,
  model TEXT NOT NULL,
  temperature NUMERIC,
  max_tokens INTEGER,
  top_p NUMERIC,
  api_key TEXT,
  -- Provider-specific config blobs
  headers JSONB NOT NULL DEFAULT '{}',
  provider_options JSONB NOT NULL DEFAULT '{}',
  created_timestamp TIMESTAMPTZ DEFAULT now(),
  updated_timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_am_code on agent_model(code);

CREATE TABLE agent_tool (
  code TEXT PRIMARY KEY NOT NULL,
  tool_group TEXT NOT NULL,
  description TEXT NOT NULL,
  created_timestamp TIMESTAMPTZ DEFAULT now(),
  updated_timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_at_code on agent_tool(code);

CREATE TABLE agent (
  code TEXT PRIMARY KEY NOT NULL,
  agent_type agent_type NOT NULL,
  model_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  max_steps INTEGER,
  output_schema JSONB NULL,
  created_timestamp TIMESTAMPTZ DEFAULT now(),
  updated_timestamp TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_agent_model FOREIGN KEY (model_code) REFERENCES agent_model(code)
);

CREATE INDEX idx_a_code ON agent(code);
CREATE INDEX idx_a_model_code on agent(model_code);

CREATE TABEL agent_tool_link(
  agent_code TEXT NOT NULL,
  tool_code TEXT NOT NULL,
  CONSTRAINT fk_agent FOREIGN KEY (agent_code) REFERENCES agent(code),
  CONSTRAINT fk_tool FOREIGN KEY (tool_code) REFERENCES agent_tool(code)
);

CREATE INDEX idx_atl_agent_code ON agent_tool_link(agent_code);
CREATE INDEX idx_atl_agent_tool_code ON agent_tool_link(agent_code, tool_code);