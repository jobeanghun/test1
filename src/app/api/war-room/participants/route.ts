import { NextResponse } from 'next/server';
import { warRoomStore } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    const participants = warRoomStore.participants[roomId] || [];
    return NextResponse.json({ participants });
}

export async function POST(request: Request) {
    const { roomId, user } = await request.json();

    if (!roomId || !user) return NextResponse.json({ error: 'RoomId and user are required' }, { status: 400 });

    if (!warRoomStore.participants[roomId]) {
        warRoomStore.participants[roomId] = [];
    }

    // Upsert current user in room participants
    const existingIndex = warRoomStore.participants[roomId].findIndex((p: any) => p.id === user.id);
    if (existingIndex > -1) {
        warRoomStore.participants[roomId][existingIndex] = user;
    } else {
        warRoomStore.participants[roomId].push(user);
    }

    return NextResponse.json({ success: true, participants: warRoomStore.participants[roomId] });
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const userId = searchParams.get('userId');

    if (!roomId || !userId) {
        return NextResponse.json({ error: 'RoomId and userId are required' }, { status: 400 });
    }

    if (warRoomStore.participants[roomId]) {
        warRoomStore.participants[roomId] = warRoomStore.participants[roomId].filter(
            (p: any) => p.id !== userId
        );
    }

    return NextResponse.json({ success: true });
}
