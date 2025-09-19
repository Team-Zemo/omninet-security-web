import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['sockjs-client', 'stompjs']
    },
    server: {
        allowedHosts: ['vite.steel.udaykhare.social','steel.udaykhare.social:5173','localhost:5173'],
        port: 5173,
        hosts: ['steel.udaykhare.social','localhost','vite.steel.udaykhare.social'],
    }

})


