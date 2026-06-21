-- Insert statements for registering functions

--- Assign to user function
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.entity.change_state.assign_user', 'Function to assign a workflow entity to a specific user');

INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  -- Input parameters
  ('function.entity.change_state.assign_user.assign_to_user_name', 'function.entity.change_state.assign_user', 'User Name', 'string', 'Input'),
  ('function.entity.change_state.assign_user.comment', 'function.entity.change_state.assign_user', 'Regulatory Comment', 'string', 'Input');

-- Assign to team function
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.entity.change_state.assign_team', 'Assign to a specific team');

INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES
  -- Input parameters 
  ('function.entity.change_state.assign_team.assign_to_team_name', 'function.entity.change_state.assign_team', 'Name of the team to assign to', 'string', 'Input');
  ('function.entity.change_state.assign_team.comment', 'function.entity.change_state.assign_team', 'Regulatory Comment', 'string', 'Input');

--- Get Next function 
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.entity.change_state.get_next', 'Function to perform a Get Next from a Team Queue');

--- Eval Engine
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.eval_engine', 'Internal conditional evaluation Engine');

INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  -- Input parameters
  ('function.eval_engine.group', 'function.eval_engine', 'Eval Group Name', 'string', 'Input'),
  ('function.eval_engine.throwOnMissingField', 'function.eval_engine', 'Throw On Missing Field', 'boolean', 'Input'),
  ('function.eval_engine.throwOnInvalidType', 'function.eval_engine', 'Throw On Invalid Type', 'boolean', 'Input'),
  ('function.eval_engine.validateInput', 'function.eval_engine', 'Validate Input Schema', 'boolean', 'Input'),
  -- Output parameters
  ('function.eval_engine.evalResult', 'function.eval_engine', 'Evaluation Result', 'string', 'Output'),
  ('function.eval_engine.evalGroup', 'function.eval_engine', 'Executed Group Name', 'string', 'Output'),
  ('function.eval_engine.evalRulesCount', 'function.eval_engine', 'Number of Rules Evaluated', 'number', 'Output');

--- Mail function
INSERT INTO workflow_function ("code", "name") VALUES ('function.mail', 'Send Mail');
INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  ('function.entity.change_state.assign_to_user_name', 'function.entity.change_state', 'Assign to Username', 'string', 'Input'), 
  ('function.mail.email', 'function.mail', 'Email Address', 'string', 'Input'), 
  ('function.mail.success', 'function.mail', 'Output', 'boolean', 'Output'), 
  ('function.mail.text', 'function.mail', 'Mail Text', 'string', 'Input');

--- Document Upload function
INSERT INTO workflow_function ("code", "name") VALUES ('function.document.upload', 'Upload Document');
INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  -- Input parameters
  ('function.document.upload.entity_code', 'function.document.upload', 'Entity code of the entity to which to document will be linked', 'string', 'Input'), 
  ('function.document.upload.entity_id', 'function.document.upload', 'ID of the entity to which the document will be linked', 'string', 'Input'),
  ('function.document.upload.files', 'function.document.upload', 'The files to be attached. This is an array of file + description + org_unit', 'fileuploadarray', 'Input'),
  -- Output parameters
  ('function.document.upload.document_id', 'function.document.upload', 'Document ID', 'string', 'Output'),
  ('function.document.upload.upload_date_time', 'function.document.upload', 'Upload Date Time', 'string', 'Output'),
  ('function.document.upload.file_size', 'function.document.upload', 'File Size in KB', 'number', 'Output'),
  ('function.document.upload.mime_type', 'function.document.upload', 'MIME type of the file', 'string', 'Output'),
  ('function.document.upload.uploaded_by_user_name', 'function.document.upload', 'Uploaded By User', 'string', 'Output');

--- Create Notification function
INSERT INTO workflow_function ("code", "name") VALUES ('function.notification.create', 'Create a notification');
INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  -- Input parameters
  ('function.notification.create.receiver_user_name', 'function.notification.create', 'User name of the user receiving the notification', 'string', 'Input'),
  ('function.notification.create.title', 'function.notification.create', 'A title for the notification', 'object', 'Input'),
  ('function.notification.create.body', 'function.notification.create', 'The content of the notification', 'string', 'Input'),
  ('function.notification.create.notification_entity_code', 'function.notification.create', 'The workflow entity code for the notification', 'string', 'Input'),
  -- Output parameters
  ('function.notification.create.notification_id', 'function.notification.create', 'Unique ID of the notification', 'string', 'Output');

