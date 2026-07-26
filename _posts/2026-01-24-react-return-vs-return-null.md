---
layout: article
title: "React에서 return; 과 return null; 뭐가 다를까 ?"
key: react-return-vs-return-null
tags:
  - JavaScript
  - React
---

React의 컴포넌트에서 return;과 return null;의 차이는 뭘까 ?

회사에서 아래와 같은 상황으로 
<img width="400px" src="https://velog.velcdn.com/images/su_jin1127/post/d302c325-b6c3-46b8-a035-089d089ea37a/image.png" />
코드 리뷰가 제안된 PR이 있어서 스크럼때 react에서의 null과 undefined 차이에 대해 이야기를 하다가 _내가 자바스크립트와 리액트에 대해 잘 알고 있나?_ 라는 생각이 문득 들어서 자세하게 찾아봤다.

<!--more-->

---

## React 컴포넌트에서 `return;` VS `return null;`

|`function EmptyComponent() { return; }`    | `function EmptyComponent() { return null; }` |
|----|:----|
|아무것도 렌더링되지 않는다|**의도적으로** “아무것도 렌더링하지 않기”   |
|18에서는 `null`과 결과 동일|   |
|React 16에서는 에러 발생. |   |
| `Error: Nothing was returned from render. This usually means a return statement is missing.`|  |



- **React 16**
  - `return null;`
    - 정상 동작
    - “아무것도 렌더링하지 않음”을 명시
  - `return;` & `return undefined;`
    - ⚠️ 런타임 에러 발생
    - Nothing was returned from render. 
    This usually means a return statement is missing.
    - 발생 이유: 개발자가 실수로 `return`문을 빼먹었을때 빠르게 찾아내기 위한 **방어적 설계**

**React 18**
- `return;` 과 `return null;`
    - 아무것도 렌더링하지 않음을 동일하게 처리
    - 이유: 업데이트되면서 타입스크립트와의 호환성 및 내부 렌더링 로직(Fiber)를 정리하며, `null`과 `undefined`를 굳이 차별할 이유가 없어졌다.

<br/>

### return; 에서는 뭘 return 하는 걸까 ?

```tsx
function test() {
	return;
}
```
<details>
<summary>test() 를 출력했을 때의 결과물은 ?</summary>
<img width="300px" src="https://velog.velcdn.com/images/su_jin1127/post/99de80aa-2415-4f3a-a29a-d345e261bcb1/image.png" />
  
  보이는 것처럼 undefined를 리턴하고 있다.
</details>

<br/>

이때,
### null을 입력해야 더 좋은거 아닌가? 성능적으로는 어떨까?

별 차이 없다.

| React 16 | React 18 |
| --- | --- |
| 동작 여부의 문제(Error vs Success) | 리액트 내부의 `Fiber` 트리 구조에서 `null` 이나 `undefined` 모두 “자식 없음” 처리 |
| `undefined`를 반환하면 앱이 멈추는 문제 발생 | 메모리 점유율이나 연산량에서 유의미한 차이 발생 X |

React 내부 개념을 대략적으로 간소화해보면 아래 구조를 가진다.

```tsx
type ReactNode =
  | JSX.Element
  | string
  | number
  | null
  | undefined
  | boolean;
```

React 18에서 `undefined`를 empty node로 인정했고
렌더 트리에서 null과 동일하게 처리하기로 했다.

