import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// BrowserRouter(경로 기반 라우팅)를 쓰므로 base를 절대 경로로 둔다.
// (상대 './'는 /capsuler/capsule/1001 같은 다중 세그먼트 경로에서 자산 경로가 깨짐)
// GitHub Pages 프로젝트 사이트 경로와 일치시킨다: https://<user>.github.io/capsuler/
export default defineConfig({
  base: '/capsuler/',
  plugins: [react()],
  server: {
    open: true,
  },
})
