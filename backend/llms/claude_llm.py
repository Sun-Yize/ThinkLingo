"""
Claude LLM — Anthropic SDK
Latest models (2025): claude-sonnet-4-5-20250929, claude-3-5-haiku-20241022, claude-opus-4-5
API reference: https://docs.anthropic.com/en/api/messages

Authentication:
  - Regular API key  (sk-ant-api03-...): uses x-api-key header
  - OAuth setup-token (sk-ant-oat01-...): uses Authorization: Bearer header
    Obtain via `claude setup-token` in the Claude Code CLI.
    Requires anthropic-beta: oauth-2025-04-20 header.
    Env fallback: ANTHROPIC_AUTH_TOKEN
"""

import os
import anthropic
from typing import Optional, Generator

from .base import BaseLLM

# Prefix that distinguishes OAuth access tokens from regular API keys
_OAUTH_TOKEN_PREFIX = "sk-ant-oat01-"


class ClaudeLLM(BaseLLM):
    """
    Anthropic Claude provider via official anthropic SDK.

    Supports both authentication modes:
    - Regular API key  (sk-ant-api03-...): standard x-api-key header
    - OAuth setup-token (sk-ant-oat01-...): Authorization: Bearer header
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: Optional[str] = None,
    ):
        # Resolve credential from argument → env vars
        if not api_key:
            api_key = (
                os.getenv("ANTHROPIC_API_KEY")
                or os.getenv("ANTHROPIC_AUTH_TOKEN")  # OAuth token fallback
            )
        if not api_key:
            raise ValueError(
                "Anthropic credential not found. "
                "Set ANTHROPIC_API_KEY (regular API key) or "
                "ANTHROPIC_AUTH_TOKEN (OAuth token from `claude setup-token`)."
            )

        super().__init__(api_key, model_name)

        # Detect OAuth token and pick the correct auth method
        self._is_oauth = api_key.startswith(_OAUTH_TOKEN_PREFIX)

        if self._is_oauth:
            # OAuth token → Authorization: Bearer <token>
            # Also add the required beta header for OAuth authentication
            self.client = anthropic.Anthropic(
                auth_token=api_key,
                default_headers={"anthropic-beta": "oauth-2025-04-20"},
                timeout=60.0,
            )
        else:
            # Regular API key → x-api-key: <key>
            self.client = anthropic.Anthropic(api_key=api_key, timeout=60.0)

        self.default_model = model_name or self.get_default_model()

    def get_default_model(self) -> str:
        return "claude-opus-4-6"

    def get_model_info(self) -> dict:
        return {
            "provider": "anthropic",
            "model": self.default_model,
            "recommended_models": [
                "claude-opus-4-6",             # most capable (latest, default)
                "claude-sonnet-4-6",           # balanced
                "claude-haiku-4-5-20251001",   # fast / cheap
            ],
        }

    def invoke(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """Single-turn, non-streaming call."""
        response = self.client.messages.create(
            model=self.default_model,
            max_tokens=kwargs.get("max_tokens", 4000),
            temperature=kwargs.get("temperature", 0.3),
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        text = response.content[0].text if response.content else ""
        return self.validate_response(text)

    def invoke_stream(
        self,
        system_prompt: str,
        user_prompt: str,
        messages: Optional[list] = None,
        **kwargs,
    ) -> Generator[str, None, None]:
        """
        Token-level streaming.

        `messages` arrives from questioner_agent with the system message as
        the very first element ({"role": "system", ...}).
        Claude's API does NOT accept "system" as a role inside the messages
        array — strip it and pass system_prompt via the top-level `system=`
        parameter instead.
        """
        if messages is None:
            anthropic_messages = [{"role": "user", "content": user_prompt}]
        else:
            anthropic_messages = [
                {"role": m["role"], "content": m["content"]}
                for m in messages
                if m["role"] != "system"
            ]

        with self.client.messages.stream(
            model=self.default_model,
            max_tokens=kwargs.get("max_tokens", 4000),
            temperature=kwargs.get("temperature", 0.3),
            system=system_prompt,
            messages=anthropic_messages,
        ) as stream:
            yield from stream.text_stream
