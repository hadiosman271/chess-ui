// State of the game
let game = {
    start_fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    turn: 'w',
    ep_square: '-',
    castling_rights: 'KQkq',
    hmoves: 0,
    fmoves: 1,
    moves: [],
    legal_moves: [],
    check_white: false,
    check_black: false
};

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

// Returns the piece currently on the square or null if empty
function get_piece(file, rank) {
    let piece = document.getElementById('piece-' + to_square(file, rank));
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

function get_color(file, rank) {
    let piece = get_piece(file, rank);
    if (piece != null) {
        return piece == piece.toUpperCase() ? 'w' : 'b';
    }

    return '';
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
                let from = to_coords(move.slice(0, 2));
                let to = to_coords(move.slice(2, 4));

                // Handle promotion
                let piece = get_piece(from.file, from.rank);
                if (piece != null && piece.toLowerCase() == 'p'
                    && to.rank == (game.turn == 'w' ? 7 : 0)) {
                    for (let p of 'rnbq') {
                        if (document.getElementById('promote-' + p).checked) {
                            move += p;
                        }
                    }
                }
                if (game.legal_moves.includes(move)) {
                    make_move(move);
                    update_legal_moves();
                }
            });

            document.getElementById('board').appendChild(square);
        }
    }
}

// Places a piece on a square
function place_piece(piece, file, rank) {
    let color;
    if (piece == piece.toLowerCase()) {
        color = 'b';
    }
    else if (piece == piece.toUpperCase()) {
        color = 'w';
    }

    img = document.createElement('img');
    img.setAttribute('class', 'piece');
    img.setAttribute('src', 'assets/cburnett/' + color + piece.toUpperCase() + '.svg');
    img.setAttribute('id', 'piece-' + to_square(file, rank));
    img.setAttribute('draggable', 'true');

    img.addEventListener('dragstart', function (e) {
        this.style.opacity = '0.4';
        e.dataTransfer.setData('text', e.target.id);

        for (let move of game.legal_moves) {
            if (move.slice(0, 2) == e.target.id.slice(-2, e.target.id.length)) {
                let to = to_coords(move.slice(2, 4));
                let color = '#637d3c9f'; // green
                if (get_piece(to.file, to.rank) != null || move.slice(2, 4) == game.ep_square) {
                    color = '#b02a2a9f'; // red
                }
                document.getElementById('square-' + move.slice(2, 4)).style.backgroundColor = color;
            }
        }
    });
    img.addEventListener('dragend', function (e) {
        this.style.opacity = '1';

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                document.getElementById('square-' + to_square(j, i)).style.backgroundColor = 'transparent';
            }
        }
    });

    document.getElementById('square-' + to_square(file, rank)).appendChild(img);
}

// Removes the piece on the square
function remove_piece(file, rank) {
    let piece = document.getElementById('piece-' + to_square(file, rank));
    if (piece != null) {
        piece.remove();
    }
}

function load_fen(fen) {
    // Clear the board
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            remove_piece(i, j);
        }
    }

    // Split the FEN leto its sections
    let part = fen.split(' ');

    let file = 0;
    let rank = 7; // Going from top to bottom
    for (let i = 0; i < part[0].length && rank >= 0; i++) {
        // If its a piece letter, place the piece
        if ('rnbqkp'.indexOf(fen[i].toLowerCase()) != -1) {
            place_piece(fen[i], file++, rank);
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
    game.fen = fen;
    game.turn = part[1];
    game.castling_rights = part[2];
    game.ep_square = part[3];
    game.hmoves = parseInt(part[4]);
    game.fmoves = parseInt(part[5]);

    // Clear the move list
    game.moves = [];
    document.getElementById('move-list').innerHTML = '';
}

// Updates the list of legal moves for the current color
function update_legal_moves() {
    game.legal_moves = [];
    // For every piece of the current color
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (get_color(j, i) == game.turn) {
                switch (get_piece(j, i).toLowerCase()) {
                case 'r':
                    add_rook_moves(j, i);
                    break;
                case 'n':
                    add_knight_moves(j, i);
                    break;
                case 'b':
                    add_bishop_moves(j, i);
                    break;
                case 'q':
                    add_queen_moves(j, i);
                    break;
                case 'k':
                    add_king_moves(j, i);
                    break;
                case 'p':
                    add_pawn_moves(j, i);
                    break;
                }
            }
        }
    }

    // Update the status
    if (game.legal_moves.length == 0) {
        if (game.turn == 'w' ? game.check_white : game.check_black) {
            document.getElementById('status').innerHTML = 'Checkmate';
        }
        else {
            document.getElementById('status').innerHTML = 'Stalemate';
        }
    }
    else {
        document.getElementById('status').innerHTML = (game.turn == 'w' ? 'White' : 'Black') + '\'s turn';
    }
}

