"use client";

import { Bell, LogOut, Settings, User, FileText, Activity } from "lucide-react";
import { useState } from "react";
import { useStore } from "@/store/useStore";
import { useRouter } from "next/navigation";

export default function Header() {
    const { logout, analysisHistory, knowledgeDocs, currentUser } = useStore();
    const router = useRouter();
    const [isNotiOpen, setIsNotiOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    // 통합 알림 리스트 생성 및 정렬
    const notifications = [
        ...analysisHistory.map(item => ({
            id: `analysis-${item.id}`,
            type: 'analysis',
            title: item.shortDescription || item.summary,
            subtitle: item.equipmentName,
            time: item.time,
            timestamp: new Date(item.time).getTime()
        })),
        ...knowledgeDocs.map(doc => ({
            id: `doc-${doc.id}`,
            type: 'document',
            title: doc.filename,
            subtitle: '지식 베이스 파싱/인덱싱 완료',
            time: doc.time,
            timestamp: new Date(doc.time).getTime()
        }))
    ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10); // 최근 10개만 표시

    // 안 읽은 알림 개수 계산 로직 등을 추가할 수 있으나, 현재 UI 구조 상 단순히 존재 여부만 표현
    const hasNotifications = notifications.length > 0;

    return (
        <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 sticky top-0 z-30 shrink-0">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-200">인프라 현황</h2>
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    모든 시스템 정상 가동 중
                </div>
            </div>

            <div className="flex items-center gap-4 relative">
                {/* 알림 버튼 */}
                <button 
                    onClick={() => { setIsNotiOpen(!isNotiOpen); setIsProfileOpen(false); }}
                    className={`relative p-2 transition-colors rounded-lg ${isNotiOpen ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
                >
                    <Bell className="h-5 w-5" />
                    {hasNotifications && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-slate-800 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
                    )}
                </button>

                {/* 프로필 버튼 */}
                <div 
                    onClick={() => { setIsProfileOpen(!isProfileOpen); setIsNotiOpen(false); }}
                    className={`h-8 w-8 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 shadow-md border-2 cursor-pointer transition-colors ${isProfileOpen ? 'border-emerald-400' : 'border-slate-700 hover:border-slate-500'}`}
                ></div>

                {/* 바탕 클릭 시 닫기용 투명 오버레이 */}
                {(isNotiOpen || isProfileOpen) && (
                    <div className="fixed inset-0 z-40" onClick={() => { setIsNotiOpen(false); setIsProfileOpen(false); }}></div>
                )}

                {/* 알림 드롭다운 */}
                {isNotiOpen && (
                    <div className="absolute top-12 right-12 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-sm font-semibold text-slate-200">최근 시스템 기록</h3>
                            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{notifications.length}건</span>
                        </div>
                        <div className="max-h-80 overflow-y-auto custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-slate-500 text-sm">
                                    새로운 알림 내역이 없습니다.
                                </div>
                            ) : (
                                notifications.map(noti => (
                                    <div key={noti.id} className="p-4 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors cursor-pointer group">
                                        <div className="flex items-start gap-3">
                                            {noti.type === 'analysis' ? (
                                                <div className="mt-1 shrink-0 p-1.5 rounded-full bg-red-500/10 text-red-500">
                                                    <Activity className="w-3.5 h-3.5" />
                                                </div>
                                            ) : (
                                                <div className="mt-1 shrink-0 p-1.5 rounded-full bg-emerald-500/10 text-emerald-500">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                            <div className="flex-1 overflow-hidden">
                                                <p className="text-sm text-slate-300 font-medium group-hover:text-white transition-colors truncate">
                                                    {noti.title}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-1 truncate">
                                                    {noti.time.split(' ')[1] || noti.time} • {noti.subtitle}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 border-t border-slate-700 text-center bg-slate-900/50 hover:bg-slate-800 transition-colors cursor-pointer">
                            <span className="text-xs text-emerald-400 font-medium tracking-wide">모든 알림 보기</span>
                        </div>
                    </div>
                )}

                {/* 프로필 드롭다운 */}
                {isProfileOpen && (
                    <div className="absolute top-12 right-0 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50 text-left">
                            <p className="text-sm font-bold text-slate-200">{currentUser?.name || "AIOps 엔지니어"}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{currentUser?.email || "admin@infinity-aiops.net"}</p>
                        </div>
                        <div className="p-2">
                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors">
                                <User className="w-4 h-4" /> 내 계정 정보
                            </button>
                            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors">
                                <Settings className="w-4 h-4" /> 시스템 설정
                            </button>
                        </div>
                        <div className="p-2 border-t border-slate-700 bg-slate-900/30">
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                <LogOut className="w-4 h-4" /> 로그아웃
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
