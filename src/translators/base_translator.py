"""
Base translator interface for different translation services
"""

from abc import ABC, abstractmethod


class BaseTranslator(ABC):
    """Abstract base class for translation services"""

    @abstractmethod
    def translate(self, text: str, source_language: str, target_language: str) -> str:
        """
        Translate text from source language to target language

        Args:
            text: Text to translate
            source_language: Source language code
            target_language: Target language code

        Returns:
            Translated text

        Raises:
            Exception: If translation fails
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if the translation service is available/configured

        Returns:
            True if service is available, False otherwise
        """
        pass

    @abstractmethod
    def get_supported_languages(self) -> list:
        """
        Get list of supported language codes

        Returns:
            List of supported language codes
        """
        pass

    def validate_language(self, language_code: str) -> bool:
        """
        Validate if a language is supported

        Args:
            language_code: Language code to validate

        Returns:
            True if supported, False otherwise
        """
        return language_code in self.get_supported_languages()