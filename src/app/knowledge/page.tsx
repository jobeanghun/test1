"use client";

import { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function KnowledgeBasePage() {
    const [category, setCategory] = useState("Network");
    const categories = ["Network", "Server", "OS", "Software"];
    const { knowledgeDocs, addKnowledgeDoc, removeKnowledgeDoc, clearKnowledgeDocs } = useStore();
    
    const [isUploading, setIsUploading] = useState(false);
    const [uploadSuccessMessage, setUploadSuccessMessage] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const processFile = async (file: File) => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            // 실제 Pinecone Vector DB 백엔드 API 호출
            const res = await fetch("/api/knowledge/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "업로드에 실패했습니다.");
            }
            
            // Zustand 전역 상태에 추가하여 즉각적으로 타 대시보드(벡터 DB 뷰어 등)에 연동
            // Zustand 전역 상태에 추가
            addKnowledgeDoc({
                id: Date.now().toString(),
                filename: data.fileName || file.name,
                time: new Date().toLocaleString(),
                timestamp: Date.now(), // 정밀 정렬용
                content: data.textContent || "내용 오류",
                filesize: `${(file.size / 1024).toFixed(1)} KB`
            });

            // 백엔드에서 반환한 실제 Pinecone 처리 결과를 사용자 토스트 알림으로 표시
            setUploadSuccessMessage(data.message || `'${file.name}' 파일이 정상적으로 벡터 DB에 반영되었습니다.`);
            
        } catch (error: any) {
            console.error("Upload error:", error);
            setUploadSuccessMessage(`오류 발생: ${error.message}`);
        } finally {
            setIsUploading(false);
            setTimeout(() => setUploadSuccessMessage(""), 5000);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    return (
        <div className="w-full h-full pb-10 flex flex-col gap-6 relative">
            {/* Success Toast / Notification */}
            {uploadSuccessMessage && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-emerald-500/90 text-slate-900 px-6 py-3 rounded-full flex items-center gap-2 font-bold shadow-xl animate-in fade-in slide-in-from-top-4 z-50">
                    <CheckCircle className="w-5 h-5" />
                    {uploadSuccessMessage}
                </div>
            )}

            <div className="mb-2">
                <h1 className="text-2xl font-bold tracking-tight text-white mb-1">지식 창고</h1>
                <p className="text-slate-400 text-sm">과거 장애 보고서(PPT, Excel)를 자유롭게 업로드하여 벡터 데이터베이스(RAG)로 구축합니다.</p>
            </div>

            <div 
                className={`flex-1 bg-slate-800 border-2 rounded-xl p-8 flex flex-col items-center justify-start text-center overflow-auto relative transition-colors ${dragActive ? 'border-emerald-500 bg-slate-800/80 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-700'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <div className="w-full text-left mb-10 pb-6 border-b border-slate-700/50">
                    <label className="text-sm font-semibold text-slate-300 block mb-3">RAG 학습용 카테고리 선택</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${category === cat
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`w-24 h-24 rounded-full flex flex-shrink-0 items-center justify-center mb-6 border-2 border-dashed mt-4 transition-all ${isUploading ? 'bg-emerald-500/20 border-emerald-500 animate-pulse' : 'bg-slate-900 border-slate-700'}`}>
                    <UploadCloud className={`w-10 h-10 ${isUploading ? 'text-emerald-400' : 'text-emerald-500'}`} />
                </div>
                <h2 className="text-xl font-bold text-slate-200 mb-2">파일 드래그 앤 드롭</h2>
                <p className="text-slate-400 mb-8 max-w-md">
                    지원되는 형식: .pptx, .xlsx, .docx, .pdf<br />
                    업로드된 파일은 LangChain 등을 이용해 파싱된 후 벡터 DB에 저장됩니다.
                </p>

                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept=".pptx,.xlsx,.docx,.pdf,.txt,.log"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-3 px-8 rounded-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center gap-2 z-10"
                >
                    {isUploading ? (
                        <>
                            <span className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                            업로드 및 인덱싱 중...
                        </>
                    ) : (
                        "파일 선택하기"
                    )}
                </button>

                <div className="mt-12 w-full max-w-2xl text-left border-t border-slate-700 pt-8 z-10 pointer-events-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> 최근 등록된 문서 목록 ({knowledgeDocs.length}건)
                        </h3>
                        {knowledgeDocs.length > 0 && (
                            <button 
                                onClick={clearKnowledgeDocs}
                                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded transition-colors border border-slate-700 hover:border-red-500/50"
                            >
                                전체 기록 삭제
                            </button>
                        )}
                    </div>
                    <div className="space-y-3">
                        {knowledgeDocs.map((doc) => (
                            <div key={doc.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex justify-between items-center transition-colors hover:border-slate-500 animate-in fade-in slide-in-from-bottom-2">
                                <div className="flex flex-col flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-300 text-sm font-medium">{doc.filename}</span>
                                        <span className="text-emerald-500 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 rounded">인덱싱 완료</span>
                                    </div>
                                    <span className="text-slate-500 text-xs mt-1">
                                        {doc.time} <span className="mx-2">|</span> 추출된 텍스트: {doc.content ? doc.content.length.toLocaleString() : 0}자
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => {
                                            const win = window.open("", "_blank", "width=800,height=600");
                                            if (win) {
                                                win.document.write(`<html><head><title>${doc.filename} 미리보기</title><style>body{background:#0f172a;color:#cbd5e1;font-family:sans-serif;padding:20px;white-space:pre-wrap;}</style></head><body><h1>${doc.filename} 인식 텍스트</h1><hr/>${doc.content}</body></html>`);
                                            }
                                        }}
                                        className="px-3 py-1.5 text-[10px] font-bold bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors border border-slate-700"
                                    >
                                        본문 미리보기
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); removeKnowledgeDoc(doc.id); }}
                                        className="flex items-center justify-center w-8 h-8 rounded-md bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-colors border border-slate-700"
                                        title="기록에서 삭제"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
