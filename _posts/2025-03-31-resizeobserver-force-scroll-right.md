---
layout: article
title: "⚠️ ResizeObserver 사용해서 강제 오른쪽 스크롤 만들기"
key: resizeobserver-force-scroll-right
tags:
  - CSS
  - JavaScript
  - React
  - 에러 해결
---

## 🚨문제상황

/state, /profit 에서는 처음으로 페이지에 접속했을때 오른쪽 끝으로 스크롤되는 현상이 제대로 적용되는데

/rate, /flow 에서는 적용이 안되는 현상 발생

(근데 tab을 바꾸면 적용됨)
![](https://velog.velcdn.com/images/su_jin1127/post/cf3bad11-ecc0-476d-a2ec-f8debabae120/image.gif)

<!--more-->


### 문제가 된 코드

```tsx
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      container.scrollLeft = container.scrollWidth - container.clientWidth;
    }
  }, [data, filterHeaderData, isLoading]);
```

### 문제 발생 원인
핵심 원인은 
> DOM 요소가 완전히 렌더링되기 전에 useEffect가 실행되었기 때문

이라고 할 수 있는데.. 
```
[DOM 렌더링 과정]

[기본 구조 생성] → [자식 컴포넌트 렌더링] → [스타일 계산] → [레이아웃 계산] → [페인팅]
      ↑                                                          ↑
      |                                                          |
useEffect는                                               scrollWidth와
이 시점에서 실행                                             clientWidth는
                                                         이 시점에서 정확

```
위와 같이 "타이밍"이 맞지 않아서 에러가 발생했던 것이다


가장 먼저 작동되는 페이지와 작동이 안되는 페이지 간의 차이점을 찾아봤다.
#### 스크롤이 작동하는 페이지와 작동안하는 페이지의 차이점
| 작동 여부 | 차이점 |
| --- | --- |
| X | /rate랑 /flow 에서는 fetch 훅을 1️⃣번만 적용 |
| O | /state랑 /profit은 fetch 훅이 2️⃣번 적용 |


##### 1번만 적용된 페이지의 렌더링 과정
![](https://velog.velcdn.com/images/su_jin1127/post/ce1d0e84-8bdf-4cef-a5eb-12df2e56bf5e/image.png)

##### 2번 적용된 페이지의 렌더링 과정
![](https://velog.velcdn.com/images/su_jin1127/post/9a79a1fc-fd67-4436-b364-1d9a37f9b972/image.png)
여기서 정상적으로 오른쪽 스크롤이 적용된 이유는
두번째 데이터 로딩에서 이미 첫번째 데이터로 DOM을 그려놨기 때문에 테이블의 실제 너비를 계산할 수 있었던 것이다!!

**렌더링 타이밍 이슈**
   - 초기 `useEffect`에서는 컴포넌트가 마운트된 직후에 스크롤 위치를 설정했지만
   - 문제가 발생한 시점에서는 그리드의 모든 내용이 완전히 렌더링되지 않았을 가능성
   - DOM 요소의 실제 크기는 `useEffect` 실행 시점 이후에 변경될 가능성

**레이아웃 계산 타이밍**
`scrollWidth`와 `clientWidth`는 DOM이 완전히 렌더링된 후에만 정확한 값을 가지고, `/rate`에서는 이 값들이 정확하게 계산되기 전에 스크롤 위치를 설정하려고 시도할 가능성


### 💻 코드에 적용해본거
- useLayoutEffect으로 바꿔보기
   - 안되는 이유는,,, DOM의 너비를 구해야하는데 useLayoutEffect는 DOM을 그리기 전에 동기적으로 실행하기 때문!
- DoublePinHeaderGrid.tsx에 props로 `initialScrollToRight` 값을 넘겨주고 default 값을 false로 설정해주었는데, 이거를 template 단에서 true로 해서 값을 넘겨주고 scroll 해주는 useEffect 의존성배열 안에다가 `initialScrollToRight` 이 값을 넣었는데 소용 X
- useEffect가 재실행안되는것, DoublePinHeaderGrid 컴포넌트가 재렌더링 안되는 것 → 이거 때문에 key값으로 `isRateLoading`을 추가해주었는데 미동도 없다!
- 너비 값이 변했을때 다시 useEffect가 실행되면 된다고 생각하여 `scrollContainerRef.current?.scrollWidth` 이거를 useEffect 속 의존성배열에 넣었는데 /rate와 /flow에서 작동 X
   - `scrollContainerRef.current?.scrollWidth` 값은 매렌더링마다 새로운 값이라서 비교할 이전값이 없어 의존성 배열 안에 넣어도 동작하지 않았다..
   - React가 권장하는 방법 X

<br/>

Key 값을 넣었을때 왜 작동이 안되는가에 대해 알아봤는데..
이 또한 타이밍 문제였다
Key 값이 변경되어 컴포넌트가 재마운트되어도, useEffect가 실행되는 시점에서 실제 테이블의 너비를 못 구할 수가 있다!

![](https://velog.velcdn.com/images/su_jin1127/post/c06b2977-05a2-4669-8fef-554d4a6d0e87/image.png)


## 🔑 해결방법

```tsx
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const scrollToRight = () => {
      container.scrollLeft = container.scrollWidth - container.clientWidth;
    };
    scrollToRight();
    const resizeObserver = new ResizeObserver(() => {
      scrollToRight();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data, filterHeaderData, isLoading]);
```
### ResizeObserver가 해결책이 된 이유
> DOM 요소의 크기가 완전히 계산된 후에 스크롤 위치를 설정하기 때문

ResizeObserver에 대해 먼저 알아보자면 DOM 요소의 크기 변화를 감지하는 자바스크립트 API 라고 할 수 있다

- **동적 크기 변화 감지**: ResizeObserver는 요소의 크기가 변경될 때마다 콜백 실행
- **비동기 렌더링 대응**:
    - React 컴포넌트가 렌더링되는 과정은 여러 단계로 이루어지는데,, 복잡한 테이블의 경우 모든 셀과 행이 완전히 렌더링되기까지 시간 소요
    - ResizeObserver는 이러한 비동기 렌더링 과정에서 발생하는 크기 변화를 모두 감지
- **CSS 적용 타이밍 문제 해결**: ResizeObserver는 CSS가 적용되어 실제 요소 크기가 변경될 때 이를 감지

작동원리는 다음과 같다
1. **Observer 생성**: 먼저 ResizeObserver 인스턴스를 생성
2. **요소 관찰**: 생성된 observer에 관찰할 DOM 요소를 등록
3. **크기 변화 감지**: 등록된 요소의 크기가 변경되면 콜백 함수 실행
4. **정보 제공**: 콜백 함수는 변경된 요소의 새로운 크기 정보를 제공 받음


![](https://velog.velcdn.com/images/su_jin1127/post/3fba3f71-d601-4c75-ae6b-fbbec80d7e9c/image.png)


### ResizeObserver 사용할 때 주의사항
- 필요 이상으로 여러 곳에서 남용하지 않기!!
   - 정말 레이아웃 감시가 필요한 "루트 요소"에만 적용하기
- 메모리 누수 주의하기
   - unmount시 observer.disconnect() 반드시 호출하기
- 콜백 내에서 무거운 연산은 피하기



### 💭 느낀점

ResizeObserver의 존재를 이번에 처음 알았다

내가 여러가지 해본 방법들이 왜 안되는지에 대한 이유를 찾아보며 react 작동 원리에 대해 다시 한번 공부해볼 수 있어서 여태 글로 공부한 내용을 내가 작성한 코드들에 대입해서 볼 수 있는 느낌이었고,

아 이거구나!! 하는 모먼트들이 많았다.

핵심원인을 이해하는데 있어서 많이 헤맸고 여전히 React에 대해 모르는 것이 많다는 것을 다시금 느꼈다.

---
[참고]
https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver/observe
https://velog.io/@leeji/ResizeObserver
