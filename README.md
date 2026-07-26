# sujinkim1127.github.io

Jekyll + [TeXt theme](https://github.com/kitian616/jekyll-TeXt-theme)로 만든 기술 블로그.

## 로컬 실행

```bash
bundle install
bundle exec jekyll serve
```

`http://localhost:4000`에서 확인.

## 새 글 쓰기

`_posts/`에 `YYYY-MM-DD-제목.md` 형식으로 추가.

```md
---
layout: article
title: "제목"
key: unique-key
---

본문
```

## 배포

`main`에 push하면 GitHub Actions가 Jekyll을 빌드해서 Pages에 배포합니다.
**주의**: 저장소 Settings → Pages → Source를 **GitHub Actions**로 설정해야 합니다 (기본값인 "Deploy from a branch"로는 커스텀 테마가 빌드되지 않습니다).
