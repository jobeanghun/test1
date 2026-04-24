/* eslint-disable @typescript-eslint/no-explicit-any */
import { Pinecone } from '@pinecone-database/pinecone';
import { ChatMessage, UserProfile } from "@/store/useStore";

let _index: any = null;

function getIndex() {
    if (!_index) {
        if (!process.env.PINECONE_API_KEY) {
            console.warn("PINECONE_API_KEY is not set. Using dummy index for Next.js build.");
            // 빌드 시 에러를 막기 위한 더미 인덱스 객체 반환
            return {
                fetch: async () => ({ records: {} }),
                upsert: async () => {},
                deleteOne: async () => {}
            };
        }
        const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        _index = pc.Index('aiops-rag-kb');
    }
    return _index;
}

const DUMMY_VECTOR = new Array(1536).fill(0);
const MASTER_ID = 'AIOPS_MASTER_ROOM_LIST';

// Helper: 마스터 방 목록 가져오기 (즉각적 조회)
async function getMasterRoomIds(): Promise<string[]> {
    const res = await getIndex().fetch([MASTER_ID]);
    if (res.records && res.records[MASTER_ID] && res.records[MASTER_ID].metadata) {
        try {
            return JSON.parse(res.records[MASTER_ID].metadata.roomIds as string || '[]');
        } catch(e) {}
    }
    return [];
}

// Helper: 마스터 방 목록 저장 (즉각적 반영)
async function saveMasterRoomIds(ids: string[]) {
    await getIndex().upsert([{
        id: MASTER_ID,
        values: DUMMY_VECTOR,
        metadata: { roomIds: JSON.stringify(ids) }
    }]);
}

// 1. Get All Rooms
export async function getRooms() {
    const ids = await getMasterRoomIds();
    if (ids.length === 0) return [];
    
    const fetchIds = ids.map((id: string) => `ROOM_DATA_${id}`);
    const res = await getIndex().fetch(fetchIds);
    
    const rooms = [];
    for (const id of fetchIds) {
        if (res.records && res.records[id] && res.records[id].metadata) {
            try {
                const roomInfo = JSON.parse(res.records[id].metadata.roomInfo as string || '{}');
                if (roomInfo.id) rooms.push(roomInfo);
            } catch(e) {}
        }
    }
    return rooms;
}

// 2. Upsert Room Metadata
export async function upsertRoom(room: any) {
    const ids = await getMasterRoomIds();
    if (!ids.includes(room.id)) {
        ids.push(room.id);
        await saveMasterRoomIds(ids);
    }
    
    // 기존 채팅/참여자 데이터 보존
    const res = await getIndex().fetch([`ROOM_DATA_${room.id}`]);
    let chatLog = "[]";
    let participants = "[]";
    if (res.records && res.records[`ROOM_DATA_${room.id}`] && res.records[`ROOM_DATA_${room.id}`].metadata) {
        chatLog = res.records[`ROOM_DATA_${room.id}`].metadata.chatLog as string || "[]";
        participants = res.records[`ROOM_DATA_${room.id}`].metadata.participants as string || "[]";
    }

    await getIndex().upsert([{
        id: `ROOM_DATA_${room.id}`,
        values: DUMMY_VECTOR,
        metadata: {
            roomInfo: JSON.stringify({
                id: room.id,
                title: room.title,
                level: room.level,
                description: room.description,
                time: room.time
            }),
            chatLog,
            participants
        }
    }]);
}

// 3. Delete Room
export async function deleteRoom(roomId: string) {
    const ids = await getMasterRoomIds();
    const newIds = ids.filter((id: string) => id !== roomId);
    await saveMasterRoomIds(newIds);
    await getIndex().deleteOne(`ROOM_DATA_${roomId}`);
}

// 4. Chat Messages
export async function getChatMessages(roomId: string) {
    const res = await getIndex().fetch([`ROOM_DATA_${roomId}`]);
    if (res.records && res.records[`ROOM_DATA_${roomId}`] && res.records[`ROOM_DATA_${roomId}`].metadata) {
        try {
            return JSON.parse(res.records[`ROOM_DATA_${roomId}`].metadata.chatLog as string || '[]');
        } catch(e) {}
    }
    return [];
}

export async function upsertChatMessage(roomId: string, message: ChatMessage) {
    const res = await getIndex().fetch([`ROOM_DATA_${roomId}`]);
    if (res.records && res.records[`ROOM_DATA_${roomId}`] && res.records[`ROOM_DATA_${roomId}`].metadata) {
        const meta = res.records[`ROOM_DATA_${roomId}`].metadata;
        const logs = JSON.parse(meta.chatLog as string || '[]');
        
        const idx = logs.findIndex((m: any) => m.id === message.id);
        if (idx >= 0) logs[idx] = message;
        else logs.push(message);

        // Pinecone Metadata 40KB 제한을 피하기 위해 최신 150개 메시지만 유지
        const safeLogs = logs.slice(-150);

        await getIndex().upsert([{
            id: `ROOM_DATA_${roomId}`,
            values: DUMMY_VECTOR,
            metadata: {
                ...meta,
                chatLog: JSON.stringify(safeLogs)
            }
        }]);
    }
}

// 5. Participants
export async function getParticipants(roomId: string) {
    const res = await getIndex().fetch([`ROOM_DATA_${roomId}`]);
    if (res.records && res.records[`ROOM_DATA_${roomId}`] && res.records[`ROOM_DATA_${roomId}`].metadata) {
        try {
            const parts = JSON.parse(res.records[`ROOM_DATA_${roomId}`].metadata.participants as string || '[]');
            const now = Date.now();
            return parts.filter((u: any) => now - (u.lastSeen || 0) < 60000);
        } catch(e) {}
    }
    return [];
}

export async function upsertParticipant(roomId: string, user: UserProfile) {
    const res = await getIndex().fetch([`ROOM_DATA_${roomId}`]);
    if (res.records && res.records[`ROOM_DATA_${roomId}`] && res.records[`ROOM_DATA_${roomId}`].metadata) {
        const meta = res.records[`ROOM_DATA_${roomId}`].metadata;
        const parts = JSON.parse(meta.participants as string || '[]');
        
        const existing = parts.find((p: any) => p.id === user.id);
        if (existing) {
            Object.assign(existing, user);
            existing.status = 'online';
            existing.lastSeen = Date.now();
        } else {
            parts.push({ ...user, status: 'online', lastSeen: Date.now() });
        }

        await getIndex().upsert([{
            id: `ROOM_DATA_${roomId}`,
            values: DUMMY_VECTOR,
            metadata: {
                ...meta,
                participants: JSON.stringify(parts)
            }
        }]);
    }
}

export async function upsertUser(user: UserProfile) {}
export async function getUsers() { return []; }