왜 이렇게 되었을지 알아보려면
React Reconciler를 확인해봐야 한다. 
여기에 어떻게 화면이 바뀌고, 어떤 값을 무시하는지 담겨 있기 때문 !!
![](https://velog.velcdn.com/images/su_jin1127/post/3d59889b-d4f2-42fa-9b2e-aae093f2bca5/image.png)

Reconciler의 3가지 핵심 역할으로는,,

1. 리액트의 ‘두뇌’ 역할 (V-DOM Diffing)
    - Reconciler의 역할은 React Element 객체를 받아서 이전 화면과 무엇이 달라졌는지를 계산하고, 어떤 부분을 업데이트해야 효율적인지 결정
2. 리액트의 구조
    - React Core(`react`): useState, useEffect
    - Reconciler(`react-reconciler`): 화면을 어떻게 구성할지 ‘설계도’를 그리는 (Fiber 아키텍처)
    - Renderer(`react-dom`, `react-native`): 설계도대로 실제 화면에 그리는 작업자
3. Fiber 아키텍처의 심장부
    - Fiber는 렌더링 작업을 작은 단위로 쪼개서 우선순위를 정하는 알고리즘
    - 작업을 쪼갤 때 ‘이 노드는 작업할 가치가 있는가?’를 결정
    - Fiber 노드를 생성, 연결, 삭제 과정이 reconciler 안에 담겨 있다
    
<br/>

이제 react 내부 코드를 뜯어보자면,,,
https://github.com/facebook/react/blob/main/packages/react-reconciler/src/ReactChildFiber.js
```jsx
// packages/react-reconciler/src/ReactChildFiber.js

function reconcileChildFibersImpl(
  returnFiber: Fiber,
  currentFirstChild: Fiber | null,
  newChild: any,
  lanes: Lanes,
): Fiber | null {

  const isUnkeyedUnrefedTopLevelFragment =
	  // 자바스크립트 객체인가
    typeof newChild === 'object' && newChild !== null 
    // Fragment 타입인가 (<> ... </>)
    && newChild.type === REACT_FRAGMENT_TYPE 
    && newChild.key === null 
    && (enableFragmentRefs ? newChild.props.ref === undefined : true);
	
	// 개발 환경에서만 검사 (배포했을때의 성능을 위해)
  if (isUnkeyedUnrefedTopLevelFragment) {
    validateFragmentProps(newChild, null, returnFiber);
    newChild = newChild.props.children;
  }
  
	// 1. 객체 타입(컴포넌트, DOM 노드 등)인지 확인  
  if (typeof newChild === 'object' && newChild !== null) {
    switch (newChild.$$typeof) {
      case REACT_ELEMENT_TYPE: {
        const prevDebugInfo = pushDebugInfo(newChild._debugInfo);
        const firstChild = placeSingleChild(
          reconcileSingleElement(
            returnFiber,
            currentFirstChild,
            newChild,
            lanes,
          ),
        );
        currentDebugInfo = prevDebugInfo;
        return firstChild;
      }

	// 2. 문자열이나 숫자인 경우 (텍스트 노드 생성)
  if (
    (typeof newChild === 'string' && newChild !== '') ||
    typeof newChild === 'number' ||
    typeof newChild === 'bigint'
  ) {
    return placeSingleChild(
      reconcileSingleTextNode(
        returnFiber,
        currentFirstChild,
        // $FlowFixMe[unsafe-addition] Flow doesn't want us to use `+` operator with string and bigint
        '' + newChild,
        lanes,
      ),
    );
  }
	
  // 3. 위 조건에 해당하지 않는 경우 (null, undefined, boolean)
  // 아무것도 반환하지 않음으로써 '빈 결과' 확정 !
  // Remaining cases are all treated as empty.
  return deleteRemainingChildren(returnFiber, currentFirstChild);
}
```

### `boolean`을 같이 처리하는 이유는 ?

`{isOpen && <Modal /> }` 과 같은 조건부 렌더링 때문에
`false`라고 그대로 출력되면 불편하니까 `boolean` 값을 렌더링 트리에서 무시하도록 설계를 한 것이다.

다만, `{count && <Component />}` 를 사용하면 `0`이 글자로 찍힌다.
이때는 `count` 앞에 `!!` 연산자를 붙여주면 0이 글자로 찍히지 않는다.
    



## javascript에서 `null` vs `undefined`
리액트는 javascript로 만들어졌으니까 좀 더 찾아봤다.

<img width="300px" src="https://velog.velcdn.com/images/su_jin1127/post/50d1cca0-d737-44e6-8859-1b3f275c5dab/image.png"/>


```tsx
const a = null;
const b = undefined;
```

null과 undefined의 차이는 뭘까 ?
undefined는 선언이 안된걸까 ? 라고 생각을 했다가
어쨋든 b 라는 변수를 선언해준거 아닌가 ?? 라는 생각도 같이 들었다.


하지만 `const b;` 는
![](https://velog.velcdn.com/images/su_jin1127/post/ef131188-6fe2-466e-8ca9-19f159ab5907/image.png)

이런식으로 에러가 난다
왜냐하면 `const`는 상수니까.
상수는 선언과 동시에 값이 결정되어야 한다. 나중에 바꿀 수 없다.

그렇다면 

```tsx
var a = null;
var b = undefined;
var c;
```
의 차이는 뭘까
c는 선언만 한거라서 안에 쓰레기 값이 할당되어 있다고 답변했다가

선언과 할당의 차이는 뭐냐는 질문을 받았다.
**선언**과 **할당**의 차이는 뭘까 ?!


### 선언(Declaration) vs 할당(Assignment)

- 선언: 내가 앞으로 c 라는 이름을 쓸 거니까 메모리에 공간 하나 확보해줘.
- 할당: 확보한 메모리 공간에 10 이라는 값을 넣어줘.

자바스크립트에서는 `var c;` 라고 선언만 하면 자동으로 `undefined` 값을 넣는다.
자바스크립트에는 쓰레기 값이 존재하지 않는다.

<img width="300px" src="https://velog.velcdn.com/images/su_jin1127/post/4726ebd4-e2d0-47c8-9c20-d6015d76a80a/image.png" />


```tsx
var a = null;       // "비어있음"을 명시적으로 '할당'
var b = undefined;  // "정의되지 않음"을 명시적으로 '할당'
var c;              // '선언'만 한 것. 엔진이 자동으로 undefined '할당'
```

b는 개발자가 의도적으로 넣은 것. 
c는 아무것도 안 해서 엔진이 만들어서 생긴 값.

쓰레기 값이 생기지는 않는다. 쓰레기 값은 C언어에서만 !

<br/>
이제 null과 undefined의 차이는…

| 구분 | **undefined** | **null** |
| --- | --- | --- |
| **의미** | 값이 **정의되지 않음** (초기 상태) | 값이 **없음**을 명시적으로 선언함 |
| **할당** | 변수 선언 후 값을 넣지 않았을 때 자동으로 할당됨 | 개발자가 "여기는 빈 값이야"라고 직접 할당함 |
| **Type** | `typeof undefined === 'undefined'` | `typeof null === 'object'` (JS의 유명한 설계 오류) |

왜 설계 오류인가를 찾아봤을 때
타입 태그에서 `000`을 객체로 보도록 만들어서 그렇다고 한다.
그래서 `if (typeof v === 'object' && v !== null)` 으로 방어 코드가 반드시 필요하다고 한다.

---
참고
- https://react.dev/reference/react/Children
- https://react.dev/blog/2022/03/08/react-18-upgrade-guide
- https://github.com/reactwg/react-18
- https://velog.io/@a-honey/Understanding-return-null-vs-return-false-in-React
- https://junghyeonsu.com/posts/react-fragment-vs-null/
