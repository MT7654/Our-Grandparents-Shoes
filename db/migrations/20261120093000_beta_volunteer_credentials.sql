begin;
create schema cb_beta;
revoke all on schema cb_beta from public, cb_member;

create table cb_beta.credentials (
  account_id uuid primary key references cb_identity.accounts(id) on delete cascade,
  login_identifier text not null unique check (length(login_identifier) between 3 and 254 and login_identifier = lower(login_identifier)),
  password_digest bytea not null check (octet_length(password_digest) = 32),
  password_salt bytea not null check (octet_length(password_salt) = 16)
);
create table cb_beta.sessions (
  token_digest bytea primary key check (octet_length(token_digest) = 32),
  account_id uuid not null references cb_beta.credentials(account_id) on delete cascade,
  expires_at timestamptz not null
);
create index beta_sessions_owner on cb_beta.sessions(account_id);
create index beta_sessions_expiry on cb_beta.sessions(expires_at);
create table cb_beta.rate_buckets (
  bucket text not null,
  window_start bigint not null,
  attempts integer not null check (attempts > 0),
  primary key (bucket,window_start)
);
create index beta_rate_expiry on cb_beta.rate_buckets(window_start);
revoke all on all tables in schema cb_beta from public, cb_member;
commit;
