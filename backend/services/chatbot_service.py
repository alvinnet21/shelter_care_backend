"""Chatbot service: FAQ templates + Gemini AI Q&A scoped to current user's data."""
import os
import json
from typing import List, Dict, Optional
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage


# ---------------- FAQ TEMPLATES ----------------

FAQ_TEMPLATES_SEEKER = [
    {
        "id": "seeker-1",
        "question": "Bagaimana cara melakukan booking shelter?",
        "question_en": "How do I book a shelter?",
        "answer": (
            "Untuk booking shelter:\n"
            "1. Buka menu **Listings** di navigasi atas.\n"
            "2. Pilih shelter yang Anda inginkan, lalu klik **Detail**.\n"
            "3. Pilih tanggal *check-in* dan *check-out* pada kalender.\n"
            "4. Tambahkan catatan (opsional), lalu klik **Book Now**.\n"
            "5. Booking akan berstatus *PENDING* sampai Provider menerimanya. "
            "Anda akan menerima notifikasi saat status berubah."
        ),
    },
    {
        "id": "seeker-2",
        "question": "Bisakah saya membatalkan booking?",
        "question_en": "Can I cancel a booking?",
        "answer": (
            "Booking dapat dibatalkan **hanya jika statusnya masih PENDING**. "
            "Buka **My Bookings**, pilih booking yang ingin dibatalkan, lalu klik **Cancel**. "
            "Booking yang sudah *ACCEPTED* tidak bisa dibatalkan dari sisi Seeker."
        ),
    },
    {
        "id": "seeker-3",
        "question": "Bagaimana cara memberi review setelah menginap?",
        "question_en": "How can I leave a review?",
        "answer": (
            "Setelah booking ber-status *ACCEPTED*, buka halaman **My Bookings**, klik booking tersebut, "
            "lalu klik **Leave a Review**. Anda dapat memberikan rating 1–5 bintang dan komentar."
        ),
    },
    {
        "id": "seeker-4",
        "question": "Apa status booking saya saat ini?",
        "question_en": "What is the current status of my bookings?",
        "answer": "[AI] Saya akan periksa data booking Anda dan rangkum statusnya.",
        "ai_required": True,
    },
    {
        "id": "seeker-5",
        "question": "Listing apa saja yang tersedia hari ini?",
        "question_en": "What listings are available today?",
        "answer": "[AI] Saya akan tampilkan ringkasan listing yang sedang tersedia.",
        "ai_required": True,
    },
    {
        "id": "seeker-6",
        "question": "Apakah saya punya notifikasi yang belum dibaca?",
        "question_en": "Do I have unread notifications?",
        "answer": "[AI] Saya akan periksa notifikasi terbaru Anda.",
        "ai_required": True,
    },
]

