import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';
import { parseOffice } from 'officeparser';

// =========================================================================
// [RAG 파이프라인 백엔드 연동 뼈대]
// 사용자가 지식 창고(Knowledge Base)에 이력 문서를 업로드했을 때,
// 1. 서버에서 문서 텍스트를 파싱
// 2. 임베딩화 (Embeddings)
// 3. Pinecone과 같은 벡터 DB(Vector DB)에 인덱싱하는 일련의 과정입니다.
// =========================================================================

// -------------------------------------------------------------------------
// [PDF Parsing Fix] Node.js 환경에서 DOMMatrix 미정의 에러 해결을 위한 폴리필
if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() {}
    };
}
// -------------------------------------------------------------------------

export async function POST(req: NextRequest) {
    try {
        // 1. 요청에서 업로드된 파일(FormData) 가져오기
        const data = await req.formData();
        const file = data.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: '첨부된 파일이 없습니다.' }, { status: 400 });
        }

        // 2. 파일 데이터를 메모리로 가져와 텍스트로 추출
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let textContent = `[본문 내용: ${file.name}]\n`;
        
        try {
            const fileNameLower = file.name.toLowerCase();
            if (fileNameLower.endsWith('.pdf')) {
                const { PDFParse } = require('pdf-parse');

                if (typeof PDFParse !== 'function') {
                    throw new Error("PDF 파싱 라이브러리(v2.4.5) 로드 실패: PDFParse class not found");
                }

                // v2.4.5 API: 클래스 생성 후 getText() 호출
                const parser = new PDFParse({ data: buffer });
                const result = await parser.getText();
                textContent += result.text;
                
                // 리소스 해제
                if (parser.destroy) await parser.destroy();

                // 텍스트 추출 결과 검증 로직 추가
                if (!result.text || result.text.trim().length < 10) {
                    textContent += `\n[경고: 해당 PDF에서 유효한 텍스트를 추출하지 못했습니다. 이미지만 있는 문서일 수 있습니다.]`;
                }
            } else if (fileNameLower.endsWith('.pptx') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.xlsx')) {
                const parsedResult = await parseOffice(buffer);
                textContent += parsedResult.toText();
                
                if (!parsedResult.toText() || parsedResult.toText().trim().length < 10) {
                    textContent += `\n[경고: 해당 문서에서 유효한 텍스트를 추출하지 못했습니다.]`;
                }
            } else {
                textContent += buffer.toString('utf-8');
            }
        } catch (e: any) {
            console.warn("텍스트 추출 실패:", e);
            textContent += `\n[텍스트 추출에 실패했습니다. 사유: ${e.message}]`;
        }

        // 3. 텍스트를 청크(Chunk) 단위로 분할 (Vector DB 용량 최적화 및 유사도 매칭 정확성용)
        // LangChain의 RecursiveCharacterTextSplitter를 이용해 자동으로 분할하는 것이 일반적입니다.
        const docs = [
            new Document({
                pageContent: textContent,
                metadata: {
                    source: file.name,
                    size: file.size,
                    uploadDate: new Date().toISOString()
                },
            }),
        ];

        // =========================================================================
        // 이하 RAG 벡터화 로직 (OPENAI_API_KEY와 PINECONE_API_KEY 설정 시 동작)
        // =========================================================================

        if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
            console.warn("⚠️ RAG 파이프라인 알림: OpenAI 또는 Pinecone API 키가 설정되지 않아 임베딩 적재를 생략하고 시뮬레이션 합니다.");
            return NextResponse.json({
                success: true,
                message: '파일 파싱 완료. (API 키가 없으므로 벡터 DB 업로드는 건너뛰었습니다.)',
                fileName: file.name,
                extractedLength: textContent.length,
                textContent: textContent
            }, { status: 200 });
        }

        // 4. LangChain OpenAIEmbeddings 객체 초기화 (텍스트 -> 고차원 배열 벡터로 변환)
        // 모델명 예시: text-embedding-3-small, text-embedding-ada-002
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
        });

        // 5. Pinecone 클라이언트 초기화 및 인덱스 타겟팅
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });

        // Pinecone 대시보드에서 생성해둔 인덱스명 적발(예: 'aiops-rag-kb')
        const pineconeIndex = pinecone.Index('aiops-rag-kb');

        // 6. PineconeStore를 통해 문서를 Pinecone Index에 자동 업로드
        // 한 번에 너무 많은 작업이 넘치지 않도록 maxConcurrency를 조절합니다.
        await PineconeStore.fromDocuments(docs, embeddings, {
            pineconeIndex,
            maxConcurrency: 5,
        });

        // 7. 성공 시 결과 반환
        return NextResponse.json({
            success: true,
            message: '파일 분석 및 벡터 DB 적재가 성공적으로 완료되었습니다.',
            fileName: file.name,
            textContent: textContent
        }, { status: 200 });

    } catch (error: any) {
        console.error('RAG Pipeline Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
