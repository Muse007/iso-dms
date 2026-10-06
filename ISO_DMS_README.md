# ISO Digital Management System

Enterprise ISO compliance suite — Laravel 12 + Inertia + React + TypeScript + Shadcn UI + Tailwind v4.

Manages: **ISO 9001 · 14001 · 45001 · IATF**, document control, audit, NCR/CAR/CAPA, risk register, KPI, supplier, training, calibration.

## Quick start

```bash
# 1. install deps (already done by scaffold)
composer install
npm install

# 2. configure DB in .env — already set to MySQL iso_dms (XAMPP root, no password)
# create the database if you have not:
"C:\xampp\mysql\bin\mysql.exe" -uroot -e "CREATE DATABASE IF NOT EXISTS iso_dms;"

# 3. fresh schema + demo data
php artisan migrate:fresh --seed

# 4. dev mode (separate terminals)
php artisan serve              # http://localhost:8000
php artisan queue:listen       # notifications, escalations
php artisan reverb:start       # WebSocket on :8080
npm run dev                    # Vite HMR
```

## Demo accounts (all password: `password`)

| Role | Email |
|------|-------|
| Super Admin | admin@iso-dms.test |
| QMR | qmr@iso-dms.test |
| Director | director@iso-dms.test |
| Manager | manager@iso-dms.test |
| Supervisor | supervisor@iso-dms.test |
| Staff | staff@iso-dms.test |
| Auditor | auditor@iso-dms.test |

## Architecture map

| Concern | Location |
|---------|----------|
| Migrations (18 custom + activity log + permission) | `database/migrations/` |
| Models | `app/Models/` |
| Workflow engine | `app/Workflow/` (Approvable trait, ApprovalService, events, jobs, notifications) |
| RBAC roles + permissions | `database/seeders/RolePermissionSeeder.php` (6 roles, 18 resources × 6 abilities) |
| Activity log | Spatie `LogsActivity` trait on Document, Audit, CorrectiveAction, Risk |
| Broadcasting | `routes/channels.php` (Reverb) |
| Dashboard data | `app/Http/Controllers/DashboardController.php` |
| React pages | `resources/js/pages/` |
| Sidebar | `resources/js/components/app-sidebar.tsx` |

## Workflow (flowchart §4)

`Staff → Supervisor → Manager → Director` — generic engine. Any model that uses the `Approvable` trait and defines `approvalFlow(): array` flows through the same engine.

Triggering:
```php
app(\App\Workflow\ApprovalService::class)->submit($document);
// or via HTTP: POST /documents/{id}/submit
```

Reacting:
```php
POST /approvals/{id}/approve   { comment?: string }
POST /approvals/{id}/reject    { reason: string }
POST /approvals/{id}/revise    { reason: string }
```

Idle approvals are escalated hourly by the scheduled `EscalateStaleApprovals` job (`routes/console.php`).

## Modules → routes

| Module | URL |
|--------|-----|
| Executive dashboard | `/dashboard` |
| Document Control | `/documents` |
| NCR / CAR / CAPA (kanban) | `/ncr` |
| Risk Register (matrix) | `/risks` |
| Approval Queue | `/approvals` |
| Internal Audit | `/audits` |
| Suppliers | `/suppliers` |
| Training | `/trainings` |
| Calibration | `/assets` |
| KPI Monitoring | `/kpis` |
| Departments | `/departments` (admin) |
| Users | `/users` (admin) |

## Production build

```bash
npm run build
php artisan optimize
php artisan queue:restart
```

## Linked design artifacts

- `../mockup.html` — premium UI mockup (single-file, CDN)
- `../flowchart.html` — 16 process diagrams (Mermaid)
