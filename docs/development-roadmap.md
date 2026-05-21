# ISP/WiFi Management System — Development Roadmap

Source: [specification.txt](file:///c:/xampp/htdocs/isp/docs/specification.txt)

## Phase 0 — Setup & Foundations

- Set up PostgreSQL + migrations.
- Implement authentication (JWT) and RBAC (roles/permissions).
- Enforce branch scoping in all server queries (branch-filtering by default).
- Add audit logging (`activity_logs`) for critical actions (billing date changes, payments, status changes).
- Seed branches, roles (super_admin/admin/staff), and baseline permissions.

## Phase 1 — MVP (Core Operations)

Goal: run daily operations for multiple branches without SMS automation.

- Branch management
  - Create branches
  - Assign users to branches
- WiFi package management
  - CRUD packages
  - Activate/deactivate packages
  - Optional branch-specific packages
- Customer management (core)
  - Create/update customer
  - Track status: active/pending/suspended/disconnected
  - Store installation date, billing day, router SN
  - Billing day change workflow with audit log
- Billing & payments
  - Generate monthly invoices (one invoice/customer/month)
  - Manual payments (with notes + method)
  - Voucher/receipt printing
  - Payment status (paid/unpaid/partial/overdue)
- Dashboard & analytics (branch)
  - KPI cards: customers, active, income, overdue, expenses, new installs
  - Basic revenue chart (monthly)
- Search & filters
  - By branch, payment status, package, billing month, overdue

Acceptance criteria:

- Payment history is preserved and totals remain accurate.
- All list/search screens are branch-filtered.
- Invoice uniqueness per customer per month is enforced.

## Phase 2 — Notifications, SMS, Expenses, Printing Polish

Goal: automate reminders and scale communications and reporting.

- Expense management
  - CRUD expenses with categories
  - Branch expense reporting
- Reminder & notification system
  - Internal notifications based on overdue rules (e.g., “after 3 days late”)
  - Notification center with read/unread
- SMS gateway integration
  - Provider abstraction (MPT/Ooredoo/Twilio or local provider)
  - SMS templates (before due, overdue, after overdue)
  - Bulk SMS: overdue customers, all customers in branch, selected customers
  - SMS logs + failure visibility
- Background jobs
  - Monthly invoice generation scheduler
  - Reminder evaluation + SMS dispatch scheduler
- Voucher/receipt printing
  - A4 and thermal (58mm/80mm) formats
  - Include customer, package, paid amount, date, staff, branch

Acceptance criteria:

- Reminders are traceable (notification logs + SMS logs).
- SMS sending is idempotent per cycle (no duplicate blasts).

## Phase 3 — Automation & Payments (Advanced)

Goal: reduce manual work through network and payment automation.

- Mikrotik integration
  - Suspend internet after overdue threshold
  - Reactivate after payment
  - Track sync status and failures
- Online payments
  - Integrate KBZPay/WavePay/AyaPay (as available)
  - Reconcile into payments and invoices
- Customer portal
  - View invoices, pay online, download receipts
- Staff mobile support (optional)
  - Mobile-first flows for field operations

## Cross-Cutting Requirements (All Phases)

- Security: password hashing, session timeout, least privilege, audit logs, backups.
- Performance: pagination, proper DB indexes, background workers for reminders/SMS, optional Redis caching for heavy dashboards.
