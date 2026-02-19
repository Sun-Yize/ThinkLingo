"""
Translation Orchestrator
Manages the complete workflow with user-specified language pairs
"""

from typing import Optional, Dict, Any
import logging
from ..llms.base import BaseLLM
from ..agents.translator_agent import TranslatorAgent
from ..agents.questioner_agent import QuestionerAgent
from ..utils.language_config import LanguageConfig


logger = logging.getLogger(__name__)


class TranslationOrchestrator:
    """
    Main orchestrator that manages the translation-based LLM workflow
    """

    def __init__(self, llm_client: BaseLLM, translation_llm_client: Optional[BaseLLM] = None, config=None):
        """
        Initialize Translation Orchestrator

        Args:
            llm_client: LLM client to use for question processing
            translation_llm_client: Optional separate LLM client for translations (uses main client if not provided)
            config: Configuration object containing API keys
        """
        self.llm_client = llm_client
        self.translation_llm_client = translation_llm_client or llm_client
        self.translator = TranslatorAgent(self.translation_llm_client, config)
        self.questioner = QuestionerAgent(llm_client)
        self.language_config = LanguageConfig()

    def translate_text(self, text: str, source_language: str, target_language: str, method: str = "llm") -> Dict[str, Any]:
        """
        Translate text from source language to target language

        Args:
            text: Text to translate
            source_language: Source language key
            target_language: Target language key
            method: Translation method ('llm' or 'google')

        Returns:
            Dictionary containing translation results
        """
        # Validate languages
        if not self.language_config.validate_language(source_language):
            raise ValueError(f"Unsupported source language: {source_language}")

        if not self.language_config.validate_language(target_language):
            raise ValueError(f"Unsupported target language: {target_language}")

        try:
            translated_text = self.translator.translate(text, source_language, target_language, method)
            return {
                "original_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "translated_text": translated_text,
                "success": True
            }
        except Exception as e:
            return {
                "original_text": text,
                "source_language": source_language,
                "target_language": target_language,
                "translated_text": text,  # Fallback to original
                "success": False,
                "error": str(e)
            }

    def answer_question_in_language(
        self,
        question: str,
        question_language: str,
        context: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Answer a question directly in the specified language without translation workflow

        Args:
            question: The question to answer
            question_language: Language to process the question in
            context: Optional context for answering
            **kwargs: Additional parameters for question answering

        Returns:
            Dictionary containing the question answering results
        """
        # Validate language
        if not self.language_config.validate_language(question_language):
            raise ValueError(f"Unsupported question language: {question_language}")

        try:
            if question_language == "english":
                # Direct English processing
                answer = self.questioner.answer_question(question, context=context, **kwargs)
            else:
                # Translate question to target language, then process in that language
                # This allows for non-English question processing
                answer = self.questioner.generate_response(
                    question,
                    response_type="general",
                    language_context=question_language,
                    **kwargs
                )

            return {
                "original_question": question,
                "question_language": question_language,
                "answer": answer,
                "success": True
            }
        except Exception as e:
            return {
                "original_question": question,
                "question_language": question_language,
                "answer": self._get_error_message(question_language),
                "success": False,
                "error": str(e)
            }

    def process_query(
        self,
        user_input: str,
        source_language: str,
        target_language: str,
        processing_language: str = "english",
        response_type: str = "general",
        translation_method: str = "google",
        context: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Process user query through the complete translation workflow

        Args:
            user_input: User's input in their source language
            source_language: Source language key (e.g., 'chinese', 'japanese')
            target_language: Target language key for the final response
            processing_language: Language to process the query in (default: 'english')
            response_type: Type of response needed ("general", "creative", etc.)
            translation_method: Translation method ('llm' or 'google')
            context: Optional context for the question
            **kwargs: Additional parameters

        Returns:
            Dictionary containing the complete workflow results
        """
        # Validate languages
        if not self.language_config.validate_language(source_language):
            raise ValueError(f"Unsupported source language: {source_language}")

        if not self.language_config.validate_language(target_language):
            raise ValueError(f"Unsupported target language: {target_language}")

        if not self.language_config.validate_language(processing_language):
            raise ValueError(f"Unsupported processing language: {processing_language}")

        workflow_results = {
            "original_input": user_input,
            "source_language": source_language,
            "target_language": target_language,
            "processing_language": processing_language,
            "processed_input": None,
            "processed_response": None,
            "final_response": None,
            "translation_steps": []
        }

        try:
            # Step 1: Translate input to processing language if needed
            if source_language == processing_language:
                processed_input = user_input
                workflow_results["processed_input"] = processed_input
            else:
                translation_result = self.translate_text(user_input, source_language, processing_language, translation_method)
                if translation_result["success"]:
                    processed_input = translation_result["translated_text"]
                    workflow_results["processed_input"] = processed_input
                    workflow_results["translation_steps"].append({
                        "step": "input_translation",
                        "from": source_language,
                        "to": processing_language,
                        "original": user_input,
                        "translated": processed_input
                    })
                else:
                    raise Exception(f"Failed to translate input: {translation_result.get('error', 'Unknown error')}")

            # Step 2: Process in the specified processing language
            if processing_language == "english":
                processed_response = self.questioner.generate_response(
                    processed_input,
                    response_type=response_type,
                    **kwargs
                )
            else:
                processed_response = self.questioner.generate_response(
                    processed_input,
                    response_type=response_type,
                    language_context=processing_language,
                    **kwargs
                )
            workflow_results["processed_response"] = processed_response

            # Step 3: Translate response to target language if needed
            if processing_language == target_language:
                final_response = processed_response
                workflow_results["final_response"] = final_response
            else:
                translation_result = self.translate_text(processed_response, processing_language, target_language, translation_method)
                if translation_result["success"]:
                    final_response = translation_result["translated_text"]
                    workflow_results["final_response"] = final_response
                    workflow_results["translation_steps"].append({
                        "step": "response_translation",
                        "from": processing_language,
                        "to": target_language,
                        "original": processed_response,
                        "translated": final_response
                    })
                else:
                    raise Exception(f"Failed to translate response: {translation_result.get('error', 'Unknown error')}")

            return workflow_results

        except Exception as e:
            logger.error(f"Error in translation workflow: {str(e)}")
            # Return error workflow
            workflow_results["error"] = str(e)
            workflow_results["final_response"] = self._get_error_message(target_language)
            return workflow_results

    def answer_question(
        self,
        user_question: str,
        source_language: str,
        target_language: str,
        processing_language: str = "english",
        context: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Answer a question through the translation workflow

        Args:
            user_question: User's question in their source language
            source_language: Source language key
            target_language: Target language key for the response
            processing_language: Language to process the question in (default: 'english')
            context: Optional context for answering
            **kwargs: Additional parameters

        Returns:
            Dictionary containing the workflow results
        """
        # Use the general process_query method for question answering
        return self.process_query(
            user_input=user_question,
            source_language=source_language,
            target_language=target_language,
            processing_language=processing_language,
            response_type="general",
            context=context,
            **kwargs
        )


    def _get_error_message(self, target_language: str) -> str:
        """
        Get error message in appropriate language

        Args:
            target_language: Target language key for error message

        Returns:
            Error message string
        """
        english_error = "I apologize, but I encountered an error while processing your request. Please try again."

        if target_language == "english":
            return english_error
        else:
            try:
                translation_result = self.translate_text(english_error, "english", target_language)
                if translation_result["success"]:
                    return translation_result["translated_text"]
                else:
                    return english_error
            except:
                return english_error

    def get_supported_languages(self) -> list:
        """
        Get supported languages information

        Returns:
            List of dictionaries with language information
        """
        return self.translator.get_all_languages_info()

    def get_supported_response_types(self) -> Dict[str, str]:
        """
        Get supported response types and their descriptions

        Returns:
            Dictionary of response types and descriptions
        """
        return {
            "general": "General purpose responses for everyday queries",
            "creative": "Creative and imaginative responses",
            "analytical": "Detailed analytical responses with structured reasoning",
            "educational": "Educational responses with clear explanations",
            "technical": "Technical responses with precise terminology"
        }

    def get_workflow_info(self) -> Dict[str, Any]:
        """
        Get information about the workflow

        Returns:
            Workflow information dictionary
        """
        return {
            "model_info": self.llm_client.get_model_info(),
            "translation_model_info": self.translation_llm_client.get_model_info(),
            "supported_languages": self.get_supported_languages(),
            "supported_response_types": self.get_supported_response_types(),
            "workflow_steps": [
                "1. Translate to processing language (if source ≠ processing language)",
                "2. Process question/query in specified processing language",
                "3. Translate response to target language (if processing ≠ target language)"
            ]
        }