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

        // 로그와 컨텍스트가 너무 길면 잘라서 토큰 수를 줄임 (TPM 초과 방지)
        const maxTextLength = 8000;
        const safeLogText = logText.length > maxTextLength ? logText.substring(0, maxTextLength) + "\n...[로그 생략됨]..." : logText;
        const safeContextText = contextText && contextText.length > maxTextLength ? contextText.substring(0, maxTextLength) + "\n...[문서 생략됨]..." : contextText;

        // Use Gemini model (Flash is fast and suitable for log analysis)
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash", // 2.0-flash 보다 Rate Limit이 안정적인 1.5-flash로 다운그레이드 테스트
            generationConfig: {
                maxOutputTokens: 4096, // 출력 토큰 수도 절반으로 줄여 제한 방지
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
${safeLogText}

[참조 지식 베이스(KMS) - RAG 연동 데이터]
${safeContextText || "등록된 참조 문서가 없습니다. 로그 자체의 특성과 당신의 지식으로 분석하십시오."}

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

        let result;
        let retries = 3; // 최대 3번 시도
        let delay = 3000; // 초기 대기 시간 3초

        for (let i = 0; i < retries; i++) {
            try {
                result = await model.generateContent(prompt);
                break; // 성공 시 루프 탈출
            } catch (error: any) {
                const errorMessage = error.message || "";
                // 429 Too Many Requests 또는 Quota exceeded 에러 발생 시 재시도
                if ((errorMessage.includes("429") || errorMessage.includes("Quota exceeded") || errorMessage.includes("Too Many Requests")) && i < retries - 1) {
                    console.warn(`Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries - 1})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    delay *= 2; // 지수 백오프 (3초, 6초)
                    continue;
                }
                
                // 만약 모든 재시도가 실패했거나, 다른 에러라면 루프를 빠져나와 에러를 던지기 전에 Mock 데이터를 반환하도록 처리
                console.error("Gemini API Error after retries or non-429 error:", errorMessage);
                
                // Rate Limit의 경우 완전 차단 상태이므로 가상 데이터 폴백 반환
                if (errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
                     return NextResponse.json({
                        status: "warning",
                        summary: "AI 실시간 분석 사용량(Quota) 초과 - 가상 분석 모드",
                        rawResult: `⚠️ **제미나이 API 사용량 초과 (가상 분석 결과 제공)**\n\n현재 일일 무료 할당량 또는 분당 호출 횟수(Rate Limit)가 완전히 초과되어, **가상 테스트 분석 결과**를 대신 표시합니다.\n(API 토큰 제한이 해제되면 자동으로 다시 실제 분석이 진행됩니다.)\n\n---\n\n### 1. 장애 로그 (핵심 로그 분석)\n- 입력된 로그에서 주요 에러 키워드(예: ==Connection Timeout==, ==NullPointerException==) 등이 있는지 검토가 필요합니다.\n\n### 2. 장애 원인 (지식 베이스 교차 검증 포함)\n- 리소스 고갈, 네트워크 단절, 또는 DB 커넥션 풀 부족 현상이 의심됩니다.\n\n### 3. 장애 분석 (상세 전문 분석)\n- 시스템 부하 상태에서 적절한 스레드 반환이 이루어지지 않았을 수 있습니다.\n\n### 4. 해결 방안 (실행 가능한 구체적 단계)\n- 1단계: 장애가 발생한 인스턴스의 프로세스를 재시작합니다.\n- 2단계: 최근 배포된 설정 파일을 롤백합니다.\n\n### 5. 향후 장애 예방 방안\n- Auto-Scaling 정책을 재점검하고 모니터링 알람(Threshold) 기준을 낮추어 선제적으로 대응합니다.`
                    });
                }
                throw error; // 기타 500 에러는 캐치 블록으로 던짐
            }
        }

        if (!result) {
            throw new Error("결과를 생성하지 못했습니다.");
        }

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
        console.error("Gemini Analyze Final Catch Error:", error);

        const errorMessage = error.message || "";

        return NextResponse.json(
            { error: "분석 중 오류가 발생했습니다: " + errorMessage },
            { status: 500 }
        );
    }
}
