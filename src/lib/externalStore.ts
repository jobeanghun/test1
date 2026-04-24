/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { ChatMessage, UserProfile } from "@/store/useStore";

export interface ExternalState {
    messages: Record<string, ChatMessage[]>;
    participants: Record<string, UserProfile[]>;
    rooms: Record<string, any>;
    users: Record<string, UserProfile>;
}

// Vercel 환경에서는 /tmp 디렉토리만 쓰기 가능, 로컬에서는 프로젝트 루트 사용
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
const DB_PATH = isVercel 
    ? path.join('/tmp', 'war-room-db.json') 
    : path.join(process.cwd(), '.war-room-db.json');

// 기본 초기값
const defaultState: ExternalState = {
    messages: {},
    participants: {},
    rooms: {},
    users: {}
};

// 파일에서 데이터 읽기
function readDB(): ExternalState {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("DB Read Error", e);
    }
    return defaultState;
}

// 파일에 데이터 쓰기
function writeDB(data: ExternalState) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
        console.error("DB Write Error", e);
    }
}

// 1. War Room Metadata
export async function upsertRoom(room: any) {
    const db = readDB();
    db.rooms[room.id] = room;
    writeDB(db);
}

export async function getRooms() {
    const db = readDB();
    return Object.values(db.rooms);
}

export async function deleteRoom(roomId: string) {
    const db = readDB();
    delete db.rooms[roomId];
    delete db.messages[roomId];
    delete db.participants[roomId];
    writeDB(db);
}

// 2. Chat Messages
export async function upsertChatMessage(roomId: string, message: ChatMessage) {
    const db = readDB();
    if (!db.messages[roomId]) {
        db.messages[roomId] = [];
    }
    const messages = db.messages[roomId];
    const idx = messages.findIndex((m: ChatMessage) => m.id === message.id);
    if (idx >= 0) {
        messages[idx] = message;
    } else {
        messages.push(message);
    }
    writeDB(db);
}

export async function getChatMessages(roomId: string) {
    const db = readDB();
    const messages = db.messages[roomId] || [];
    return [...messages].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
}

// 3. Participants
export async function upsertParticipant(roomId: string, user: UserProfile) {
    const db = readDB();
    if (!db.participants[roomId]) {
        db.participants[roomId] = [];
    }
    const list = db.participants[roomId];
    const existing = list.find((u: UserProfile) => u.id === user.id);
    
    if (existing) {
        Object.assign(existing, user);
        existing.status = 'online';
        (existing as any).lastSeen = Date.now();
    } else {
        list.push({ ...user, status: 'online', lastSeen: Date.now() } as any);
    }
    writeDB(db);
}

export async function getParticipants(roomId: string) {
    const db = readDB();
    const list = db.participants[roomId] || [];
    const now = Date.now();
    // 60초 이내 활동한 사용자만 반환
    return list.filter((u: any) => now - (u.lastSeen || 0) < 60000);
}

// 4. Users (Pool)
export async function upsertUser(user: UserProfile) {
    const db = readDB();
    db.users[user.id] = user;
    writeDB(db);
}

export async function getUsers() {
    const db = readDB();
    return Object.values(db.users);
}
