"""
Translator Agent for language conversion
Handles translation between any supported language pairs
"""

import os
from typing import Optional
from ..llms.base import BaseLLM
from ..utils.language_config import LanguageConfig


class TranslatorAgent:
    """Agent responsible for translating text between supported languages"""

    def __init__(self, llm_client: BaseLLM, config=None):
        """
        Initialize Translator Agent

        Args:
            llm_client: LLM client for translation
            config: Configuration object containing API keys
        """
        self.llm_client = llm_client
        self.language_config = LanguageConfig()
        self.config = config

        # Initialize Google Translator if API key is available
        self.google_translator = None
        if config and hasattr(config, 'google_translate_api_key') and config.google_translate_api_key:
            try:
                from google.cloud import translate_v2 as translate
                # Set the API key in the environment for google-cloud-translate
                os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = config.google_translate_api_key
                self.google_translator = translate.Client()
            except ImportError:
                print("Warning: google-cloud-translate package not installed. Install with: pip install google-cloud-translate")
                self.google_translator = None
            except Exception as e:
                print(f"Warning: Failed to initialize Google Translate client: {str(e)}")
                self.google_translator = None

    def translate(self, text: str, source_language: str, target_language: str, method: str = "llm") -> str:
        """
        Translate text from source language to target language

        Args:
            text: Text to translate
            source_language: Source language key (e.g., 'english', 'chinese')
            target_language: Target language key (e.g., 'english', 'chinese')
            method: Translation method ('llm' or 'google')

        Returns:
            Translated text in target language

        Raises:
            ValueError: If source or target language is not supported
        """
        # Validate languages
        if not self.language_config.validate_language(source_language):
            raise ValueError(f"Unsupported source language: {source_language}")

        if not self.language_config.validate_language(target_language):
            raise ValueError(f"Unsupported target language: {target_language}")

        # If source and target are the same, return original text
        if source_language == target_language:
            return text

        # Use Google Translate if method is 'google' and available
        if method == "google":
            return self._translate_with_google(text, source_language, target_language)
        else:
            return self._translate_with_llm(text, source_language, target_language)

    def _translate_with_google(self, text: str, source_language: str, target_language: str) -> str:
        """
        Translate using Google Translate API

        Args:
            text: Text to translate
            source_language: Source language key
            target_language: Target language key

        Returns:
            Translated text
        """
        if not self.google_translator:
            print("Google Translate not available, falling back to LLM translation")
            return self._translate_with_llm(text, source_language, target_language)

        # Map our language keys to Google Translate language codes
        lang_mapping = {
            'english': 'en',
            'chinese': 'zh',
            'japanese': 'ja',
            'korean': 'ko'
        }

        source_code = lang_mapping.get(source_language, source_language)
        target_code = lang_mapping.get(target_language, target_language)

        try:
            result = self.google_translator.translate(text, source_language=source_code, target_language=target_code)
            return result['translatedText']
        except Exception as e:
            print(f"Google Translate failed: {str(e)}, falling back to LLM translation")
            return self._translate_with_llm(text, source_language, target_language)

    def _translate_with_llm(self, text: str, source_language: str, target_language: str) -> str:
        """
        Translate using LLM

        Args:
            text: Text to translate
            source_language: Source language key
            target_language: Target language key

        Returns:
            Translated text
        """
        # Get display names for better prompt clarity
        source_display = self.language_config.get_language_display_name(source_language)
        target_display = self.language_config.get_language_display_name(target_language)

        # Create translation prompt
        system_prompt = f"""You are a professional translator. Translate the following {source_display} text to {target_display}.
Keep the meaning and tone as accurate as possible. Only return the translated text, no explanations or additional commentary."""

        user_prompt = f"Translate this {source_display} text to {target_display}: {text}"

        try:
            translated_text = self.llm_client.invoke(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.1  # Low temperature for consistent translations
            )
            return translated_text.strip()
        except Exception as e:
            print(f"LLM translation from {source_display} to {target_display} failed: {str(e)}")
            return text  # Return original text as fallback

    def get_supported_languages(self) -> list:
        """
        Get list of supported languages

        Returns:
            List of supported language keys
        """
        return self.language_config.get_supported_languages()

    def get_language_info(self, language_key: str) -> dict:
        """
        Get detailed information about a language

        Args:
            language_key: Language identifier

        Returns:
            Dictionary with language information

        Raises:
            ValueError: If language is not supported
        """
        if not self.language_config.validate_language(language_key):
            raise ValueError(f"Unsupported language: {language_key}")

        return {
            "key": language_key,
            "display_name": self.language_config.get_language_display_name(language_key),
            "native_name": self.language_config.get_native_name(language_key),
            "code": self.language_config.get_language_code(language_key)
        }

    def get_all_languages_info(self) -> list:
        """
        Get information about all supported languages

        Returns:
            List of dictionaries with language information
        """
        return self.language_config.get_language_pairs_for_display()