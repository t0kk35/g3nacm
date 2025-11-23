INSERT INTO users 
    ("name", "password" "first_name", "last_name") 
VALUES 
    ('admin', 'e2800ee25d86178141870cac9cdd759c622daeffb886652fc7a683df49f9e9be', 'System', 'User');

INSERT INTO user_role
    ("name", "description")
VALUES
    ('Admin', 'Main Admin Role'),
    ('TM Investigator', 'Transaction Monitoring Investigator Role');

INSERT INTO user_permission
    ("permission_group", "permission", "description")
VALUES
    ('Admin', 'admin.org_unit', 'Organisational Unit Maintenance (Create/Update/Delete)'),
    ('Admin', 'admin.user', 'User Maintenance (Create/Update/Delete)'),
    ('Admin', 'admin.role', 'Role Maintenance (Create/Update/Delete)'),
    ('Admin', 'admin.team', 'Team Maintenance (Create/Update/Delete)'),
    ('Admin', 'admin.change_password', 'Change other users passwords'),
    ('User', 'user.change_password', 'Allows a user to change their own password'),
    ('Data', 'data.alert', 'Base permission for the back-end access to alert data. Needed by end-users as well as as APIs.'),
    ('Data', 'data.attachment', 'Permission needed to read attachments from workflow entities')

INSERT INTO user_role_permission_link ("role_id", "permission_id")
SELECT r.id, p.id
FROM user_role r
JOIN user_permission p ON (
    (r.name = 'Admin' AND p.permission = 'admin.org_unit')
    OR (r.name = 'Admin' AND p.permission = 'admin.user')
    OR (r.name = 'Admin' AND p.permission = 'admin.role')
    OR (r.name = 'Admin' AND p.permission = 'admin.team')
    OR (r.name = 'Admin' AND p.permission = 'admin.change_password')
    OR (r.name = 'Admin' AND p.permission = 'user.change_password')
);

INSERT INTO user_role_link ("user_id", "role_id")
SELECT u.id, r.id 
FROM users u JOIN user_role r ON (u.name = 'admin' and r.name = 'admin');