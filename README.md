# CCL Digital Visitor Management System (DVMS) v2.0

Enterprise full-stack Digital Visitor Management System for Central Coalfields Limited (CCL), built with React, Node.js, Express, MongoDB, and Socket.IO.

## Live Deployment on Render (render.com)

This repository is pre-configured for a **Single Unified Web Service** on Render with automatic frontend building and backend serving.

### 1. Build & Start Commands
- **Build Command:** `npm run render-build`
- **Start Command:** `npm start`

### 2. Environment Variables Required on Render:
- `NODE_ENV`: `production`
- `MONGO_URI`: `mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/ccl-dvms?retryWrites=true&w=majority`
- `JWT_SECRET`: `ccl_dvms_enterprise_jwt_super_secret_key_2026_x`
- `JWT_REFRESH_SECRET`: `ccl_dvms_enterprise_refresh_token_secret_key_2026_y`
- `ENCRYPTION_KEY`: `0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef`

### 3. URL Name on Render
Set Service Name to: `ccl-digital-visitor`  
Render URL will be: `https://ccl-digital-visitor.onrender.com`
