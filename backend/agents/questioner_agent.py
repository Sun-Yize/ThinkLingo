"""
Questioner Agent for core English inference
Handles the main reasoning and response generation in English
"""

from typing import Optional, Dict, Any, Generator
import logging
from ..llms.base import BaseLLM


logger = logging.getLogger(__name__)


class QuestionerAgent:
    """Agent responsible for processing questions and generating responses in English"""

    def __init__(self, llm_client: BaseLLM):
        """
        Initialize Questioner Agent

        Args:
            llm_client: LLM client for question processing
        """
        self.llm_client = llm_client

    def answer_question(self, question: str, context: Optional[str] = None, **kwargs) -> str:
        """
        Process a question and generate an answer in English

        Args:
            question: The question to answer (should be in English)
            context: Optional context to help answer the question
            **kwargs: Additional parameters for the LLM call

        Returns:
            Generated answer in English
        """
        # Build system prompt
        system_prompt = self._build_system_prompt(context)

        # Process the question
        try:
            response = self.llm_client.invoke(
                system_prompt=system_prompt,
                user_prompt=question,
                temperature=kwargs.get("temperature", 0.7),
                max_tokens=kwargs.get("max_tokens", 4000)
            )
            return response.strip()
        except Exception as e:
            logger.error(f"Question processing failed: {str(e)}")
            return "I apologize, but I encountered an error while processing your question."

    def _build_system_prompt(self, context: Optional[str] = None) -> str:
        """
        Build system prompt for the questioner

        Args:
            context: Optional context information

        Returns:
            System prompt string
        """
        base_prompt = """You are a helpful and knowledgeable AI assistant. Your task is to provide accurate,
helpful, and well-reasoned responses to user questions. Always aim to be:

1. Accurate and factual in your responses
2. Clear and easy to understand
3. Comprehensive while staying focused on the question
4. Helpful and constructive

If you're unsure about something, acknowledge the uncertainty rather than guessing."""

        if context:
            base_prompt += f"\n\nAdditional context to consider when answering:\n{context}"

        return base_prompt

    def generate_response(
        self,
        prompt: str,
        response_type: str = "general",
        **kwargs
    ) -> str:
        """
        Generate a response for a specific type of prompt

        Args:
            prompt: The input prompt
            response_type: Type of response needed ("general", "creative", "analytical", etc.)
            **kwargs: Additional parameters

        Returns:
            Generated response
        """
        system_prompt = self._get_system_prompt_for_type(response_type)

        try:
            response = self.llm_client.invoke(
                system_prompt=system_prompt,
                user_prompt=prompt,
                temperature=kwargs.get("temperature", self._get_default_temperature(response_type)),
                max_tokens=kwargs.get("max_tokens", 4000)
            )
            return response.strip()
        except Exception as e:
            logger.error(f"Response generation failed: {str(e)}")
            return "I apologize, but I encountered an error while generating a response."

    def stream_generate_response(
        self,
        prompt: str,
        response_type: str = "general",
        conversation_history: Optional[list] = None,
        system_prompt_override: Optional[str] = None,
        **kwargs
    ) -> Generator[str, None, None]:
        """
        Stream response token by token for a given prompt and response type.

        Args:
            conversation_history: List of prior turns as {"role": "user"|"assistant", "content": str}.
                                  Contents should be in the processing language (English).
            system_prompt_override: When provided, bypasses _get_system_prompt_for_type() and uses
                                    this system prompt directly (e.g. from the prompt router).

        Returns:
            Generator yielding text chunks as they arrive from the LLM.
        """
        system_prompt = system_prompt_override if system_prompt_override is not None \
            else self._get_system_prompt_for_type(response_type)

        # Build full messages array: system + history + current user message
        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": prompt})

        return self.llm_client.invoke_stream(
            system_prompt=system_prompt,
            user_prompt=prompt,
            messages=messages,
            temperature=kwargs.get("temperature", self._get_default_temperature(response_type)),
            max_tokens=kwargs.get("max_tokens", 4000)
        )

    def _get_system_prompt_for_type(self, response_type: str) -> str:
        """Get system prompt based on response type"""
        prompts = {
            "general": """You are a helpful AI assistant. Provide clear, accurate, and helpful responses.""",

            "creative": """You are a creative AI assistant. Generate imaginative, original, and engaging content
while maintaining accuracy when dealing with factual information.""",

            "analytical": """You are an analytical AI assistant. Provide detailed, logical, and well-structured
analysis. Break down complex topics systematically and support your reasoning with evidence.""",

            "educational": """You are an educational AI assistant. Explain concepts clearly with examples,
break down complex topics into understandable parts, and encourage learning.""",

            "technical": """You are a technical AI assistant. Provide precise, detailed technical information
with accurate terminology. Include practical examples and implementation details where relevant."""
        }

        return prompts.get(response_type, prompts["general"])

    def _get_default_temperature(self, response_type: str) -> float:
        """Get default temperature based on response type"""
        temperatures = {
            "general": 0.7,
            "creative": 0.9,
            "analytical": 0.3,
            "educational": 0.5,
            "technical": 0.2
        }

        return temperatures.get(response_type, 0.7)