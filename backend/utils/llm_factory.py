"""
LLM Factory for creating LLM instances based on configuration
"""

from typing import Union
from ..llms.base import BaseLLM
from ..llms.openai_llm import OpenAILLM
from ..llms.deepseek_llm import DeepSeekLLM
from ..llms.gpt35_llm import GPT35LLM
from .config import Config


class LLMFactory:
    """Factory class for creating LLM instances"""

    @staticmethod
    def create_llm(config: Config) -> BaseLLM:
        """
        Create LLM instance based on configuration

        Args:
            config: Configuration object

        Returns:
            LLM instance

        Raises:
            ValueError: If unsupported provider is specified
        """
        if config.default_llm_provider == "deepseek":
            return DeepSeekLLM(
                api_key=config.deepseek_api_key,
                model_name=config.deepseek_model
            )
        elif config.default_llm_provider == "openai":
            return OpenAILLM(
                api_key=config.openai_api_key,
                model_name=config.openai_model
            )
        elif config.default_llm_provider == "gpt35":
            return GPT35LLM(
                api_key=config.openai_api_key,
                model_name=config.gpt35_model
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {config.default_llm_provider}")

    @staticmethod
    def create_translation_llm(config: Config) -> BaseLLM:
        """
        Create LLM instance for translation based on configuration

        Args:
            config: Configuration object

        Returns:
            LLM instance for translation

        Raises:
            ValueError: If unsupported provider is specified
        """
        if config.translation_llm_provider == "deepseek":
            return DeepSeekLLM(
                api_key=config.deepseek_api_key,
                model_name=config.deepseek_model
            )
        elif config.translation_llm_provider == "openai":
            return OpenAILLM(
                api_key=config.openai_api_key,
                model_name=config.openai_model
            )
        elif config.translation_llm_provider == "gpt35":
            return GPT35LLM(
                api_key=config.openai_api_key,
                model_name=config.gpt35_model
            )
        else:
            raise ValueError(f"Unsupported translation LLM provider: {config.translation_llm_provider}")

    @staticmethod
    def create_specific_llm(
        provider: str,
        api_key: str,
        model_name: str = None
    ) -> BaseLLM:
        """
        Create specific LLM instance

        Args:
            provider: LLM provider ("deepseek", "openai", or "gpt35")
            api_key: API key
            model_name: Model name (optional)

        Returns:
            LLM instance

        Raises:
            ValueError: If unsupported provider is specified
        """
        if provider == "deepseek":
            return DeepSeekLLM(api_key=api_key, model_name=model_name)
        elif provider == "openai":
            return OpenAILLM(api_key=api_key, model_name=model_name)
        elif provider == "gpt35":
            return GPT35LLM(api_key=api_key, model_name=model_name)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")

    @staticmethod
    def get_supported_providers() -> list:
        """
        Get list of supported providers

        Returns:
            List of supported provider names
        """
        return ["deepseek", "openai", "gpt35"]