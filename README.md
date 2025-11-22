# Translation-Based LLM Framework

A Python framework that standardizes LLM reasoning quality across languages by forcing core interactions to happen in English, regardless of the user's input language.

## Architecture

The framework implements a simple but effective workflow:

1. **User Input**: Accept input in any language
2. **Pre-Translation**: Convert to English (if needed)
3. **Core Inference**: Process in English for consistent quality
4. **Post-Translation**: Convert response back to user's language (if needed)

## Key Components

- **BaseLLM**: Abstract interface for LLM implementations
- **DeepSeekLLM**: DeepSeek API implementation (default)
- **OpenAILLM**: OpenAI API implementation
- **TranslatorAgent**: Handles language detection and translation
- **QuestionerAgent**: Processes queries in English
- **TranslationOrchestrator**: Manages the complete workflow
- **LLMFactory**: Creates appropriate LLM instances based on configuration

## Quick Start

### 1. Installation

```bash
# Clone or download the framework
cd translation_llm_framework

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Copy the environment template and add your API keys:

```bash
cp .env.template .env
```

Edit the `.env` file and add your API keys:

```bash
# DeepSeek API Key (Default provider)
DEEPSEEK_API_KEY=your_deepseek_api_key_here

# OpenAI API Key (Alternative provider)
OPENAI_API_KEY=your_openai_api_key_here
```

**Note**: DeepSeek is set as the default provider. You can change this in the `.env` file by setting `DEFAULT_LLM_PROVIDER=openai` if you prefer to use OpenAI.

### 3. Run the Demo

```bash
python main.py
```

The demo provides several test modes:
- Basic workflow testing with multiple languages
- Question answering functionality
- Different response types (general, creative, analytical, etc.)
- Interactive mode for manual testing

## Usage Example

```python
from src.orchestrator.translation_orchestrator import TranslationOrchestrator
from src.utils.config import Config
from src.utils.llm_factory import LLMFactory

# Initialize
config = Config.from_env()
llm_client = LLMFactory.create_llm(config)  # Uses DeepSeek by default
orchestrator = TranslationOrchestrator(llm_client)

# Process a query in any language
results = orchestrator.process_query(
    user_input="你好，今天过得怎么样？",  # Chinese input
    response_type="general"
)

print(results["final_response"])  # Response in Chinese
```

### Switching LLM Providers

```python
# Option 1: Change default provider in .env file
DEFAULT_LLM_PROVIDER=openai

# Option 2: Create specific LLM instance
from src.utils.llm_factory import LLMFactory

openai_llm = LLMFactory.create_specific_llm("openai", "your-openai-key")
deepseek_llm = LLMFactory.create_specific_llm("deepseek", "your-deepseek-key")
```

## Workflow Details

### For Non-English Input:
```
Chinese Input → English Translation → English Processing → Chinese Response
```

### For English Input:
```
English Input → English Processing → English Response
```

### Workflow Results

The orchestrator returns detailed workflow information:

```python
{
    "original_input": "你好，今天过得怎么样？",
    "detected_language": "Chinese",
    "english_translation": "Hello, how are you today?",
    "english_response": "I'm doing well, thank you for asking!",
    "final_response": "我很好，谢谢你的询问！",
    "is_direct_english": False
}
```

## Response Types

The framework supports different response types:

- **general**: General purpose responses
- **creative**: Creative and imaginative content
- **analytical**: Structured analytical responses
- **educational**: Clear explanations with examples
- **technical**: Precise technical information

## Configuration

You can customize the framework behavior:

```python
from src.utils.config import Config

config = Config(
    default_llm_provider="deepseek",  # or "openai"
    deepseek_model="deepseek-chat",
    openai_model="gpt-4o-mini",
    default_response_type="general",
    default_temperature=0.7,
    max_tokens=4000
)
```

Or via `.env` file:

```bash
DEFAULT_LLM_PROVIDER=deepseek
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
DEFAULT_RESPONSE_TYPE=general
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
```

## Project Structure

```
translation_llm_framework/
├── src/
│   ├── llms/                 # LLM implementations
│   │   ├── base.py          # Base LLM interface
│   │   ├── deepseek_llm.py  # DeepSeek implementation (default)
│   │   └── openai_llm.py    # OpenAI implementation
│   ├── agents/              # Specialized agents
│   │   ├── translator_agent.py     # Translation logic
│   │   └── questioner_agent.py     # Question processing
│   ├── orchestrator/        # Workflow management
│   │   └── translation_orchestrator.py
│   └── utils/               # Utilities
│       ├── config.py        # Configuration management
│       └── llm_factory.py   # LLM factory for provider selection
├── .env.template           # Environment variables template
├── .env                    # Your API keys (add your keys here)
├── .gitignore             # Git ignore file
├── main.py                # Demo and testing script
├── requirements.txt       # Dependencies
└── README.md             # This file
```

## Future Enhancements

- Web-based frontend with split-screen visualization
- Support for additional LLM providers
- Caching for improved performance
- Batch processing capabilities
- Custom translation models

## License

This project is open source. Feel free to use and modify as needed.