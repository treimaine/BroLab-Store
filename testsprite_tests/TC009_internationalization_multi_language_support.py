import requests
import json
from requests.exceptions import RequestException

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Clerk Test User Credentials (Test user assumed pre-registered in Clerk test environment)
CLERK_TEST_USER_EMAIL = "testuser@example.com"
CLERK_TEST_USER_PASSWORD = "TestPassword123!"  # Update as needed for actual test environment

def get_auth_token(email: str, password: str) -> str:
    """Authenticate with Clerk backend to obtain a JWT token."""
    try:
        # Assuming the service has a login endpoint for Clerk authenticated users returning JWT
        resp = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=TIMEOUT
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("token")
        assert token, "Authentication token not found in login response"
        return token
    except RequestException as e:
        raise RuntimeError(f"Failed to authenticate user: {e}")

def test_internationalization_multilanguage_support():
    """
    Test to verify multi-language and currency localization support using i18next integration.
    - Fetch translations for multiple languages
    - Verify currency localization info per locale
    - Test authenticated user locale preference persistence
    """
    # Define headers and languages to test
    languages = ['en', 'es', 'fr', 'de', 'jp']
    currency_expected = {
        'en': 'USD',
        'es': 'EUR',  # Assuming Spain or generic Spanish locale uses Euro here
        'fr': 'EUR',
        'de': 'EUR',
        'jp': 'JPY'
    }

    # Step 1: Test public endpoint for i18next locale resources (assuming endpoint /api/i18n/locales/{lang})
    for lang in languages:
        try:
            resp = requests.get(
                f"{BASE_URL}/api/i18n/locales/{lang}",
                timeout=TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            # Basic validation: keys and language presence
            assert isinstance(data, dict), f"Locale resource for {lang} is not a dict"
            # i18next default namespaces often include 'translation' or 'common'
            assert any(isinstance(v, dict) for v in data.values()), f"No translation namespaces found for {lang}"
        except Exception as e:
            raise AssertionError(f"Failed to fetch or validate i18next locale '{lang}': {e}")

    # Step 2: Test public endpoint that returns currency localization or formatting per language
    # Assuming endpoint /api/i18n/currency?lang={lang} returns { "currency": "USD", ... }
    for lang in languages:
        try:
            resp = requests.get(
                f"{BASE_URL}/api/i18n/currency",
                params={"lang": lang},
                timeout=TIMEOUT
            )
            resp.raise_for_status()
            data = resp.json()
            currency = data.get("currency")
            assert currency is not None, f"No currency returned for lang {lang}"
            expected_currency = currency_expected.get(lang)
            assert expected_currency is not None, f"No expected currency configured for lang {lang}"
            assert currency == expected_currency, f"Currency mismatch for {lang}: expected {expected_currency}, got {currency}"
        except Exception as e:
            raise AssertionError(f"Failed currency localization validation for language '{lang}': {e}")

    # Step 3: Authenticated user locale preference test
    # Authenticate user to get token
    token = get_auth_token(CLERK_TEST_USER_EMAIL, CLERK_TEST_USER_PASSWORD)
    headers_auth = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }

    # Assume endpoint /api/user/preferences supports GET and PUT for locale preferences
    # Fetch current preference (should exist)
    try:
        resp = requests.get(f"{BASE_URL}/api/user/preferences", headers=headers_auth, timeout=TIMEOUT)
        resp.raise_for_status()
        prefs = resp.json()
        assert "locale" in prefs, "Locale preference not found in user preferences"
    except Exception as e:
        raise AssertionError(f"Failed to fetch user preferences: {e}")

    # Update user locale to 'fr' and verify persistence
    try:
        update_payload = {"locale": "fr"}
        resp = requests.put(f"{BASE_URL}/api/user/preferences", headers={**headers_auth, "Content-Type": "application/json"}, data=json.dumps(update_payload), timeout=TIMEOUT)
        resp.raise_for_status()
        updated_prefs = resp.json()
        assert updated_prefs.get("locale") == "fr", "Locale preference update failed or incorrect"
    except Exception as e:
        raise AssertionError(f"Failed to update user locale preference: {e}")

    # Fetch again to verify updated preference
    try:
        resp = requests.get(f"{BASE_URL}/api/user/preferences", headers=headers_auth, timeout=TIMEOUT)
        resp.raise_for_status()
        prefs = resp.json()
        assert prefs.get("locale") == "fr", "Locale preference not persisted after update"
    except Exception as e:
        raise AssertionError(f"Locale preference not persisted after update: {e}")

    # Step 4: Validate localized currency returned in user account info (assuming endpoint /api/user/account returns currency info based on locale)
    try:
        resp = requests.get(f"{BASE_URL}/api/user/account", headers=headers_auth, timeout=TIMEOUT)
        resp.raise_for_status()
        account_info = resp.json()
        currency = account_info.get("currency")
        assert currency == "EUR", f"User currency localization mismatch, expected EUR, got {currency}"
    except Exception as e:
        raise AssertionError(f"Failed to validate user currency localization in account info: {e}")

test_internationalization_multilanguage_support()