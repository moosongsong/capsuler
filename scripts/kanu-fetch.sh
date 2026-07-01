#!/usr/bin/env bash
# 카누(e-ncp / shopby) 상품 검색 API 호출 스크립트
#
# 사용법:
#   ./kanu-fetch.sh [categoryNos] [pageNumber]
#
# 예시:
#   ./kanu-fetch.sh 930897 1     # 네스프레소 호환(NCC) 1페이지
#   ./kanu-fetch.sh 930896 2     # 카누 바리스타 전용 2페이지
#
# 결과는 stdout으로 출력됩니다. jq가 있으면 예쁘게, 없으면 원본 JSON.
set -euo pipefail

CATEGORY="${1:-930897}"   # 930897=네스프레소 호환, 930896=바리스타 전용
PAGE="${2:-1}"

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
