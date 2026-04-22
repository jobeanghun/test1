import { NextResponse } from 'next/server';
import { upsertUser, getUsers } from '@/lib/externalStore';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const users = await getUsers();
        return NextResponse.json({ users });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { user } = await request.json();
        
        if (!user || !user.id) {
            return NextResponse.json({ error: 'User data with id is required' }, { status: 400 });
        }

        // 개별 유져 Upsert
        await upsertUser(user);

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

        // Pinecone에서 유전 삭제 (필요시 구현)
        
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
