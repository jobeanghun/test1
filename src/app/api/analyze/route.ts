import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini API (User must set GEMINI_API_KEY in .env.local)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { category, shortDescription, logText, contextText } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({
                status: "success",
                summary: "정상: 특이사항 없음",
                rawResult: "분석 결과: [Normal] 입력하신 로그에서 특이사항이나 에러 패턴이 발견되지 않았습니다.\n\n현재 시스템은 정상적으로 작동 중인 것으로 보입니다. (※ 현재 제미나이 API 키가 없어 출력되는 가상 테스트 데이터입니다.)"
            });
        }

        if (!logText) {
            return NextResponse.json({ error: "로그 텍스트가 제공되지 않았습니다." }, { status: 400 });
        }

        // Use Gemini model (Flash is fast and suitable for log analysis)
        const model = genAI.getGenerativeModel({
            model: "gemini-pro",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.4
            }
        });

        // Construct the prompt focusing on logs and incident response
        const prompt = `
당신은 최고의 AIOps 전문 엔지니어이며, 현재 사내 장애 대응 지식 베이스(KMS)를 완벽히 숙지하고 있는 상태입니다.
아래의 [입력 정보]와 [참조 지식 베이스(KMS)]를 바탕으로 시스템 장애 원인을 분석하고 조치 방안을 제시해주세요.

[입력 정보]
- 카테고리: ${category}
- 장애 간단 설명: ${shortDescription || "없음"}
- 시스템 로그 원문:
${logText}

[참조 지식 베이스(KMS) - RAG 연동 데이터]
${contextText || "등록된 참조 문서가 없습니다. 로그 자체의 특성과 당신의 지식으로 분석하십시오."}

출력은 반드시 마크다운(Markdown) 형식으로 작성해야 하며, 아래의 규칙을 엄격히 지켜주십시오:

1. 답변의 첫 번째 줄은 무조건 아래 형식으로 장애에 대한 1줄 요약을 작성하세요.
[SUMMARY] 장애 원인에 대한 1줄 요약

2. 지식 베이스 활용: 
- 분석 시 반드시 [참조 지식 베이스]에 언급된 과거 사례나 해결 방안과 유사한 점이 있는지 철저히 확인하십시오.
- 만약 관련된 과거 장애 이력이 있다면 "지식 베이스(KMS)에 등록된 과거 사례와 유사한 양상이 확인됨" 등의 문구를 포함하여 공신력을 높이십시오.

3. 리포트 구성:
- 아래 5가지 목차(1~5)를 '끝까지' 모두 포함하여 철저하게 작성한 매우 상세한 분석 리포트 내용을 기재하세요.
1. 장애 로그 (핵심 로그 분석)
2. 장애 원인 (지식 베이스 교차 검증 포함)
3. 장애 분석 (상세 전문 분석)
4. 해결 방안 (실행 가능한 구체적 단계)
5. 향후 장애 예방 방안

지시사항: 절대 1번이나 2번 목차에서 답변을 멈추거나 대충 요약하지 말고, 1번부터 마지막 5번 목차(향후 장애 예방 방안)까지 완전하고 매우 풍부한 문장으로 리포팅해야 합니다. 
또한 작성 시 **핵심적인 로그의 원인 문구 나 중요 키워드**에는 반드시 양쪽에 '==' 기호를 붙여 하이라이트 처리를 해주세요. (예: ==NullPointerException==, ==스위치 포트 불량==) 그리고 중요 강조 사항에는 **볼드체**를 적극 활용하세요.
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Parse the custom markdown format
        const summaryMatch = responseText.match(/\[SUMMARY\](.*)/);
        const summary = summaryMatch ? summaryMatch[1].trim() : "장애 상세 분석 내역";

        let rawResult = responseText.replace(/\[SUMMARY\].*\n?/, "").trim();

        // Determine status heuristically
        const isSuccess = summary.includes("정상") || summary.includes("성공") || summary.includes("특이사항 없음");

        const jsonResult = {
            status: isSuccess ? "success" : "danger",
            summary: summary,
            rawResult: rawResult
        };

        return NextResponse.json(jsonResult);
    } catch (error: any) {
        console.error("Gemini Analyze Error:", error);

        const errorMessage = error.message || "";

        // Handle 429 Too Many Requests (Quota Exceeded)
        if (errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
            return NextResponse.json({
                status: "danger",
                summary: "AI 실시간 분석 사용량(Quota) 초과",
                rawResult: `⚠️ **제미나이 무료 API 사용량 일시 초과 (Rate Limit)**\n\n현재 실시간 API 호출 빈도 또는 토큰 제한량을 초과했습니다. 안내된 시간에 맞추어 (약 20초~1분 뒤) 다시 '분석 시작'을 눌러주세요.\n\n---\n**[가상의 기존 분석 결과 참고용]**\n분석 결과: [Critical] 스위치 포트 불량 감지. 과거 장애 패턴 95% 일치.\n권장 조치: 해당 포트 셧다운 후 예비 포트로 케이블 이관.`
            });
        }

        return NextResponse.json(
            { error: "분석 중 오류가 발생했습니다: " + errorMessage },
            { status: 500 }
        );
    }
}
