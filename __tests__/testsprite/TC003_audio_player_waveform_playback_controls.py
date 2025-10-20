import requests
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Clerk test user credentials (replace with valid test credentials if available)
CLERK_SIGNIN_ENDPOINT = f"{BASE_URL}/api/auth/signin"  # assumed endpoint
AUDIO_PLAYER_ENDPOINT = f"{BASE_URL}/api/audio-player"
NAVIGATION_STATE_ENDPOINT = f"{BASE_URL}/api/navigation-state"

def test_audio_player_waveform_playback_controls():
    session = requests.Session()
    try:
        signin_payload = {"email": "test_user@example.com", "password": "TestPass123!"}
        signin_resp = session.post(CLERK_SIGNIN_ENDPOINT, json=signin_payload, timeout=TIMEOUT)
        assert signin_resp.status_code == 200, f"Authentication failed: {signin_resp.text}"
        auth_data = signin_resp.json()
        auth_token = auth_data.get("id_token") or auth_data.get("access_token")
        assert auth_token, "No auth token returned from signin"

        headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }

        waveform_resp = session.get(f"{AUDIO_PLAYER_ENDPOINT}/waveform?trackId=sampleBeat1", headers=headers, timeout=TIMEOUT)
        assert waveform_resp.status_code == 200, f"Failed to get waveform data: {waveform_resp.text}"
        waveform_data = waveform_resp.json()
        assert "waveformPoints" in waveform_data and isinstance(waveform_data["waveformPoints"], list), "Waveform data missing or invalid"

        play_resp = session.post(f"{AUDIO_PLAYER_ENDPOINT}/play", headers=headers, json={"trackId": "sampleBeat1"}, timeout=TIMEOUT)
        assert play_resp.status_code == 200, f"Failed to start playback: {play_resp.text}"
        play_state = play_resp.json()
        assert play_state.get("playing") is True, "Playback state not set to playing"

        volume_resp = session.post(f"{AUDIO_PLAYER_ENDPOINT}/volume", headers=headers, json={"volume": 0.75}, timeout=TIMEOUT)
        assert volume_resp.status_code == 200, f"Failed to set volume: {volume_resp.text}"
        volume_state = volume_resp.json()
        assert abs(volume_state.get("volume", 0) - 0.75) < 0.01, "Volume not set correctly"

        seek_resp = session.post(f"{AUDIO_PLAYER_ENDPOINT}/seek", headers=headers, json={"position": 30}, timeout=TIMEOUT)
        assert seek_resp.status_code == 200, f"Failed to seek playback: {seek_resp.text}"
        seek_state = seek_resp.json()
        assert abs(seek_state.get("position", -1) - 30) < 1, "Seek position not set correctly"

        state_resp = session.get(f"{AUDIO_PLAYER_ENDPOINT}/state", headers=headers, timeout=TIMEOUT)
        assert state_resp.status_code == 200, f"Failed to get playback state: {state_resp.text}"
        saved_state = state_resp.json()
        assert saved_state.get("playing") is True, "Playback expected to be playing before navigation"
        assert abs(saved_state.get("position", -1) - 30) < 1, "Playback position incorrect before navigation"
        assert abs(saved_state.get("volume", -1) - 0.75) < 0.01, "Playback volume incorrect before navigation"

        nav_resp = session.post(f"{NAVIGATION_STATE_ENDPOINT}/simulateNavigation", headers=headers, json={"to": "/some/other/page"}, timeout=TIMEOUT)
        assert nav_resp.status_code == 200, f"Failed to simulate navigation away: {nav_resp.text}"

        nav_back_resp = session.post(f"{NAVIGATION_STATE_ENDPOINT}/simulateNavigation", headers=headers, json={"to": "/audio-player"}, timeout=TIMEOUT)
        assert nav_back_resp.status_code == 200, f"Failed to simulate navigation back: {nav_back_resp.text}"

        post_nav_state_resp = session.get(f"{AUDIO_PLAYER_ENDPOINT}/state", headers=headers, timeout=TIMEOUT)
        assert post_nav_state_resp.status_code == 200, f"Failed to get playback state after navigation: {post_nav_state_resp.text}"
        post_nav_state = post_nav_state_resp.json()

        assert post_nav_state.get("playing") is True, "Playback state is not playing after navigation"
        assert abs(post_nav_state.get("position", -1) - saved_state.get("position", 0)) < 1, "Playback position not persisted after navigation"
        assert abs(post_nav_state.get("volume", -1) - saved_state.get("volume", 0)) < 0.01, "Playback volume not persisted after navigation"

    finally:
        try:
            session.post(f"{AUDIO_PLAYER_ENDPOINT}/stop", headers=headers, timeout=TIMEOUT)
        except Exception:
            pass

test_audio_player_waveform_playback_controls()
