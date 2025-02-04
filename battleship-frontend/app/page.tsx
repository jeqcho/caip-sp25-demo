'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Brain, Target, MessageSquare, Ship, User, Bot, Anchor } from 'lucide-react';
import TacticalMap from '@/components/TacticalMap';

const BattleshipGame = () => {
  // Game state management
  const [gameState, setGameState] = useState('initial');
  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [userQuestion, setUserQuestion] = useState('');
  const [llmQuestion, setLlmQuestion] = useState('');
  const [ships, setShips] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [llmQuestionCount, setLlmQuestionCount] = useState(0);
  
  // Terrain state
  const [mapSeed, setMapSeed] = useState(1);
  const [terrainData, setTerrainData] = useState(null);
  const [isClient, setIsClient] = useState(false);

  const [uncertaintyReduction, setUncertaintyReduction] = useState({
    user: {
      percentage: 0,
      eliminated: 0,
      total: 20825
    },
    llm: {
      percentage: 0,
      eliminated: 0,
      total: 20825
    }
  });

  const [answers, setAnswers] = useState({
    user: '',
    llm: ''
  });

  // Refs for timer and animation management
  const timerRef = useRef(null);
  const llmTimerRef = useRef(null);
  const questionCountRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (llmTimerRef.current) clearInterval(llmTimerRef.current);
      if (questionCountRef.current) clearInterval(questionCountRef.current);
    };
  }, []);

  // Callback to receive terrain data from TacticalMap
  const handleTerrainGenerated = useCallback((newTerrain) => {
    setTerrainData(newTerrain);
  }, []);

  const generateShipPositions = () => {
    if (!terrainData) return [];
    
    const newShips = [];
    const usedPositions = new Set();
    const seaTiles = [];

    // Find all sea tiles
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const cellType = terrainData[i][j];
      if (cellType === 'deepWater' || cellType === 'shallowWater') {
          seaTiles.push({ row: i, col: j });
        }
      }
    }

    // Randomly select from available sea tiles
    while (newShips.length < 3 && seaTiles.length > 0) {
      const randomIndex = Math.floor(Math.random() * seaTiles.length);
      const position = seaTiles[randomIndex];
      const posKey = `${position.row}-${position.col}`;
      
      if (!usedPositions.has(posKey)) {
        newShips.push({ row: position.row, col: position.col });
        usedPositions.add(posKey);
      }
      
      // Remove the used position from available tiles
      seaTiles.splice(randomIndex, 1);
    }

    return newShips;
  };

  // Effect to place ships when terrain is ready
  useEffect(() => {
    if (terrainData && gameState === 'userQuestion') {
      const newShips = generateShipPositions();
      setShips(newShips);
    }
  }, [terrainData, gameState]);

  const startGame = () => {
    // Generate a stable random seed between 2 and 1000000
    const newSeed = Math.floor(Math.random() * 999998) + 2;
    setMapSeed(newSeed);
    
    setGameState('userQuestion');
    setCountdown(30);
    setLlmQuestionCount(0);
    setUserQuestion('');
    setLlmQuestion('');
    setAnswers({ user: '', llm: '' });
    setShowResults(false);
    startCountdown();
    startLlmThinking();
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const simulateQuestionGeneration = () => {
    if (questionCountRef.current) clearInterval(questionCountRef.current);
    
    questionCountRef.current = setInterval(() => {
      setLlmQuestionCount(prev => {
        if (prev >= 2000) {
          clearInterval(questionCountRef.current);
          return 2000;
        }
        return prev + Math.floor(Math.random() * 100) + 50;
      });
    }, 100);
  };

  const startLlmThinking = () => {
    simulateQuestionGeneration();
    
    setTimeout(() => {
      setLlmQuestion("Are there any ships in the northern waters?");
      setUncertaintyReduction(prev => ({
        ...prev,
        llm: {
          percentage: 45.8,
          eliminated: 9538,
          total: prev.llm.total
        }
      }));
      setAnswers(prev => ({
        ...prev,
        llm: "Yes"
      }));
    }, 5000);
  };

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      clearInterval(timerRef.current);
      setUncertaintyReduction(prev => ({
        ...prev,
        user: {
          percentage: 23.4,
          eliminated: 4873,
          total: prev.user.total
        }
      }));
      setAnswers(prev => ({
        ...prev,
        user: "No"
      }));
      setGameState('results');
      setShowResults(false);
    }
  };

  const renderUncertaintyBar = (stats, color, animate = false) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Scenarios eliminated: {stats.eliminated.toLocaleString()}</span>
        <span>Total scenarios: {stats.total.toLocaleString()}</span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-1000 ease-out`}
          style={{ width: `${stats.percentage}%` }}
        />
      </div>
    </div>
  );

  const renderGameControls = () => {
    switch (gameState) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg text-blue-900">How to Play:</h3>
              <div className="space-y-3 text-blue-800">
                <p>Goal: Find three hidden ships on the tactical map</p>
                <p>1. Ask questions that can be answered with one word</p>
                <p>2. You have 30 seconds to ask your question</p>
                <p>3. We'll compare how well each question helps find the ships</p>
              </div>
            </div>
            <Button 
              onClick={startGame}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Begin Game
            </Button>
          </div>
        );

      case 'userQuestion':
        return (
          <div className="space-y-4">
            <Alert className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <AlertDescription>
                Time remaining: {countdown} seconds
              </AlertDescription>
            </Alert>
            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <Input
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Enter a question that can be answered in one word..."
                className="w-full"
              />
              <Button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!userQuestion.trim()}
              >
                Submit Question
              </Button>
            </form>
          </div>
        );

      case 'results':
        const showLLMResults = llmQuestion && answers.llm;
        
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <Alert className="flex flex-col gap-2">
                <div className="flex items-center gap-2 w-full">
                  <User className="h-4 w-4" />
                  <AlertDescription className="flex-1">
                    Your question: "{userQuestion}"
                  </AlertDescription>
                </div>
                {showResults && <AlertDescription>Answer: {answers.user}</AlertDescription>}
                {showResults && renderUncertaintyBar(uncertaintyReduction.user, 'bg-blue-500')}
              </Alert>
            </div>

            {llmQuestionCount > 0 && !showLLMResults && (
              <Alert className="flex items-center gap-2">
                <Brain className="h-4 w-4 animate-pulse" />
                <AlertDescription>
                  Questions analyzed: {llmQuestionCount.toLocaleString()}
                </AlertDescription>
              </Alert>
            )}

            {showLLMResults ? (
              <div className="space-y-4">
                <Alert className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 w-full">
                    <Bot className="h-4 w-4" />
                    <AlertDescription className="flex-1">
                      LLM's question: "{llmQuestion}"
                    </AlertDescription>
                  </div>
                  {showResults && <AlertDescription>Answer: {answers.llm}</AlertDescription>}
                  {showResults && renderUncertaintyBar(uncertaintyReduction.llm, 'bg-green-500')}
                </Alert>
              </div>
            ) : (
              <Alert className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <AlertDescription>
                  LLM is selecting the best question...
                </AlertDescription>
              </Alert>
            )}

            {showLLMResults && !showResults && (
              <Button 
                onClick={() => setShowResults(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Reveal Results
              </Button>
            )}

            {showResults && (
              <Button 
                onClick={startGame}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Play Again
              </Button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-gray-50 p-4 md:p-6">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl md:text-3xl font-bold">Battleship Strategy Game</CardTitle>
          <p className="text-gray-500 text-lg md:text-xl mt-2">You vs LLM: Who is the Better General?</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            <div className="flex justify-center">
              <div className="relative w-full max-w-md aspect-square">
                <TacticalMap
                  width={400}
                  height={400}
                  gridSize={6}
                  onCellHover={(x, y) => {
                    setSelectedCell({ x, y });
                    setHoveredCell(y * 6 + x);
                  }}
                  selectedCell={selectedCell}
                  seed={mapSeed}
                  onTerrainGenerated={handleTerrainGenerated}
                />
                {gameState === 'results' && showResults && (
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {ships.map((ship, index) => {
                      const cellSize = 400 / 6;
                      return (
                        <div
                          key={index}
                          className="absolute transform -translate-x-1/2 -translate-y-1/2"
                          style={{
                            left: (ship.col + 0.5) * cellSize,
                            top: (ship.row + 0.5) * cellSize,
                            transition: 'all 0.3s ease-in-out'
                          }}
                        >
                          <Anchor className="w-6 h-6 text-red-500 drop-shadow-lg" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1">
              {renderGameControls()}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BattleshipGame;