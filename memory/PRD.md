# ShelterLink — PRD

## Original Problem Statement
User memiliki backend FastAPI (`/app/backend`) dan frontend React di GitHub `https://github.com/alvinnet21/shelter_care_frontend.git`. User ingin menambah **FAQ Template Chat Bot** untuk role **Seeker dan Provider** saja, dengan kemampuan:
- Tampilan UI Chat Bot di frontend (floating widget yang draggable & fleksibel)
- Bisa baca data di database (booking, listing, notifikasi user) lalu jawab pertanyaan Seeker/Provider menggunakan AI

## User Personas
- **Seeker**: Pencari shelter sementara, bisa tanya tentang booking-nya, listing yang available, notifikasi.
- **Provider**: Pemilik shelter, bisa tanya tentang listing miliknya, booking masuk, status verifikasi, review.
- **Admin / Verificator**: TIDAK punya akses ke chatbot (sudah di-guard di backend & frontend).

## Core Requirements
1. Floating chat widget yang **draggable bebas** ke seluruh layar (FAB & panel posisi disimpan di localStorage)
2. **Hybrid mode** — daftar FAQ template tombol cepat + input bebas yang dijawab AI
3. Bot **hanya boleh baca data milik user yang sedang login** (tidak boleh akses data user lain)
4. **Bilingual ID/EN auto-detect** — bot menjawab dalam bahasa yang sama dengan pertanyaan
5. AI: Google **Gemini 2.5 Flash** via API key user sendiri
6. Tampil hanya untuk role **SEEKER** dan **PROVIDER**

## Architecture
- Backend: FastAPI + Motor (MongoDB), repositories pattern (`/app/backend/`)
- Frontend: React 19 + Tailwind + shadcn/ui (`/app/frontend/`)
- LLM: `emergentintegrations.llm.chat.LlmChat` → provider `gemini`, model `gemini-2.5-flash` (configurable via `GEMINI_MODEL` env)
- Chatbot endpoints:
  - `GET  /api/chatbot/faq-templates` → list FAQ per role
  - `POST /api/chatbot/ask` → free-form question with user-scoped context

## What's Been Implemented (May 6, 2026)
- ✅ Cloned frontend repo to `/app/frontend`
- ✅ Restructured backend into `/app/backend` (was at `/app/`) so supervisor can manage it
- ✅ `services/chatbot_service.py` — FAQ templates (6 SEEKER, 7 PROVIDER) + scoped context builders + Gemini ask
- ✅ Routes `/api/chatbot/faq-templates` & `/api/chatbot/ask` with role guards (SEEKER/PROVIDER only)
- ✅ `components/ChatbotWidget.jsx` — draggable FAB + draggable panel + bilingual messaging
- ✅ Mounted in `App.js`, hidden for unauthenticated users and non-Seeker/Provider roles
- ✅ Bilingual fallback error messages
- ✅ FAB & panel positions persisted in `localStorage`
- ✅ Testing: 12/12 backend pytest tests PASS, 15/15 frontend UI checks PASS

## Backlog / Future Enhancements
- **P1**: Persistent chat history per user (currently in-memory per session)
- **P2**: MongoDB compound indexes for chat-context queries (`provider_id+deleted_at`, `seeker_id`, `user_id` on notifications)
- **P2**: Per-user rate-limit on `/api/chatbot/ask` to control Gemini token spend
- **P2**: Streaming responses for faster perceived speed
- **P2**: Dark mode for chatbot panel
- **P3**: Analytics dashboard untuk admin (jumlah questions per hari, FAQ paling sering ditanya)
- **P3**: Voice input via Web Speech API

## Test Credentials
See `/app/memory/test_credentials.md`
