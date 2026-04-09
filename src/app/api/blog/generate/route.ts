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
          "참고 키워드 5개가 필요합니다. 메인 키워드 입력 후 「확정」을 누른 뒤, 사용할 키워드를 선택하세요.",
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

  const systemPrompt = `너는 네이버 SEO 기반 블로그 전문 카피라이터이자, 실제 제작 사례를 스토리텔링으로 설득력 있게 풀어내는 에디터다.
목표는 "전문성 + 친근함 + 신뢰"가 함께 느껴지는 브랜드형 콘텐츠다. **너무 건조한 보고서체와, 과한 홈쇼핑·낚시성 과장의 가운데** 균형을 잡는다.

[톤·문체 — 중간 밸런스]
- "${toneLabel}" 톤을 기준으로 **해요체·했어요체**를 충분히 써서 블로그답게 읽히게 하되, **합니다체**도 섞어 신뢰감을 유지한다. (해요체만으로 끝까지 가지도, 보고서체만으로 가지도 않는다.)
- 독자에게 말 거는 느낌(물음표 1~2회, 공감 한마디, 상담 장면 한 컷)은 **적극 허용**한다. 허위·검증 불가 주장은 금지.
- "완벽한" "최고의" "확실한" 같은 표현은 **문서 전체에서 남발하지 말고** 정말 쓸 곳에만 1회 정도.
- "저희는" "또한"으로 문단을 연달아 시작하지 않는다. 강점·혜택은 **광고 전단처럼 한 문단에 몰지 말고** 스토리 속에 1~2가지만 녹인다.
- 문장 길이를 섞고, 가볍게 읽히는 리듬을 유지한다.

[브랜드]
- 본문 서두(첫 번째 \`###\` 소제목 이전, 1~2문단)에서 브랜드명을 자연스럽게 1회 이상 소개한다.

[스토리 원문 — 최우선]
- 입력에 \`[고객 상황]\` \`[걱정·문의]\` \`[기억에 남는 장면]\` \`[고객 칭찬·반응]\` \`[추가 메모]\` 같은 머리글이 붙어 있을 수 있다. **각 블록 내용을 모두 활용**하되, 본문에 머리글 문자열을 그대로 출력하지 않는다.
- 스토리의 구체 정보(누가, 무엇을, 왜, 감정, 칭찬)를 반영한다. 없는 사실·대화·수치를 지어내지 않는다.
- "(스토리 입력 없음)"이면 독자 공감형 일반 서술로 시작한다.
- 매번 같은 뼈대 문장을 쓰지 말고 스토리에 맞게 구조를 바꾼다.

[서브 키워드]
- 사용자가 선택한 참고 키워드(1~3개)는 각각 본문에 최소 1회 자연스럽게 녹인다.

[강점·메모]
- 체크박스 강점 라벨은 각각 문맥에 녹인다. 강점 한 줄 메모 문구는 체크박스와 동일 비중으로 반영한다(쉼표로 여러 개면 각각 등장). 나열 금지, 의미 겹치면 한 테마로 합친다.

[제목 titleCandidates 3개 — 본문과 별개, 홈쇼핑 방송 자막 체]
- **본문 톤과 무관하게**, 제목 3개만 **텔레홈쇼핑·특가 방송 자막**처럼 눈에 확 들어오게 쓴다. (본문은 아래 [톤·문체]를 따른다.)
- 유형: **정보형 / 사례형 / 문제해결형** 각 1개. type 필드에 정확히 이 문자열을 쓴다.
- **메인키워드**는 3개 모두에 **반드시** 넣고, **앞쪽(대괄호 안 또는 첫 14~20자 안)** 에 두어 검색·모바일 미리보기에 키워드가 보이게 한다.
- 형식: \`[메인키워드 또는 키워드+한 단어 훅]\` + 공백 + **자극적이고 리듬감 있는** 후반부. **느낌표(!)** 를 1~2개 써도 좋다.
- 홈쇼핑체 요소(과하게 써도 됨): 짧은 구호(한 번에!, 지금 확인!, 놓치면 아까워요!, 이거면 끝! 등), 반복·리듬, 혜택·반전·궁금증을 **한 줄에 압축**. **거짓·검증 불가 약속·선정성·낚시 클릭베이트**만 금지.
- 유형별 각도(여전히 홈쇼핑 에너지 유지):
  · 정보형: 알짜 정보·꿀팁·체크리스트 느낌 + 키워드 + 자막 리듬
  · 사례형: 실제 같은 스릴·반전·결과 암시 + 키워드
  · 문제해결형: 고민 폭발 → 해결 힌트 + 키워드
- 길이 **28~48자**(공백·느낌표 포함). 3개는 **서로 문장 패턴이 겹치지 않게** 다르게 짠다.

[본문 body — 마크다운]
- 첫머리: 인사 + 브랜드 소개 1~2문단.
- \`### 1.\` \`### 2.\` \`### 3.\` 번호 소제목 필수. 한 섹션은 불릿을 쓰되 과하지 않게; 필요한 줄만 **굵게**.
- **이미지 삽입 안내(본문에만, JSON 별도 필드 없음):** 아래 문구를 **단독 한 줄**로 **정확히 10회 이상** 본문 안에 넣는다. 소제목 사이·문단 사이에 고르게 배치하고 연속 두 줄에 붙이지 않는다.
  문구(그대로): \`📷 **이곳에 이미지를 넣으세요.**\`
- 마지막 CTA: \`### 💡\` 로 시작하는 소제목 아래에 **독자 고민 번호 목록(1. 2. 3.)** 만 쓴다.
- CTA 안에 **상담 문의·전화·톡톡·주소·위치·SNS·링크·플레이스홀더 문구는 절대 넣지 않는다.**
- 번호 목록 다음에 **한 줄 슬로건**만 **굵게**로 마무리한다.
- 본문 끝에 해시태그 줄 금지(JSON hashtags만).

[본문 글자 수 — 이미지 안내 줄은 글자 수 제외]
- body 안에 \`📷 **이곳에 이미지를 넣으세요.**\` 를 **단독 한 줄**로 10회 이상 넣는다 (문자·공백·굵게 표기까지 **이 문자열과 동일**).
- **목표 글자 수 ${length}자의 ±5% (${lengthRange.min}~${lengthRange.max})** 는 **위 이미지 안내 줄을 전부 제외하고** 셀 때만 적용한다. (= 이미지 안내 한 줄은 글자 수 **0자**로 친다.)
- 작성 순서: **먼저** 본연의 글(인사·### 소제목·문단·불릿·CTA)만으로 분량을 맞춘 뒤, **그 사이**에 이미지 안내 줄을 끼워 넣는다.

[SEO·기타]
- 메인키워드 본문(제목 제외) 4~6회 자연 포함.
- 지역은 제목 또는 서두 최대 1회, 본문 전체 최대 2회.
- DTF는 맥락에 맞을 때만.
- 내부 블록 라벨 금지.

[출력]
설명 없이 JSON만 출력한다. imageGuide 필드는 출력하지 않는다.`;

  const userPrompt = `아래 입력값으로 작성하세요.

[입력값]
- 브랜드명: ${brandName}
- 메인키워드(본문·제목 모두 반영, 제목에서는 앞쪽에 두기): ${mainKeyword}
- 사용자 선택 참고 키워드 1~3개(각각 본문에 최소 1회): ${chosenSubKeywords.join(", ")}
- 고객유형: ${customerTypeLabel}
- 작업·품목: ${workTypeLabel}
- 체크박스 강점 라벨: ${strengthCheckboxLabels.join(", ") || "(없음)"}
- 강점 한 줄 메모(있으면 체크박스와 동일 비중으로 본문 키워드 반영): ${customMemo || "(없음)"}
- 강점 통합 참고(나열용이 아님): ${strengthHintMerged}
- 스토리원문(아래는 사용자가 항목별로 적었을 수 있음. 대괄호 머리글은 구분용이며 글에 그대로 노출하지 말 것): ${storyText}
- 목표글자수: ${length} — 이미지 안내 한 줄(문자열 그대로: 📷 굵게 처리한 「이곳에 이미지를 넣으세요.」)은 글자 수에서 0자로 치고, 그 외 본문만 공백·줄바꿈 제외 ${lengthRange.min}~${lengthRange.max}자
- 지역: ${region || "(없음)"}
- 말투·톤: "${toneLabel}" + 고객유형 "${customerTypeLabel}"
  · 관공서/기업: 신뢰·절차·정확성
  · 개인/단체 등: 친근함·편의성
  · 스토리에 급함이 있으면 대응 속도·소통을 자연스럽게

[재확인]
- 제목 3개: **홈쇼핑 자막 체**·메인키워드 앞쪽·대괄호 훅·유형별 차별·28~48자·느낌표 허용.
- 본문: 이미지 안내 줄 10회 이상, **글자 수는 이미지 줄 제외** 후 ${lengthRange.min}~${lengthRange.max}자.
- CTA(### 💡)에는 고민 번호 3개 + 굵은 슬로건만. 상담/전화/톡톡/위치/SNS/링크 문구는 넣지 말 것.

[JSON 스키마 — 이 키만 출력. imageGuide 키는 넣지 않는다.]
{
  "titleCandidates": [
    {"type":"정보형","title":"..."},
    {"type":"사례형","title":"..."},
    {"type":"문제해결형","title":"..."}
  ],
  "body": "마크다운 본문(이미지 안내 줄 10회 이상, 해당 줄은 본문 글자 수에서 제외)",
  "metaDescription": "...",
  "hashtags": ["...10개..."],
  "storyReflectionChecklist": {
    "coreEventUsed": true,
    "emotionsIncluded": ["급함","고민","만족"],
    "whereReflected": ["서두","본문1","CTA"]
  },
  "qualityChecklist": {
    "lengthInRange": true,
    "bodyLengthExcludesImagePlaceholderLines": true,
    "mainKeywordCount_4to6": true,
    "regionalKeywordRulePassed": true,
    "noOverclaimExpressions": true,
    "noBlockDuplication": true,
    "ctaPlacedAtEndingOnly": true,
    "ctaNoContactOrLinkLines": true,
    "bodyImagePlaceholdersAtLeast10": true,
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
      temperature: 0.9,
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

    return NextResponse.json({
      subKeywordSuggestions: poolFromRequest,
      selectedSubKeywords: chosenSubKeywords,
      titleCandidates,
      body: bodyText,
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
