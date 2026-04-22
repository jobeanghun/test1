import { NextResponse } from 'next/server';
import { getExternalStore, updateExternalStore } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    const store = await getExternalStore();
    const participants = store?.participants[roomId] || [];
    return NextResponse.json({ participants });
}

export async function POST(request: Request) {
    try {
        const { roomId, user } = await request.json();

        if (!roomId || !user) return NextResponse.json({ error: 'RoomId and user are required' }, { status: 400 });

        const store = await getExternalStore();
        if (!store) return NextResponse.json({ error: 'External store unavailable' }, { status: 500 });

        const roomParticipants = store.participants[roomId] || [];

        // Upsert current user in room participants
        const existingIndex = roomParticipants.findIndex((p: any) => p.id === user.id);
        
        // 하트비트/갱신 시간 추가 (추후 필터링용)
        const userWithTimestamp = { ...user, lastSeen: Date.now(), status: 'online' };

        if (existingIndex > -1) {
            roomParticipants[existingIndex] = userWithTimestamp;
        } else {
            roomParticipants.push(userWithTimestamp);
        }

        // 30초 이상 응답 없는 사용자 자동 정리 (정체 현상 방지)
        const now = Date.now();
        const activeParticipants = roomParticipants.filter((p: any) => 
            p.id === user.id || (p.lastSeen && now - p.lastSeen < 30000)
        );

        await updateExternalStore({
            participants: {
                ...store.participants,
                [roomId]: activeParticipants
            }
        });

        return NextResponse.json({ success: true, participants: activeParticipants });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');
        const userId = searchParams.get('userId');

        if (!roomId || !userId) {
            return NextResponse.json({ error: 'RoomId and userId are required' }, { status: 400 });
        }

        const store = await getExternalStore();
        if (!store || !store.participants[roomId]) return NextResponse.json({ success: true });

        const updatedParticipants = store.participants[roomId].filter(
            (p: any) => p.id !== userId
        );

        await updateExternalStore({
            participants: {
                ...store.participants,
                [roomId]: updatedParticipants
            }
        });

        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
