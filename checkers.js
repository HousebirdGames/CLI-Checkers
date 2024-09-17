const readline = require('readline');
const keypress = require('keypress');

keypress(process.stdin);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let gameState = initializeGameState();

hideCursor();
drawGameState(gameState);

let lastKeyPressTime = 0;

process.stdin.on('keypress', function (ch, key) {
    if (gameState.stopDrawing) return;

    const now = Date.now();
    if (now - lastKeyPressTime < 100) return;
    lastKeyPressTime = now;

    if (key) {

        switch (key.name) {
            case 'up':
                moveSelection(-1, 0);
                break;
            case 'down':
                moveSelection(1, 0);
                break;
            case 'left':
                moveSelection(0, -1);
                break;
            case 'right':
                moveSelection(0, 1);
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

function moveSelection(rowChange, colChange) {
    gameState.message = '';

    let newRow = gameState.cursorPosition.row + rowChange;
    let newCol = gameState.cursorPosition.col + colChange;

    if (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        gameState.cursorPosition.row = newRow;
        gameState.cursorPosition.col = newCol;
    }
}

function handleReturnKey(gameState) {
    gameState.message = '';
    const row = gameState.cursorPosition.row;
    const col = gameState.cursorPosition.col;
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

function nextRound(gameState) {
    gameState.currentPlayer = gameState.currentPlayer === 'x' ? 'o' : 'x';
    gameState.hasSelectedPiece = false;
    gameState.selectedPiece = null;
    gameState.possibleMoves = [];
    gameState.round++;

    gameState.message = `Turn ${gameState.round}: Player ${gameState.currentPlayer.toUpperCase()} to move`;

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
        rl.close();
        process.exit(0);
    }
}

function performMoveOrCapture(gameState, move) {
    const fromRow = gameState.selectedPiece.row;
    const fromCol = gameState.selectedPiece.col;
    const toRow = move.row;
    const toCol = move.col;

    gameState.board[toRow][toCol] = gameState.board[fromRow][fromCol];
    gameState.board[fromRow][fromCol] = ' ';

    if (move.isCapture) {
        const capturedRow = move.capturedPiece.row;
        const capturedCol = move.capturedPiece.col;
        gameState.board[capturedRow][capturedCol] = ' ';
    }

    if ((gameState.currentPlayer === 'x' && toRow === 0) || (gameState.currentPlayer === 'o' && toRow === 7)) {
        gameState.board[toRow][toCol] = gameState.currentPlayer.toUpperCase();
    }

    gameState.selectedPiece.row = toRow;
    gameState.selectedPiece.col = toCol;
}

function initializeGameState() {
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
    };
}

function updatePossibleMoves(gameState) {
    gameState.possibleMoves = [];

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

function drawGameState(gameState) {
    if (gameState.stopDrawing) return;

    let output = '';
    output += `Current player: ${gameState.currentPlayer.toUpperCase()}\n`;
    output += `Round: ${gameState.round}\n`;
    output += '--------------------------\n';
    for (let i = 0; i < 8; i++) {
        let rowStr = '|';
        for (let j = 0; j < 8; j++) {
            let cell = gameState.board[i][j];

            let cellStr = ' ' + cell + ' ';

            if (gameState.cursorPosition.row === i && gameState.cursorPosition.col === j) {
                cellStr = '[' + cell + ']';
            } else if (gameState.hasSelectedPiece && gameState.selectedPiece.row === i && gameState.selectedPiece.col === j) {
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
    output += gameState.hasSelectedPiece
        ? `Use arrow keys to select destination and 'spacebar' to move\n`
        : `Use arrow keys to select a piece and 'spacebar' to select it\n`;
    output += `'c' to unselect piece, 'escape' to quit\n`;
    output += gameState.message;

    process.stdout.write('\x1B[?25l'); // Hide cursor
    readline.cursorTo(process.stdout, 0, 0);
    readline.clearScreenDown(process.stdout);
    console.log(output);
    process.stdout.write('\x1B[?25h'); // Show cursor
}

function hideCursor() {
    process.stdout.write('\x1B[?25l');
}

function showCursor() {
    process.stdout.write('\x1B[?25h');
}
