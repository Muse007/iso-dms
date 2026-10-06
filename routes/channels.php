<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('department.{id}', function ($user, $id) {
    return (int) $user->department_id === (int) $id;
});

Broadcast::channel('admin', function ($user) {
    return $user->hasAnyRole(['super_admin', 'qmr', 'director']);
});
