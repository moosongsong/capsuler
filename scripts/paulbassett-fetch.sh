#!/usr/bin/env bash
# 폴바셋(Paul Bassett) 네이버 브랜드스토어 상품 조회 스크립트
#
# 네이버 브랜드스토어(brand.naver.com) 캡슐커피 카테고리의 상품 목록을 가져온다.
# 관문: User-Agent + Referer 헤더가 둘 다 있어야 200. (없으면 429 봇 차단)
#       X-Client-* 토큰은 불필요.
#
# 사용법:
#   ./paulbassett-fetch.sh [category] [page] [sortType] [pageSize]
#     category : nespresso(기본, 오리지널 호환) | dolcegusto(돌체구스토 호환) | <카테고리 id>
#     page     : 페이지 번호(기본 1)
#     sortType : POPULAR(기본) | RECENT | LOW_PRICE | HIGH_PRICE 등
#     pageSize : 페이지당 개수(기본 40, 80 초과 시 빈 결과)
#
# 예시:
#   ./paulbassett-fetch.sh                  # 네스프레소 호환 1페이지
#   ./paulbassett-fetch.sh dolcegusto       # 돌체구스토 호환 1페이지
#   ./paulbassett-fetch.sh nespresso 2      # 네스프레소 호환 2페이지
#
# 결과는 stdout. jq 있으면 예쁘게, 없으면 원본 JSON.
set -euo pipefail

# 폴바셋 브랜드 채널
CHANNEL="2sWDz3SjndibbF6vONhM8"

# 카테고리 별칭 → id
CAT_ARG="${1:-nespresso}"
case "${CAT_ARG}" in
  nespresso)  CATEGORY="0a8dee3afd6742e2af04ecef7225589a" ;;  # 네스프레소 오리지널 호환
  dolcegusto) CATEGORY="89fcb7c37de64da19f11f18ae987d728" ;;  # 돌체구스토 호환
  *)          CATEGORY="${CAT_ARG}" ;;                        # 그 외는 raw id로 사용
esac

PAGE="${2:-1}"
SORT="${3:-POPULAR}"
SIZE="${4:-40}"

URL="https://brand.naver.com/n/v2/channels/${CHANNEL}/categories/${CATEGORY}/products"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"

curl -sS -G "${URL}" \
  --data-urlencode "categorySearchType=DISPCATG" \
  --data-urlencode "sortType=${SORT}" \
  --data-urlencode "page=${PAGE}" \
  --data-urlencode "pageSize=${SIZE}" \
  --data-urlencode "deduplicateGroupEpId=false" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Accept-Language: ko-KR,ko;q=0.9" \
  -H "Referer: https://brand.naver.com/baristapaulbassett/category/${CATEGORY}" \
  -H "User-Agent: ${UA}" \
  | { command -v jq >/dev/null 2>&1 && jq . || cat; }
