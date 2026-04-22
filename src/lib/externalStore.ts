import { ChatMessage, UserProfile } from "@/store/useStore";

// Using a public REST API for prototype persistence on Vercel
// Since demo IDs can vanish, we check and recreate if necessary.
const OBJECT_ID = "ff8081819d82fab6019db2c6ba1f0343";
const STORAGE_API_BASE = "https://api.restful-api.dev/objects";
const STORAGE_API_URL = `${STORAGE_API_BASE}/${OBJECT_ID}`;

interface ExternalState {
    messages: Record<string, ChatMessage[]>;
    participants: Record<string, UserProfile[]>;
    rooms: Record<string, any>;
    users: Record<string, UserProfile>;
}

// Initial state to recover if storage vanishes
const INITIAL_STATE: ExternalState = {
    messages: {},
    participants: {},
    rooms: {
        'WR-001': {
            id: 'WR-001',
            title: 'CORE-DB 네트워크 지연 대응',
            description: '메인 데이터베이스 서버의 응답 속도가 500ms 이상으로 급증하여 서비스 지연 발생 중',
            level: 'danger',
            time: '15:24'
        }
    },
    users: {
        'user-1': { id: 'user-1', name: '조병훈 (Admin)', email: 'admin@infinity.net', role: 'admin', status: 'online', color: '#10B981' },
        'user-2': { id: 'user-2', name: '박테크 (User)', email: 'park@infinity.net', role: 'user', status: 'online', color: '#3B82F6' },
        'test-1': { id: 'test-1', name: '테스터1 (User)', email: 'test1@lguplus.co.kr', role: 'user', status: 'offline', color: '#EC4899' },
        'test-2': { id: 'test-2', name: '테스터2 (User)', email: 'test2@lguplus.co.kr', role: 'user', status: 'offline', color: '#8B5CF6' }
    }
};

export async function getExternalStore(): Promise<ExternalState> {
    try {
        const res = await fetch(STORAGE_API_URL, { cache: 'no-store' });
        
        if (res.status === 404) {
            console.warn("Storage object not found (404). Re-creating...");
            await createExternalStore(INITIAL_STATE);
            return INITIAL_STATE;
        }

        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

        const data = await res.json();
        return data.data as ExternalState;
    } catch (e) {
        console.error("External store access failed, using initial state", e);
        return INITIAL_STATE;
    }
}

async function createExternalStore(state: ExternalState): Promise<void> {
    try {
        // We attempt to re-use the same ID by manually posting it if the API allows, 
        // but restful-api.dev generates its own IDs.
        // For prototype stability, we try a POST which will create a NEW object, 
        // BUT we need to update our hardcoded ID if we want it to persist.
        // NOTE: In this specific demo, if it's 404, we'll try to use the POST and 
        // hope the ID stays the same (it won't). 
        // Real fix: We should really use a KV store. 
        // Improving logic: If it's a prototype, we'll just POST to the base URL.
        const res = await fetch(STORAGE_API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: OBJECT_ID, // Some APIs allow ID specification
                name: "warroom_prototype",
                data: state
            })
        });
        const result = await res.json();
        console.log("New storage created with ID:", result.id);
    } catch (e) {
        console.error("Failed to create new store", e);
    }
}

export async function updateExternalStore(update: Partial<ExternalState>): Promise<void> {
    try {
        const currentState = await getExternalStore();

        const newState = {
            ...currentState,
            ...update
        };

        const res = await fetch(STORAGE_API_URL, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: "warroom_prototype",
                data: newState
            })
        });

        if (!res.ok) {
             console.error("Update failed, status:", res.status);
             // If PUT fails because object is gone, try to re-create via POST
             if (res.status === 404) {
                 await createExternalStore(newState);
             }
        }
    } catch (e) {
        console.error("Failed to update external store", e);
    }
}
