---
title: "⚠️ 렌더링 최소화, 배칭 처리, WebWorker와 Throttle로 React 기반 실시간 대용량 데이터 처리 최적화"
pubDate: 2025-10-26
description: "인포맥스 단말기 MFC 화면은 장 초반에 데이터가 다량으로 들어올때 많은 리얼 데이터가 들어오게 되면서 CPU가 올라가며 데이터가 밀려, 잠시 동안 멈춘것처럼 보이는 현상이 발생합니다."
tags: ["JavaScript", "React", "최적화"]
---

인포맥스 단말기 MFC 화면은 장 초반에 데이터가 다량으로 들어올때 많은 리얼 데이터가 들어오게 되면서 CPU가 올라가며 데이터가 밀려, 잠시 동안 멈춘것처럼 보이는 현상이 발생합니다.

![](https://velog.velcdn.com/images/su_jin1127/post/e760371c-86d3-4fb7-a641-e323c507f0ef/image.png)
이렇게 실시간으로 들어오는 화면들을 여러개 띄웠을때 해당 현상이 주로 발생합니다. 이때 보이지 않는 데이터는 **렌더링 처리하지 않는 과정**이 필요한데 <u>불필요한 영역까지 렌더링</u> 하고 있어서 이때 메모리 누수가 발생했습니다.

## 해결 방법
MFC로 만들어진 화면을 WebView2와 사내 통신망을 사용하여 해결했습니다.
- WebView2는 마이크로소프트에서 만든 MFC 프로그램 안에 웹화면을 삽입할 수 있게 만들어주는 컴포넌트입니다.
- 사내 통신망은 브라우저가 외부 네트워크를 사용하지 않고도 단말 내부에서 실시간 데이터를 직접 받을 수 있도록 해주는 프로그램입니다.

<br/>

WebView2를 도입한 이유는

- 웹을 통해 더 직관적인 UI/UX 구현이 가능합니다.
  - Map을 벗어나 웹을 통해 데이터 시각화를 할 수 있고 UI UX를 개선할 수 있습니다

- 메모리 누수의 문제 원인인 보이지 않는 영역까지 렌더링 하는 것을 웹에서는 가상화 처리를 통해 개선할 수 있습니다.
   ![](https://velog.velcdn.com/images/su_jin1127/post/491faef2-968e-4c4d-90cc-dad6a3fa02dc/image.png)
    - 여기서 말하는 가상화 처리는 데이터의 총 길이가 10개 일때, 7개만 보인다면, 보이는 7개 영역만 렌더링 되도록 하는 기법입니다.
- 웹으로 실시간 데이터 통신이 안되는 고객사(보안 상의 이유로)에 웹 화면도 제공할 수 있습니다.

## 개발 과정

> 개발 환경
- React 18
- Typescript
- Next.js 14
- TailwindCSS

3111 화면을 WebView2로 제작할 때,
FormDe를 참고하여 화면에 들어가는 실시간 TR 코드를 각각 찾아 웹 화면에 적용했습니다.

### WebView2 도입 후 발생한 문제
0.01초에 5,000건 이상의 체결 데이터가 들어오면 CPU와 메모리가 급격하게 치솟는 현상이 있었습니다.
![](https://velog.velcdn.com/images/su_jin1127/post/642f0f72-4166-40df-a817-4e984aa08b0e/image.png)

이러한 병목 현상을 3가지 방법으로 최적화했습니다.

## 실시간 대용량 데이터 최적화 방법 3가지
1. 실시간 체결 데이터 렌더링 최소화
2. 데이터 맵핑 로직에 Web Worker 활용
3. 화면 갱신 주기 조절

### 1️⃣ 실시간 체결 데이터 렌더링 최소화
실시간 체결 데이터는 초당 수천 건이 들어오기 때문에 상태 업데이트가 매우 빈번합니다.

일반적으로 react로 개발을 하면 useState로 데이터 상태 관리를 해줍니다.

```tsx
// 성능 문제가 있는 일반적인 방식
const [tickData, setTickData] = useState<TickData[]>([]);

// 새 데이터가 올 때마다
setTickData (prev => [...newData, ...prev]); // 매번 전체 리렌더링 !
```

useState를 사용할 경우, 상태가 변경될 때마다 컴포넌트가 리렌더링되며 성능 저하가 발생합니다.

```tsx
// 성능 최적화된 Ref 기반 방식
const allDataRef = useState<ProcessedWLData[]>([]);
const [, forceUpdate] = useState({});

const triggerRerender = useCallback(() => {
  	forceUpdate({});	// 필요할때만 리렌더링 트리거
}, []);
```
반면에 useRef는 렌더링 사이클과 무관하게 값만 바뀌고, 리렌더링을 유발하지 않습니다.

그래서 렌더링이 꼭 필요한 시점에만 화면이 갱신되도록 분리하고, **실시간 데이터를 담는 컨테이너 역할로 ref를 활용**해 불필요한 렌더링을 줄였습니다.

triggerRerender 함수를 사용하면 필요할때만 리렌더링할 수 있도록 조절할 수 있습니다.

### 2️⃣ 데이터 맵핑 로직에 Web Worker 활용
자바스크립트는 싱글 스레드 구조라서 화면 렌더링, 클릭 이벤트 처리, 데이터 연산이 모두 같은 스레드에서 실행됩니다. 그래서 실시간 데이터가 많아지면 렌더링과 연산이 충돌하게 됩니다.
![](https://velog.velcdn.com/images/su_jin1127/post/225172eb-2ba6-4bec-a33d-a1def2079867/image.png)

이를 해결하기 위해 Web Worker를 사용했습니다. Worker는 메인 스레드와는 분리된 스레드에서 동작하며, 데이터 연산만 전담하게 했고, 결과만 메인으로 보내줍니다. 여기서 postMessage는 메인 스레드와 web worker 간에 데이터를 주고받는 통신 수단입니다.

3111에서는 실시간으로 유입되는 데이터를 화면에 보기 좋게 가공해서 표에 넣는 작업이 필요합니다.

저는 이 데이터 가공 로직을 **Web Worker로 분리**해, 데이터 변환 작업을 백그라운드에서 비동기로 처리하도록 했습니다.

```tsx
const processOrderBookData = (rawData) => {
  const convertedData = convertOrderBookData(rawData);

  return {
    ...convertedData,
    formatted: {
      중간가: formatNumber(convertedData.중간가),
      총매수호가잔량: formatNumber(convertedData.총매수호가잔량),
      중간가등락률:
        convertedData.중간가등락률 > 0
          ? `+${convertedData.중간가등락률.toFixed(2)}`
          : `${convertedData.중간가등락률.toFixed(2)}`,
    },
  };
};
```

예를 들어, 
호가창에서 중간가, 총매수호가잔량, 등락률 같은 경우에는 모든 항목에서 포맷 함수들을 사용하여 데이터 가공 처리가 필요하여 이 과정을 Worker에서 처리했습니다.

### 3️⃣ 화면 갱신 주기 조절
마지막으로 throttle을 사용하여 화면 갱신 주기를 제한했습니다

Throttle은 우리나라말로 ‘조절하다’ 라는 뜻을 가지고 있습니다.

![](https://velog.velcdn.com/images/su_jin1127/post/8ac51db5-eb49-42ba-90f4-bfa40767ed8a/image.png)
그림처럼 버튼을 빠르게 50번 누르면 서버에 50번 요청이 가게 됩니다.
그럼 브라우저도 버벅거리고 서버에도 과부하가 걸리게 됩니다.

이때 throttle을 쓰면 **‘0.1초에 한 번만 실행해’**달라고 제한을 걸 수 있습니다.

<br/>

실시간 데이터에서도 똑같습니다.

0.01초마다 데이터가 들어오면 너무 자주 화면이 렌더링되는데,
throttle을 적용하면 0.1초에 한 번만 렌더링되도록 조절할 수 있어 렌더링 빈도가 감소하게 되어 CPU 성능을 개선시킬 수 있습니다

![](https://velog.velcdn.com/images/su_jin1127/post/0e86b540-4cee-4813-8d3b-d0700c1faa0b/image.png)

처음에는 lodash 라이브러리의 throttle을 사용했지만, 사진처럼 CPU 성능 부하가 여전히 발생하여 Web Worker 안에 넣었습니다.

하지만 Web Worker는 별도의 스레드로 작동하는 자바스크립트 파일이라 lodash 라이브러리를 불러올 수 없었습니다. 그래서 직접 throttle 로직을 Worker 내부에 구현해, 0.1초마다 렌더링 되도록 구현했습니다.

> 💡 이렇게 하여 데이터 수신은 실시간으로 계속 진행되지만, 화면은 0.1초당 1번만 업데이트되도록 조절하여 CPU 부담을 낮추고 불필요한 렌더링을 방지했습니다.

<br/><br/>

### 체결 데이터 로직
체결 데이터의 전체적인 로직은 다음과 같습니다

![](https://velog.velcdn.com/images/su_jin1127/post/fe703a46-1ba1-4c5a-8fd8-7823706f986f/image.png)

1. STEX9 리얼 코드에서 데이터를 실시간으로 받아오고
2. Web worker로 받아온 데이터를 가공하고
3. 해당 데이터를 ref에 최대 1000개만 저장 가능하도록 제한하고
4. 쓰로틀로 0.1초에 한번씩 렌더링 되도록 구현했습니다

### 과부하 테스트
1개의 창을 띄웠을때 0.1초에 한번에 최대 380만개의 데이터를 불러올 수 있고
![](https://velog.velcdn.com/images/su_jin1127/post/93b6ae7c-151f-4254-8fd5-27b0fec0d2e9/image.png)

1초에는 최대 400만개의 데이터를 불러올 수 있습니다.
![](https://velog.velcdn.com/images/su_jin1127/post/e067e764-4626-4a09-900e-1b322562c3f4/image.png)
