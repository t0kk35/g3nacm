-- Insert statements for the standard workflow entities.
INSERT INTO workflow_entity 
  ("code", "description", "display_url") 
  VALUES 
  ('aml.rule.alert', 'AML TM Rule Alert', NULL), 
  ('case', 'Case', NULL), 
  ('wlm.ns.alert', 'Name Screening Alert', NULL), 
  ('wlm.tf.alert', 'Transaction Filtering Alert', '/alert'),
  ('notification', 'User Notification', '/notification');