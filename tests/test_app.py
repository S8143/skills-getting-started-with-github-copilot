from fastapi.testclient import TestClient
import pytest

from src.app import app

client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    test_email = "testuser@example.com"

    # Ensure clean state: unregister if already present
    res = client.get("/activities")
    participants = res.json()[activity]["participants"]
    if test_email in participants:
        r = client.post(f"/activities/{activity}/unregister", params={"email": test_email})
        assert r.status_code == 200

    # Sign up
    r = client.post(f"/activities/{activity}/signup", params={"email": test_email})
    assert r.status_code == 200
    assert "Signed up" in r.json()["message"]

    # Verify present
    res = client.get("/activities")
    participants = res.json()[activity]["participants"]
    assert test_email in participants

    # Signing up again should fail
    r2 = client.post(f"/activities/{activity}/signup", params={"email": test_email})
    assert r2.status_code == 400

    # Unregister
    r3 = client.post(f"/activities/{activity}/unregister", params={"email": test_email})
    assert r3.status_code == 200
    assert "Unregistered" in r3.json()["message"]

    # Verify removed
    res = client.get("/activities")
    participants = res.json()[activity]["participants"]
    assert test_email not in participants


def test_unregister_not_signed_up_returns_400():
    activity = "Chess Club"
    email = "nonexistent@example.com"

    # Ensure not signed up
    res = client.get("/activities")
    participants = res.json()[activity]["participants"]
    if email in participants:
        client.post(f"/activities/{activity}/unregister", params={"email": email})

    r = client.post(f"/activities/{activity}/unregister", params={"email": email})
    assert r.status_code == 400
