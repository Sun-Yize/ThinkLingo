"""
Base LLM abstract class
Defines the interface standard that all LLM implementations must follow
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any


class BaseLLM(ABC):
    """Base LLM abstract class"""

    def __init__(self, api_key: str, model_name: Optional[str] = None):
        """
        Initialize LLM client

        Args:
            api_key: API key
            model_name: Model name, uses default if not specified
        """
        self.api_key = api_key
        self.model_name = model_name

    @abstractmethod
    def invoke(self, system_prompt: str, user_prompt: str, **kwargs) -> str:
        """
        Call LLM to generate response

        Args:
            system_prompt: System prompt
            user_prompt: User input
            **kwargs: Additional parameters like temperature, max_tokens, etc.

        Returns:
            LLM generated response text
        """
        pass

    @abstractmethod
    def get_default_model(self) -> str:
        """
        Get default model name

        Returns:
            Default model name
        """
        pass

    def validate_response(self, response: str) -> str:
        """
        Validate and clean response content

        Args:
            response: Raw LLM response

        Returns:
            Cleaned response content
        """
        if response is None:
            return ""
        return response.strip()