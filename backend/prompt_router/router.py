import logging
import re
from typing import Generator, Optional

from ..llms.base import BaseLLM
from .registry import TemplateRegistry

logger = logging.getLogger(__name__)

_ROUTE_SYSTEM_PROMPT = """\
You are an expert system prompt engineer. Given a user's message and a catalog of
expert templates, you must:

1. Identify which template best matches the user's intent.
2. Write a concise, tailored system prompt (2-4 sentences) in {lang}
   that captures the selected template's expertise and is specifically tuned to
   the user's request.

Output format (follow EXACTLY):
[Template Label]
<your system prompt in {lang}>

Rules:
- The first line MUST be the template label in square brackets, e.g. [Code Debugger]
- The system prompt must be written entirely in {lang}.
- Keep the system prompt concise (2-4 sentences).
- If no template fits well, use [General Assistant].
- Do NOT include any other text or explanation.
"""


class PromptRouter:
    def __init__(self, llm_client: BaseLLM, registry: Optional[TemplateRegistry] = None):
        self.llm_client = llm_client
        self.registry = registry or TemplateRegistry()

    def route_stream(self, user_message: str, processing_language: str) -> Generator[str, None, None]:
        """
        Single-step: classify the user message and stream a tailored system prompt.
        The output starts with [Template Label] on the first line, followed by the prompt.
        Falls back to the general_assistant template prompt on error.
        """
        system_prompt = _ROUTE_SYSTEM_PROMPT.format(lang=processing_language)
        user_prompt = (
            f"Available templates:\n{self.registry.routing_index()}\n\n"
            f"User message:\n{user_message}"
        )

        fallback = self.registry.get_fallback()
        try:
            yield from self.llm_client.invoke_stream(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                temperature=0.3,
                max_tokens=400,
            )
        except Exception as exc:
            logger.warning(f"PromptRouter.route_stream() failed ({exc!r}), using fallback")
            yield f"[{fallback.label}]\n{fallback.system_prompt}"
