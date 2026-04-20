import { NextResponse } from 'next/server';
import { warRoomStore } from '@/lib/serverStore';

export const dynamic = 'force-dynamic';

export async function GET() {
    const users = Object.values(warRoomStore.users);
    return NextResponse.json({ users });
}

export async function POST(request: Request) {
    try {
        const { user } = await request.json();
        
        if (!user || !user.id) {
            return NextResponse.json({ error: 'User data with id is required' }, { status: 400 });
        }

        warRoomStore.users[user.id] = user;

        return NextResponse.json({ success: true, user: warRoomStore.users[user.id] });
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'UserId is required' }, { status: 400 });

    delete warRoomStore.users[userId];
    return NextResponse.json({ success: true });
}
