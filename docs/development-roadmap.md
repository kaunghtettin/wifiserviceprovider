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

## Phase 2 — Expenses, Printing Polish, and Future Automation

Goal: expand finance operations and keep automation items staged for future workflow.

- Expense management
  - CRUD expenses with categories
  - Branch expense reporting
- Background jobs
  - Monthly invoice generation scheduler
- Voucher/receipt printing
  - A4 and thermal (58mm/80mm) formats
  - Include customer, package, paid amount, date, staff, branch
- Future workflow (deferred)
  - Internal reminder and notification center
  - SMS provider abstraction and template system
  - Bulk messaging and delivery logs

Acceptance criteria:

- Expense data is traceable by branch and month.
- Printing outputs match invoice and payment records consistently.

## Phase 3 — Internal Automation (Advanced)

Goal: reduce manual work through internal network automation and staff workflow support.

- Staff mobile support (optional)
  - Mobile-first flows for field operations

## Cross-Cutting Requirements (All Phases)

- Security: password hashing, session timeout, least privilege, audit logs, backups.
- Performance: pagination, proper DB indexes, background workers for invoice jobs, optional Redis caching for heavy dashboards.
