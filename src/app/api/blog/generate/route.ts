import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  INDUSTRY_OPTIONS,
  STRENGTH_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/blog/templates";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});

export interface GenerateBody {
  mainKeyword: string;
  subKeywords: string[];
  industryId: string;
  industryCustom?: string;
  strengths: string[];
  region: string;
  target: string;
  length: 1000 | 1500 | 2000;
  toneId: string;
}

function getIndustryLabel(id: string): string {
  return INDUSTRY_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

function getStrengthLabels(ids: string[]): string[] {
  return ids
    .map((id) => STRENGTH_OPTIONS.find((o) => o.id === id)?.label)
    .filter(Boolean) as string[];
}

function getToneLabel(id: string): string {
  return TONE_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

/** 선택한 글 길이에 따른 허용 범위 (한글 기준) */
const LENGTH_RANGE: Record<1000 | 1500 | 2000, { min: number; max: number }> = {
  1000: { min: 900, max: 1100 },
  1500: { min: 1350, max: 1650 },
  2000: { min: 1850, max: 2150 },
};

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해 주세요." },
      { status: 500 }
    );
  }

  let body: GenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const {
    mainKeyword,
    subKeywords,
    industryId,
    industryCustom,
    strengths,
    region,
    target,
    length,
    toneId,
  } = body;

  if (!mainKeyword?.trim()) {
    return NextResponse.json({ error: "메인 키워드를 입력해 주세요." }, { status: 400 });
  }

  const industryLabel = (industryCustom?.trim() || getIndustryLabel(industryId));
  const strengthLabels = getStrengthLabels(strengths);
  const toneLabel = getToneLabel(toneId);
  const lengthRange = LENGTH_RANGE[length];

  const systemPrompt = `당신은 네이버 블로그 SEO에 맞는 글을 쓰는 전문가입니다.
사업 분야: 인쇄/디자인/출력/스티커/DTF/UV/배너/실사출력/의류 제작/명함.
특히 "당일 제작", "소량 맞춤", "급한 고객도 가능", "신뢰감", "다양한 기기", "오랜 경력(10년)"을 자연스럽게 강조하는 톤을 유지하세요.
과장 표현(최고, 1등, 무조건, 100% 등)은 사용하지 마세요.

[네이버 블로그 SEO 원칙 - 반드시 지킬 것]
- 제목: 메인 키워드를 앞쪽에 넣고, 25~35자 내외로 작성(네이버 검색 노출에 유리).
- 본문 첫 문단(서론): 메인 키워드를 1~2회 자연스럽게 포함.
- 소제목/문단: 서브 키워드와 연관 표현을 고르게 배치하되, 키워드 삽입(키워드 스터핑)은 하지 말 것.
- 검색의도: "정보형·문의 유도형"에 맞게 유용한 정보 + 부드러운 문의 유도.
- 해시태그: 메인·서브 키워드, 지역, 업종 관련 검색어를 포함해 10개.
- 본문 중반~후반: 메인 키워드 또는 유사 표현을 1~2회 더 자연스럽게 넣어, 글 전체에 키워드가 고르게 분포되게 할 것.
- 문단 길이: 한 문단은 3~5문장 내외로 나누어 가독성을 높일 것(체류 시간·이탈률에 유리).
- 지역·타겟: 지역·타겟이 있으면 본문 중간에도 1~2회 자연스럽게 언급해 지역·롱테일 검색에 대응할 것.
- 이미지: 본문에 넣을 이미지 개수는 고정하지 말고, SEO와 가독성을 고려해 검색에 잘 노출되는 개수만큼 직접 정하세요. 각 이미지 위치에는 "여기에 ○○○의 이미지를 넣어주세요" 형식으로, AI가 추천하는 느낌·장면(예: 작업 완료된 스티커 샘플, 제작 과정 인쇄기, 견적 상담 장면)을 구체적으로 적어 주세요. 이미지 앞뒤 문장에는 키워드나 핵심 정보를 넣어 검색·이해에 도움이 되게 할 것.
- CTA 배치: 문의 유도(연락해 주세요 등)는 마지막 1~2문단에만 두고, 앞부분은 정보 제공에 집중할 것.

[글 길이 - 반드시 준수]
- 본문 body의 한글 글자 수는 요청 시 안내하는 허용 범위(최소~최대) 안에 반드시 들어가야 합니다. 범위 미만이거나 초과하면 부적격입니다. 작성 후 글자 수를 확인해 범위 안에 맞출 것.
- 1000자 선택 시: 본문 900~1100자(±100자).
- 1500자 선택 시: 본문 1350~1650자(±150자).
- 2000자 선택 시: 본문 1850~2150자(±150자).

[문체·구성 다양화 - 매번 다르게]
- 매번 다른 문체와 진행 방향으로 작성하세요. 같은 형식을 반복하지 마세요.
- 서론: 때로는 질문으로, 때로는 경험담·사실 제시, 때로는 고객 목소리 인용 등 다양한 방식으로 시작할 것.
- 문단 순서·강조하는 부분·비유나 예시 사용 여부를 바꿔 가며 작성할 것.
- 문장 길이와 호칭도 가볍게 변형해, 검색 요건은 유지하면서 읽는 느낌이 매번 달라지게 할 것.

응답은 반드시 다음 JSON 형식만 출력하세요. 다른 설명이나 마크다운 없이 JSON만 출력합니다.
{
  "titleCandidates": ["제목1", "제목2", "제목3", "제목4", "제목5"],
  "body": "본문 전체 텍스트. 문단은 줄바꿈 두 번으로 구분. 이미지 위치에는 '여기에 ○○○의 이미지를 넣어주세요' 형식으로, AI가 추천하는 이미지 느낌·장면을 구체적으로 적어 주세요. 개수는 SEO에 맞게 검색이 잘 되는 수로 정하세요.",
  "hashtags": ["태그1", "태그2", ... "태그10"]
}`;

  const userPrompt = `다음 조건으로 네이버 검색 노출을 고려한 블로그 글을 작성해 주세요.

- 메인 키워드(반드시 제목·서론에 자연스럽게 포함): ${mainKeyword}
- 서브 키워드(본문 곳곳에 고르게 사용): ${(subKeywords || []).filter(Boolean).join(", ") || "(없음)"}
- 업종: ${industryLabel}
- 강조할 강점: ${strengthLabels.length ? strengthLabels.join(", ") : "(없음)"}
- 지역(제목·본문·해시태그에 활용): ${region || "(지역 없음)"}
- 타겟: ${target || "(타겟 없음)"}
- 글 길이(반드시 준수): 본문 body 한글 기준 ${lengthRange.min}자 이상 ${lengthRange.max}자 이하로 작성. 이 범위를 벗어나면 부적격입니다. 작성 후 글자 수가 ${lengthRange.min}~${lengthRange.max}자 안에 오는지 확인할 것.
- 말투: ${toneLabel}

글 구성: 고정된 형식(서론→정보→FAQ→마무리)을 쓰지 말고, AI가 네이버 블로그 SEO와 읽는 재미를 고려해 추천하는 형태로 자유롭게 구성해 주세요. 단, 제목·서론에 메인 키워드 노출, 본문에 서브 키워드·지역·타겟 자연스럽게 배치, 문의 유도는 글 후반에 두는 등 SEO 원칙은 지킬 것.

본문에는 이미지를 넣을 위치를 SEO에 맞게 검색이 잘 되는 개수만큼 두고, 각 위치에는 "여기에 ○○○의 이미지를 넣어주세요"처럼 어떤 느낌·장면의 이미지인지 AI가 구체적으로 추천해 적어 주세요. 해시태그 10개는 메인·서브 키워드, 지역, 업종 관련 검색어를 포함해 만들어 주세요.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json(
        { error: "OpenAI에서 응답이 비어 있습니다." },
        { status: 502 }
      );
    }

    // JSON 블록만 추출 (```json ... ``` 감싸진 경우 대비)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const parsed = JSON.parse(jsonStr) as {
      titleCandidates?: string[];
      body?: string;
      hashtags?: string[];
    };

    const titleCandidates = Array.isArray(parsed.titleCandidates)
      ? parsed.titleCandidates.slice(0, 5)
      : [];
    const bodyText =
      typeof parsed.body === "string"
        ? parsed.body
        : "";
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags.slice(0, 10).map((h) => (typeof h === "string" ? h.replace(/^#/, "") : String(h)))
      : [];

    return NextResponse.json({
      titleCandidates,
      body: bodyText,
      hashtags,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI 요청 실패";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
