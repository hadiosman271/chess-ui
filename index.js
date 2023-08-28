// State of the game
let game = {
    turn: 'w',
    ep_square: '-',
    castling_rights: 'KQkq',
    hmoves: 0,
    fmoves: 1,
    moves: [],
    in_check: false
};

const startpos = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Converts coordinates to a square
function to_square(file, rank) {
    return String.fromCharCode(file + 'a'.charCodeAt(0))
        + String.fromCharCode(rank + '1'.charCodeAt(0));
}

// Converts a square (eg. 'e4') to a coordinate object (0 indexed)
function to_coords(square) {
    if (square.length == 2) {
        return {
            file: square.charCodeAt(0) - 'a'.charCodeAt(0),
            rank: square.charCodeAt(1) - '1'.charCodeAt(0),
        }
    }
    else {
        return null;
    }
}

// Returns the piece currently on the square
function get_piece(square) {
    let piece = document.getElementById('piece-' + square);
    if (piece != null) {
        piece = piece.getAttribute('src').slice(-6, -4);
        // White is uppercase, black is lowercase
        if (piece[0] == 'w') {
            return piece[1].toUpperCase();
        }
        else if (piece[0] == 'b') {
            return piece[1].toLowerCase();
        }
    }
    return null;
}

// Places a piece on a square
function place_piece(piece, square) {
    let color;
    if (piece === piece.toLowerCase()) {
        color = 'b';
    }
    else if (piece === piece.toUpperCase()) {
        color = 'w';
    }

    img = document.createElement('img');
    img.setAttribute('class', 'piece');
    img.setAttribute('src', 'assets/cburnett/' + color + piece.toUpperCase() + '.svg');
    img.setAttribute('id', 'piece-' + square);
    img.setAttribute('draggable', 'true');

    img.addEventListener('dragstart', function (e) {
        this.style.opacity = '0.4';
        e.dataTransfer.setData('text', e.target.id);
    });
    img.addEventListener('dragend', function (e) {
        this.style.opacity = '1';
    });

    document.getElementById('square-' + square).appendChild(img);
}

// Removes the piece on the square
function remove_piece(square) {
    let piece = document.getElementById('piece-' + square);
    if (piece != null) {
        piece.remove();
    }
}

// Initalizes all squares on the board
function create_squares() {
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            square = document.createElement('div');
            square.setAttribute('class', 'square');
            square.setAttribute('id', 'square-' + to_square(j, i));

            // Position of the square
            square.style.left = j * 12.5 + '%';
            square.style.bottom = i * 12.5 + '%';

            square.addEventListener('dragover', function (e) {
                e.preventDefault();
            });
            // Called when a piece is dropped into the square
            square.addEventListener('drop', function (e) {
                e.preventDefault();
                let id = e.dataTransfer.getData("text");
                let move = id.slice(-2, id.length) + e.target.id.slice(-2, e.target.id.length);
                
                // Handle promotion
                if (get_piece(move.slice(0, 2)).toLowerCase() == 'p'
                    && move[3] == (game.turn == 'w' ? '8' : '1')) {
                    for (let p of 'rnbq') {
                        if (document.getElementById(p).checked) {
                            move += p;
                        }
                    }
                }
                if (valid_move(move)) {
                    make_move(move);
                }
                else {
                    console.error('Invalid move');
                }
            });

            document.getElementById('board').appendChild(square);
        }
    }
}

function load_fen(fen) {
    // TODO: validate FEN before loading

    // Clear the board
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            remove_piece(to_square(i, j));
        }
    }

    // Split the FEN into its sections
    let part = fen.split(' ');

    let file = 0;
    let rank = 7; // Going from top to bottom
    for (let i = 0; i < part[0].length && rank >= 0; i++) {
        // If its a piece letter, place the piece
        if ('rnbqkp'.indexOf(fen[i].toLowerCase()) != -1) {
            place_piece(fen[i], to_square(file++, rank));
        }
        // If its a number, skip that many squares
        else if (fen.charCodeAt(i) - '0'.charCodeAt(0) > 0
            && fen.charCodeAt(i) - '0'.charCodeAt(0) <= 8) {
            file += fen.charCodeAt(i) - '0'.charCodeAt(0);
        }
        // Move to the next rank
        if (file == 8) {
            file = 0;
            rank--;
        }
    }

    // Set the game state
    game.turn = part[1];
    game.castling_rights = part[2];
    game.ep_square = part[3];
    game.hmoves = parseInt(part[4]);
    game.fmoves = parseInt(part[5]);

    // Clear the move list
    game.moves = [];
    document.getElementById('move-list').innerHTML = '';
}

