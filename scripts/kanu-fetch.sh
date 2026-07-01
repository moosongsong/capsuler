#!/usr/bin/env bash
# 카누(e-ncp / shopby) 상품 검색 API 호출 스크립트
#
# 사용법:
#   ./kanu-fetch.sh [category] [pageNumber]
#
# category 는 카테고리 번호 또는 이름(별칭)으로 지정할 수 있습니다:
#   barista    | 930896  카누 바리스타 전용 캡슐
#   nespresso  | 930897  네스프레소 오리지널 호환(NCC)
#   dolcegusto | 930898  돌체구스토 호환
#
# 예시:
#   ./kanu-fetch.sh dolcegusto 1   # 돌체구스토 호환 1페이지
#   ./kanu-fetch.sh 930897 2       # NCC 2페이지 (번호로 지정)
#   ./kanu-fetch.sh barista        # 바리스타 1페이지(기본)
#
# 결과는 stdout으로 출력됩니다. jq가 있으면 예쁘게, 없으면 원본 JSON.
set -euo pipefail

CATEGORY_ARG="${1:-dolcegusto}"
PAGE="${2:-1}"

# 이름 별칭 → 카테고리 번호
case "${CATEGORY_ARG}" in
  barista)    CATEGORY=930896 ;;
  nespresso)  CATEGORY=930897 ;;
  dolcegusto) CATEGORY=930898 ;;
  *)          CATEGORY="${CATEGORY_ARG}" ;;  # 숫자 등 그 외는 그대로 사용
esac

curl -sS -G "https://shop-api.e-ncp.com/products/search" \
  --data-urlencode "categoryNos=${CATEGORY}" \
  --data-urlencode "pageNumber=${PAGE}" \
  --data-urlencode "filter.soldout=true" \
  --data-urlencode "filter.totalReviewCount=true" \
  --data-urlencode "filter.includeNonDisplayableCategory=false" \
  --data-urlencode "order.by=MD_RECOMMEND" \
  --data-urlencode "order.direction=ASC" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Clientid: 6lhBAvGVUqilJQCfrHdjCg==" \
  -H "Version: 1.0" \
  -H "Platform: PC" \
  -H "Origin: https://www.kanu.co.kr" \
  -H "Referer: https://www.kanu.co.kr/" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36" \
  | { command -v jq >/dev/null 2>&1 && jq . || cat; }
