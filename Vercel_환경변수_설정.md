# Vercel에 환경 변수 넣기 (로컬 .env.local은 그대로 두고)

로컬에는 이미 `.env.local`에 키/패스워드가 있지만, **Vercel 배포 사이트는 그 파일을 못 봅니다.**  
그래서 Vercel 대시보드에 **같은 변수**를 한 번 더 등록해야 합니다.

---

## 1. Vercel 대시보드 들어가기

1. [vercel.com](https://vercel.com) 로그인
2. **bubupop-portal** (포털) 프로젝트 클릭
3. 상단 **Settings** 탭 클릭
4. 왼쪽 메뉴에서 **Environment Variables** 클릭

---

## 2. 로컬 .env.local에 있는 것 그대로 추가

로컬 `.env.local`을 열어서, **변수 이름**과 **값**을 하나씩 Vercel에 넣습니다.

| 로컬 .env.local 에 있는 이름 | Vercel에서 할 일 |
|------------------------------|------------------|
| `OPENAI_API_KEY` | Name에 `OPENAI_API_KEY`, Value에 로컬에 있는 값 붙여넣기 → Save |
| `NAVER_CLIENT_ID` | Name에 `NAVER_CLIENT_ID`, Value에 로컬 값 → Save |
| `NAVER_CLIENT_SECRET` | Name에 `NAVER_CLIENT_SECRET`, Value에 로컬 값 → Save |
| `NAVER_SEARCHAD_CUSTOMER_ID` | Name에 `NAVER_SEARCHAD_CUSTOMER_ID`, Value에 로컬 값 → Save |
| `NAVER_SEARCHAD_ACCESS_LICENSE` | Name에 `NAVER_SEARCHAD_ACCESS_LICENSE`, Value에 로컬 값 → Save |
| `NAVER_SEARCHAD_SECRET_KEY` | Name에 `NAVER_SEARCHAD_SECRET_KEY`, Value에 로컬 값 → Save |

- **Environment** 는 **Production** (그리고 필요하면 Preview도) 체크 후 Save
- 값 붙여넣을 때 앞뒤 공백 없이 넣기

---

## 3. 적용하기 (재배포)

환경 변수를 추가/수정한 뒤에는 **한 번 재배포**해야 적용됩니다.

- **Deployments** 탭 → 맨 위 배포 오른쪽 **⋮** (점 3개) → **Redeploy**  
  또는  
- 맨 위 배포 클릭 → **Redeploy** 버튼

재배포가 끝나면 포털(키워드 검색 등)에서도 같은 키를 쓰게 됩니다.

---

## 요약

- **로컬:** `.env.local` 그대로 두고 사용 (Git에 안 올라가서 안전)
- **Vercel:** Settings → Environment Variables 에서 로컬과 **같은 이름·같은 값**으로 추가 → **Redeploy**

이렇게 하면 로컬이든 배포 사이트든 같은 키를 쓰게 됩니다.
