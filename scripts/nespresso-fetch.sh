#!/usr/bin/env bash
# 네스프레소 코리아(ecapi) 상품/가격 API 호출 스크립트
#
# 사용법:
#   ./nespresso-fetch.sh [what]
#
# what:
#   products | (기본) 캡슐 전체 상품 목록(이름·강도·향미·디카페인·구매URL 등, allDetails)
#   prices   | 상품별 가격(캡슐당 pricePerUnit 등)
#
# 예시:
#   ./nespresso-fetch.sh products
#   ./nespresso-fetch.sh prices
#
# 팁:
#   상품의 id(예: erp.kr.b2c/prod/7970.80)로 prices 응답과 매칭됩니다.
#   결과는 stdout 출력. jq 있으면 예쁘게, 없으면 원본 JSON.
set -euo pipefail

WHAT="${1:-products}"
BASE="https://www.nespresso.com/ecapi/products/v2/kr/b2c"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"

case "${WHAT}" in
  products)
    URL="${BASE}/productsByCategories?language=ko&superCategory=capsule-range&usageIntent=standard-order&allDetails=true&frontend=Responsive&customerState=ANONYMOUS"
    ;;
  prices)
    URL="${BASE}/prices"
    ;;
  *)
    echo "사용법: $0 [products|prices]" >&2
    exit 1
    ;;
esac

curl -sS "${URL}" \
  -H "Accept: application/json, text/plain, */*" \
  -H "Accept-Language: ko-KR,ko;q=0.9" \
  -H "User-Agent: ${UA}" \
  | { command -v jq >/dev/null 2>&1 && jq . || cat; }