function in_check() {
    // Find the king
    let king = null;
    for (let i = 0; i < 8 && king == null; i++) {
        for (let j = 0; j < 8 && king == null; j++) {
            if (get_piece(j, i) == (game.turn == 'w' ? 'K' : 'k')) {
                king = { file: j, rank: i };
            }
        }
    }
    let file = king.file;
    let rank = king.rank;

    // Check the squares where a piece can check the king
    // Knight moves
    let moves = [
        { file: -2, rank: -1 }, { file: -2, rank: 1 }, { file: -1, rank: -2 }, { file: -1, rank: 2 },
        { file: 2, rank: -1 }, { file: 2, rank: 1 }, { file: 1, rank: -2 }, { file: 1, rank: 2 }
    ];
    for (let move of moves) {
        let f = file + move.file;
        let r = rank + move.rank;
        if (f >= 0 && f < 8 && r >= 0 && r < 8 && get_piece(f, r) == (game.turn == 'w' ? 'n' : 'N')) {
            return true;
        }
    }

    // Rook/Queen moves
    for (let up = rank + 1; up < 8; up++) {
        if (get_color(file, up) != game.turn) {
            if (get_piece(file, up) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(file, up) == (game.turn == 'w' ? 'r' : 'R')) {
                return true;
            }
            else if (get_piece(file, up) != null) {
                break;
            }
        }
        else {
            break;
        }
    }
    for (let down = rank - 1; down >= 0; down--) {
        if (get_color(file, down) != game.turn) {
            if (get_piece(file, down) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(file, down) == (game.turn == 'w' ? 'r' : 'R')) {
                return true;
            }
            else if (get_piece(file, down) != null) {
                break;
            }
        }
        else {
            break;
        }
    }
    for (let left = file - 1; left >= 0; left--) {
        if (get_color(left, rank) != game.turn) {
            if (get_piece(left, rank) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(left, rank) == (game.turn == 'w' ? 'r' : 'R')) {
                return true;
            }
            else if (get_piece(left, rank) != null) {
                break;
            }
        }
        else {
            break;
        }
    }
    for (let right = file + 1; right < 8; right++) {
        if (get_color(right, rank) != game.turn) {
            if (get_piece(right, rank) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(right, rank) == (game.turn == 'w' ? 'r' : 'R')) {
                return true;
            }
            else if (get_piece(right, rank) != null) {
                break;
            }
        }
        else {
            break;
        }
    }

    // Bishop/Queen moves
    for (let right = file + 1, up = rank + 1; right < 8 && up < 8; right++, up++) {
        if (get_color(right, up) != game.turn) {
            if (get_piece(right, up) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(right, up) == (game.turn == 'w' ? 'b' : 'B')) {
                return true;
            }
            else if (get_piece(right) != null) {
                break;
            }
        }
        else {
            break;
        }
    }
    for (let right = file + 1, down = rank - 1; right < 8 && down >= 0; right++, down--) {
        if (get_color(right, down) != game.turn) {
            if (get_piece(right, down) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(right, down) == (game.turn == 'w' ? 'b' : 'B')) {
                return true;
            }
            else if (get_piece(right, down) != null) {
                break;
            }
        }
        else {
            break;
        }
    }
    for (let left = file - 1, down = rank - 1; left >= 0 && down >= 0; left--, down--) {
        if (get_color(left, down) != game.turn) {
            if (get_piece(left, down) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(left, down) == (game.turn == 'w' ? 'b' : 'B')) {
                return true;
            }
            else if (get_piece(left, down) != null) {
                break;
            }
        }
        else {
            break;
        }
    }
    for (let left = file - 1, up = rank + 1; left >= 0 && up < 8; left--, up++) {
        if (get_color(left, up) != game.turn) {
            if (get_piece(left, up) == (game.turn == 'w' ? 'q' : 'Q')
                || get_piece(left, up) == (game.turn == 'w' ? 'b' : 'B')) {
                return true;
            }
            else if (get_piece(left, up) != null) {
                break;
            }
        }
        else {
            break;
        }
    }

    // Pawn moves
    moves = [
        { file: -1, rank: game.turn == 'w' ? 1 : -1}, { file: 1, rank: game.turn == 'w' ? 1 : -1}
    ];
    for (let move of moves) {
        let f = file + move.file;
        let r = rank + move.rank;
        if (f >= 0 && f < 8 && r >= 0 && r < 8 && get_piece(f, r) == (game.turn == 'w' ? 'p' : 'P')) {
            return true;
        }
    }

    // King moves
    moves = [
        { file: -1, rank: -1 }, { file: -1, rank: 0 }, { file: -1, rank: 1 }, { file: 0, rank: -1 },
        { file: 0, rank: 1 }, { file: 1, rank: -1 }, { file: 1, rank: 0 }, { file: 1, rank: 1 }
    ];
    for (let move of moves) {
        let f = file + move.file;
        let r = rank + move.rank;
        if (f >= 0 && f < 8 && r >= 0 && r < 8 && get_piece(f, r) == (game.turn == 'w' ? 'k' : 'K')) {
            return true;
        }
    }

    return false;
}

