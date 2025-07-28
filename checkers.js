const readline = require('readline');
const keypress = require('keypress');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Initialize keypress
keypress(process.stdin);

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, 'config.json');
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
} catch (error) {
    console.log('Config file not found or invalid, using defaults...');
    config = {
        ollama: {
            host: "localhost",
            port: 11434,
            model: "deepseek-r1:1.5b",
            timeout: 10000,
            options: {
                temperature: 1.0,
                top_p: 0.95
            }
        },
        commentary: {
            enabled_by_default: false,
            max_line_width: 60,
            display_time: 3000
        },
        game: {
            ai_thinking_time: 800,
            final_message_delay: 3000
        }
    };
}

// Configuration values
const OLLAMA_HOST = config.ollama.host;
const OLLAMA_PORT = config.ollama.port;
const OLLAMA_MODEL = config.ollama.model;
const OLLAMA_TIMEOUT = config.ollama.timeout;
const OLLAMA_OPTIONS = config.ollama.options;
const COMMENTARY_WIDTH = config.commentary.max_line_width;
const AI_THINKING_TIME = config.game.ai_thinking_time;
const FINAL_MESSAGE_DELAY = config.game.final_message_delay;

// Commentary system
const DEFAULT_COMMENTARIES = [
    "Bold choice! I respect the confidence, but let's see if you can back it up against me.",
    "Interesting strategy you've got there. I'm curious if you're setting a trap or just hoping for the best.",
    "Not bad at all! Though I have to wonder... are you thinking ahead or just winging it?",
    "Playing it safe, are we? I appreciate caution, but sometimes I expect the unexpected from you.",
    "Ooh, getting fancy now! I love when you take risks. Hope you're ready for my response!",
    "That's one way to approach it, I suppose. Your unconventional style keeps me on my toes.",
    "You're really going for it today! This aggressive play could work... or I might just crush it.",
    "Hmm, ambitious move right there. Either you're brilliant or I'm about to teach you something new."
];

let commentaryIndex = 0;

/**
 * Gets the next default commentary message.
 * @returns {string} A default commentary message.
 */
function getNextDefaultCommentary() {
    const commentary = DEFAULT_COMMENTARIES[commentaryIndex];
    commentaryIndex = (commentaryIndex + 1) % DEFAULT_COMMENTARIES.length;
    return commentary;
}

/**
 * Gets a motivational message when the player loses.
 * @returns {string} A motivational message from the AI.
 */
