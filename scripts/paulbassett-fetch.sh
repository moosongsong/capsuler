#!/usr/bin/env bash
# 폴바셋(Paul Bassett) 네이버 브랜드스토어 상품 조회 스크립트
#
# 네이버 브랜드스토어(brand.naver.com) 캡슐커피 카테고리의 상품 목록을 가져온다.
# 관문: User-Agent + Referer 헤더가 둘 다 있어야 200. (없으면 429 봇 차단)
#       X-Client-* 토큰은 불필요.
#
# 사용법:
#   ./paulbassett-fetch.sh [page] [sortType] [pageSize]
#     page     : 페이지 번호(기본 1)
#     sortType : POPULAR(기본) | RECENT | LOW_PRICE | HIGH_PRICE 등
#     pageSize : 페이지당 개수(기본 40)
#
# 예시:
#   ./paulbassett-fetch.sh            # 인기순 1페이지
#   ./paulbassett-fetch.sh 2 RECENT   # 최신순 2페이지
#
# 결과는 stdout. jq 있으면 예쁘게, 없으면 원본 JSON.
set -euo pipefail

# 폴바셋 브랜드 채널 / 캡슐커피 카테고리
CHANNEL="2sWDz3SjndibbF6vONhM8"
CATEGORY="0a8dee3afd6742e2af04ecef7225589a"

PAGE="${1:-1}"
SORT="${2:-POPULAR}"
SIZE="${3:-40}"

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
