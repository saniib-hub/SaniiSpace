"""
Minimal OANDA v20 REST client for candle data.

This is real integration code against OANDA's documented v20 API, but it has
not been exercised against a live account -- this project has never had an
OANDA API key available. `test_oanda_client.py` verifies the request/parse
logic against a mocked HTTP response; before relying on this for anything,
run it once against your own practice account and confirm.

Docs: https://developer.oanda.com/rest-live-v20/instrument-ep/
"""

import requests

PRACTICE_BASE_URL = "https://api-fxpractice.oanda.com"
LIVE_BASE_URL = "https://api-fxtrade.oanda.com"

# OANDA's instrument naming differs from the plain "EURUSD" used elsewhere
# in this project.
INSTRUMENT_MAP = {
    "EURUSD": "EUR_USD",
    "GBPUSD": "GBP_USD",
    "XAUUSD": "XAU_USD",
}


class OandaError(RuntimeError):
    pass


class OandaClient:
    def __init__(self, api_key: str, account_id: str = "", practice: bool = True, timeout: float = 10.0):
        if not api_key:
            raise ValueError("api_key is required")
        self.api_key = api_key
        self.account_id = account_id
        self.base_url = PRACTICE_BASE_URL if practice else LIVE_BASE_URL
        self.timeout = timeout

    def _headers(self):
        return {"Authorization": f"Bearer {self.api_key}", "Accept-Datetime-Format": "RFC3339"}

    def get_candles(self, instrument: str, granularity: str = "D", count: int = 200):
        """
        granularity: OANDA codes, e.g. 'D' (daily), 'H1', 'M15', 'M5'.
        Returns a list of dicts: {date, open, high, low, close, complete}.
        """
        oanda_instrument = INSTRUMENT_MAP.get(instrument, instrument)
        url = f"{self.base_url}/v3/instruments/{oanda_instrument}/candles"
        params = {"granularity": granularity, "count": count, "price": "M"}
        resp = requests.get(url, headers=self._headers(), params=params, timeout=self.timeout)
        if resp.status_code != 200:
            raise OandaError(f"OANDA request failed ({resp.status_code}): {resp.text[:500]}")
        payload = resp.json()
        candles = []
        for c in payload.get("candles", []):
            mid = c.get("mid", {})
            if not mid:
                continue
            candles.append({
                "date": c["time"],
                "open": float(mid["o"]),
                "high": float(mid["h"]),
                "low": float(mid["l"]),
                "close": float(mid["c"]),
                "complete": c.get("complete", False),
            })
        return candles

    def ping(self):
        """Lightweight auth/connectivity check against the accounts endpoint."""
        url = f"{self.base_url}/v3/accounts"
        resp = requests.get(url, headers=self._headers(), timeout=self.timeout)
        if resp.status_code != 200:
            raise OandaError(f"OANDA auth check failed ({resp.status_code}): {resp.text[:500]}")
        return resp.json()
