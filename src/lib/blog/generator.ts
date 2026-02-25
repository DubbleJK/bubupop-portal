/**
 * 네이버 블로그 글 생성
 * - 서론(훅) → 정보/과정 → 강점 → 📸 자리 → FAQ → 마무리
 * - 과장 표현 없음
 */

import {
  getHook,
  getProcess,
  getFaq,
  getEnding,
  STRENGTH_PHRASES,
} from "./templates";

export interface BlogInput {
  mainKeyword: string;
  subKeywords: string[];
  industryId: string;
  strengths: string[];
  region: string;
  target: string;
  length: 1000 | 1500 | 2000;
  toneId: string;
}

export interface BlogOutput {
  titleCandidates: string[];
  body: string;
  hashtags: string[];
}

const PHOTO_PLACEHOLDER = "📸 여기에 사진";

function seedFromKeyword(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

function pickIndex(seed: number, max: number, offset: number): number {
  return ((seed + offset) % max + max) % max;
}

export function generateBlogPost(input: BlogInput): BlogOutput {
  const {
    mainKeyword,
    subKeywords,
    industryId,
    strengths,
    region,
    target,
    length,
  } = input;

  const seed = seedFromKeyword(mainKeyword + industryId + region);
  const hook = getHook(industryId, pickIndex(seed, 5, 0));
  const process1 = getProcess(industryId, pickIndex(seed, 5, 1));
  const process2 = getProcess(industryId, pickIndex(seed, 5, 2));
  const faq1 = getFaq(industryId, pickIndex(seed, 5, 3));
  const faq2 = getFaq(industryId, pickIndex(seed, 5, 4));
  const ending = getEnding(industryId, pickIndex(seed, 5, 5));

  const regionTarget =
    [region, target].filter(Boolean).join(" ") || "고객";
  const strengthTexts = strengths
    .map((id) => STRENGTH_PHRASES[id])
    .filter(Boolean);

  // 제목 후보 5개
  const titleCandidates = [
    `${region} ${mainKeyword} ${target ? target + " " : ""}부담 없이 문의하세요`,
    `${mainKeyword} 소량·당일 제작 ${region}에서`,
    `${region} ${mainKeyword} 견적·상담 빠르게`,
    `${mainKeyword} 필요하시면 ${region}에서 맞춤 제작`,
    `${region} ${target || "고객"}을 위한 ${mainKeyword} 제작`,
  ].slice(0, 5);

  // 본문 조합: 서론 → 과정 → 강점 → 📸 → FAQ → 마무리
  const parts: string[] = [];

  // 서론 (공감 훅)
  parts.push(`${mainKeyword}${subKeywords.length ? `, ${subKeywords.slice(0, 3).join(", ")}` : ""} 관련해서요. ${hook} ${regionTarget} 분들도 많이 찾아 주셔서, 간단히 안내해 드립니다.`);
  parts.push(PHOTO_PLACEHOLDER);

  // 정보/과정
  parts.push(process1);
  if (length >= 1500) parts.push(process2);
  parts.push(PHOTO_PLACEHOLDER);

  // 강점 (선택된 것만)
  if (strengthTexts.length > 0) {
    parts.push(strengthTexts.join(" "));
    parts.push(PHOTO_PLACEHOLDER);
  }

  // FAQ
  parts.push(`자주 묻는 질문으로 정리해 보았어요.`);
  parts.push(`Q. ${faq1.q}\nA. ${faq1.a}`);
  parts.push(`Q. ${faq2.q}\nA. ${faq2.a}`);
  parts.push(PHOTO_PLACEHOLDER);

  // 마무리/문의유도
  parts.push(ending);
  parts.push(PHOTO_PLACEHOLDER);

  let body = parts.join("\n\n");

  // 목표 글자 수에 맞춰 조절 (대략)
  const targetLen = length;
  const currentLen = body.length;
  if (currentLen > targetLen * 1.3 && body.includes(process2)) {
    body = parts.filter((p) => p !== process2).join("\n\n");
  }
  if (currentLen < targetLen * 0.7 && length >= 1500) {
    const extra = getProcess(industryId, pickIndex(seed, 5, 0));
    const idx = body.indexOf(PHOTO_PLACEHOLDER);
    if (idx !== -1) body = body.slice(0, idx) + "\n\n" + extra + "\n\n" + body.slice(idx);
  }

  // 해시태그 10개
  const baseTags = [
    mainKeyword,
    ...subKeywords.slice(0, 3),
    region,
    "인쇄",
    "맞춤제작",
    "당일제작",
    "소량인쇄",
  ].filter(Boolean);
  const extraTags = [
    "부산인쇄",
    "스티커제작",
    "배너제작",
    "DTF",
    "실사출력",
    "견적문의",
  ];
  const hashtags = [...new Set([...baseTags, ...extraTags])].slice(0, 10);

  return { titleCandidates, body, hashtags };
}
