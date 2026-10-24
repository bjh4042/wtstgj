import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({root:'dist',base:'/wtstgj/',publicDir:false,build:{outDir:'../build',emptyOutDir:true,rollupOptions:{input:resolve('dist/index.html')}}});
