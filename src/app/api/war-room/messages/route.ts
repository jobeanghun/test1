import { NextResponse } from 'next/server';
import { getExternalStore, updateExternalStore } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    const store = await getExternalStore();
    const messages = store?.messages[roomId] || [];
    
    return NextResponse.json({ messages }, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
            'Pragma': 'no-cache'
        }
    });
}

export async function POST(request: Request) {
    try {
        const { roomId, message } = await request.json();

        if (!roomId || !message) return NextResponse.json({ error: 'RoomId and message are required' }, { status: 400 });

        const store = await getExternalStore();
        if (!store) return NextResponse.json({ error: 'External store unavailable' }, { status: 500 });

        const roomMessages = store.messages[roomId] || [];
        
        // 중복 방지: 이미 존재하는 메시지 ID이면 추가하지 않음
        if (roomMessages.some((m: any) => m.id === message.id)) {
            return NextResponse.json({ success: true, messages: roomMessages });
        }

        roomMessages.push(message);
        
        // 최대 100개 유지
        if (roomMessages.length > 100) {
            roomMessages.shift();
        }

        await updateExternalStore({
            messages: {
                ...store.messages,
                [roomId]: roomMessages
            }
        });

        return NextResponse.json({ success: true, messages: roomMessages });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
