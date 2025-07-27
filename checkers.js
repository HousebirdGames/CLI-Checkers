const readline = require('readline');
const keypress = require('keypress');

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

// Ask the user if they want to play against the AI
rl.question('Do you want to play against the AI? (y/n): ', (answer) => {
    let isSinglePlayer = answer.trim().toLowerCase() === 'y';

    // Initialize game state
    let gameState = initializeGameState(isSinglePlayer);

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
});

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
                    nextRound(gameState);
                }
            } else {
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

    gameState.message = `Turn ${gameState.round}: Player ${gameState.currentPlayer.toUpperCase()} to move`;

    if (gameState.isSinglePlayer && gameState.currentPlayer === 'o') {
        // AI's turn
        setTimeout(() => {
            performAIMove(gameState);
            if (!gameState.stopDrawing) {
                nextRound(gameState);
                drawGameState(gameState);
            }
        }, 500); // Delay to simulate thinking time
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
            gameState.message = `Player ${winner} wins. Congratulations!`;
            gameState.stopDrawing = true;
            drawGameState(gameState);
            showCursor();
            process.exit(0);
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
 * @returns {Object} The initial game state.
 */
function initializeGameState(isSinglePlayer) {
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
        message: `Turn 1: Player X to move`,
        stopDrawing: false,
        isSinglePlayer: isSinglePlayer
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
    output += `Current player: ${gameState.currentPlayer.toUpperCase()}\n`;
    output += `Round: ${gameState.round}\n`;
    output += '--------------------------\n';
    for (let i = 0; i < 8; i++) {
        let rowStr = '|';
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
        rowStr += '|';
        output += rowStr + '\n';
    }
    output += '--------------------------\n';
    if (gameState.isSinglePlayer && gameState.currentPlayer === 'o') {
        output += `AI is thinking...\n`;
    } else {
        output += gameState.hasSelectedPiece
            ? `Use arrow keys to select destination and 'spacebar' to move\n`
            : `Use arrow keys to select a piece and 'spacebar' to select it\n`;
        output += `'c' to unselect piece, 'escape' to quit\n`;
    }
    output += gameState.message;

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
        showCursor();
        process.exit(1);
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
        const winner = 'X';
        gameState.message = `Player ${winner} wins. Congratulations!`;
        gameState.stopDrawing = true;
        drawGameState(gameState);
        showCursor();
        process.exit(0);
    }
}
