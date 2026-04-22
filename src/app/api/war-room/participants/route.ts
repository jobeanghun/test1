import { NextResponse } from 'next/server';
import { upsertParticipant, getParticipants } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) return NextResponse.json({ error: 'RoomId is required' }, { status: 400 });

    try {
        const participants = await getParticipants(roomId);
        return NextResponse.json({ participants });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { roomId, user } = await request.json();

        if (!roomId || !user) return NextResponse.json({ error: 'RoomId and user are required' }, { status: 400 });

        // 개별 참가자 Upsert (Race condition 없음, 각자 자기 정보만 업데이트)
        await upsertParticipant(roomId, user);
        
        // 최신 참가자 목록 반환
        const activeParticipants = await getParticipants(roomId);

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

        // Pinecone에서 특정 참가자만 삭제 (status를 offline으로 하거나 실제 Delete 가능)
        // 여기선 단순화를 위해 놔두면 lastSeen 기반으로 GET에서 필터링됨
        
        return NextResponse.json({ success: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
