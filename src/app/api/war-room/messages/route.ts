import { NextResponse } from 'next/server';
import { warRoomStore } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    const messages = warRoomStore.messages[roomId] || [];
    return NextResponse.json({ messages }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache'
        }
    });
}

export async function POST(request: Request) {
    const { roomId, message } = await request.json();

    if (!roomId || !message) return NextResponse.json({ error: 'RoomId and message are required' }, { status: 400 });

    if (!warRoomStore.messages[roomId]) {
        warRoomStore.messages[roomId] = [];
    }

    // Add and keep last 100 messages for prototype
    warRoomStore.messages[roomId].push(message);
    if (warRoomStore.messages[roomId].length > 100) {
        warRoomStore.messages[roomId].shift();
    }

    return NextResponse.json({ success: true, messages: warRoomStore.messages[roomId] });
}
