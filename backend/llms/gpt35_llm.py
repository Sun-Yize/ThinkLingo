"""
GPT-3.5 LLM implementation for faster, lighter translation tasks
Uses OpenAI GPT-3.5-turbo which is faster and more cost-effective for translation
"""

import os
import logging
from typing import Optional, Dict, Any
from openai import OpenAI
from .base import BaseLLM


logger = logging.getLogger(__name__)


class GPT35LLM(BaseLLM):
    """GPT-3.5 LLM implementation class optimized for translation tasks"""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        Initialize GPT-3.5 client

        Args:
            api_key: OpenAI API key, reads from environment variable if not provided
            model_name: Model name, defaults to gpt-3.5-turbo
        """
        if api_key is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OpenAI API Key not found! Please set OPENAI_API_KEY environment variable or provide during initialization")

        super().__init__(api_key, model_name)

        # Initialize OpenAI client
        self.client = OpenAI(api_key=self.api_key, timeout=60.0)
        self.default_model = model_name or self.get_default_model()

    def get_default_model(self) -> str:
        """Get default model name"""
        return "gpt-3.5-turbo"

    def invoke(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """
        Call OpenAI GPT-3.5 API to generate response

        Args:
            system_prompt: System prompt
            user_prompt: User input
            **kwargs: Additional parameters like temperature, max_tokens, etc.

        Returns:
            GPT-3.5 generated response text
        """
        try:
            # Build messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            # Set default parameters optimized for translation
            params = {
                "model": self.default_model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.1),  # Lower temperature for consistent translations
                "max_tokens": kwargs.get("max_tokens", 2000)     # Smaller max tokens for faster responses
            }

            # Call API
            response = self.client.chat.completions.create(**params)

            # Extract response content
            if response.choices and response.choices[0].message:
                content = response.choices[0].message.content
                return self.validate_response(content)
            else:
                return ""

        except Exception as e:
            logger.error(f"GPT-3.5 API call error: {type(e).__name__}")
            raise

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get current model information

        Returns:
            Model information dictionary
        """
        return {
            "provider": "OpenAI",
            "model": self.default_model,
            "api_base": "https://api.openai.com",
            "optimized_for": "translation_tasks"
        }