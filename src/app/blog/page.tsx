"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  STRENGTH_OPTIONS,
  LENGTH_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/blog/templates";

interface BlogOutput {
  subKeywordSuggestions: string[];
  selectedSubKeywords: string[];
  titleCandidates: { type: string; title: string }[];
  body: string;
  imageGuide: { position: string; description: string; purpose: string; altText: string }[];
  metaDescription: string;
  hashtags: string[];
  storyReflectionChecklist?: {
    coreEventUsed?: boolean;
    emotionsIncluded?: string[];
    whereReflected?: string[];
  } | null;
  qualityChecklist?: Record<string, boolean> | null;
}

const CUSTOMER_TYPE_OPTIONS = [
  "단체",
  "개인",
  "기업",
  "관공서",
  "동호회",
  "학교",
  "학생",
  "헬스장",
  "기타",
] as const;

const WORK_TYPE_OPTIONS = [
  "DTF출력",
  "UV스티커",
  "스티커",
  "명함",
  "배너",
  "단체티셔츠",
  "작업조끼",
  "키링",
  "기타",
] as const;

const MAX_STRENGTH_PICKS = 5;

function BlogPageContent() {
  const searchParams = useSearchParams();
  const [mainKeyword, setMainKeyword] = useState("");
  /** 쉼표로 구분. 비우면 AI가 서브 키워드만 제안 */
  const [extraKeywords, setExtraKeywords] = useState("");
  const [customerType, setCustomerType] = useState<string>(CUSTOMER_TYPE_OPTIONS[0]);
  const [workType, setWorkType] = useState<string>(WORK_TYPE_OPTIONS[0]);
  const [workTypeCustom, setWorkTypeCustom] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [customStrength, setCustomStrength] = useState("");
  const [region, setRegion] = useState("");
  const [story, setStory] = useState("");
  const [length, setLength] = useState<1000 | 1500 | 2000>(1500);
  const [toneId, setToneId] = useState<string>(TONE_OPTIONS[0].id);
  const [result, setResult] = useState<BlogOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("keyword");
    if (q?.trim()) setMainKeyword(q.trim());
  }, [searchParams]);

  const toggleStrength = (id: string) => {
    setStrengths((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= MAX_STRENGTH_PICKS) return prev;
      return [...prev, id];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainKeyword.trim()) return;
    if (!story.trim()) {
      setError("스토리 내용을 입력해 주세요.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    const subKeywords = extraKeywords
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainKeyword: mainKeyword.trim(),
          subKeywords,
          customerType,
          workType,
          workTypeCustom: workTypeCustom.trim(),
          strengths,
          customStrength: customStrength.trim(),
          region: region.trim(),
          story: story.trim(),
          length,
          toneId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "생성에 실패했습니다.");
        return;
      }
      setResult({
        subKeywordSuggestions: data.subKeywordSuggestions ?? [],
        selectedSubKeywords: data.selectedSubKeywords ?? [],
        titleCandidates: data.titleCandidates ?? [],
        body: data.body ?? "",
        imageGuide: data.imageGuide ?? [],
        metaDescription: data.metaDescription ?? "",
        hashtags: data.hashtags ?? [],
        storyReflectionChecklist: data.storyReflectionChecklist ?? null,
        qualityChecklist: data.qualityChecklist ?? null,
      });
    } catch {
      setError("네트워크 오류가 났습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      alert("복사되었습니다.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          HOME
        </Link>
        <h1 className="text-xl font-semibold text-slate-800">네이버 SEO 블로그 글 생성</h1>
        <span className="w-14" />
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">키워드</h2>
            <p className="text-xs text-slate-500 mb-4">
              서브 키워드는 비워도 됩니다. AI가 메인 키워드로 5개를 제안하고, 그중 3개를 골라 본문에 씁니다.
            </p>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-slate-500">메인 키워드 (필수)</span>
                <input
                  type="text"
                  value={mainKeyword}
                  onChange={(e) => setMainKeyword(e.target.value)}
                  placeholder="예: 스티커 제작"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">참고 키워드 (선택, 쉼표로 구분)</span>
                <input
                  type="text"
                  value={extraKeywords}
                  onChange={(e) => setExtraKeywords(e.target.value)}
                  placeholder="예: 단체조끼, 로고인쇄, 부산"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">누구 · 무엇 · 어디</h2>
            <p className="text-xs text-slate-500 mb-4">
              예전 화면의 &quot;업종 템플릿&quot;은 작업 종류와 겹쳐 혼란을 줄 수 있어 제거했습니다. 품목은 작업 내용(또는 기타 입력)에만 맞추면 됩니다.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500">고객 유형</span>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {CUSTOMER_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">지역 (선택)</span>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="예: 부산"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs text-slate-500">작업 · 품목</span>
                <select
                  value={workType}
                  onChange={(e) => setWorkType(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {WORK_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {workType === "기타" && (
                <label className="block">
                  <span className="text-xs text-slate-500">품목 직접 입력</span>
                  <input
                    type="text"
                    value={workTypeCustom}
                    onChange={(e) => setWorkTypeCustom(e.target.value)}
                    placeholder="예: 아크릴 굿즈, 안내판"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
              )}
              <div>
                <span className="text-xs text-slate-500 block mb-1">
                  강점 (최대 {MAX_STRENGTH_PICKS}개)
                </span>
                <p className="text-xs text-amber-700/90 mb-2">
                  너무 많이 고르면 글이 &quot;체크리스트&quot;처럼 딱딱해질 수 있어요. 꼭 쓰고 싶은 것만 골라 주세요.
                </p>
                <div className="flex flex-wrap gap-2">
                  {STRENGTH_OPTIONS.map((o) => (
                    <label key={o.id} className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={strengths.includes(o.id)}
                        onChange={() => toggleStrength(o.id)}
                        disabled={!strengths.includes(o.id) && strengths.length >= MAX_STRENGTH_PICKS}
                        className="rounded border-slate-300 disabled:opacity-40"
                      />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="block">
                <span className="text-xs text-slate-500">강점 한 줄 메모 (선택)</span>
                <input
                  type="text"
                  value={customStrength}
                  onChange={(e) => setCustomStrength(e.target.value)}
                  placeholder="예: 여성기업 인증, AI 로고 복원 경험"
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">스토리 원문</h2>
            <label className="block">
              <span className="text-xs text-slate-500">실제 고객 상황/감정/요청 내용을 자세히 입력</span>
              <textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="예: 행사 일정이 이틀 남아 급하게 단체티를 준비해야 했고, 이전 업체는 답변이 늦어서..."
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 min-h-40"
                required
              />
            </label>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">글 길이 · 말투</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-xs text-slate-500">글 길이</span>
                <select
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value) as 1000 | 1500 | 2000)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {LENGTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">말투</span>
                <select
                  value={toneId}
                  onChange={(e) => setToneId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {TONE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          {error && (
            <p className="text-red-600 text-sm py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "OpenAI로 글 생성 중…" : "블로그 글 생성하기"}
          </button>
        </form>

        {result && (
          <div className="mt-8 space-y-6">
            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">제목 후보 3개</h2>
              <ul className="space-y-2">
                {result.titleCandidates.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50"
                  >
                    <span className="text-sm text-slate-800">
                      [{t.type}] {t.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(t.title)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      복사
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">서브 키워드 추천/선택</h2>
              <p className="text-xs text-slate-500 mb-2">추천 5개</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.subKeywordSuggestions.map((k, i) => (
                  <span key={`${k}-${i}`} className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700">
                    {k}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mb-2">본문 반영 3개</p>
              <div className="flex flex-wrap gap-2">
                {result.selectedSubKeywords.map((k, i) => (
                  <span key={`${k}-${i}`} className="px-2 py-1 bg-blue-50 rounded text-sm text-blue-700">
                    {k}
                  </span>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-700">본문</h2>
                <button
                  type="button"
                  onClick={() => copyToClipboard(result.body)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  전체 복사
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm text-slate-700 leading-relaxed border border-slate-200 rounded-lg p-4 bg-slate-50 max-h-[480px] overflow-y-auto">
                {result.body}
              </div>
              <p className="mt-2 text-xs text-slate-500">약 {result.body.length}자</p>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">이미지 가이드</h2>
              <div className="space-y-3">
                {result.imageGuide.map((img, i) => (
                  <div key={`${img.position}-${i}`} className="rounded-lg border border-slate-200 p-3 bg-slate-50">
                    <p className="text-xs text-slate-500">{img.position}</p>
                    <p className="text-sm text-slate-800 mt-1">{img.description}</p>
                    <p className="text-xs text-slate-600 mt-1">의도: {img.purpose}</p>
                    <p className="text-xs text-slate-600 mt-1">ALT: {img.altText}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">해시태그 10개</h2>
              <div className="flex flex-wrap gap-2">
                {result.hashtags.map((h, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700"
                  >
                    #{h}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(result.hashtags.map((h) => `#${h}`).join(" "))}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                해시태그 복사
              </button>
            </section>

            {result.metaDescription && (
              <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">메타 설명</h2>
                <p className="text-sm text-slate-700">{result.metaDescription}</p>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-500">로딩 중...</div>}>
      <BlogPageContent />
    </Suspense>
  );
}
