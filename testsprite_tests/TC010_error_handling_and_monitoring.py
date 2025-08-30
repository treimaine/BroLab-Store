import requests
from requests.auth import HTTPBasicAuth
from jinja2 import Template
import traceback

BASE_URL = "http://localhost:5000"
TIMEOUT = 30

# For the purpose of this test, assume Clerk test credentials if required:
# You can replace these credentials with actual test user credentials if available
CLERK_TEST_EMAIL = "testuser@clerk.dev"
CLERK_TEST_PASSWORD = "TestPass123!"

# Endpoints relevant for error handling checks (these are assumed / inferred):
# - /api/protected-resource: Requires auth, returns 401 if unauthenticated
# - /api/error: An endpoint that triggers a server error (to validate error boundaries)
# - /api/notifications: To check notifications system (GET)

def test_error_handling_and_monitoring_report():
    """
    Test that error handling mechanisms capture and display errors gracefully,
    including Clerk error boundaries and notification systems.
    This test will:
     - Attempt unauthorized access to a protected endpoint to confirm 401 handling
     - Trigger a server error to check error boundary response structure
     - Authenticate with Clerk test user and access protected endpoint successfully
     - Query notifications endpoint and validate the format
     - Collect results and generate consolidated HTML and Markdown report
    """

    results = []
    logs = []

    def log_step(step, success, detail=""):
        status = "PASS" if success else "FAIL"
        logs.append(f"{status} - {step}: {detail}")
        results.append({
            "step": step,
            "result": status,
            "detail": detail
        })

    session = requests.Session()
    session.headers.update({
        "Accept": "application/json",
        "Content-Type": "application/json",
    })

    # Step 1: Attempt access to protected resource without authentication - expect 401 Unauthorized
    try:
        step = "Unauthorized access to protected resource returns 401"
        resp = session.get(f"{BASE_URL}/api/protected-resource", timeout=TIMEOUT)
        if resp.status_code == 401:
            log_step(step, True, f"Status {resp.status_code} as expected")
        else:
            log_step(step, False, f"Unexpected status: {resp.status_code}, response: {resp.text}")
    except Exception as e:
        log_step(step, False, f"Exception: {str(e)}")

    # Step 2: Trigger a server error to validate error boundaries and error response shape
    try:
        step = "Trigger server error and check error response format"
        resp = session.get(f"{BASE_URL}/api/error", timeout=TIMEOUT)
        # It is expected that this returns a 5xx error with an error message
        if resp.status_code >= 500:
            try:
                data = resp.json()
                # Check for expected error keys (generic)
                if "error" in data or "message" in data:
                    log_step(step, True, f"Received expected error response: {data}")
                else:
                    log_step(step, False, f"Error response missing expected keys, got: {data}")
            except Exception:
                log_step(step, False, f"Response is not valid JSON: {resp.text}")
        else:
            log_step(step, False, f"Unexpected status code: {resp.status_code}, expected 5xx")
    except Exception as e:
        log_step(step, False, f"Exception: {str(e)}")

    # Step 3: Authenticate using Clerk test user credentials to obtain auth token
    # For Clerk, assumed endpoint: /api/auth/login (POST) with email/password returns token
    token = None
    try:
        step = "Authenticate test user with Clerk"
        auth_payload = {
            "email": CLERK_TEST_EMAIL,
            "password": CLERK_TEST_PASSWORD
        }
        resp = session.post(f"{BASE_URL}/api/auth/login", json=auth_payload, timeout=TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            token = data.get("token")
            if token:
                session.headers.update({'Authorization': f'Bearer {token}'})
                log_step(step, True, "Authentication succeeded, token obtained")
            else:
                log_step(step, False, f"Token not found in response: {data}")
        else:
            log_step(step, False, f"Auth failed with status {resp.status_code}, response: {resp.text}")
    except Exception as e:
        log_step(step, False, f"Exception: {str(e)}")

    # Step 4: Access protected resource with authentication - expect 200 OK
    if token:
        try:
            step = "Authorized access to protected resource returns 200"
            resp = session.get(f"{BASE_URL}/api/protected-resource", timeout=TIMEOUT)
            if resp.status_code == 200:
                # Optionally check for expected keys/data properties in response
                log_step(step, True, "Access granted as expected")
            else:
                log_step(step, False, f"Unexpected status code: {resp.status_code}, response: {resp.text}")
        except Exception as e:
            log_step(step, False, f"Exception: {str(e)}")
    else:
        log_step("Authorized resource access skipped", False, "Authentication failed, no token")

    # Step 5: Query notifications endpoint and check format (simulate notification checks)
    try:
        step = "Retrieve notifications and confirm valid response"
        resp = session.get(f"{BASE_URL}/api/notifications", timeout=TIMEOUT)
        if resp.status_code == 200:
            notifications = resp.json()
            if isinstance(notifications, list):
                # Optionally ensure each notification has expected keys
                keys_needed = {"id", "type", "message", "read"}
                all_have_keys = all(keys_needed.issubset(n.keys()) for n in notifications)
                if all_have_keys:
                    log_step(step, True, f"Notifications retrieved, count: {len(notifications)}")
                else:
                    log_step(step, False, "Some notifications missing expected keys")
            else:
                log_step(step, False, "Notifications response is not a list")
        else:
            log_step(step, False, f"Unexpected status: {resp.status_code}")
    except Exception as e:
        log_step(step, False, f"Exception: {str(e)}")

    # Generate Markdown report
    md_report = "# Test Case TC010 - Error Handling and Monitoring Report\n\n"
    for res in results:
        md_report += f"## Step: {res['step']}\n- Result: **{res['result']}**\n- Details: {res['detail']}\n\n"

    with open("test_tc010_report.md", "w", encoding="utf-8") as f_md:
        f_md.write(md_report)

    # Generate HTML report using a simple template
    html_template = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>TC010 - Error Handling and Monitoring Report</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px;}
            h1 { color: #005a9c; }
            .pass { color: green; }
            .fail { color: red; }
            .step { margin-bottom: 20px; }
            .details { margin-left: 20px; }
        </style>
    </head>
    <body>
        <h1>Test Case TC010 - Error Handling and Monitoring Report</h1>
        {% for r in results %}
          <div class="step">
            <h2>Step: {{ r.step }}</h2>
            <p>Result:
                {% if r.result == "PASS" %}
                  <span class="pass"><strong>{{ r.result }}</strong></span>
                {% else %}
                  <span class="fail"><strong>{{ r.result }}</strong></span>
                {% endif %}
            </p>
            <p class="details">Details: {{ r.detail }}</p>
          </div>
        {% endfor %}
    </body>
    </html>    
    """
    template = Template(html_template)
    html_report = template.render(results=results)

    with open("test_tc010_report.html", "w", encoding="utf-8") as f_html:
        f_html.write(html_report)

    # Final assert to fail test if any step failed
    failed_steps = [r for r in results if r["result"] == "FAIL"]
    assert len(failed_steps) == 0, f"One or more steps failed: {[s['step'] for s in failed_steps]}"

test_error_handling_and_monitoring_report()
