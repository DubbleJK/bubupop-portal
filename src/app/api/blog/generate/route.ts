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
  customStrength?: string;
  customerType?: string;
  workType?: string;
  workTypeCustom?: string;
  story?: string;
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

type TitleCandidate = { type: "정보형" | "사례형" | "문제해결형"; title: string };

type ImageGuideItem = {
  position: string;
  description: string;
  purpose: string;
  altText: string;
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
    customStrength,
    customerType,
    workType,
    workTypeCustom,
    story,
    region,
    target,
    length,
    toneId,
  } = body;

  if (!mainKeyword?.trim()) {
    return NextResponse.json({ error: "메인 키워드를 입력해 주세요." }, { status: 400 });
  }

  const industryLabel = (industryCustom?.trim() || getIndustryLabel(industryId));
  const strengthLabels = [
    ...getStrengthLabels(strengths),
    ...(customStrength?.trim() ? [customStrength.trim()] : []),
  ];
  const toneLabel = getToneLabel(toneId);
  const lengthRange = LENGTH_RANGE[length];
  const chosenSubKeywords = (subKeywords || []).filter(Boolean).slice(0, 3);
  const customerTypeLabel = customerType?.trim() || target?.trim() || "개인";
  const workTypeLabel = workTypeCustom?.trim() || workType?.trim() || industryLabel;
  const storyText = story?.trim() || "(스토리 입력 없음)";

  const systemPrompt = `너는 네이버 SEO 기반 블로그 전문 카피라이터이자, 실제 제작 사례를 스토리텔링으로 설득력 있게 풀어내는 에디터다.
목표는 "전문성 + 친근함 + 신뢰"가 함께 느껴지는 브랜드형 콘텐츠를 만드는 것이다.
문체는 딱딱한 보고서가 아니라, 현장 경험을 들려주는 블로그 화법으로 작성한다.

[핵심 작성 규칙]
- A(도입)로 시작하고 G(마무리)로 끝난다. 중간(B~F)은 흐름에 맞게 유동 조정 가능.
- 스토리원문을 주 플롯으로 사용하고 감정선(급함/고민/불안/안도/만족)을 최소 3회 이상 드러낸다.
- 각 블록은 서로 다른 정보와 메시지를 전달한다. 동일 강점/표현 반복 금지.
- 문장 길이(짧음/중간/김)를 섞고, 문단 시작 표현을 반복하지 않는다.
- 메인키워드는 총 4~6회 자연 포함(제목 1회, 서론 1회, 본문 2~4회).
- 지역값이 있으면 제목 또는 서론에 1회 포함, 전체 최대 2회.
- CTA는 마지막 섹션에서 자연스럽게 제안형으로 1회 넣는다.
- 허위/검증 불가 표현은 금지하지만, 클릭 유도형 카피라이팅 문장은 허용한다.

[문체/표현 스타일]
- "안녕하세요", "이번 사례는", "많이 물어보시는 부분" 같은 친근한 오프닝을 사용할 수 있다.
- 핵심 포인트는 굵은 강조나 목록 형태로 가독성 있게 정리한다.
- 실제 상담 장면, 수정 과정, 고객 반응을 대화체 느낌으로 부분 반영해 생동감을 준다.
- 지나치게 무미건조한 설명문 톤은 피하고, 브랜드가 직접 말하는 듯한 톤을 유지한다.

[제목 규칙]
- 제목은 3개만 생성.
- 유형은 정보형/사례형/문제해결형 각각 1개.
- 모든 제목에서 메인키워드를 앞쪽에 1회 포함.
- 길이는 24~34자 내외.

[필수 본문 포인트]
- DTF 장점과 "작은 글씨 선명함" 문구를 반드시 포함.
- 차별점: 당일 제작 가능, 여성기업 인증, 예산 맞춤 단가, 관공서 경험.
- 이미지 가이드는 최소 10개.

[본문 포맷]
- body는 마크다운 스타일로 작성한다.
- 최소 4개 이상의 섹션 제목(## 또는 ###)을 사용해 가독성을 높인다.
- 필요 시 불릿 목록을 사용하되 남발하지 않는다.
- 마지막은 CTA 성격의 소제목으로 마무리 가능하다.

[출력]
설명 없이 JSON만 출력한다.`;

  const userPrompt = `아래 입력값으로 작성하세요.

[입력값]
- 메인키워드: ${mainKeyword}
- 고객유형: ${customerTypeLabel}
- 작업내용: ${workTypeLabel}
- 강조강점: ${strengthLabels.length ? strengthLabels.join(", ") : "(없음)"}
- 스토리원문: ${storyText}
- 목표글자수: ${length} (허용 범위 ${lengthRange.min}~${lengthRange.max})
- 지역: ${region || "(없음)"}
- 추가 타겟: ${target || "(없음)"}
- 말투 옵션: ${toneLabel}
- 사용자 제공 서브키워드(있으면 우선 반영): ${chosenSubKeywords.join(", ") || "(없음)"}

[톤 조정]
- 관공서/기업: 신뢰/절차/정확성 중심
- 개인/소상공인: 친근함/편의성 중심
- 급한 고객: 속도/대응력 중심

[중요]
- 결과물이 평범한 설명문처럼 보이지 않게, "실제 후기 기반 브랜드 콘텐츠" 느낌으로 작성한다.
- 첫 문단에서 독자의 고민을 정확히 찌르는 문장을 넣는다.
- 중간에는 "왜 우리를 선택했는지"가 자연스럽게 납득되도록 사례 디테일을 배치한다.
- 마지막 CTA는 부담 주지 않는 제안형 문장으로 작성하되, 문의로 이어질 수 있게 마무리한다.

[블록 구조]
A 도입부
B 고객 상황
C 우리를 선택한 이유
D 작업 과정
E 결과 및 퀄리티
F 차별점 강조
G 마무리

[JSON 스키마]
{
  "subKeywordSuggestions": ["...5개..."],
  "selectedSubKeywords": ["...3개..."],
  "titleCandidates": [
    {"type":"정보형","title":"..."},
    {"type":"사례형","title":"..."},
    {"type":"문제해결형","title":"..."}
  ],
  "body": "A~G가 반영된 본문",
  "imageGuide": [{"position":"B-2","description":"...","purpose":"...","altText":"..."}],
  "metaDescription": "...",
  "hashtags": ["...10개..."],
  "storyReflectionChecklist": {
    "coreEventUsed": true,
    "emotionsIncluded": ["급함","고민","만족"],
    "whereReflected": ["A","B","G"]
  },
  "qualityChecklist": {
    "lengthInRange": true,
    "mainKeywordCount_4to6": true,
    "regionalKeywordRulePassed": true,
    "noOverclaimExpressions": true,
    "noBlockDuplication": true,
    "ctaPlacedAtEndingOnly": true,
    "imageGuideCountOver10": true
  }
}`;

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
      subKeywordSuggestions?: unknown[];
      selectedSubKeywords?: unknown[];
      titleCandidates?: unknown[];
      body?: string;
      imageGuide?: unknown[];
      metaDescription?: string;
      hashtags?: unknown[];
      storyReflectionChecklist?: unknown;
      qualityChecklist?: unknown;
    };

    const titleCandidates: TitleCandidate[] = Array.isArray(parsed.titleCandidates)
      ? parsed.titleCandidates
          .map((item, index) => {
            if (typeof item === "object" && item !== null) {
              const type = (item as { type?: string }).type;
              const title = (item as { title?: string }).title;
              if (
                (type === "정보형" || type === "사례형" || type === "문제해결형") &&
                typeof title === "string" &&
                title.trim()
              ) {
                return { type, title: title.trim() } as TitleCandidate;
              }
            }
            if (typeof item === "string" && item.trim()) {
              const fallbackTypes: TitleCandidate["type"][] = ["정보형", "사례형", "문제해결형"];
              return { type: fallbackTypes[index] ?? "정보형", title: item.trim() } as TitleCandidate;
            }
            return null;
          })
          .filter((v): v is TitleCandidate => v !== null)
          .slice(0, 3)
      : [];
    const bodyText =
      typeof parsed.body === "string"
        ? parsed.body
        : "";
    const hashtags = Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .slice(0, 10)
          .map((h) => (typeof h === "string" ? h.replace(/^#/, "") : String(h)))
      : [];

    const subKeywordSuggestions = Array.isArray(parsed.subKeywordSuggestions)
      ? parsed.subKeywordSuggestions
          .map((k) => (typeof k === "string" ? k.trim() : ""))
          .filter(Boolean)
          .slice(0, 5)
      : [];

    const selectedSubKeywords = Array.isArray(parsed.selectedSubKeywords)
      ? parsed.selectedSubKeywords
          .map((k) => (typeof k === "string" ? k.trim() : ""))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    const imageGuide: ImageGuideItem[] = Array.isArray(parsed.imageGuide)
      ? parsed.imageGuide
          .map((item) => {
            if (typeof item !== "object" || item === null) return null;
            const position = (item as { position?: string }).position;
            const description = (item as { description?: string }).description;
            const purpose = (item as { purpose?: string }).purpose;
            const altText = (item as { altText?: string }).altText;
            if (
              typeof position === "string" &&
              typeof description === "string" &&
              typeof purpose === "string" &&
              typeof altText === "string"
            ) {
              return {
                position: position.trim(),
                description: description.trim(),
                purpose: purpose.trim(),
                altText: altText.trim(),
              };
            }
            return null;
          })
          .filter((v): v is ImageGuideItem => v !== null)
          .slice(0, 20)
      : [];

    return NextResponse.json({
      subKeywordSuggestions,
      selectedSubKeywords,
      titleCandidates,
      body: bodyText,
      imageGuide,
      metaDescription: typeof parsed.metaDescription === "string" ? parsed.metaDescription : "",
      hashtags,
      storyReflectionChecklist: parsed.storyReflectionChecklist ?? null,
      qualityChecklist: parsed.qualityChecklist ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI 요청 실패";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }
}
