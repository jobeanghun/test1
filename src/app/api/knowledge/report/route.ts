import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
    try {
        const { chatLog, roomTitle, roomDescription, templateType, customInstruction } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ 
                report: "# [임시] 장애 요약 보고서\n현재 API 키가 설정되지 않아 생성된 가상 보고서입니다.\n\n## 1. 장애 개요\n- 일시: " + new Date().toLocaleString() + "\n- 대상: " + roomTitle + "\n\n## 2. 조치 내역\n- 대기 중" 
            });
        }

        // Format chat logs for Gemini
        const formattedLogs = chatLog.map((log: any) => `[${log.time}] ${log.sender}: ${log.text}`).join("\n");

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                maxOutputTokens: 4000,
                temperature: 0.3
            }
        });

        let styleInstruction = "";
        if (templateType === "technical") {
            styleInstruction = "엔지니어를 위한 '기술 중심 보고서' 스타일로 작성하십시오. 구체적인 에러 로그 분석, 서버 설정값, 조치 명령어(Command) 등을 상세하게 포함해야 합니다.";
        } else if (templateType === "executive") {
            styleInstruction = "경영진을 위한 '비즈니스 요약 보고서' 스타일로 작성하십시오. 기술적인 세부 사항보다는 서비스 영향도, 장애 시간, 조치 완료 여부, 그리고 향후 재발 방지를 위한 리소스 투자 필요성 위주로 작성하십시오.";
        } else if (templateType === "custom") {
            styleInstruction = `사용자 지정 요청 사항을 반영한 '커스텀 보고서'입니다. 다음 요청을 최우선으로 반영하십시오: "${customInstruction}"`;
        } else {
            styleInstruction = "표준적인 '장애 대응 리포트' 스타일로 작성하십시오. 인지, 원인, 조치, 예방의 4단계 구조를 충실히 따르십시오.";
        }

        const prompt = `
당신은 IT 인프라 장애 대응 전문가입니다. 아래의 [워룸 채팅 이력]을 바탕으로 공식적인 [장애 보고서]를 마크다운 형식으로 작성해주세요.

[워룸 정보]
- 명칭: ${roomTitle}
- 초기 장애 내용: ${roomDescription}

[작성 스타일 가이드라인]
${styleInstruction}

[워룸 채팅 이력]
${formattedLogs}

[공통 지시사항]
1. 보고서는 반드시 마크다운(Markdown) 형식을 사용하며, 매우 전문적이고 격식 있게 작성하십시오.
2. 아래의 목차를 포함하십시오:
   - 1. 장애 개요 (발생 시각, 인프라 대상, 영향도)
   - 2. 장애 인지 및 초기 대응 (대화 내용에서 추출)
   - 3. 원인 분석 (구체적인 에러나 추론 내용)
   - 4. 조치 결과 (현재까지 완료된 조치 단계별 기재)
   - 5. 향후 계획 및 재발 방지 대책
3. 대화 내용 중 중요한 키워드(에러 코드, 서버명, 조치 명령어)에는 ==하이라이트== 처리를 해주세요.
4. 만약 대화 내용이 부족하여 추정이 필요하다면, 가장 개연성 있는 시나리오를 바탕으로 작성하되 "(추정)"이라고 표기하십시오.
5. 채팅에서 언급된 인물들의 지시 사항이나 기여 내용을 "조치 결과" 섹션에 적절히 녹여내십시오.
`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        return NextResponse.json({ report: responseText });
    } catch (error: any) {
        console.error("Gemini Report Generation Error:", error);
        return NextResponse.json({ error: "보고서 생성 중 오류가 발생했습니다." }, { status: 500 });
    }
}
