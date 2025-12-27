import time
import logging
from typing import List, Optional, Dict, Any
import google.generativeai as genai
from google.api_core import exceptions

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("gem-back")

class Usage:
    def __init__(self, prompt_tokens: int, completion_tokens: int, total_tokens: int):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.total_tokens = total_tokens

class GenerateContentOutput:
    def __init__(self, text: str, model_used: str, finish_reason: Optional[str] = None, usage: Optional[Usage] = None):
        self.text = text
        self.model_used = model_used
        self.finish_reason = finish_reason
        self.usage = usage

class GemBackConfig:
    def __init__(
        self,
        api_keys: List[str],
        fallback_order: Optional[List[str]] = None,
        max_retries: int = 3,
        timeout: int = 30000,
        retry_delay: int = 1000
    ):
        self.api_keys = api_keys
        self.fallback_order = fallback_order or ["gemini-pro", "gemini-flash"]
        self.max_retries = max_retries
        self.timeout = timeout  # milliseconds
        self.retry_delay = retry_delay # milliseconds

class GemBackClient:
    def __init__(self, config: GemBackConfig):
        self.config = config
        self._current_key_index = 0
        if not self.config.api_keys:
            raise ValueError("At least one API key is required")

    def _get_next_key(self) -> str:
        # Simple Round-Robin for the session (or could be linear per request)
        # Here we implement linear rotation for the session to spread load
        key = self.config.api_keys[self._current_key_index]
        self._current_key_index = (self._current_key_index + 1) % len(self.config.api_keys)
        return key

    def _get_all_keys_rotated(self) -> List[str]:
        # Return a list of keys starting from current index
        return self.config.api_keys[self._current_key_index:] + self.config.api_keys[:self._current_key_index]

    def generate_content(
        self,
        prompt: str,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None
    ) -> GenerateContentOutput:
        
        # Determine model strategy
        models_to_try = [model] if model else self.config.fallback_order
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
            "top_p": top_p,
            "top_k": top_k,
        }
        # Filter None values
        generation_config = {k: v for k, v in generation_config.items() if v is not None}

        last_error = None

        for model_name in models_to_try:
            logger.info(f"Attempting model: {model_name}")
            
            # Try all keys for this model
            # We create a local copy of keys to iterate through for this request
            # usually we want to start with a fresh key or current key
            keys_to_try = self._get_all_keys_rotated()

            for api_key in keys_to_try:
                try:
                    # Configure client for this key
                    genai.configure(api_key=api_key)
                    generative_model = genai.GenerativeModel(model_name)
                    
                    # Call API
                    # Note: Python SDK handles timeout differently, here passing as request option if supported
                    # or strictly enforcing usually requires async or threading. 
                    # For simplicity, we assume standard behavior.
                    response = generative_model.generate_content(
                        prompt,
                        generation_config=generation_config
                    )
                    
                    # Check for safety blocks or other non-exception failures
                    if not response.parts and response.prompt_feedback:
                         logger.warning(f"Blocked by safety settings on key ending ...{api_key[-4:]}")
                         # This might be model specific, so maybe try next model? 
                         # Or next key? Usually safety is deterministic per model.
                         # We treat it as a failure for this model.
                         last_error = Exception(f"Safety Block: {response.prompt_feedback}")
                         break # Break key loop, go to next model

                    # Success
                    usage = None
                    if response.usage_metadata:
                        usage = Usage(
                            prompt_tokens=response.usage_metadata.prompt_token_count,
                            completion_tokens=response.usage_metadata.candidates_token_count,
                            total_tokens=response.usage_metadata.total_token_count
                        )
                    
                    return GenerateContentOutput(
                        text=response.text,
                        model_used=model_name,
                        finish_reason=response.candidates[0].finish_reason.name if response.candidates else "UNKNOWN",
                        usage=usage
                    )

                except exceptions.ResourceExhausted:
                    logger.warning(f"Rate limit hit for key ending ...{api_key[-4:]}. Rotating key.")
                    last_error = exceptions.ResourceExhausted("All keys exhausted")
                    continue # Try next key
                except exceptions.ServiceUnavailable:
                    logger.warning(f"Service unavailable for key ending ...{api_key[-4:]}. Retrying/Rotating.")
                    time.sleep(self.config.retry_delay / 1000.0)
                    last_error = exceptions.ServiceUnavailable("Service Unavailable")
                    continue
                except Exception as e:
                    logger.error(f"Error with model {model_name} and key ...{api_key[-4:]}: {str(e)}")
                    last_error = e
                    # For 400 errors (InvalidArgument), it's likely the prompt or params, 
                    # so retrying same model/key won't help, but fallback model might (if params were model specific).
                    # We will continue to next key/model just in case, but usually we should raise.
                    # For this robust client, we try next key/model.
                    continue
            
            # If we exhausted all keys for this model and didn't return, we go to next model
            logger.info(f"All keys failed for model {model_name}. Falling back...")

        raise last_error or Exception("Failed to generate content with all models and keys")

# Example Usage (Commented out)
# config = GemBackConfig(api_keys=["key1", "key2"], fallback_order=["gemini-1.5-flash", "gemini-1.5-pro"])
# client = GemBackClient(config)
# result = client.generate_content("Hello world")
# print(result.text)
