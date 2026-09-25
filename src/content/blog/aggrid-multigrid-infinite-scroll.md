---
title: "⚠️ agGrid에서 가상화 돔을 적용한 MultiGrid로 바꾸고 무한스크롤 적용하기"
pubDate: 2024-12-23
description: "문제상황 agGrid를 제거하기 위해 react virtualized 의 List 로 바꾸는 과정을 그동안 진행했었는데,, 상하좌우 스크롤이 필요한 grid에서 List 로는 좌우 스크롤이 불가능한 문제 가 발생했다."
tags: ["React", "Next.js", "TypeScript"]
---

### 문제상황
agGrid를 제거하기 위해 [`react-virtualized`](https://github.com/bvaughn/react-virtualized)의 `List`로 바꾸는 과정을 그동안 진행했었는데,,
상하좌우 스크롤이 필요한 grid에서 `List`로는 __좌우 스크롤이 불가능한 문제__가 발생했다. 

### 💻 코드에 적용해본거

우선, `List`에서 좌우 스크롤이 불가능한 것이니까 개발자도구 Element에서 css를 하나씩 수정해봤다. 수정해보니까 `List` 라이브러리 속 내용을 수정해야 했다.

그래서 다른 방법 중 하나로 사수가 만들어둔 PinableGrid를 사용해봤다.
PinableGrid는 맨 왼쪽 열이 고정되어 있고, 나머지 열들이 스크롤이 가능한 구조여서 이 원리를 적용하려고 했다. 그랬더니 행 별로 개별 스크롤이 적용되어 버리는 문제가 발생했다... 
ref를 사용해서 스크롤 동기화를 하려고 했더니 이 또한 라이브러리 속 내용을 수정해야 했다.
다른 방법을 시도할때마다 라이브러리 속 내용을 수정해야하는 문제에 계속 마주쳤다 😭

### 🔎 검색해본거

찾아보니 [table이 좌우 스크롤을 지원 안하는 것](https://github.com/bvaughn/react-virtualized/blob/master/docs/Table.md)처럼 List도 horizontal 스크롤 지원안하는것 같다.
![](https://velog.velcdn.com/images/su_jin1127/post/2a10a973-fe1d-4b4f-9b01-862ce94d5cc9/image.png)

List가 좌우스크롤을 지원안하는 이유는........
react-virtualized에는 [`MultiGrid`](https://github.com/bvaughn/react-virtualized/blob/master/docs/MultiGrid.md)가 있기 때문이다!!!!

## 🔑 해결방법

https://codesandbox.io/p/sandbox/react-virtualized-multigrid-y9e08?file=%2Fsrc%2FGridtable.js

multiGrid 사용 예시가 위 코드에서 굉장히 잘 나와있다.

대신,
클래스형 컴포넌트로 코드가 작성되어 있고,
내가 가진 데이터는 2차원 배열이 아니라서
내 코드에 적용시키는데 시간이 좀 걸렸다.

(하지만 예시가 있어서 너무 기뻤음)

List에 적용했던 방법을 그대로 적용하면 
모든 데이터가 다 겹쳐서 보이는 문제가 발생했다.

원인은 모든 데이터들을 top: 0px, left: 0px 로 style을 계산해버렸다.

그래서? 직접, 계산하는 로직을 코드에 추가해줬다.
분명 List에서는 style이 알아서 계산을 했는데 여기서는 왜 적용이 안된건지 모르겠다.
```tsx
const cellWidth = columns[columnIndex]?.width || DEFAULT_COLUMN_WIDTH;
const cellHeight = rowIndex === 0 ? HEADER_HEIGHT : ROW_HEIGHT;

// 직접 style 계산
const calculatedTop = rowIndex === 0 ? 0 : HEADER_HEIGHT + (rowIndex - 2) * ROW_HEIGHT;
const calculatedLeft = columns.slice(1, columnIndex).reduce((sum, col) => sum + (col.width || DEFAULT_COLUMN_WIDTH), 0);
```

rowIndex === 0 조건은 헤더는 따로 디자인을 해야하고,
스크롤시 상단에 고정시켜야하기 때문에 분리 작업이 필요하다.

`columns.slice(1, columnIndex)`

여기서 1이 아닌 0으로 해버리면 index가 1인 열 앞에 공백 생겨버리는 문제가 발생한다. columns 배열 정의를 고정된 헤더와 같이 정의해서 그런것 같다!

#### 무한스크롤 적용
List에서 사용했던 props 중 하나인 onRowsRendered 함수가 MultiGrid에는 없어서 onSectionRendered 를 사용했고
```tsx
const handleRowsRendered = ({ columnStartIndex, columnStopIndex, rowStartIndex, rowStopIndex }) => {
  const triggerPage = Math.floor((rowStopIndex + 1) / INITIAL_PAGE_LIST_LENGTH) + 1;
  if (triggerPage > page) {
    setPage(triggerPage);
  }
};

<MultiGrid
  	cellRenderer={cellRenderer}
  	fixedColumnCount={1}
  	fixedRowCount={1}
  	height={height}
  	width={width}
  	columnCount={columns.length}
  	columnWidth={columnWidth}
  	rowCount={gridData.length + 1}
  	rowHeight={rowHeight}
  	onSectionRendered={handleRowsRendered}
  	deferredMeasurementCache={cellCache}
  	overscanRowCount={10}
  	scrollToRow={0}
  	scrollToColumn={0}
  	className="debug-multi-grid"
  />
```

렌더링 되는 마지막 row index의 값이 필요하기 때문에 rowStopIndex 파라미터를 사용해서 무한스크롤 계산에 적용했다.

### 💭 느낀점

react-virtualized의 공식 문서를 봤음에도 불구하고 MultiGrid를 사용할 생각을 못했다... 사용하는 라이브러리 속에서 다른 방법을 찾아야하면 공식문서를 다시 한번 더 읽어보는 습관을 들여야할 것 같다.

(+)
Lighthouse 점수를 63점에서
![](https://velog.velcdn.com/images/su_jin1127/post/0be4cd8b-d01f-4faf-a8ae-8f6785ed7655/image.png)
93점으로 올렸다!!!
![](https://velog.velcdn.com/images/su_jin1127/post/de3c0453-3db1-4b35-9c17-f57495ba0092/image.png)

---

[참고]

https://codesandbox.io/p/sandbox/react-virtualized-multigrid-y9e08?file=%2Fsrc%2FGridtable.js%3A27%2C38

https://github.com/bvaughn/react-virtualized/blob/master/docs/Table.md

https://github.com/bvaughn/react-virtualized/blob/master/docs/MultiGrid.md
