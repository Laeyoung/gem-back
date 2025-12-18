import time
import logging
import asyncio
from typing import List, Optional, Any, AsyncGenerator, Dict

from google import genai
from google.genai import types

from .types import GemBackOptions, GeminiResponse, AttemptRecord, GeminiBackError
from .rotators import ApiKeyRotator
from .monitoring.rate_limit import RateLimitTracker
from .monitoring.health import HealthMonitor

class GemBack:
    def __init__(self, **kwargs):
        # Convert kwargs to GemBackOptions
        self.options = GemBackOptions()
        for k, v in kwargs.items():
            if hasattr(self.options, k):
                setattr(self.options, k, v)

        # Setup logging - Library should not configure handlers globally
        self.logger = logging.getLogger("GemBack")
        # Only set level if user explicitly requested debug or specific level
        # Otherwise respect parent logger config
        if self.options.debug:
            self.logger.setLevel(logging.DEBUG)
        elif self.options.log_level != "INFO": # "INFO" is default in options
             self.logger.setLevel(getattr(logging, self.options.log_level.upper(), logging.INFO))

        # Validation
        if not self.options.api_key and not self.options.api_keys:
             raise ValueError("Either api_key or api_keys must be provided")

        # Setup key rotation
        api_keys = self.options.api_keys or ([self.options.api_key] if self.options.api_key else [])
        self.rotator = None
        if len(api_keys) > 1:
            self.rotator = ApiKeyRotator(api_keys, self.options.api_key_rotation_strategy)
            self.logger.info(f"Multi API key mode: {len(api_keys)} keys")
        else:
            self.logger.info("Single API key mode")

        self._single_key = api_keys[0] if api_keys else None

        # Setup Monitoring
        self.rate_limit_tracker = RateLimitTracker() if self.options.enable_monitoring else None
        self.health_monitor = HealthMonitor() if self.options.enable_monitoring else None

        if self.options.enable_monitoring:
            self.logger.info("Monitoring enabled")

    def _get_api_key(self):
        if self.rotator:
            return self.rotator.get_next_key()
        return {"key": self._single_key, "index": None}

    async def generate(self, prompt: str, model: Optional[str] = None) -> GeminiResponse:
        models_to_try = [model] if model else self.options.fallback_order
        attempts: List[AttemptRecord] = []

        key_info = self._get_api_key()
        api_key = key_info["key"]
        key_index = key_info["index"]

        client = genai.Client(api_key=api_key)

        for current_model in models_to_try:
            self.logger.debug(f"Attempting: {current_model}")

            # Rate Limit Prediction
            if self.rate_limit_tracker:
                if self.rate_limit_tracker.would_exceed_limit(current_model):
                    wait = self.rate_limit_tracker.get_recommended_wait_time(current_model)
                    self.logger.warning(f"Would exceed rate limit for {current_model}. Recommended wait: {wait}ms")

            start_time = time.time()
            try:
                if self.rate_limit_tracker:
                    self.rate_limit_tracker.record_request(current_model)

                response = await self._generate_with_retry(client, current_model, prompt)

                duration = (time.time() - start_time) * 1000 # ms

                if self.health_monitor:
                    self.health_monitor.record_request(current_model, duration, True)

                if self.rotator and key_index is not None:
                    self.rotator.record_success(key_index)

                self.logger.info(f"Success: {current_model} ({int(duration)}ms)")
                return GeminiResponse(text=response.text, model=current_model, raw_response=response)

            except Exception as e:
                duration = (time.time() - start_time) * 1000
                if self.health_monitor:
                    self.health_monitor.record_request(current_model, duration, False, str(e))

                status_code = getattr(e, "code", None) or getattr(e, "status_code", None)
                err_msg = str(e)
                attempts.append(AttemptRecord(
                    model=current_model,
                    error=err_msg,
                    timestamp=time.time(),
                    status_code=status_code
                ))

                self.logger.warning(f"Failed: {current_model} - {err_msg}")

                if status_code in [401, 403]:
                    if self.rotator and key_index is not None:
                        self.rotator.record_failure(key_index)
                    raise GeminiBackError(
                        "Authentication failed", "AUTH_ERROR", attempts, status_code, current_model
                    )

        if self.rotator and key_index is not None:
             self.rotator.record_failure(key_index)

        raise GeminiBackError("All models failed", "ALL_MODELS_FAILED", attempts)

    async def _generate_with_retry(self, client: genai.Client, model: str, prompt: str):
        retries = 0
        while True:
            try:
                response = await client.aio.models.generate_content(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.7
                    )
                )
                return response
            except Exception as e:
                is_retryable = False
                status_code = getattr(e, "code", None) or getattr(e, "status_code", None)

                if status_code == 429:
                    raise e

                if status_code and status_code >= 500:
                    is_retryable = True

                if "timeout" in str(e).lower() or "connection" in str(e).lower():
                    is_retryable = True

                if is_retryable and retries < self.options.max_retries:
                    retries += 1
                    delay = self.options.retry_delay * (2 ** (retries - 1))
                    self.logger.info(f"Retry {retries}/{self.options.max_retries} for {model} after {delay}s")
                    await asyncio.sleep(delay)
                    continue

                raise e

    async def generate_stream(self, prompt: str, model: Optional[str] = None):
        """
        Generates a streaming response.
        Yields chunks of text.
        """
        models_to_try = [model] if model else self.options.fallback_order
        attempts: List[AttemptRecord] = []

        key_info = self._get_api_key()
        api_key = key_info["key"]
        client = genai.Client(api_key=api_key)

        for current_model in models_to_try:
            self.logger.debug(f"Attempting stream: {current_model}")

            if self.rate_limit_tracker:
                 self.rate_limit_tracker.record_request(current_model)

            start_time = time.time()
            try:
                stream = await client.aio.models.generate_content_stream(
                    model=current_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(temperature=0.7)
                )

                has_yielded = False
                async for chunk in stream:
                    has_yielded = True
                    yield chunk.text

                if has_yielded:
                    duration = (time.time() - start_time) * 1000
                    if self.health_monitor:
                         self.health_monitor.record_request(current_model, duration, True)
                    self.logger.info(f"Stream success: {current_model}")
                    return

            except Exception as e:
                duration = (time.time() - start_time) * 1000
                if self.health_monitor:
                     self.health_monitor.record_request(current_model, duration, False, str(e))

                self.logger.warning(f"Stream failed: {current_model} - {e}")
                attempts.append(AttemptRecord(current_model, str(e), time.time()))

        raise GeminiBackError("All models failed for stream", "ALL_MODELS_FAILED", attempts)

    def get_fallback_stats(self) -> Dict:
        stats = {
            "apiKeyStats": self.rotator.get_stats() if self.rotator else None,
            "monitoring": None
        }

        if self.options.enable_monitoring and (self.rate_limit_tracker or self.health_monitor):
            models = self.options.fallback_order

            rate_limit_status = []
            if self.rate_limit_tracker:
                rate_limit_status = [self.rate_limit_tracker.get_status(m) for m in models]

            model_health = []
            if self.health_monitor:
                model_health = [self.health_monitor.get_health(m) for m in models]

            stats["monitoring"] = {
                "rateLimitStatus": rate_limit_status,
                "modelHealth": model_health
            }

        return stats
