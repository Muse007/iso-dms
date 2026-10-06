<?php

use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role'       => \Spatie\Permission\Middleware\RoleMiddleware::class,
            'permission' => \Spatie\Permission\Middleware\PermissionMiddleware::class,
            'role_or_permission' => \Spatie\Permission\Middleware\RoleOrPermissionMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Halaman di luar hak akses tidak boleh tampil sebagai halaman error.
        // GET diarahkan ke halaman pemberitahuan di dalam layout aplikasi;
        // submit form dikembalikan ke halaman asal dengan pesan.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            if ($response->getStatusCode() !== 403 || ! $request->user() || $request->expectsJson()) {
                return $response;
            }

            $message = $e->getMessage() ?: 'Halaman ini tidak termasuk dalam hak akses akun Anda.';

            if (! $request->isMethod('GET')) {
                return back()->with('flash.error', $message);
            }

            // Status 200 disengaja: Inertia memperlakukan 4xx sebagai kegagalan
            // request dan memunculkan modal error, bukan me-render halaman ini.
            return Inertia::render('errors/forbidden', ['message' => $message])
                ->toResponse($request)
                ->setStatusCode(200);
        });
    })->create();
