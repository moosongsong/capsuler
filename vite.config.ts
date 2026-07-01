import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base를 './'로 두면 GitHub Pages 프로젝트 경로(/저장소이름/) 에서도
// 별도 설정 없이 정적 자산 경로가 올바르게 잡힙니다.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    open: true,
  },
})
