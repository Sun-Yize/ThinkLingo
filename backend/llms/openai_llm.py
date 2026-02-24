"""
OpenAI LLM implementation
Uses OpenAI API for text generation
"""

import os
import logging
from typing import Optional, Dict, Any
from openai import OpenAI
from .base import BaseLLM


logger = logging.getLogger(__name__)


class OpenAILLM(BaseLLM):
    """OpenAI LLM implementation class"""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        Initialize OpenAI client

        Args:
            api_key: OpenAI API key, reads from environment variable if not provided
            model_name: Model name, defaults to gpt-4o-mini
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
        return "gpt-4o-mini"

    def invoke(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """
        Call OpenAI API to generate response

        Args:
            system_prompt: System prompt
            user_prompt: User input
            **kwargs: Additional parameters like temperature, max_tokens, etc.

        Returns:
            OpenAI generated response text
        """
        try:
            # Build messages
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]

            # Set default parameters
            params = {
                "model": self.default_model,
                "messages": messages,
                "temperature": kwargs.get("temperature", 0.3),
                "max_tokens": kwargs.get("max_tokens", 4000)
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
            logger.error(f"OpenAI API call error: {str(e)}")
            raise e

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get current model information

        Returns:
            Model information dictionary
        """
        return {
            "provider": "OpenAI",
            "model": self.default_model,
            "api_base": "https://api.openai.com"
        }