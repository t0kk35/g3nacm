-- Insert statements for the standard workflow entities.
INSERT INTO workflow_entity 
  ("code", "description") 
  VALUES 
  ('aml.rule.alert', 'AML TM Rule Alert'), 
  ('case', 'Case'), 
  ('wlm.ns.alert', 'Name Screening Alert'), 
  ('wlm.tf.alert', 'Transaction Filtering Alert');

-- Insert statements for registering functions

--- Get function 
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.entity.change_state.get', 'Get an Entity from a team queue and assign it to a user');

--- Eval Engine
INSERT INTO workflow_function 
  ("code", "name") 
VALUES 
  ('function.eval_engine', 'Eval Engine');

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
  ('function.document.upload.org_unit_code', 'function.document.upload', 'Organisational Unit Code', 'string', 'Input'),
  ('function.document.upload.file_data', 'function.document.upload', 'File Data', 'object', 'Input'),
  ('function.document.upload.description', 'function.document.upload', 'Description', 'string', 'Input'),
  -- Output parameters
  ('function.document.upload.document_id', 'function.document.upload', 'Document ID', 'string', 'Output'),
  ('function.document.upload.upload_date_time', 'function.document.upload', 'Upload Date Time', 'string', 'Output'),
  ('function.document.upload.file_size', 'function.document.upload', 'File Size in KB', 'number', 'Output'),
  ('function.document.upload.mime_type', 'function.document.upload', 'MIME type of the file', 'string', 'Output'),
  ('function.document.upload.uploaded_by_user_name', 'function.document.upload', 'Uploaded By User', 'string', 'Output');
