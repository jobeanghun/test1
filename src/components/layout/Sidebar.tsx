"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TerminalSquare, Database, MessageSquareWarning, ChevronLeft, ChevronRight, History, Network, LayoutDashboard, Users } from "lucide-react";
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
                "bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col relative",
                sidebarOpen ? "w-64" : "w-20"
            )}
        >
            <div className="h-16 flex items-center justify-center border-b border-slate-700 shrink-0">
                {sidebarOpen ? (
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        AIOps Dash
                    </h1>
                ) : (
                    <span className="text-xl font-bold text-emerald-400">AI</span>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto py-4">
                <ul className="space-y-2 px-3">
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                                        isActive
                                            ? "bg-slate-700 text-emerald-400"
                                            : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                                    )}
                                    title={!sidebarOpen ? item.name : undefined}
                                >
                                    <item.icon className="h-5 w-5 shrink-0" />
                                    {sidebarOpen && <span className="truncate">{item.name}</span>}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            <div className="p-4 border-t border-slate-700 shrink-0">
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
