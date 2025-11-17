CREATE TYPE function_parameter_type AS ENUM ('string', 'number', 'boolean', 'object');
CREATE TYPE function_parameter_direction as ENUM('Input', 'Output');
CREATE TYPE form_field_type as ENUM('select', 'textarea', 'checkbox', 'text', 'radio', 'userselect');
CREATE TYPE workflow_lock_action as ENUM('aquire', 'release');
CREATE TYPE entity_priority AS ENUM ('High', 'Medium', 'Low');
CREATE TYPE action_trigger as ENUM ('team', 'auto', 'user');

CREATE TABLE workflow_config (
  code TEXT PRIMARY KEY,
  entity_code TEXT NOT NULL,
  org_unit_code TEXT NOT NULL,
  description TEXT NOT NULL,
  CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
  CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code)
);

CREATE INDEX idx_wc_code on workflow_config(code);

CREATE TABLE workflow_state (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
);

CREATE INDEX idx_ws_code on workflow_state(code);

CREATE TABLE workflow_action (
  code TEXT PRIMARY KEY,
  config_code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger action_trigger NOT NULL,
  from_state TEXT NOT NULL,
  to_state TEXT NOT NULL,
  permission TEXT NOT NULL,
  redirect_url TEXT,
  CONSTRAINT fk_workflow_config FOREIGN KEY (config_code) REFERENCES workflow_config(code),
  CONSTRAINT fk_workflow_state_from FOREIGN KEY (from_state) REFERENCES workflow_state(code),
  CONSTRAINT fk_workflow_state_to FOREIGN KEY (to_state) REFERENCES workflow_state(code),
  CONSTRAINT fk_permission FOREIGN KEY (permission) REFERENCES user_permission(permission)  
);

CREATE INDEX idx_wa_code on workflow_action(code);

CREATE TABLE workflow_function (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE INDEX idx_wf_code on workflow_function(code);

CREATE TABLE workflow_function_parameter (
  code TEXT PRIMARY KEY NOT NULL,
  function_code TEXT NOT NULL,
  name TEXT NOT NULL,
  parameter_type function_parameter_type NOT NULL,
  direction function_parameter_direction NOT NULL,
  CONSTRAINT fk_workflow_function_param FOREIGN KEY (function_code) REFERENCES workflow_function(code)
);

CREATE INDEX idx_wffp_code on workflow_function_parameter(code);
CREATE INDEX idx_wffp_function_code on workflow_function_parameter(function_code);

CREATE TABLE workflow_setting (
  code TEXT PRIMARY KEY NOT NULL,
  function_code TEXT NOT NULL,
  name TEXT NOT NULL,
  CONSTRAINT fk_workflow_function FOREIGN KEY (function_code) REFERENCES workflow_function(code)
);

CREATE INDEX idx_wfs_code on workflow_setting(code);
CREATE INDEX idx_wfs_function_code on workflow_setting(function_code);

CREATE TABLE workflow_action_function_link (
  action_code TEXT NOT NULL,
  function_code TEXT NOT NULL,
  order SMALLINT,
  PRIMARY KEY (action_code, function_code),
  CONSTRAINT fk_workflow_action FOREIGN KEY (action_code) REFERENCES workflow_action(code),
  CONSTRAINT fk_workflow_function FOREIGN KEY (function_code) REFERENCES workflow_function(code)
);

CREATE INDEX idx_wafl_action on workflow_action_function_link(action_code);
CREATE INDEX idw_wafl_function on workflow_action_function_link(function_code);

CREATE TABLE workflow_action_function_parameter_mapping (
  action_code TEXT NOT NULL,
  function_code TEXT NOT NULL,
  parameter_code TEXT NOT NULL,
  context_mapping TEXT NOT NULL,
  PRIMARY KEY (action_code, function_code, parameter_code),
  CONSTRAINT fk_workflow_action FOREIGN KEY (action_code) REFERENCES workflow_action(code),
  CONSTRAINT fk_workflow_function FOREIGN KEY (function_code) REFERENCES workflow_function(code),
  CONSTRAINT fk_workflow_function_param FOREIGN KEY (parameter_code) REFERENCES workflow_function_parameter(code)
);

CREATE INDEX idx_wafpm_action_function on workflow_action_function_parameter_mapping(action_code, function_code);

CREATE TABLE workflow_action_function_setting (
  action_code TEXT NOT NULL,
  function_code TEXT NOT NULL,
  setting_code TEXT NOT NULL,
  setting_value JSONB NOT NULL,
  PRIMARY KEY (action_code, function_code, setting_code),
  CONSTRAINT fk_workflow_action FOREIGN KEY (action_code) REFERENCES workflow_action(code),
  CONSTRAINT fk_workflow_function FOREIGN KEY (function_code) REFERENCES workflow_function(code),
  CONSTRAINT fk_workflow_setting FOREIGN KEY (setting_code) REFERENCES workflow_setting(code)
);

CREATE INDEX idx_wafs_action_function on workflow_action_function_setting(action_code, function_code);

CREATE TABLE workflow_entity_state(
  entity_id UUID NOT NULL,
  entity_code TEXT NOT NULL,
  date_time TIMESTAMP NOT NULL,
  action_code TEXT NOT NULL,
  action_name TEXT NOT NULL,
  from_state_code TEXT NOT NULL,
  from_state_name TEXT NOT NULL,
  to_state_code TEXT NOT NULL,
  to_state_name TEXT NOT NULL,
  priority entity_priority NOT NULL,
  priority_num INTEGER NOT NULL,
  assigned_to_user_id INTEGER,
  assigned_to_user_name TEXT,
  assigned_to_team_id INTEGER,
  assigned_to_team_name TEXT,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  get_lease_user_name TEXT,
  get_lease_expires TIMESTAMP,
  PRIMARY KEY (entity_id, entity_code),
  CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code),
  CONSTRAINT fk_workflow_action FOREIGN KEY (action_code) REFERENCES workflow_action(code),
  CONSTRAINT fk_workflow_state_from FOREIGN KEY (from_state_code) REFERENCES workflow_state(code),
  CONSTRAINT fk_workflow_state_to FOREIGN KEY (to_state_code) REFERENCES workflow_state(code),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_assinged_user FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
  CONSTRAINT fk_assigned_team FOREIGN KEY (assigned_to_team_id) REFERENCES user_team(id)
);

