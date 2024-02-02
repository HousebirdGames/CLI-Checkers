const readline = require('readline');
const keypress = require('keypress');

keypress(process.stdin);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let gameState = initializeGameState();

nextRound(gameState);

drawGameState(gameState);

let lastKeyPressTime = 0;

process.stdin.on('keypress', function (ch, key) {
    if (gameState.stopDrawing) return;

    const now = Date.now();
    if (now - lastKeyPressTime < 200) return;
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
                console.log('');
                console.log('Exited game');
                console.log('');
                rl.close();
                break;
            case 'backspace':
            case 'c':
                gameState.hasSelectedPiece = false;
                break;
        }
    }

    drawGameState(gameState);
});

function moveSelection(rowChange, colChange) {
    gameState.message = '';

    if (gameState.hasSelectedPiece) {
        return;
    }

    let newRow = gameState.selectedPiece.row + rowChange;
    let newCol = gameState.selectedPiece.col + colChange;
    gameState.debug = `New row: ${newRow}, New col: ${newCol}`;

    while (newRow >= 0 && newRow < 8 && newCol >= 0 && newCol < 8) {
        let colToCheck = newCol;
        if (newRow % 2 != 0 && rowChange != 0) {
            colToCheck += 1;
        }
        else if (gameState.selectedPiece.col % 2 != 0 && rowChange != 0) {
            colToCheck -= 1;
        }

        if (gameState.board[newRow][colToCheck] === gameState.currentPlayer) {
            gameState.selectedPiece.row = newRow;
            gameState.selectedPiece.col = colToCheck;
            break;
        }

        //check the entire row, before coninuing to the next row
        if (colToCheck < 0 || colToCheck >= 8 && rowChange != 0) {
            newCol += colToCheck;
            continue;
        }

        newRow += rowChange;
        newCol += colChange;
    }
    //gameState.debug = `New row: ${newRow}, New col: ${newCol}`;
}

function moveSelectionWithoutChecks(rowChange, colChange) {
    gameState.selectedPiece.row += rowChange;
    gameState.selectedPiece.col += colChange;
}

function handleReturnKey(gameState) {
    gameState.message = '';
    if (!gameState.hasSelectedPiece) {
        if (gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col] === gameState.currentPlayer) {
            gameState.hasSelectedPiece = true;
            updatePossibleMoves(gameState);
            if (gameState.possibleMoves.length === 0) {
                gameState.hasSelectedPiece = false;
                gameState.message = 'This piece has no possible moves';
            }
        }
    } else {
        if (gameState.possibleMoves.length == 0) {
            return;
        }
        performMoveOrCapture(gameState);
        nextRound(gameState);
    }
}

function nextRound(gameState) {
    gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    gameState.hasSelectedPiece = false;
    gameState.round++;

    gameState.message = `Turn ${gameState.round}: Player ${gameState.currentPlayer} to move`;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (gameState.board[row][col] === gameState.currentPlayer) {
                gameState.selectedPiece.row = row;
                gameState.selectedPiece.col = col;
                break;
            }
        }
    }
    gameState.possibleMoves = [];
}

function performMoveOrCapture(gameState) {
    // Assuming the piece to move is already selected and stored in gameState.selectedPiece
    // For simplicity, just move forward diagonally to the left or right if the space is empty
    // More complex logic needed for capturing and checking for valid moves

    let targetRow = gameState.currentPlayer === 'X' ? gameState.selectedPiece.row + 1 : gameState.selectedPiece.row - 1;
    let targetColLeft = gameState.selectedPiece.col - 1;
    let targetColRight = gameState.selectedPiece.col + 1;

    // Check if the target position is within bounds and empty for a simple move
    if (targetRow >= 0 && targetRow < 8) {
        if (targetColLeft >= 0 && gameState.board[targetRow][targetColLeft] === ' ') {
            // Move piece to the left diagonally
            gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col] = ' ';
            gameState.board[targetRow][targetColLeft] = gameState.currentPlayer;
            gameState.selectedPiece.row = targetRow;
            gameState.selectedPiece.col = targetColLeft;
        } else if (targetColRight < 8 && gameState.board[targetRow][targetColRight] === ' ') {
            // Move piece to the right diagonally
            gameState.board[gameState.selectedPiece.row][gameState.selectedPiece.col] = ' ';
            gameState.board[targetRow][targetColRight] = gameState.currentPlayer;
            gameState.selectedPiece.row = targetRow;
            gameState.selectedPiece.col = targetColRight;
        }
        // Add capturing logic here
    }
}

