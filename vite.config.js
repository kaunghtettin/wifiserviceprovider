import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const appPath = new URL(env.APP_URL || 'http://localhost').pathname.replace(/\/+$/, '');

    return {
        base: `${appPath}/build/`.replace(/\/+/g, '/'),
        plugins: [
            laravel({
                input: 'resources/js/app.jsx',
                refresh: true,
            }),
            react(),
        ],
    };
});
