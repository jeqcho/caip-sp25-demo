'use client'

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Brain, Target, MessageSquare, Ship, User, Bot } from 'lucide-react';

const BattleshipGame = () => {
  // Game state management
  const [gameState, setGameState] = useState('initial');
  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [userQuestion, setUserQuestion] = useState('');
  const [llmQuestion, setLlmQuestion] = useState('');
  const [ships, setShips] = useState([]);
  const [uncertaintyReduction, setUncertaintyReduction] = useState({
    user: {
      percentage: 0,
      eliminated: 0,
      total: 20825 // Mathematical: C(36,3) = 36!/(3!(36-3)!) = 7140
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
  const [hoveredCell, setHoveredCell] = useState(null);

  // Refs for timer management
  const timerRef = useRef(null);
  const llmTimerRef = useRef(null);

  const generateShipPositions = () => {
    const newShips = [];
    const usedPositions = new Set();

    while (newShips.length < 3) {
      const row = Math.floor(Math.random() * 6);
      const col = Math.floor(Math.random() * 6);
      const posKey = `${row}-${col}`;
      
      if (!usedPositions.has(posKey)) {
        newShips.push({ row, col });
        usedPositions.add(posKey);
      }
    }

    return newShips;
  };

  const startGame = () => {
    const newShips = generateShipPositions();
    setShips(newShips);
    setGameState('userQuestion');
    setCountdown(30);
    startCountdown();
    // Start LLM "thinking" in background
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

  const startLlmThinking = () => {
    // Simulate LLM thinking in background
    setTimeout(() => {
      setLlmQuestion("Are there any ships in row 1?");
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
    }, 5000); // Simulate 5-second API call
  };

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      clearInterval(timerRef.current);
      // Simulate calculating uncertainty reduction
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (llmTimerRef.current) clearInterval(llmTimerRef.current);
    };
  }, []);

  // Game board rendering
  const renderGameBoard = () => {
    return (
      <div className="relative w-96 h-96">
        {/* Map background */}
        <div className="absolute inset-0">
          <Image
            src="/maps/taiwan.png"
            alt="Taiwan Map"
            width={500}
            height={500}
            className="w-full h-full object-cover opacity-50"
          />
        </div>
        
        {/* Grid overlay */}
        <div className="absolute inset-0">
          {/* Column labels (A-F) */}
          <div className="absolute -top-8 left-0 right-0 grid grid-cols-6 w-full">
            {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => (
              <div key={letter} className="flex justify-center font-semibold text-gray-700">
                {letter}
              </div>
            ))}
          </div>
          
          {/* Row labels (1-6) */}
          <div className="absolute -left-8 top-0 h-full flex flex-col">
            {[1, 2, 3, 4, 5, 6].map((number) => (
              <div key={number} className="flex items-center justify-end h-1/6 pr-2 font-semibold text-gray-700">
                {number}
              </div>
            ))}
          </div>

          {/* Grid cells */}
          <div className="h-full grid grid-cols-6 grid-rows-6">
            {Array(36).fill(null).map((_, index) => {
              const row = Math.floor(index / 6);
              const col = index % 6;
              const hasShip = gameState === 'results' && showResults && ships.some(ship => ship.row === row && ship.col === col);
              
              return (
                <div
                  key={index}
                  className={`border border-gray-600/50 transition-colors duration-200 relative
                    ${hoveredCell === index ? 'bg-white/20' : ''}`}
                  onMouseEnter={() => setHoveredCell(index)}
                  onMouseLeave={() => setHoveredCell(null)}
                >
                  {hasShip && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Ship className="w-6 h-6 text-red-500" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderUncertaintyBar = (stats, color, animate = false) => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>Scenarios eliminated: {stats.eliminated.toLocaleString()}</span>
        <span>Total scenarios: {stats.total.toLocaleString()}</span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color}`}
          style={{ 
            width: animate ? '0%' : `${stats.percentage}%`,
            transition: animate ? 'width 1s ease-out' : 'none'
          }}
        />
      </div>
    </div>
  );

  // Game controls rendering based on state
  const renderGameControls = () => {
    switch (gameState) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg text-blue-900">How to Play:</h3>
              <div className="space-y-3 text-blue-800">
                <p>Goal: Find three hidden ships on the map</p>
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
                {showResults && (
                  <>
                    {renderUncertaintyBar(uncertaintyReduction.user, 'bg-blue-500', !showResults)}
                  </>
                )}
              </Alert>
            </div>

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
                  {showResults && (
                    <>
                      {renderUncertaintyBar(uncertaintyReduction.llm, 'bg-green-500', !showResults)}
                    </>
                  )}
                </Alert>
              </div>
            ) : (
              <Alert className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <AlertDescription>
                  LLM is analyzing the board...
                </AlertDescription>
              </Alert>
            )}

            {showLLMResults && !showResults && (
              <Button 
                onClick={() => {
                  setShowResults(true);
                  // Trigger animation after a short delay
                  setTimeout(() => {
                    const bars = document.querySelectorAll('.uncertainty-bar');
                    bars.forEach(bar => {
                      bar.style.width = bar.dataset.targetWidth;
                    });
                  }, 100);
                }}
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
    <div className="flex items-center justify-center w-full min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold">Battleship Strategy Game</CardTitle>
          <p className="text-gray-500 text-xl mt-2">You vs LLM: Who is the Better General?</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex justify-center items-start">
              {renderGameBoard()}
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