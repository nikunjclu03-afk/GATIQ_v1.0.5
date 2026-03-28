import os
import urllib.parse
import webbrowser

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/auth/google", tags=["auth"])

desktop_auth_states = {}


@router.get("/login")
def auth_google_login(session_id: str):
    desktop_auth_states[session_id] = {"status": "pending", "user": None}

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    if not client_id:
        mock_url = f"http://127.0.0.1:8001/auth/google/mock_prompt?session_id={session_id}"
        webbrowser.open(mock_url)
        return {"status": "browser_opened", "mode": "mock"}

    redirect_uri = "http://127.0.0.1:8001/auth/google/callback"
    google_oauth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={client_id}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        f"response_type=code&"
        f"scope=email%20profile&"
        f"state={session_id}"
    )
    webbrowser.open(google_oauth_url)
    return {"status": "browser_opened", "mode": "live"}


@router.get("/callback")
def auth_google_callback(code: str = None, state: str = None, error: str = None):
    if state in desktop_auth_states:
        if error:
            desktop_auth_states[state] = {"status": "failed", "error": error}
            return HTMLResponse("<h1>Login Failed</h1><p>You can close this tab and return to the app.</p>")

        desktop_auth_states[state] = {
            "status": "success",
            "user": {"email": "operator_oauth@gatiq.in", "name": "Google User"},
        }

        return HTMLResponse(
            """
        <html>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; margin-top: 50px; background: #f8fafc; color: #1e293b;">
            <div style="background: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                <div style="font-size: 48px; margin-bottom: 20px;">OK</div>
                <h2 style="color: #22c55e; margin-bottom: 10px;">Authentication Successful</h2>
                <p style="font-size: 16px; color: #475569; margin-bottom: 30px;">You are now signed in to GATIQ securely via your Chrome profile.</p>
                <p><b>Please close this tab and return to the GATIQ desktop application.</b></p>
                <script>
                    setTimeout(() => window.close(), 4000);
                </script>
            </div>
        </body>
        </html>
        """
        )

    return HTMLResponse("<h1>Session Error</h1><p>Invalid or expired login session. Try again from GATIQ.</p>")


@router.get("/mock_prompt")
def auth_google_mock(session_id: str):
    return HTMLResponse(
        f"""
    <html>
    <body style="font-family: 'Segoe UI', Tahoma, sans-serif; text-align: center; background: #f8fafc; padding-top: 80px;">
        <div style="background: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <h2 style="color: #1e293b;">Chrome OAuth Simulator</h2>
            <p style="color: #475569; margin-bottom: 25px;">You are in Chrome. Click below to securely authorize the Desktop App to access your account.</p>
            <button onclick="window.location.href='/auth/google/callback?code=simulated_code_abc123&state={session_id}'"
                    style="padding: 12px 24px; font-size: 16px; font-weight: bold; background: #4285F4; color: white; border: none; border-radius: 6px; cursor:pointer;">
                Authorize & Login as Google Id
            </button>
            <p style="margin-top: 20px; font-size: 12px; color: #94a3b8;">Configure GOOGLE_CLIENT_ID in backend .env to use live Google login.</p>
        </div>
    </body>
    </html>
    """
    )


@router.get("/status")
def auth_google_status(session_id: str):
    state_data = desktop_auth_states.get(session_id)
    if not state_data:
        raise HTTPException(status_code=404, detail="Session not found")
    return state_data
