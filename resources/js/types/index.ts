import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
    /** Spatie role names for the current user, e.g. ['document_control']. */
    roles: string[];
    /** Spatie permission names for the current user, e.g. ['audit.create']. */
    permissions: string[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    url: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface NotificationItem {
    id: string;
    read: boolean;
    title: string;
    body: string;
    url: string | null;
    type: 'info' | 'success' | 'warning' | 'action' | string;
    ago: string;
    ts: number;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    flash?: { success?: string | null; error?: string | null };
    notifications?: { items: NotificationItem[]; unread: number };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