function getPlayerLoseMessage() {
    const messages = [
        "Hey, good game! You put up a solid fight. I can tell you're getting better at this.",
        "Don't worry about it! You had some really clever moves there. Want a rematch?",
        "That was actually pretty challenging! You're definitely improving. Try me again?",
        "Nice try! I could see you thinking strategically. Keep practicing and you'll get me next time.",
        "You gave me a run for my money there! A few more games and you might just beat me."
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Gets an apologetic message when the player wins.
 * @returns {string} An apologetic message from the AI.
 */
function getPlayerWinMessage() {
    const messages = [
        "Wow, you actually beat me! I have to admit, that was some impressive playing.",
        "Well played! I didn't see that strategy coming. You really outmaneuvered me there.",
        "I can't believe it... you actually won! That was genuinely brilliant gameplay.",
        "Okay, okay, you got me! I was so confident, but you proved me wrong. Respect!",
        "I'm honestly impressed! You turned the tables on me completely. Well deserved victory!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}

/**
 * Wraps text to a specified width.
 * @param {string} text - The text to wrap.
 * @param {number} width - The maximum width per line.
 * @returns {string} The wrapped text.
 */
function wrapText(text, width) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
        if ((currentLine + word).length <= width) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            if (currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                // Word is longer than width, just add it
                lines.push(word);
            }
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    return lines.join('\n');
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Initialize keypress on stdin
keypress(process.stdin);

// Handle process termination gracefully
process.on('SIGINT', () => {
    showCursor();
    console.log('\nGame interrupted. Goodbye!');
    process.exit(0);
});

process.on('uncaughtException', (error) => {
    showCursor();
    console.error('Unexpected error:', error.message);
    process.exit(1);
});

// Display current config
console.log(`🎮 Checkers Game - Config: ${OLLAMA_MODEL} @ ${OLLAMA_HOST}:${OLLAMA_PORT}\n`);

// Start the menu system
showMainMenu();

/**
 * Shows a menu with arrow key navigation.
 * @param {string} title - The menu title
 * @param {Array} options - Array of option objects with {text, value} properties
 * @param {number} defaultIndex - Default selected index
 * @param {Function} callback - Callback function that receives the selected value
 */
function showMenu(title, options, defaultIndex = 0, callback) {
    let selectedIndex = defaultIndex;
    let lastKeyPressTime = 0;
    
    function drawMenu() {
        process.stdout.write('\x1B[2J\x1B[0;0H'); // Clear screen
        console.log(title);
        console.log('');
        
        options.forEach((option, index) => {
            const prefix = index === selectedIndex ? '→ ' : '  ';
            const highlight = index === selectedIndex ? '\x1b[7m' : ''; // Reverse video
            const reset = index === selectedIndex ? '\x1b[0m' : '';
            console.log(`${prefix}${highlight}${option.text}${reset}`);
        });
        
        console.log('');
        console.log('Use arrow keys to navigate, Enter/Space to select');
    }
    
    drawMenu();
    
    // Clean up any existing listeners
    process.stdin.removeAllListeners('keypress');
    
    // Set stdin to raw mode to capture keypress events
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    const keyHandler = function (ch, key) {
        const now = Date.now();
        if (now - lastKeyPressTime < 100) return; // Debounce keypresses
        lastKeyPressTime = now;
        
        if (key) {
            switch (key.name) {
                case 'up':
                    selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
                    drawMenu();
                    break;
                case 'down':
                    selectedIndex = selectedIndex < options.length - 1 ? selectedIndex + 1 : 0;
                    drawMenu();
                    break;
                case 'return':
                case 'enter':
                case 'space':
                    process.stdin.removeListener('keypress', keyHandler);
                    process.stdin.setRawMode(false);
                    // Small delay to prevent key repeat issues
                    setTimeout(() => {
                        callback(options[selectedIndex].value);
                    }, 50);
                    break;
                case 'escape':
                    process.stdin.removeListener('keypress', keyHandler);
                    process.stdin.setRawMode(false);
                    showCursor();
                    process.exit(0);
                    break;
            }
        }
    };
    
    process.stdin.on('keypress', keyHandler);
}

/**
 * Shows the main menu for game mode selection.
 */
function showMainMenu() {
    const options = [
        { text: 'Play against AI', value: 'ai' },
        { text: 'Play against human', value: 'human' },
        { text: 'Exit', value: 'exit' }
    ];
    
    showMenu('Select Game Mode:', options, 0, (selectedValue) => {
        switch (selectedValue) {
            case 'ai':
                setTimeout(() => {
                    showCommentaryMenu();
                }, 100);
                break;
            case 'human':
                // Initialize game state for human vs human
                let gameState = initializeGameState(false, false);
                startGame(gameState);
                break;
            case 'exit':
                showCursor();
                process.exit(0);
                break;
        }
    });
}

/**
 * Shows the commentary menu for AI games.
 */
function showCommentaryMenu() {
    const defaultEnabled = config.commentary.enabled_by_default;
    const options = [
        { text: `Enable AI Commentary${defaultEnabled ? ' (default)' : ''}`, value: true },
        { text: `Disable AI Commentary${!defaultEnabled ? ' (default)' : ''}`, value: false },
        { text: 'Back to main menu', value: 'back' }
    ];
    
    const defaultIndex = defaultEnabled ? 0 : 1;
    
    showMenu('AI Commentary Options:', options, defaultIndex, (selectedValue) => {
        if (selectedValue === 'back') {
            setTimeout(() => {
                showMainMenu();
            }, 100);
        } else {
            // Initialize game state for AI game
            let gameState = initializeGameState(true, selectedValue);
            startGame(gameState);
        }
    });
}

function startGame(gameState) {
    hideCursor();
    drawGameState(gameState);

    let lastKeyPressTime = 0;

    // Set stdin to raw mode to capture keypress events
    process.stdin.setRawMode(true);
    process.stdin.resume();

    process.stdin.on('keypress', function (ch, key) {
        if (gameState.stopDrawing || (gameState.isSinglePlayer && gameState.currentPlayer === 'o')) return;

        const now = Date.now();
        if (now - lastKeyPressTime < 100) return; // Debounce keypresses
        lastKeyPressTime = now;

        if (key) {
            switch (key.name) {
                case 'up':
                    moveSelection(gameState, -1, 0);
                    break;
                case 'down':
                    moveSelection(gameState, 1, 0);
                    break;
                case 'left':
                    moveSelection(gameState, 0, -1);
                    break;
                case 'right':
                    moveSelection(gameState, 0, 1);
                    break;
                case 'return':
                case 'enter':
                case 'space':
                    handleReturnKey(gameState);
                    break;
                case 'escape':
                    gameState.stopDrawing = true;
                    gameState.message = 'Exiting game';
                    drawGameState(gameState);
                    showCursor();
                    rl.close();
                    process.exit(0);
                    break;
                case 'backspace':
                case 'c':
                    gameState.hasSelectedPiece = false;
                    gameState.selectedPiece = null;
                    gameState.possibleMoves = [];
                    break;
            }
        }

        drawGameState(gameState);
    });
}

/**
 * Moves the selection cursor on the board.
 * @param {Object} gameState - The current state of the game.
 * @param {number} rowChange - The change in the row position.
 * @param {number} colChange - The change in the column position.
 */
function moveSelection(gameState, rowChange, colChange) {
    gameState.message = '';

    let newRow = gameState.cursorPosition.row + rowChange;
    let newCol = gameState.cursorPosition.col + colChange;

    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        gameState.cursorPosition.row = newRow;
        gameState.cursorPosition.col = newCol;
    }
}

/**
 * Handles the action when the return or space key is pressed.
 * @param {Object} gameState - The current state of the game.
 */
function handleReturnKey(gameState) {
    gameState.message = '';
    const row = gameState.cursorPosition.row;
    const col = gameState.cursorPosition.col;

    // Validate cursor position
    if (row < 0 || row >= 8 || col < 0 || col >= 8) {
        gameState.message = 'Invalid position';
        return;
    }

    const cell = gameState.board[row][col];

    if (!gameState.hasSelectedPiece) {
        if (cell.toLowerCase() === gameState.currentPlayer) {
            gameState.selectedPiece = { row, col };
            gameState.hasSelectedPiece = true;
            updatePossibleMoves(gameState);
            if (gameState.possibleMoves.length === 0) {
                gameState.hasSelectedPiece = false;
                gameState.selectedPiece = null;
                gameState.message = 'This piece has no possible moves';
            }
        } else {
            gameState.message = 'Select one of your own pieces';
        }
    } else {
        const move = gameState.possibleMoves.find(m => m.row === row && m.col === col);
        if (move) {
            performMoveOrCapture(gameState, move);
            if (move.isCapture) {
                updatePossibleMoves(gameState);
                if (gameState.possibleMoves.some(m => m.isCapture)) {
                    gameState.message = 'You can make another capture';
                } else {
                    // Request commentary for this move
                    if (gameState.enableCommentary) {
                        requestAsyncCommentary(gameState);
                    }
                    nextRound(gameState);
                }
            } else {
                // Request commentary for this move
                if (gameState.enableCommentary) {
                    requestAsyncCommentary(gameState);
                }
                nextRound(gameState);
            }
        } else {
            gameState.message = 'Invalid move, piece unselected';
            gameState.hasSelectedPiece = false;
            gameState.selectedPiece = null;
            gameState.possibleMoves = [];
        }
    }
}

/**
 * Advances the game to the next round.
 * @param {Object} gameState - The current state of the game.
 */
function nextRound(gameState) {
    gameState.currentPlayer = gameState.currentPlayer === 'x' ? 'o' : 'x';
    gameState.hasSelectedPiece = false;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    gameState.round++;
    gameState.message = `Use arrow keys and spacebar to play`;

    if (gameState.isSinglePlayer && gameState.currentPlayer === 'o') {
        // AI's turn - simulate thinking time
        gameState.message = 'AI is thinking...';
        drawGameState(gameState);

        setTimeout(() => {
            performAIMove(gameState);
            if (!gameState.stopDrawing) {
                nextRound(gameState);
                drawGameState(gameState);
            }
        }, AI_THINKING_TIME); // Configurable AI thinking time
    } else {
        // Human player's turn
        outerLoop:
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (gameState.board[row][col].toLowerCase() === gameState.currentPlayer) {
                    gameState.cursorPosition.row = row;
                    gameState.cursorPosition.col = col;
                    break outerLoop;
                }
            }
        }

        if (!playerHasMoves(gameState)) {
            const winner = gameState.currentPlayer === 'x' ? 'O' : 'X';
            if (gameState.isSinglePlayer && gameState.enableCommentary) {
                if (winner === 'X') {
                    // Player wins
                    gameState.message = `You win! Congratulations!`;
                    gameState.currentCommentary = wrapText(getPlayerWinMessage(), COMMENTARY_WIDTH);
                } else {
                    // AI wins
                    gameState.message = `AI wins!`;
                    gameState.currentCommentary = wrapText(getPlayerLoseMessage(), COMMENTARY_WIDTH);
                }
            } else {
                gameState.message = `Player ${winner} wins. Congratulations!`;
            }
            gameState.stopDrawing = true;
            drawGameState(gameState);
            showCursor();

            // Give user time to read the final message
            setTimeout(() => {
                process.exit(0);
            }, FINAL_MESSAGE_DELAY);
        }
    }
}

/**
 * Performs a move or capture action.
 * @param {Object} gameState - The current state of the game.
 * @param {Object} move - The move to perform.
 */
function performMoveOrCapture(gameState, move) {
    const fromRow = gameState.selectedPiece.row;
    const fromCol = gameState.selectedPiece.col;
    // Handle both human moves (move.row) and AI moves (move.to.row)
    const toRow = move.to ? move.to.row : move.row;
    const toCol = move.to ? move.to.col : move.col;

    // Add boundary validation
    if (toRow < 0 || toRow >= 8 || toCol < 0 || toCol >= 8 ||
        fromRow < 0 || fromRow >= 8 || fromCol < 0 || fromCol >= 8) {
        console.error('Invalid coordinates:', { fromRow, fromCol, toRow, toCol });
        return;
    }

    gameState.board[toRow][toCol] = gameState.board[fromRow][fromCol];
    gameState.board[fromRow][fromCol] = ' ';

    if (move.isCapture) {
        const capturedRow = move.capturedPiece.row;
        const capturedCol = move.capturedPiece.col;
        if (capturedRow >= 0 && capturedRow < 8 && capturedCol >= 0 && capturedCol < 8) {
            gameState.board[capturedRow][capturedCol] = ' ';
        }
    }

    // Check for kinging
    if ((gameState.currentPlayer === 'x' && toRow === 0) || (gameState.currentPlayer === 'o' && toRow === 7)) {
        gameState.board[toRow][toCol] = gameState.currentPlayer.toUpperCase();
    }

    gameState.selectedPiece.row = toRow;
    gameState.selectedPiece.col = toCol;
}

/**
 * Initializes the game state.
 * @param {boolean} isSinglePlayer - Whether the game is single-player against AI.
 * @param {boolean} enableCommentary - Whether to enable AI commentary.
 * @returns {Object} The initial game state.
 */
function initializeGameState(isSinglePlayer, enableCommentary = false) {
    let board = [];
    for (let i = 0; i < 8; i++) {
        let row = [];
        for (let j = 0; j < 8; j++) {
            if (i < 3 && (i + j) % 2 === 1) {
                row.push('o');
            } else if (i > 4 && (i + j) % 2 === 1) {
                row.push('x');
            } else {
                row.push(' ');
            }
        }
        board.push(row);
    }
    return {
        board: board,
        currentPlayer: 'x',
        cursorPosition: { row: 0, col: 1 },
        selectedPiece: null,
        round: 1,
        hasSelectedPiece: false,
        possibleMoves: [],
        message: `Use arrow keys and spacebar to play`,
        stopDrawing: false,
        isSinglePlayer: isSinglePlayer,
        enableCommentary: enableCommentary,
        currentCommentary: null, // Start with no commentary
        commentaryPending: false
    };
}

/**
 * Updates the possible moves for the selected piece.
 * @param {Object} gameState - The current state of the game.
 */
function updatePossibleMoves(gameState) {
    gameState.possibleMoves = [];

    // Validate selected piece coordinates
    if (!gameState.selectedPiece ||
        gameState.selectedPiece.row < 0 || gameState.selectedPiece.row >= 8 ||
        gameState.selectedPiece.col < 0 || gameState.selectedPiece.col >= 8) {
        return;
    }

    let piece = gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col];
    let isKing = piece === piece.toUpperCase();
    let enemyPieces = gameState.currentPlayer === 'x' ? ['o', 'O'] : ['x', 'X'];

    let directions = [];
    if (isKing) {
        directions.push({ rowDir: 1, colDir: -1 });
        directions.push({ rowDir: 1, colDir: 1 });
        directions.push({ rowDir: -1, colDir: -1 });
        directions.push({ rowDir: -1, colDir: 1 });
    } else {
        let dir = gameState.currentPlayer === 'x' ? -1 : 1;
        directions.push({ rowDir: dir, colDir: -1 });
        directions.push({ rowDir: dir, colDir: 1 });
    }

    let row = gameState.selectedPiece.row;
    let col = gameState.selectedPiece.col;

    for (const direction of directions) {
        const newRow = row + direction.rowDir;
        const newCol = col + direction.colDir;

        if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
            if (gameState.board[newRow][newCol] === ' ') {
                gameState.possibleMoves.push({ row: newRow, col: newCol, isCapture: false });
            } else if (enemyPieces.includes(gameState.board[newRow][newCol])) {
                const jumpRow = newRow + direction.rowDir;
                const jumpCol = newCol + direction.colDir;
                if (jumpRow >= 0 && jumpRow < 8 && jumpCol >= 0 && jumpCol < 8 && gameState.board[jumpRow][jumpCol] === ' ') {
                    gameState.possibleMoves.push({
                        row: jumpRow,
                        col: jumpCol,
                        isCapture: true,
                        capturedPiece: { row: newRow, col: newCol }
                    });
                }
            }
        }
    }
}

