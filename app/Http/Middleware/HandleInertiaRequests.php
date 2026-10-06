<?php

namespace App\Http\Middleware;

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        [$message, $author] = str(Inspiring::quotes()->random())->explode('-');

        return array_merge(parent::share($request), [
            ...parent::share($request),
            'name' => config('app.name'),
            'quote' => ['message' => trim($message), 'author' => trim($author)],
            'auth' => [
                'user'        => $request->user(),
                'roles'       => $request->user()?->getRoleNames() ?? [],
                // getAllPermissions() mencakup permission via role (getPermissionNames() hanya yang langsung).
                'permissions' => $request->user()?->getAllPermissions()->pluck('name') ?? [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('flash.success'),
                'error'   => fn () => $request->session()->get('flash.error'),
            ],
            'notifications' => function () use ($request) {
                $u = $request->user();
                if (! $u) {
                    return ['items' => [], 'unread' => 0];
                }

                return [
                    'items' => $u->notifications()->latest()->limit(12)->get()->map(fn ($n) => [
                        'id'    => $n->id,
                        'read'  => $n->read_at !== null,
                        'title' => $n->data['title'] ?? 'Notifikasi',
                        'body'  => $n->data['body'] ?? '',
                        'url'   => $n->data['url'] ?? null,
                        'type'  => $n->data['type'] ?? 'info',
                        'ago'   => $n->created_at->locale('id')->diffForHumans(),
                        'ts'    => $n->created_at->timestamp,
                    ])->values(),
                    'unread' => $u->unreadNotifications()->count(),
                ];
            },
        ]);
    }
}
