"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  INDUSTRY_OPTIONS,
  STRENGTH_OPTIONS,
  LENGTH_OPTIONS,
  TONE_OPTIONS,
} from "@/lib/blog/templates";

interface BlogOutput {
  titleCandidates: string[];
  body: string;
  hashtags: string[];
}

function BlogPageContent() {
  const searchParams = useSearchParams();
  const [mainKeyword, setMainKeyword] = useState("");
  const [sub1, setSub1] = useState("");
  const [sub2, setSub2] = useState("");
  const [sub3, setSub3] = useState("");
  const [industryId, setIndustryId] = useState<string>(INDUSTRY_OPTIONS[0].id);
  const [strengths, setStrengths] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [target, setTarget] = useState("");
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
    setStrengths((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainKeyword.trim()) return;
    setError(null);
    setResult(null);
    setLoading(true);
    const subKeywords = [sub1, sub2, sub3].filter(Boolean);
    try {
      const res = await fetch("/api/blog/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainKeyword: mainKeyword.trim(),
          subKeywords,
          industryId,
          strengths,
          region: region.trim(),
          target: target.trim(),
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
        titleCandidates: data.titleCandidates ?? [],
        body: data.body ?? "",
        hashtags: data.hashtags ?? [],
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
            <h2 className="text-sm font-semibold text-slate-700 mb-4">키워드</h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-xs text-slate-500">서브 키워드 1</span>
                  <input
                    type="text"
                    value={sub1}
                    onChange={(e) => setSub1(e.target.value)}
                    placeholder="선택"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">서브 키워드 2</span>
                  <input
                    type="text"
                    value={sub2}
                    onChange={(e) => setSub2(e.target.value)}
                    placeholder="선택"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">서브 키워드 3</span>
                  <input
                    type="text"
                    value={sub3}
                    onChange={(e) => setSub3(e.target.value)}
                    placeholder="선택"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-xl border border-slate-200 p-4 md:p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">업종 · 강점 · 지역</h2>
            <div className="space-y-4">
              <label className="block">
                <span className="text-xs text-slate-500">업종 템플릿</span>
                <select
                  value={industryId}
                  onChange={(e) => setIndustryId(e.target.value)}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {INDUSTRY_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="text-xs text-slate-500 block mb-2">강점 (복수 선택)</span>
                <div className="flex flex-wrap gap-2">
                  {STRENGTH_OPTIONS.map((o) => (
                    <label key={o.id} className="inline-flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={strengths.includes(o.id)}
                        onChange={() => toggleStrength(o.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm">{o.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-slate-500">지역</span>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="예: 부산"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500">타겟</span>
                  <input
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="예: 소상공인, 급한 고객"
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </label>
              </div>
            </div>
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
              <h2 className="text-sm font-semibold text-slate-700 mb-3">제목 후보 5개</h2>
              <ul className="space-y-2">
                {result.titleCandidates.map((t, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 p-2 rounded bg-slate-50"
                  >
                    <span className="text-sm text-slate-800">{t}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(t)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      복사
                    </button>
                  </li>
                ))}
              </ul>
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
