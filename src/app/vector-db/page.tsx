"use client";

import { Network, Database, Cpu, HardDrive } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { useStore } from "@/store/useStore";

export default function VectorDBPage() {
    const { knowledgeDocs } = useStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 이름 기반 최신 문서로 중복 제거 연산
    const uniqueDocs = useMemo(() => {
        const docMap = new Map();
        knowledgeDocs.forEach(doc => {
            if (!docMap.has(doc.filename)) {
                docMap.set(doc.filename, doc); // 가장 최근 것(배열의 앞쪽)을 보존
            }
        });
        return Array.from(docMap.values());
    }, [knowledgeDocs]);

    // 실제 컨텍스트 크기에 비례하는 메모리와 지연율 연산
    const { totalMemoryStr, memoryPercent, avgLatency } = useMemo(() => {
        // (한 글자당 평균 3바이트 추정)
        const textBytes = uniqueDocs.reduce((acc, doc) => acc + (doc.content?.length || 0) * 3, 0); 
        
        // 메모리 백분율 (시뮬레이션: 1GB가 100%라고 가정)
        const percent = Math.min(99, 12 + (textBytes / (1024 * 1024 * 100)) * 100);

        let memStr = textBytes + " B";
        if (textBytes > 1024 * 1024) memStr = (textBytes / (1024 * 1024)).toFixed(2) + " MB";
        else if (textBytes > 1024) memStr = (textBytes / 1024).toFixed(1) + " KB";
        if (textBytes === 0) memStr = "0 KB";

        // 문서 수와 바이트에 비례하는 검색 지연 (기본 32ms)
        const latency = 32 + (uniqueDocs.length * 5) + (textBytes / 500000);

        return { 
            totalMemoryStr: memStr, 
            memoryPercent: percent,
            avgLatency: textBytes === 0 ? "0" : latency.toFixed(1) 
        };
    }, [uniqueDocs]);

    // 문서 개별로 벡터 클러스터(군집)을 가상 매핑
    const clusters = useMemo(() => {
        return uniqueDocs.map((doc, index) => {
            const isNew = index === 0; 
            // 텍스트 길이에 비례해 청크 시각화 (1,000자당 1노드, 최소 3개, 최대 24개)
            const textLen = doc.content?.length || 0;
            const nodeCount = textLen > 0 ? Math.max(3, Math.min(24, Math.ceil(textLen / 1000))) : 8;
            
            // 궤도(Orbit) 링 계산 (중심으로부터 20%, 32%, 44%)
            const radius = 20 + (index % 3) * 12;
            // 궤도 내에서의 각도 (겹치지 않도록 분산)
            const angle = (index / Math.max(1, uniqueDocs.length)) * Math.PI * 2;
            
            const clusterTop = 50 + Math.sin(angle) * radius;
            const clusterLeft = 50 + Math.cos(angle) * radius;
            
            return {
                ...doc,
                isNew,
                radius,
                clusterTop,
                clusterLeft,
                nodes: Array.from({ length: nodeCount }).map((_, i) => {
                    const subAngle = (i / nodeCount) * Math.PI * 2;
                    const subRadius = 38 + Math.random() * 5; // 위성 노드 궤도 반경 (px)
                    return {
                        id: i,
                        size: Math.random() * 4 + 4, // 4px ~ 8px
                        top: Math.sin(subAngle) * subRadius,
                        left: Math.cos(subAngle) * subRadius,
                        opacity: Math.random() * 0.5 + 0.5,
                        duration: Math.random() * 4 + 2,
                    };
                })
            };
        });
    }, [uniqueDocs]);

    if (!mounted) return null;

    return (
        <div className="w-full h-full pb-10 flex flex-col gap-6 relative">
            <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <Network className="w-6 h-6 text-emerald-400" /> 벡터 DB 시각화
                </h1>
                <p className="text-slate-400 text-sm">지식 창고에 적재된 각 문서들이 의미론적 벡터(Vector) 노드로 어떻게 매핑되어 있는지 시각화합니다.</p>
            </div>

            <div className="flex flex-col xl:flex-row gap-6 h-[600px]">
                {/* 메인 뷰어 (행성계 궤도 UI) */}
                <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden relative flex items-center justify-center">
                    {/* 우주/은하계 배경 효과 */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-90"></div>
                    
                    {/* SVG 궤도 링 및 중심 연결선 */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {/* 궤도 링 (Orbit Tracks) */}
                        <circle cx="50%" cy="50%" r="20%" fill="none" stroke="rgba(16,185,129,0.15)" strokeWidth="1" strokeDasharray="4 6" />
                        <circle cx="50%" cy="50%" r="32%" fill="none" stroke="rgba(16,185,129,0.08)" strokeWidth="1" strokeDasharray="4 6" />
                        <circle cx="50%" cy="50%" r="44%" fill="none" stroke="rgba(16,185,129,0.04)" strokeWidth="1" strokeDasharray="4 6" />

                        {/* 문서 중심 좌표선 */}
                        {clusters.map(cluster => (
                            <line 
                                key={`line-${cluster.id}`}
                                x1="50%" 
                                y1="50%" 
                                x2={`${cluster.clusterLeft}%`} 
                                y2={`${cluster.clusterTop}%`} 
                                stroke={cluster.isNew ? "rgba(34,211,238,0.4)" : "rgba(16,185,129,0.2)"} 
                                strokeWidth={cluster.isNew ? "1.5" : "1"} 
                                strokeDasharray={cluster.isNew ? "none" : "2 3"}
                            />
                        ))}
                    </svg>

                    {/* 중앙 코어 노드 (Pinecone DB) */}
                    <div className="absolute z-20 w-32 h-32 bg-slate-900/80 backdrop-blur-md rounded-full border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.4)] flex flex-col items-center justify-center top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite]">
                        <Database className="w-10 h-10 text-emerald-400 mb-1 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                        <span className="text-emerald-400 font-bold text-sm tracking-wider">Pinecone DB</span>
                        <span className="text-slate-400 text-[10px] mt-0.5">V: 1,536 Dimensional</span>
                        {/* 코어 자체 회전 링 애니메이션 */}
                        <div className="absolute inset-[-10px] rounded-full border border-emerald-500/30 border-t-emerald-400 animate-[spin_8s_linear_infinite]"></div>
                        <div className="absolute inset-[-20px] rounded-full border border-emerald-500/10 border-b-emerald-300 animate-[spin_12s_linear_infinite_reverse]"></div>
                    </div>

                    {/* 문서 군집 (위성 구조체) */}
                    {clusters.map((cluster) => (
                        <div key={cluster.id} className="absolute z-10" style={{ top: `${cluster.clusterTop}%`, left: `${cluster.clusterLeft}%` }}>
                            {/* 문서 코어 (행성) */}
                            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center shadow-[0_0_20px_currentColor] z-20 ${cluster.isNew ? 'bg-cyan-900 border-2 border-cyan-400 text-cyan-400' : 'bg-slate-800 border-2 border-emerald-500/70 text-emerald-400'}`}>
                                <HardDrive className="w-5 h-5 drop-shadow-lg" />
                            </div>

                            {/* 레이블 */}
                            <div className={`absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold z-30 transition-all backdrop-blur-md ${cluster.isNew ? 'bg-cyan-900/70 border border-cyan-400/50 text-cyan-50 shadow-[0_0_20px_rgba(34,211,238,0.5)]' : 'bg-slate-900/80 border border-slate-700/80 text-slate-300'}`}>
                                {cluster.filename}
                            </div>
                            
                            {/* 청크 서브노드 (위성 시각효과, 자전 애니메이션) */}
                            <div className={`absolute top-0 left-0 ${cluster.isNew ? 'animate-[spin_15s_linear_infinite]' : 'animate-[spin_25s_linear_infinite_reverse]'}`}>
                                {cluster.nodes.map((node: any) => (
                                    <div 
                                        key={node.id}
                                        className={`absolute rounded-full shadow-[0_0_10px_currentColor] ${cluster.isNew ? 'bg-cyan-300 text-cyan-400' : 'bg-emerald-400 text-emerald-500'}`}
                                        style={{
                                            width: `${node.size}px`,
                                            height: `${node.size}px`,
                                            transform: `translate(${node.left}px, ${node.top}px)`,
                                            opacity: node.opacity,
                                            animation: `pulse ${node.duration}s infinite`
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 상태 패널 */}
                <div className="w-full xl:w-80 flex flex-col gap-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shrink-0">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-emerald-400" /> 클러스터 상태
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>메모리 사용량 <span className="text-slate-500">({totalMemoryStr})</span></span>
                                    <span className="text-emerald-400">{memoryPercent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${Math.max(2, memoryPercent)}%` }}></div>
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between text-xs text-slate-400 mb-1">
                                    <span>검색 지연시간(Latency)</span>
                                    <span className="text-emerald-400">~{avgLatency}ms</span>
                                </div>
                                <div className="w-full bg-slate-900 rounded-full h-2">
                                    <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: '8%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-5 overflow-auto custom-scrollbar">
                        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-cyan-400" /> 벡터화된 데이터 ({uniqueDocs.length}건)
                        </h3>
                        <ul className="space-y-3">
                            {uniqueDocs.length > 0 ? (
                                uniqueDocs.map((doc, index) => {
                                    const isNew = index === 0;
                                    return (
                                        <li key={doc.id} className={`text-xs bg-slate-900 border p-3 rounded-lg transition-colors cursor-pointer group ${isNew ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]' : 'border-slate-700 hover:border-emerald-500/50'}`}>
                                            <div className={`font-semibold mb-1 ${isNew ? 'text-cyan-400' : 'text-slate-200 group-hover:text-emerald-400'}`}>{doc.filename}</div>
                                            <div className="flex justify-between items-center text-[10px] text-slate-500">
                                                <span>Sub-chunks: {Math.max(1, Math.ceil((doc.content?.length || 0) / 1000))}개</span>
                                                <span className={isNew ? 'text-cyan-500/80' : 'text-emerald-500/80'}>Dim: 1536</span>
                                            </div>
                                        </li>
                                    );
                                })
                            ) : (
                                <li className="text-xs text-slate-500 text-center py-4">인덱싱된 기초 데이터가 없습니다.</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