FAQ_TEMPLATES_PROVIDER = [
    {
        "id": "provider-1",
        "question": "Bagaimana cara membuat listing baru?",
        "question_en": "How do I create a new listing?",
        "answer": (
            "Untuk membuat listing baru:\n"
            "1. Akun Provider harus sudah **terverifikasi** oleh Verificator.\n"
            "2. Buka **My Listings → Create Listing**.\n"
            "3. Isi judul, deskripsi, alamat, suburb, postcode, dan unggah minimal satu foto.\n"
            "4. Klik **Submit**. Listing langsung tampil di pencarian Seeker."
        ),
    },
    {
        "id": "provider-2",
        "question": "Bagaimana cara verifikasi akun Provider?",
        "question_en": "How does provider verification work?",
        "answer": (
            "Saat registrasi, Provider mengunggah ID document & police check. "
            "Verificator akan mereview dan menyetujui/menolak. Status verifikasi: "
            "**PENDING** (menunggu review) → **APPROVED** (terverifikasi & bisa membuat listing) "
            "atau **REJECTED** (dengan alasan penolakan)."
        ),
    },
    {
        "id": "provider-3",
        "question": "Bagaimana cara menerima atau menolak booking?",
        "question_en": "How do I accept or reject a booking?",
        "answer": (
            "Buka **Bookings** untuk melihat permintaan booking yang masuk. "
            "Klik **Accept** untuk menerima atau **Reject** (wajib isi alasan) untuk menolak. "
            "Seeker akan menerima notifikasi otomatis."
        ),
    },
    {
        "id": "provider-4",
        "question": "Bagaimana cara memblokir tanggal yang tidak tersedia?",
        "question_en": "How do I block unavailable dates?",
        "answer": (
            "Buka detail listing Anda di **My Listings**, pilih **Manage Availability**, "
            "lalu pilih tanggal pada kalender untuk diblokir/dibuka kembali."
        ),
    },
    {
        "id": "provider-5",
        "question": "Berapa booking baru yang masuk ke saya?",
        "question_en": "How many new bookings do I have?",
        "answer": "[AI] Saya akan periksa booking masuk Anda.",
        "ai_required": True,
    },
    {
        "id": "provider-6",
        "question": "Apa status verifikasi akun saya?",
        "question_en": "What is my verification status?",
        "answer": "[AI] Saya akan cek status verifikasi akun Anda.",
        "ai_required": True,
    },
    {
        "id": "provider-7",
        "question": "Review terbaru apa yang saya terima?",
        "question_en": "What are my recent reviews?",
        "answer": "[AI] Saya akan tampilkan review terbaru untuk listing Anda.",
        "ai_required": True,
    },
]


def get_faq_templates(role: str) -> List[Dict]:
    if role == "SEEKER":
        return FAQ_TEMPLATES_SEEKER
    if role == "PROVIDER":
        return FAQ_TEMPLATES_PROVIDER
    return []


# ---------------- AI CONTEXT BUILDER ----------------

