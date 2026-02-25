# 키워드 검색 · 블로그 글 생성 – .env.local 설정 가이드

화면에 "`.env.local에 내용이 없다`"고 나오면, 아래 순서대로 설정하면 됩니다.

---

## 1. .env.local 파일 만들기

**bubucalculate-app** 폴더(포털 프로젝트 루트)에서:

1. **이미 있다면**  
   `.env.local` 파일을 연 다음, 아래 항목 중 필요한 것만 추가/수정합니다.

2. **없다면**  
   `.env.local.example` 파일을 **복사**해서 이름을 **`.env.local`** 로 바꿉니다.  
   (Windows: 파일 탐색기에서 복사 후 이름 변경. 또는 터미널에서 `copy .env.local.example .env.local`)

---

## 2. 넣어야 할 항목 (복사 후 값만 바꾸세요)

### 필수 – 연관/인기 키워드 + 블로그 글 생성

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `OPENAI_API_KEY` | 연관 키워드, 인기 키워드, 블로그 본문 생성에 사용 | [OpenAI API 키](https://platform.openai.com/api-keys) 에서 발급 |

`.env.local`에 한 줄 추가:

```
OPENAI_API_KEY=sk-여기에_발급받은_키_붙여넣기
```

---

### 선택 – 키워드 **월간 검색량** (검색량 숫자 표시)

월간 검색량을 쓰려면 **네이버 검색광고 API**가 필요합니다.

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `NAVER_SEARCHAD_CUSTOMER_ID` | 고객 ID (숫자) | [네이버 검색광고](https://searchad.naver.com) 로그인 → **도구** → **API 사용관리** |
| `NAVER_SEARCHAD_ACCESS_LICENSE` | 액세스 라이선스 (UUID 형태) | 위와 동일 |
| `NAVER_SEARCHAD_SECRET_KEY` | 비밀 키 (발급된 값 **그대로** 붙여넣기, Base64 변환 안 함) | 위와 동일 |

`.env.local`에 예시:

```
NAVER_SEARCHAD_CUSTOMER_ID=1234567
NAVER_SEARCHAD_ACCESS_LICENSE=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NAVER_SEARCHAD_SECRET_KEY=발급받은비밀키그대로
```

---

### 선택 – 키워드 **검색 트렌드** (PC/모바일 그래프)

트렌드를 쓰려면 **네이버 데이터랩** API가 필요합니다.

| 변수명 | 설명 | 발급처 |
|--------|------|--------|
| `NAVER_CLIENT_ID` | 애플리케이션 Client ID | [네이버 개발자센터](https://developers.naver.com/apps) 에서 앱 등록 후 **데이터랩(검색어 트렌드)** 사용 설정 |
| `NAVER_CLIENT_SECRET` | Client Secret | 위와 동일 |

`.env.local`에 예시:

```
NAVER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxx
NAVER_CLIENT_SECRET=xxxxxxxxxx
```

---

## 3. 적용 방법

- **로컬:** `.env.local` 저장 후 **개발 서버를 한 번 종료했다가 다시 실행** (`npm run dev`).
- **Vercel 배포:** Vercel 대시보드 → 포털 프로젝트 → **Settings** → **Environment Variables** 에서 위 변수들을 **같은 이름**으로 추가한 뒤, **Redeploy** 합니다.

---

## 4. 정리

- **최소:** `OPENAI_API_KEY` 만 넣으면 연관/인기 키워드 + 블로그 글 생성은 동작합니다.
- **검색량 숫자**가 필요하면 검색광고 API 세 개를 추가하고,
- **트렌드 그래프**가 필요하면 데이터랩 두 개를 추가하면 됩니다.
