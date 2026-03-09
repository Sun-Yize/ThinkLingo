"""
Qwen LLM — Alibaba Cloud DashScope OpenAI-compatible endpoint
Uses the existing `openai` package with a custom base_url (no new dependency).

Latest models (2026):
  qwen-plus              — balanced speed/quality/cost (default)
  qwen3-max              — most capable
  qwen3-max-thinking     — qwen3-max with thinking/CoT enabled (virtual alias)
  qwen-turbo             — fastest, cheapest

Regional base URLs:
  International: https://dashscope-intl.aliyuncs.com/compatible-mode/v1
  China:         https://dashscope.aliyuncs.com/compatible-mode/v1

API docs: https://www.alibabacloud.com/help/en/model-studio/compatibility-of-openai-with-dashscope
"""

import os
import re
from openai import OpenAI
from typing import Optional, Generator

from .base import BaseLLM

# Regex to strip <think>…</think> reasoning blocks from Qwen 3.x output
_THINK_BLOCK_RE = re.compile(r"<think>[\s\S]*?</think>\s*", re.DOTALL)


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
        raw_model = model_name or self.get_default_model()
        # Virtual alias: "xxx-thinking" → real model "xxx" + enable thinking
        if raw_model.endswith("-thinking"):
            self.default_model = raw_model.removesuffix("-thinking")
            self._enable_thinking = True
        else:
            self.default_model = raw_model
            self._enable_thinking = False

    def get_default_model(self) -> str:
        return "qwen-plus"

    def get_model_info(self) -> dict:
        return {
            "provider": "alibaba",
            "model": self.default_model,
            "recommended_models": [
                "qwen-plus",            # balanced (default)
                "qwen3-max",            # most capable
                "qwen3-max-thinking",   # qwen3-max with CoT
                "qwen-turbo",           # fastest / cheapest
            ],
        }

    def _extra_body(self) -> dict:
        """Build extra_body for thinking-enabled models."""
        if self._enable_thinking:
            return {"enable_thinking": True}
        return {}

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
            extra_body=self._extra_body(),
        )
        content = response.choices[0].message.content if response.choices else ""
        # Strip <think>…</think> reasoning blocks
        content = _THINK_BLOCK_RE.sub("", content).lstrip()
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
        Yields raw tokens including <think>…</think> blocks.
        Callers that need think-stripping should handle it themselves.
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
            extra_body=self._extra_body(),
        )
        thinking_started = False
        for chunk in response:
            choice = chunk.choices[0]
            # Qwen thinking models emit reasoning via a separate reasoning_content field
            if self._enable_thinking:
                reasoning = getattr(choice.delta, 'reasoning_content', None)
                if reasoning:
                    if not thinking_started:
                        thinking_started = True
                        yield "<think>"
                    yield reasoning
                    continue
                else:
                    if thinking_started:
                        thinking_started = False
                        yield "</think>"
            delta = choice.delta.content
            if delta:
                yield delta
