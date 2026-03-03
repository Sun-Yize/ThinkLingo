"""
LLM Factory — creates provider instances from config or explicit parameters.

Supported providers: deepseek | openai | gpt35 | claude | gemini | qwen
"""

from ..llms.base import BaseLLM
from ..llms.deepseek_llm import DeepSeekLLM
from ..llms.openai_llm import OpenAILLM
from ..llms.gpt35_llm import GPT35LLM
from ..llms.claude_llm import ClaudeLLM
from ..llms.gemini_llm import GeminiLLM
from ..llms.qwen_llm import QwenLLM
from .config import Config


class LLMFactory:
    """Factory for creating LLM instances."""

    # Maps provider name → (LLM class, api_key_attr, model_attr)
    _REGISTRY = {
        "deepseek": (DeepSeekLLM, "deepseek_api_key",  "deepseek_model"),
        "openai":   (OpenAILLM,   "openai_api_key",    "openai_model"),
        "gpt35":    (GPT35LLM,    "openai_api_key",    "gpt35_model"),
        "claude":   (ClaudeLLM,   "anthropic_api_key", "claude_model"),
        "gemini":   (GeminiLLM,   "google_api_key",    "gemini_model"),
        "qwen":     (QwenLLM,     "qwen_api_key",      "qwen_model"),
    }

    @classmethod
    def create_llm(cls, config: Config) -> BaseLLM:
        """Create the main LLM from configuration."""
        return cls._create_from_config(config, config.default_llm_provider)

    @classmethod
    def create_translation_llm(cls, config: Config) -> BaseLLM:
        """Create the translation LLM from configuration."""
        return cls._create_from_config(config, config.translation_llm_provider)

    @classmethod
    def _create_from_config(cls, config: Config, provider: str) -> BaseLLM:
        if provider not in cls._REGISTRY:
            raise ValueError(
                f"Unsupported LLM provider: {provider!r}. "
                f"Choose from: {list(cls._REGISTRY)}"
            )
        llm_cls, key_attr, model_attr = cls._REGISTRY[provider]
        return llm_cls(
            api_key=getattr(config, key_attr),
            model_name=getattr(config, model_attr),
        )

    @classmethod
    def create_specific_llm(
        cls,
        provider: str,
        api_key: str,
        model_name: str = None,
        **kwargs,
    ) -> BaseLLM:
        """
        Create an ephemeral LLM instance for per-request API keys.

        Args:
            provider:   Provider name string
            api_key:    API key for the provider
            model_name: Optional model override
            **kwargs:   Extra params forwarded to the LLM constructor
                        (e.g. base_url for QwenLLM)
        """
        if provider not in cls._REGISTRY:
            raise ValueError(
                f"Unsupported LLM provider: {provider!r}. "
                f"Choose from: {list(cls._REGISTRY)}"
            )
        llm_cls = cls._REGISTRY[provider][0]
        return llm_cls(api_key=api_key, model_name=model_name, **kwargs)

    @classmethod
    def get_supported_providers(cls) -> list:
        return list(cls._REGISTRY.keys())