/**
 * Checks if the current player has any valid moves.
 * @param {Object} gameState - The current state of the game.
 * @returns {boolean} True if the player has moves, false otherwise.
 */
function playerHasMoves(gameState) {
    const player = gameState.currentPlayer;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col].toLowerCase() === player) {
                gameState.selectedPiece = { row, col };
                updatePossibleMoves(gameState);
                if (gameState.possibleMoves.length > 0) {
                    gameState.selectedPiece = null;
                    return true;
                }
            }
        }
    }
    gameState.selectedPiece = null;
    return false;
}

/**
 * Draws the current state of the game to the terminal.
 * @param {Object} gameState - The current state of the game.
 */
function drawGameState(gameState) {
    if (gameState.stopDrawing) return;

    // Clear screen and hide cursor
    process.stdout.write('\x1B[2J\x1B[0;0H\x1B[?25l');

    let output = '';
    output += `Turn ${gameState.round} - Player ${gameState.currentPlayer.toUpperCase()}\n`;

    // Add column headers
    output += '    a  b  c  d  e  f  g  h\n';
    output += '  ┌────────────────────────┐\n';

    for (let i = 0; i < 8; i++) {
        let rowStr = `${8 - i} │`;
        for (let j = 0; j < 8; j++) {
            let cell = gameState.board[i][j];
            let cellStr = ' ' + cell + ' ';

            if (
                gameState.cursorPosition.row === i &&
                gameState.cursorPosition.col === j &&
                (!gameState.isSinglePlayer || gameState.currentPlayer === 'x')
            ) {
                cellStr = '[' + cell + ']';
            } else if (gameState.hasSelectedPiece && gameState.selectedPiece &&
                gameState.selectedPiece.row === i && gameState.selectedPiece.col === j) {
                cellStr = '{' + cell + '}';
            } else if (gameState.hasSelectedPiece && gameState.possibleMoves.some(m => m.row === i && m.col === j)) {
                cellStr = '(' + cell + ')';
            }

            rowStr += cellStr;
        }
        rowStr += '│';
        output += rowStr + '\n';
    }
    output += '  └────────────────────────┘\n';

    // Show current message
    output += gameState.message + '\n';

    // Show controls based on current state
    if (gameState.isSinglePlayer && gameState.currentPlayer === 'o') {
        // AI turn - no controls needed
    } else {
        if (gameState.hasSelectedPiece) {
            output += `Move: arrow keys + spacebar | Cancel: 'c' | Quit: escape\n`;
        } else {
            output += `Select: arrow keys + spacebar | Quit: escape\n`;
        }
    }

    // Show AI commentary if available
    if (gameState.currentCommentary && gameState.isSinglePlayer) {
        const commentaryLines = gameState.currentCommentary.split('\n');
        output += `\n💭 AI: ${commentaryLines[0]}`;

        // Add additional lines with proper indentation
        for (let i = 1; i < commentaryLines.length; i++) {
            output += `\n     ${commentaryLines[i]}`;
        }

        if (gameState.commentaryPending) {
            output += ` 🤔`;
        }
    }

    process.stdout.write(output);
}

