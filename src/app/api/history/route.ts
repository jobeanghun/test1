import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('analysis_history')
            .select('*')
            .order('time', { ascending: false });
            
        if (error) throw error;
        return NextResponse.json({ history: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { item } = await request.json();
        
        const { data, error } = await supabase
            .from('analysis_history')
            .insert({
                id: item.id,
                equipment_name: item.equipmentName,
                short_description: item.shortDescription,
                summary: item.summary,
                raw_result: item.rawResult,
                category: item.category,
                time: item.time,
                user_id: item.userId || 'system'
            })
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json({ item: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'History ID required' }, { status: 400 });

        const { error } = await supabase
            .from('analysis_history')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
