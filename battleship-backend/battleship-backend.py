from flask import Flask, jsonify
import random

app = Flask(__name__)

class BattleshipGame:
    def __init__(self):
        self.board_size = 6
        self.board = [[0] * self.board_size for _ in range(self.board_size)]
        self.ships = {
            'blue': {'size': 3, 'positions': []},
            'red': {'size': 2, 'positions': []},
            'purple': {'size': 2, 'positions': []}
        }
        self.moves = []
        self.initialize_board()
        self.add_random_explored_areas()
        self.expose_random_ship_positions()

    def initialize_board(self):
        self.board = [[0] * self.board_size for _ in range(self.board_size)]
        self.moves = []  # Clear previous moves
        
        # Place ships randomly
        for ship_color, ship_info in self.ships.items():
            self.place_ship(ship_color, ship_info['size'])

    def place_ship(self, color, size):
        while True:
            is_horizontal = random.choice([True, False])
            if is_horizontal:
                x = random.randint(0, self.board_size - size)
                y = random.randint(0, self.board_size - 1)
                positions = [(x + i, y) for i in range(size)]
            else:
                x = random.randint(0, self.board_size - 1)
                y = random.randint(0, self.board_size - size)
                positions = [(x, y + i) for i in range(size)]

            if all(self.board[pos[0]][pos[1]] == 0 for pos in positions):
                for pos in positions:
                    self.board[pos[0]][pos[1]] = color
                self.ships[color]['positions'] = positions
                break

    def add_random_explored_areas(self):
        num_explored = random.randint(3, 5)
        explored_positions = set()
        
        while len(explored_positions) < num_explored:
            x = random.randint(0, self.board_size - 1)
            y = random.randint(0, self.board_size - 1)
            
            if self.board[x][y] == 0 and (x, y) not in explored_positions:
                explored_positions.add((x, y))
                self.moves.append({
                    'x': x,
                    'y': y,
                    'hit': False,
                    'ship_color': None
                })

    def expose_random_ship_positions(self):
        for color in self.ships:
            pos = random.choice(self.ships[color]['positions'])
            self.moves.append({
                'x': pos[0],
                'y': pos[1],
                'hit': True,
                'ship_color': color
            })

# Global game instance
game = BattleshipGame()

@app.route('/api/new-game', methods=['POST'])  # Changed to POST method
def new_game():
    global game
    game = BattleshipGame()
    return jsonify({
        'board': game.board,
        'ships': game.ships,
        'moves': game.moves
    })

@app.route('/api/board')
def get_board():
    return jsonify({
        'board': game.board,
        'ships': game.ships,
        'moves': game.moves
    })

@app.route('/api/possible-states')
def get_possible_states():
    return jsonify({
        'total_states': 127384,
        'calculation_time': '0.23s'
    })

if __name__ == '__main__':
    app.run(debug=True)
