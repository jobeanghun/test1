"use client";

import { useStore } from "@/store/useStore";
import { History, CalendarClock, Server, FileText, PieChart as PieChartIcon, BarChart2 } from "lucide-react";
import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function HistoryPage() {
    const { analysisHistory } = useStore();

    // 통계 데이터 가공
    const stats = useMemo(() => {
        const eqCount: Record<string, number> = {};
        const catCount: Record<string, number> = {};

        analysisHistory.forEach(item => {
            const eq = item.equipmentName || 'Unknown';
            const cat = item.category || '기타';
            eqCount[eq] = (eqCount[eq] || 0) + 1;
            catCount[cat] = (catCount[cat] || 0) + 1;
        });

        const equipmentData = Object.entries(eqCount)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5); // 상위 5개

        const categoryData = Object.entries(catCount)
            .map(([name, value]) => ({ name, value }));

        return { equipmentData, categoryData };
    }, [analysisHistory]);

    return (
        <div className="w-full h-full pb-10 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
            <div className="mb-2 shrink-0">
                <h1 className="text-3xl font-black tracking-tight text-white mb-2 flex items-center gap-3">
                    <History className="w-8 h-8 text-emerald-400" /> 장애 분석 통계 및 이력
                </h1>
                <p className="text-slate-400 text-sm">과거 수행했던 LLM 장애 분석 기록과 주요 발생 트렌드를 시각적으로 확인합니다.</p>
            </div>

            {/* 통계 대시보드 위젯 */}
            {analysisHistory.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0 mb-4">
                    {/* 카테고리별 파이 차트 */}
                    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col">
                        <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-blue-400" /> 원인 카테고리 분포
                        </h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }} 
                                        itemStyle={{ color: '#f8fafc' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* 장비별 결함 바 차트 */}
                    <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col">
                        <h2 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-emerald-400" /> 최다 발생 장비 (Top 5)
                        </h2>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.equipmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip 
                                        cursor={{ fill: '#334155' }}
                                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '0.5rem' }} 
                                    />
                                    <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]}>
                                        {stats.equipmentData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* 히스토리 리스트 */}
            <div className="bg-slate-800/40 border border-slate-700 rounded-2xl p-6 overflow-visible flex flex-col shadow-2xl">
                <h2 className="text-lg font-bold text-slate-200 mb-6 border-b border-slate-700 pb-4">상세 분석 로그</h2>
                <div className="flex-1">
                    {analysisHistory.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-500 bg-slate-900/50 rounded-xl border border-dashed border-slate-700">
                            <FileText className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">아직 저장된 분석 히스토리가 없습니다.</p>
                            <p className="text-sm mt-2">장애 분석 메뉴에서 로그를 분석하면 이곳에 통계와 함께 기록됩니다.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {analysisHistory.map((item) => (
                                <div key={item.id} className="bg-slate-900 border border-slate-700 p-5 rounded-xl hover:border-slate-500 transition-colors group">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                <CalendarClock className="w-4 h-4 text-emerald-500/70" />
                                                <span>{item.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300 font-semibold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                <Server className="w-4 h-4 text-indigo-400" />
                                                <span>{item.equipmentName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-300 text-sm font-semibold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/50">
                                                <PieChartIcon className="w-4 h-4 text-amber-400" />
                                                <span>{item.category || '기타'}</span>
                                            </div>
                                        </div>
                                        <div className="text-sm font-medium text-slate-300 bg-emerald-500/10 px-4 py-2 rounded-lg border border-emerald-500/20">
                                            <span className="text-slate-400 mr-2">증상:</span> 
                                            <span className="text-emerald-400">{item.shortDescription}</span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <p className="text-slate-400 text-sm font-semibold flex items-center gap-2">AI 분석 요약</p>
                                        <p className="text-slate-300 text-sm bg-slate-800/30 p-4 rounded-lg border border-slate-800/50 leading-relaxed whitespace-pre-wrap">
                                            {item.summary}
                                        </p>
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
