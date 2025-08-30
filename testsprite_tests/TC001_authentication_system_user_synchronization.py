import requests
import time

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

def test_authentication_system_user_synchronization():
    session = requests.Session()
    # Clerk test user credentials (assumed test user)
    clerk_test_user = {
        "email": "testuser@clerk.dev",
        "password": "TestUserPass123!"
    }
    # Step 1: Authenticate via Clerk login endpoint to get auth token/session
    login_url = f"{BASE_URL}/api/auth/login"
    try:
        login_resp = session.post(
            login_url,
            json=clerk_test_user,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "accessToken" in login_data, "No accessToken in login response"

        access_token = login_data["accessToken"]
        headers = {
            "Authorization": f"Bearer {access_token}"
        }

        # Step 2: Retrieve authenticated user info from Clerk
        clerk_user_url = f"{BASE_URL}/api/auth/user"
        user_resp = session.get(clerk_user_url, headers=headers, timeout=TIMEOUT)
        assert user_resp.status_code == 200, f"Failed to get Clerk user info: {user_resp.text}"
        user_data = user_resp.json()
        assert "id" in user_data and "email" in user_data, "User data missing fields"

        clerk_user_id = user_data["id"]
        clerk_user_email = user_data["email"]

        # Step 3: Retrieve user data from Convex database
        convex_user_url = f"{BASE_URL}/api/convex/users/{clerk_user_id}"
        convex_resp = session.get(convex_user_url, headers=headers, timeout=TIMEOUT)
        assert convex_resp.status_code == 200, f"Failed to get Convex user data: {convex_resp.text}"
        convex_user_data = convex_resp.json()
        assert convex_user_data is not None, "Convex user data is None"

        # Step 4: Validate synchronization - user IDs match & emails consistent
        assert convex_user_data.get("clerkId") == clerk_user_id, "Mismatch in user IDs between Clerk and Convex"
        assert convex_user_data.get("email") == clerk_user_email, "Mismatch in user emails between Clerk and Convex"

        # Step 5: Test secure authentication endpoint requiring synchronization
        auth_check_url = f"{BASE_URL}/api/auth/check"
        check_resp = session.get(auth_check_url, headers=headers, timeout=TIMEOUT)
        assert check_resp.status_code == 200, f"Auth check failed: {check_resp.text}"
        check_data = check_resp.json()
        assert check_data.get("authenticated") is True, "User not authenticated after synchronization"
        assert check_data.get("userId") == clerk_user_id, "Authenticated user ID mismatch"

    except requests.RequestException as e:
        assert False, f"Request failed with exception: {e}"

test_authentication_system_user_synchronization()
