import { Pinecone } from '@pinecone-database/pinecone';
import { ChatMessage, UserProfile } from "@/store/useStore";

// Initialize Pinecone
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY || '' });
const index = pc.Index('aiops-rag-kb');

// Pinecone dummy vector for 1536 dimension (OpenAI default)
const DUMMY_VECTOR = new Array(1536).fill(0);

export interface ExternalState {
    messages: Record<string, ChatMessage[]>;
    participants: Record<string, UserProfile[]>;
    rooms: Record<string, any>;
    users: Record<string, UserProfile>;
}

/**
 * [ROOT FIX] Pinecone을 이용한 영속성 저장소 유틸리티
 * 각 데이터(방, 메시지, 참가자)를 개별 벡터로 저장하여 충돌을 방지합니다.
 */

// 1. War Room Metadata
export async function upsertRoom(room: any) {
    await index.upsert([{
        id: `ROOM:${room.id}`,
        values: DUMMY_VECTOR,
        metadata: {
            type: 'room',
            roomId: room.id || '',
            title: room.title || '',
            description: room.description || '',
            level: room.level || 'info',
            time: room.time || '',
            syncId: 'aiops-prototype'
        }
    }]);
}

export async function getRooms() {
    const result = await index.query({
        vector: DUMMY_VECTOR,
        filter: { type: { '$eq': 'room' } },
        topK: 100,
        includeMetadata: true
    });
    return result.matches.map(m => m.metadata).filter(m => m) as any[];
}

export async function deleteRoom(roomId: string) {
    await index.deleteOne(`ROOM:${roomId}`);
    // 관련 메시지 및 참가자도 삭제 (batch delete)
    // Pinecone은 ID 기반 삭제나 필터 기반 삭제 지원 (Serverless 인덱스는 필터 기반 삭제 제한적일 수 있음)
}

// 2. Chat Messages
export async function upsertChatMessage(roomId: string, message: ChatMessage) {
    await index.upsert([{
        id: `MSG:${roomId}:${message.id}`,
        values: DUMMY_VECTOR,
        metadata: {
            type: 'chat',
            roomId,
            msgId: message.id || '',
            sender: message.sender || 'Anonymous',
            text: message.text || '',
            time: message.time || '',
            userId: message.userId || '',
            color: message.color || '',
            syncId: 'aiops-prototype'
        }
    }]);
}

export async function getChatMessages(roomId: string) {
    const result = await index.query({
        vector: DUMMY_VECTOR,
        filter: { 
            type: { '$eq': 'chat' },
            roomId: { '$eq': roomId }
        },
        topK: 100,
        includeMetadata: true
    });
    
    return result.matches
        .map(m => {
            const meta = m.metadata as any;
            return {
                id: meta.msgId as string || '0',
                sender: meta.sender as string || 'Anonymous',
                text: meta.text as string || '',
                time: meta.time as string || '',
                userId: meta.userId as string || '',
                color: meta.color as string || ''
            } as ChatMessage;
        })
        .sort((a,b) => (a.id || '').localeCompare(b.id || '')); // ID(timestamp) 순 정렬
}

// 3. Participants
export async function upsertParticipant(roomId: string, user: UserProfile) {
    await index.upsert([{
        id: `TEAM:${roomId}:${user.id}`,
        values: DUMMY_VECTOR,
        metadata: {
            type: 'participant',
            roomId,
            userId: user.id,
            name: user.name,
            role: user.role,
            color: user.color,
            status: user.status || 'online',
            lastSeen: Date.now(),
            syncId: 'aiops-prototype'
        }
    }]);
}

export async function getParticipants(roomId: string) {
    const result = await index.query({
        vector: DUMMY_VECTOR,
        filter: { 
            type: { '$eq': 'participant' },
            roomId: { '$eq': roomId }
        },
        topK: 50,
        includeMetadata: true
    });
    
    const now = Date.now();
    return result.matches
        .map(m => m.metadata as any)
        .filter(m => m && (now - (m.lastSeen || 0) < 60000)) // 60초 이내 활동 유무 필터링
        .map(m => ({
            id: m.userId,
            name: m.name,
            role: m.role,
            color: m.color,
            status: m.status
        } as UserProfile));
}

// 4. Users (Pool)
export async function upsertUser(user: UserProfile) {
    await index.upsert([{
        id: `USER:${user.id}`,
        values: DUMMY_VECTOR,
        metadata: {
            type: 'user',
            userId: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            color: user.color,
            syncId: 'aiops-prototype'
        }
    }]);
}

export async function getUsers() {
    const result = await index.query({
        vector: DUMMY_VECTOR,
        filter: { type: { '$eq': 'user' } },
        topK: 100,
        includeMetadata: true
    });
    return result.matches.map(m => {
        const meta = m.metadata as any;
        return {
            id: meta.userId,
            name: meta.name,
            email: meta.email,
            role: meta.role,
            color: meta.color
        } as UserProfile;
    });
}