function make_move(move) {
    let start = move.slice(0, 2);
    let dest = move.slice(2, 4);

    let piece = get_piece(start);

    // Half-move clock resets when a pawn is moved or a piece is captured
    if (piece.toLowerCase() == 'p' || get_piece(dest) != null || dest == game.ep_square) {
        game.hmoves = 0;
    }
    else {
        game.hmoves++;
    }

    remove_piece(start);
    // If moving the king
    if (piece.toLowerCase() == 'k') {
        // If castling
        if (['e1g1', 'e8g8', 'e1c1', 'e8c8'].indexOf(move) != -1) {
            switch (move) {
            case 'e1g1':
                remove_piece('h1');
                place_piece('R', 'f1');
                break;
            case 'e1c1':
                remove_piece('a1');
                place_piece('R', 'd1');
                break;
            case 'e8g8':
                remove_piece('h8');
                place_piece('r', 'f8');
                break
            case 'e8c8':
                remove_piece('a8');
                place_piece('r', 'd8');
                break;
            }
        }
        // Remove all castling rights
        game.castling_rights = game.castling_rights.replace(new RegExp('[' + (game.turn == 'w' ? 'KQ' : 'kq') + ']', 'g'), '');
        if (game.castling_rights == '') {
            game.castling_rights = '-';
        }
    }
    // If a rook is moved for the first time
    else if (piece.toLowerCase() == 'r') {
        if (start[0] == 'h') {
            // Remove kingside castling rights
            game.castling_rights = game.castling_rights.replace(new RegExp((game.turn == 'w' ? 'K' : 'k'), 'g'), '');
            if (game.castling_rights == '') {
                game.castling_rights = '-';
            }
        }
        else if (start[0] == 'a') {
            // Remove queenside castling rights
            game.castling_rights = game.castling_rights.replace(new RegExp((game.turn == 'w' ? 'Q' : 'k'), 'g'), '');
            if (game.castling_rights == '') {
                game.castling_rights = '-';
            }
        }
    }
    // If this move is en passant
    else if (piece.toLowerCase() == 'p' && dest == game.ep_square) {
        let coords = to_coords(game.ep_square);
        // Remove the captured pawn
        remove_piece(to_square(coords.file, coords.rank + (game.turn == 'w' ? -1 : 1)));
    }
    else {
        remove_piece(dest);
    }
    // If this move is a promotion
    if (move.length == 5) {
        // Place the piece the pawn has promoted to
        place_piece(game.turn == 'w' ? move[4].toUpperCase() : move[4], dest);
    }
    else {
        place_piece(piece, dest);
    }

    // Update the move list
    document.getElementById('move-list').innerHTML +=
        (game.turn == 'w' ? game.fmoves + '. ' : '') + move + ' ';
    game.moves.push(move);

    // Update the full-move clock
    if (game.turn == 'b') {
        game.fmoves++;
    }

    // Switch colors
    game.turn = game.turn == 'w' ? 'b' : 'w';
}

function undo_last_move() {
    // Remove the last move from the move list
    game.moves.splice(-1, 1);

    // Replay the game from the starting position
    let moves = game.moves;
    load_fen(startpos);
    for (let move of moves) {
       make_move(move);
    }
}

function has_white_piece(square) {
    let piece = get_piece(square);
    if (piece == null) {
        return false;
    }
    else {
        return piece == piece.toUpperCase();
    }
}

function has_black_piece(square) {
    let piece = get_piece(square);
    if (piece == null) {
        return false;
    }
    else {
        return piece == piece.toLowerCase();
    }
}

function valid_move(move) {
    if (move.length != 4 && move.length != 5) {
        return false;
    }
    // If the promotion isnt possible
    if (move.length == 5 && ('rnbq'.indexOf(move[4]) == -1)
        && get_piece(move.slice(0, 2)).toLowerCase() != 'p') {
        return false;
    }

    // If any coordinate is out of range
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));
    if (from.file < 0 || from.file >= 8
        || from.rank < 0 || from.rank >= 8
        || to.file < 0 || to.file >= 8
        || to.rank < 0 || to.rank >= 8) {
        console.error('Coordinate out of range');
        return false;
    }

    let start = move.slice(0, 2);
    let dest = move.slice(2, 4);

    // If there is no piece on the start square
    if (get_piece(start) == null) {
        console.error('No piece on', start);
        return false;
    }

    // If the start square has the wrong piece color
    if ((has_black_piece(start) && game.turn != 'b')
        || (has_white_piece(start) && game.turn != 'w')) {
        console.error('Wrong piece color');
        return false;
    }

    // If both squares are occupied by pieces of the same color
    if (has_black_piece(start) && has_black_piece(dest)
        || has_white_piece(start) && has_white_piece(dest)) {
        console.error('Cannot capture own pieces');
        return false;
    }

    // Check if move breaks the rules for its piece type
    switch (get_piece(start).toLowerCase()) {
    case 'r':
        if (!valid_rook_move(move)) {
            return false;
        }
        break;
    case 'n':
        if (!valid_knight_move(move)) {
            return false;
        }
        break;
    case 'b':
        if (!valid_bishop_move(move)) {
            return false;
        }
        break;
    case 'q':
        if (!valid_queen_move(move)) {
            return false;
        }
        break;
    case 'k':
        if (!valid_king_move(move)) {
            return false;
        }
        break;
    case 'p':
        if (!valid_pawn_move(move)) {
            return false;
        }
    }

    // TODO: Check if move leaves king in check

    return true;
}

