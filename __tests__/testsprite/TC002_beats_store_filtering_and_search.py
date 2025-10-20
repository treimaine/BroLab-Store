import requests
import pytest

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Clerk test user token (replace with a valid test token if available)
CLERK_TEST_TOKEN = "test_jwt_token_placeholder"

HEADERS = {
    "Authorization": f"Bearer {CLERK_TEST_TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

def test_beats_store_filtering_and_search():
    """
    Test the beats marketplace filtering by genre, BPM, price, and search functionality
    to ensure accurate and responsive product listing updates.
    """

    # Define filter combinations to test
    filter_tests = [
        {"genre": "hip-hop"},
        {"genre": "electronic"},
        {"minBPM": 80, "maxBPM": 120},
        {"minPrice": 10, "maxPrice": 30},
        {"search": "summer"},
        {"genre": "hip-hop", "minBPM": 90, "maxBPM": 110, "minPrice": 15, "maxPrice": 40, "search": "party"},
    ]

    for filters in filter_tests:
        try:
            response = requests.get(
                f"{BASE_URL}/api/beats",
                headers=HEADERS,
                params=filters,
                timeout=TIMEOUT,
            )
        except requests.RequestException as e:
            pytest.fail(f"Request failed for filters {filters}: {e}")
        
        assert response.status_code == 200, f"Expected 200 OK but got {response.status_code} for filters {filters}"

        try:
            data = response.json()
        except ValueError:
            pytest.fail(f"Response is not valid JSON for filters {filters}")

        # Validate response structure
        assert isinstance(data, dict), f"Response should be a JSON object for filters {filters}"
        assert "beats" in data, f"'beats' key missing in response for filters {filters}"
        assert isinstance(data["beats"], list), f"'beats' should be a list for filters {filters}"

        beats = data["beats"]
        # Validate filtering accuracy
        for beat in beats:
            # Validate genre filter
            if "genre" in filters:
                beat_genre = beat.get("genre", "").lower()
                assert filters["genre"].lower() == beat_genre, (
                    f"Beat genre '{beat_genre}' does not match filter '{filters['genre']}'"
                )
            # Validate BPM filter
            if "minBPM" in filters:
                bpm = beat.get("bpm")
                assert bpm is not None, "Beat BPM missing"
                assert bpm >= filters["minBPM"], f"Beat BPM {bpm} less than minBPM {filters['minBPM']}"
            if "maxBPM" in filters:
                bpm = beat.get("bpm")
                assert bpm is not None, "Beat BPM missing"
                assert bpm <= filters["maxBPM"], f"Beat BPM {bpm} greater than maxBPM {filters['maxBPM']}"

            # Validate price filter
            if "minPrice" in filters:
                price = beat.get("price")
                assert price is not None, "Beat price missing"
                assert price >= filters["minPrice"], f"Beat price {price} less than minPrice {filters['minPrice']}"
            if "maxPrice" in filters:
                price = beat.get("price")
                assert price is not None, "Beat price missing"
                assert price <= filters["maxPrice"], f"Beat price {price} greater than maxPrice {filters['maxPrice']}"

            # Validate search filter (title or description contains search term, case insensitive)
            if "search" in filters:
                search_term = filters["search"].lower()
                title = beat.get("title", "").lower()
                description = beat.get("description", "").lower()
                matched = search_term in title or search_term in description
                assert matched, f"Beat does not match search term '{filters['search']}'"

        # The list should update responsively; for filtering tests returning empty beats is valid if no match found

test_beats_store_filtering_and_search()