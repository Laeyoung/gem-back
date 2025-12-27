import unittest
from unittest.mock import MagicMock, patch
from google.api_core import exceptions
from client import GemBackClient, GemBackConfig, GenerateContentOutput

class TestGemBackClient(unittest.TestCase):
    def setUp(self):
        self.config = GemBackConfig(
            api_keys=["key1", "key2", "key3"],
            fallback_order=["model-a", "model-b"],
            retry_delay=0  # Speed up tests
        )
        self.client = GemBackClient(self.config)

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    def test_generate_content_success_first_try(self, mock_configure, mock_model_cls):
        # Setup mock
        mock_model_instance = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Success response"
        mock_response.candidates = [MagicMock(finish_reason=MagicMock(name="STOP"))]
        mock_response.usage_metadata = MagicMock(
            prompt_token_count=10, candidates_token_count=20, total_token_count=30
        )
        mock_model_instance.generate_content.return_value = mock_response
        mock_model_cls.return_value = mock_model_instance

        # Execute
        result = self.client.generate_content("Hello")

        # Verify
        self.assertEqual(result.text, "Success response")
        self.assertEqual(result.model_used, "model-a")
        mock_configure.assert_called_with(api_key="key1")

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    def test_key_rotation_on_429(self, mock_configure, mock_model_cls):
        # Setup mock behavior
        mock_model_instance = MagicMock()
        
        # First call raises 429 (ResourceExhausted), Second call succeeds
        mock_response = MagicMock()
        mock_response.text = "Success after rotation"
        mock_response.candidates = [MagicMock(finish_reason=MagicMock(name="STOP"))]
        
        # Side effect: first call error, second call success
        mock_model_instance.generate_content.side_effect = [
            exceptions.ResourceExhausted("Quota exceeded"),
            mock_response
        ]
        mock_model_cls.return_value = mock_model_instance

        # Execute
        result = self.client.generate_content("Hello")

        # Verify
        self.assertEqual(result.text, "Success after rotation")
        # Should verify that configure was called with different keys
        # Note: logic tries keys in rotated order.
        # 1st attempt: key1 -> Fail
        # 2nd attempt: key2 -> Success
        self.assertTrue(mock_configure.call_count >= 2)
        
        # Verify key rotation logic: keys are rotated in subsequent calls
        # We can inspect the call_args_list of configure to see if keys changed
        calls = mock_configure.call_args_list
        keys_used = [c.kwargs['api_key'] for c in calls]
        self.assertIn("key1", keys_used)
        self.assertIn("key2", keys_used)

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    def test_model_fallback(self, mock_configure, mock_model_cls):
        # Setup: Model-A fails for ALL keys, Model-B succeeds
        
        mock_model_instance_a = MagicMock()
        mock_model_instance_a.generate_content.side_effect = exceptions.ResourceExhausted("Quota exceeded")
        
        mock_model_instance_b = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Success with backup model"
        mock_response.candidates = [MagicMock(finish_reason=MagicMock(name="STOP"))]
        mock_model_instance_b.generate_content.return_value = mock_response

        # Use side_effect to return different mocks based on model initialization
        def side_effect_model(model_name):
            if model_name == "model-a":
                return mock_model_instance_a
            if model_name == "model-b":
                return mock_model_instance_b
            return MagicMock()

        mock_model_cls.side_effect = side_effect_model

        # Execute
        result = self.client.generate_content("Hello")

        # Verify
        self.assertEqual(result.text, "Success with backup model")
        self.assertEqual(result.model_used, "model-b")

    @patch("google.generativeai.GenerativeModel")
    def test_all_fail(self, mock_model_cls):
        mock_instance = MagicMock()
        mock_instance.generate_content.side_effect = Exception("Generic Error")
        mock_model_cls.return_value = mock_instance

        with self.assertRaises(Exception):
            self.client.generate_content("Hello")

if __name__ == '__main__':
    unittest.main()
