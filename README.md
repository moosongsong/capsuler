# 오늘의 한 잔 — 커피 캡슐 추천

취향(진하기·산미·바디·향)을 입력하면 맞는 커피 캡슐을 추천해 주는 모바일 프로토타입 앱입니다.
Vite + React로 구성되어 있습니다.

## 화면

- **둘러보기** — 캡슐 목록, 브랜드/향미 필터, 검색, 정렬
- **추천** — 슬라이더로 취향 입력 → 매칭 점수 상위 3개 추천
- **찜** — 하트로 찜한 캡슐 모아보기
- **마이** — 후기 모음, 다크 모드 등 설정
- **상세** — 캡슐 상세 정보, 별점·후기 작성, 비슷한 캡슐

## 로컬 실행

```bash
npm install
npm start
```

`npm start`를 실행하면 개발 서버가 뜨고 브라우저가 자동으로 열립니다(기본 http://localhost:5173).

## 빌드

```bash
npm run build      # dist/ 에 정적 파일 생성
npm run preview    # 빌드 결과 미리보기
```

## GitHub Pages 배포

`.github/workflows/deploy.yml` 에 GitHub Actions 워크플로우가 포함되어 있습니다.
`main` 브랜치에 push하면 자동으로 빌드 후 GitHub Pages에 배포됩니다.

### 최초 1회 설정

1. GitHub에 저장소를 만들고 push 합니다.
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 변경합니다.
3. 이후 `main` 브랜치에 push하면 Actions 탭에서 배포가 진행되고,
   완료되면 `https://<사용자명>.github.io/<저장소이름>/` 에서 확인할 수 있습니다.

> `vite.config.js`의 `base: './'` 설정 덕분에 저장소 이름과 무관하게 경로가 맞춰집니다.

## 기술 스택

- React 18
- Vite 5
- [Tabler Icons](https://tabler.io/icons) (CDN 웹폰트)
