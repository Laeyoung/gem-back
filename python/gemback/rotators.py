import time
import logging
from typing import List, Dict, Optional
from dataclasses import dataclass, field

@dataclass
class KeyStats:
    key_index: int
    total_requests: int = 0
    success_count: int = 0
    failure_count: int = 0
    last_used: float = 0.0

class ApiKeyRotator:
    def __init__(self, api_keys: List[str], strategy: str = "round-robin"):
        self.api_keys = api_keys
        self.strategy = strategy
        self.current_index = 0
        self.stats: Dict[int, KeyStats] = {
            i: KeyStats(key_index=i) for i in range(len(api_keys))
        }

    def get_next_key(self) -> dict:
        if not self.api_keys:
            raise ValueError("No API keys provided")

        index = 0
        if self.strategy == "round-robin":
            index = self.current_index
            self.current_index = (self.current_index + 1) % len(self.api_keys)
        elif self.strategy == "least-used":
            # Find key with minimum total requests
            index = min(self.stats.items(), key=lambda x: x[1].total_requests)[0]

        # Update usage stats
        self.stats[index].last_used = time.time()

        return {"key": self.api_keys[index], "index": index}

    def record_success(self, index: int):
        if index in self.stats:
            self.stats[index].success_count += 1
            self.stats[index].total_requests += 1

    def record_failure(self, index: int):
        if index in self.stats:
            self.stats[index].failure_count += 1
            self.stats[index].total_requests += 1

    def get_stats(self) -> List[Dict]:
        return [
            {
                "keyIndex": s.key_index,
                "totalRequests": s.total_requests,
                "successCount": s.success_count,
                "failureCount": s.failure_count,
                "lastUsed": s.last_used
            }
            for s in self.stats.values()
        ]
