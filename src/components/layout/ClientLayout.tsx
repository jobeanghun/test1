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
        // 클라이언트 마운트 후 필요한 로직이 있다면 여기에 작성
    }, []);

    return (
        <AuthGuard>
            {isLoginPage ? (
                <main className="w-full h-full bg-slate-900 overflow-auto">{children}</main>
            ) : (
                <>
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