CREATE INDEX idx_wes_entity_id on workflow_entity_state(entity_id);
CREATE INDEX idx_wes_assigned_to_uid on workflow_entity_state(assigned_to_user_id);
CREATE INDEX idx_wes_assigned_to_tid on workflow_entity_state(assigned_to_team_id);
CREATE INDEX idx_wes_date_time on workflow_entity_state(date_time);
CREATE INDEX idx_wes_user_id on workflow_entity_state(user_id);

CREATE TABLE workflow_entity_state_log(
  entity_id UUID NOT NULL,
  entity_code TEXT NOT NULL,
  date_time TIMESTAMP NOT NULL,
  action_code TEXT NOT NULL,
  action_name TEXT NOT NULL,
  from_state_code TEXT NOT NULL,
  from_state_name TEXT NOT NULL,
  to_state_code TEXT NOT NULL,
  to_state_name TEXT NOT NULL,
  priority entity_priority NOT NULL,
  priority_num INTEGER NOT NULL,  
  assigned_to_user_id INTEGER,
  assigned_to_user_name TEXT,
  assigned_to_team_id INTEGER,
  assigned_to_team_name TEXT,
  user_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  PRIMARY KEY (entity_id, entity_code, date_time),
  CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code),
  CONSTRAINT fk_workflow_action FOREIGN KEY (action_code) REFERENCES workflow_action(code),
  CONSTRAINT fk_workflow_state_from FOREIGN KEY (from_state_code) REFERENCES workflow_state(code),
  CONSTRAINT fk_workflow_state_to FOREIGN KEY (to_state_code) REFERENCES workflow_state(code),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_assinged_user FOREIGN KEY (assigned_to_user_id) REFERENCES users(id),
  CONSTRAINT fk_assigned_team FOREIGN KEY (assigned_to_team_id) REFERENCES user_team(id)
);

CREATE INDEX idx_wesl_entity_id on workflow_entity_state_log(entity_id);

CREATE TABLE workflow_action_form_field(
    code TEXT PRIMARY KEY NOT NULL,
    action_code TEXT NOT NULL,
    name TEXT NOT NULL,
    form_field_type form_field_type,
    label TEXT NOT NULL,
    placeholder TEXT,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    order SMALLINT NOT NULL,
  CONSTRAINT fk_workflow_action FOREIGN KEY (action_code) REFERENCES workflow_action(code)
);

CREATE INDEX idx_waff_code on workflow_action_form_field(code);
CREATE INDEX idx_waff_action_code on workflow_action_form_field(action_code);

CREATE TABLE workflow_action_form_field_option(
    form_field_code TEXT NOT NULL,
    value TEXT NOT NULL,
    label TEXT NOT NULL,
    PRIMARY KEY (form_field_code, value)
);

CREATE INDEX idx_waffo_form_field_code on workflow_action_form_field_option(form_field_code);

CREATE TABLE workflow_entity_lock (
    entity_code TEXT NOT NULL,
    entity_id UUID NOT NULL,
    lock_user_name TEXT NOT NULL,
    lock_date_time TIMESTAMP NOT NULL,
    CONSTRAINT pk_code_id PRIMARY KEY (entity_code, entity_id),
    CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
);

CREATE INDEX idx_wel_code_id on workflow_entity_lock(entity_code, entity_id);

CREATE TABLE workflow_entity_lock_log (
    entity_code TEXT NOT NULL,
    entity_id UUID NOT NULL,
    lock_user_name TEXT NOT NULL,
    lock_date_time TIMESTAMP NOT NULL,
    action_code workflow_lock_action NOT NULL,
    release_date_time TIMESTAMP,
    CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code)
);

CREATE INDEX idx_well_code_id on workflow_entity_lock_log(entity_code, entity_id);
CREATE INDEX idx_well_date_time on workflow_entity_lock_log(lock_date_time);

CREATE TABLE workflow_document_attachment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code TEXT NOT NULL,
    entity_id UUID NOT NULL,
    org_unit_code TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_data BYTEA,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_by_user_name TEXT NOT NULL,
    upload_date_time TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_org_unit FOREIGN KEY (org_unit_code) REFERENCES org_unit(code),
    CONSTRAINT fk_workflow_entity FOREIGN KEY (entity_code) REFERENCES workflow_entity(code),
    CONSTRAINT fk_uploaded_by_user FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
);

CREATE INDEX idx_wda_entity on workflow_document_attachment(entity_code, entity_id);
CREATE INDEX idx_wda_entity_active on workflow_document_attachment(entity_code, entity_id, is_active);