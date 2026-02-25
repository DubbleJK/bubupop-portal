import { createHmac } from "crypto";
import { NextResponse } from "next/server";

const SEARCHAD_KEYWORDTOOL_URL = "https://api.searchad.naver.com/keywordstool";

/** 시크릿은 UTF-8 문자열로 사용(네이버 공식: base64 디코딩 안 함). */
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

/**
 * 검색광고 API 원본 응답을 그대로 반환합니다.
 * 브라우저에서 /api/keyword/debug?keyword=키워드 로 열어서
 * 실제 응답 구조를 확인한 뒤, route.ts 파싱을 수정할 때 참고하세요.
 */
export async function GET(request: Request) {
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID ?? "";
  const accessLicense = process.env.NAVER_SEARCHAD_ACCESS_LICENSE ?? "";
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY ?? "";
  if (!customerId || !accessLicense || !secretKey) {
    return NextResponse.json(
      { error: "검색광고 API 키가 없습니다. .env.local에 NAVER_SEARCHAD_* 를 설정하세요." },
      { status: 400 }
    );
  }
  const { searchParams } = new URL(request.url);
  const keyword = (searchParams.get("keyword") ?? "키워드").trim().replace(/\s/g, "") || "키워드";
  const timestamp = String(Date.now());
  const method = "GET";
  const uri = "/keywordstool";
  const signature = buildSearchAdSignature(timestamp, method, uri, secretKey);
  const params = new URLSearchParams({ hintKeywords: keyword, showDetail: "1" });
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
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _raw: text, _status: res.status };
  }
  return NextResponse.json({
    hintKeyword: keyword,
    status: res.status,
    ok: res.ok,
    response: body,
  });
}
