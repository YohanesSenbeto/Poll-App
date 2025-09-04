// app/admin/layout.tsx
import AdminRoute from "@/components/admin-route";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AdminRoute>{children}</AdminRoute>;
}
