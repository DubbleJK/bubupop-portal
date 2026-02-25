# GitHub에 코드 올리는 방법

---

## 0. Git 설치 확인

1. **명령 프롬프트** 또는 **PowerShell**을 엽니다. (Windows 키 + R → `cmd` 또는 `powershell` 입력 후 Enter)
2. 아래 명령어를 입력하고 Enter:

```
git --version
```

- `git version 2.x.x` 처럼 나오면 **이미 설치됨** → 1단계로 가세요.
- "인식할 수 없습니다" 라고 나오면 **Git 설치**가 필요합니다.
  - https://git-scm.com/download/win 에서 다운로드 후 설치
  - 설치 시 기본 설정 그대로 **Next** 눌러도 됩니다.

---

## 1단계: GitHub에서 저장소 만들기

1. 브라우저에서 **https://github.com** 접속 후 로그인
2. 오른쪽 위 **+** 버튼 → **New repository** 클릭
3. 다음처럼 입력:
   - **Repository name**: `bubupop-portal` (포털용) 또는 원하는 이름
   - **Description**: 비워도 됨
   - **Public** 선택
   - **Add a README file** 체크하지 않음 (로컬 코드를 올릴 거라)
4. **Create repository** 클릭
5. 화면에 나오는 주소를 복사해 둡니다.  
   예: `https://github.com/내아이디/bubupop-portal.git`  
   (나중에 **견적 앱**용 저장소도 같은 방식으로 하나 더 만듭니다.)

---

## 2단계: 포털(bubucalculate-app) 코드 올리기

1. **명령 프롬프트** 또는 **PowerShell**을 엽니다.
2. 아래 명령어를 **한 줄씩** 입력하고 Enter 합니다.  
   (`내아이디`와 저장소 이름은 본인 걸로 바꾸세요.)

```bash
cd C:\Users\USER\bubucalculate-app
```

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "첫 업로드: BUBUPOP 포털"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/내아이디/bubupop-portal.git
```
↑ **내아이디**를 본인 GitHub 아이디로, **bubupop-portal**을 1단계에서 만든 저장소 이름으로 바꾸세요.

```bash
git push -u origin main
```

3. **처음 push 할 때** GitHub 로그인 창이 뜨면:
   - 브라우저에서 로그인하거나
   - **Username**: GitHub 아이디  
   - **Password**: 비밀번호가 아니라 **Personal Access Token** 입력  
     (토큰 만들기: GitHub → 우측 위 프로필 → **Settings** → 왼쪽 맨 아래 **Developer settings** → **Personal access tokens** → **Generate new token** → repo 체크 후 생성 → 생성된 토큰 복사해서 비밀번호 자리에 붙여넣기)

4. `main` 브랜치에 코드가 올라갔다는 메시지가 나오면 성공입니다.

---

## 3단계: 견적 앱(quotation-app)도 올리기

1. GitHub에서 **New repository** 한 번 더 만듭니다.  
   이름 예: `bubupop-quotation`
2. **새 터미널**을 열고 아래를 **한 줄씩** 실행합니다.

```bash
cd C:\Users\USER\quotation-app
```

```bash
git init
```

```bash
git add .
```

```bash
git commit -m "첫 업로드: 견적 계산기"
```

```bash
git branch -M main
```

```bash
git remote add origin https://github.com/내아이디/bubupop-quotation.git
```
↑ **내아이디**, **bubupop-quotation**을 본인 걸로 바꾸세요.

```bash
git push -u origin main
```

3. 로그인/토큰 입력이 나오면 2단계와 같이 처리하면 됩니다.

---

## 정리

| 할 일 | 명령어/위치 |
|--------|-------------|
| Git 설치 | https://git-scm.com/download/win |
| 저장소 만들기 | GitHub 사이트 → New repository |
| 폴더로 이동 | `cd C:\Users\USER\bubupop...` |
| Git 시작 | `git init` |
| 파일 담기 | `git add .` |
| 한 번에 묶기 | `git commit -m "메시지"` |
| GitHub 연결 | `git remote add origin https://github.com/...` |
| 올리기 | `git push -u origin main` |

이후 코드를 수정했으면 아래 세 줄만 반복하면 됩니다.

```bash
git add .
git commit -m "수정 내용 요약"
git push
```
