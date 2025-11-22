"""
Google Translate API implementation
"""

from typing import Optional
from .base_translator import BaseTranslator
import os


class GoogleTranslator(BaseTranslator):
    """Google Translate API translator"""

    def __init__(self):
        """Initialize Google Translator"""
        self.api_key = os.getenv('GOOGLE_TRANSLATE_API_KEY')
        self.service = None

        if self.api_key:
            try:
                from googletrans import Translator
                self.service = Translator()
            except ImportError:
                print("Warning: googletrans package not installed. Install with: pip install googletrans==4.0.0rc1")
                self.service = None

    def translate(self, text: str, source_language: str, target_language: str) -> str:
        """
        Translate text using Google Translate

        Args:
            text: Text to translate
            source_language: Source language code
            target_language: Target language code

        Returns:
            Translated text

        Raises:
            Exception: If translation fails or service not available
        """
        if not self.is_available():
            raise Exception("Google Translate service is not available")

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
            result = self.service.translate(text, src=source_code, dest=target_code)
            return result.text
        except Exception as e:
            raise Exception(f"Google Translate failed: {str(e)}")

    def is_available(self) -> bool:
        """Check if Google Translate is available"""
        return self.service is not None

    def get_supported_languages(self) -> list:
        """Get supported languages"""
        return ['english', 'chinese', 'japanese', 'korean']