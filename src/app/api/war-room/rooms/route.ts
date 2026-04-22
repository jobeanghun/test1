import { NextResponse } from 'next/server';
import { upsertRoom, getRooms, deleteRoom } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const rooms = await getRooms();
        return NextResponse.json({ rooms }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0',
                'Pragma': 'no-cache'
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { room } = await request.json();
        
        if (!room || !room.id) {
            return NextResponse.json({ error: 'Room data with id is required' }, { status: 400 });
        }

        // 개별 워룸 Upsert
        await upsertRoom(room);

        return NextResponse.json({ success: true, room });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const roomId = searchParams.get('roomId');

        if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

        // Pinecone에서 방 삭제
        await deleteRoom(roomId);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
