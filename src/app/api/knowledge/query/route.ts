import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const { query, contextFilename, contextText } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ 
                answer: `(Gemini API 키가 없어 시뮬레이션된 답변입니다.)\n\n문서 [${contextFilename}] 내용 기반 판단입니다.\n\n${contextText ? '문서 내용이 접수되었습니다.' : '문서 내용이 없습니다.'}`,
                filename: contextFilename,
                confidence: "보통"
            }, { status: 200 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
당신은 사용자가 첨부한 문서 [${contextFilename}] 기반으로만 답변을 제공하는 전문 AIOps 분석 시스템입니다.
현재 문서는 대용량 데이터 전송 규약에 따라 컨텍스트가 풍부하게 제공되었습니다. 
반드시 아래의 '데이터 검증 프로토콜'을 철저히 준수하세요.

[첨부 문서 내용 시작]
${contextText ? contextText.substring(0, 200000) : '문서 내용이 없습니다.'}
[첨부 문서 내용 끝]

1. 정확한 정보 추출:
- 사용자의 질문('${query}')에 대해 위 [첨부 문서 내용]을 처음부터 끝까지 꼼꼼히 분석하여 검색하세요.
- 답변의 서두는 "첨부된 [${contextFilename}] 분석 결과입니다."로 시작하세요.

2. 데이터 부재 시 대응:
- 문서에서 질문과 관련된 직접적인 답변을 찾을 수 없는 경우에도, 문서 내에서 가장 유사하거나 참고할 만한 수치, 로그, 리포트 내용이 있다면 이를 언급하며 "직접적인 정보는 부족하지만 관련하여 ~한 내용이 있습니다"라고 안내하세요.
- 정말 아무런 관련 정보가 없을 때만 "관련 정보를 찾을 수 없습니다"라고 답하세요.

3. 출처 메타데이터 (Source Attribution):
- 답변을 제공한 경우, 답변의 맨 마지막 줄에 반드시 "[출처: ${contextFilename}]" 를 명시하세요.

유저 질문: ${query}
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({
            answer: responseText,
            filename: contextFilename,
            confidence: responseText.includes("관련 정보를 찾을 수 없습니다") ? "낮음" : "높음"
        });

    } catch (error: any) {
        console.error("RAG Query Error:", error);
        
        const errorMessage = error.message || "";
        
        // Handle 429 Too Many Requests
        if (errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
            return NextResponse.json({ 
                error: "제미나이 무료 API 일시적 사용량 초과(Quota Exceeded)입니다. 약 20초 후 다시 시도해주세요." 
            }, { status: 500 });
        }
        
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
