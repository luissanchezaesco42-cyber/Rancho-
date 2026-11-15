import { defineConfig } from 'vite';

// En GitHub Actions: "compilación N". En tu PC: "desarrollo".
const build = process.env.GITHUB_RUN_NUMBER ? `compilación ${process.env.GITHUB_RUN_NUMBER}` : 'desarrollo';

export default defineConfig({
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  test: { environment: 'jsdom' },
});
