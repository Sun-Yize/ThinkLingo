"""
Main script for testing the translation-based LLM framework
"""

from src.orchestrator.translation_orchestrator import TranslationOrchestrator
from src.utils.config import Config
from src.utils.llm_factory import LLMFactory


def print_separator(title: str):
    """Print a formatted separator"""
    print("\n" + "=" * 60)
    print(f" {title} ")
    print("=" * 60)


def print_results(title: str, results: dict):
    """Print test results in a formatted way"""
    print(f"\n--- {title} ---")
    print(f"Original Input: {results.get('original_input', 'N/A')}")
    print(f"Source Language: {results.get('source_language', 'N/A')}")
    print(f"Target Language: {results.get('target_language', 'N/A')}")

    # Show English translation if it exists
    english_translation = results.get('english_translation', 'N/A')
    if english_translation != 'N/A':
        print(f"English Translation: {english_translation}")

    print(f"English Response: {results.get('english_response', 'N/A')}")
    print(f"Final Response: {results.get('final_response', 'N/A')}")

    if 'error' in results:
        print(f"Error: {results['error']}")


def main():
    """Main function for simplified testing"""
    print_separator("SIMPLIFIED LLM FRAMEWORK TEST")

    try:
        # Initialize configuration and orchestrator
        config = Config.from_env()
        print(f"Configuration loaded successfully")
        print(f"Main Provider: {config.default_llm_provider}")
        print(f"Translation Provider: {config.translation_llm_provider}")

        llm_client = LLMFactory.create_llm(config)
        translation_llm_client = LLMFactory.create_translation_llm(config)
        orchestrator = TranslationOrchestrator(llm_client, translation_llm_client, config)

        # Test 1: Creative prompt with translation workflow (Chinese to Chinese via English)
        creative_prompt = "写一个关于机器人和人类成为朋友的短故事"

        results = orchestrator.process_query(
            user_input=creative_prompt,
            source_language="chinese",
            processing_language="english",
            target_language="chinese",
            response_type="creative"
        )

        print_results("Test 1: Creative Prompt (Chinese to Chinese via English)", results)

        # Test 2: Direct Chinese question and answer
        chinese_question = "人工智能的未来发展趋势是什么？"

        results_direct = orchestrator.process_query(
            user_input=chinese_question,
            source_language="chinese",
            target_language="chinese",
            response_type="general"
        )

        print_results("Test 2: Direct Chinese Question and Answer", results_direct)

    except Exception as e:
        print(f"Error: {str(e)}")
        print("\nMake sure to set your API keys in the .env file:")
        print("   DEEPSEEK_API_KEY=your-deepseek-api-key-here")
        print("   OPENAI_API_KEY=your-openai-api-key-here")


if __name__ == "__main__":
    main()