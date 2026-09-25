---
title: "⚠️ Stale Closure(오래된 클로저) useMemo로 해결하기"
pubDate: 2025-01-14
description: "🚨문제상황"
tags: ["JavaScript", "React", "에러 해결"]
---

## 🚨문제상황

![](https://velog.velcdn.com/images/su_jin1127/post/95b034d6-cb5e-4715-a669-58f14e560566/image.png)

이런식으로 데이터가 있으면 
선택된 Tab이 Animal 인 상태에서 cat을 누르면 Animal을 전달하고,
선택된 Tab이 RGB 인 상태에서 red를 누르면 RGB를 전달해야하는데

```tsx
const [tab, setTab] = useState('Animal');
console.log('tab', tab);   // tab 상태를 RGB로 바꾼후 console 결과: RGB

const handleOnClick = (code: string | number, field: string) => {
	console.log('tab', tab);  // tab 상태를 RGB로 바꾼후 console 결과: Animal
  ModalOpen(`.../${tab}/${code}`, field);
};

const [column1, setColumn1] = useState<TableColumn<~~>[]>([
    {
      header: '국가명',
      onCellClick(row) {
        handleOnClick(row?.국가코드, row?.국가명);
      },
    },
		...
])
```

이런식으로 배열 속 cell에 handleOnClick 함수가 **“이미”** 정의되어 있었다.
이미 정의되어버린 상태에서 Tab 상태를 바꿔버려도 배열 속 함수의 `tab`은 Animal을 가리키고 있는 상태가 된다..!! 

### 🔎 검색해본거

- 에러가 발생하는것이 아니고 버그가 발생하는거라 검색보다는 debugger를 사용했다.
- 코드 속의 문제인것 같아서..

(트러블슈팅 기록하면서 얕은/깊은 복사 개념 문제인줄 알고 찾아보다가 아니라는것을 깨닫고 클로저 개념을 찾아봤다)

### 💻 코드에 적용해본거

급하게 배포해야하는 상태여서 기존에는 useState의 updater 함수를 사용하여 tab의 현재 상태를 강제로 가지고 와서 업데이트하는 방식을 사용했다.

```tsx
const handleOnClick = (code: string | number, field: string) => {
  setTab((currentTab) => {
    ModalOpen(`.../${currentTab}/${code}`, field);
    return currentTab;
  });
};
```

아무리봐도 좀 이상하지 않은가 🧐
이런식으로 set함수 속에 들어가서 updater 함수 적용해가지고 현재값 찾아와가지고 상태 업데이트하는 코드 본 적 있으신가요??
정말 어쩔 수 없다면 이렇게 해야겠지만 아무리봐도 이 방법은 *오잉????* 이라는 생각을 지울수가 없었다

useState의 updater 함수에 대해 아주 짧게 설명해보자면

```tsx
const [count, setCount] = useState(0);

// updater 함수 사용
setCount(prevCount => prevCount + 1);
```

이 방식이 useState의 updater 함수를 사용하는것이다
아무튼 이 방법이 먹히긴 했지만 찜찜해서 그냥 냅둘수가 없었다.

## 🔑 해결방법

도대체 왜 tab 값이 업데이트가 안되는거지?? 라는 생각을 지울수가 없었다..
아무리봐도 안될수가 없는 구조라고 생각을 했기에!!
사수도 처음에 왜 값이 안바뀌는지 이해를 못하셨는데 배열 정의 문제인 것 같다고 하셨다가

> 깊은 복사, 얕은 복사가 원인인것 같다고 하셨다.

아!!!!!
배열에 복사된 `handleOnClick` 함수를 **얕은 복사**로 했기 때문에 `handleOnClick` 함수 속의 tab 값이 바뀌어도 바뀐 값이 적용되지 않는!!!!!!
유레카…

(라고 생각했는데 글을 작성하면서 좀 더 알아보니 클로저 문제였다)

그래서 바로 떠오른것이 `useMemo()` 였다.
useMemo를 사용하여 배열에 복사된 handleOnClick 함수 속 tab 값을 update해주면 해결되지 않겠는가!!

그래서 

```tsx
const column1 = useMemo(
    () => [
      {
        header: '국가명',
        onCellClick(row) {
          handleOnClick(row?.국가코드, row?.국가명);
        },
      },
    ],
    [tab],
  );
```

`useMemo`의 의존성배열에다가 tab을 추가해주었고 바로 해당 문제를 해결할 수 있었다.

# 나는 이게 얕은 복사/깊은 복사 문제인줄 알았는데…

원인을 찾은 관계로 얕은 복사와 깊은 복사에 대해 다시 공부를 해보다가 이상한 점을 발견했다
코어자바스크립트를 읽어보면 <u>중첩된 객체</u> 에서는

- 얕은 복사
    - 중첩된 객체에서 참조형 데이터가 저장된 프로퍼티를 복사할 때 그 **주솟값**만 복사한다.
    - 원본과 사본이 “**동일”한 참조형 데이터의 주소**를 가리키게 된다.
    - `사본을 바꾸면 원본도 바뀌고`, 원본을 바꾸면 사본도 바뀐다.
- 깊은 복사
    - 중첩된 객체의 모든 레벨의 값들을 재귀적으로 복사하여 완전히 ”**독립”적인 복사본**을 만든다.
    - 깊은 복사본을 변경해도 `원본에는 영향을 미치지 않는다.`

??? 어라?? 뭔가 이상하다
얕은 복사를 했기에 함수 값이 바뀐게 적용이 안된다고 생각했는데 객체 복사에서의 얕은 복사는 원본이 바뀌면 사본도 바뀐다고 한다. 

이상함을 느끼고 perplexity와 gpt에게 물어본 결과
클로저 문제라고 한다…
얕은/깊은 복사랑은 관련이 없다고 단칼에 말해줬다.

위 문제의 핵심 원인은 다음과 같다.

> 1. **초기 렌더링**: column1 배열이 처음 생성될 때, handleOnClick 함수가 정의되고 이 함수는 그 시점의 `tab` 값(즉, 'Animal')을 "**캡처**"
> 2. **클로저 형성**: handleOnClick 함수는 클로저를 형성하여, 정의된 시점의 `tab` 값을 "**기억**"
> 3. **상태 변경**: 이후에 `tab` 값이 변경되더라도, column1 배열 내의 handleOnClick 함수는 여전히 초기의 'Animal' 값을 참조
> 4. **업데이트 실패**: 결과적으로, `tab` 값이 변경되어도 handleOnClick 함수는 항상 초기의 'Animal' 값을 사용

handleOnClick 함수가 여전히 초기의 Animal 값을 참조하고 있기에 얕은/깊은 복사 가 원인이라고 생각했는데 아니었다… 
복사된것이 함수이기 때문에 데이터 복사할때 발생하는 얕은/깊은 복사와는 관련이 없는것이었..다….
생각해보면 배열을 복사한적은 없고 정의만 했기에 전혀 관련이 없는것이 맞다.. 🤦🏻‍♀️
해당 현상을 **`Stale Closure`**, 오래된 클로저 라고 부른다. 

정리해보자면

### 얕은/깊은 복사와 관련 없는 이유는?

- 얕은/깊은 복사는 데이터 복사할 때 발생
- 해당 문제는 함수와 상태의 참조 방식에서 발생
- 함수의 **캡처**는 함수가 정의된 시점의 스코프를 기억하는 특성 → 값 복사 여부랑 전혀 다른 개념

### 💭 느낀점

useMemo로 바꾸고 원하는 결과가 바로 나오자마자 속으로 와!!!!!! 대박!!!!! 을 외쳤다..
깊은복사, 얕은복사를 javascript 공부하면서 이렇구나~ 하기만 했지 실제로 이 때문에 버그가 발생하는건 그 동안 본 적이 없었다.

라고 생각을 했는데..

클로저 문제였다. 클로저도 마찬가지로 함수의 “캡처” 문제 때문에 버그가 발생한적은 처음인것 같다.
있었는데 기억을 못하는것일지도?
Stale Closure 문제 해결 방법 중 하나가 useEffect의 의존성배열 안에다가 변화 인지를 하고 싶은 변수를 추가해주는 방법이 있긴 한데 이 문제의 원인을 캡처라고는 생각을 안했었다… (새삼 다시 반성을..!!)

이번 기회에 얕은/깊은 복사의 개념과 클로저의 개념에 대해 아주 정확하게 이해하고 가는 느낌이다 😤

<br/>

---
<br/>

[참고]

[https://velog.io/@februaar/Core-Javascript-1장](https://velog.io/@februaar/Core-Javascript-1%EC%9E%A5)

[https://velog.io/@jinwoo5092/JavaScript-얕은-복사Shallow-Copy와-깊은-복사Deep-Copy](https://velog.io/@jinwoo5092/JavaScript-%EC%96%95%EC%9D%80-%EB%B3%B5%EC%82%ACShallow-Copy%EC%99%80-%EA%B9%8A%EC%9D%80-%EB%B3%B5%EC%82%ACDeep-Copy)
