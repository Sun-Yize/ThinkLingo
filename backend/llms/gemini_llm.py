"""
Gemini LLM — Google OpenAI-compatible endpoint
Uses the existing `openai` package with a custom base_url (no new dependency).

Latest models (2025):
  gemini-2.0-flash         — fast, stable (default)
  gemini-2.5-flash         — faster, latest
  gemini-2.5-pro           — most capable
  gemini-2.5-flash-thinking — reasoning variant

OpenAI-compat endpoint docs:
  https://ai.google.dev/gemini-api/docs/openai
"""

import os
from openai import OpenAI
from typing import Optional, Generator

from .base import BaseLLM


class GeminiLLM(BaseLLM):
    """Google Gemini provider via OpenAI-compatible REST endpoint."""

    _BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        if api_key is None:
            api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError(
                "Google API key not found. "
                "Set GOOGLE_API_KEY in environment or pass api_key."
            )
        super().__init__(api_key, model_name)
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self._BASE_URL,
            timeout=60.0,
        )
        self.default_model = model_name or self.get_default_model()

    def get_default_model(self) -> str:
        return "gemini-2.0-flash"

    def get_model_info(self) -> dict:
        return {
            "provider": "google",
            "model": self.default_model,
            "recommended_models": [
                "gemini-2.0-flash",          # stable, fast (default)
                "gemini-2.5-flash",          # latest fast
                "gemini-2.5-pro",            # highest quality
                "gemini-2.5-flash-thinking", # reasoning
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
        """Token-level streaming via OpenAI-compatible SSE."""
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
