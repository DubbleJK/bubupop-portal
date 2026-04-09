import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해 주세요." },
      { status: 500 }
    );
  }

  let body: { mainKeyword?: string; region?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const mainKeyword = body.mainKeyword?.trim();
  if (!mainKeyword) {
    return NextResponse.json({ error: "메인 키워드를 입력해 주세요." }, { status: 400 });
  }
  const region = body.region?.trim();

  const userContent = `메인 키워드: "${mainKeyword}"
${region ? `지역 힌트: ${region} (해당 지역과 어울리는 조합 1~2개만 섞어도 됨)` : "지역 힌트 없음"}

위 메인 키워드에 맞는 네이버 블로그·검색 연관에 쓰기 좋은 **서브 키워드(연관 검색어 성격)** 를 정확히 5개만 제안하라.
- 각 항목은 2~12자 한국어 명사구 위주
- 메인 키워드와 중복되지 않게
- 설명 없이 JSON만 출력한다.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "너는 한국어 SEO 키워드 기획자다. 사용자 메인 키워드에 대해 검색 의도가 다른 서브 키워드 5개를 JSON으로만 반환한다. 형식: {\"suggestions\":[\"...\",\"...\",\"...\",\"...\",\"...\"]}",
        },
        { role: "user", content: userContent },
      ],
      temperature: 0.65,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "OpenAI에서 응답이 비어 있습니다." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(content) as { suggestions?: unknown };
    const raw = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    const suggestions = raw
      .map((k) => (typeof k === "string" ? k.trim() : ""))
      .filter(Boolean)
      .filter((k) => k !== mainKeyword)
      .slice(0, 5);

    if (suggestions.length < 5) {
      return NextResponse.json(
        { error: "서브 키워드 5개를 만들지 못했습니다. 다시 시도해 주세요." },
        { status: 502 }
      );
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI 요청 실패";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
