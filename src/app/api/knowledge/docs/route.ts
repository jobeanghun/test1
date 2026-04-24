import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('knowledge_docs')
            .select('*')
            .order('timestamp', { ascending: false });
            
        if (error) throw error;
        return NextResponse.json({ docs: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { doc } = await request.json();
        
        const { data, error } = await supabase
            .from('knowledge_docs')
            .insert({
                id: doc.id,
                filename: doc.filename,
                content: doc.content,
                filesize: doc.filesize,
                time: doc.time,
                timestamp: doc.timestamp
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ doc: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const all = searchParams.get('all') === 'true';

        if (all) {
            const { error } = await supabase
                .from('knowledge_docs')
                .delete()
                .neq('id', '0'); // 모두 삭제
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (!id) return NextResponse.json({ error: 'Doc ID required' }, { status: 400 });

        const { error } = await supabase
            .from('knowledge_docs')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