INSERT INTO workflow_function ("code", "name") VALUES ('function.notification.mark_read', 'Mark a notification as Read');

-- System workflows.
INSERT INTO workflow_config 
  ("code", "entity_code", "description", "org_unit_code") 
VALUES 
  ('system.notification', 'notification', 'System workflow for Notifications from one user to the next', 'GRP');

INSERT INTO workflow_state 
  ("code", "name", "is_active") 
VALUES 
  ('system.notification.new', 'New Notification', 'true'), 
  ('system.notification.read', 'Read Notification', 'false'),
  ('system.notification.create', 'Create Notification', 'true');

INSERT INTO workflow_action 
  ("code", "from_state", "to_state", "config_code", "name", "description", "redirect_url", "permission", "trigger") 
VALUES 
  ('system.notification.mark_read', 'system.notification.new', 'system.notification.read', 'system.notification', 'Mark as read', 'Mark a notification as being read', null, null, 'user'),
  ('system.notification.create', 'system.notification.create', 'system.notification.new', 'system.notification', 'Create', 'Create a new Notification', null, null, 'user');

INSERT INTO workflow_action_function_link
  ("action_code", "function_code", "order")
VALUES 
  ('system.notification.mark_read', 'function.notification.mark_read', '0');

-- RFI workflow functions
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.rfi_request.create', 'Create an RFI request'),
  ('function.rfi_request.send', 'Send an RFI request');

INSERT INTO workflow_setting ("code", "function_code", "name") VALUES ('setting.rfi_outbound_entity_code', 'function.rfi_request.create', 'rfi.outbound');

-- Create parameters
INSERT INTO workflow_function_parameter 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES
  -- Input
  ('function.rfi_request.create.body', 'function.rfi_request.create', 'Main body of the RFI', 'string', 'Input'), 
  ('function.rfi_request.create.channel_code', 'function.rfi_request.create', 'RFI Channel Code', 'string', 'Input'), 
  ('function.rfi_request.create.due_datetime', 'function.rfi_request.create', 'Due date for the RFI', 'string', 'Input'), 
  ('function.rfi_request.create.recipient_subject_id', 'function.rfi_request.create', 'RFI recipient subject id.', 'string', 'Input'), 
  ('function.rfi_request.create.title', 'function.rfi_request.create', 'RFI Title', 'string', 'Input'),
  -- Output
  ('function.rfi_request.create.rfi_id', 'function.rfi_request.create', 'rfiId', 'string', 'Output');

-- Send parameters
INSERT INTO "workflow_function" 
  ("code", "name") 
VALUES 
  ('function.rfi_request.send', 'Send an RFI request');

INSERT INTO "workflow_function_parameter" 
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES
  --- Input
  ('function.rfi_request.send.rfi_id', 'function.rfi_request.send', 'RFI ID', 'string', 'Input'),
  --- Output TBD

-- RFI Response workfow functions
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.rfi_request.send', 'Send an RFI request');

INSERT INTO workflow_function_parameter
  ("code", "function_code", "name", "parameter_type", "direction") 
VALUES 
  ('function.rfi_response.create.body_text', 'function.rfi_response.create', 'Body of the RFI Response', 'string', 'Input'),
  ('function.rfi_response.create.from_name', 'function.rfi_response.create', 'Name of the subject that provided the response', 'string', 'Input'), 
  ('function.rfi_response.create.id', 'function.rfi_response.create', 'Id of the created response', 'string', 'Output'),
  ('function.rfi_response.create.respondent_contact', 'function.rfi_response.create', 'The respondent subject contact details as object', 'object', 'Input'), 
  ('function.rfi_response.create.response_data', 'function.rfi_response.create', 'The main response data as an object', 'object', 'Input'), 
  ('function.rfi_response.create.rfi_request_id', 'function.rfi_response.create', 'The ID of the original RFI request.', 'string', 'Input'), 
  ('function.rfi_response.create.rfi_response_entity_code', 'function.rfi_response.create', 'Entity Code of the Response', 'string', 'Input');