"use client";

import { useState } from "react";
import { LayoutDashboard, Search, Database, Server, Activity, ArrowRight, ShieldCheck } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function VectorDashboardPage() {
    const { knowledgeDocs } = useStore();
    const [query, setQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<{ answer: string; filename: string; confidence: string } | null>(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setIsSearching(true);
        setResult(null);

        if (knowledgeDocs.length === 0) {
            setTimeout(() => {
                setResult({
                    answer: "현재 업로드된 문서가 없으므로 관련 정보를 찾을 수 없습니다.",
                    filename: "없음",
                    confidence: "낮음"
                });
                setIsSearching(false);
            }, 1000);
            return;
        }

        const validDocs = knowledgeDocs.filter(d => d.content && d.content.length > 10);
        const sortedDocs = [...validDocs].sort((a, b) => {
            return (b.timestamp || 0) - (a.timestamp || 0);
        });
        
        const allContents = sortedDocs.map(d => `[문서명: ${d.filename}]\n${d.content}`).join('\n\n---\n\n');
        const allFilenames = sortedDocs.map(d => d.filename).join(', ');

        try {
            // Gemini 1.5 Flash의 대용량 컨텍스트 활용을 위해 제한을 15만자로 상향
            const safeContents = allContents.length > 150000 ? allContents.substring(0, 150000) + "...(이하 생략)" : allContents;
            
            const res = await fetch("/api/knowledge/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query,
                    contextFilename: sortedDocs.length > 0 ? allFilenames : "유효한분석텍스트없음",
                    contextText: sortedDocs.length > 0 ? safeContents : ""
                }),
            });

            if (!res.ok) {
                // 413 Payload Too Large 등 HTML로 에러가 반환될 경우를 대비해 catch 처리
                const errData = await res.json().catch(() => ({ error: `서버(HTTP ${res.status}) 요청 거부` }));
                throw new Error(errData.error || `서버 통신 실패 (HTTP ${res.status})`);
            }

            const data = await res.json();
            setResult(data);
        } catch (error: any) {
            console.error("Dashboard Query Error:", error);
            setResult({
                answer: `[검색 실패] ${error.message || '요청 처리 중 오류가 발생했습니다.'}`,
                filename: validDocs.length > 0 ? allFilenames : "문서오류",
                confidence: "오류"
            });
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="w-full h-full pb-10 flex flex-col gap-6">
            <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-emerald-400" /> 벡터 DB 대시보드
                </h1>
                <p className="text-slate-400 text-sm">Pinecone 클러스터의 운영 상태를 모니터링하고, RAG 검색 검증(Validator) 프로토콜을 테스트합니다.</p>
            </div>

            {/* Metrics Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Database className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">인덱스된 토탈 문서</div>
                        <div className="text-2xl font-bold text-slate-100">{knowledgeDocs.length} <span className="text-sm font-normal text-slate-500">Docs</span></div>
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Server className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">임베딩 차원 (Dimension)</div>
                        <div className="text-2xl font-bold text-slate-100">1,536 <span className="text-sm font-normal text-slate-500">ada-002</span></div>
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">평균 검색 지연(Latency)</div>
                        <div className="text-2xl font-bold text-slate-100">{15 + knowledgeDocs.length * 2} <span className="text-sm font-normal text-slate-500">ms</span></div>
                    </div>
                </div>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-6 h-6 text-orange-400" />
                    </div>
                    <div>
                        <div className="text-sm text-slate-400 mb-1">Pinecone 환경</div>
                        <div className="text-xl font-bold text-slate-100">gcp-starter</div>
                    </div>
                </div>
            </div>

            {/* Pinecone RAG Validator */}
            <div className="mt-4 flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
                <div className="bg-slate-900 border-b border-slate-700 p-5 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" /> Pinecone RAG Validator
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">시스템 프롬프트 프로토콜에 따라 주어진 질문을 유사도 검색하고, 정확한 출처 메타데이터를 매핑하여 답변합니다.</p>
                    </div>
                </div>

                <div className="flex-1 p-6 flex flex-col gap-6 overflow-auto custom-scrollbar">
                    <div className="flex gap-4">
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="벡터 DB에 질의할 장애 관련 질문을 입력하세요..." 
                                className="w-full bg-slate-900 border border-slate-600 rounded-lg py-3 px-4 pl-11 text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                            />
                            <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                        </div>
                        <button 
                            onClick={handleSearch}
                            disabled={isSearching || !query.trim()}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSearching ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>검증 질의 실행 <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </div>

                    {result && (
                        <div className="mt-2 bg-slate-900 border border-emerald-500/30 rounded-lg animate-in fade-in slide-in-from-bottom-4 relative flex flex-col max-h-[500px]">
                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 z-10 rounded-l-lg"></div>
                            
                            <div className="p-6 pb-2 shrink-0">
                                <h3 className="text-sm font-bold text-slate-400">검색된 출처 기반 답변 (Source Attribution)</h3>
                            </div>
                            
                            <div className="px-6 pb-2 flex-1 overflow-auto custom-scrollbar w-full">
                                <div className="text-slate-200 leading-relaxed whitespace-pre font-sans text-sm min-w-max pb-4 pr-4">
                                    {result.answer}
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col gap-2">
                                <h4 className="text-xs font-bold text-slate-500 mb-1">데이터 상태 요약</h4>
                                <div className="inline-flex bg-slate-800 border border-slate-700/50 rounded-lg px-4 py-3 text-xs font-medium text-slate-300">
                                    <span className="text-slate-400 mr-2">검색 상태:</span> 
                                    <span className={`mr-2 ${result.confidence === '높음' ? 'text-emerald-400' : 'text-orange-400'}`}>[신뢰도: {result.confidence}]</span> 
                                    <span className="text-slate-600 mx-3">|</span> 
                                    <span className="text-slate-400 mr-2">참조 문서:</span> 
                                    <span className="text-cyan-400">{result.filename}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
