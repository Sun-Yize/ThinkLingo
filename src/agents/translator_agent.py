"""
Translator Agent for language conversion
Handles translation between any supported language pairs
"""

import asyncio
import logging
import re
from typing import Optional, Generator
from ..llms.base import BaseLLM
from ..utils.language_config import LanguageConfig

# Matches fenced code blocks (```...```) and inline code (`...`)
_CODE_PATTERN = re.compile(r'(```[\s\S]*?```|`[^`\n]+`)')

logger = logging.getLogger(__name__)


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

        self.google_available = False
        try:
            import googletrans  # noqa: F401 — just verify it's installed
            self.google_available = True
        except ImportError:
            logger.warning("Warning: googletrans not installed. Install with: pip install googletrans")
        except Exception as e:
            logger.warning(f"Warning: Failed to import googletrans: {e}")

    # ── Code-block protection helpers ────────────────────────────────

    @staticmethod
    def _extract_code_blocks(text: str):
        """
        Replace every code block / inline-code span with a unique placeholder.

        Returns:
            (protected_text, blocks)  where blocks maps placeholder → original.
        """
        blocks: dict[str, str] = {}
        idx = [0]

        def replacer(m: re.Match) -> str:
            key = f'[[{idx[0]}]]'
            blocks[key] = m.group(0)
            idx[0] += 1
            return key

        return _CODE_PATTERN.sub(replacer, text), blocks

    @staticmethod
    def _restore_code_blocks(text: str, blocks: dict) -> str:
        """Substitute placeholders back with their original code content."""
        for key, value in blocks.items():
            text = text.replace(key, value)
        return text

    # ─────────────────────────────────────────────────────────────────

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
        Translate using Google Translate API.

        Creates a fresh Translator and a dedicated event loop per call so that
        the underlying httpx.AsyncClient is always used in the loop it was
        created in — avoiding cross-loop issues when called from a thread pool.
        """
        if not self.google_available:
            logger.warning("Google Translate not available, falling back to LLM translation")
            return self._translate_with_llm(text, source_language, target_language)

        protected_text, blocks = self._extract_code_blocks(text)

        lang_mapping = {
            'english': 'en',
            'chinese': 'zh-cn',
            'japanese': 'ja',
            'korean': 'ko',
        }
        source_code = lang_mapping.get(source_language, source_language)
        target_code = lang_mapping.get(target_language, target_language)

        try:
            from googletrans import Translator

            async def _do() -> str:
                async with Translator() as t:
                    result = await t.translate(protected_text, src=source_code, dest=target_code)
                    return result.text

            loop = asyncio.new_event_loop()
            try:
                translated = loop.run_until_complete(_do())
            finally:
                loop.close()
            return self._restore_code_blocks(translated, blocks)
        except Exception as e:
            logger.warning(f"Google Translate failed: {e}, falling back to LLM translation")
            return self._translate_with_llm(text, source_language, target_language)

    @staticmethod
    def _build_llm_translation_prompt(source_display: str, target_display: str) -> str:
        return (
            f"You are a professional translator. Translate the following {source_display} text to {target_display}. "
            "Rules:\n"
            "1. Only return the translated text — no explanations or extra commentary.\n"
            "2. Keep the meaning and tone as accurate as possible.\n"
            "3. Preserve ALL code blocks exactly as-is. "
            "This includes fenced code blocks (content wrapped in triple backticks ``` ... ```) "
            "and inline code (content wrapped in single backticks ` ... `). "
            "Do NOT translate any content inside code blocks.\n"
            "4. Preserve all markdown formatting (headings, bold, italic, lists, etc.)."
        )

    def _translate_with_llm(self, text: str, source_language: str, target_language: str) -> str:
        source_display = self.language_config.get_language_display_name(source_language)
        target_display = self.language_config.get_language_display_name(target_language)

        system_prompt = self._build_llm_translation_prompt(source_display, target_display)
        user_prompt = f"Translate this {source_display} text to {target_display}:\n\n{text}"

        try:
            translated_text = self.llm_client.invoke(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.1
            )
            return translated_text.strip()
        except Exception as e:
            logger.error(f"LLM translation from {source_display} to {target_display} failed: {str(e)}")
            return text

    def stream_translate(self, text: str, source_language: str, target_language: str) -> Generator[str, None, None]:
        """
        LLM-based streaming translation. Only called when method='llm'.

        Yields:
            Translation tokens as they are generated.
        """
        source_display = self.language_config.get_language_display_name(source_language)
        target_display = self.language_config.get_language_display_name(target_language)

        system_prompt = self._build_llm_translation_prompt(source_display, target_display)
        user_prompt = f"Translate this {source_display} text to {target_display}:\n\n{text}"

        try:
            yield from self.llm_client.invoke_stream(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.1,
            )
        except Exception as e:
            logger.error(f"LLM streaming translation from {source_display} to {target_display} failed: {str(e)}")
            yield text

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