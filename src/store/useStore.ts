import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AnalysisItem {
    id: string;
    equipmentName: string;
    logSnippet?: string;
    summary: string;
    causes?: string[];
    actions?: string[];
    time: string;
    shortDescription?: string;
    rawResult?: string;
    category?: string;
    userId?: string;
}

export interface KnowledgeDoc {
    id: string;
    filename: string;
    content: string;
    filesize: string;
    time: string;
    timestamp?: number;
}

export interface ChatMessage {
    id?: string; // 고유 ID 추가
    sender: string;
    text: string;
    time: string;
    userId?: string;
    color?: string;
}

export interface WarRoom {
    id: string;
    title: string;
    description: string;
    level: 'info' | 'danger';
    time: string;
    chatLog: ChatMessage[];
    participants?: string[]; // userIds
}

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'user';
    status: 'online' | 'offline';
    color: string;
    password?: string;
}

interface AppState {
    // Current User Info
    isAuthenticated: boolean;
    currentUser: UserProfile | null;
    
    // Core Data
    analysisHistory: AnalysisItem[];
    knowledgeDocs: KnowledgeDoc[];
    warRooms: WarRoom[];
    users: UserProfile[];
    activeRoomId: string | null;

    // UI State
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    mobileSidebarOpen: boolean;
    setMobileSidebarOpen: (open: boolean) => void;

    // Actions
    login: (email: string, password?: string) => void;
    logout: () => void;
    addAnalysis: (item: AnalysisItem) => void;
    addKnowledgeDoc: (doc: KnowledgeDoc) => void;
    removeKnowledgeDoc: (id: string) => void;
    clearKnowledgeDocs: () => void;
    addWarRoom: (room: WarRoom) => void;
    removeWarRoom: (id: string) => void;
    setWarRooms: (rooms: WarRoom[]) => void;
    setActiveRoomId: (id: string | null) => void;
    addMessageToRoom: (roomId: string, message: ChatMessage) => void;
    
    // User Management Actions
    addUser: (user: UserProfile) => void;
    updateUser: (id: string, updates: Partial<UserProfile>) => void;
    deleteUser: (id: string) => void;
    setUsers: (users: UserProfile[]) => void;
    // Analysis Draft State
    currentAnalysisDraft: {
        logText: string;
        equipmentName: string;
        shortDescription: string;
        category: string;
        result: any | null;
    };
    updateAnalysisDraft: (updates: Partial<AppState['currentAnalysisDraft']>) => void;
    clearAnalysisDraft: () => void;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            isAuthenticated: false,
            currentUser: null,
            analysisHistory: [],
            knowledgeDocs: [],
            warRooms: [],
            users: [], // DB에서 로드할 예정
            activeRoomId: null,

            currentAnalysisDraft: {
                logText: '',
                equipmentName: '',
                shortDescription: '',
                category: 'Network',
                result: null
            },

            sidebarOpen: true,
            setSidebarOpen: (open) => set({ sidebarOpen: open }),
            mobileSidebarOpen: false,
            setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

            login: (email) => set((state) => {
                const user = state.users.find(u => u.email === email || u.id === email) || null;
                if (!user) return state; // 로그인 실패 처리 (UI 단에서 에러 핸들링)
                return { 
                    isAuthenticated: true, 
                    currentUser: { ...user, status: 'online' } 
                };
            }),
            logout: () => set({ isAuthenticated: false, currentUser: null }),
            
            addAnalysis: (item) => set((state) => ({ 
                analysisHistory: [item, ...state.analysisHistory] 
            })),
            setAnalysisHistory: (history) => set({ analysisHistory: history }),
            addKnowledgeDoc: (doc) => set((state) => ({ 
                knowledgeDocs: [doc, ...state.knowledgeDocs] 
            })),
            removeKnowledgeDoc: (id) => set((state) => ({ 
                knowledgeDocs: state.knowledgeDocs.filter(d => d.id !== id) 
            })),
            setKnowledgeDocs: (docs) => set({ knowledgeDocs: docs }),
            clearKnowledgeDocs: () => set({ 
                knowledgeDocs: [] 
            }),
            addWarRoom: (room) => set((state) => ({ 
                warRooms: [room, ...state.warRooms.filter(r => r.id !== room.id)] 
            })),
            removeWarRoom: (id) => set((state) => ({
                warRooms: state.warRooms.filter(r => r.id !== id),
                activeRoomId: state.activeRoomId === id ? null : state.activeRoomId
            })),
            setWarRooms: (rooms) => set({ warRooms: rooms }),
            setActiveRoomId: (id) => set({ activeRoomId: id }),
            addMessageToRoom: (roomId, message) => set((state) => ({
                warRooms: state.warRooms.map(room => 
                    room.id === roomId 
                        ? { ...room, chatLog: [...room.chatLog, { 
                            ...message, 
                            id: message.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
                            userId: message.userId || state.currentUser?.id
                        }] } 
                        : room
                )
            })),

            addUser: (user) => set((state) => ({ users: [...state.users, user] })),
            updateUser: (id, updates) => set((state) => {
                const refreshedUsers = state.users.map(u => u.id === id ? { ...u, ...updates } : u);
                const isCurrent = state.currentUser?.id === id;
                return { 
                    users: refreshedUsers,
                    currentUser: isCurrent ? { ...state.currentUser!, ...updates } : state.currentUser
                };
            }),
            deleteUser: (id) => set((state) => ({
                users: state.users.filter(u => u.id !== id)
            })),
            setUsers: (users) => set({ users }),
            
            updateAnalysisDraft: (updates) => set((state) => ({
                currentAnalysisDraft: { ...state.currentAnalysisDraft, ...updates }
            })),
            clearAnalysisDraft: () => set({
                currentAnalysisDraft: {
                    logText: '',
                    equipmentName: '',
                    shortDescription: '',
                    category: 'Network',
                    result: null
                }
            }),
        }),
        {
            name: 'aiops-storage',
            version: 1,
            migrate: (persistedState: any, version: number) => {
                if (version === 0) {
                    if (persistedState.warRooms) {
                        persistedState.warRooms = persistedState.warRooms.filter((r: any) => !r.title.includes("CORE-DB"));
                    }
                }
                return persistedState as AppState;
            },
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                currentUser: state.currentUser,
                // analysisHistory: state.analysisHistory, 제외
                // knowledgeDocs: state.knowledgeDocs, 제외 (미리 제외)
                warRooms: state.warRooms,
                // users: state.users 제외
                sidebarOpen: state.sidebarOpen,
                currentAnalysisDraft: state.currentAnalysisDraft
            })
        }
    )
);
