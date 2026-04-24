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
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

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
                            <button 
                                onClick={() => { setIsProfileModalOpen(true); setIsProfileOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
                                <User className="w-4 h-4" /> 내 계정 정보
                            </button>
                            <button 
                                onClick={() => { setIsSettingsModalOpen(true); setIsProfileOpen(false); }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors"
                            >
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

            {/* 내 계정 정보 모달 */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <User className="text-emerald-400 w-5 h-5" /> 내 계정 정보
                            </h3>
                            <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-center mb-6">
                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 shadow-lg border-4 border-slate-800 flex items-center justify-center text-3xl font-black text-white">
                                    {currentUser?.name?.charAt(0) || "U"}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">이름 (표시명)</label>
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-sm">
                                    {currentUser?.name || "알 수 없음"}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">이메일 계정</label>
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 text-sm">
                                    {currentUser?.email || "알 수 없음"}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">권한 레벨</label>
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 text-sm font-semibold">
                                    {currentUser?.role === 'admin' ? '최고 관리자 (Admin)' : '일반 엔지니어 (User)'}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 block">가입일시</label>
                                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-400 text-sm">
                                    {currentUser?.createdAt || "기록 없음"}
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                            <button onClick={() => setIsProfileModalOpen(false)} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-colors">닫기</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 시스템 설정 모달 */}
            {isSettingsModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-800 bg-slate-800/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings className="text-blue-400 w-5 h-5" /> 시스템 환경 설정
                            </h3>
                            <button onClick={() => setIsSettingsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-start gap-3">
                                <Activity className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-emerald-400 font-bold text-sm">시스템 상태 정상</h4>
                                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                                        현재 모든 서비스(Supabase, Pinecone, Gemini API)가 안정적으로 연결되어 서비스 중입니다.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">연동 상태 현황</h4>
                                <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-sm text-slate-400 font-medium">데이터베이스 (Supabase)</span>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">Connected</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-sm text-slate-400 font-medium">RAG 지식창고 (Pinecone)</span>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">Connected</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-sm text-slate-400 font-medium">생성형 AI 모델 (Gemini 2.0)</span>
                                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-bold">Connected</span>
                                </div>
                            </div>

                            <div className="space-y-3 pt-2">
                                <h4 className="text-sm font-semibold text-slate-300 border-b border-slate-800 pb-2">기타 설정</h4>
                                <button onClick={() => router.push('/admin/users')} className="w-full flex justify-between items-center p-3 bg-slate-800/50 hover:bg-slate-800 rounded-lg border border-slate-700 transition-colors">
                                    <span className="text-sm text-slate-300 font-medium">관리자 전용 페이지 이동 (계정 관리)</span>
                                    <span className="text-xs text-slate-500">➔</span>
                                </button>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
                            <button onClick={() => setIsSettingsModalOpen(false)} className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors">확인</button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
