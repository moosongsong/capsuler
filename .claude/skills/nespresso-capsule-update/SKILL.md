---
name: nespresso-capsule-update
description: 네스프레소(오리지널/버츄오, 스타벅스·블루보틀 협업 포함) 캡슐·패키지 데이터를 공식 API로 최신화한다. 신규 캡슐/패키지 추가, 사라진 항목 소프트 단종(isEnabled:false), 가격·구성 갱신, 새 향미 등록을 수행한다. "네스프레소 캡슐/패키지 업데이트/갱신/최신화", "전시 상품 동기화" 요청 시 사용.
---

# 네스프레소 캡슐·패키지 업데이트

네스프레소 코리아 공식 API(`scripts/nespresso-fetch.sh`)로 현재 전시 중인 캡슐·패키지를 가져와
`src/data/capsules/nespresso.json` · `src/data/packages/nespresso.json` · `src/data/notes.json` 을 최신 상태로 맞춘다.

## 스코프
- **대상 브랜드**: `Nespresso`, `Starbucks`, `Blue Bottle` (모두 네스프레소 API 상품)
- illy·카누 등 다른 브랜드는 **절대 건드리지 않는다**.
- **캡슐 단품**(`capsules/nespresso.json`)과 **패키지/세트**(`packages/nespresso.json`) 모두 반영. 다른 브랜드 패키지는 각자 `packages/{brand}.json`으로 분리 관리한다.
- 패키지는 `bundled:true` 상품 중 **구성 캡슐이 2종 이상 매핑되는 순수 어소트먼트만** 대상(에어로치노·나노포머 같은 하드웨어 세트는 매핑 캡슐이 0~1종이라 자동 제외).

## 정책 (캡슐)
- **신규 캡슐** → 추가(공개). 강도·향미·가격·구매URL은 API값, 산미·바디·쓴맛은 강도·향미 기반 근사값.
- **사라진 캡슐** → 삭제하지 않고 `isEnabled: false` (앱 공개 목록에서 제외, 이력 보존).
- **다시 전시된 캡슐** → `isEnabled` 해제(공개 복구).
- **기존 캡슐** → 가격·구매URL만 갱신하고, 큐레이션 값(강도/향미/설명/산미 등)은 보존.
- **새 향미(notes)** → 기존과 매칭되는 게 없으면 `notes.json`에 추가(한글=API명, 영문=id 파생, 아이콘=키워드 휴리스틱).

## 정책 (패키지)
- **신규 패키지** → 추가(id 4000번대). `items`는 구성 캡슐을 내 캡슐 id로 매핑(`buyUrl` 꼬리=`urlFriendlyName` 기준), `qty`는 API 수량. 가격은 패키지 전체가(`price`), 호환머신은 이름/URL로 추정.
- **사라진 패키지** → `isEnabled: false` (소프트 단종).
- **다시 전시된 패키지** → `isEnabled` 해제.
- **기존 패키지** → 가격·구매URL·이미지·구성(`items`)을 API 기준으로 갱신하되, **영문명(`name`)은 큐레이션 값이라 보존**한다.
- 구성 비교는 순서 무관(id 정렬)이라 순서만 바뀌면 변경으로 잡지 않는다.

## 실행 절차
1. **미리보기**: `node scripts/update-nespresso.mjs --dry-run`
   - 리포트(신규/단종/가격변경/새 향미)를 검토한다.
   - ⚠️ **안전장치**: 단종 처리가 비정상적으로 많으면(예: 10종 이상 한꺼번에) API 조회 실패나 스키마 변경일 수 있으니 **중단하고 원인부터 확인**한다. 정상이면 대개 단종 0~소수.
2. **반영**: `node scripts/update-nespresso.mjs`
3. **신규 항목 다듬기** (스크립트가 못 하는 판단 영역):
   - **캡슐 영문명(`name`)**: 스크립트는 raw `internationalName`을 넣어 지저분하다(예: `NN BC SCURO R80`). 리포트의 `[영문명 검토요망]` 항목을 실제 제품명으로 수정한다(예: `Double Espresso Scuro`).
   - **패키지 영문명(`name`)**: 마찬가지로 raw SKU 문자열(예: `KR OL INTENSE PACK`)이 들어가니 실제 세트명으로 수정한다(예: `Original Intense Selection (6)`).
   - **설명(`desc`)**: 자동 생성 문구를 자연스럽게 다듬는다.
   - **산미/바디/쓴맛**: 근사값이므로 명백히 어색하면 조정한다.
   - 강도가 `0`인 캡슐(아이스/가향 등 미표기)은 앱에서 강도 표시 없이 노출되므로 그대로 둔다.
4. **검증**: `npm run typecheck` (통과 필수). 필요시 `preview_start`로 화면 확인.
5. **보고**: 추가/단종/가격변경/새 향미 요약을 사용자에게 전달한다.

## 커밋
- **요청 없이 커밋·푸시하지 않는다.** 변경 요약만 보고하고, 사용자가 원하면 커밋한다.

## 참고
- 캡슐 매칭 기준은 **`nameKo` + 호환머신** 조합(®·공백·* 정규화). 원본/버츄오에 같은 이름(예: 콜롬비아·에티오피아)이 있어도 섞이지 않는다. 이름이 바뀐 캡슐은 "단종 + 신규"로 잡힐 수 있으니 리포트에서 교차 확인한다.
- 패키지 매칭 기준은 `nameKo`(`(60 캡슐)` 표기 정규화). 구성 캡슐은 API `groupedProducts[].productCode`(=`legacyId`) → 상품 `urlFriendlyName` → 내 캡슐 `buyUrl` 꼬리로 이어 매핑한다. 그래서 캡슐의 `buyUrl` 슬러그가 정확해야 패키지 구성도 채워진다.
- 상품↔가격은 상품 `id`(예: `erp.kr.b2c/prod/7970.80`)로 매칭. 캡슐은 `pricePerUnit`(캡슐당), 패키지는 `price`(세트 전체가)를 쓴다.
- 카테고리/브랜드가 늘면 `scripts/update-nespresso.mjs`의 `NESPRESSO_BRANDS`·`brandOf`를 확장한다.
