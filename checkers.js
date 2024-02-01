const readline = require('readline');
const keypress = require('keypress');

keypress(process.stdin);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let gameState = initializeGameState();

drawGameState(gameState);

let lastKeyPressTime = 0;

process.stdin.on('keypress', function (ch, key) {
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

                break;
        }
    }

    drawGameState(gameState);
});

function moveSelection(rowChange, colChange) {
    let newRow = gameState.selectedPiece.row + rowChange;
    let targetFound = false;

    if (colChange === 0 && (newRow >= 0 && newRow < 8)) {
        let leftCol = gameState.selectedPiece.col;
        let rightCol = gameState.selectedPiece.col;
        while (leftCol >= 0 || rightCol < 8) {
            if (leftCol >= 0 && gameState.board[newRow][leftCol] === gameState.currentPlayer) {
                gameState.selectedPiece.row = newRow;
                gameState.selectedPiece.col = leftCol;
                targetFound = true;
                break;
            }
            if (rightCol < 8 && gameState.board[newRow][rightCol] === gameState.currentPlayer) {
                gameState.selectedPiece.row = newRow;
                gameState.selectedPiece.col = rightCol;
                targetFound = true;
                break;
            }
            leftCol--;
            rightCol++;
        }

        if (!targetFound && rowChange !== 0) {
            newRow += rowChange;
            if (newRow >= 0 && newRow < 8) {
                leftCol = gameState.selectedPiece.col;
                rightCol = gameState.selectedPiece.col;
                while (leftCol >= 0 || rightCol < 8) {
                    if (leftCol >= 0 && gameState.board[newRow][leftCol] === gameState.currentPlayer) {
                        gameState.selectedPiece.row = newRow;
                        gameState.selectedPiece.col = leftCol;
                        targetFound = true;
                        break;
                    }
                    if (rightCol < 8 && gameState.board[newRow][rightCol] === gameState.currentPlayer) {
                        gameState.selectedPiece.row = newRow;
                        gameState.selectedPiece.col = rightCol;
                        targetFound = true;
                        break;
                    }
                    leftCol--;
                    rightCol++;
                }
            }
        }
    } else if (newRow >= 0 && newRow < 8) {
        let newCol = gameState.selectedPiece.col + colChange * 2;
        if (newCol >= 0 && newCol < 8 && gameState.board[newRow][newCol] === gameState.currentPlayer) {
            gameState.selectedPiece.row = newRow;
            gameState.selectedPiece.col = newCol;
            targetFound = true;
        }
    }
}

function moveSelectionWithoutChecks(rowChange, colChange) {
    gameState.selectedPiece.row += rowChange;
    gameState.selectedPiece.col += colChange;
}

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
        round: 1,
    };
}

function drawGameState(gameState) {
    console.clear();
    console.log(`Current player: ${gameState.currentPlayer}`);
    console.log(`Selected piece: ${gameState.selectedPiece.row}, ${gameState.selectedPiece.col}`);
    console.log(`Round: ${gameState.round}`);
    for (let i = 0; i < 8; i++) {
        let row = '';
        for (let j = 0; j < 8; j++) {
            if (i === gameState.selectedPiece.row && j === gameState.selectedPiece.col) {
                row += '[' + gameState.board[i][j] + '] ';
            } else {
                row += ' ' + gameState.board[i][j] + '  ';
            }
        }
        console.log(row);
    }
}