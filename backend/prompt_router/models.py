from dataclasses import dataclass


@dataclass
class PromptTemplate:
    id: str
    category: str
    label: str
    description: str
    system_prompt: str
    default_temperature: float = 0.7
