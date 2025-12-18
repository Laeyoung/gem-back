from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict, Union

@dataclass
class GemBackOptions:
    api_key: Optional[str] = None
    api_keys: Optional[List[str]] = None
    fallback_order: List[str] = field(default_factory=lambda: ["gemini-2.5-flash", "gemini-2.5-flash-lite"])
    max_retries: int = 2
    retry_delay: float = 1.0  # seconds
    timeout: float = 30.0     # seconds
    debug: bool = False
    log_level: str = "INFO"
    api_key_rotation_strategy: str = "round-robin" # "round-robin" or "least-used"
    enable_monitoring: bool = False

@dataclass
class GeminiResponse:
    text: str
    model: str
    raw_response: Any = None

@dataclass
class AttemptRecord:
    model: str
    error: str
    timestamp: float
    status_code: Optional[int] = None

class GeminiBackError(Exception):
    def __init__(self, message: str, code: str, attempts: List[AttemptRecord], status_code: Optional[int] = None, model: Optional[str] = None):
        super().__init__(message)
        self.code = code
        self.attempts = attempts
        self.status_code = status_code
        self.model = model
