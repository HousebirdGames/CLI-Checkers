# CLI Checkers 🎮

A command-line checkers game with an AI opponent featuring witty commentary powered by Ollama.

## Features

- **Classic Checkers Gameplay** - Complete implementation with piece selection, movement, captures, and king promotion
- **Strategic AI Opponent** - Intelligent AI that prioritizes captures, multi-jumps, and defensive positioning
- **AI Commentary System** - Optional trash-talking commentary powered by local Ollama models
- **Board Coordinates** - Chess-style notation (a-h, 1-8) for clear move reference
- **Configurable Settings** - Customize AI models, commentary preferences, timing, and behavior
- **Enhanced Terminal Interface** - Clean UI with visual indicators for piece selection and possible moves
- **Context-Aware Responses** - Dynamic AI commentary that adapts to game state and outcomes

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/HousebirdGames/cli-checkers.git
   ```

2. Navigate into the directory:
   ```bash
   cd cli-checkers
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

## Setup (For AI Commentary)

1. **Install Ollama** (optional - for AI commentary):
   - Download from [ollama.ai](https://ollama.ai)
   - Install and start the service

2. **Download a model** (recommended):
   ```bash
   ollama pull deepseek-r1:1.5b
   ```

3. **Configure settings** (optional):
   - Copy `config.example.json` to `config.json`
   - Modify settings as needed

## Running the Game

```bash
npm start
```

## Configuration

The game uses a `config.json` file for customization. If not present, sensible defaults are used.

### Example Configuration:

```json
{
  "ollama": {
    "host": "localhost",
    "port": 11434,
    "model": "deepseek-r1:1.5b",
    "timeout": 10000,
    "options": {
      "temperature": 1.0,
      "top_p": 0.95
    }
  },
  "commentary": {
    "enabled_by_default": false,
    "max_line_width": 60
  },
  "game": {
    "ai_thinking_time": 800,
    "final_message_delay": 3000
  }
}
```

### Available Settings:

- **`ollama.model`** - AI model to use (e.g., `llama2`, `gemma2:9b`, `deepseek-r1:1.5b`)
- **`ollama.temperature`** - Response creativity (0.0 = consistent, 1.0+ = creative)
- **`commentary.enabled_by_default`** - Auto-enable commentary
- **`game.ai_thinking_time`** - AI delay in milliseconds
- **`commentary.max_line_width`** - Text wrapping width

## How to Play

1. **Game Start**: Choose to play against AI or human opponent
2. **Enable Commentary**: Optionally enable AI trash talk (requires Ollama)
3. **Movement**: Use arrow keys to select pieces and moves
4. **Controls**:
   - **Arrow Keys** - Navigate the board
   - **Spacebar** - Select piece or confirm move
   - **C** - Cancel selection
   - **Escape** - Quit game

### Game Rules

- Standard checkers rules apply
- Move diagonally on dark squares only
- Capture by jumping over opponent pieces
- Reach the opposite end to promote to king
- Kings can move backward
- Multiple captures are mandatory
- Win by capturing all opponent pieces or blocking all moves

## AI Commentary Examples

When commentary is enabled, the AI will provide entertaining feedback:

```
💭 AI: That move was so predictable, I saw it coming three 
     turns ago!

💭 AI: Bold choice! Let's see if you can back up that 
     confidence against me.

💭 AI: Really? That's your grand strategy? I'm not impressed!
```

## Dependencies

- **Node.js** - Runtime environment
- **keypress** - Keyboard input handling
- **Ollama** (optional) - Local AI model inference for commentary

## License

This project is open source and available under the MIT License.