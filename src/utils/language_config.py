"""
Language configuration for supported languages in the translation framework
"""

from typing import Dict, List
from enum import Enum


class SupportedLanguage(Enum):
    """Enumeration of supported languages"""
    ENGLISH = "english"
    CHINESE = "chinese"
    JAPANESE = "japanese"
    KOREAN = "korean"


class LanguageConfig:
    """Configuration for supported languages and their properties"""

    # Language mapping with display names and codes
    LANGUAGE_MAP: Dict[str, Dict[str, str]] = {
        SupportedLanguage.ENGLISH.value: {
            "display_name": "English",
            "code": "en",
            "native_name": "English"
        },
        SupportedLanguage.CHINESE.value: {
            "display_name": "Chinese",
            "code": "zh",
            "native_name": "Chinese"
        },
        SupportedLanguage.JAPANESE.value: {
            "display_name": "Japanese",
            "code": "ja",
            "native_name": "Japanese"
        },
        SupportedLanguage.KOREAN.value: {
            "display_name": "Korean",
            "code": "ko",
            "native_name": "Korean"
        }
    }

    @classmethod
    def get_supported_languages(cls) -> List[str]:
        """
        Get list of supported language keys

        Returns:
            List of supported language identifiers
        """
        return list(cls.LANGUAGE_MAP.keys())

    @classmethod
    def get_language_display_name(cls, language_key: str) -> str:
        """
        Get display name for a language

        Args:
            language_key: Language identifier

        Returns:
            Display name of the language

        Raises:
            ValueError: If language is not supported
        """
        if language_key not in cls.LANGUAGE_MAP:
            raise ValueError(f"Unsupported language: {language_key}. Supported languages: {cls.get_supported_languages()}")

        return cls.LANGUAGE_MAP[language_key]["display_name"]

    @classmethod
    def get_language_code(cls, language_key: str) -> str:
        """
        Get language code for a language

        Args:
            language_key: Language identifier

        Returns:
            Language code

        Raises:
            ValueError: If language is not supported
        """
        if language_key not in cls.LANGUAGE_MAP:
            raise ValueError(f"Unsupported language: {language_key}. Supported languages: {cls.get_supported_languages()}")

        return cls.LANGUAGE_MAP[language_key]["code"]

    @classmethod
    def get_native_name(cls, language_key: str) -> str:
        """
        Get native name for a language

        Args:
            language_key: Language identifier

        Returns:
            Native name of the language

        Raises:
            ValueError: If language is not supported
        """
        if language_key not in cls.LANGUAGE_MAP:
            raise ValueError(f"Unsupported language: {language_key}. Supported languages: {cls.get_supported_languages()}")

        return cls.LANGUAGE_MAP[language_key]["native_name"]

    @classmethod
    def validate_language(cls, language_key: str) -> bool:
        """
        Validate if a language is supported

        Args:
            language_key: Language identifier to validate

        Returns:
            True if language is supported, False otherwise
        """
        return language_key in cls.LANGUAGE_MAP

    @classmethod
    def get_language_pairs_for_display(cls) -> List[Dict[str, str]]:
        """
        Get language information formatted for display

        Returns:
            List of dictionaries with language information
        """
        return [
            {
                "key": key,
                "display_name": info["display_name"],
                "native_name": info["native_name"],
                "code": info["code"]
            }
            for key, info in cls.LANGUAGE_MAP.items()
        ]