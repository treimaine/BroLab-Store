import requests
import uuid

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# Placeholder: Replace with a valid JWT token for authentication
AUTH_TOKEN = "your_valid_jwt_token_here"

def test_log_download_with_authentication():
    headers = {
        "Authorization": f"Bearer {AUTH_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Step 1: Get a product to use for the download log
    try:
        product_response = requests.get(
            f"{BASE_URL}/api/woo/products",
            timeout=TIMEOUT
        )
        assert product_response.status_code == 200, f"Failed to fetch products: {product_response.text}"
        products = product_response.json()
        assert isinstance(products, list) and len(products) > 0, "Product list is empty"
        product = products[0]
        product_id = product.get("id")
        product_name = product.get("name")
        assert product_id is not None, "Product ID not found"
        assert product_name is not None, "Product name not found"
        # License and price are not specified in the PRD for this endpoint,
        # so set dummy values for the purpose of this test.
        license_str = "standard"
        price_num = 1000  # Sample price in cents
    except Exception as e:
        assert False, f"Setup failed: {e}"

    payload = {
        "productId": product_id,
        "license": license_str,
        "price": price_num,
        "productName": product_name
    }
    
    response = requests.post(
        f"{BASE_URL}/api/downloads",
        headers=headers,
        json=payload,
        timeout=TIMEOUT
    )
    
    assert response.status_code == 200, f"Expected 200 but got {response.status_code}: {response.text}"
    try:
        resp_json = response.json()
    except Exception:
        assert False, "Response is not valid JSON"
    
    # The PRD only specifies "200: Download logged" response without response body schema,
    # so we check that the response body is a dict (JSON) as minimal validation.
    assert isinstance(resp_json, dict), "Response JSON is not a dict"
    
test_log_download_with_authentication()