import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';

import AdmZip from 'adm-zip';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';

// =========================================================================
// [RAG 파이프라인 백엔드 연동 뼈대]
// =========================================================================

// [PDF Parsing Fix] Node.js 환경에서 DOMMatrix 미정의 에러 해결을 위한 폴리필
if (typeof (global as any).DOMMatrix === 'undefined') {
    (global as any).DOMMatrix = class DOMMatrix {
        constructor() {}
    };
}

export async function POST(req: NextRequest) {
    try {
        const data = await req.formData();
        const file = data.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: '첨부된 파일이 없습니다.' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        let textContent = `[본문 내용: ${file.name}]\n`;
        const fileNameLower = file.name.toLowerCase();
        
        try {
            // 1. PDF
            if (fileNameLower.endsWith('.pdf')) {
                const { PDFParse } = require('pdf-parse');
                if (typeof PDFParse !== 'function') throw new Error("PDFParse class not found");
                const parser = new PDFParse({ data: buffer });
                const result = await parser.getText();
                textContent += result.text;
                if (parser.destroy) await parser.destroy();
            } 
            // 2. 워드 문서 (DOCX)
            else if (fileNameLower.endsWith('.docx')) {
                const result = await mammoth.extractRawText({ buffer });
                textContent += result.value;
            } 
            // 3. 엑셀 문서 (XLSX)
            else if (fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls')) {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                workbook.SheetNames.forEach(sheetName => {
                    const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                    textContent += `\n--- Sheet: ${sheetName} ---\n${csv}\n`;
                });
            } 
            // 4. 파워포인트 (PPTX)
            else if (fileNameLower.endsWith('.pptx')) {
                const zip = new AdmZip(buffer);
                const slideEntries = zip.getEntries().filter(e => e.entryName.startsWith('ppt/slides/slide') && e.entryName.endsWith('.xml'));
                for (const entry of slideEntries) {
                    const xmlStr = entry.getData().toString('utf8');
                    // PPT 내부 텍스트 노드값만 단순 정규식으로 추출
                    const stripped = xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    textContent += stripped + '\n';
                }
            } 
            // 5. 한글 문서 (HWPX)
            else if (fileNameLower.endsWith('.hwpx')) {
                const zip = new AdmZip(buffer);
                const sectionEntries = zip.getEntries().filter(e => e.entryName.startsWith('Contents/section') && e.entryName.endsWith('.xml'));
                for (const entry of sectionEntries) {
                    const xmlStr = entry.getData().toString('utf8');
                    const stripped = xmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    textContent += stripped + '\n';
                }
            }
            // 6. 이미지 파일 (JPG, PNG) - OpenAI Vision API 활용
            else if (fileNameLower.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
                if (!process.env.OPENAI_API_KEY) {
                    textContent += "\n[경고: OPENAI_API_KEY가 없어 이미지 텍스트 추출을 생략합니다.]";
                } else {
                    const base64Img = buffer.toString('base64');
                    const mimeType = file.type || 'image/jpeg';
                    const response = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: { 
                            "Content-Type": "application/json", 
                            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` 
                        },
                        body: JSON.stringify({
                            model: "gpt-4o-mini",
                            messages: [{
                                role: "user",
                                content: [
                                    { type: "text", text: "이 이미지에 적힌 모든 텍스트를 인식해서 순수 텍스트로만 반환해줘. 그 외 설명은 붙이지 마." },
                                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Img}` } }
                                ]
                            }],
                            max_tokens: 1000
                        })
                    });
                    const resJson = await response.json();
                    if (resJson.choices && resJson.choices[0]) {
                        textContent += resJson.choices[0].message.content;
                    } else {
                        textContent += "\n[이미지 텍스트 인식 실패]";
                    }
                }
            } 
            // 7. 일반 텍스트 포맷 폴백
            else {
                textContent += buffer.toString('utf-8');
            }

            // 본문 길이 유효성 검증
            if (textContent.replace(`[본문 내용: ${file.name}]`, '').trim().length < 10) {
                textContent += `\n[경고: 해당 포맷에서 유효한 텍스트를 거의 추출하지 못했습니다.]`;
            }

        } catch (e: any) {
            console.warn("텍스트 추출 실패:", e);
            textContent += `\n[텍스트 추출에 실패했습니다. 사유: ${e.message}]`;
        }

        const docs = [
            new Document({
                pageContent: textContent,
                metadata: { source: file.name, size: file.size, uploadDate: new Date().toISOString() },
            }),
        ];

        if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
            console.warn("⚠️ RAG 알림: OpenAI 또는 Pinecone API 키가 설정되지 않아 임베딩 적재를 생략합니다.");
            return NextResponse.json({
                success: true,
                message: '파일 파싱 완료. (API 키 없음 -> 벡터 DB 업로드 스킵)',
                fileName: file.name,
                extractedLength: textContent.length,
                textContent: textContent
            }, { status: 200 });
        }

        const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
        const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
        const pineconeIndex = pinecone.Index('aiops-rag-kb');

        await PineconeStore.fromDocuments(docs, embeddings, { pineconeIndex, maxConcurrency: 5 });

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
