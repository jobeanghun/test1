import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { data: rooms, error } = await supabase
            .from('war_rooms')
            .select('*')
            .order('time', { ascending: false });

        if (error) throw error;

        return NextResponse.json({ rooms: rooms || [] }, {
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

        const { error } = await supabase
            .from('war_rooms')
            .upsert({
                id: room.id,
                title: room.title,
                level: room.level,
                description: room.description,
                time: room.time
            });

        if (error) throw error;

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

        const { error } = await supabase
            .from('war_rooms')
            .delete()
            .eq('id', roomId);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
