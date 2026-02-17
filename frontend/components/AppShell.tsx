"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Package,
    Users,
    Warehouse,
    FileText,
    TrendingUp,
    RotateCcw,
    BarChart3,
    Menu,
    X,
} from "lucide-react";

const navItems = [
    { href: "/", label: "Ana Sayfa", icon: Home },
    { href: "/products", label: "Ürünler", icon: Package },
    { href: "/customers", label: "Müşteriler", icon: Users },
    { href: "/warehouses", label: "Depolar", icon: Warehouse },
    { href: "/invoices", label: "Faturalar", icon: FileText },
    { href: "/stock", label: "Stok Hareketleri", icon: TrendingUp },
    { href: "/returns", label: "İadeler", icon: RotateCcw },
    { href: "/customers/ledger", label: "Cari Detay", icon: BarChart3 },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed lg:static inset-y-0 left-0 z-50
                    w-64 bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl
                    transform transition-transform duration-200 ease-out
                    ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                `}
            >
                <div className="flex items-center justify-between p-4 border-b border-gray-700 lg:border-b lg:p-6">
                    <div>
                        <div className="text-xl lg:text-2xl font-bold text-white">Toptancı ERP</div>
                        <div className="text-xs lg:text-sm text-gray-400 mt-0.5">Yönetim Sistemi</div>
                    </div>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-700"
                        aria-label="Menüyü kapat"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>
                <nav className="p-3 lg:p-4 space-y-0.5 overflow-y-auto max-h-[calc(100vh-5rem)]">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${
                                    isActive ? "bg-gray-700 text-white" : "hover:bg-gray-700 text-gray-300"
                                }`}
                            >
                                <Icon className="h-5 w-5 flex-shrink-0 group-hover:scale-105 transition-transform" />
                                <span className="font-medium text-sm lg:text-base">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile header */}
                <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
                        aria-label="Menüyü aç"
                    >
                        <Menu className="h-6 w-6 text-gray-700" />
                    </button>
                    <span className="font-semibold text-gray-800 truncate">Toptancı ERP</span>
                </header>

                <main className="flex-1 overflow-y-auto min-h-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
