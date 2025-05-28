# Browser-Use WebUI

A beautiful and intuitive web interface for the Browser-Use library, allowing you to control AI browser automation through a user-friendly dashboard.

## Features

- Modern, responsive UI with light/dark mode support
- Support for multiple LLM providers (OpenAI, Anthropic, Google, DeepSeek, Ollama)
- Real-time browser preview and agent output
- Task history management
- Configurable browser and agent settings
- API key management

## Getting Started

### Prerequisites

- Python 3.11 or higher
- Browser-Use library and its dependencies

### Installation

1. Make sure you have Browser-Use installed:

```bash
pip install browser-use
```

2. Install the WebUI dependencies:

```bash
pip install fastapi uvicorn
```

3. Run the WebUI server:

```bash
cd webui
python server.py
```

4. Open your browser and navigate to http://localhost:8000

## Usage

1. Select your preferred LLM model from the dropdown
2. Enter your API key for the selected model provider
3. Configure browser options (headless mode, security settings, etc.)
4. Enter your task in the input field
5. Click "Run Task" to start the browser automation
6. Watch the browser preview and agent output in real-time
7. Access previous tasks from the history panel

## Advanced Settings

Access advanced settings by clicking the gear icon in the top-right corner:

- **Maximum Steps**: Limit the number of steps the agent can take
- **Max Actions Per Step**: Limit the number of actions per step
- **Viewport Expansion**: Control how much of the page is included in the context
- **Memory Options**: Configure the agent's memory system
- **Output Options**: Generate GIFs, save conversations, etc.

## Development

The WebUI consists of:

- `index.html`: Main UI structure
- `styles.css`: Styling with light/dark mode support
- `script.js`: Client-side functionality
- `server.py`: FastAPI backend that interfaces with Browser-Use

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.