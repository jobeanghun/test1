"use client";

import { useState } from "react";
import { 
    Users, UserPlus, Shield, Mail, Activity, MoreVertical, 
    Search, Filter, Trash2, Edit3, CheckCircle2, XCircle, User
} from "lucide-react";
import { useStore, UserProfile } from "@/store/useStore";

export default function AdminUsersPage() {
    const { users, addUser, updateUser, deleteUser, currentUser } = useStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    
    const [newUser, setNewUser] = useState<Partial<UserProfile>>({
        name: "",
        email: "",
        role: "user",
        status: "online",
        password: "password"
    });

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

    const filteredUsers = users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddUser = async () => {
        if (!newUser.name || !newUser.email) return;
        const randomColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
        const createdUser = {
            id: `user-${Date.now()}`,
            name: newUser.name,
            email: newUser.email,
            role: (newUser.role as any) || 'user',
            status: 'offline' as any,
            color: randomColor,
            password: newUser.password || 'password'
        };
        
        addUser(createdUser);
        
        try {
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: createdUser })
            });
        } catch (e) {
            console.error("Failed to sync user to server", e);
        }

        setIsAddModalOpen(false);
        setNewUser({ name: "", email: "", role: "user", password: "password" });
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        
        // 1. 전역 상태 업데이트 (로컬)
        updateUser(editingUser.id, editingUser);
        
        // 2. 서버 동기화 (워룸 참여자 정보 갱신용)
        // 현재는 프로토타입이므로 모든 워룸(WR-001)에 대해 즉시 갱신을 시도합니다.
        try {
            // Update global user pool
            await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: editingUser })
            });
        } catch (e) { console.error("Server sync error", e); }
        
        setIsEditModalOpen(false);
        setEditingUser(null);
    };

    const toggleUserStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'online' ? 'offline' : 'online';
        updateUser(id, { status: newStatus as any });
        const userToUpdate = users.find(u => u.id === id);
        if (userToUpdate) {
            try {
                await fetch('/api/users', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: { ...userToUpdate, status: newStatus } })
                });
            } catch (e) { console.error("Status sync error", e); }
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 text-left">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-3">
                        <Users className="text-emerald-500 w-8 h-8" /> 계정 및 권한 관리
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">시스템 이용 권한을 가진 엔지니어 계정을 관리합니다.</p>
                </div>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
                >
                    <UserPlus className="w-5 h-5" /> 신규 계정 초대
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Total Users</p>
                    <p className="text-3xl font-black text-white">{users.length} <span className="text-sm font-medium text-slate-500">명이 가입됨</span></p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-2xl">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Admin Role</p>
                    <p className="text-3xl font-black text-blue-400">{users.filter(u => u.role === 'admin').length} <span className="text-sm font-medium text-slate-500">명의 관리자</span></p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="이름 또는 이메일로 검색..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-11 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900/50 border-b border-slate-700">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">사용자 정보</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">권한</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">상태</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="hover:bg-slate-700/20 transition-colors group">
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black shadow-lg" style={{ backgroundColor: user.color }}>
                                            {user.name.substring(0, 1)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-200">{user.name}</p>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                                <Mail className="w-3 h-3" /> {user.email}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <div className="flex items-center gap-2">
                                        {user.role === 'admin' ? (
                                            <Shield className="w-3.5 h-3.5 text-blue-400" />
                                        ) : (
                                            <User className="w-3.5 h-3.5 text-slate-500" />
                                        )}
                                        <span className={`text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'text-blue-400' : 'text-slate-400'}`}>
                                            {user.role === 'admin' ? 'Administrator' : 'User'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-5">
                                    <button 
                                        onClick={() => toggleUserStatus(user.id, user.status)}
                                        className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                                            user.status === 'online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-700 text-slate-500'
                                        }`}
                                    >
                                        <Activity className="w-3 h-3" />
                                        {user.status}
                                    </button>
                                </td>
                                <td className="px-6 py-5 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }}
                                            className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                deleteUser(user.id);
                                                await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
                                            }}
                                            disabled={user.id === currentUser?.id}
                                            className="p-2 hover:bg-red-500/10 rounded-lg text-red-500/50 hover:text-red-500 transition-colors disabled:opacity-0"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                        <button onClick={() => setIsAddModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-300"><XCircle /></button>
                        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                            <UserPlus className="text-emerald-500 w-7 h-7" /> 신규 계정 추가
                        </h2>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">성함</label>
                                <input 
                                    type="text" 
                                    value={newUser.name}
                                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    placeholder="예: 홍길동"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">이메일 주소</label>
                                <input 
                                    type="email" 
                                    value={newUser.email}
                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    placeholder="example@company.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">초기 비밀번호</label>
                                <input 
                                    type="text" 
                                    value={newUser.password || ''}
                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                    placeholder="비밀번호"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">시스템 권한</label>
                                <select 
                                    value={newUser.role}
                                    onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                                >
                                    <option value="user">USER (일반 사용자)</option>
                                    <option value="admin">ADMIN (시스템 관리자)</option>
                                </select>
                            </div>

                            <button 
                                onClick={handleAddUser}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-black text-sm mt-4 shadow-xl shadow-emerald-900/10 active:scale-95 transition-all"
                            >
                                계정 생성 및 초대장 발송
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden relative">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-slate-500 hover:text-slate-300"><XCircle /></button>
                        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                            <Edit3 className="text-blue-500 w-7 h-7" /> 계정 정보 수정
                        </h2>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">성함</label>
                                <input 
                                    type="text" 
                                    value={editingUser.name}
                                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">이메일 주소</label>
                                <input 
                                    type="email" 
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">비밀번호 변경</label>
                                <input 
                                    type="text" 
                                    value={editingUser.password || ''}
                                    onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">시스템 권한</label>
                                <select 
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value as any})}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 appearance-none"
                                >
                                    <option value="user">USER (일반 사용자)</option>
                                    <option value="admin">ADMIN (시스템 관리자)</option>
                                </select>
                            </div>

                            <button 
                                onClick={handleUpdateUser}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-black text-sm mt-4 shadow-xl shadow-blue-900/10 active:scale-95 transition-all"
                            >
                                수정 사항 저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
