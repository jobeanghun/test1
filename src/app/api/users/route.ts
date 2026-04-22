import { NextResponse } from 'next/server';
import { getExternalStore, updateExternalStore } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET() {
    const store = await getExternalStore();
    const users = Object.values(store?.users || {});
    return NextResponse.json({ users });
}

export async function POST(request: Request) {
    try {
        const { user } = await request.json();
        
        if (!user || !user.id) {
            return NextResponse.json({ error: 'User data with id is required' }, { status: 400 });
        }

        const store = await getExternalStore();
        if (!store) return NextResponse.json({ error: 'External store unavailable' }, { status: 500 });

        await updateExternalStore({
            users: {
                ...store.users,
                [user.id]: user
            }
        });

        return NextResponse.json({ success: true, user });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) return NextResponse.json({ error: 'UserId is required' }, { status: 400 });

        const store = await getExternalStore();
        if (!store) return NextResponse.json({ error: 'External store unavailable' }, { status: 500 });

        const updatedUsers = { ...store.users };
        delete updatedUsers[userId];

        await updateExternalStore({
            users: updatedUsers
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
