<?php

namespace App\Providers;

use App\Workflow\ApprovalService;
use App\Workflow\Events\ApprovalRequested;
use App\Workflow\Listeners\NotifyApprover;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ApprovalService::class);
    }

    public function boot(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Apply DB-stored SMTP/mail settings (falls back to .env when unset).
        \App\Models\Setting::applyMailConfig();

        Event::listen(ApprovalRequested::class, NotifyApprover::class);
    }
}
