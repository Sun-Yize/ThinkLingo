import json
import logging
from pathlib import Path
from typing import List, Optional

from .models import PromptTemplate

logger = logging.getLogger(__name__)

_TEMPLATES_PATH = Path(__file__).parent / "templates.json"

_FALLBACK_ID = "general_assistant"


class TemplateRegistry:
    def __init__(self, path: Path = _TEMPLATES_PATH):
        with open(path, "r", encoding="utf-8") as f:
            raw = json.load(f)
        self._templates: dict[str, PromptTemplate] = {
            t["id"]: PromptTemplate(**t) for t in raw
        }
        logger.info(f"TemplateRegistry loaded {len(self._templates)} templates")

    def get(self, id: str) -> Optional[PromptTemplate]:
        return self._templates.get(id)

    def get_fallback(self) -> PromptTemplate:
        return self._templates[_FALLBACK_ID]

    def all(self) -> List[PromptTemplate]:
        return list(self._templates.values())

    def routing_index(self) -> str:
        """Return a compact table of templates for use in the routing prompt."""
        lines = ["ID | Label | Description"]
        for t in self._templates.values():
            lines.append(f"{t.id} | {t.label} | {t.description}")
        return "\n".join(lines)
