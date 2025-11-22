"""
DeepSeek LLM implementation
Uses DeepSeek API for text generation
"""

import os
from typing import Optional, Dict, Any
from openai import OpenAI
from .base import BaseLLM


class DeepSeekLLM(BaseLLM):
    """DeepSeek LLM implementation class"""

    def __init__(self, api_key: Optional[str] = None, model_name: Optional[str] = None):
        """
        Initialize DeepSeek client

        Args:
            api_key: DeepSeek API key, reads from environment variable if not provided
            model_name: Model name, defaults to deepseek-chat
        """
        if api_key is None:
            api_key = os.getenv("DEEPSEEK_API_KEY")
            if not api_key:
                raise ValueError("DeepSeek API Key not found! Please set DEEPSEEK_API_KEY environment variable or provide during initialization")

        super().__init__(api_key, model_name)

        # Initialize DeepSeek client (using OpenAI-compatible interface)
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com"
        )
        self.default_model = model_name or self.get_default_model()

    def get_default_model(self) -> str:
        """Get default model name"""
        return "deepseek-chat"

    def invoke(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """
        Call DeepSeek API to generate response

        Args:
            system_prompt: System prompt
            user_prompt: User input
            **kwargs: Additional parameters like temperature, max_tokens, etc.

        Returns:
            DeepSeek generated response text
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
            print(f"DeepSeek API call error: {str(e)}")
            raise e

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get current model information

        Returns:
            Model information dictionary
        """
        return {
            "provider": "DeepSeek",
            "model": self.default_model,
            "api_base": "https://api.deepseek.com"
        }