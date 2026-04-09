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
  /** 사용자가 추천 목록에서 선택한 서브 키워드 (본문 반영) */
  subKeywords: string[];
  /** 추천 API로 받은 5개 풀 — 응답에 그대로 돌려줌 */
  subKeywordPool?: string[];
  /** UI에서 제거됨 — 없으면 작업 종류로 추론 */
  industryId?: string;
  industryCustom?: string;
  strengths: string[];
  customStrength?: string;
  customerType?: string;
  /** 고객 유형이 "기타"일 때 직접 입력 */
  customerTypeCustom?: string;
  workType?: string;
  workTypeCustom?: string;
  story?: string;
  region: string;
  /** 구버전 호환 (폼에서는 미사용) */
  target?: string;
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

/** 작업 종류만으로 업종 힌트 추론 (업종 템플릿 UI 제거 대응) */
function deriveIndustryIdFromWorkType(workType?: string, workTypeCustom?: string): string {
  const w =
    (workType === "기타" ? workTypeCustom : workType)?.trim() || "";
  if (w.includes("DTF")) return "dtf";
  if (w.includes("UV")) return "uv";
  if (w.includes("스티커")) return "sticker";
  if (w.includes("배너")) return "banner";
  if (w.includes("명함")) return "menu";
  if (w.includes("티") || w.includes("조끼")) return "apparel";
  if (w.includes("키링")) return "sticker";
  return "dtf";
}

function getBrandName(): string {
  const n = process.env.BLOG_BRAND_NAME?.trim();
  return n && n.length > 0 ? n : "부부피오피(Booboo POP)";
}

