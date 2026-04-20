"use client";

import { useStore } from "@/store/useStore";
import { History, CalendarClock, Server, FileText } from "lucide-react";

export default function HistoryPage() {
    const { analysisHistory } = useStore();

    return (
        <div className="w-full h-full pb-10 flex flex-col gap-6">
            <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1 flex items-center gap-2">
                    <History className="w-6 h-6 text-emerald-400" /> 장애 분석 히스토리
                </h1>
                <p className="text-slate-400 text-sm">과거 수행했던 LLM 장애 분석 기록을 실시간으로 조회합니다.</p>
            </div>

            <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-hidden flex flex-col">
                <div className="overflow-y-auto custom-scrollbar pr-2 flex-1">
                    {analysisHistory.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500">
                            <FileText className="w-16 h-16 mb-4 opacity-20" />
                            <p>아직 저장된 분석 히스토리가 없습니다.</p>
                            <p className="text-xs mt-2">장애 분석 메뉴에서 로그를 분석하면 이곳에 기록됩니다.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {analysisHistory.map((item) => (
                                <div key={item.id} className="bg-slate-900 border border-slate-700 p-5 rounded-xl hover:border-slate-500 transition-colors group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 text-slate-400 text-sm">
                                                <CalendarClock className="w-4 h-4 text-emerald-500/70" />
                                                <span>{item.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300 font-semibold bg-slate-800 border border-slate-700 px-3 py-1 rounded-lg">
                                                <Server className="w-4 h-4 text-indigo-400" />
                                                <span>{item.equipmentName}</span>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-slate-400 bg-slate-800/50 px-3 py-1 rounded-lg">
                                            증상 설명: <span className="text-emerald-400">{item.shortDescription}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-slate-400 text-sm font-semibold flex items-center gap-2">
                                            요약:
                                        </p>
                                        <p className="text-slate-300 text-sm bg-slate-800/30 p-3 rounded-lg border border-slate-800/50">{item.summary}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
