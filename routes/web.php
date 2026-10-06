<?php

use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\AuditController;
use App\Http\Controllers\AuditFindingController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\ModulePlaceholderController;
use App\Http\Controllers\NcrController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\RiskController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route(
    auth()->check() ? 'dashboard' : 'login'
))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Notifikasi in-app
    Route::get('notifications/{id}/go',   [NotificationController::class, 'go'])->name('notifications.go');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    // Document Control
    Route::get('documents',              [DocumentController::class, 'index'])->name('documents.index');
    Route::post('documents',             [DocumentController::class, 'store'])->name('documents.store');
    Route::post('documents/archive',     [DocumentController::class, 'archiveStore'])->name('documents.archive');
    Route::get('documents/{document}',   [DocumentController::class, 'show'])->name('documents.show');
    Route::match(['put', 'patch'], 'documents/{document}', [DocumentController::class, 'update'])->name('documents.update');
    Route::delete('documents/{document}', [DocumentController::class, 'destroy'])->name('documents.destroy');
    Route::post('documents/{document}/submit', [DocumentController::class, 'submit'])->name('documents.submit');
    Route::get('documents/{document}/preview-pdf', [DocumentController::class, 'previewPdf'])->name('documents.preview-pdf');

    // NCR / CAR / CAPA
    Route::get('ncr',                       [NcrController::class, 'index'])->name('ncr.index');
    Route::post('ncr',                      [NcrController::class, 'store'])->name('ncr.store');
    Route::get('ncr/{ncr}',                 [NcrController::class, 'show'])->name('ncr.show');
    Route::match(['put', 'patch'], 'ncr/{ncr}', [NcrController::class, 'update'])->name('ncr.update');
    Route::delete('ncr/{ncr}',              [NcrController::class, 'destroy'])->name('ncr.destroy');
    Route::post('ncr/{ncr}/submit',         [NcrController::class, 'submit'])->name('ncr.submit');
    Route::post('ncr/{ncr}/transition',     [NcrController::class, 'transition'])->name('ncr.transition');

    // Risk
    Route::get('risks',                 [RiskController::class, 'index'])->name('risks.index');
    Route::post('risks',                [RiskController::class, 'store'])->name('risks.store');

    // Approvals (workflow §4)
    Route::get('approvals',             [ApprovalController::class, 'index'])->name('approvals.index');
    Route::post('approvals/{approval}/approve', [ApprovalController::class, 'approve'])->name('approvals.approve');
    Route::post('approvals/{approval}/reject',  [ApprovalController::class, 'reject'])->name('approvals.reject');
    Route::post('approvals/{approval}/revise',  [ApprovalController::class, 'revise'])->name('approvals.revise');

    // Internal Audit — Schedule (FM-BDK-007) with MR approval + DC share
    Route::get('audit-schedules/{schedule}',             [\App\Http\Controllers\AuditScheduleController::class, 'show'])->name('audit-schedules.show');
    Route::match(['put', 'patch'], 'audit-schedules/{schedule}', [\App\Http\Controllers\AuditScheduleController::class, 'update'])->name('audit-schedules.update');
    Route::get('audit-schedules/{schedule}/preview-pdf', [\App\Http\Controllers\AuditScheduleController::class, 'previewPdf'])->name('audit-schedules.preview-pdf');
    Route::post('audit-schedules/{schedule}/approve',    [\App\Http\Controllers\AuditScheduleController::class, 'approve'])->name('audit-schedules.approve');
    Route::post('audit-schedules/{schedule}/reject',     [\App\Http\Controllers\AuditScheduleController::class, 'reject'])->name('audit-schedules.reject');
    Route::post('audit-schedules/{schedule}/share',      [\App\Http\Controllers\AuditScheduleController::class, 'share'])->name('audit-schedules.share');
    Route::post('audit-schedules/{schedule}/resend',     [\App\Http\Controllers\AuditScheduleController::class, 'resend'])->name('audit-schedules.resend');

    // Internal Audit
    Route::get('audits',                            [AuditController::class, 'index'])->name('audits.index');
    Route::post('audits',                           [AuditController::class, 'store'])->name('audits.store');
    // Didaftarkan sebelum `audits/{audit}` agar segmen "export" tidak tertangkap sebagai id audit.
    Route::get('audits/export/findings',            [AuditController::class, 'exportFindings'])->name('audits.export-findings');
    Route::get('audits/{audit}',                    [AuditController::class, 'show'])->name('audits.show');
    Route::match(['put', 'patch'], 'audits/{audit}', [AuditController::class, 'update'])->name('audits.update');
    Route::delete('audits/{audit}',                 [AuditController::class, 'destroy'])->name('audits.destroy');
    Route::post('audits/{audit}/transition',        [AuditController::class, 'transition'])->name('audits.transition');
    Route::post('audits/{audit}/actual-auditors',   [AuditController::class, 'updateActualAuditors'])->name('audits.actual-auditors');

    // Audit Findings (nested)
    Route::post('audits/{audit}/findings',                          [AuditFindingController::class, 'store'])->name('audits.findings.store');
    Route::get('audits/{audit}/findings/{finding}',                 [AuditFindingController::class, 'show'])->name('audits.findings.show');
    Route::match(['put', 'patch'], 'audits/{audit}/findings/{finding}', [AuditFindingController::class, 'update'])->name('audits.findings.update');
    Route::delete('audits/{audit}/findings/{finding}',              [AuditFindingController::class, 'destroy'])->name('audits.findings.destroy');
    Route::post('audits/{audit}/findings/{finding}/submit-action',  [AuditFindingController::class, 'submitAction'])->name('audits.findings.submit-action');
    Route::post('audits/{audit}/findings/{finding}/approve',        [AuditFindingController::class, 'approve'])->name('audits.findings.approve');
    Route::post('audits/{audit}/findings/{finding}/reject',         [AuditFindingController::class, 'reject'])->name('audits.findings.reject');
    Route::post('audits/{audit}/findings/{finding}/auditor-verify', [AuditFindingController::class, 'auditorVerify'])->name('audits.findings.auditor-verify');
    Route::post('audits/{audit}/findings/{finding}/verify',         [AuditFindingController::class, 'verify'])->name('audits.findings.verify');
    Route::get('audits/{audit}/findings/{finding}/report-pdf',      [AuditFindingController::class, 'reportPdf'])->name('audits.findings.report');

    // Placeholder index pages for remaining modules
    Route::get('suppliers',    [ModulePlaceholderController::class, 'suppliers'])->name('suppliers.index');
    Route::get('trainings',    [ModulePlaceholderController::class, 'trainings'])->name('trainings.index');
    Route::get('assets',       [ModulePlaceholderController::class, 'assets'])->name('assets.index');
    Route::get('kpis',         [ModulePlaceholderController::class, 'kpis'])->name('kpis.index');
    Route::middleware('role:super_admin|qmr|director')->group(function () {
        Route::get('departments',                 [DepartmentController::class, 'index'])->name('departments.index');
        Route::post('departments',                [DepartmentController::class, 'store'])->name('departments.store');
        Route::match(['put', 'patch'], 'departments/{department}', [DepartmentController::class, 'update'])->name('departments.update');
        Route::delete('departments/{department}', [DepartmentController::class, 'destroy'])->name('departments.destroy');
    });

    Route::middleware('role:super_admin|qmr')->group(function () {
        Route::get('users',           [UserController::class, 'index'])->name('users.index');
        Route::post('users',          [UserController::class, 'store'])->name('users.store');
        Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->name('users.destroy');

        Route::get('roles',          [RoleController::class, 'index'])->name('roles.index');
        Route::post('roles',         [RoleController::class, 'store'])->name('roles.store');
        Route::match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])->name('roles.update');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->name('roles.destroy');
    });
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
