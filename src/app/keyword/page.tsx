"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface KeywordResult {
  keyword: string;
  pcTrend: number | null;
  mobileTrend: number | null;
  pcMonthlyVolume: string | null;
  mobileMonthlyVolume: string | null;
  trendNote: string;
  volumeNote?: string;
  relatedKeywords: string[];
  popularKeywords: string[];
  relatedSource?: "searchad" | "none";
  popularSource?: "openai" | "none";
  relatedStatus?: "ok" | "missing-key" | "timeout" | "no-data" | "error";
  popularStatus?: "ok" | "missing-key" | "timeout" | "no-data" | "error";
  keysConfigured: { datalab: boolean; openai: boolean; searchad?: boolean };
  keywordScore?: {
    total: number;
    grade: "HIGH" | "MEDIUM" | "LOW";
    mobileRatio: number;
    trendMomentum: number;
    volumePower: number;
  } | null;
}

function relatedSourceLabel(source?: KeywordResult["relatedSource"]): string {
  if (source === "searchad") return "출처: 네이버 검색광고 데이터";
  return "출처: 없음";
}

function popularSourceLabel(source?: KeywordResult["popularSource"]): string {
  if (source === "openai") return "출처: OpenAI";
  return "출처: 없음";
}

export default function KeywordPage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KeywordResult | null>(null);

  const fetchKeyword = async (
    k: string,
    options?: {
      preserveResult?: boolean;
      mode?: "basic" | "related" | "popular";
      forceRefresh?: boolean;
    }
  ) => {
    const trimmed = k.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    setError(null);
    if (!options?.preserveResult) {
      setResult(null);
    }
    if (options?.mode === "related") {
      setRelatedLoading(true);
    } else if (options?.mode === "popular") {
      setPopularLoading(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await fetch("/api/keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: trimmed,
          forceRefresh: Boolean(options?.forceRefresh),
          mode: options?.mode ?? "basic",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "조회에 실패했습니다.");
        return;
      }
      if (options?.mode === "related") {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                keyword: data.keyword ?? prev.keyword,
                relatedKeywords: Array.isArray(data.relatedKeywords)
                  ? data.relatedKeywords
                  : prev.relatedKeywords,
                relatedSource: data.relatedSource ?? prev.relatedSource,
                relatedStatus: data.relatedStatus ?? prev.relatedStatus,
              }
            : data
        );
      } else if (options?.mode === "popular") {
        setResult((prev) =>
          prev
            ? {
                ...prev,
                keyword: data.keyword ?? prev.keyword,
                popularKeywords: Array.isArray(data.popularKeywords)
                  ? data.popularKeywords
                  : prev.popularKeywords,
                popularSource: data.popularSource ?? prev.popularSource,
                popularStatus: data.popularStatus ?? prev.popularStatus,
              }
            : data
        );
      } else {
        setResult(data);
      }
    } catch {
      setError("네트워크 오류가 났습니다. 다시 시도해 주세요.");
    } finally {
      if (options?.mode === "related") {
        setRelatedLoading(false);
      } else if (options?.mode === "popular") {
        setPopularLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKeyword(keyword, { mode: "basic" });
  };

  const fetchSuggestions = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: trimmed, mode: "suggest" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      }
    } catch {
      // ignore suggest failure
    } finally {
      setSuggestLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(keyword);
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 transition-colors shadow-sm"
        >
          HOME
        </Link>
        <h1 className="text-xl font-semibold text-slate-800">키워드 검색량 · 연관/인기 키워드</h1>
        <span className="w-14" />
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">키워드</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="예: 스티커 제작"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "조회 중…" : "조회"}
              </button>
            </div>
            {suggestLoading && <p className="mt-1 text-xs text-slate-400">추천 키워드 불러오는 중...</p>}
            {!suggestLoading && suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    type="button"
                    onClick={() => {
                      setKeyword(s);
                      setSuggestions([]);
                    }}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-700 hover:bg-slate-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </form>

        {(result || keyword.trim()) && (
          <div className="mt-4 flex justify-center">
            <Link
              href={`/blog?keyword=${encodeURIComponent((result?.keyword ?? keyword).trim())}`}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:bg-emerald-800"
            >
              이 키워드로 블로그 글쓰기
            </Link>
          </div>
        )}

        {result && (
          <div className="mt-8 space-y-6">
            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">키워드 검색량 (월간검색량)</h2>
              {(result.pcMonthlyVolume != null || result.mobileMonthlyVolume != null) ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500">PC 월간 검색량</p>
                      <p className="text-xl font-semibold text-slate-800">
                        {result.pcMonthlyVolume != null ? `${result.pcMonthlyVolume}회` : "—"}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-slate-500">모바일 월간 검색량</p>
                      <p className="text-xl font-semibold text-slate-800">
                        {result.mobileMonthlyVolume != null ? `${result.mobileMonthlyVolume}회` : "—"}
                      </p>
                    </div>
                  </div>
                  {result.volumeNote && (
                    <p className="mt-2 text-xs text-slate-400">{result.volumeNote}</p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500">{result.volumeNote ?? "월간 검색량을 조회하려면 검색광고 API 키를 설정하세요."}</p>
              )}
            </section>

            {result.keywordScore && (
              <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-700 mb-3">콘텐츠 우선순위 점수</h2>
                <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-3">
                  <p className="text-sm text-slate-700">
                    현재 키워드 우선순위:
                    <span className="ml-2 text-lg font-bold text-emerald-700">
                      {result.keywordScore.total}점 ({result.keywordScore.grade})
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">높을수록 먼저 작성 추천</p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <div className="rounded-md bg-slate-50 p-2">
                    <p className="text-slate-500">모바일 비중</p>
                    <p className="font-semibold">{result.keywordScore.mobileRatio}%</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <p className="text-slate-500">트렌드 모멘텀</p>
                    <p className="font-semibold">{result.keywordScore.trendMomentum}점</p>
                  </div>
                  <div className="rounded-md bg-slate-50 p-2">
                    <p className="text-slate-500">검색량 파워</p>
                    <p className="font-semibold">{result.keywordScore.volumePower}점</p>
                  </div>
                </div>
              </section>
            )}

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">검색 트렌드 (최근 1개월)</h2>
              {result.keysConfigured.datalab ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">PC 검색 트렌드</p>
                    <p className="text-xl font-semibold text-slate-800">
                      {result.pcTrend != null ? `${result.pcTrend} (상대값)` : "—"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">모바일 검색 트렌드</p>
                    <p className="text-xl font-semibold text-slate-800">
                      {result.mobileTrend != null ? `${result.mobileTrend} (상대값)` : "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500">{result.trendNote}</p>
              )}
              {result.keysConfigured.datalab && (
                <p className="mt-2 text-xs text-slate-400">상대값 0~100 (최고치 100 기준). 네이버 데이터랩 기준.</p>
              )}
              {!result.keysConfigured.datalab && (
                <p className="mt-2 text-xs text-slate-400">{result.trendNote}</p>
              )}
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-700">연관 키워드 (최대 15개)</h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {relatedSourceLabel(result.relatedSource)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      fetchKeyword(result.keyword, {
                        mode: "related",
                        preserveResult: true,
                      })
                    }
                    disabled={relatedLoading}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {relatedLoading ? "연관키워드 불러오는 중…" : "연관키워드 불러오기"}
                  </button>
                </div>
              </div>
              {result.relatedKeywords.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {result.relatedKeywords.map((k, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => fetchKeyword(k)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-slate-100 rounded-full text-sm text-slate-700 hover:bg-slate-200 active:bg-slate-300 disabled:opacity-50 cursor-pointer touch-manipulation"
                      >
                        {k}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {result.relatedStatus === "missing-key"
                    ? "네이버 검색광고 API 키가 없어 연관 키워드를 조회하지 못했습니다."
                    : result.relatedStatus === "timeout"
                      ? "연관 키워드 조회 시간이 초과되었습니다. 다시 불러오기를 눌러주세요."
                      : "연관 키워드를 아직 불러오지 않았습니다. 위 버튼을 눌러주세요."}
                </p>
              )}
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-700">
                  AI가 생각하는 추천키워드 (최대 15개)
                </h2>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                    {popularSourceLabel(result.popularSource)}
                  </span>
                  <button
                    type="button"
                    disabled={popularLoading}
                    onClick={() =>
                      fetchKeyword(result.keyword, {
                        mode: "popular",
                        preserveResult: true,
                      })
                    }
                    className="inline-flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium bg-slate-700 text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {popularLoading ? "AI키워드 불러오는 중…" : "AI키워드 불러오기"}
                  </button>
                </div>
              </div>
              {result.popularKeywords.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {result.popularKeywords.map((k, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => fetchKeyword(k)}
                        disabled={loading}
                        className="px-3 py-1.5 bg-blue-50 text-blue-800 rounded-full text-sm hover:bg-blue-100 active:bg-blue-200 disabled:opacity-50 cursor-pointer touch-manipulation"
                      >
                        {k}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-500">
                    {result.popularStatus === "missing-key"
                      ? "OPENAI_API_KEY가 없어 AI 추천 키워드를 생성하지 못했습니다."
                      : result.popularStatus === "timeout"
                        ? "AI 응답이 지연되었습니다. 위 버튼으로 다시 불러올 수 있습니다."
                        : "AI 추천 키워드를 아직 불러오지 않았습니다. 위 버튼으로 실행해 주세요."}
                  </p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
