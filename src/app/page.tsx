import Link from "next/link";

/** 계산기 아이콘 */
function IconCalculator({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8M8 10h8M8 14h4M14 14h2M8 18h2M12 18h2M16 18h2" />
    </svg>
  );
}

/** 키보드 아이콘 */
function IconKeyboard({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M6 8h.001M10 8h.001M14 8h.001M18 8h.001M8 12h.001M12 12h.001M16 12h.001M7 16h10" />
    </svg>
  );
}

/** 볼펜으로 공책에 쓰는 아이콘 */
function IconPenNotebook({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

export default function DashboardPage() {
  const quotationAppUrl =
    typeof process.env.NEXT_PUBLIC_QUOTATION_APP_URL === "string" &&
    process.env.NEXT_PUBLIC_QUOTATION_APP_URL !== ""
      ? process.env.NEXT_PUBLIC_QUOTATION_APP_URL
      : "http://localhost:3000";

  const cardClass = "flex items-start gap-4 w-full bg-white border-2 border-slate-200 rounded-xl p-5 text-left hover:border-blue-400 hover:bg-blue-50/50 transition";
  const iconClass = "w-10 h-10 shrink-0 text-slate-500 p-2 rounded-lg bg-slate-100";

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex flex-col items-center">
        {/* 로고: bubucalculate-app/public/logo.png 에 넣어 주세요 */}
        <img
          src="/logo.png"
          alt="BUBUPOP DESIGN & PRINT"
          width={330}
          height={180}
          className="object-contain"
        />
        <p className="text-slate-600 text-sm mt-2">사무실용 도구 모음</p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <Link
          href={quotationAppUrl}
          className={cardClass}
        >
          <IconCalculator className={iconClass} />
          <div>
            <span className="text-lg font-semibold text-slate-800">견적 계산기</span>
            <p className="text-sm text-slate-500 mt-1">인쇄 견적 · 주문</p>
          </div>
        </Link>

        <Link href="/keyword" className={cardClass}>
          <IconKeyboard className={iconClass} />
          <div>
            <span className="text-lg font-semibold text-slate-800">키워드 검색량 · 연관/인기 키워드</span>
            <p className="text-sm text-slate-500 mt-1">모바일/PC 검색 트렌드, 연관키워드, 인기키워드</p>
          </div>
        </Link>

        <Link href="/blog" className={cardClass}>
          <IconPenNotebook className={iconClass} />
          <div>
            <span className="text-lg font-semibold text-slate-800">네이버 SEO 블로그 작성</span>
            <p className="text-sm text-slate-500 mt-1">키워드·업종 입력으로 블로그 글 자동 생성</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
