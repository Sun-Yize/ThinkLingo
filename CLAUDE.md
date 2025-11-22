# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Translation-Based LLM Framework** that standardizes LLM reasoning quality across languages by forcing core interactions to happen in English, regardless of the user's input language. The framework supports English, Chinese, Japanese, and Korean with any-to-any language translation capabilities.

## Development Commands

### Installation and Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Configure API keys
cp .env.template .env
# Edit .env file to add your API keys
```

### Running the Application
```bash
# Run the main demo with interactive test modes
python main.py

# Available test modes:
# 1. Basic workflow testing with multiple languages
# 2. Question answering functionality
# 3. Different response types (general, creative, analytical, etc.)
# 4. Interactive mode for manual testing
```

### Testing Individual Components
```bash
# Test specific components by importing them in Python:
python -c "from src.orchestrator.translation_orchestrator import TranslationOrchestrator; print('Orchestrator import successful')"
```

## Architecture

The framework implements a **4-step translation workflow**:

1. **User Input**: Accept input in any supported language
2. **Pre-Translation**: Convert to English (if source language ≠ English)
3. **Core Inference**: Process in English for consistent quality
4. **Post-Translation**: Convert response to target language (if target language ≠ English)

### Key Components

- **`src/orchestrator/translation_orchestrator.py`**: Main workflow manager that coordinates the entire translation process
- **`src/agents/translator_agent.py`**: Handles language detection and translation logic
- **`src/agents/questioner_agent.py`**: Processes queries specifically in English for optimal quality
- **`src/llms/base.py`**: Abstract base class defining the LLM interface
- **`src/llms/deepseek_llm.py`**: DeepSeek API implementation (default provider for main processing)
- **`src/llms/openai_llm.py`**: OpenAI API implementation
- **`src/llms/gpt35_llm.py`**: GPT-3.5 implementation (faster/cheaper model for translations)
- **`src/utils/llm_factory.py`**: Factory pattern for creating appropriate LLM instances
- **`src/utils/config.py`**: Configuration management from environment variables
- **`src/utils/language_config.py`**: Language configuration and mapping

### Dual-LLM Architecture

The framework uses **two separate LLM instances**:
- **Main LLM** (DeepSeek by default): Handles core reasoning and question answering
- **Translation LLM** (GPT-3.5 by default): Handles fast, cost-effective translations

## Configuration

### Environment Variables (.env file)
```bash
# API Keys
DEEPSEEK_API_KEY=your_deepseek_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Provider Configuration
DEFAULT_LLM_PROVIDER=deepseek           # Main processing provider
TRANSLATION_LLM_PROVIDER=gpt35         # Translation provider

# Model Configuration
DEEPSEEK_MODEL=deepseek-chat
OPENAI_MODEL=gpt-4o-mini
GPT35_MODEL=gpt-3.5-turbo

# Response Configuration
DEFAULT_RESPONSE_TYPE=general
DEFAULT_TEMPERATURE=0.7
MAX_TOKENS=4000
```

### Supported Languages
- **English** (`english`)
- **Chinese** (`chinese`)
- **Japanese** (`japanese`)
- **Korean** (`korean`)

### Response Types
- `general`: General purpose responses
- `creative`: Creative and imaginative content
- `analytical`: Structured analytical responses
- `educational`: Clear explanations with examples
- `technical`: Precise technical information

## Usage Patterns

### Basic Usage
```python
from src.orchestrator.translation_orchestrator import TranslationOrchestrator
from src.utils.config import Config
from src.utils.llm_factory import LLMFactory

# Initialize
config = Config.from_env()
llm_client = LLMFactory.create_llm(config)
translation_llm_client = LLMFactory.create_translation_llm(config)
orchestrator = TranslationOrchestrator(llm_client, translation_llm_client)

# Process query with explicit language pair
results = orchestrator.process_query(
    user_input="你好，今天过得怎么样？",
    source_language="chinese",
    target_language="english",
    response_type="general"
)
```

### Workflow Results Structure
```python
{
    "original_input": "你好，今天过得怎么样？",
    "source_language": "chinese",
    "target_language": "english",
    "english_translation": "Hello, how are you today?",
    "english_response": "I'm doing well, thank you for asking!",
    "final_response": "I'm doing well, thank you for asking!",
    "is_direct_english_processing": False
}
```

## Dependencies

**Core Dependencies** (`requirements.txt`):
- `openai>=1.0.0` - OpenAI API client
- `python-dotenv>=1.0.0` - Environment variable management

## Common Development Tasks

When modifying this codebase:

1. **Adding new LLM providers**: Extend `src/llms/base.py` and update `src/utils/llm_factory.py`
2. **Adding new languages**: Update `src/utils/language_config.py` and agent logic
3. **Modifying response types**: Update configuration in `src/utils/config.py`
4. **Testing changes**: Use `python main.py` interactive mode for manual testing

## File Structure Notes

- **No build tools**: Pure Python project using pip for dependency management
- **No tests directory**: Testing done through `main.py` demo modes
- **Environment-based config**: All configuration via `.env` file, no hardcoded values
- **Modular design**: Clear separation between LLM providers, agents, and orchestration logic