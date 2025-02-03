'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info } from 'lucide-react';

const BattleshipBoard = () => {
  const [gameState, setGameState] = useState({
    board: Array(6).map(() => Array(6).fill(0)),
    ships: {},
    moves: []
  });
  const [loading, setLoading] = useState(false);
  const [newGameLoading, setNewGameLoading] = useState(false);
  const [possibleStates, setPossibleStates] = useState(null);

  const fetchBoard = async () => {
    try {
      const response = await fetch('/api/board');
      if (!response.ok) throw new Error('Failed to fetch board');
      const data = await response.json();
      setGameState(data);
      fetchPossibleStates();
    } catch (error) {
      console.error('Error fetching board:', error);
    }
  };

  const fetchPossibleStates = async () => {
    try {
      const response = await fetch('/api/possible-states');
      if (!response.ok) throw new Error('Failed to fetch possible states');
      const data = await response.json();
      setPossibleStates(data);
    } catch (error) {
      console.error('Error fetching possible states:', error);
    }
  };

  const startNewGame = async () => {
    try {
      setNewGameLoading(true);
      const response = await fetch('/api/new-game', {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Failed to start new game');
      
      const data = await response.json();
      setGameState(data);
      await fetchPossibleStates();
    } catch (error) {
      console.error('Error starting new game:', error);
    } finally {
      setNewGameLoading(false);
    }
  };

  const makeMove = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/move');
      if (!response.ok) throw new Error('Failed to make move');
      
      const move = await response.json();
      if (!move.error) {
        setGameState(prev => ({
          ...prev,
          moves: [...prev.moves, move]
        }));
      }
    } catch (error) {
      console.error('Error making move:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const getCellColor = (x, y) => {
    const move = gameState.moves.find(m => m.x === x && m.y === y);
    if (move) {
      return move.hit ? 
        (move.ship_color === 'blue' ? 'bg-blue-500/80' :
         move.ship_color === 'red' ? 'bg-red-500/80' :
         'bg-purple-500/80') : 
        'bg-gray-400/80';
    }
    return 'bg-white/50';
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row justify-between items-center">
        <div className="flex flex-col gap-2">
          <CardTitle>Taiwan Battleship Strategy Game</CardTitle>
          {possibleStates && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Info size={16} />
              <span>
                Possible Game States: {possibleStates.total_states.toLocaleString()}
                <span className="text-xs ml-2 text-gray-400">
                  (calc: {possibleStates.calculation_time})
                </span>
              </span>
            </div>
          )}
        </div>
        <Button 
          onClick={startNewGame} 
          disabled={newGameLoading || loading}
          variant="outline"
          className="w-32"
        >
          {newGameLoading ? 'Starting...' : 'New Game'}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-96 h-96 flex items-center justify-center">
            <div className="absolute inset-0">
              <img
                src="/api/placeholder/384/384"
                alt="Taiwan Map"
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="grid grid-cols-6 w-full h-full relative z-10" style={{ gridGap: 0 }}>
              {Array(6).map((_, x) => (
                Array(6).map((_, y) => (
                  <div
                    key={`${x}-${y}`}
                    className={`${getCellColor(x, y)} transition-colors backdrop-blur-sm border border-black/30`}
                    style={{ 
                      width: '100%',
                      height: '100%',
                      boxSizing: 'border-box',
                      margin: 0,
                      padding: 0
                    }}
                  />
                ))
              ))}
            </div>
          </div>
          
          <Button 
            onClick={makeMove} 
            disabled={loading || newGameLoading}
            className="mx-6 mb-6 bg-blue-600 hover:bg-blue-700 w-[calc(100%-3rem)]"
          >
            {loading ? 'Calculating Move...' : 'Make Strategic Move'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BattleshipBoard;
