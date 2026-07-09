"""
Unit test for oanda_client.py's request/response handling, using a mocked
HTTP layer (no live account or network needed). Run with:
    python3 -m unittest api/test_oanda_client.py
"""

import unittest
from unittest.mock import patch, MagicMock

from oanda_client import OandaClient, OandaError

SAMPLE_CANDLE_RESPONSE = {
    "instrument": "EUR_USD",
    "granularity": "D",
    "candles": [
        {
            "complete": True,
            "volume": 12345,
            "time": "2026-07-08T21:00:00.000000000Z",
            "mid": {"o": "1.14110", "h": "1.14310", "l": "1.13900", "c": "1.14140"},
        },
        {
            "complete": False,
            "volume": 42,
            "time": "2026-07-09T21:00:00.000000000Z",
            "mid": {"o": "1.14140", "h": "1.14200", "l": "1.14050", "c": "1.14090"},
        },
    ],
}


class TestOandaClient(unittest.TestCase):
    def test_requires_api_key(self):
        with self.assertRaises(ValueError):
            OandaClient(api_key="")

    @patch("oanda_client.requests.get")
    def test_get_candles_parses_response(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = SAMPLE_CANDLE_RESPONSE
        mock_get.return_value = mock_resp

        client = OandaClient(api_key="fake-key", practice=True)
        candles = client.get_candles("EURUSD", granularity="D", count=2)

        self.assertEqual(len(candles), 2)
        self.assertEqual(candles[0]["open"], 1.14110)
        self.assertEqual(candles[0]["close"], 1.14140)
        self.assertTrue(candles[0]["complete"])
        self.assertFalse(candles[1]["complete"])

        called_url = mock_get.call_args.args[0]
        self.assertIn("EUR_USD", called_url)
        self.assertIn("api-fxpractice.oanda.com", called_url)
        called_headers = mock_get.call_args.kwargs["headers"]
        self.assertEqual(called_headers["Authorization"], "Bearer fake-key")

    @patch("oanda_client.requests.get")
    def test_get_candles_raises_on_error_status(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 401
        mock_resp.text = "Unauthorized"
        mock_get.return_value = mock_resp

        client = OandaClient(api_key="bad-key")
        with self.assertRaises(OandaError):
            client.get_candles("EURUSD")


if __name__ == "__main__":
    unittest.main()
