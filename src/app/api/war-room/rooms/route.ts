import { NextResponse } from 'next/server';
import { getExternalStore, updateExternalStore } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const store = await getExternalStore();
    const rooms = Object.values(store?.rooms || {});
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

        const store = await getExternalStore();
        if (!store) return NextResponse.json({ error: 'External store unavailable' }, { status: 500 });

        const updatedRoom = {
            id: room.id,
            title: room.title,
            description: room.description,
            level: room.level,
            time: room.time
        };

        await updateExternalStore({
            rooms: {
                ...store.rooms,
                [room.id]: updatedRoom
            }
        });

        return NextResponse.json({ success: true, room: updatedRoom });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

        const store = await getExternalStore();
        if (!store) return NextResponse.json({ error: 'External store unavailable' }, { status: 500 });

        const updatedRooms = { ...store.rooms };
        delete updatedRooms[roomId];

        const updatedMessages = { ...store.messages };
        delete updatedMessages[roomId];

        const updatedParticipants = { ...store.participants };
        delete updatedParticipants[roomId];

        await updateExternalStore({
            rooms: updatedRooms,
            messages: updatedMessages,
            participants: updatedParticipants
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
