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
        default_response_type: str = "general",
        default_temperature: float = 0.7,
        max_tokens: int = 4000
    ):
        """
        Initialize configuration

        Args:
            default_llm_provider: Default LLM provider ("deepseek", "openai", or "gpt35")
            translation_llm_provider: Optional separate provider for translation tasks
            deepseek_api_key: DeepSeek API key
            deepseek_model: DeepSeek model to use
            openai_api_key: OpenAI API key
            openai_model: OpenAI model to use
            gpt35_model: GPT-3.5 model to use
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
        self.deepseek_api_key = deepseek_api_key or os.getenv("DEEPSEEK_API_KEY")
        self.openai_api_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        # Model Configuration
        self.deepseek_model = deepseek_model or os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
        self.openai_model = openai_model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.gpt35_model = gpt35_model or os.getenv("GPT35_MODEL", "gpt-3.5-turbo")

        # Default Parameters
        self.default_response_type = default_response_type or os.getenv("DEFAULT_RESPONSE_TYPE", "general")
        self.default_temperature = default_temperature or float(os.getenv("DEFAULT_TEMPERATURE", "0.7"))
        self.max_tokens = max_tokens or int(os.getenv("MAX_TOKENS", "4000"))

        # Validate configuration
        self._validate_config()

    def _validate_config(self):
        """Validate the configuration"""
        # Validate providers
        valid_providers = ["deepseek", "openai", "gpt35"]

        if self.default_llm_provider not in valid_providers:
            raise ValueError(f"Default LLM provider must be one of: {valid_providers}")

        if self.translation_llm_provider not in valid_providers:
            raise ValueError(f"Translation LLM provider must be one of: {valid_providers}")

        # Validate API keys for main provider
        if self.default_llm_provider == "deepseek" and not self.deepseek_api_key:
            raise ValueError(
                "DeepSeek API key is required when using DeepSeek as default provider. "
                "Set DEEPSEEK_API_KEY in .env file or environment variable."
            )

        if self.default_llm_provider in ["openai", "gpt35"] and not self.openai_api_key:
            raise ValueError(
                "OpenAI API key is required when using OpenAI/GPT-3.5 as default provider. "
                "Set OPENAI_API_KEY in .env file or environment variable."
            )

        # Validate API keys for translation provider (if different)
        if self.translation_llm_provider != self.default_llm_provider:
            if self.translation_llm_provider == "deepseek" and not self.deepseek_api_key:
                raise ValueError(
                    "DeepSeek API key is required when using DeepSeek for translation. "
                    "Set DEEPSEEK_API_KEY in .env file or environment variable."
                )

            if self.translation_llm_provider in ["openai", "gpt35"] and not self.openai_api_key:
                raise ValueError(
                    "OpenAI API key is required when using OpenAI/GPT-3.5 for translation. "
                    "Set OPENAI_API_KEY in .env file or environment variable."
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

    def get_current_api_key(self) -> str:
        """
        Get API key for current provider

        Returns:
            API key string
        """
        if self.default_llm_provider == "deepseek":
            return self.deepseek_api_key
        else:
            return self.openai_api_key

    def get_current_model(self) -> str:
        """
        Get model name for current provider

        Returns:
            Model name string
        """
        if self.default_llm_provider == "deepseek":
            return self.deepseek_model
        elif self.default_llm_provider == "gpt35":
            return self.gpt35_model
        else:
            return self.openai_model

    def get_translation_api_key(self) -> str:
        """
        Get API key for translation provider

        Returns:
            API key string
        """
        if self.translation_llm_provider == "deepseek":
            return self.deepseek_api_key
        else:  # openai or gpt35
            return self.openai_api_key

    def get_translation_model(self) -> str:
        """
        Get model name for translation provider

        Returns:
            Model name string
        """
        if self.translation_llm_provider == "deepseek":
            return self.deepseek_model
        elif self.translation_llm_provider == "gpt35":
            return self.gpt35_model
        else:
            return self.openai_model

    def to_dict(self) -> dict:
        """
        Convert configuration to dictionary

        Returns:
            Configuration as dictionary
        """
        return {
            "default_llm_provider": self.default_llm_provider,
            "translation_llm_provider": self.translation_llm_provider,
            "deepseek_model": self.deepseek_model,
            "openai_model": self.openai_model,
            "gpt35_model": self.gpt35_model,
            "default_response_type": self.default_response_type,
            "default_temperature": self.default_temperature,
            "max_tokens": self.max_tokens
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
            default_response_type=os.getenv("DEFAULT_RESPONSE_TYPE", "general"),
            default_temperature=float(os.getenv("DEFAULT_TEMPERATURE", "0.7")),
            max_tokens=int(os.getenv("MAX_TOKENS", "4000"))
        )