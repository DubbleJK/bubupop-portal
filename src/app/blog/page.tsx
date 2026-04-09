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
  metaDescription: string;
  hashtags: string[];
  storyReflectionChecklist?: {
    coreEventUsed?: boolean;
    emotionsIncluded?: string[];
    whereReflected?: string[];
  } | null;
  qualityChecklist?: Record<string, boolean> | null;
}

/** select에서 `기타`는 value 충돌·인코딩 이슈를 피하려고 별도 값 사용 */
const SELECT_OTHER = "other";

const CUSTOMER_TYPE_OPTIONS = [
  "단체",
  "개인",
  "기업",
  "관공서",
  "동호회",
  "학교",
  "학생",
  "헬스장",
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
] as const;

const MAX_STRENGTH_PICKS = 5;
const MAX_SUB_KEYWORDS = 3;

function BlogPageContent() {
  const searchParams = useSearchParams();
  const [mainKeyword, setMainKeyword] = useState("");
  const [subKeywordPool, setSubKeywordPool] = useState<string[]>([]);
  const [selectedSubKeywords, setSelectedSubKeywords] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  /** 추천 API를 호출했을 때의 메인 키워드 — 수정 후 블러 시 비교해 풀 초기화 */
  const [lastSuggestedMain, setLastSuggestedMain] = useState("");
  const [customerType, setCustomerType] = useState<string>(CUSTOMER_TYPE_OPTIONS[0] as string);
  const [customerTypeCustom, setCustomerTypeCustom] = useState("");
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

  const toggleSubKeyword = (k: string) => {
    setSelectedSubKeywords((prev) => {
      if (prev.includes(k)) return prev.filter((x) => x !== k);
      if (prev.length >= MAX_SUB_KEYWORDS) return prev;
      return [...prev, k];
    });
  };

  const fetchSubKeywordSuggestions = async () => {
    if (!mainKeyword.trim()) {
      setError("메인 키워드를 먼저 입력해 주세요.");
      return;
    }
    setSuggestLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/blog/suggest-subkeywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainKeyword: mainKeyword.trim(),
          region: region.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "서브 키워드 추천에 실패했습니다.");
        return;
      }
      setSubKeywordPool(data.suggestions ?? []);
      setSelectedSubKeywords([]);
      setLastSuggestedMain(mainKeyword.trim());
    } catch {
      setError("네트워크 오류가 났습니다. 다시 시도해 주세요.");
    } finally {
      setSuggestLoading(false);
    }
  };

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
    if (customerType === SELECT_OTHER && !customerTypeCustom.trim()) {
      setError("고객 유형이 기타일 때 유형을 직접 입력해 주세요.");
      return;
    }
    if (workType === SELECT_OTHER && !workTypeCustom.trim()) {
      setError("작업·품목이 기타일 때 품목을 직접 입력해 주세요.");
      return;
    }
    if (subKeywordPool.length !== 5) {
      setError("메인 키워드 입력 후 「확정」을 눌러 참고 키워드 5개를 만든 뒤 진행해 주세요.");
      return;
    }
    if (selectedSubKeywords.length < 1 || selectedSubKeywords.length > MAX_SUB_KEYWORDS) {
      setError(`참고 키워드는 1~${MAX_SUB_KEYWORDS}개 선택해 주세요.`);
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainKeyword: mainKeyword.trim(),
          subKeywords: selectedSubKeywords,
          subKeywordPool,
          customerType: customerType === SELECT_OTHER ? "기타" : customerType,
          customerTypeCustom:
            customerType === SELECT_OTHER ? customerTypeCustom.trim() : undefined,
          workType: workType === SELECT_OTHER ? "기타" : workType,
          workTypeCustom: workType === SELECT_OTHER ? workTypeCustom.trim() : undefined,
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
              메인 키워드를 입력하고 「확정」을 누르면 아래 <strong className="text-slate-600">참고 키워드</strong> 5개가 만들어집니다. 그중 블로그 본문에 쓸 키워드를 1~3개 고른 뒤 글을 생성하세요. 확정 후 메인 키워드를 바꾸고 입력칸을 벗어나면 목록이 초기화됩니다.
            </p>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block">
                  <span className="text-xs text-slate-500">메인 키워드 (필수)</span>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
                    <input
                      type="text"
                      value={mainKeyword}
                      onChange={(e) => setMainKeyword(e.target.value)}
                      onBlur={() => {
                        const t = mainKeyword.trim();
                        if (lastSuggestedMain && t !== lastSuggestedMain) {
                          setSubKeywordPool([]);
                          setSelectedSubKeywords([]);
                          setLastSuggestedMain("");
                        }
                      }}
                      placeholder="예: 작업조끼 인쇄"
                      className="w-full min-w-0 flex-1 border-2 border-slate-300 rounded-lg px-3 py-2.5 text-base sm:text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      required
                    />
                    <button
                      type="button"
                      onClick={fetchSubKeywordSuggestions}
                      disabled={suggestLoading || !mainKeyword.trim()}
                      className="w-full sm:w-auto sm:min-w-[7.5rem] shrink-0 inline-flex items-center justify-center px-6 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 text-white shadow-md hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-45 disabled:cursor-not-allowed border-2 border-emerald-700/30"
                    >
                      {suggestLoading ? "만드는 중…" : "확정"}
                    </button>
                  </div>
                </label>
                <p className="text-[11px] text-slate-500">
                  메인 키워드 입력 후 <span className="font-semibold text-emerald-700">확정</span>을 누르면 아래에 참고 키워드 5개가 나옵니다.
                </p>
              </div>

              {subKeywordPool.length === 5 && (
                <div className="pt-3 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-800 mb-1">참고 키워드</h3>
                  <p className="text-xs text-slate-500 mb-3">
                    본문에 넣을 키워드를 <strong className="text-slate-600">1~3개</strong> 선택하세요. (최대 {MAX_SUB_KEYWORDS}개)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {subKeywordPool.map((k) => {
                      const selected = selectedSubKeywords.includes(k);
                      const atMax = selectedSubKeywords.length >= MAX_SUB_KEYWORDS && !selected;
                      return (
                        <label
                          key={k}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                            atMax
                              ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
                              : selected
                                ? "border-blue-500 bg-blue-50 text-blue-900 cursor-pointer"
                                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={atMax}
                            onChange={() => toggleSubKeyword(k)}
                            className="rounded border-slate-300 disabled:opacity-40"
                          />
                          {k}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
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
                    <option value={SELECT_OTHER}>기타</option>
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
              {customerType === SELECT_OTHER && (
                <label className="block rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <span className="text-xs font-medium text-amber-900">고객 유형 직접 입력 (기타)</span>
                  <input
                    type="text"
                    value={customerTypeCustom}
                    onChange={(e) => setCustomerTypeCustom(e.target.value)}
                    placeholder="예: 청소 전문 업체, 동네 카페 체인"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  />
                </label>
              )}
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
                  <option value={SELECT_OTHER}>기타</option>
                </select>
              </label>
              {workType === SELECT_OTHER && (
                <label className="block rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                  <span className="text-xs font-medium text-amber-900">품목 직접 입력 (기타)</span>
                  <input
                    type="text"
                    value={workTypeCustom}
                    onChange={(e) => setWorkTypeCustom(e.target.value)}
                    placeholder="예: 아크릴 굿즈, 안내판"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
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
                <p className="text-xs text-slate-500 mt-0.5 mb-1">
                  체크한 강점과 동일하게 본문에 키워드로 녹입니다. 쉼표로 여러 개 적어도 됩니다.
                </p>
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
            <h2 className="text-sm font-semibold text-slate-700 mb-1">글 길이 · 말투</h2>
            <p className="text-xs text-slate-500 mb-4">
              본문은 선택한 글자 수 기준 <strong className="text-slate-600">±5%</strong> 범위로 맞춰 생성합니다.
            </p>
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
              <h2 className="text-sm font-semibold text-slate-700 mb-3">서브 키워드 (추천 풀 · 본문 반영)</h2>
              <p className="text-xs text-slate-500 mb-2">추천 5개 풀</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {result.subKeywordSuggestions.map((k, i) => (
                  <span key={`${k}-${i}`} className="px-2 py-1 bg-slate-100 rounded text-sm text-slate-700">
                    {k}
                  </span>
                ))}
              </div>
              <p className="text-xs text-slate-500 mb-2">선택하여 본문에 반영한 키워드</p>
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
              <p className="mt-2 text-xs text-slate-500">
                약 {result.body.length}자 · 본문 안의 「📷 이곳에 이미지를 넣으세요.」 안내를 블로그 편집기에서 실제 이미지로 바꿔 주세요.
              </p>
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
