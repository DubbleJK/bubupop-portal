"use client";

import { useState } from "react";
import Link from "next/link";

interface KeywordResult {
  keyword: string;
  pcTrend: number | null;
  mobileTrend: number | null;
  pcVolume: number | null;
  mobileVolume: number | null;
  pcMonthlyVolume: string | null;
  mobileMonthlyVolume: string | null;
  trendNote: string;
  volumeNote?: string;
  relatedKeywords: string[];
  popularKeywords: string[];
  keysConfigured: { datalab: boolean; openai: boolean; searchad?: boolean };
}

export default function KeywordPage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<KeywordResult | null>(null);

  const fetchKeyword = async (k: string) => {
    const trimmed = k.trim();
    if (!trimmed) return;
    setKeyword(trimmed);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "조회에 실패했습니다.");
        return;
      }
      setResult(data);
    } catch {
      setError("네트워크 오류가 났습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchKeyword(keyword);
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
              <h2 className="text-sm font-semibold text-slate-700 mb-3">연관 키워드 (최대 15개)</h2>
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
                  {result.keysConfigured.openai
                    ? "연관 키워드를 가져오지 못했습니다."
                    : "OpenAI API 키가 없어 연관 키워드를 생성하지 못했습니다. .env.local에 OPENAI_API_KEY를 추가하세요."}
                </p>
              )}
            </section>

            <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">
                인기 키워드 (블로그 주 키워드로 쓰면 방문자 증가 기대, 최대 15개)
              </h2>
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
                <p className="text-sm text-slate-500">
                  {result.keysConfigured.openai
                    ? "인기 키워드를 가져오지 못했습니다."
                    : "OpenAI API 키가 없어 인기 키워드를 생성하지 못했습니다."}
                </p>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
