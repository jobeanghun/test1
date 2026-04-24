import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { PineconeStore } from '@langchain/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        let contextText = "";

        // 1. RAG 기반 지식 검색 (키가 설정된 경우에만)
        if (process.env.OPENAI_API_KEY && process.env.PINECONE_API_KEY) {
            try {
                const embeddings = new OpenAIEmbeddings({ openAIApiKey: process.env.OPENAI_API_KEY });
                const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
                const pineconeIndex = pinecone.Index('aiops-rag-kb');

                const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });
                const results = await vectorStore.similaritySearch(query, 3);
                
                if (results && results.length > 0) {
                    contextText = results.map(r => r.pageContent).join("\n\n---\n\n");
                }
            } catch (ragError) {
                console.warn("RAG Search failed, fallback to general LLM", ragError);
            }
        }

        // 2. Gemini LLM에 질의 (RAG 결과 포함)
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is missing' }, { status: 500 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
당신은 IT 인프라 통합 관제 시스템(AIOps)의 AI 어시스턴트 봇입니다.
엔지니어들이 모여있는 워룸(채팅방)에서 질문을 받았습니다.

[사내 지식 베이스 검색 결과]
${contextText || "관련된 사내 문서가 없습니다."}

[엔지니어 질문]
${query}

[지시사항]
1. 사내 지식 베이스 검색 결과가 있다면 이를 최우선으로 참고하여 답변하세요.
2. 검색 결과가 없거나 부족하다면, 당신이 가진 일반적인 IT 지식(서버, 네트워크, OS 등)을 동원하여 가장 전문적이고 실용적인 해결책을 제시하세요.
3. 봇처럼 친절하고 명확하게 답변하되, 워룸의 급박한 상황을 고려해 결론부터 간결하게 말해주세요.
4. 마크다운 형식을 사용하여 가독성 있게 작성하세요.
        `;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({
            success: true,
            reply: responseText
        });

    } catch (error: any) {
        console.error("ChatOps API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
