📋 Prerequisites yang Dibutuhkan Pastikan sudah terinstall:

Node.js (v16 atau lebih baru) - Download Python (v3.11 atau lebih baru) - Download MongoDB - Download MongoDB Community atau gunakan MongoDB Atlas (gratis) Yarn - Install dengan: npm install -g yarn

Setup Frontend (React) Buka terminal baru di VS Code (jangan tutup terminal backend):

Install dependencies
yarn install 
Edit file .env di folder frontend:

REACT_APP_BACKEND_URL=http://localhost:8001 Jalankan frontend:

yarn start 
Frontend akan otomatis terbuka di browser: http://localhost:3000 ✅