"""
DeepSeek LLM implementation
Uses DeepSeek API for text generation
"""

import os
import logging
from typing import Optional, Dict, Any, Generator
from openai import OpenAI
from .base import BaseLLM


logger = logging.getLogger(__name__)


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
            base_url="https://api.deepseek.com",
            timeout=60.0,
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
            logger.error(f"DeepSeek API call error: {type(e).__name__}")
            raise

    def invoke_stream(self, system_prompt: str, user_prompt: str, messages: Optional[list] = None, **kwargs) -> Generator[str, None, None]:
        """
        Call DeepSeek API with stream=True, yielding content tokens as they arrive.
        If `messages` is provided it is used directly, enabling multi-turn conversation history.
        """
        if messages is None:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
        params = {
            "model": self.default_model,
            "messages": messages,
            "temperature": kwargs.get("temperature", 0.3),
            "max_tokens": kwargs.get("max_tokens", 4000),
            "stream": True
        }

        response = self.client.chat.completions.create(**params)
        reasoning_started = False
        for chunk in response:
            choice = chunk.choices[0]
            # DeepSeek Reasoner emits thinking via a separate reasoning_content field
            reasoning = getattr(choice.delta, 'reasoning_content', None)
            if reasoning:
                if not reasoning_started:
                    reasoning_started = True
                    yield "<think>"
                yield reasoning
            else:
                if reasoning_started:
                    reasoning_started = False
                    yield "</think>"
                delta = choice.delta.content
                if delta:
                    yield delta

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