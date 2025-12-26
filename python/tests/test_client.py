import pytest
import asyncio
from unittest.mock import MagicMock, patch, AsyncMock
from gemback import GemBack, GemBackOptions
from gemback.types import GeminiBackError

@pytest.fixture
def mock_genai_client():
    with patch("gemback.client.genai.Client") as MockClient:
        # Setup the async client chain: client.aio.models.generate_content
        mock_instance = MockClient.return_value
        mock_aio = AsyncMock()
        mock_models = AsyncMock()

        mock_instance.aio = mock_aio
        mock_aio.models = mock_models

        # Default successful response
        mock_response = MagicMock()
        mock_response.text = "Mocked response"
        mock_models.generate_content.return_value = mock_response

        yield mock_models

@pytest.mark.asyncio
async def test_basic_generation(mock_genai_client):
    client = GemBack(api_key="test-key")
    response = await client.generate("Hello")

    assert response.text == "Mocked response"
    assert response.model == "gemini-2.5-flash" # Default first model
    mock_genai_client.generate_content.assert_called_once()

@pytest.mark.asyncio
async def test_fallback_logic(mock_genai_client):
    # First call fails (429), second succeeds
    error_429 = Exception("Rate limit")
    error_429.code = 429

    mock_response = MagicMock()
    mock_response.text = "Fallback success"

    # Side effect: First call raises, second returns success
    mock_genai_client.generate_content.side_effect = [error_429, mock_response]

    client = GemBack(
        api_key="test-key",
        fallback_order=["model-a", "model-b"]
    )

    response = await client.generate("Hello")

    assert response.text == "Fallback success"
    assert response.model == "model-b"
    assert mock_genai_client.generate_content.call_count == 2

@pytest.mark.asyncio
async def test_retry_logic(mock_genai_client):
    # First call fails (500), retry succeeds
    error_500 = Exception("Server error")
    error_500.code = 500

    mock_response = MagicMock()
    mock_response.text = "Retry success"

    mock_genai_client.generate_content.side_effect = [error_500, mock_response]

    client = GemBack(
        api_key="test-key",
        max_retries=2,
        retry_delay=0.01 # Fast retry for test
    )

    response = await client.generate("Hello")

    assert response.text == "Retry success"
    # Should be same model, just retried
    assert response.model == "gemini-2.5-flash"
    assert mock_genai_client.generate_content.call_count == 2

@pytest.mark.asyncio
async def test_all_models_fail(mock_genai_client):
    error = Exception("Fail")
    error.code = 429
    mock_genai_client.generate_content.side_effect = error

    client = GemBack(
        api_key="test-key",
        fallback_order=["model-a"]
    )

    with pytest.raises(GeminiBackError) as exc:
        await client.generate("Hello")

    assert exc.value.code == "ALL_MODELS_FAILED"

@pytest.mark.asyncio
async def test_monitoring_enabled(mock_genai_client):
    client = GemBack(api_key="test-key", enable_monitoring=True)
    await client.generate("Hello")

    stats = client.get_fallback_stats()
    assert stats["monitoring"] is not None
    assert len(stats["monitoring"]["modelHealth"]) > 0

    health = stats["monitoring"]["modelHealth"][0]
    assert health.metrics.total_requests == 1
    assert health.metrics.successful_requests == 1
