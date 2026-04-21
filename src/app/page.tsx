"use client";

import { useState } from "react";
import { FileSearch, Terminal, CheckCircle2, AlertTriangle, Send, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useStore } from "@/store/useStore";

export default function LogAnalyzePage() {
  const router = useRouter();
  const { addWarRoom, setActiveRoomId, addAnalysis, knowledgeDocs, currentAnalysisDraft, updateAnalysisDraft, clearAnalysisDraft } = useStore();

  const { logText, equipmentName, shortDescription, category, result } = currentAnalysisDraft;

  const setLogText = (text: string | ((prev: string) => string)) => {
    updateAnalysisDraft({ logText: typeof text === 'function' ? text(logText) : text });
  };
  const setEquipmentName = (text: string) => updateAnalysisDraft({ equipmentName: text });
  const setShortDescription = (text: string) => updateAnalysisDraft({ shortDescription: text });
  const setCategory = (cat: string) => updateAnalysisDraft({ category: cat });
  const setResult = (res: any) => updateAnalysisDraft({ result: res });

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const categories = ["Network", "Server", "OS", "Software"];

  // 드래그 앤 드롭 방지 (브라우저 기본 동작 방지)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  // 텍스트/파일 드롭 처리
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type.startsWith('text/') || file.name.endsWith('.log') || file.name.endsWith('.txt')) {
        const text = await file.text();
        setLogText(prev => prev + (prev ? '\n' : '') + text);
      }
    } else {
      const text = e.dataTransfer.getData('text');
      if (text) {
        setLogText(prev => prev + (prev ? '\n' : '') + text);
      }
    }
  };

  // 클립보드 파일 붙여넣기 처리
  const handlePaste = async (e: React.ClipboardEvent) => {
    const file = e.clipboardData.files?.[0];
    if (file && (file.type.startsWith('text/') || file.name.endsWith('.log') || file.name.endsWith('.txt'))) {
      e.preventDefault();
      const text = await file.text();
      setLogText(prev => prev + (prev ? '\n' : '') + text);
    }
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logText.trim()) return;

    setIsAnalyzing(true);
    setResult(null);

    try {
      // RAG 연동: 지식 창고의 모든 유효한 문서 내용을 수집 (최신순 정렬 및 15만자 제한)
      const validDocs = knowledgeDocs.filter(d => d.content && d.content.length > 10);
      const sortedDocs = [...validDocs].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      const allKnowledge = sortedDocs.map(d => `[문서명: ${d.filename}]\n${d.content}`).join('\n\n---\n\n');
      const safeContext = allKnowledge.length > 150000 ? allKnowledge.substring(0, 150000) + "...(이하 생략)" : allKnowledge;

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          category, 
          shortDescription, 
          logText,
          contextText: validDocs.length > 0 ? safeContext : "" 
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '서버 응답 오류입니다.');
      }

      const parsedStatus = data.status === 'success' ? 'success' : 'danger';
      setResult({
        status: parsedStatus,
        summary: data.summary,
        rawResult: data.rawResult
      });

      // 히스토리 저장
      addAnalysis({
        id: Date.now().toString(),
        time: new Date().toLocaleString(),
        equipmentName: equipmentName || "장비명 미상",
        shortDescription: shortDescription || "설명 없음",
        summary: data.summary,
        rawResult: data.rawResult
      });
    } catch (error: any) {
      console.error(error);
      const errorMessage = typeof error === 'string' ? error : error.message;
      setResult({
        status: 'danger',
        summary: '분석 실패',
        rawResult: errorMessage
      });

      // 에러 발생 시에도 히스토리 저장
      addAnalysis({
        id: Date.now().toString(),
        time: new Date().toLocaleString(),
        equipmentName: equipmentName || "장비명 미상",
        shortDescription: shortDescription || "설명 없음",
        summary: '분석 실패',
        rawResult: errorMessage
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCreateWarRoom = async () => {
    if (!result) return;

    // 워룸 동적 생성
    const newRoomId = Date.now().toString();
    const newRoomName = `장애 대응 - ${equipmentName || '미상 장비'} (${category})`;

    const newRoom = {
      id: newRoomId,
      title: newRoomName,
      level: 'danger' as const,
      time: new Date().toLocaleTimeString(),
      description: result.summary,
      chatLog: [
        {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          sender: "시스템 봇",
          text: result.rawResult, // 시스템 최초 메시지 자동 삽입
          time: new Date().toLocaleTimeString(),
          userId: 'system-bot',
          color: '#10B981'
        }
      ]
    };

    addWarRoom(newRoom);

    try {
        // 방 메타데이터 서버에 동기화
        await fetch('/api/war-room/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ room: newRoom })
        });
        
        // 첫 시스템 메시지도 메시지 큐에 동기화
        await fetch('/api/war-room/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId: newRoomId, message: newRoom.chatLog[0] })
        });
    } catch (e) {
        console.error("Room sync failed", e);
    }

    // 즉시 라우팅 및 활성화
    setActiveRoomId(newRoomId);
    router.push("/war-room");
  };

  const formatText = (text: string) => {
    if (!text) return { __html: "" };
    let html = text
      .replace(/</g, "&lt;") // XSS 방지
      .replace(/>/g, "&gt;")
      .replace(/==(.*?)==/g, '<mark class="bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]">$1</mark>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-emerald-400 font-bold">$1</strong>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-pink-400 px-1.5 py-0.5 rounded font-mono text-[0.9em] border border-slate-700">$1</code>');
    return { __html: html };
  };

  return (
    <div className="w-full h-full pb-10 flex flex-col xl:flex-row gap-6">
      {/* Input Section */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="mb-2 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-1">장애 로그 분석기</h1>
            <p className="text-slate-400 text-sm">LLM 및 사내 지식(RAG) 기반의 실시간 장애 로그 분석 시스템</p>
          </div>
          <button 
            type="button"
            onClick={clearAnalysisDraft}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 transition-colors shadow-sm active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 신규 분석 (초기화)
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex flex-col flex-1 h-full min-h-[500px]">
          {/* Category Toggle */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-300 block mb-2">카테고리 선택</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${category === cat
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment Name */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-300 block mb-2">장비명</label>
            <input
              type="text"
              required
              value={equipmentName}
              onChange={(e) => setEquipmentName(e.target.value)}
              placeholder="분석 대상 장비명을 입력하세요 (예: WEB-SERVER-01)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
          </div>

          {/* Short Description */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-slate-300 block mb-2">장애 간단 설명</label>
            <input
              type="text"
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="발생한 장애에 대한 간단한 설명을 입력하세요 (예: 결제 API 타임아웃 발생)"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-300 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
          </div>

          {/* Log Textarea */}
          <div className="flex-1 flex flex-col mb-4 relative">
            <label className="text-sm font-semibold text-slate-300 block mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> 로그 원문 (드래그 앤 드롭 또는 붙여넣기)
            </label>
            <textarea
              required
              value={logText}
              onChange={(e) => setLogText(e.target.value)}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onPaste={handlePaste}
              placeholder="텍스트 파일을 여기에 끌어놓거나 로그 텍스트를 복사해서 붙여넣어 주세요... (예: Error: eth0 link down, CPU Load Average: 12.5)"
              className={`flex-1 w-full bg-slate-900 border rounded-lg p-4 text-slate-300 font-mono text-sm focus:outline-none focus:ring-1 transition-all resize-none ${dragActive ? 'border-emerald-500/50 ring-emerald-500/50 bg-slate-800/80 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'border-slate-700 ring-transparent'
                }`}
            />
            {dragActive && (
              <div className="absolute inset-0 top-[32px] bg-emerald-500/10 border-2 border-emerald-500/50 border-dashed rounded-lg flex items-center justify-center pointer-events-none">
                <span className="text-emerald-400 font-bold bg-slate-900/80 px-4 py-2 rounded-lg backdrop-blur-sm">파일을 놓아서 로그 추가하기</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !logText.trim()}
            className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            {isAnalyzing ? (
              <span className="animate-pulse flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                분석 중...
              </span>
            ) : (
              <>
                <FileSearch className="w-5 h-5" /> 분석 시작
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Section */}
      <div className="flex-1 flex flex-col pt-[72px]">
        {isAnalyzing ? (
          <div className="bg-slate-800/50 border border-slate-700 border-dashed rounded-xl p-5 flex flex-col items-center justify-center flex-1 text-emerald-500/50 transition-all">
            <div className="w-16 h-16 rounded-full border-t-4 border-b-4 border-emerald-500 animate-spin mb-4" />
            <p className="animate-pulse font-medium text-emerald-400">LLM 분석 및 지식 베이스(KMS) 교차 검증 중...</p>
          </div>
        ) : result ? (
          <div className={`bg-slate-800 border rounded-xl p-6 flex-1 flex flex-col shadow-2xl relative overflow-hidden transition-all ${result.status === 'danger' ? 'border-red-500/50' : 'border-emerald-500/50'
            }`}>
            <div className={`absolute top-0 left-0 w-full h-1 flex-shrink-0 ${result.status === 'danger' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]'}`} />

            <div className="flex items-center gap-3 mb-6 flex-shrink-0">
              {result.status === 'danger' ? (
                <AlertTriangle className="w-8 h-8 text-red-500" />
              ) : (
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              )}
              <h2 className={`text-xl font-bold ${result.status === 'danger' ? 'text-red-400' : 'text-emerald-400'}`}>
                {result.summary}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wide">LLM 분석 결과 (RAG 연동)</h3>
                <div
                  className="bg-slate-900 border border-slate-700 rounded-lg p-5 text-slate-200 leading-relaxed font-medium whitespace-pre-wrap break-all overflow-x-hidden"
                  dangerouslySetInnerHTML={formatText(result.rawResult)}
                />
              </div>
            </div>

            <button
              onClick={handleCreateWarRoom}
              className="mt-8 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors focus:ring-4 focus:ring-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
            >
              <Send className="w-4 h-4" /> 협업 워룸 개설 및 이동
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700 border-dashed rounded-xl p-5 flex flex-col items-center justify-center flex-1 text-slate-500">
            <Terminal className="w-16 h-16 mb-4 opacity-20" />
            <p>로그를 카테고리에 맞춰 입력 후 '분석 시작'을 눌러주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}
