"""
Qwen LLM — Alibaba Cloud DashScope OpenAI-compatible endpoint
Uses the existing `openai` package with a custom base_url (no new dependency).

Latest models (2025):
  qwen-plus      — balanced speed/quality/cost (default)
  qwen-max       — highest quality (qwen3-max series)
  qwen-turbo     — fastest, cheapest
  qwq-plus       — reasoning model (thinking mode)

Regional base URLs:
  International: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
  China:         https://dashscope.aliyuncs.com/compatible-mode/v1

API docs: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
"""

import os
from openai import OpenAI
from typing import Optional, Generator

from .base import BaseLLM


class QwenLLM(BaseLLM):
    """Alibaba Cloud Qwen provider via DashScope OpenAI-compatible endpoint."""

    # Default to international endpoint; override with QWEN_BASE_URL env var
    _DEFAULT_BASE_URL = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        if api_key is None:
            api_key = os.getenv("QWEN_API_KEY")
        if not api_key:
            raise ValueError(
                "Qwen API key not found. "
                "Set QWEN_API_KEY in environment or pass api_key."
            )
        super().__init__(api_key, model_name)
        # Priority: explicit arg > env var > default (international)
        base_url = base_url or os.getenv("QWEN_BASE_URL", self._DEFAULT_BASE_URL)
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=base_url,
            timeout=60.0,
        )
        self.default_model = model_name or self.get_default_model()

    def get_default_model(self) -> str:
        return "qwen-plus"

    def get_model_info(self) -> dict:
        return {
            "provider": "alibaba",
            "model": self.default_model,
            "recommended_models": [
                "qwen-plus",   # balanced (default)
                "qwen-max",    # highest quality
                "qwen-turbo",  # fastest / cheapest
                "qwq-plus",    # reasoning / thinking
            ],
        }

    def invoke(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Single-turn, non-streaming call."""
        response = self.client.chat.completions.create(
            model=self.default_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ],
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 4000),
        )
        content = response.choices[0].message.content if response.choices else ""
        return self.validate_response(content)

    def invoke_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        messages: Optional[list] = None,
        **kwargs,
    ) -> Generator[str, None, None]:
        """
        Token-level streaming.
        Note: some Qwen models (qwq-plus, qwen3 open-source) ONLY support streaming.
        """
        if messages is None:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": user_prompt},
            ]
        response = self.client.chat.completions.create(
            model=self.default_model,
            messages=messages,
            temperature=kwargs.get("temperature", 0.3),
            max_tokens=kwargs.get("max_tokens", 4000),
            stream=True,
        )
        for chunk in response:
            delta = chunk.choices[0].delta.content
            if delta:
                yield delta
