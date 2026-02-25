import { createHmac } from "crypto";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? "" });

const DATALAB_URL = "https://openapi.naver.com/v1/datalab/search";
const SEARCHAD_KEYWORDTOOL_URL = "https://api.searchad.naver.com/keywordstool";

/** 검색광고 API 서명 생성 (HMAC-SHA256, Base64). 시크릿은 UTF-8 문자열로 사용(네이버 공식: base64 디코딩 안 함). */
function buildSearchAdSignature(
  timestamp: string,
  method: string,
  uri: string,
  secretKey: string
): string {
  const message = `${timestamp}.${method}.${uri}`;
  const secretBytes = Buffer.from(secretKey, "utf8");
  return createHmac("sha256", secretBytes).update(message, "utf8").digest("base64");
}

/** 네이버 검색광고 키워드도구 API로 월간 검색량 조회 (PC/모바일). hintKeywords에는 공백 불가. */
async function fetchSearchAdMonthlyVolume(
  hintKeyword: string,
  customerId: string,
  accessLicense: string,
  secretKeyBase64: string,
  options?: { returnRaw?: boolean }
): Promise<{ pcMonthlyVolume: string | null; mobileMonthlyVolume: string | null; rawResponse?: unknown }> {
  const timestamp = String(Date.now());
  const method = "GET";
  const uri = "/keywordstool";
  const signature = buildSearchAdSignature(timestamp, method, uri, secretKeyBase64);
  const params = new URLSearchParams({
    hintKeywords: hintKeyword,
    showDetail: "1",
  });
  const url = `${SEARCHAD_KEYWORDTOOL_URL}?${params.toString()}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Timestamp": timestamp,
      "X-API-KEY": accessLicense,
      "X-Customer": customerId,
      "X-Signature": signature,
    },
  });
  if (!res.ok) {
    if (process.env.NODE_ENV === "development") {
      const text = await res.text();
      console.warn("[keyword] searchad non-OK:", res.status, text.slice(0, 300));
    }
    return { pcMonthlyVolume: null, mobileMonthlyVolume: null, ...(options?.returnRaw ? { rawResponse: { ok: false, status: res.status } } : {}) };
  }
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { pcMonthlyVolume: null, mobileMonthlyVolume: null, ...(options?.returnRaw ? { rawResponse: null } : {}) };
  }
  const raw = data as Record<string, unknown>;
  type Item = Record<string, unknown>;
  const list: Item[] = Array.isArray(raw)
    ? (raw as Item[])
    : Array.isArray(raw.keywordList)
      ? (raw.keywordList as Item[])
      : Array.isArray((raw as { keywords?: Item[] }).keywords)
        ? (raw as { keywords: Item[] }).keywords
        : Array.isArray((raw as { keywordList?: Item[] }).keywordList)
          ? (raw as { keywordList: Item[] }).keywordList
          : [];
  const toStr = (v: string | number | undefined): string | null =>
    v === undefined || v === null ? null : String(v).trim() || null;
  const getNum = (item: Item, ...keys: string[]): string | number | undefined => {
    for (const k of keys) {
      const v = item[k];
      if (v !== undefined && v !== null && v !== "") return v as string | number;
    }
    return undefined;
  };
  const getPc = (item: Item) =>
    getNum(item, "monthlyPcQcCnt", "monthly_pc_qc_cnt", "pcQcCnt");
  const getMobile = (item: Item) =>
    getNum(item, "monthlyMobileQcCnt", "monthly_mobile_qc_cnt", "mobileQcCnt");
  const hasVolume = (item: Item) =>
    (getPc(item) !== undefined && getPc(item) !== null && getPc(item) !== "") ||
    (getMobile(item) !== undefined && getMobile(item) !== null && getMobile(item) !== "");
  const hintLower = hintKeyword.toLowerCase().trim();
  const matchHint = (item: Item) => {
    const r = toStr((item.relKeyword ?? item.rel_keyword ?? item.keyword) as string);
    return r?.toLowerCase().trim() === hintLower;
  };
  const chosen =
    list.find((it) => matchHint(it) && hasVolume(it)) ??
    list.find((it) => matchHint(it)) ??
    list.find((it) => hasVolume(it)) ??
    list[0];
  if (!chosen) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[keyword] searchad: no volume. keys:", Object.keys(raw), "listLen:", list.length, "firstItemKeys:", list[0] ? Object.keys(list[0]) : []);
    }
    return {
      pcMonthlyVolume: null,
      mobileMonthlyVolume: null,
      ...(options?.returnRaw ? { rawResponse: data } : {}),
    };
  }
  return {
    pcMonthlyVolume: toStr(getPc(chosen) as string | number),
    mobileMonthlyVolume: toStr(getMobile(chosen) as string | number),
    ...(options?.returnRaw ? { rawResponse: data } : {}),
  };
}

/** 네이버 데이터랩 검색어 트렌드 조회 (device: pc | mo) */
async function fetchDatalabTrend(
  keyword: string,
  device: "pc" | "mo",
  clientId: string,
  clientSecret: string
): Promise<number | null> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  const body = {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    timeUnit: "week" as const,
    keywordGroups: [{ groupName: keyword, keywords: [keyword] }],
    device,
  };
  const res = await fetch(DATALAB_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    results?: { data?: { ratio?: number }[] }[];
  };
  const ratios = data.results?.[0]?.data?.map((d) => d.ratio ?? 0) ?? [];
  if (ratios.length === 0) return null;
  const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  return Math.round(avg * 10) / 10;
}

/** OpenAI로 연관키워드 15개 + 인기키워드 15개 생성. 실패 시 3개씩 요청 */
async function fetchKeywordsFromAI(
  keyword: string,
  count: number
): Promise<{ related: string[]; popular: string[] }> {
  const sys = `당신은 네이버 블로그·검색 SEO 전문가입니다.
사업 분야: 인쇄/디자인/스티커/DTF/UV/배너/실사출력/의류/명함.
주어진 키워드에 대해 JSON만 출력하세요. 다른 설명 없이 JSON만.
형식: {"related": ["연관1","연관2",...], "popular": ["인기1","인기2",...]}
- related: 검색 시 함께 찾는 연관 키워드 (블로그 제목·본문에 쓸 수 있는).
- popular: 블로그 주 키워드로 썼을 때 방문자가 늘 수 있는 인기 검색어.`;
  const user = `키워드: "${keyword}"
연관키워드 ${count}개, 인기키워드 ${count}개를 각각 추천해 주세요. JSON만 출력.`;

  try {
    const comp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      temperature: 0.5,
    });
    const text = comp.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON");
    const parsed = JSON.parse(jsonMatch[0]) as { related?: string[]; popular?: string[] };
    const related = Array.isArray(parsed.related) ? parsed.related.slice(0, count) : [];
    const popular = Array.isArray(parsed.popular) ? parsed.popular.slice(0, count) : [];
    return { related, popular };
  } catch {
    return { related: [], popular: [] };
  }
}

export async function POST(request: Request) {
  let keyword: string;
  let debug = false;
  try {
    const body = await request.json();
    keyword = String(body?.keyword ?? "").trim();
    debug = Boolean(body?.debug);
  } catch {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }
  if (!keyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
  }

  const clientId = process.env.NAVER_CLIENT_ID ?? "";
  const clientSecret = process.env.NAVER_CLIENT_SECRET ?? "";
  const hasDatalab = Boolean(clientId && clientSecret);

  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID ?? "";
  const accessLicense = process.env.NAVER_SEARCHAD_ACCESS_LICENSE ?? "";
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY ?? "";
  const hasSearchAd = Boolean(customerId && accessLicense && secretKey);

  let pcTrend: number | null = null;
  let mobileTrend: number | null = null;
  let pcMonthlyVolume: string | null = null;
  let mobileMonthlyVolume: string | null = null;

  if (hasDatalab) {
    try {
      const [pc, mo] = await Promise.all([
        fetchDatalabTrend(keyword, "pc", clientId, clientSecret),
        fetchDatalabTrend(keyword, "mo", clientId, clientSecret),
      ]);
      pcTrend = pc;
      mobileTrend = mo;
    } catch {
      // ignore
    }
  }

  let debugSearchAdResponse: unknown;
  if (hasSearchAd) {
    try {
      const noSpace = keyword.replace(/\s/g, "");
      const firstWord = keyword.trim().split(/\s+/)[0] ?? noSpace;
      const candidates = noSpace ? [noSpace, firstWord].filter((v, i, a) => a.indexOf(v) === i) : [firstWord];
      for (const hintKeyword of candidates) {
        if (!hintKeyword) continue;
        const vol = await fetchSearchAdMonthlyVolume(
          hintKeyword,
          customerId,
          accessLicense,
          secretKey,
          debug ? { returnRaw: true } : undefined
        );
        if (vol.rawResponse !== undefined) debugSearchAdResponse = vol.rawResponse;
        if (vol.pcMonthlyVolume != null || vol.mobileMonthlyVolume != null) {
          pcMonthlyVolume = vol.pcMonthlyVolume;
          mobileMonthlyVolume = vol.mobileMonthlyVolume;
          break;
        }
      }
    } catch {
      // ignore
    }
  }

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  let relatedKeywords: string[] = [];
  let popularKeywords: string[] = [];

  if (hasOpenAI) {
    let result = await fetchKeywordsFromAI(keyword, 15);
    if (result.related.length < 3 || result.popular.length < 3) {
      const fallback = await fetchKeywordsFromAI(keyword, 3);
      if (result.related.length < 3) result.related = fallback.related;
      if (result.popular.length < 3) result.popular = fallback.popular;
    }
    relatedKeywords = result.related;
    popularKeywords = result.popular;
  }

  const hasMonthlyVolume = hasSearchAd && (pcMonthlyVolume != null || mobileMonthlyVolume != null);
  const volumeNote = hasMonthlyVolume
    ? "월간 검색량(최근 30일)은 네이버 검색광고 API(키워드도구) 기준입니다. 10 미만은 '<10'으로 표시됩니다."
    : hasSearchAd
      ? "검색광고 API는 호출했으나 해당 키워드 월간검색량을 가져오지 못했습니다."
      : "월간 검색량을 보려면 .env.local에 NAVER_SEARCHAD_CUSTOMER_ID, NAVER_SEARCHAD_ACCESS_LICENSE, NAVER_SEARCHAD_SECRET_KEY(검색광고 API)를 추가하세요. 네이버 검색광고 → 도구 → API 사용관리에서 발급 가능합니다.";

  const json: Record<string, unknown> = {
    keyword,
    pcTrend: pcTrend ?? null,
    mobileTrend: mobileTrend ?? null,
    pcVolume: pcTrend != null ? pcTrend : null,
    mobileVolume: mobileTrend != null ? mobileTrend : null,
    pcMonthlyVolume: pcMonthlyVolume ?? null,
    mobileMonthlyVolume: mobileMonthlyVolume ?? null,
    trendNote: hasDatalab
      ? "트렌드는 최근 1개월 구간의 상대값(0~100)입니다. 네이버 데이터랩 기준."
      : "네이버 API 키가 없어 트렌드를 조회하지 못했습니다. .env.local에 NAVER_CLIENT_ID, NAVER_CLIENT_SECRET을 추가하세요.",
    volumeNote,
    relatedKeywords,
    popularKeywords,
    keysConfigured: { datalab: hasDatalab, openai: hasOpenAI, searchad: hasSearchAd },
  };
  if (debug && debugSearchAdResponse !== undefined) {
    json._debugSearchAdResponse = debugSearchAdResponse;
  }
  return NextResponse.json(json);
}
