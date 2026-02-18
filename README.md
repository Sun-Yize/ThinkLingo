# Translation-Based LLM Chat Application

A web application that standardizes LLM response quality across languages by processing all requests in English, regardless of the user's input language. Features a React frontend with real-time visualization of the translation pipeline.

## Architecture Overview

This application implements a **4-step translation workflow**:

1. **User Input**: Accept input in any supported language
2. **Pre-Translation**: Convert to English (if source language ≠ English)
3. **Core Inference**: Process in English for consistent quality
4. **Post-Translation**: Convert response to target language (if target language ≠ English)

## Project Structure

```
├── backend/                    # FastAPI backend server
│   ├── api_server.py          # Main server with WebSocket streaming
│   └── requirements.txt       # Backend dependencies
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── TranslationChat.tsx     # Main chat interface
│   │   │   ├── ChatInput.tsx           # User input component
│   │   │   ├── MessageDisplay.tsx      # Chat messages display
│   │   │   └── ProcessVisualization.tsx # Real-time pipeline view
│   │   ├── types/             # TypeScript type definitions
│   │   └── index.tsx          # App entry point
│   ├── package.json           # Frontend dependencies
│   └── tailwind.config.js     # Styling configuration
├── src/                       # Python backend logic
│   ├── orchestrator/          # Main workflow management
│   ├── agents/               # Translation and inference agents
│   ├── llms/                 # LLM provider implementations
│   └── utils/                # Configuration and utilities
└── main.py                   # CLI testing interface
```

## Features

### Frontend Features
- **Split-Screen Layout**:
  - Left panel shows user conversation in selected languages
  - Right panel visualizes the internal translation pipeline
- **Real-Time Streaming**: WebSocket-based streaming with typewriter effects
- **Language Selection**: Support for English, Chinese, Japanese, and Korean
- **Response Types**: General, creative, analytical, educational, and technical
- **Translation Methods**: Choose between Google Translate (fast) or LLM translation (higher quality)

### Backend Features
- **Dual-LLM Architecture**: Separate models for main processing (DeepSeek) and translation (GPT-3.5)
- **WebSocket Streaming**: Real-time communication with frontend
- **REST API**: Traditional endpoints for non-streaming requests
- **Configurable Providers**: Support for multiple LLM providers

## Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- API keys for DeepSeek and OpenAI

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

2. Configure API keys:
```bash
cp .env.template .env
# Edit .env file to add your API keys
```

3. Start the backend server:
```bash
cd backend
python api_server.py
```

The API server will run on `http://localhost:8000`

### Frontend Setup

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage

### Web Interface

1. Open `http://localhost:3000` in your browser
2. Select your source and target languages
3. Choose response type and translation method
4. Send a message and watch the real-time translation pipeline in action

### API Endpoints

- **GET** `/api/health` - Health check
- **GET** `/api/languages` - Get supported languages
- **GET** `/api/response-types` - Get available response types
- **POST** `/api/chat` - Process message (non-streaming)
- **WebSocket** `/ws/chat` - Real-time streaming chat

## Configuration

### Environment Variables (.env)
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

## Framework Recommendation

**React with TypeScript** was chosen for the frontend because:

1. **Real-time Data Handling**: Excellent WebSocket support and state management
2. **Component Architecture**: Modular design perfect for split-screen layout
3. **TypeScript Integration**: Type safety for complex data structures
4. **Ecosystem**: Rich ecosystem with libraries for streaming, styling (Tailwind), and forms
5. **Development Experience**: Hot reloading, debugging tools, and wide community support

**FastAPI** was chosen for the backend because:

1. **WebSocket Support**: Native WebSocket support for real-time streaming
2. **Async/Await**: Perfect for handling LLM API calls and concurrent requests
3. **Automatic Documentation**: OpenAPI/Swagger integration
4. **Type Hints**: Python type hints work well with the existing codebase
5. **Performance**: High performance for real-time applications

## Development

### Testing the Backend
```bash
# Test individual components
python -c "from src.orchestrator.translation_orchestrator import TranslationOrchestrator; print('Import successful')"

# Run the demo/test interface
python main.py
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# The built files will be in frontend/build/
# Serve these static files with your preferred web server
```

## API Integration

The frontend communicates with the backend through:

1. **WebSocket Connection**: Real-time streaming of translation steps and responses
2. **REST API**: Configuration data (languages, response types) and health checks
3. **JSON Messages**: Structured communication protocol for chat requests and responses

### WebSocket Message Format
```typescript
{
  type: 'translation_start' | 'translation_complete' | 'processing_start' | 'processing_chunk' | 'processing_complete' | 'final_translation' | 'error',
  step: 'input_translation' | 'inference' | 'output_translation',
  content: string,
  metadata?: {
    from?: string,
    to?: string,
    original?: string,
    translated?: string,
    chunk_index?: number,
    // ... additional metadata
  }
}
```

This architecture provides a robust, scalable foundation for a multilingual LLM chat application with real-time visualization of the translation pipeline.