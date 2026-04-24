import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://zuqsjrbacmwsrvryfsxo.supabase.co";
const supabaseKey = "sb_publishable_TZXrUf5QLKA-5J0gVb2lyw_HBowSBmK";

console.log("URL:", supabaseUrl);
// console.log("KEY:", supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDB() {
    console.log("Testing Supabase Connection...");
    
    // 1. 방 리스트 조회
    const { data: rooms, error: selectError } = await supabase.from('war_rooms').select('*');
    if (selectError) {
        console.error("SELECT ERROR:", selectError);
    } else {
        console.log("SELECT SUCCESS! Rooms count:", rooms.length);
    }

    // 2. 임시 방 Insert 테스트
    const dummyRoom = {
        id: "test_" + Date.now(),
        title: "Test Room",
        level: "info",
        description: "Testing RLS and connection",
        time: new Date().toLocaleTimeString()
    };

    const { error: insertError } = await supabase.from('war_rooms').insert(dummyRoom);
    if (insertError) {
        console.error("INSERT ERROR:", insertError);
    } else {
        console.log("INSERT SUCCESS! Data inserted.");
        
        // 데이터 지우기
        const { error: deleteError } = await supabase.from('war_rooms').delete().eq('id', dummyRoom.id);
        if (deleteError) {
            console.error("DELETE ERROR:", deleteError);
        } else {
            console.log("DELETE SUCCESS! Test completed.");
        }
    }
}

testDB();
