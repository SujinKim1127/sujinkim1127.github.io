---
title: "첫 오픈소스 기여기"
pubDate: 2026-09-27
description: "에디터 오류 문의를 고치다 우연히 Lexical의 iOS 자동 대문자화 버그를 발견하고, 원인을 파고들어 직접 고쳐 facebook/lexical에 PR을 올리고 v0.50.0에 머지된 첫 오픈소스 기여 기록."
tags: ["Lexical", "오픈소스", "iOS", "버그 해결"]
---

때는 바야흐로,,, 에디터에 들어온 오류 문의 중 하나를 고치다가 정말 우연히 Lexical에 있는 버그를 발견했다.

그 버그는 아이폰의 **자동 대문자 기능** 때문에 발생하는 버그였다. 자동 대문자 기능을 켜고 `Abc`를 입력한 뒤 Enter를 누르면, 바로 다음 줄이 아니라 **다음 다음 줄**에 커서가 잡히는 문제였다.

<video controls muted playsinline preload="metadata" poster="/images/first-oss/bug-repro-poster.jpg" width="360">
  <source src="/images/first-oss/bug-repro.mp4" type="video/mp4" />
</video>

처음에 이 버그를 발견하고, 클로드에게 Lexical 레포에 이 버그가 이슈로 올라온 적 있는지, PR이 열려있거나 closed 된 게 있는지 찾아봐달라고 했다. 그런데 해당 버그는 올라온 적이 없는 버그라고 했다!!!

![Lexical 레포에 관련 이슈/PR이 없다는 조사 결과](/images/first-oss/claude-search.png)

어.. ? 어 ?????

그렇다면 ? 내가 한 번 ??

이라는 생각이 들었고 버그를 잡아보기 시작했다. Froala 라이브러리를 Lexical로 마이그레이션하며 여러 버그를 해결해봤고, 오류 문의로 들어오는 버그들도 개선해봤기 때문에 왠지 고칠 수 있을 것 같다는 생각이 들었다.

## 버그 발생 원인은 ?

<div class="caret-demo">
  <div class="duo">
    <div>
      <span class="tag good">정상</span>
      <div class="paper">
        <div class="line">ABC</div>
        <div class="line"><span class="caret"></span></div>
        <div class="line dim">다음 내용</div>
      </div>
    </div>
    <div>
      <span class="tag bad">버그</span>
      <div class="paper">
        <div class="line">ABC</div>
        <div class="line"></div>
        <div class="line"><span class="caret"></span><span class="dim">다음 내용</span></div>
      </div>
    </div>
  </div>
</div>

1. **Safari는 `insertLineBreak`라는 입력 타입을 주지 않는다.** Shift+Enter를 눌러도 "문단을 만들어라"라는 명령으로 온다.
2. **구분할 방법이 없으니 Lexical은 keydown의 `shiftKey`를 보고 미리 판단한다.** Shift가 켜져 있으면 줄바꿈이고, 아니면 문단으로 구분한다.
3. **iOS는 Enter 직후 자동으로 Shift를 켠다.** (자동 대문자 기능이 켜져 있으면)
4. **Enter를 누른 직후 Enter를 다시 누르면, 두 번째 Enter에 `shiftKey=true`가 전달된다.** 사용자는 그냥 Enter를 눌렀는데 Lexical은 Shift+Enter로 읽어버린다.

```
① 첫 번째 Enter
안녕하세요
|                      ← 새 문단이 생겼고, iOS가 몰래 Shift를 켠다 (자동 대문자 때문)

② 두 번째 Enter         ← 문단 하나를 더 만들려고 누름
안녕하세요
                       ← 이 두 줄이 한 문단 안에 갇힌다
|
```

5. **문단이 생겨야 할 자리에 줄바꿈이 생겨버린다.**