async def build_seeker_context(
    user: dict,
    booking_repo,
    listing_repo,
    notification_repo,
) -> dict:
    """Collect seeker-scoped data for the AI prompt (only their own data)."""
    user_id = user["id"]

    bookings = await booking_repo.collection.find(
        {"seeker_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    bookings_summary = [
        {
            "listing_title": b.get("listing_title"),
            "check_in": b.get("check_in_date"),
            "check_out": b.get("check_out_date"),
            "status": b.get("status"),
            "rejection_reason": b.get("rejection_reason"),
        }
        for b in bookings
    ]

    available_listings = await listing_repo.collection.find(
        {"is_available": True, "deleted_at": None}, {"_id": 0}
    ).to_list(20)
    listings_summary = [
        {
            "title": l.get("title"),
            "address": l.get("address"),
            "suburb": l.get("suburb"),
            "postcode": l.get("postcode"),
            "description": (l.get("description") or "")[:200],
        }
        for l in available_listings
    ]

    notifications = await notification_repo.collection.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    notif_summary = [
        {
            "message": n.get("message"),
            "is_read": n.get("is_read", False),
            "type": n.get("type"),
            "created_at": n.get("created_at"),
        }
        for n in notifications
    ]

    return {
        "role": "SEEKER",
        "profile": {
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "phone_number": user.get("phone_number"),
        },
        "my_bookings": bookings_summary,
        "available_listings": listings_summary,
        "notifications": notif_summary,
    }


async def build_provider_context(
    user: dict,
    booking_repo,
    listing_repo,
    notification_repo,
    review_repo,
) -> dict:
    """Collect provider-scoped data for the AI prompt (only their own data)."""
    user_id = user["id"]

    listings = await listing_repo.collection.find(
        {"provider_id": user_id, "deleted_at": None}, {"_id": 0}
    ).to_list(50)
    listings_summary = [
        {
            "id": l.get("id"),
            "title": l.get("title"),
            "address": l.get("address"),
            "suburb": l.get("suburb"),
            "is_available": l.get("is_available"),
        }
        for l in listings
    ]
    listing_ids = [l.get("id") for l in listings]

    bookings = await booking_repo.collection.find(
        {"provider_id": user_id, "seeker_id": {"$ne": "SYSTEM_BLOCK"}}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    bookings_summary = [
        {
            "listing_title": b.get("listing_title"),
            "seeker_name": b.get("seeker_name"),
            "check_in": b.get("check_in_date"),
            "check_out": b.get("check_out_date"),
            "status": b.get("status"),
        }
        for b in bookings
    ]

    reviews = []
    if listing_ids:
        review_docs = await review_repo.collection.find(
            {"listing_id": {"$in": listing_ids}}, {"_id": 0}
        ).sort("created_at", -1).to_list(20)
        reviews = [
            {
                "rating": r.get("rating"),
                "comment": r.get("comment"),
                "seeker_name": r.get("seeker_name"),
                "created_at": r.get("created_at"),
            }
            for r in review_docs
        ]

    notifications = await notification_repo.collection.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    notif_summary = [
        {
            "message": n.get("message"),
            "is_read": n.get("is_read", False),
            "type": n.get("type"),
            "created_at": n.get("created_at"),
        }
        for n in notifications
    ]

    return {
        "role": "PROVIDER",
        "profile": {
            "full_name": user.get("full_name"),
            "email": user.get("email"),
            "phone_number": user.get("phone_number"),
        },
        "verification": {
            "is_verified": user.get("is_verified", False),
            "status": user.get("verification_status", "PENDING"),
            "rejection_reason": user.get("verification_reason"),
        },
        "my_listings": listings_summary,
        "incoming_bookings": bookings_summary,
        "recent_reviews": reviews,
        "notifications": notif_summary,
    }


# ---------------- AI ASK ----------------

SYSTEM_PROMPT_BASE = """You are "ShelterBot", a friendly and concise assistant for the ShelterLink platform — a service that connects shelter Seekers with shelter Providers.

LANGUAGE RULE (CRITICAL):
- Detect the language of the user's question and ALWAYS reply in the SAME language.
- If the user writes in Indonesian (Bahasa Indonesia), reply in Indonesian.
- If the user writes in English, reply in English.

YOU MUST:
- Only answer questions related to ShelterLink usage and the user's own data provided in CONTEXT.
- Use the CONTEXT JSON to give accurate, personalised answers (e.g. "Anda punya 3 booking pending").
- Keep replies short (2–6 sentences) unless a list/steps is needed.
- If the user asks about other users or data NOT in the context, politely refuse and explain you can only access their own data.
- If you don't know the answer, say so honestly and suggest contacting support.
- Never invent data. If a list is empty, say so.
- Format with simple Markdown (bullets, bold) when helpful.

DO NOT reveal raw JSON or technical implementation details.
"""


async def ask_ai(question: str, context: dict, history: Optional[List[dict]] = None) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "Maaf, fitur AI sedang tidak tersedia. Silakan gunakan tombol FAQ di atas."

    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

    system_message = (
        SYSTEM_PROMPT_BASE
        + "\n\nCONTEXT (user's own data, JSON):\n"
        + json.dumps(context, ensure_ascii=False, default=str)
    )

    session_id = f"chatbot-{context.get('profile', {}).get('email', 'anon')}-{datetime.now(timezone.utc).isoformat()}"

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message,
    ).with_model("gemini", model)

    # Replay short history (last 4 turns) before sending current question.
    if history:
        for msg in history[-4:]:
            if msg.get("role") == "user" and msg.get("text"):
                try:
                    await chat.send_message(UserMessage(text=msg["text"]))
                except Exception:
                    pass

    try:
        response = await chat.send_message(UserMessage(text=question))
        return str(response).strip()
    except Exception as e:
        return f"Maaf, terjadi kendala saat menghubungi AI: {str(e)[:120]}. Coba lagi sebentar."
