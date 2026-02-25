# Git push 오류 해결 (main does not match any / remote origin already exists)

---

## 1. Git 사용자 이름·이메일 설정 (한 번만 하면 됨)

커밋이 되려면 이름과 이메일이 있어야 합니다. **한 번만** 실행하세요.

```bash
git config --global user.name "DubbleJK"
git config --global user.email "본인이메일@example.com"
```

↑ `본인이메일@example.com` 을 GitHub에 가입한 이메일로 바꾸세요.

---

## 2. 현재 상태 확인

```bash
cd C:\Users\USER\bubucalculate-app
git status
```

- "No commits yet" 또는 "커밋할 것이 없습니다"가 나오면 커밋이 없는 상태입니다.

---

## 3. 파일 추가 후 커밋

```bash
git add .
git status
```

- `src/`, `public/` 등이 초록색으로 나오면 정상입니다.

```bash
git commit -m "첫 업로드: BUBUPOP 포털"
```

- "1 file changed" 또는 "XX files changed" 처럼 나오면 **커밋 성공**입니다.

---

## 4. 브랜치 이름 확인

```bash
git branch
```

- `* main` 이 나오면 → 5-a 로 가세요.
- `* master` 만 나오면 → `main` 으로 바꾼 뒤 5-a 로 가세요.

**master 를 main 으로 바꾸는 경우:**

```bash
git branch -M main
```

---

## 5. 원격(origin)은 이미 있으므로 push 만 하기

**remote add 는 다시 하지 마세요.** (이미 있다고 나왔으므로)

```bash
git push -u origin main
```

- 로그인/토큰 입력이 나오면 GitHub 아이디와 Personal Access Token 입력하면 됩니다.

---

## 요약 (한 번에 복사해서 쓸 수 있음)

이미 `cd C:\Users\USER\bubucalculate-app` 와 `git remote add origin ...` 를 했다면, 아래만 순서대로 실행하세요.

```bash
cd C:\Users\USER\bubucalculate-app
git config --global user.name "DubbleJK"
git config --global user.email "본인이메일@example.com"
git add .
git commit -m "첫 업로드: BUBUPOP 포털"
git branch -M main
git push -u origin main
```

이메일만 본인 걸로 바꾸면 됩니다.
