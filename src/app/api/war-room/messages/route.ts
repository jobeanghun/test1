import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    try {
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('room_id', roomId)
            .order('id', { ascending: true }); // ID가 타임스탬프 기반이므로 정렬 기준 활용

        if (error) throw error;

        // DB 컬럼(user_id)을 프론트엔드 모델(userId)에 맞게 매핑
        const mappedMessages = messages?.map(m => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            time: m.time,
            userId: m.user_id,
            color: m.color
        })) || [];

        return NextResponse.json({ messages: mappedMessages }, {
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

        const { error } = await supabase
            .from('messages')
            .upsert({
                id: message.id,
                room_id: roomId,
                sender: message.sender,
                text: message.text,
                time: message.time,
                user_id: message.userId,
                color: message.color
            });

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("Message POST error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
