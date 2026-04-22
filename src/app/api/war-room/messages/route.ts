import { NextResponse } from 'next/server';
import { upsertChatMessage, getChatMessages } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    try {
        const messages = await getChatMessages(roomId);
        return NextResponse.json({ messages }, {
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
        const { roomId, message } = await request.json();

        if (!roomId || !message) return NextResponse.json({ error: 'RoomId and message are required' }, { status: 400 });

        // 개별 메시지 Upsert (Race condition 없음)
        await upsertChatMessage(roomId, message);

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Message POST error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
