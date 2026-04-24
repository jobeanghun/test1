"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TerminalSquare, Database, MessageSquareWarning, ChevronLeft, ChevronRight, History, Network, LayoutDashboard, Users, X } from "lucide-react";
import { useStore } from "@/store/useStore";
import { cn } from "@/lib/utils";

const commonNavigation = [
    { name: "장애 분석 (Log Analyze)", href: "/", icon: TerminalSquare },
    { name: "분석 이력 (History)", href: "/history", icon: History },
    { name: "지식 창고 (Knowledge Base)", href: "/knowledge", icon: Database },
    { name: "벡터 DB 시각화", href: "/vector-db", icon: Network },
    { name: "벡터 DB 대시보드", href: "/vector-dashboard", icon: LayoutDashboard },
    { name: "협업 워룸 (War Rooms)", href: "/war-room", icon: MessageSquareWarning },
];

const adminNavigation = [
    { name: "계정 관리 (Users)", href: "/admin/users", icon: Users },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { sidebarOpen, setSidebarOpen, currentUser } = useStore();

    const isAdmin = currentUser?.role === 'admin';
    const navigation = isAdmin ? [...commonNavigation, ...adminNavigation] : commonNavigation;

    return (
        <aside
            className={cn(
                "bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col z-50",
                // 데스크탑에서는 고정 위치, 모바일에서는 fixed 오버레이
                "md:relative md:translate-x-0",
                useStore((state) => state.mobileSidebarOpen) ? "fixed inset-y-0 left-0 translate-x-0" : "fixed inset-y-0 left-0 -translate-x-full",
                sidebarOpen ? "w-64" : "w-20 md:w-20 w-64" // 모바일에서 열릴 때는 무조건 넓게(w-64)
            )}
        >
            <div className="h-16 flex items-center justify-center border-b border-slate-700 shrink-0 relative">
                {sidebarOpen || useStore.getState().mobileSidebarOpen ? (
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        AIOps Dash
                    </h1>
                ) : (
                    <span className="text-xl font-bold text-emerald-400">AI</span>
                )}
                {/* 모바일 닫기 버튼 */}
                <button 
                    onClick={() => useStore.getState().setMobileSidebarOpen(false)}
                    className="md:hidden absolute right-4 text-slate-400 hover:text-white"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-2 px-3">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    onClick={() => useStore.getState().setMobileSidebarOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                        isActive
                                            ? "bg-slate-700 text-emerald-400"
                                            : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                                    )}
                                    title={!sidebarOpen ? item.name : undefined}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {(sidebarOpen || useStore.getState().mobileSidebarOpen) && <span className="truncate">{item.name}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-700 shrink-0 hidden md:flex">
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="flex w-full items-center justify-center p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-slate-300"
                >
                    {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                </button>
            </div>
        </aside>
    );
}
