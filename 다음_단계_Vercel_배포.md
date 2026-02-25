# 다음 단계: Vercel에 배포하기

GitHub에 코드 올리기가 끝났다면, 이제 **Vercel**에서 웹으로 배포하면 됩니다.

---

## Step 1. Vercel 가입·로그인

1. 브라우저에서 **https://vercel.com** 접속
2. **Sign Up** 또는 **Log in** 클릭
3. **Continue with GitHub** 선택 → GitHub 로그인/권한 허용  
   → 이렇게 하면 Vercel이 GitHub 저장소를 불러올 수 있습니다.

---

## Step 2. 견적 앱(quotation-app) 먼저 배포

1. Vercel 대시보드에서 **Add New…** → **Project** 클릭
2. **Import Git Repository** 목록에서 **bubupop-quotation** 저장소 찾기
   - 안 보이면 **Adjust GitHub App Permissions** 로 저장소 접근 허용
3. **bubupop-quotation** 옆 **Import** 클릭
4. **Configure Project** 화면에서:
   - **Root Directory**: 그대로 (비워 둠)
   - **Framework Preset**: Next.js 로 자동 인식됨
5. **Deploy** 클릭
6. 1~2분 후 **Congratulations!** 화면이 나오면 **Visit** 클릭
7. 나온 주소를 **메모**  
   예: `https://bubupop-quotation-xxxx.vercel.app`  
   → 이 주소가 **견적 계산기** 주소입니다.

---

## Step 3. 포털(bubucalculate-app) 배포

1. Vercel에서 다시 **Add New…** → **Project**
2. **bubupop-portal** 저장소 선택 후 **Import**
3. **Configure Project** 화면에서 **Environment Variables** 펼치기
4. 아래 변수 **최소 한 개**는 넣기:
   - **Name**: `NEXT_PUBLIC_QUOTATION_APP_URL`  
   - **Value**: Step 2에서 메모한 견적 앱 주소 (예: `https://bubupop-quotation-xxxx.vercel.app`)
5. (선택) 블로그·키워드 쓰려면 `OPENAI_API_KEY`, 네이버 API 키 등 추가
6. **Deploy** 클릭
7. 끝나면 **Visit** 로 포털 주소 확인  
   예: `https://bubupop-portal-xxxx.vercel.app`  
   → 이 주소가 **BUBUPOP 포털** 주소입니다.

---

## Step 4. 견적 앱 "홈으로 가기" 연결

1. Vercel 대시보드에서 **견적 앱(bubupop-quotation)** 프로젝트 클릭
2. 위 메뉴 **Settings** → 왼쪽 **Environment Variables**
3. **Add New** 클릭
   - **Name**: `NEXT_PUBLIC_PORTAL_URL`  
   - **Value**: Step 3에서 나온 포털 주소 (예: `https://bubupop-portal-xxxx.vercel.app`)
4. **Save** 후 **Deployments** 탭으로 이동
5. 맨 위 배포 오른쪽 **⋯** (점 세 개) → **Redeploy** 클릭  
   → 이제 견적 앱에서 "홈으로 가기"를 누르면 포털로 이동합니다.

---

## Step 5. 확인

1. **포털 주소** 접속 → 로고, 카드 3개 보이는지 확인
2. **견적 계산기** 카드 클릭 → 견적 사이트 새 탭으로 열리는지 확인
3. 견적 사이트에서 **홈으로 가기 (부부계산 포털)** 클릭 → 포털로 돌아오는지 확인

---

## 요약

| 순서 | 할 일 |
|------|--------|
| 1 | vercel.com 가입 (GitHub로 로그인) |
| 2 | New Project → bubupop-quotation Import → Deploy → 견적 URL 메모 |
| 3 | New Project → bubupop-portal Import → 견적 URL 환경변수 넣고 Deploy → 포털 URL 메모 |
| 4 | 견적 프로젝트에 포털 URL 환경변수 넣고 Redeploy |
| 5 | 두 주소 접속해서 동작 확인 |

이 순서대로 하시면 배포 완료입니다.