function valid_rook_move(move) {
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));

    // If both squares are on the same rank/file,
        // scan the rank/file for any blocking pieces
    if (from.file == to.file) {
        let dir = to.rank > from.rank ? 1 : -1;
        for (let rank = from.rank + dir; rank != to.rank; rank += dir) {
            if (get_piece(to_square(from.file, rank)) != null) {
                return false;
            }
        }
    }
    else if (from.rank == to.rank) {
        let dir = to.file > from.file ? 1 : -1;
        for (let file = from.file + dir; file != to.file; file += dir) {
            if (get_piece(to_square(file, from.rank)) != null) {
                return false;
            }
        }
    }
    else {
        return false;
    }
    return true;
}

function valid_knight_move(move) {
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));

    return (Math.abs(to.file - from.file) == 1 && Math.abs(to.rank - from.rank) == 2)
        || (Math.abs(to.file - from.file) == 2 && Math.abs(to.rank - from.rank) == 1);
}

function valid_bishop_move(move) {
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));

    // If not on the same diagonal
    if (Math.abs(to.file - from.file) != Math.abs(to.rank - from.rank)) {
        return false;
    }

    // Scan the diagonal for any blocking pieces
    let file_dir = to.file > from.file ? 1 : -1;
    let rank_dir = to.rank > from.rank ? 1 : -1;
    for (let file = from.file + file_dir, rank = from.rank + rank_dir;
        file != to.file && rank != to.rank;
        file += file_dir, rank += rank_dir) {
        if (get_piece(to_square(file, rank)) != null) {
            return false;
        }
    }

    return true;
}

function valid_queen_move(move) {
    return valid_rook_move(move) || valid_bishop_move(move);
}

function valid_king_move(move) {
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));

    // Castling kingside
    if (move == (game.turn == 'w' ? 'e1g1' : 'e8g8')
        && game.castling_rights.indexOf(game.turn == 'w' ? 'K' : 'k') != -1
        && valid_rook_move(game.turn == 'w' ? 'e1h1' : 'e8h8')) {
        return true;
    }
    // Castling queenside
    if (move == (game.turn == 'w' ? 'e1c1' : 'e8c8')
        && game.castling_rights.indexOf(game.turn == 'w' ? 'Q' : 'q') != -1
        && valid_rook_move(game.turn == 'w' ? 'e1b1' : 'e8b8')) {
        return true;
    }

    // Normal move
    if (Math.abs(to.file - from.file) <= 1 && Math.abs(to.rank - from.rank) <= 1) {
        return true;
    }

    return false;
}

function valid_pawn_move(move) {
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));

    // If the pawn is trying to move backward
    if (game.turn == 'w' && to.rank < from.rank) {
        return false;
    }
    else if (game.turn == 'b' && to.rank > from.rank) {
        return false;
    }

    switch (Math.abs(to.rank - from.rank)) {
    // One square forward
    case 1:
        switch (Math.abs(to.file - from.file)) {
        // Middle
        case 0:
            // If trying to capture forwards
            if (get_piece(to_square(to.file, to.rank)) != null) {
                return false;
            }
            // If on the 8th rank but no promotion piece is specified
            else if (to.rank == (game.turn == 'w' ? 7 : 0) && move.length != 5) {
                return false;
            }
            break;
        // Sides
        case 1:
            // If trying to move diagonally without capturing
            if (get_piece(to_square(to.file, to.rank)) == null) {
                let ep = to_coords(game.ep_square);
                // Check if en passant is possible
                if (ep == null || to.file != ep.file || to.rank != ep.rank) {
                    return false;
                }
            }
            // If captured to the 8th rank but no promotion piece is specified
            else if (to.rank == (game.turn == 'w' ? 7 : 0) && move.length != 5) {
                return false;
            }
            break;
        default:
            return false;
        }
        break;
    // Two squares forward
    case 2:
        // If path isnt blocked
        if (to.file - from.file == 0 && get_piece(to_square(to.file, to.rank)) == null) {
            // If not on the 2nd rank
            if (game.turn == 'w' && from.rank != 1) {
                return false;
            }
            else if (game.turn == 'b' && from.rank != 6) {
                return false;
            }

            // Update en passant square
            let ep = to_coords(move.slice(2, 4));
            game.ep_square = to_square(ep.file, ep.rank + (game.turn == 'w' ? -1 : 1));
        }
        else {
            return false;
        }
        break;
    default:
        return false;
    }

    return true;
}

create_squares();
load_fen(startpos);
// let moves = ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5"];
// for (let move of moves) {
//     make_move(move);
// }