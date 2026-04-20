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
        // 기존 이름(김이산)으로 복구 요청에 따라 로컬 스토리지에 저장된 이름을 다시 업데이트
        const { users, setUsers, warRooms, setWarRooms } = useStore.getState();
        
        let usersUpdated = false;
        const newUsers = users.map(u => {
            if (u.id === 'user-1' && u.name.includes("조병훈")) {
                usersUpdated = true;
                return { ...u, name: "김이산 (Admin)" };
            }
            return u;
        });
        if (usersUpdated) setUsers(newUsers);

        let roomsUpdated = false;
        const newRooms = warRooms.map(room => {
            let logUpdated = false;
            const newLog = room.chatLog.map(msg => {
                if (msg.sender && msg.sender.includes("조병훈")) {
                    logUpdated = true;
                    return { ...msg, sender: "김이산 (Admin)" };
                }
                return msg;
            });
            if (logUpdated) roomsUpdated = true;
            return logUpdated ? { ...room, chatLog: newLog } : room;
        });
        if (roomsUpdated) setWarRooms(newRooms);
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