이 자동 대문자 관련 이슈 자체는 예전에 Lexical에 올라왔고, iOS에서 추론을 끄는 것으로 해결됐었다. 그런데 내가 발견한 "두 줄" 버그는 [PR #8417](https://github.com/facebook/lexical/pull/8417)(26년 5월)에서 처음 생겨났다. 해당 PR이 고치려던 문제는 두 가지였다.

> - macOS 텍스트 대치를 글자를 쳐서 확정하면 커서가 그 글자 앞에 남는다
> - 텍스트 대치가 대기 중일 때 Backspace를 누르면 글자가 지워지는 대신 대치가 확정된다

추가된 코드는 다음과 같다.

```tsx
// When a macOS text replacement is accepted, Chrome and Firefox fire input events for the key press that
// triggered the acceptance *before* the one for the replacement text. This causes the caret to be placed
// before the acceptance boundary. This function moves the caret past the acceptance boundary.
function $maybeMoveSelectionPastTrailingAcceptanceBoundary(
  insertedText: string | null | undefined,
): void {
  if (insertedText == null || insertedText.length <= 1 || lastKeyCode == null) {
    return;
  }

  const characterToSearchFor =
    lastKeyCode.length === 1
      ? lastKeyCode
      : lastKeyCode === "Enter"
        ? "\n"
        : lastKeyCode === "Tab"
          ? "\t"
          : null;

  if (!characterToSearchFor) {
    return;
  }

  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return;
  }

  const anchorNode = selection.anchor.getNode();
  if (!$isTextNode(anchorNode)) {
    return;
  }

  const { offset } = selection.anchor;
  if (anchorNode.getTextContentSize() === offset) {
    const nextSibling = anchorNode.getNextSibling();
    if (characterToSearchFor === "\n") {
      if ($isLineBreakNode(nextSibling)) {
        nextSibling.selectEnd();
      } else if (!nextSibling) {
        const block = $findMatchingParent(anchorNode, $isBlockElementNode);
        const nextBlock = block && block.getNextSibling();
        if ($isElementNode(nextBlock)) {
          nextBlock.selectStart();
        }
      }
    } else if (characterToSearchFor === "\t") {
      if ($isTabNode(nextSibling)) {
        nextSibling.selectEnd();
      }
    } else if (
      $isTextNode(nextSibling) &&
      nextSibling.getTextContent()[0] === characterToSearchFor
    ) {
      nextSibling.select(1, 1);
    }
  } else if (anchorNode.getTextContent()[offset] === characterToSearchFor) {
    anchorNode.select(offset + 1, offset + 1);
  }
}
```

이 함수의 역할은, 텍스트 대치가 스페이스로 확정될 때 대치된 글자 바로 옆이 아니라 **스페이스로 생긴 공백 다음**에 커서가 위치하도록 보정하는 것이다.

버그가 발생하는 코드는 여기다.

```tsx
const {offset} = selection.anchor;
if (anchorNode.getTextContentSize() === offset) {     // 커서가 텍스트 끝에 있다
  const nextSibling = anchorNode.getNextSibling();
  if (characterToSearchFor === '\n') {
    if ($isLineBreakNode(nextSibling)) {
      nextSibling.selectEnd();                        // (a) 줄바꿈 노드 너머로
    } else if (!nextSibling) {
      const block = $findMatchingParent(anchorNode, $isBlockElementNode);
      const nextBlock = block && block.getNextSibling();
      if ($isElementNode(nextBlock)) {
        nextBlock.selectStart();                      // (b) 다음 블록 맨 앞으로  ← 범인
      }
    }
  } else if ....
```

여기서 `nextBlock.selectStart()`가 커서를 원래 있던 다음 문단 맨 앞으로 옮겨버린다.

이 함수에는 커서를 옮기는 분기가 5개 있는데, 조건이 두 종류다.

```tsx
if ($isTabNode(nextSibling))   // 존재 확인: 찾는 것이 거기 있는가
if (!nextSibling)              // 부재 확인: 아무것도 없는가
```

| 확정 키              | 조건                                | 물어보는 것              |
| -------------------- | ----------------------------------- | ------------------------ |
| Enter                | `$isLineBreakNode(nextSibling)`     | 줄바꿈 노드가 **있는가** |
| **Enter**            | **`!nextSibling`**                  | 다음 형제가 **없는가**   |
| Tab                  | `$isTabNode(nextSibling)`           | 탭 노드가 **있는가**     |
| 스페이스             | `getTextContent()[0] === 문자`      | 그 문자가 **있는가**     |
| 스페이스 (같은 노드) | `getTextContent()[offset] === 문자` | 그 문자가 **있는가**     |

4개는 **있는지**를 물어보고, 하나만 **없는지**를 물어본다. Enter에서만 이런 문제가 있는 이유는, Enter로 하는 줄바꿈이 두 가지 모습으로 존재하기 때문이다.

| 종류                      | 트리에서의 모습                             | 존재 확인 |
| ------------------------- | ------------------------------------------- | --------- |
| `Shift+Enter` 같은 줄바꿈 | 노드로 존재한다                             | 가능      |
| 문단이 갈라지는 줄바꿈    | **노드가 없다.** 줄바꿈 = 문단 경계 그 자체 | 불가능    |

두 번째가 문제다. 문단이 갈라졌을 때 "여기 줄바꿈이 있다"고 가리킬 노드가 없어서, 존재 확인 대신 "아무것도 없는지" 확인으로 대체할 수밖에 없었던 것이다.

```
갈라진 뒤 (macOS)              아직 안 갈라짐 (iOS)

paragraph                    paragraph
└ text "On my way!"    ←     └ text "On my way!"      ←  둘 다 다음 형제 없음
paragraph (빈 문단)            paragraph "다음 내용"
```

## 해결 방법

즉, 저 함수가 하는 역할을 아이폰에서만 실행되지 않도록 `return` 처리하면 된다. 주석을 제외하면 거의 한 줄을 추가한 것과 다름이 없다.

```tsx
  if (characterToSearchFor === '\n') {
    // iOS fires insertReplacementText *before* the Enter's insertParagraph, so no
    // acceptance boundary exists yet; moving here lands the caret in the block that
    // already followed, and Enter then splits that one instead.
    if (IS_IOS) {
      return;
    }
    if ($isLineBreakNode(nextSibling)) {
      nextSibling.selectEnd();
    }
```

`characterToSearchFor === '\n'`일 때(자동 수정이 Enter로 확정됐을 때) iOS면 `return` 하도록 조건문을 추가했다. 함께 넣은 주석의 의미는 이렇다.

**1. `iOS fires insertReplacementText *before* the Enter's insertParagraph`**

이벤트 순서가 데스크톱과 반대다. macOS Chrome/Firefox는 `insertParagraph` → `insertReplacementText` 순인데, iOS는 소프트웨어 키보드가 입력 경로 앞단에 있어서 자동 수정을 먼저 끝내고 브라우저에 넘긴다. 그래서 `insertReplacementText` → `insertParagraph`.

**2. `so no acceptance boundary exists yet`**

이 함수는 "자동 수정에 응답하는 키가 만든 경계 문자(스페이스/탭/줄바꿈) 뒤로 커서를 넘겨준다"는 일을 하는데, iOS에서는 보정이 도는 시점에 Enter가 아직 처리되지 않았으므로 **넘어갈 경계 자체가 없다.** → 보정이 필요한 상황이 아니다!

**3. `moving here lands the caret in the block that already followed, and Enter then splits that one instead`**

`!nextSibling` 부재 확인은 "경계가 없다"는 상태를 오히려 통과시키므로, `nextBlock.selectStart()`가 커서를 **원래부터 뒤에 있던 문단** 맨 앞으로 옮긴다. 그리고 다음에 도착한 Enter가 실행된다. 그래서 커서가 두 줄 아래 있는 것처럼 보인다.

이제 테스트 코드를 클로드와 함께 작성하고, 수정 후 영상도 첨부해서 PR을 올렸다.

## PR을 올린 후…

![PR을 올린 화면](/images/first-oss/image-1.png)

어라 ? 메일로 가장 먼저 approve 됐다는 걸 봤다.

![approve 알림](/images/first-oss/image-2.png)

어 ????? approved…?? 이..이거 진짠가 ? 이거 머지되면 나 진짜 오픈소스 기여하는 건데 이거 진짜임 ?? 상태였고,

![merge queue에 올라간 화면](/images/first-oss/image-3.png)

merge queue에 올라갔다고 하더니 진짜 머지되고 **v0.50.0** 버전에 올라갔다. 🫨

![v0.50.0 릴리즈에 내 첫 기여(#8941)가 포함된 화면](/images/first-oss/image-4.png)

그리고 0.50.0 릴리즈의 **New Contributors**에도 내가 올라갔다. 대박 !!!!

![기쁜 마음을 표현한 짤](/images/first-oss/image-5.png)

오픈 소스 기여.. 한 번쯤은 해보고 싶다… 라고 생각만 했는데, 업무를 하다가 오픈 소스 기여까지 이어진 것은 처음이라 그저 감격스러웠다.

<br/>

![사내 채널에 공유한 글](/images/first-oss/image-6.png)

회사에서 업무를 하다가 오픈 소스 기여를 하게 되면 알리는 문화가 있어서 회사 프론트엔드 채널에 글을 올렸고, 대표님에게도 따봉을 받았다 👍🏻

<br/>

타임라인은 다음과 같다.

```
8/7  오전 9:48   PR 열림
8/8  오후 3:09   첫 기여자라 CI 배포에 팀 멤버 승인이 필요하다는 안내
8/8  오후 6:34   승인 (Lexical collaborator)
8/9  오후 12:46  머지
```

처음으로 PR을 올린 사람이면 메인테이너가 승인을 해야 워크플로우가 돌아간다. (아무나 PR을 열어 CI 자원을 쓰는 걸 막는 장치다.) 배포 미리보기도 마찬가지로 팀 멤버 승인이 필요하다.

![첫 기여자 CI 승인 안내](/images/first-oss/image-7.png)

<br/>

## 소감

🎤 오픈 소스에 처음으로 기여해봤는데요. 처음에는 오픈 소스를 건드린다는 것 자체가 좀 무섭기도 하고 두렵기도 했습니다. (마치 회사에 처음 입사해서 내가 직접 코드를 건드리고, 이것이 적용되어 유저들에게 선보이는 느낌이랄까)

막상 해보니까 별거 아니다! 누구나 첫 시작은 쉽게 할 수 있다! 라는 생각이 들었습니다. 좋아하거나 자주 사용하는 오픈 소스가 있다면 한번 도전해보는 거 어떠신가요? 저처럼 작은 버그를 고치는 것도 내가 사용하거나 좋아하는 제품의 퀄리티를 올리는 거니까, 고칠 수 있을 것 같은 버그라면 한번 시도해보는 것도 좋을 것 같습니다 👍🏻

이상 읽어주셔서 감사합니다.
