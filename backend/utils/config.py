"""
Configuration management for the translation framework
"""

import os
from typing import Optional
from dotenv import load_dotenv


class Config:
    """Configuration class for the translation framework"""

    def __init__(
        self,
        default_llm_provider: str = "deepseek",
        translation_llm_provider: Optional[str] = None,
        deepseek_api_key: Optional[str] = None,
        deepseek_model: str = "deepseek-chat",
        openai_api_key: Optional[str] = None,
        openai_model: str = "gpt-4o-mini",
        gpt35_model: str = "gpt-3.5-turbo",
        anthropic_api_key: Optional[str] = None,
        claude_model: str = "claude-opus-4-6",
        google_api_key: Optional[str] = None,
        gemini_model: str = "gemini-3.1-pro-preview",
        qwen_api_key: Optional[str] = None,
        qwen_model: str = "qwen3.5-plus",
        default_response_type: str = "general",
        default_temperature: float = 0.7,
        max_tokens: int = 4000,
        cors_origins: str = "http://localhost:3000",
        max_workers: int = 20,
        max_history_turns: int = 20,
    ):
        """
        Initialize configuration

        Args:
            default_llm_provider: Default LLM provider
                ("deepseek", "openai", "gpt35", "claude", "gemini", "qwen")
            translation_llm_provider: Optional separate provider for translation tasks
            deepseek_api_key: DeepSeek API key
            deepseek_model: DeepSeek model to use
            openai_api_key: OpenAI API key
            openai_model: OpenAI model to use
            gpt35_model: GPT-3.5 model to use
            anthropic_api_key: Anthropic API key (for Claude)
            claude_model: Claude model to use
            google_api_key: Google API key (for Gemini)
            gemini_model: Gemini model to use
            qwen_api_key: Alibaba DashScope API key (for Qwen)
            qwen_model: Qwen model to use
            default_response_type: Default response type
            default_temperature: Default temperature for LLM calls
            max_tokens: Maximum tokens for responses
        """
        # Load .env file
        load_dotenv()

        # Provider Configuration
        self.default_llm_provider = default_llm_provider or os.getenv("DEFAULT_LLM_PROVIDER", "deepseek")
        self.translation_llm_provider = translation_llm_provider or os.getenv("TRANSLATION_LLM_PROVIDER", "gpt35")

        # API Configuration
        self.deepseek_api_key  = deepseek_api_key  or os.getenv("DEEPSEEK_API_KEY")
        self.openai_api_key    = openai_api_key    or os.getenv("OPENAI_API_KEY")
        self.anthropic_api_key = anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        self.google_api_key    = google_api_key    or os.getenv("GOOGLE_API_KEY")
        self.qwen_api_key      = qwen_api_key      or os.getenv("QWEN_API_KEY")

        # Model Configuration
        self.deepseek_model = deepseek_model or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self.openai_model   = openai_model   or os.getenv("OPENAI_MODEL",   "gpt-4o-mini")
        self.gpt35_model    = gpt35_model    or os.getenv("GPT35_MODEL",    "gpt-3.5-turbo")
        self.claude_model   = claude_model   or os.getenv("CLAUDE_MODEL",   "claude-opus-4-6")
        self.gemini_model   = gemini_model   or os.getenv("GEMINI_MODEL",   "gemini-3.1-pro-preview")
        self.qwen_model     = qwen_model     or os.getenv("QWEN_MODEL",     "qwen3.5-plus")

        # Default Parameters
        self.default_response_type = default_response_type or os.getenv("DEFAULT_RESPONSE_TYPE", "general")
        self.default_temperature = default_temperature or float(os.getenv("DEFAULT_TEMPERATURE", "0.7"))
        self.max_tokens = max_tokens or int(os.getenv("MAX_TOKENS", "4000"))
        self.cors_origins = cors_origins or os.getenv("CORS_ORIGINS", "http://localhost:3000")
        self.max_workers = max_workers or int(os.getenv("MAX_WORKERS", "40"))
        self.max_history_turns = max_history_turns or int(os.getenv("MAX_HISTORY_TURNS", "20"))

        # Validate configuration
        self._validate_config()

    def _validate_config(self):
        """Validate the configuration"""
        # Validate providers
        valid_providers = ["deepseek", "openai", "gpt35", "claude", "gemini", "qwen"]

        if self.default_llm_provider not in valid_providers:
            raise ValueError(f"Default LLM provider must be one of: {valid_providers}")

        if self.translation_llm_provider not in valid_providers:
            raise ValueError(f"Translation LLM provider must be one of: {valid_providers}")

        # --- Key requirements per provider ---
        _key_checks = {
            "deepseek": (self.deepseek_api_key,  "DEEPSEEK_API_KEY"),
            "openai":   (self.openai_api_key,    "OPENAI_API_KEY"),
            "gpt35":    (self.openai_api_key,    "OPENAI_API_KEY"),
            "claude":   (self.anthropic_api_key, "ANTHROPIC_API_KEY"),
            "gemini":   (self.google_api_key,    "GOOGLE_API_KEY"),
            "qwen":     (self.qwen_api_key,      "QWEN_API_KEY"),
        }

        for role, provider in [
            ("default", self.default_llm_provider),
            ("translation", self.translation_llm_provider),
        ]:
            key_val, env_name = _key_checks[provider]
            if not key_val:
                raise ValueError(
                    f"{env_name} is required when using {provider!r} as {role} provider. "
                    f"Set {env_name} in .env file or environment variable."
                )

        # Validate parameters
        if self.default_temperature < 0 or self.default_temperature > 2:
            raise ValueError("Temperature must be between 0 and 2")

        if self.max_tokens <= 0:
            raise ValueError("Max tokens must be positive")

    def get_llm_params(self) -> dict:
        """
        Get LLM parameters

        Returns:
            Dictionary of LLM parameters
        """
        return {
            "temperature": self.default_temperature,
            "max_tokens": self.max_tokens
        }

    def _api_key_for(self, provider: str) -> Optional[str]:
        return {
            "deepseek": self.deepseek_api_key,
            "openai":   self.openai_api_key,
            "gpt35":    self.openai_api_key,
            "claude":   self.anthropic_api_key,
            "gemini":   self.google_api_key,
            "qwen":     self.qwen_api_key,
        }.get(provider)

    def _model_for(self, provider: str) -> str:
        return {
            "deepseek": self.deepseek_model,
            "openai":   self.openai_model,
            "gpt35":    self.gpt35_model,
            "claude":   self.claude_model,
            "gemini":   self.gemini_model,
            "qwen":     self.qwen_model,
        }.get(provider, "")

    def get_current_api_key(self) -> Optional[str]:
        return self._api_key_for(self.default_llm_provider)

    def get_current_model(self) -> str:
        return self._model_for(self.default_llm_provider)

    def get_translation_api_key(self) -> Optional[str]:
        return self._api_key_for(self.translation_llm_provider)

    def get_translation_model(self) -> str:
        return self._model_for(self.translation_llm_provider)

    def to_dict(self) -> dict:
        """
        Convert configuration to dictionary

        Returns:
            Configuration as dictionary
        """
        return {
            "default_llm_provider":     self.default_llm_provider,
            "translation_llm_provider": self.translation_llm_provider,
            "deepseek_model": self.deepseek_model,
            "openai_model":   self.openai_model,
            "gpt35_model":    self.gpt35_model,
            "claude_model":   self.claude_model,
            "gemini_model":   self.gemini_model,
            "qwen_model":     self.qwen_model,
            "default_response_type": self.default_response_type,
            "default_temperature":   self.default_temperature,
            "max_tokens":            self.max_tokens,
        }

    @classmethod
    def from_env(cls) -> "Config":
        """
        Create configuration from environment variables and .env file

        Returns:
            Config instance
        """
        # Load .env file first
        load_dotenv()

        return cls(
            default_llm_provider=os.getenv("DEFAULT_LLM_PROVIDER", "deepseek"),
            translation_llm_provider=os.getenv("TRANSLATION_LLM_PROVIDER", "gpt35"),
            deepseek_api_key=os.getenv("DEEPSEEK_API_KEY"),
            deepseek_model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            gpt35_model=os.getenv("GPT35_MODEL", "gpt-3.5-turbo"),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"),
            claude_model=os.getenv("CLAUDE_MODEL", "claude-opus-4-6"),
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-3.1-pro-preview"),
            qwen_api_key=os.getenv("QWEN_API_KEY"),
            qwen_model=os.getenv("QWEN_MODEL", "qwen3.5-plus"),
            default_response_type=os.getenv("DEFAULT_RESPONSE_TYPE", "general"),
            default_temperature=float(os.getenv("DEFAULT_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("MAX_TOKENS", "4000")),
            cors_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000"),
            max_workers=int(os.getenv("MAX_WORKERS", "40")),
            max_history_turns=int(os.getenv("MAX_HISTORY_TURNS", "20")),
        )