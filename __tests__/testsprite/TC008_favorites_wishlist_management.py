import requests

BASE_URL = "http://localhost:5000"
TIMEOUT = 30
API_HEADERS = {
    "Content-Type": "application/json",
    # Assume a Clerk test user token is required; replace with valid test token if needed
    "Authorization": "Bearer test_clerk_token_placeholder"
}

def test_favorites_wishlist_management():
    session = requests.Session()
    session.headers.update(API_HEADERS)
    created_beat = None
    created_favorite_id = None
    created_wishlist_id = None

    try:
        # Step 1: Obtain a list of beats to operate on (GET /beats or /api/beats assumed)
        beats_resp = session.get(f"{BASE_URL}/api/beats", timeout=TIMEOUT)
        assert beats_resp.status_code == 200, f"Failed to get beats list: {beats_resp.text}"
        beats = beats_resp.json()
        assert isinstance(beats, list) and len(beats) > 0, "Beats list is empty or invalid"
        beat = beats[0]  # pick the first beat
        beat_id = beat.get("id")
        assert beat_id, "Beat object missing 'id'"

        # Step 2: Add the beat to favorites (POST /api/favorites)
        fav_payload = {"beatId": beat_id}
        fav_resp = session.post(f"{BASE_URL}/api/favorites", json=fav_payload, timeout=TIMEOUT)
        assert fav_resp.status_code == 201, f"Failed to add favorite: {fav_resp.text}"
        favorite = fav_resp.json()
        created_favorite_id = favorite.get("id")
        assert created_favorite_id, "Favorite response missing 'id'"

        # Step 3: Verify the beat is in favorites (GET /api/favorites)
        fav_list_resp = session.get(f"{BASE_URL}/api/favorites", timeout=TIMEOUT)
        assert fav_list_resp.status_code == 200, f"Failed to get favorites: {fav_list_resp.text}"
        favorites = fav_list_resp.json()
        assert any(f.get("beatId") == beat_id for f in favorites), "Favorite beat not found in favorites list"

        # Step 4: Add the beat to wishlist (POST /api/wishlist)
        wish_payload = {"beatId": beat_id}
        wish_resp = session.post(f"{BASE_URL}/api/wishlist", json=wish_payload, timeout=TIMEOUT)
        assert wish_resp.status_code == 201, f"Failed to add wishlist item: {wish_resp.text}"
        wishlist_item = wish_resp.json()
        created_wishlist_id = wishlist_item.get("id")
        assert created_wishlist_id, "Wishlist response missing 'id'"

        # Step 5: Verify the beat is in wishlist (GET /api/wishlist)
        wish_list_resp = session.get(f"{BASE_URL}/api/wishlist", timeout=TIMEOUT)
        assert wish_list_resp.status_code == 200, f"Failed to get wishlist: {wish_list_resp.text}"
        wishlist = wish_list_resp.json()
        assert any(w.get("beatId") == beat_id for w in wishlist), "Beat not found in wishlist list"

        # Step 6: Get recently played beats (GET /api/recently-played)
        recent_resp = session.get(f"{BASE_URL}/api/recently-played", timeout=TIMEOUT)
        assert recent_resp.status_code == 200, f"Failed to get recently played beats: {recent_resp.text}"
        recent_list = recent_resp.json()
        assert isinstance(recent_list, list), "Recently played beats response is not a list"

        # Step 7: Remove the beat from favorites (DELETE /api/favorites/{favorite_id})
        del_fav_resp = session.delete(f"{BASE_URL}/api/favorites/{created_favorite_id}", timeout=TIMEOUT)
        assert del_fav_resp.status_code in (200, 204), f"Failed to delete favorite: {del_fav_resp.text}"

        # Step 8: Verify removal from favorites
        fav_list_after_del_resp = session.get(f"{BASE_URL}/api/favorites", timeout=TIMEOUT)
        assert fav_list_after_del_resp.status_code == 200, f"Failed to get favorites after deletion: {fav_list_after_del_resp.text}"
        favorites_after_del = fav_list_after_del_resp.json()
        assert all(f.get("id") != created_favorite_id for f in favorites_after_del), "Favorite item still present after deletion"

        # Step 9: Remove the beat from wishlist (DELETE /api/wishlist/{wishlist_id})
        del_wish_resp = session.delete(f"{BASE_URL}/api/wishlist/{created_wishlist_id}", timeout=TIMEOUT)
        assert del_wish_resp.status_code in (200, 204), f"Failed to delete wishlist item: {del_wish_resp.text}"

        # Step 10: Verify removal from wishlist
        wish_list_after_del_resp = session.get(f"{BASE_URL}/api/wishlist", timeout=TIMEOUT)
        assert wish_list_after_del_resp.status_code == 200, f"Failed to get wishlist after deletion: {wish_list_after_del_resp.text}"
        wishlist_after_del = wish_list_after_del_resp.json()
        assert all(w.get("id") != created_wishlist_id for w in wishlist_after_del), "Wishlist item still present after deletion"

    finally:
        # Cleanup in error case: try to delete if still present
        if created_favorite_id:
            try:
                session.delete(f"{BASE_URL}/api/favorites/{created_favorite_id}", timeout=TIMEOUT)
            except Exception:
                pass
        if created_wishlist_id:
            try:
                session.delete(f"{BASE_URL}/api/wishlist/{created_wishlist_id}", timeout=TIMEOUT)
            except Exception:
                pass

test_favorites_wishlist_management()