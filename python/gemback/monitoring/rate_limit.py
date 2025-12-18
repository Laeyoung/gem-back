import time
from dataclasses import dataclass, field
from typing import Dict, Optional

@dataclass
class WindowStats:
    requests_in_last_minute: int = 0
    requests_in_last_5_minutes: int = 0
    average_rpm: float = 0.0

@dataclass
class RateLimitStatus:
    model: str
    current_rpm: int
    max_rpm: int
    utilization_percent: float
    is_near_limit: bool
    will_exceed_soon: bool
    window_stats: WindowStats

class RateLimitTracker:
    def __init__(self):
        # Default limits, in real app could be configurable
        self.limits: Dict[str, int] = {
            "gemini-2.5-flash": 15,
            "gemini-2.5-flash-lite": 15,
            "gemini-1.5-flash": 15,
            "gemini-1.5-pro": 2,
        }
        # request_timestamps[model] = [timestamp1, timestamp2, ...]
        self.request_timestamps: Dict[str, list] = {}

    def record_request(self, model: str):
        if model not in self.request_timestamps:
            self.request_timestamps[model] = []

        now = time.time()
        self.request_timestamps[model].append(now)
        # Cleanup old timestamps (> 5 mins)
        self._cleanup(model, now)

    def _cleanup(self, model: str, now: float):
        # Keep only last 5 minutes
        cutoff = now - 300
        self.request_timestamps[model] = [
            t for t in self.request_timestamps[model] if t > cutoff
        ]

    def get_status(self, model: str) -> RateLimitStatus:
        now = time.time()
        if model in self.request_timestamps:
            self._cleanup(model, now)

        timestamps = self.request_timestamps.get(model, [])
        one_min_ago = now - 60
        req_last_min = len([t for t in timestamps if t > one_min_ago])

        max_rpm = self.limits.get(model, 15) # Default to 15 if unknown
        utilization = (req_last_min / max_rpm) * 100 if max_rpm > 0 else 0

        return RateLimitStatus(
            model=model,
            current_rpm=req_last_min,
            max_rpm=max_rpm,
            utilization_percent=utilization,
            is_near_limit=utilization >= 80,
            will_exceed_soon=utilization >= 90,
            window_stats=WindowStats(
                requests_in_last_minute=req_last_min,
                requests_in_last_5_minutes=len(timestamps),
                average_rpm=len(timestamps) / 5.0 # Crude average
            )
        )

    def would_exceed_limit(self, model: str) -> bool:
        status = self.get_status(model)
        return status.current_rpm >= status.max_rpm

    def get_recommended_wait_time(self, model: str) -> int:
        """Returns milliseconds to wait"""
        if not self.would_exceed_limit(model):
            return 0

        timestamps = self.request_timestamps.get(model, [])
        if not timestamps:
            return 0

        # Find the oldest request in the current 1-minute window
        # We need to wait until that request 'expires' from the window
        now = time.time()
        one_min_ago = now - 60
        valid_timestamps = sorted([t for t in timestamps if t > one_min_ago])

        # We can make a request when the count drops below limit.
        # Currently count = len(valid_timestamps). It is >= max_rpm.
        # We need to wait until the (len - max_rpm + 1)-th oldest request expires.
        # For simplicity, just wait for the oldest one in window to expire.

        oldest_in_window = valid_timestamps[0]
        # Expires at oldest + 60s
        expiry = oldest_in_window + 60
        wait_seconds = max(0, expiry - now)
        return int(wait_seconds * 1000)
