import requests

BASE_URL = "http://localhost:5000"
AUTH_TOKEN = "your_valid_auth_token_here"  # Replace with a valid JWT token for authentication

def test_get_current_user_orders_pagination():
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Accept": "application/json"
    }
    
    params = {
        "page": 1,
        "limit": 5
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/api/orders/me",
            headers=headers,
            params=params,
            timeout=30
        )
        
        # Assert status code is 200
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Assert response is JSON and contains a list (orders)
        data = response.json()
        assert isinstance(data, list), f"Expected response to be a list, got {type(data)}"
        
    except requests.exceptions.Timeout:
        assert False, "Request timed out"
    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_current_user_orders_pagination()