import { FlashToaster } from '@/components/flash-toaster';
import { NotificationToaster } from '@/components/notification-toaster';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';

interface AppLayoutProps {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default ({ children, breadcrumbs, ...props }: AppLayoutProps) => (
    <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
        {children}
        <FlashToaster />
        <NotificationToaster />
    </AppLayoutTemplate>
);
