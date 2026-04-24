"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";
import { Shield } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const { login, users, setUsers } = useStore();
    const [loading, setLoading] = useState(false);
    const [adminId, setAdminId] = useState("");
    const [password, setPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        // 최신 사용자 목록 로드
        fetch('/api/users')
            .then(res => res.json())
            .then(data => {
                if (data.users) {
                    setUsers(data.users);
                }
            })
            .catch(e => console.error(e));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg("");

        // 이메일 입력 시 콤마(,)를 점(.)으로 자동 치환 (오타 방지)
        const inputId = adminId.trim().replace(/,/g, '.');
        // 이메일, ID 또는 이름으로 검색 지원 (가입 시 콤마로 저장된 경우도 대비)
        const matchedUser = users.find(u => 
            (u.email && u.email.replace(/,/g, '.') === inputId) || 
            u.id === inputId || 
            u.name === inputId
        );

        if (!matchedUser) {
            setErrorMsg("존재하지 않는 계정입니다. 관리자에게 문의하세요.");
            return;
        }

        // 비밀번호 검증 (프로토타입이므로 기본값 또는 저장된 값 비교)
        const expectedPassword = matchedUser.password || "password";
        if (password !== expectedPassword) {
            setErrorMsg("비밀번호가 일치하지 않습니다.");
            return;
        }

        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            login(matchedUser.id);
            router.push("/");
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl shadow-lg border border-slate-700 flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                        AIOps Dash
                    </h1>
                    <p className="text-slate-400 mt-2 text-center text-sm">
                        지능형 IT 인프라 통합 관제 플랫폼에 로그인하세요.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    {errorMsg && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
                            {errorMsg}
                        </div>
                    )}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                접속 계정 (Email 또는 ID)
                            </label>
                            <input
                                type="text"
                                required
                                value={adminId}
                                onChange={(e) => setAdminId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                placeholder="example@infinity.net"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                비밀번호
                            </label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-900 font-bold py-3 px-4 rounded-lg transition-all transform active:scale-95 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
                    >
                        {loading ? (
                            <span className="animate-pulse">인증 중...</span>
                        ) : (
                            "안전하게 로그인"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