// Update the initializeGameState function to include 'hasSelectedPiece'
function initializeGameState() {
    let board = [];
    for (let i = 0; i < 8; i++) {
        let row = [];
        for (let j = 0; j < 8; j++) {
            if (i < 3 && (i + j) % 2 === 0) {
                row.push('X');
            } else if (i > 4 && (i + j) % 2 === 0) {
                row.push('O');
            } else {
                row.push(' ');
            }
        }
        board.push(row);
    }
    return {
        board: board,
        currentPlayer: 'X',
        selectedPiece: { row: 0, col: 0 },
        round: 0,
        hasSelectedPiece: false,
        possibleMoves: [],
        message: '',
        stopDrawing: false,
    };
}

function updatePossibleMoves(gameState) {
    gameState.possibleMoves = []; // Reset possible moves

    let dir = gameState.currentPlayer === 'X' ? 1 : -1; // Direction of movement based on player
    let enemy = gameState.currentPlayer === 'X' ? 'O' : 'X';

    let row = gameState.selectedPiece.row;
    let col = gameState.selectedPiece.col;

    // Check for forward moves
    if (row + dir >= 0 && row + dir < 8) {
        if (col - 1 >= 0 && gameState.board[row + dir][col - 1] === ' ') {
            gameState.possibleMoves.push({ row: row + dir, col: col - 1 });
        }
        if (col + 1 < 8 && gameState.board[row + dir][col + 1] === ' ') {
            gameState.possibleMoves.push({ row: row + dir, col: col + 1 });
        }
    }

    // Check for captures
    if (row + 2 * dir >= 0 && row + 2 * dir < 8) {
        if (col - 2 >= 0 && gameState.board[row + dir][col - 1] === enemy && gameState.board[row + 2 * dir][col - 2] === ' ') {
            gameState.possibleMoves.push({ row: row + 2 * dir, col: col - 2 });
        }
        if (col + 2 < 8 && gameState.board[row + dir][col + 1] === enemy && gameState.board[row + 2 * dir][col + 2] === ' ') {
            gameState.possibleMoves.push({ row: row + 2 * dir, col: col + 2 });
        }
    }
}

function drawGameState(gameState) {
    if (gameState.stopDrawing) return;

    let output = '';
    output += `Current player: ${gameState.currentPlayer}\n`;
    output += `Selected piece: ${gameState.selectedPiece.row}, ${gameState.selectedPiece.col}\n`;
    output += `Round: ${gameState.round}\n`;
    output += `Possible moves: ${JSON.stringify(gameState.possibleMoves)}\n`;
    output += '--------------------------\n';
    for (let i = 0; i < 8; i++) {
        let row = '|';
        for (let j = 0; j < 8; j++) {
            let cell = gameState.board[i][j];
            if (i === gameState.selectedPiece.row && j === gameState.selectedPiece.col) {
                row += '[' + cell + ']';
            } else if (gameState.hasSelectedPiece && canMoveOrCapture(gameState, i, j)) {
                // Indicate possible move or capture
                row += cell === ' ' ? '> <' : `${gameState.currentPlayer === 'X' ? ' O ' : ' X '}`;
            } else {
                row += ' ' + cell + ' ';
            }
        }
        row += '|';
        output += row + '\n';
    }
    output += '--------------------------\n';
    output += gameState.hasSelectedPiece ? `Use arrow keys to navigate and 'spacebar' to select\n` : `'c' to unselect and 'spacebar' to move\n`;
    output += gameState.message;
    console.clear();
    console.log(output);
}

function canMoveOrCapture(gameState, row, col) {
    // Simplified logic to check for possible moves or captures
    let dir = gameState.currentPlayer === 'X' ? 1 : -1; // Direction of movement based on player
    let enemy = gameState.currentPlayer === 'X' ? 'O' : 'X';
    // Check for forward moves
    if (gameState.board[row][col] === ' ' && Math.abs(row - gameState.selectedPiece.row) === 1 && Math.abs(col - gameState.selectedPiece.col) === 1) {
        return true; // Empty and diagonal to the selected piece
    }
    // Check for captures
    if (gameState.board[row][col] === enemy && Math.abs(row - gameState.selectedPiece.row) === 1 && Math.abs(col - gameState.selectedPiece.col) === 1) {
        // Further checks for capture logic can be added here
        return true; // Enemy piece in a diagonal position
    }
    return false;
}
