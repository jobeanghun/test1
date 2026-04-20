import { NextResponse } from 'next/server';
import { warRoomStore } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const rooms = Object.values(warRoomStore.rooms);
    // Sort by most recent based on key assumption or just return values
    // In our case time is a string, let's just return what we have (newest first depends on insertion, but Object.values order is not guaranteed. The client will handle it).
    return NextResponse.json({ rooms }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache'
        }
    });
}

export async function POST(request: Request) {
    try {
        const { room } = await request.json();
        
        if (!room || !room.id) {
            return NextResponse.json({ error: 'Room data with id is required' }, { status: 400 });
        }

        warRoomStore.rooms[room.id] = {
            id: room.id,
            title: room.title,
            description: room.description,
            level: room.level,
            time: room.time
        };

        return NextResponse.json({ success: true, room: warRoomStore.rooms[room.id] });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    delete warRoomStore.rooms[roomId];
    delete warRoomStore.messages[roomId];
    delete warRoomStore.participants[roomId];

    return NextResponse.json({ success: true });
}
