"use client";

import { useState, useRef, useEffect } from "react";
import { 
    AlertTriangle, MessageSquare, Send, Users, X, FileText, 
    LayoutTemplate, Loader2, Download, Sparkles, ShieldCheck,
    BarChart3, Activity, UserCircle2, Circle, FileSpreadsheet,
    Settings2, Monitor, Trash2, LogOut, MessageSquareShare
} from "lucide-react";
import { useStore, UserProfile, ChatMessage } from "@/store/useStore";
import { saveAs } from "file-saver";
import { 
    Document, Packer, Paragraph, TextRun, HeadingLevel, 
    AlignmentType 
} from "docx";
import pptxgen from "pptxgenjs";
import { supabase } from '@/lib/supabaseClient';

// --- Types ---
type TemplateType = 'standard' | 'technical' | 'executive' | 'custom';

interface ReportTemplate {
    id: TemplateType;
    name: string;
    description: string;
    icon: React.ReactNode;
    content: string;
}

// --- Page Component ---
export default function WarRoomPage() {
    const { warRooms, activeRoomId, setActiveRoomId, addMessageToRoom, addWarRoom, removeWarRoom, currentUser, users } = useStore();
    const [message, setMessage] = useState("");
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
    const [serverParticipants, setServerParticipants] = useState<UserProfile[]>([]);
    
    // Reporting States
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportStep, setReportStep] = useState(1); 
    const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('standard');
    const [manualReportContent, setManualReportContent] = useState("");
    const [customInstruction, setCustomInstruction] = useState("");

    const activeRoom = warRooms.find(r => r.id === activeRoomId) || null;
    const scrollRef = useRef<HTMLDivElement>(null);

    // Participants List: 서버 데이터에서 중복 제거 및 최신 정보(이름/색상 등) 반영
    const participants: UserProfile[] = Array.from(
        new Map(
            serverParticipants.map(sp => {
                const localUser = users.find(u => u.id === sp.id);
                const baseInfo = localUser || sp;
                return [sp.id, { ...baseInfo, status: sp.status || 'online' }];
            })
        ).values()
    );

    // --- Sync Logic (Supabase Realtime) ---
    useEffect(() => {
        if (!currentUser) return;

        // 1. Initial Load (처음 한 번 & 활성방 변경 시 로드)
        const fetchInitialData = async () => {
            try {
                const rRes = await fetch(`/api/war-room/rooms`, { cache: 'no-store' });
                if (rRes.ok) {
                    const rData = await rRes.json();
                    if (rData.rooms) {
                        const serverRooms = rData.rooms as any[];
                        const currentWarRooms = useStore.getState().warRooms;
                        const updatedWarRooms = serverRooms.map(sr => {
                            const existingLocal = currentWarRooms.find(lr => lr.id === sr.id);
                            return existingLocal 
                                ? { ...existingLocal, title: sr.title, level: sr.level, description: sr.description } 
                                : { ...sr, chatLog: [], participants: [] };
                        });

                        // 로컬에서 방금 만들었는데 아직 서버 응답이 반영 안 된 5초 이내 방은 보존 (Race condition 방지)
                        const now = Date.now();
                        currentWarRooms.forEach(lr => {
                            if (!updatedWarRooms.some(ur => ur.id === lr.id)) {
                                const roomTime = parseInt(lr.id, 10);
                                if (!isNaN(roomTime) && (now - roomTime < 5000)) {
                                    updatedWarRooms.push(lr);
                                }
                            }
                        });

                        useStore.getState().setWarRooms(updatedWarRooms);
                    }
                }

                if (activeRoomId) {
                    const mRes = await fetch(`/api/war-room/messages?roomId=${activeRoomId}`, { cache: 'no-store' });
                    if (mRes.ok) {
                        const mData = await mRes.json();
                        const currentActiveRoom = useStore.getState().warRooms.find(r => r.id === activeRoomId);
                        if (mData.messages && currentActiveRoom) {
                            const localLog = currentActiveRoom.chatLog;
                            const serverLog = mData.messages as ChatMessage[];
                            const newMessages = serverLog.filter(sm => !localLog.some(lm => lm.id === sm.id));
                            if (newMessages.length > 0) {
                                newMessages.forEach(msg => addMessageToRoom(activeRoomId, msg));
                            }
                        }
                    }
                }
            } catch (e) { console.error("Initial Load Error", e); }
        };

        fetchInitialData();

        // 2. Setup Realtime Subscription
        const channel = supabase.channel(`war-room-sync-${activeRoomId || 'general'}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'war_rooms' },
                (payload: any) => {
                    if (payload.eventType === 'INSERT') {
                        const newRoom = payload.new;
                        useStore.getState().addWarRoom({ ...newRoom, chatLog: [], participants: [] });
                    } else if (payload.eventType === 'DELETE') {
                        const oldRoom = payload.old;
                        useStore.getState().removeWarRoom(oldRoom.id);
                    } else if (payload.eventType === 'UPDATE') {
                        fetchInitialData();
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                (payload: any) => {
                    const newMsg = payload.new;
                    // 본인이 보낸 메시지는 Optimistic UI로 이미 추가되었으므로 중복 필터링
                    const currentActiveRoom = useStore.getState().warRooms.find(r => r.id === newMsg.room_id);
                    if (currentActiveRoom && !currentActiveRoom.chatLog.some(m => m.id === newMsg.id)) {
                        useStore.getState().addMessageToRoom(newMsg.room_id, {
                            id: newMsg.id,
                            sender: newMsg.sender,
                            text: newMsg.text,
                            time: newMsg.time,
                            userId: newMsg.user_id,
                            color: newMsg.color
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeRoomId, currentUser?.id]);

    // 스크롤 동기화
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [activeRoom?.chatLog.length]);



    const templates: ReportTemplate[] = [
        {
            id: 'standard',
            name: '표준 장애 리포트',
            description: '장애 인지부터 조치까지의 전 과정을 4단계로 요약하는 표준 양식입니다.',
            icon: <FileText className="w-6 h-6 text-emerald-400" />,
            content: `[표준 장애 보고서]\n1. 장애 개요: \n2. 인지 및 초기 대응: \n3. 원인 분석: \n4. 조치 결과 및 예방 대책: `
        },
        {
            id: 'technical',
            name: '기술 상세 분석서',
            description: '시스템 로그, 명령어, 서버 설정 등 기술적인 세부 사항에 집중한 문서입니다.',
            icon: <Monitor className="w-6 h-6 text-blue-400" />,
            content: `[기술 상세 보고서]\n- 에러 스택/로그: \n- 서버 환경 정보: \n- 실행 명령어 이력: \n- 커널/DB 파라미터 변경점: `
        },
        {
            id: 'executive',
            name: '경영진 요약 보고(SLA)',
            description: '서비스 영향도와 비즈니스 관점의 요약을 제공하는 핵심 보고 양식입니다.',
            icon: <FileSpreadsheet className="w-6 h-6 text-purple-400" />,
            content: `[경영진 요약 보고서]\n- 서비스 영향: \n- 장애 지속 시간: \n- 주요 조치 사항: \n- 향후 재발 방지 및 투자 계획: `
        },
        {
            id: 'custom',
            name: '나만의 커스텀 템플릿',
            description: '사용자가 원하는 주제나 항목을 자유롭게 정의하여 AI 보고서를 생성합니다.',
            icon: <Settings2 className="w-6 h-6 text-amber-400" />,
            content: ""
        }
    ];

    const currentTemplateObj = templates.find(t => t.id === selectedTemplate)!;

    const handleDeleteRoom = async (e: React.MouseEvent, roomId: string) => {
        e.stopPropagation();
        if (!confirm("이 워룸을 완전히 삭제하시겠습니까? (복구 불가)")) return;
        
        try {
            await fetch(`/api/war-room/rooms?roomId=${roomId}`, { method: 'DELETE' });
            removeWarRoom(roomId);
        } catch (error) {
            console.error("Delete room failed", error);
            alert("삭제에 실패했습니다.");
        }
    };

    // --- Actions ---
    const handleSendMessage = async (e?: React.FormEvent, customMsg?: string, senderName?: string, userId?: string) => {
        if (e) e.preventDefault();
        const textToSend = customMsg || message;
        if (!textToSend.trim() || !activeRoomId) return;

        const currentSender = users.find(u => u.id === (selectedSenderId || currentUser?.id)) || currentUser;
        const sender = senderName || currentSender?.name || "익명";
        const uid = userId || currentSender?.id || "anon";
        const color = currentSender?.color || "#10B981";

        const newMessage: ChatMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5), // 고유 ID 생성
            sender,
            text: textToSend,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            userId: uid,
            color
        };

        // 1. Update Local Zustand Store
        addMessageToRoom(activeRoomId, newMessage);
        if (!customMsg) setMessage("");

        // 2. Sync to Mock Server for other tabs
        try {
            await fetch('/api/war-room/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: activeRoomId, message: newMessage }),
                cache: 'no-store'
            });
        } catch (e) { console.error("Send Sync Error", e); }
    };

    const handleLeaveRoom = async () => {
        if (!activeRoomId || !currentUser) return;

        try {
            await fetch(`/api/war-room/participants?roomId=${activeRoomId}&userId=${currentUser.id}`, {
                method: 'DELETE'
            });
        } catch (e) { console.error("Leave Sync Error", e); }

        setActiveRoomId(null);
    };

    const handleGenerateAIReport = async () => {
        if (!activeRoom || isGeneratingReport) return;

        setIsGeneratingReport(true);
        setIsReportModalOpen(false);
        try {
            const response = await fetch('/api/knowledge/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chatLog: activeRoom.chatLog,
                    roomTitle: activeRoom.title,
                    roomDescription: activeRoom.description,
                    templateType: selectedTemplate,
                    customInstruction: customInstruction
                })
            });

            const data = await response.json();
            if (data.report) {
                const aiMsg = {
                    sender: "AI 분석관",
                    text: data.report,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    color: "#10B981",
                    userId: "system-ai"
                };
                addMessageToRoom(activeRoom.id, aiMsg);
                // Sync AI msg too
                await fetch('/api/war-room/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId: activeRoom.id, message: aiMsg })
                });
            }
        } catch (error) {
            alert("보고서 생성 중 오류가 발생했습니다.");
        } finally {
            setIsGeneratingReport(false);
            setCustomInstruction("");
        }
    };

    const handleSmsShare = () => {
        if (!activeRoom) return;

        const message = `[AIOps 긴급 호출]\n- 워룸: ${activeRoom.title}\n- 발생: ${activeRoom.time}\n- 위험도: ${activeRoom.level === 'danger' ? 'CRITICAL' : 'WARNING'}\n\n즉시 아래 링크로 웹 워룸에 접속바랍니다.\n▶ ${window.location.href}`;
        
        // Universal SMS URL Scheme
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        let smsUrl = `sms:?body=${encodeURIComponent(message)}`;
        
        // iOS Safari specifics
        if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
            smsUrl = `sms:&body=${encodeURIComponent(message)}`;
        }
        
        window.location.href = smsUrl;
        
        // 공유버튼 클릭 시 로깅 남기기
        handleSendMessage(undefined, "SMS(문자 메시지)로 워룸 호출 방을 공유했습니다.", "시스템 봇", "system");
    };

    // --- PPT Export (Clean Style) ---
    const downloadPPT = async (text: string) => {
        const pres = new pptxgen();
        pres.layout = 'LAYOUT_16x9';

        pres.defineSlideMaster({
            title: 'MASTER_SLIDE',
            background: { color: 'F8FAFC' },
            objects: [
                { rect: { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: '1E293B' } } },
                { text: { text: "AIOPS INCIDENT REPORT", options: { x: 0.4, y: 0.15, w: 4, h: 0.3, color: '10B981', fontSize: 12, bold: true, fontFace: 'Malgun Gothic' } } },
                { rect: { x: 0, y: 5.3, w: '100%', h: 0.35, fill: { color: 'F1F5F9' } } },
                { text: { text: "신한 인프라 관리팀 / 본 문서는 대외비입니다", options: { x: 0.4, y: 5.35, w: 5, h: 0.2, color: '94A3B8', fontSize: 8, fontFace: 'Malgun Gothic' } } },
                { placeholder: { options: { name: 'pageNum', type: 'sldNum' as any, x: 9.2, y: 5.35, w: 0.4, h: 0.2, fontSize: 10, color: '64748B', align: 'right' }, text: '1' } }
            ]
        });

        let cover = pres.addSlide();
        cover.background = { color: '1E293B' };
        cover.addShape(pres.ShapeType.rect, { x: 0, y: '40%', w: '100%', h: '30%', fill: { color: '10B981' } });
        cover.addText("장애 상세 분석 보고서", { x: 0, y: '42%', w: '100%', h: 0.8, fontSize: 44, color: 'FFFFFF', align: 'center', bold: true, fontFace: 'Malgun Gothic' });
        cover.addText(activeRoom?.title || "Incident Report", { x: 0, y: '52%', w: '100%', h: 0.5, fontSize: 24, color: '1E293B', align: 'center', fontFace: 'Malgun Gothic' });

        const summarySlide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
        summarySlide.addText("인시던트 대응 요약", { x: 0.4, y: 0.8, w: 9, h: 0.5, fontSize: 24, color: '1E293B', bold: true, fontFace: 'Malgun Gothic' });
        
        const summaryData = [
            { title: "■ 인지 채널", val: "시스템 모니터링 알람 (자동 접수)" },
            { title: "■ 영향 범위", val: "대외 서비스 가용성 저하 (전체)" },
            { title: "■ 장애 등급", val: activeRoom?.level === 'danger' ? "CRITICAL (L1)" : "WARNING (L2)" },
            { title: "■ 현재 상태", val: "조치 완료 및 모니터링 중" }
        ];

        let startY = 1.6;
        summaryData.forEach((item) => {
            summarySlide.addText(item.title, { x: 0.8, y: startY, w: 2, h: 0.4, fontSize: 16, bold: true, color: '64748B', fontFace: 'Malgun Gothic' });
            summarySlide.addText(item.val, { x: 2.8, y: startY, w: 6, h: 0.4, fontSize: 16, color: '1E293B', fontFace: 'Malgun Gothic' });
            startY += 0.6;
        });

        const sections = text.split(/(?=^1\. |^2\. |^3\. |^4\. |^5\. |^# |^## )/m);
        sections.forEach((section) => {
            if (!section.trim()) return;
            const lines = section.split('\n');
            const titleText = lines[0].replace(/[#\d\.]/g, '').trim() || "상세 분석 내용";
            const bodyLinesRaw = lines.slice(1).filter(l => l.trim() !== "");

            for (let i = 0; i < bodyLinesRaw.length; i += 7) {
                let slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
                const currentBodyLines = bodyLinesRaw.slice(i, i + 7);
                slide.addText(titleText + (i > 0 ? " (계속)" : ""), { x: 0.5, y: 0.7, w: 8, h: 0.5, fontSize: 22, color: '10B981', bold: true, fontFace: 'Malgun Gothic' });
                slide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.2, w: 9, h: 0, line: { color: 'E2E8F0', width: 1 } });

                let currentY = 1.5;
                currentBodyLines.forEach(line => {
                    slide.addText(line.replace(/==/g, '').trim(), { 
                        x: 0.7, y: currentY, w: 8.8, h: 0.4, 
                        fontSize: 13, color: '334155', fontFace: 'Malgun Gothic',
                        bullet: { code: '2022' }
                    });
                    currentY += 0.45;
                });
            }
        });

        let endSlide = pres.addSlide();
        endSlide.background = { color: '1E293B' };
        endSlide.addText("보고서 종료", { x: 0, y: '45%', w: '100%', h: 1, fontSize: 32, color: 'FFFFFF', align: 'center', bold: true, fontFace: 'Malgun Gothic' });

        pres.writeFile({ fileName: `Incident_Report_${activeRoomId}.pptx` });
    };

    const downloadWord = async (text: string) => {
        const doc = new Document({
            sections: [{
                children: [
                    new Paragraph({ text: "장애 분석 보고서", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
                    ...text.split('\n').map(line => new Paragraph({ 
                        children: [new TextRun({ text: line.replace(/==/g, ''), size: 22 })],
                        spacing: { before: 120 }
                    }))
                ]
            }]
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `Report_${activeRoomId}.docx`);
    };

    return (
        <div className="w-full h-full flex flex-col lg:flex-row gap-6 pb-6 relative" style={{ minHeight: "calc(100vh - 120px)" }}>
            {/* Sidebar: War Rooms & Participants */}
            <div className={`w-full ${activeRoomId ? 'lg:w-1/4' : 'lg:w-1/3'} transition-all flex flex-col gap-6`}>
                {/* War Rooms */}
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 overflow-y-auto max-h-[400px]">
                    <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4 uppercase tracking-widest">
                        <Activity className="text-emerald-500 w-5 h-5" /> War Rooms
                    </h2>
                    <div className="space-y-3">
                        {warRooms.map(room => (
                            <div
                                key={room.id}
                                onClick={() => setActiveRoomId(room.id)}
                                className={`relative p-4 rounded-xl border cursor-pointer transition-all ${activeRoomId === room.id ? 'bg-slate-700 border-emerald-500/50 shadow-lg' : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'}`}
                            >
                                <div className="flex justify-between items-start mb-2 text-left">
                                    <span className={`px-2 py-0.5 text-[9px] font-black rounded-md uppercase ${room.level === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                        {room.level === 'danger' ? 'CRITICAL' : 'INFO'}
                                    </span>
                                    <span className="pr-6 text-[10px] text-slate-500 font-mono">{room.time}</span>
                                </div>
                                <h3 className="text-slate-200 font-bold text-sm text-left pr-4">{room.title}</h3>
                                {currentUser?.role === 'admin' && (
                                    <button
                                        onClick={(e) => handleDeleteRoom(e, room.id)}
                                        className="absolute top-3 right-3 p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors z-20"
                                        title="워룸 삭제"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Participants List */}
                {activeRoomId && (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex-1">
                        <h2 className="text-lg font-black text-white flex items-center gap-2 mb-4 uppercase tracking-widest">
                            <Users className="text-blue-500 w-5 h-5" /> Active Team
                        </h2>
                        <div className="space-y-3">
                            {participants.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-inner" style={{ backgroundColor: u.color }}>
                                                {u.name.substring(0, 1)}
                                            </div>
                                            <Circle className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 fill-current ${u.status === 'online' ? 'text-emerald-500' : 'text-slate-600'} border-2 border-slate-800`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-bold text-slate-200">{u.name}</p>
                                            <p className="text-[9px] text-slate-500 uppercase font-black">{u.role}</p>
                                        </div>
                                    </div>
                                    {u.id === currentUser?.id && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-black uppercase">Me</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Chat Area */}
            {activeRoomId && activeRoom ? (
                <div className="w-full lg:flex-1 bg-slate-800 border border-slate-700 rounded-2xl flex flex-col h-[600px] lg:h-full relative overflow-hidden shadow-2xl">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3 text-left">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm tracking-tight">{activeRoom.title}</h3>
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">Live Syncing Enabled</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleSmsShare}
                                className="px-3 py-1.5 flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                                <MessageSquareShare className="w-3.5 h-3.5" />
                                SMS 초대
                            </button>
                            <button 
                                onClick={handleLeaveRoom} 
                                className="px-3 py-1.5 flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-bold transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                나가기
                            </button>
                            <button 
                                onClick={() => setActiveRoomId(null)} 
                                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                                title="창 닫기 (채팅방 유지)"
                            >
                                <X className="w-5 h-5 text-slate-400"/>
                            </button>
                        </div>
                    </div>

                    <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-900/60 custom-scrollbar text-left">
                        {activeRoom.chatLog.map((log) => {
                            // 본인 식별 로직: ID 기반 최우선 매칭 (AI 봇 등은 확실히 좌측에 등장하도록)
                            const isMe = log.userId ? log.userId === currentUser?.id : log.sender === currentUser?.name;
                            const isAI = log.sender === 'AI 분석관' || log.sender === '시스템 봇';

                            return (
                                <div key={log.id || Math.random().toString()} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`flex flex-col gap-1.5 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                        {/* Name and Time */}
                                        <div className={`flex items-center gap-2 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${isAI ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                {log.sender}
                                            </span>
                                            <span className="text-[9px] font-mono text-slate-600">{log.time}</span>
                                        </div>

                                        {/* Message Bubble */}
                                        <div className="flex gap-2 items-end group">
                                            {!isMe && !isAI && (
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 shadow-lg mb-1" style={{ backgroundColor: log.color || '#475569' }}>
                                                    {log.sender.substring(0, 1)}
                                                </div>
                                            )}
                                            
                                            <div className={`relative rounded-2xl p-4 shadow-xl transition-all duration-300 ${
                                                isMe ? 'bg-blue-600 text-white rounded-tr-none' : 
                                                isAI ? 'bg-slate-800 border border-emerald-500/30 text-white rounded-tl-none ring-1 ring-emerald-500/20' : 
                                                'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-none'
                                            }`}>
                                                <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                                                    {log.text}
                                                </div>
                                                
                                                {isAI && (
                                                    <div className="mt-4 flex gap-2 border-t border-slate-700 pt-3">
                                                        <button onClick={() => downloadWord(log.text)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded-lg text-[10px] font-bold transition-all border border-slate-700">
                                                            <Download className="w-3 h-3" /> Word
                                                        </button>
                                                        <button onClick={() => downloadPPT(log.text)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all shadow-lg active:scale-95">
                                                            <Download className="w-3 h-3" /> PPT
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isGeneratingReport && (
                            <div className="flex justify-start">
                                <div className="bg-slate-800/80 border border-emerald-500/30 text-emerald-400 rounded-xl rounded-tl-none p-4 flex items-center gap-3">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-xs font-bold uppercase tracking-widest pulse">AI Analysis Agent Working...</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Chat Input & Actions */}
                    <div className="p-4 border-t border-slate-700 bg-slate-800/80">
                        {/* Sender Switcher for Testing (Optional but keeping for easy 1-tab testing) */}
                        <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap mr-1">발신 신분:</span>
                            {participants.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedSenderId(p.id)}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                                        (selectedSenderId || currentUser?.id) === p.id 
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                        : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                    {p.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-2 mb-3">
                            <button 
                                onClick={() => { setIsReportModalOpen(true); setReportStep(1); }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95"
                            >
                                <Sparkles className="w-4 h-4" />
                                장애 보고서 생성
                            </button>
                        </div>
                        <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-3">
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                                placeholder={`${(users.find(u => u.id === (selectedSenderId || currentUser?.id))?.name || currentUser?.name)}님, 작전 상황을 공유하세요...`}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 resize-none h-14 custom-scrollbar shadow-inner"
                            />
                            <button type="submit" disabled={!message.trim()} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white px-7 rounded-2xl font-black transition-all active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-900/20">
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 bg-slate-800/20 border border-slate-700 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-600">
                    <UserCircle2 className="w-16 h-16 opacity-10 mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">Please select an operational War Room to join</p>
                </div>
            )}

            {/* Reporting Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200 text-left">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <BarChart3 className="text-emerald-400 w-7 h-7" /> 보고서 생성 센터
                                </h3>
                                <p className="text-[10px] text-slate-500 mt-1.5 uppercase font-bold tracking-[0.2em]">Premium Incident Reporting Engine</p>
                            </div>
                            <button onClick={() => setIsReportModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {reportStep === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {templates.map(t => (
                                        <div 
                                            key={t.id}
                                            onClick={() => { setSelectedTemplate(t.id); setReportStep(2); }}
                                            className="p-6 bg-slate-800/20 hover:bg-emerald-500/10 border border-slate-800 hover:border-emerald-500/50 rounded-3xl cursor-pointer transition-all flex flex-col gap-5 group"
                                        >
                                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                                                {t.icon}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-100 text-lg mb-1">{t.name}</h4>
                                                <p className="text-xs text-slate-500 leading-relaxed font-medium">{t.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {reportStep === 2 && (
                                <div className="space-y-8 py-4">
                                    <div className="flex items-center gap-5 p-6 bg-slate-800/40 rounded-3xl border border-slate-800 shadow-inner">
                                        <div className="p-3 bg-slate-900 rounded-2xl shadow-md">{currentTemplateObj.icon}</div>
                                        <div>
                                            <p className="text-[11px] text-emerald-500 font-black uppercase tracking-widest mb-1">SELECTED TEMPLATE</p>
                                            <p className="text-xl font-black text-white">{currentTemplateObj.name}</p>
                                        </div>
                                    </div>

                                    {selectedTemplate === 'custom' ? (
                                        <div className="space-y-5 animate-in slide-in-from-bottom-4">
                                            <textarea 
                                                value={customInstruction}
                                                onChange={(e) => setCustomInstruction(e.target.value)}
                                                className="w-full h-44 bg-slate-950 border border-slate-800 rounded-[24px] p-6 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40 shadow-inner"
                                                placeholder="예: '네트워크 트래픽 급증 원인과 ISP 조치 사항 위주로 작성해줘'..."
                                            />
                                            <button onClick={handleGenerateAIReport} className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-[20px] font-black text-base transition-all shadow-xl shadow-emerald-900/20 active:scale-95">보고서 생성 시작</button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in slide-in-from-bottom-4">
                                            <button onClick={handleGenerateAIReport} className="h-48 rounded-[32px] bg-slate-800/20 border-2 border-dashed border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 flex flex-col items-center justify-center gap-5 transition-all group">
                                                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg">
                                                    <Sparkles className="w-8 h-8 text-emerald-400" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="block font-black text-slate-100 text-lg">AI 자동 생성</span>
                                                </div>
                                            </button>
                                            <button onClick={() => { setManualReportContent(currentTemplateObj.content); setReportStep(3); }} className="h-48 rounded-[32px] bg-slate-800/20 border-2 border-dashed border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 flex flex-col items-center justify-center gap-5 transition-all group">
                                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg">
                                                    <LayoutTemplate className="w-8 h-8 text-blue-400" />
                                                </div>
                                                <div className="text-center">
                                                    <span className="block font-black text-slate-100 text-lg">템플릿 수동 작성</span>
                                                </div>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {reportStep === 3 && (
                                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                                    <textarea
                                        value={manualReportContent}
                                        onChange={(e) => setManualReportContent(e.target.value)}
                                        className="w-full h-80 bg-slate-950 border border-slate-800 rounded-[28px] p-8 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/40 custom-scrollbar leading-relaxed shadow-inner"
                                    />
                                    <div className="flex gap-4 justify-end">
                                        <button onClick={() => setReportStep(2)} className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl font-black transition-all text-xs">BACK</button>
                                        <button onClick={() => { handleSendMessage(undefined, manualReportContent); setIsReportModalOpen(false); }} className="px-12 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-2xl font-black text-xs transition-all shadow-xl active:scale-95">전송 완료</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
