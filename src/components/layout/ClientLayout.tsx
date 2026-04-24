"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import AuthGuard from "./AuthGuard";
import { useEffect } from "react";
import { useStore } from "@/store/useStore";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        // App Load 시 필요한 글로벌 데이터 패치
        const loadGlobalData = async () => {
            try {
                // 1. Users DB Load
                const userRes = await fetch('/api/users');
                if (userRes.ok) {
                    const data = await userRes.json();
                    if (data.users) {
                        useStore.getState().setUsers(data.users);
                    }
                }

                // 2. History DB Load
                const historyRes = await fetch('/api/history');
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    if (data.history) {
                        useStore.getState().setAnalysisHistory(data.history);
                    }
                }

                // 3. Knowledge Docs DB Load
                const docsRes = await fetch('/api/knowledge/docs');
                if (docsRes.ok) {
                    const data = await docsRes.json();
                    if (data.docs) {
                        useStore.getState().setKnowledgeDocs(data.docs);
                    }
                }
            } catch (e) {
                console.error("Failed to load global data:", e);
            }
        };

        loadGlobalData();
    }, []);

    return (
        <AuthGuard>
            {isLoginPage ? (
                <main className="w-full h-full bg-slate-900 overflow-auto">{children}</main>
            ) : (
                <>
                    {/* 모바일 뒷배경 오버레이 */}
                    {useStore((state) => state.mobileSidebarOpen) && (
                        <div 
                            className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
                            onClick={() => useStore.getState().setMobileSidebarOpen(false)}
                        />
                    )}
                    <Sidebar />
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                        <Header />
                        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
                            {children}
                        </main>
                    </div>
                </>
            )}
        </AuthGuard>
    );
}