/**
 * Hides the terminal cursor.
 */
function hideCursor() {
    process.stdout.write('\x1B[?25l');
}

/**
 * Shows the terminal cursor.
 */
function showCursor() {
    process.stdout.write('\x1B[?25h');
}

/**
 * Starts fetching AI commentary asynchronously without blocking gameplay.
 * @param {Object} gameState - The current state of the game.
 */
function requestAsyncCommentary(gameState) {
    if (!gameState.enableCommentary || gameState.commentaryPending) return;

    gameState.commentaryPending = true;

    getAICommentary(gameState).then(commentary => {
        gameState.currentCommentary = commentary;
        gameState.commentaryPending = false;
        // Redraw if it's player's turn to show new commentary
        if (gameState.currentPlayer === 'x' && !gameState.stopDrawing) {
            drawGameState(gameState);
        }
    });
}

/**
 * Gets AI commentary about the current game state from Ollama.
 * @param {Object} gameState - The current state of the game.
 * @returns {Promise<string>} A promise that resolves to the AI commentary.
 */
function getAICommentary(gameState) {
    return new Promise((resolve) => {
        // Analyze the board state
        const gameAnalysis = analyzeGameState(gameState);

        const prompt = `Respond with exactly ONE short trash-talking sentence about your oppenents checkers move. Be cocky but fun.

Current game: Round ${gameState.round}, Opponent: ${gameAnalysis.playerPieces} pieces, You: ${gameAnalysis.aiPieces} pieces.

Examples:
- "That move was so predictable!"  
- "I'm already planning my victory!"
- "Really? That's your strategy?"

Response (one sentence only):`;

        const postData = JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt,
            stream: false,
            options: OLLAMA_OPTIONS
        });


        const options = {
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/generate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    let commentary = response.response || "Nice move! Keep watching for captures.";

                    // Clean up the response aggressively
                    commentary = commentary.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
                    commentary = commentary.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
                    commentary = commentary.replace(/^AI:\s*/i, ''); // Remove "AI:" prefix
                    commentary = commentary.replace(/^Commentary:\s*/i, ''); // Remove "Commentary:" prefix
                    commentary = commentary.replace(/^Response.*?:\s*/i, ''); // Remove "Response:" prefix

                    // Take only the first sentence and remove internal monologue
                    const sentences = commentary.split(/[.!?]/);
                    if (sentences.length > 0) {
                        commentary = sentences[0].trim();
                        if (commentary && !commentary.match(/[.!?]$/)) {
                            commentary += '!'; // Add exclamation for sass
                        }
                    }

                    // Remove meta-commentary about the instructions
                    commentary = commentary.replace(/.*instruction.*|.*sentence.*|.*per.*|.*wait.*|.*let me.*|.*think.*|.*see.*/gi, '');

                    // Word wrap for display
                    commentary = wrapText(commentary, COMMENTARY_WIDTH);

                    resolve(commentary || getNextDefaultCommentary());
                } catch (error) {
                    resolve(getNextDefaultCommentary());
                }
            });
        });

        req.on('error', (error) => {
            resolve(getNextDefaultCommentary());
        });

        // Configurable timeout
        req.setTimeout(OLLAMA_TIMEOUT, () => {
            req.destroy();
            resolve(getNextDefaultCommentary());
        });

        req.write(postData);
        req.end();
    });
}

