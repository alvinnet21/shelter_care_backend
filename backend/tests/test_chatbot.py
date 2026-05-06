"""Backend tests for Chatbot FAQ templates + AI ask endpoints."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend .env file
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass
assert BASE_URL, "REACT_APP_BACKEND_URL not configured"

API = f"{BASE_URL}/api"

SEEKER_CREDS = {"email": "seeker_test@gmail.com", "password": "123456"}
ADMIN_CREDS = {"email": "admin@gmail.com", "password": "123456"}
VERIFICATOR_CREDS = {"email": "verificator@gmail.com", "password": "123456"}


def _login(creds):
    r = requests.post(f"{API}/auth/login", json=creds, timeout=30)
    assert r.status_code == 200, f"Login failed for {creds['email']}: {r.text}"
    return r.json()["token"]


# ---------------- Fixtures ----------------

@pytest.fixture(scope="module")
def seeker_token():
    return _login(SEEKER_CREDS)


@pytest.fixture(scope="module")
def admin_token():
    return _login(ADMIN_CREDS)


@pytest.fixture(scope="module")
def verificator_token():
    return _login(VERIFICATOR_CREDS)


@pytest.fixture(scope="module")
def provider_token():
    """Register a fresh provider and login."""
    unique = uuid.uuid4().hex[:8]
    email = f"TEST_prov_{unique}@example.com"
    payload = {
        "email": email,
        "full_name": "TEST Provider",
        "password": "testpass123",
        "role": "PROVIDER",
        "question_answer": "test",
        "id_document": "data:image/png;base64,AAAA",
        "police_check": "data:image/png;base64,AAAA",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=30)
    assert r.status_code == 200, f"Provider register failed: {r.status_code} {r.text}"
    user_id = r.json()["user_id"]

    # Approve via verificator so we can login
    vtoken = _login(VERIFICATOR_CREDS)
    vr = requests.put(
        f"{API}/verificator/providers/{user_id}/verify",
        params={"action": "APPROVE"},
        headers={"Authorization": f"Bearer {vtoken}"},
        timeout=30,
    )
    assert vr.status_code == 200, f"Provider approve failed: {vr.status_code} {vr.text}"

    token = _login({"email": email, "password": "testpass123"})
    return token


# ---------------- GET /api/chatbot/faq-templates ----------------

class TestFaqTemplates:
    def test_seeker_faq_templates(self, seeker_token):
        r = requests.get(
            f"{API}/chatbot/faq-templates",
            headers={"Authorization": f"Bearer {seeker_token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "SEEKER"
        tpls = data["templates"]
        assert isinstance(tpls, list)
        assert len(tpls) == 6
        ids = [t["id"] for t in tpls]
        assert "seeker-1" in ids
        assert "seeker-4" in ids
        # seeker-4 is ai_required
        t4 = next(t for t in tpls if t["id"] == "seeker-4")
        assert t4.get("ai_required") is True
        # seeker-1 is static
        t1 = next(t for t in tpls if t["id"] == "seeker-1")
        assert not t1.get("ai_required")
        assert "booking" in t1["answer"].lower()

    def test_provider_faq_templates_differ_from_seeker(self, provider_token):
        r = requests.get(
            f"{API}/chatbot/faq-templates",
            headers={"Authorization": f"Bearer {provider_token}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "PROVIDER"
        tpls = data["templates"]
        assert len(tpls) == 7
        ids = [t["id"] for t in tpls]
        assert all(i.startswith("provider-") for i in ids)

    def test_admin_forbidden(self, admin_token):
        r = requests.get(
            f"{API}/chatbot/faq-templates",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r.status_code == 403, r.text

    def test_verificator_forbidden(self, verificator_token):
        r = requests.get(
            f"{API}/chatbot/faq-templates",
            headers={"Authorization": f"Bearer {verificator_token}"},
            timeout=30,
        )
        assert r.status_code == 403, r.text

    def test_unauthenticated(self):
        r = requests.get(f"{API}/chatbot/faq-templates", timeout=30)
        # 401 or 403 depending on framework default
        assert r.status_code in (401, 403), r.text


# ---------------- POST /api/chatbot/ask ----------------

def _post_ask(token, question, history=None, retries=1):
    payload = {"question": question}
    if history is not None:
        payload["history"] = history
    last = None
    for _ in range(retries + 1):
        r = requests.post(
            f"{API}/chatbot/ask",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=120,
        )
        last = r
        if r.status_code == 200:
            return r
        time.sleep(2)
    return last


class TestChatbotAsk:
    def test_seeker_ask_indonesian(self, seeker_token):
        r = _post_ask(seeker_token, "Apa status booking saya sekarang?")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "answer" in data
        assert isinstance(data["answer"], str)
        assert len(data["answer"]) > 0

    def test_seeker_ask_english(self, seeker_token):
        r = _post_ask(seeker_token, "What listings are available today?")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "answer" in data and isinstance(data["answer"], str) and len(data["answer"]) > 0

    def test_provider_ask(self, provider_token):
        r = _post_ask(provider_token, "Apa status verifikasi akun saya?")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "answer" in data and isinstance(data["answer"], str) and len(data["answer"]) > 0

    def test_admin_forbidden(self, admin_token):
        r = requests.post(
            f"{API}/chatbot/ask",
            json={"question": "hello"},
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=30,
        )
        assert r.status_code == 403, r.text

    def test_verificator_forbidden(self, verificator_token):
        r = requests.post(
            f"{API}/chatbot/ask",
            json={"question": "hello"},
            headers={"Authorization": f"Bearer {verificator_token}"},
            timeout=30,
        )
        assert r.status_code == 403, r.text

    def test_empty_question(self, seeker_token):
        r = requests.post(
            f"{API}/chatbot/ask",
            json={"question": "   "},
            headers={"Authorization": f"Bearer {seeker_token}"},
            timeout=30,
        )
        assert r.status_code == 400, r.text

    def test_unauthenticated(self):
        r = requests.post(
            f"{API}/chatbot/ask",
            json={"question": "hi"},
            timeout=30,
        )
        assert r.status_code in (401, 403), r.text
