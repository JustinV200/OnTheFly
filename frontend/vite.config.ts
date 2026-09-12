/* Configures the Vite dev server for the frontend app.
   This file keeps frontend build wiring out of feature modules. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