/**
 * Analyzes the current game state for AI commentary.
 * @param {Object} gameState - The current state of the game.
 * @returns {Object} Analysis of the game state.
 */
function analyzeGameState(gameState) {
    let playerPieces = 0, aiPieces = 0, playerKings = 0, aiKings = 0;
    let capturesAvailable = false;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece === 'x') playerPieces++;
            else if (piece === 'X') { playerPieces++; playerKings++; }
            else if (piece === 'o') aiPieces++;
            else if (piece === 'O') { aiPieces++; aiKings++; }
        }
    }

    // Quick check for available captures for AI
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col].toLowerCase() === 'o') {
                gameState.selectedPiece = { row, col };
                updatePossibleMoves(gameState);
                if (gameState.possibleMoves.some(m => m.isCapture)) {
                    capturesAvailable = true;
                    break;
                }
            }
        }
    }

    const position = playerPieces > aiPieces ? 'ahead' :
        aiPieces > playerPieces ? 'behind' : 'even';

    return {
        playerPieces,
        aiPieces,
        playerKings,
        aiKings,
        capturesAvailable,
        position
    };
}

/**
 * Performs an AI move for the opponent.
 * @param {Object} gameState - The current state of the game.
 */
function performAIMove(gameState) {
    let allMoves = [];
    try {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (gameState.board[row] && gameState.board[row][col] &&
                    gameState.board[row][col].toLowerCase() === 'o') {
                    let piece = { row, col };
                    gameState.selectedPiece = piece;
                    updatePossibleMoves(gameState);
                    if (gameState.possibleMoves.length > 0) {
                        for (let move of gameState.possibleMoves) {
                            allMoves.push({
                                from: { row, col },
                                to: { row: move.row, col: move.col },
                                isCapture: move.isCapture,
                                capturedPiece: move.capturedPiece
                            });
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in AI move generation:', error);
        gameState.message = 'AI error occurred. Game ending.';
        gameState.stopDrawing = true;
        drawGameState(gameState);
        showCursor();

        // Give user time to read the error message
        setTimeout(() => {
            process.exit(1);
        }, FINAL_MESSAGE_DELAY);
    }

    if (allMoves.length > 0) {
        // Prioritize capture moves
        let captureMoves = allMoves.filter(m => m.isCapture);
        let move;
        if (captureMoves.length > 0) {
            move = captureMoves[Math.floor(Math.random() * captureMoves.length)];
        } else {
            move = allMoves[Math.floor(Math.random() * allMoves.length)];
        }

        gameState.selectedPiece = move.from;
        performMoveOrCapture(gameState, {
            row: move.to.row,
            col: move.to.col,
            isCapture: move.isCapture,
            capturedPiece: move.capturedPiece
        });

        // Handle multiple captures
        if (move.isCapture) {
            let canContinue = true;
            while (canContinue) {
                updatePossibleMoves(gameState);
                let captureMoves = gameState.possibleMoves.filter(m => m.isCapture);
                if (captureMoves.length > 0) {
                    let nextMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
                    performMoveOrCapture(gameState, nextMove);
                } else {
                    canContinue = false;
                }
            }
        }
    } else {
        // No moves available for AI, human player wins
        if (gameState.enableCommentary) {
            gameState.message = `You win! Congratulations!`;
            gameState.currentCommentary = wrapText(getPlayerWinMessage(), 60);
        } else {
            gameState.message = `Player X wins. Congratulations!`;
        }
        gameState.stopDrawing = true;
        drawGameState(gameState);
        showCursor();

        // Give user time to read the final message
        setTimeout(() => {
            process.exit(0);
        }, FINAL_MESSAGE_DELAY);
    }
}
