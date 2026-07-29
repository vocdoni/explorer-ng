import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  // Expose VOCONE_* alongside VITE_*, so the variable names documented in
  // .env.example and consumed by docker/entrypoint.sh also work in dev builds.
  envPrefix: ['VITE_', 'VOCONE_'],
  server: {
    port: 3000,
    cors: true,
  },
})
