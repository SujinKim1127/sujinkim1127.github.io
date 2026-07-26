---
layout: article
title: "⚠️ 양쪽에 고정된 헤더가 있는 그리드 작업을 하며 발생한 수많은 에러 해결 과정기"
key: fixed-header-grid-error-troubleshooting
tags:
  - CSS
  - JavaScript
  - React
  - TypeScript
  - 에러 해결
---

양쪽에 고정된 헤더가 있는 그리드를 만들며 전달받은 비율을 계산해서 너비를 정하는 로직을 짜게 된 그 과정에 대한 이야기입니다!

<!--more-->


![](https://velog.velcdn.com/images/su_jin1127/post/d4d9f8fe-a567-4511-a673-5c4212eb4149/image.png)

원래는 위와 같이 왼쪽 헤더와 상단 헤더만 고정된 복합헤더그리드를 만들었는데…
왼쪽 헤더, 상단 헤더, 오른쪽 헤더가 고정된 그리드를 만들어달라는 추가 요청이 들어왔다.

- 전체 스크롤이 생기지 않고 내부에서만 스크롤이 생기도록 만들어야 했고,
- 보이는 cell의 갯수를 입력받아 그만큼의 cell 영역만 보이도록 만들어야 했다
(전체 data의 길이는 7인데 보이는 cell 개수가 4이면 4개만 보이고 나머지는 스크롤을 해서 볼 수 있도록)



정말 많은 트러블슈팅이 다음과 같은 고민을 하다가 발생하게 되었다.

> 스크롤 파트 길이를 prop으로 입력받을때 `보이는 영역의 너비(px)` vs `보이는 열의 갯수` 둘 중에 어떤 것을 입력받을지에 대해 고민했다.
> 
> - `너비(px)`로 입력 받으면 갯수에 따른 <u>너비 계산</u>이 매번 필요
> - `갯수`로 입력 받으면 내부 스크롤 영역의 너비가 지정되었을때 다음 항목이 보이는 문제 발생 가능성

고민에 대한 결론은 **`보이는 열의 갯수`**를 받아보는 것이었는데 확실하지 않아서 우선,

### 1️⃣ 전체 스크롤 적용 안되도록 만들어야 하는 문제

를 해결하려고 했다. 

전체 스크롤도 생기고 내부 스크롤도 생기는 이유는 _내부 스크롤의 길이가 정해지지 않았던_ 문제 때문이었다.
그래서 내부 스크롤의 길이를 어떻게든 정의했어야 했다.

![](https://velog.velcdn.com/images/su_jin1127/post/6d37ac16-7e01-4b81-a0dc-ca51ba8c4f7a/image.png)

구역을 <왼쪽> <중앙 스크롤> <오른쪽> 이런식으로 3개로 나눠서 Flex로 묶었다.

그 이후에는

### 2️⃣ 보이는 cell의 갯수 만큼 정확하게 비율에 맞게 보여야하는 문제

이때 그 다음 항목이 보이면 안된다
    
   ![](https://velog.velcdn.com/images/su_jin1127/post/819751e8-5b94-46b2-99e2-94b4932724b8/image.png)
   2022 다음이 2023인데 여기서 2023의 영역이 보여서는 안되는 것!!

그럼 총 4개니까 `viewCellCnt`로 4를 넘겨 받도록 만들었다. 

이런디자인을 추후에 한번 더 사용할 가능성을 염두해두어서 

> - 보이는 cell의 갯수(=viewCellCnt)
> - 길이 비율(왼쪽헤더 너비, 스크롤 내부 한개의 너비, 오른쪽헤더 너비)

을 추가로 입력받았다.
(단, 스크롤 내부에 존재하는 모든 항목의 길이는 같다는 전제 하에 작업)

비율로 너비를 지정하기 위해서는 그리드의 부모 컴포넌트 길이가 필요했고,

[왼쪽, 중앙개별, 오른쪽]으로 입력 받은 배열을 
[왼쪽, 중앙개별, 중앙개별, 중앙개별, 중앙개별, 오른쪽] 으로 바꾸는 작업을 했다. 즉, 보이는 cell의 갯수만큼 (아까 viewCellCnt 값을 4로 넘겨줬으니까) 배열에 `중앙개별` 값을 추가하는 작업을 진행한 것이다!

이렇게 작업을 진행한 이유는 데이터가 전달되는 방식이 
```json
[
  {
  	구분: 미주,
  	2019: 3723940,
	2020: 234234,
  	2021: 234234,
  	2022: 212124,
  	2023: 12123124,
  }, ...
]
```
이런식으로 한 행씩 전달해주기 때문에 내부 디자인을 적용하려면 이 로직이 반드시 필요했다!! (하나씩 렌더링해주고 있기 때문에..)


```tsx
// widthRatio = [왼쪽, 중앙개별, 오른쪽]
    const thresholdWidthArr = [
      widthRatio[0],
      ...Array(viewCellCnt).fill(widthRatio[1]),
      widthRatio[2],
    ];
    setThresholdWidth(thresholdWidthArr);
```

만약, 들어온 데이터가 보이는 cell의 갯수보다 길면 개별 width를 적용해줄때 그 개별 cell의 길이가 필요하므로 해당 작업을 expandWidthRatio 변수에 담았다

```tsx
    if (columns.length > threshold) {
      setExpandWidthRatio([
        widthRatio[0],
        ...Array(columns.length - 2).fill(widthRatio[1]),
        widthRatio[2],
      ]);
    } else {
      setExpandWidthRatio(thresholdWidthArr);
    }
```

이제 남은 작업은 보이는 갯수 만큼 담긴 배열 (=thresholdWidth)을 통해 각 cell 너비로 적용되어야할 길이를 구해줘야 한다.

(이 부분 계산하면서 totalWidthRatio와 baseWidth 간의 코드는 짜놓고 관계 이해를 못해서 왜이렇게 짰지?? 하면서 혼자 다시 계산해봤다)

`비율 개별 값 * (현재 총 너비 / 비율 합)` 의 값에다가 `data 전체 길이`를 적용해주면 실제 그리드에 적용되어야 할 길이를 알 수 있다. 

```tsx
  const totalWidthRatio = thresholdWidth.reduce((sum, ratio) => sum + ratio, 0);
  const baseWidth = presentWidth / totalWidthRatio;
  const getWidth = (index: number) => {
    return baseWidth * (expandWidthRatio[index] || 1);
  };
```

항상 보이는 cell의 갯수가 고정된 것이 아니고, 전체 그리드의 길이도 고정된 것이 아니니까 이를 유동적으로 바꾸기 위해 노력했다..



이 문제를 해결하고 나서도 다른 문제가 발생했다.

### 3️⃣ Grid 전체 길이를 ref로 구했는데 초기값이 적용되었다가 실제값으로 바뀌는 flickering 현상

이거는 전에 `useLayoutEffect`를 사용하여 비슷한 문제를 해결한 경험이 있어서 해당 방식을 사용했더니 해결할 수 있었다


## 적용된 디자인

![스토리북](https://velog.velcdn.com/images/su_jin1127/post/cc81f335-2a55-4d66-8c6e-9c788cf3341d/image.gif)

보이는 갯수를 수정하면 cell의 width가 바뀌도록 만든 과정이다!

![실제화면](https://velog.velcdn.com/images/su_jin1127/post/3b1ef44c-ab46-40bb-82c6-717e3d780a21/image.gif)


<br/>

---

<br/>

### 💭 느낀점

처음에는 너무 막막했다..

말로는 뭔지도 알고 어떻게 굴러갔으면 좋겠는지 너.무. 잘!! 알고 있지만 막상 디자인 작업을 하기에는 어려운.. 어떻게보면 라이브러리 하나 사용하지 않고 만든 작업이니까 직접 라이브러리를 만든건가?! 라는 생각도 들어서 완성 후에는 언제나 늘 그렇듯 뿌듯했다.

하지만, 비율 계산 로직을 짜면서 내가 했던 생각들과 고민들이 정말 가치 있었고 효율적인 고민들이었는가에 대해 다시 생각해보기도 했다
