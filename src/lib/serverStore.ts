import { ChatMessage, UserProfile } from "@/store/useStore";

// Mock database for prototype (persists while dev server is running)
// In a real app, this would be a real DB like PostgreSQL or Redis
const globalStore: {
    messages: Record<string, ChatMessage[]>;
    participants: Record<string, UserProfile[]>;
    rooms: Record<string, any>; // Stores WarRoom metadata
    users: Record<string, UserProfile>; // Global users pool
    lastUpdate: Record<string, number>;
} = {
    messages: {},
    participants: {},
    users: {
        'user-1': { id: 'user-1', name: '조병훈 (Admin)', email: 'admin@infinity.net', role: 'admin', status: 'online', color: '#10B981', password: 'password' },
        'user-2': { id: 'user-2', name: '박테크 (User)', email: 'park@infinity.net', role: 'user', status: 'online', color: '#3B82F6', password: 'password' },
        'user-3': { id: 'user-3', name: '이코드 (User)', email: 'lee@infinity.net', role: 'user', status: 'offline', color: '#F59E0B', password: 'password' },
        'user-4': { id: 'user-4', name: '정인프 (User)', email: 'jung@infinity.net', role: 'user', status: 'online', color: '#8B5CF6', password: 'password' },
        'test-1': { id: 'test-1', name: '테스터1 (User)', email: 'test1@lguplus.co.kr', role: 'user', status: 'offline', color: '#EC4899', password: 'password' },
        'test-2': { id: 'test-2', name: '테스터2 (User)', email: 'test2@lguplus.co.kr', role: 'user', status: 'offline', color: '#8B5CF6', password: 'password' }
    },
    rooms: {
        'WR-001': {
            id: 'WR-001',
            title: 'CORE-DB 네트워크 지연 대응',
            description: '메인 데이터베이스 서버의 응답 속도가 500ms 이상으로 급증하여 서비스 지연 발생 중',
            level: 'danger',
            time: '15:24'
        }
    },
    lastUpdate: {}
};

// Global object to avoid re-initialization during HMR in Next.js
const globalAny = global as any;
if (!globalAny.warRoomStore) {
    globalAny.warRoomStore = globalStore;
}
if (!globalAny.warRoomStore.users) {
    globalAny.warRoomStore.users = globalStore.users;
}

export const warRoomStore = globalAny.warRoomStore;
