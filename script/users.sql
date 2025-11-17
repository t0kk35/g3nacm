CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_users_id ON users(id);
CREATE INDEX idx_users_id ON users(name);

CREATE TABLE user_team (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE INDEX idx_user_team_id ON team(id);

CREATE TABLE user_team_link (
    user_id INTEGER NOT NULL,
    team_id INTEGER NOT NULL,
    rank INTEGER NOT NULL,
    CONSTRAINT pk_uid_tid PRIMARY KEY (user_id, team_id),
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_team_id FOREIGN KEY (team_id) REFERENCES user_team(id)
);

CREATE INDEX idx_user_team_uid ON user_team_link(user_id);
CREATE INDEX idx_user_team_tid ON user_team_link(team_id);

CREATE TABLE user_permission (
    id SERIAL PRIMARY KEY,
    permission_group TEXT NOT NULL,
    permission TEXT NOT NULL,
    description TEXT NOT NULL,
    CONSTRAINT u_permission UNIQUE (permission)
);

CREATE INDEX idx_user_permission_uid ON user_permission(id);
CREATE INDEX idx_user_permission_group on user_permission(permission_group);
CREATE INDEX idx_user_permission_perm on user_permission(permission);

CREATE TABLE user_role (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE INDEX idx_user_role_uid ON user_role(id);

CREATE TABLE user_role_link ( 
  user_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  CONSTRAINT pk_uid_pid PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_role_id FOREIGN KEY (role_id) REFERENCES user_role(id)
);

CREATE INDEX idx_user_role_link_uid ON user_role_link(user_id);
CREATE INDEX idx_user_role_link_rid ON user_role_link(role_id);

CREATE TABLE user_role_permission_link(
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    CONSTRAINT pk_rid_pid PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_id FOREIGN KEY (role_id) REFERENCES user_role(id),
    CONSTRAINT fk_permission_id FOREIGN KEY (permission_id) REFERENCES user_permission(id)
);

CREATE INDEX idx_user_permission_link_rid ON user_role_permission_link(role_id);
CREATE INDEX idx_user_permission_link_pid ON user_role_permission_link(permission_id);