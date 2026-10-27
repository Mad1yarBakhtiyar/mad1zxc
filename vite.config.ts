import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules')){if(/recharts|d3-|victory-vendor|react-smooth/.test(id))return 'charts';if(/react|scheduler/.test(id))return 'react-vendor';}}}}},server:{allowedHosts:['terminal.local'],proxy:{'/api':'http://127.0.0.1:8000'}}});