/** 목표 글자 수 대비 ±5% (한글 기준) */
function lengthRangeFor(target: 1000 | 1500 | 2000): { min: number; max: number } {
  return {
    min: Math.round(target * 0.95),
    max: Math.round(target * 1.05),
  };
}

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
    subKeywordPool,
    industryId,
    industryCustom,
    strengths,
    customStrength,
    customerType,
    customerTypeCustom,
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

  const poolFromRequest = (Array.isArray(subKeywordPool) ? subKeywordPool : [])
    .map((k) => (typeof k === "string" ? k.trim() : ""))
    .filter(Boolean)
    .slice(0, 5);

  if (poolFromRequest.length !== 5) {
    return NextResponse.json(
      {
        error:
          "서브 키워드 추천을 먼저 받아 주세요. 메인 키워드 입력 후 「서브 키워드 추천」을 눌러 5개 목록을 만든 뒤, 사용할 키워드를 선택하세요.",
      },
      { status: 400 }
    );
  }

  const chosenSubKeywords = (subKeywords || []).map((k) => k.trim()).filter(Boolean).slice(0, 3);
  if (chosenSubKeywords.length < 1 || chosenSubKeywords.length > 3) {
    return NextResponse.json(
      { error: "참고(서브) 키워드는 1~3개 선택해 주세요." },
      { status: 400 }
    );
  }
  const poolSet = new Set(poolFromRequest);
  if (!chosenSubKeywords.every((k) => poolSet.has(k))) {
    return NextResponse.json(
      { error: "선택한 서브 키워드가 추천 목록과 일치하지 않습니다. 페이지를 새로고침한 뒤 다시 추천받아 주세요." },
      { status: 400 }
    );
  }

  const ctEarly = customerType?.trim() || "";
  if (ctEarly === "기타" && !customerTypeCustom?.trim()) {
    return NextResponse.json(
      { error: "고객 유형이 기타일 때 유형을 직접 입력해 주세요." },
      { status: 400 }
    );
  }
  if (workType === "기타" && !workTypeCustom?.trim()) {
    return NextResponse.json(
      { error: "작업·품목이 기타일 때 품목을 직접 입력해 주세요." },
      { status: 400 }
    );
  }

  const brandName = getBrandName();
  const resolvedIndustryId =
    industryId?.trim() || deriveIndustryIdFromWorkType(workType, workTypeCustom);
  const industryLabel =
    industryCustom?.trim() || getIndustryLabel(resolvedIndustryId);
  const strengthCheckboxLabels = getStrengthLabels(strengths);
  const customMemo = customStrength?.trim() ?? "";
  const strengthHintMerged =
    [
      ...strengthCheckboxLabels,
      ...(customMemo ? [customMemo] : []),
    ].join(" · ") || "(강점 미선택 — 스토리에서 자연스럽게 드러나는 장점만 쓸 것)";
  const toneLabel = getToneLabel(toneId);
  const lengthRange = lengthRangeFor(length);
  const ct = customerType?.trim() || "";
  const customerTypeLabel =
    ct === "기타"
      ? customerTypeCustom?.trim() || target?.trim() || "고객"
      : ct || target?.trim() || "개인";
  const workTypeLabel =
    workType === "기타"
      ? workTypeCustom?.trim() || industryLabel
      : workType?.trim() || industryLabel;
  const storyText = story?.trim() || "(스토리 입력 없음)";

  const systemPrompt = `너는 네이버 SEO 블로그용 "브랜드 스토리텔링" 전문 카피라이터다.
목표: 클릭을 부르는 제목, 읽기 쉬운 소제목·불릿, 생생한 사례, 마지막 CTA까지 한 흐름으로 완성한다.

[톤·말맛 — 매우 중요]
- 딱딱한 제안서/보도자료체 금지. "~습니다/~드립니다"만 잇따라 쓰지 말고, **해요체·했어요체·가끔은 짧은 반말 뉘앙스의 문장**을 섞어 블로그답게 쓴다.
- "저희는", "또한,", "이에 따라", "많은 분들이"로 문단을 연속해서 시작하지 않는다. 문장 첫 표현을 매 섹션마다 바꾼다.
- 독자에게 말 거는 느낌(물음표 1~2회, 완곡한 말버릇, 공감 한마디)을 허용한다. 과장·허위는 금지.
- 인증·당일·예산·장비 같은 강점을 **한 문단에 나열해 광고 전단지처럼 읽히게 하지 말 것**. 스토리 흐름 속에서 1~2개만 자연스럽게.

[브랜드]
- 본문 서두(첫 번째 \`###\` 소제목 이전, 1~2문단)에서 브랜드명을 자연스럽게 1회 이상 소개한다. 브랜드명은 입력값으로 주어진다.

[스토리 원문 — 최우선]
- 스토리원문에 나온 구체 정보(누가, 무엇을, 왜, 어떤 말을 했는지, 감정)를 반드시 반영한다.
- 스토리에 없는 사실·대화·수치를 지어내지 않는다. 비어 있거나 "(스토리 입력 없음)"이면 일반 상담 시나리오로만 쓰지 말고, 독자 공감형 일반 서술로 시작한다.
- 매번 비슷한 뼈대 문장을 복붙하지 말고, 스토리 원문의 어휘·상황에 맞춰 문장 구조와 에피소드 순서를 바꾼다.

[서브 키워드]
- 사용자가 선택한 참고(서브) 키워드(보통 1~3개)는 각각 본문에 최소 1회씩 자연스럽게 녹인다. 억지 나열·한 문장에 몰아쓰기 금지.

[강점 체크박스 vs 강점 한 줄 메모]
- 체크박스로 받은 강점 "라벨" 각각: 본문에 키워드·주제로 최소 1회 이상 반영한다 (한 줄로 읽히게 나열하지 말고 문맥에 녹인다).
- "강점 한 줄 메모"에 적힌 문구가 있으면, 체크박스 강점과 동일한 비중으로 본문에 반드시 반영한다. 메모에 쉼표로 여러 키워드가 있으면 각각이 본문 어딘가에 등장하도록 한다.
- 의미가 겹치는 강점은 하나의 테마로 합쳐 서술한다.

[제목 titleCandidates 3개]
- 유형: 정보형 / 사례형 / 문제해결형 각 1개.
- 패턴: 맨 앞에 대괄호 훅 — \`[메인키워드 또는 메인의 짧은 핵심]\` + 공백 + 클릭 유도 문구.
- 메인키워드는 제목 본문에도 자연 포함 (대괄호 안 또는 뒤).
- 길이 28~42자 내외.

[본문 body — 마크다운]
- 첫머리: 인사 + 브랜드 소개 1~2문단 (## 전에 일반 문단으로).
- 본문은 반드시 \`### 1. ...\`, \`### 2. ...\`, \`### 3. ...\` 형태의 번호 있는 소제목을 사용한다 (내용에 맞게 소제목 문구는 새로 짓는다).
- 그 중 한 섹션은 서브 키워드·기술(DTF 등)·품질 중심으로, 불릿 목록을 쓴다. 불릿 각 줄에는 핵심 구를 **굵게** 1곳 이상 넣는다.
- 마지막 CTA는 \`### 💡\` 로 시작하는 소제목을 쓴다. 아래를 포함한다:
  · 독자 고민 번호 목록(1. 2. 3.) 3개
  · \`* **상담 문의:** [네이버 톡톡 / 전화번호 입력]\`
  · \`* **위치:** [지역 방문 상담 문구 — 지역 입력값 반영 가능 시 반영, 없으면 플레이스홀더]\`
  · \`* **제작 사례 더 보기:** [인스타그램/블로그 링크]\`
  · 한 줄 슬로건을 **굵게**로 마무리
- 본문 끝에 해시태그 줄을 넣지 않는다 (해시태그는 JSON hashtags만).

[본문 글자 수]
- body 본문만 해당. 공백·줄바꿈 제외한 글자 수가 목표 ${length}자의 ±5% (${lengthRange.min}~${lengthRange.max}) 안에 들어가게 쓴다.

[SEO·기타]
- 메인키워드 본문(제목 제외) 총 4~6회 자연 포함.
- 지역값이 있으면 제목 또는 서두에 최대 1회, 본문 전체 최대 2회.
- DTF는 작업·품목 맥락에 맞을 때만 언급. 아니면 해당 공정에 맞는 표현으로 대체.
- 내부용 블록 라벨(A 도입부 등) 금지.
- 이미지 가이드 imageGuide는 최소 10개.

[출력]
설명 없이 JSON만 출력한다.`;

  const userPrompt = `아래 입력값으로 작성하세요.

[입력값]
- 브랜드명: ${brandName}
- 메인키워드: ${mainKeyword}
- 사용자 선택 참고 키워드 1~3개(각각 본문에 최소 1회): ${chosenSubKeywords.join(", ")}
- 고객유형: ${customerTypeLabel}
- 작업·품목: ${workTypeLabel}
- 체크박스 강점 라벨: ${strengthCheckboxLabels.join(", ") || "(없음)"}
- 강점 한 줄 메모(있으면 체크박스와 동일 비중으로 본문 키워드 반영): ${customMemo || "(없음)"}
- 강점 통합 참고(나열용이 아님): ${strengthHintMerged}
- 스토리원문: ${storyText}
- 목표글자수: ${length} (본문 body 기준 공백 제외 한글 글자 수가 목표의 **±5%** 이내, 즉 ${lengthRange.min}~${lengthRange.max}자)
- 지역: ${region || "(없음)"}
- 말투·톤: "${toneLabel}" + 고객유형 "${customerTypeLabel}"
  · 관공서/기업: 신뢰·절차·정확성
  · 개인/단체 등: 친근함·편의성
  · 스토리에 급함이 있으면 대응 속도·소통을 자연스럽게

[JSON 스키마 — 이 키만 출력]
{
  "titleCandidates": [
    {"type":"정보형","title":"..."},
    {"type":"사례형","title":"..."},
    {"type":"문제해결형","title":"..."}
  ],
  "body": "마크다운 본문",
  "imageGuide": [{"position":"B-2","description":"...","purpose":"...","altText":"..."}],
  "metaDescription": "...",
  "hashtags": ["...10개..."],
  "storyReflectionChecklist": {
    "coreEventUsed": true,
    "emotionsIncluded": ["급함","고민","만족"],
    "whereReflected": ["서두","본문1","CTA"]
  },
  "qualityChecklist": {
    "lengthInRange": true,
    "mainKeywordCount_4to6": true,
    "regionalKeywordRulePassed": true,
    "noOverclaimExpressions": true,
    "noBlockDuplication": true,
    "ctaPlacedAtEndingOnly": true,
    "imageGuideCountOver10": true,
    "subKeywordsEachUsedInBody": true,
    "customStrengthMemoReflected": true
  }
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.92,
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
      subKeywordSuggestions: poolFromRequest,
      selectedSubKeywords: chosenSubKeywords,
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
