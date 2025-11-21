# MythTech App

A production-ready interactive UI for the MythTech stack. This build ships a "Weaver's Loom" dashboard that tracks the MT-07 axis net, summit beats, brittleness flags, and mirror passes in real time or demo mode.

## Getting started

1. Install dependencies
   ```bash
   npm install
   ```
2. Run the dev server
   ```bash
   npm run dev
   ```
3. Build for production
   ```bash
   npm run build
   ```

Tailwind utility classes are provided via the CDN include in `index.html`, so no additional CSS tooling is required. The live mode expects an MT-07 stream at `/tau/mt-07/stream` (SSE or WebSocket) from the configured base URL.
