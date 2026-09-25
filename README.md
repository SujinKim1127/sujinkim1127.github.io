# sujinkim1127.github.io

[Astro](https://astro.build)로 만든 기술 블로그. GitHub Pages로 배포됩니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # dist/ 로 정적 빌드
npm run preview  # 빌드 결과 미리보기
```

## 글 작성

`src/content/blog/` 에 마크다운 파일을 추가합니다.

```markdown
---
title: "글 제목"
pubDate: 2026-09-25
description: "목록/메타에 노출될 한 줄 요약"
tags: ["React", "TypeScript"]
---

본문...
```

- 파일명이 곧 URL 슬러그가 됩니다 (`src/content/blog/my-post.md` → `/posts/my-post`).
- ` ```mermaid ` 코드 블록은 클라이언트에서 다이어그램으로 렌더링됩니다.
- 코드 블록은 Shiki로 하이라이팅됩니다.

## 구조

- `src/pages/` — 라우트 (홈, 글 상세, 태그, 소개, RSS, 404)
- `src/layouts/` — 공통 레이아웃
- `src/content/blog/` — 글 마크다운
- `src/styles/global.css` — 전역 스타일
- `.github/workflows/deploy.yml` — Pages 배포

## 배포

`main` 브랜치에 push하면 GitHub Actions가 빌드 후 Pages에 배포합니다.
