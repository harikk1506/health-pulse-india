// vite.config.ts

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// --- SPECIAL TEST CODE ---
try {
  const filePath = path.resolve(__dirname, 'src/types/index.ts');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  console.log('---- VITE IS READING THIS FILE CONTENT ----');
  console.log(fileContent);
  console.log('---- END OF FILE CONTENT ----');
} catch (error) {
  console.error('!!!! VITE COULD NOT READ THE FILE !!!!');
  console.error((error as Error).message);
}
// --- END OF SPECIAL TEST CODE ---

export default defineConfig({
  plugins: [react()],
})