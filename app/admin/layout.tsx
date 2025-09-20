// app/admin/layout.tsx
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Admin access is enforced by middleware and page-level checks
    return children;
}