function add_legal_move(from_file, from_rank, to_file, to_rank, promote = '') {
    let move = to_square(from_file, from_rank) + to_square(to_file, to_rank) + promote;
    // Check if move puts king in check
    // This part slows the program down
    make_move(move);
    if (game.turn == 'b' ? !game.check_white : !game.check_black) {
        game.legal_moves.push(move);
    }
    undo_last_move();
}

function add_rook_moves(file, rank) {
    // Check all directions until another piece or the end of the board
    // Up
    for (let up = rank + 1; up < 8; up++) {
        if (get_color(file, up) != game.turn) {
            add_legal_move(file, rank, file, up);
            if (get_color(file, up) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
    // Down
    for (let down = rank - 1; down >= 0; down--) {
        if (get_color(file, down) != game.turn) {
            add_legal_move(file, rank, file, down);
            if (get_color(file, down) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
    // Left
    for (let left = file - 1; left >= 0; left--) {
        if (get_color(left, rank) != game.turn) {
            add_legal_move(file, rank, left, rank);
            if (get_color(left, rank) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
    // Right
    for (let right = file + 1; right < 8; right++) {
        if (get_color(right, rank) != game.turn) {
            add_legal_move(file, rank, right, rank);
            if (get_color(right, rank) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
}

function add_knight_moves(file, rank) {
    // Knight moves
    let moves = [
        { file: -2, rank: -1 }, { file: -2, rank: 1 }, { file: -1, rank: -2 }, { file: -1, rank: 2 },
        { file: 2, rank: -1 }, { file: 2, rank: 1 }, { file: 1, rank: -2 }, { file: 1, rank: 2 }
    ];
    for (let move of moves) {
        let f = file + move.file;
        let r = rank + move.rank;
        if (f >= 0 && f < 8 && r >= 0 && r < 8 && get_color(f, r) != game.turn) {
            add_legal_move(file, rank, f, r);
        }
    }
}

function add_bishop_moves(file, rank) {
    // Check diagonals
    // Up-right
    for (let right = file + 1, up = rank + 1; right < 8 && up < 8; right++, up++) {
        if (get_color(right, up) != game.turn) {
            add_legal_move(file, rank, right, up);
            if (get_color(right, up) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
    // Down-right
    for (let right = file + 1, down = rank - 1; right < 8 && down >= 0; right++, down--) {
        if (get_color(right, down) != game.turn) {
            add_legal_move(file, rank, right, down);
            if (get_color(right, down) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
    // Down-left
    for (let left = file - 1, down = rank - 1; left >= 0 && down >= 0; left--, down--) {
        if (get_color(left, down) != game.turn) {
            add_legal_move(file, rank, left, down);
            if (get_color(left, down) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
    // Up-left
    for (let left = file - 1, up = rank + 1; left >= 0 && up < 8; left--, up++) {
        if (get_color(left, up) != game.turn) {
            add_legal_move(file, rank, left, up);
            if (get_color(left, up) != '') {
                break;
            }
        }
        else {
            break;
        }
    }
}

function add_queen_moves(file, rank) {
    // Queen moves like a rook and a bishop
    add_rook_moves(file, rank);
    add_bishop_moves(file, rank);
}

// Dosent reject castling if the rook could be captured after (but it should)
function add_king_moves(file, rank) {
    // If kingside castling is allowed and not in check
    if (game.castling_rights.includes(game.turn == 'w' ? 'K' : 'k') && game.turn == 'w' ? !game.check_white : !game.check_white) {
        if (get_color(file + 1, rank) == '' && get_color(file + 2, rank) == '') {
            add_legal_move(file, rank, 6, game.turn == 'w' ? 0 : 7);
        }
    }
    // If queenside castling is allowed and not in check
    if (game.castling_rights.includes(game.turn == 'w' ? 'Q' : 'q') && game.turn == 'w' ? !game.check_white : !game.check_white) {
        if (get_color(file - 1, rank) == '' && get_color(file - 2, rank) == '') {
            add_legal_move(file, rank, 2, game.turn == 'w' ? 0 : 7);
        }
    }

    let moves = [
        { file: -1, rank: -1 }, { file: -1, rank: 0 }, { file: -1, rank: 1 }, { file: 0, rank: -1 },
        { file: 0, rank: 1 }, { file: 1, rank: -1 }, { file: 1, rank: 0 }, { file: 1, rank: 1 }
    ];
    for (let move of moves) {
        let f = file + move.file;
        let r = rank + move.rank;
        if (f >= 0 && f < 8 && r >= 0 && r < 8 && get_color(f, r) != game.turn) {
            add_legal_move(file, rank, f, r);
        }
    }
}

function add_pawn_moves(file, rank) {
    let other = game.turn == 'w' ? 'b' : 'w';
    let promote = ['q', 'r', 'n', 'b'];
    let dir = game.turn == 'w' ? 1 : -1;
    let r = rank + dir;
    let ep = to_coords(game.ep_square);
    ep = ep == null ? { file: -1, rank: -1 } : ep;
    if (r >= 0 && r < 8) {
        // Capturing forward and left
        if (get_color(file - 1, r) == other || (file - 1 == ep.file && r == ep.rank)) {
            if (r == (game.turn == 'w' ? 7 : 0)) {
                for (let i = 0; i < promote.length; i++) {
                    add_legal_move(file, rank, file - 1, r, promote[i]);
                }
            }
            else {
                add_legal_move(file, rank, file - 1, r);
            }
        }
        // Capturing forward and right
        if (get_color(file + 1, r) == other || (file + 1 == ep.file && r == ep.rank)) {
            if (r == (game.turn == 'w' ? 7 : 0)) {
                for (let i = 0; i < 4; i++) {
                    add_legal_move(file, rank, file + 1, r, promote[i]);
                }
            }
            else {
                add_legal_move(file, rank, file + 1, r);
            }
        }
        // Moving forward
        if (get_color(file, r) == '') {
            if (r == (game.turn == 'w' ? 7 : 0)) {
                for (let i = 0; i < 4; i++) {
                    add_legal_move(file, rank, file, r, promote[i]);
                }
            }
            else {
                add_legal_move(file, rank, file, r);
            }

            // Moving twice
            if (rank == (game.turn == 'w' ? 1 : 6) && get_color(file, rank + dir * 2) == '') {
                add_legal_move(file, rank, file, rank + dir * 2);
            }
        }
    }
}

function make_move(move) {
    let from = to_coords(move.slice(0, 2));
    let to = to_coords(move.slice(2, 4));
    let promote = '';
    if (move.length == 5) {
        promote = move[4];
    }

    let piece = get_piece(from.file, from.rank);

    // Half-move clock resets when a pawn is moved or a piece is captured
    if (piece.toLowerCase() == 'p' || get_piece(to.file, to.rank) != null || to == game.ep_square) {
        game.hmoves = 0;
    }
    else {
        game.hmoves++;
    }

    remove_piece(from.file, from.rank);
    // If moving the king
    if (piece.toLowerCase() == 'k') {
        // If castling
        if (['e1g1', 'e8g8', 'e1c1', 'e8c8'].indexOf(move) != -1) {
            switch (move) {
            case 'e1g1':
                remove_piece(7, 0); // h1
                place_piece('R', 5, 0); // f1
                break;
            case 'e1c1':
                remove_piece(0, 0); // a1
                place_piece('R', 3, 0); // d1
                break;
            case 'e8g8':
                remove_piece(7, 7); // h8
                place_piece('r', 5, 7); // f8
                break
            case 'e8c8':
                remove_piece(0, 7); // a8
                place_piece('r', 3, 7); // d8
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
        if (from.file == 7) {
            // Remove kingside castling rights
            game.castling_rights = game.castling_rights.replace(new RegExp((game.turn == 'w' ? 'K' : 'k'), 'g'), '');
            if (game.castling_rights == '') {
                game.castling_rights = '-';
            }
        }
        else if (from.file == 0) {
            // Remove queenside castling rights
            game.castling_rights = game.castling_rights.replace(new RegExp((game.turn == 'w' ? 'Q' : 'k'), 'g'), '');
            if (game.castling_rights == '') {
                game.castling_rights = '-';
            }
        }
    }
    // If the king's rook is captured
    if (to.file == 7 && to.rank == (game.turn == 'w' ? 0 : 7) && get_piece(to.file, to.rank) == (game.turn == 'w' ? 'R' : 'r')) {
        // Remove kingside castling rights
        game.castling_rights = game.castling_rights.replace(new RegExp((game.turn == 'w' ? 'K' : 'k'), 'g'), '');
        if (game.castling_rights == '') {
            game.castling_rights = '-';
        }
    }
    // If the queen's rook is captured
    if (to.file == 0 && to.rank == (game.turn == 'w' ? 0 : 7) && get_piece(to.file, to.rank) == (game.turn == 'w' ? 'R' : 'r')) {
        // Remove queenside castling rights
        game.castling_rights = game.castling_rights.replace(new RegExp((game.turn == 'w' ? 'Q' : 'k'), 'g'), '');
        if (game.castling_rights == '') {
            game.castling_rights = '-';
        }
    }

    // If this move is en passant
    if (piece.toLowerCase() == 'p' && to_square(to.file, to.rank) == game.ep_square) {
        let coords = to_coords(game.ep_square);
        // Remove the captured pawn
        remove_piece(coords.file, coords.rank + (game.turn == 'w' ? -1 : 1));
    }
    else {
        remove_piece(to.file, to.rank);
    }
    // If this move is a promotion
    if (promote != '') {
        // Place the piece the pawn has promoted to
        place_piece(game.turn == 'w' ? promote.toUpperCase() : promote, to.file, to.rank);
    }
    else {
        place_piece(piece, to.file, to.rank);
    }

    // Update en passant square
    if (piece.toLowerCase() == 'p' && Math.abs(to.rank - from.rank) == 2) {
        game.ep_square = to_square(from.file, from.rank + (game.turn == 'w' ? 1 : -1));
    }
    else {
        game.ep_square = '-';
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
    let turn = game.turn == 'w' ? 'b' : 'w';

    game.turn = 'w';
    game.check_white = in_check();
    game.turn = 'b';
    game.check_black = in_check();

    game.turn = turn;
}

function undo_last_move() {
    // Remove the last move from the move list
    game.moves.splice(-1, 1);

    // Replay the game from the starting position
    let moves = game.moves;
    load_fen(game.start_fen);
    for (let move of moves) {
       make_move(move);
    }
}

create_squares();
load_fen(game.start_fen);
update_legal_moves();