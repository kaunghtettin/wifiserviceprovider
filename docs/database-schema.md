# ISP/WiFi Management System — Database Schema (PostgreSQL)

Source: [specification.txt](file:///c:/xampp/htdocs/isp/docs/specification.txt)

## Design Principles

- Branch scoping: most records filter by `branch_id`.
- Auditability: financial and status changes are traceable (`created_by`, `activity_logs`).
- Billing correctness: preserve historical invoices/payments; do not rewrite history.
- Performance: index common filters (`branch_id`, `status`, `due_date`, `billing_day_of_month`, `created_at`).

## Recommended Enums

- `user_status`: `active`, `disabled`
- `customer_status`: `active`, `pending`, `suspended`, `disconnected`
- `package_status`: `active`, `inactive`
- `invoice_status`: `draft`, `issued`, `void`
- `payment_status`: `unpaid`, `partial`, `paid`, `overdue`
- `notification_type`: `internal`, `sms`
- `notification_status`: `queued`, `sent`, `failed`, `read`
- `sms_status`: `queued`, `sent`, `failed`

## DDL (Core Tables)

```sql
create table branches (
  id bigserial primary key,
  name text not null unique,
  code text unique,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table roles (
  id bigserial primary key,
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table permissions (
  id bigserial primary key,
  key text not null unique,
  description text
);

create table role_permissions (
  role_id bigint not null references roles(id) on delete cascade,
  permission_id bigint not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table users (
  id bigserial primary key,
  branch_id bigint references branches(id) on delete set null,
  role_id bigint not null references roles(id),
  name text not null,
  email text unique,
  phone text,
  password_hash text not null,
  status text not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_branch_id on users(branch_id);
create index idx_users_role_id on users(role_id);

create table wifi_packages (
  id bigserial primary key,
  branch_id bigint references branches(id) on delete set null, -- null = available to all branches
  name text not null,
  speed_mbps integer not null check (speed_mbps > 0),
  price numeric(12,2) not null check (price >= 0),
  duration_months integer not null default 1 check (duration_months > 0),
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, name)
);

create index idx_wifi_packages_branch_id on wifi_packages(branch_id);
create index idx_wifi_packages_status on wifi_packages(status);

create table customers (
  id bigserial primary key,
  customer_code text not null unique,
  branch_id bigint not null references branches(id),
  wifi_package_id bigint references wifi_packages(id),
  name text not null,
  phone text not null,
  nrc text,
  address text,
  gps_lat numeric(10,7),
  gps_lng numeric(10,7),
  installation_date date,
  billing_day_of_month smallint not null check (billing_day_of_month between 1 and 28),
  router_sn text,
  status text not null default 'active',
  notes text,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_customers_branch_id on customers(branch_id);
create index idx_customers_status on customers(status);
create index idx_customers_phone on customers(phone);
create index idx_customers_billing_dom on customers(billing_day_of_month);

create table invoices (
  id bigserial primary key,
  branch_id bigint not null references branches(id),
  customer_id bigint not null references customers(id) on delete restrict,
  wifi_package_id bigint references wifi_packages(id),
  billing_month date not null, -- normalized to first day of month
  due_date date not null,
  currency text not null default 'MMK',
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'issued',
  payment_status text not null default 'unpaid',
  note text,
  issued_by bigint references users(id) on delete set null,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, billing_month)
);

create index idx_invoices_branch_id on invoices(branch_id);
create index idx_invoices_customer_id on invoices(customer_id);
create index idx_invoices_due_date on invoices(due_date);
create index idx_invoices_payment_status on invoices(payment_status);
create index idx_invoices_billing_month on invoices(billing_month);

create table payments (
  id bigserial primary key,
  branch_id bigint not null references branches(id),
  invoice_id bigint not null references invoices(id) on delete restrict,
  customer_id bigint not null references customers(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  method text,
  note text,
  received_by bigint references users(id) on delete set null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_payments_branch_id on payments(branch_id);
create index idx_payments_invoice_id on payments(invoice_id);
create index idx_payments_customer_id on payments(customer_id);
create index idx_payments_received_at on payments(received_at);

create table expenses (
  id bigserial primary key,
  branch_id bigint not null references branches(id),
  name text not null,
  category text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  note text,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_expenses_branch_id on expenses(branch_id);
create index idx_expenses_expense_date on expenses(expense_date);
create index idx_expenses_category on expenses(category);

create table notifications (
  id bigserial primary key,
  branch_id bigint references branches(id) on delete set null,
  customer_id bigint references customers(id) on delete set null,
  invoice_id bigint references invoices(id) on delete set null,
  type text not null,
  title text,
  message text not null,
  status text not null default 'queued',
  scheduled_at timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index idx_notifications_branch_id on notifications(branch_id);
create index idx_notifications_status on notifications(status);
create index idx_notifications_scheduled_at on notifications(scheduled_at);

create table sms_logs (
  id bigserial primary key,
  branch_id bigint references branches(id) on delete set null,
  customer_id bigint references customers(id) on delete set null,
  to_phone text not null,
  template_key text,
  message text not null,
  provider text,
  provider_message_id text,
  status text not null default 'queued',
  error_message text,
  created_by bigint references users(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_sms_logs_branch_id on sms_logs(branch_id);
create index idx_sms_logs_customer_id on sms_logs(customer_id);
create index idx_sms_logs_status on sms_logs(status);
create index idx_sms_logs_created_at on sms_logs(created_at);

create table activity_logs (
  id bigserial primary key,
  branch_id bigint references branches(id) on delete set null,
  actor_user_id bigint references users(id) on delete set null,
  entity_type text not null,
  entity_id bigint,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_branch_id on activity_logs(branch_id);
create index idx_activity_logs_actor_user_id on activity_logs(actor_user_id);
create index idx_activity_logs_entity on activity_logs(entity_type, entity_id);
create index idx_activity_logs_created_at on activity_logs(created_at);
```

## Business Logic Notes

### Billing Date Change

- Store billing preference as `customers.billing_day_of_month` (1–28).
- Do not modify historical invoices when billing day changes.
- Next invoice generation uses the updated billing day.
- Log changes in `activity_logs` (`action = 'billing_date_change'`) with old/new values and approver.

### Monthly Invoice Generation

- Enforce one invoice per customer per month: `unique (customer_id, billing_month)`.
- `billing_month` should be normalized to the first day of month.
- `due_date` is computed from `billing_day_of_month` within the invoice month.
- Insert payments in a transaction and keep `invoices.paid_amount` + `payment_status` consistent.

### Overdue Detection

- Mark `payment_status = 'overdue'` when `due_date < today` and `paid_amount < total_amount`.
