'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Brain, Target, MessageSquare } from 'lucide-react';

const BattleshipBoard = () => {
  const [gameState, setGameState] = useState('initial');
  const [countdown, setCountdown] = useState(30);
  const [llmCountdown, setLlmCountdown] = useState(30);
  const [userQuestion, setUserQuestion] = useState('');
  const [llmGeneratedQuestions, setLlmGeneratedQuestions] = useState(0);
  const [llmQuestion, setLlmQuestion] = useState('');
  const [results, setResults] = useState({
    llmUncertaintyReduction: 0,
    userUncertaintyReduction: 0,
    llmWins: 0,
    totalGames: 0
  });
  const timerRef = useRef(null);
  const llmTimerRef = useRef(null);
  const questionCounterRef = useRef(null);

  const startGame = () => {
    setGameState('userQuestion');
    setCountdown(30);
    startCountdown();
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (gameState === 'userQuestion') {
            startLlmThinking();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startLlmThinking = () => {
    setGameState('llmThinking');
    setLlmCountdown(30);
    setLlmGeneratedQuestions(0);
    
    // Start LLM countdown
    if (llmTimerRef.current) clearInterval(llmTimerRef.current);
    llmTimerRef.current = setInterval(() => {
      setLlmCountdown(prev => {
        if (prev <= 1) {
          clearInterval(llmTimerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start question generation simulation
    if (questionCounterRef.current) clearInterval(questionCounterRef.current);
    questionCounterRef.current = setInterval(() => {
      setLlmGeneratedQuestions(prev => {
        if (prev >= 2000) {
          clearInterval(questionCounterRef.current);
          clearInterval(llmTimerRef.current); // Stop the countdown early
          setTimeout(showResults, 2000);
          return prev;
        }
        return prev + Math.floor(Math.random() * 20) + 1;
      });
    }, 100);
  };

  const showResults = () => {
    setGameState('results');
    setLlmQuestion("Is there a ship in quadrant A1?");
    setResults({
      llmUncertaintyReduction: 45.8,
      userUncertaintyReduction: 23.4,
      llmWins: 7,
      totalGames: 10
    });
  };

  const handleQuestionSubmit = (e) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      startLlmThinking();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (llmTimerRef.current) clearInterval(llmTimerRef.current);
      if (questionCounterRef.current) clearInterval(questionCounterRef.current);
    };
  }, []);

  const renderGameControls = () => {
    switch (gameState) {
      case 'initial':
        return (
          <div className="space-y-6">
            <div className="bg-blue-50 p-6 rounded-lg space-y-4">
              <h3 className="font-semibold text-lg text-blue-900">How to Play:</h3>
              <div className="space-y-3 text-blue-800">
                <p>Goal: Find three hidden ships on the map</p>
                <p>1. You'll have 30 seconds to ask a question that can be answered with a single word</p>
                <p>2. The LLM will then generate and select its own question</p>
                <p>3. We'll compare which question better reduces uncertainty about the ships' positions</p>
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
            <Alert>
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

      case 'llmThinking':
        return (
          <div className="space-y-4">
            {userQuestion && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Your question: "{userQuestion}"
                </AlertDescription>
              </Alert>
            )}
            <Alert>
              <Timer className="h-4 w-4" />
              <AlertDescription>
                LLM time remaining: {llmCountdown} seconds
              </AlertDescription>
            </Alert>
            <Alert>
              <Brain className="h-4 w-4" />
              <AlertDescription>
                {llmGeneratedQuestions < 2000 ? (
                  `The LLM has generated ${llmGeneratedQuestions} questions...`
                ) : (
                  "The LLM is selecting the best question..."
                )}
              </AlertDescription>
            </Alert>
          </div>
        );

      case 'results':
        return (
          <div className="space-y-4">
            {userQuestion && (
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  Your question: "{userQuestion}"
                </AlertDescription>
              </Alert>
            )}
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">The LLM chose the following question after generating {llmGeneratedQuestions} possibilities:</p>
                <p className="text-blue-600">{llmQuestion}</p>
                <p>This question will eliminate uncertainty by {results.llmUncertaintyReduction}%</p>
                <p>Your question only eliminates uncertainty by {results.userUncertaintyReduction}%</p>
                <p>The LLM found all three battleships faster than you in {results.llmWins} out of {results.totalGames} times</p>
              </AlertDescription>
            </Alert>
            <Button 
              onClick={startGame}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Reset Board
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-7xl mx-auto">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-3xl font-bold">Battleship Strategy Game</CardTitle>
          <p className="text-gray-500 text-xl mt-2">You vs LLM: Who is the Better General?</p>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left side - Map */}
            <div className="col-span-6 flex justify-center">
              <div className="relative">
                {/* Column labels (A-F) */}
                <div className="absolute -top-8 left-0 right-0 grid grid-cols-6 w-[500px]">
                  {['A', 'B', 'C', 'D', 'E', 'F'].map((letter) => (
                    <div key={letter} className="flex justify-center font-semibold text-gray-700">
                      {letter}
                    </div>
                  ))}
                </div>
                
                {/* Row labels (1-6) */}
                <div className="absolute -left-8 top-0 h-[500px] flex flex-col">
                  {[1, 2, 3, 4, 5, 6].map((number) => (
                    <div key={number} className="flex items-center justify-end h-[calc(500px/6)] pr-2 font-semibold text-gray-700">
                      {number}
                    </div>
                  ))}
                </div>

                <div className="relative w-[500px] h-[500px]">
                  <div className="absolute inset-0">
                    <img
                      src="/maps/taiwan.png"
                      alt="Taiwan Map"
                      className="w-full h-full object-cover opacity-50"
                    />
                  </div>
                  <div className="absolute inset-0 grid grid-cols-6 grid-rows-6">
                    {Array(6).fill(0).map((_, x) => (
                      Array(6).fill(0).map((_, y) => (
                        <div
                          key={`${x}-${y}`}
                          className="border border-gray-600/50 backdrop-blur-[2px] hover:bg-white/20 transition-colors"
                        />
                      ))
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Game controls and logs */}
            <div className="col-span-6 flex items-start">
              <div className="w-full">
                {renderGameControls()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BattleshipBoard;