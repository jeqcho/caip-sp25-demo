'use client'

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Ship, User, Bot, Brain, Target, CheckCircle2, XCircle } from 'lucide-react';
import _ from 'lodash';

// Types
type GameState = 'initial' | 'intro' | 'userQuestion' | 'llmThinking' | 'results' | 'finalGuess' | 'gameOver';
type Position = { row: number; col: number };

const LLM_EXPLANATIONS = [
  {
    question: "How many ships are in the top half of the board?",
    purpose: "To identify asymmetrical ship placement. Players often cluster ships in certain regions.",
    strategy: "Dividing board into zones helps narrow search area."
  },
  {
    question: "How many tiles are occupied by ships in total?",
    purpose: "To verify game rules and ship configurations.",
    strategy: "Knowing total tiles constrains possible ship arrangements."
  },
  {
    question: "Are there more ships on odd-numbered rows than even rows?",
    purpose: "To exploit parity-based patterns in ship placement.",
    strategy: "Players may subconsciously favor certain row patterns."
  },
  {
    question: "How many ships are horizontal?",
    purpose: "Orientation affects adjacent guessing strategies.",
    strategy: "Horizontal ships occupy columns, vertical span rows."
  },
  {
    question: "Where is the bottom right part of the third ship?",
    purpose: "To pinpoint specific ship endpoints.",
    strategy: "Tracking endpoints enables systematic board clearing."
  }
];




const BattleshipGame = () => {
  const [gameState, setGameState] = useState<GameState>('initial');
  const [currentRound, setCurrentRound] = useState(1);
  const [countdown, setCountdown] = useState(QUESTION_TIME);
  const [ships] = useState<Position[]>([
    { row: 1, col: 1, length: 2, horizontal: true },
    { row: 3, col: 2, length: 2, horizontal: false },
    { row: 4, col: 4, length: 2, horizontal: true },
  ]);

  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [llmQuestionsGenerated, setLlmQuestionsGenerated] = useState(0);
  const [userGuesses, setUserGuesses] = useState<Position[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [currentLLMQuestion, setCurrentLLMQuestion] = useState<LLMQuestion | null>(null);
  const [questionHistory, setQuestionHistory] = useState<{
    user: Question[];
    llm: LLMQuestion[];
  }>({ user: [], llm: [] });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const counterRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (counterRef.current) clearInterval(counterRef.current);
    };
  }, []);


  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);

  const instructions = [
    "We will show how a publicly-accessible AI like ChatGPT is better and faster in making war-time decisions than humans, against humans. We hope to advocate for the continued funding of the US AI Safety Institute to prevent the loss of control of AI systems.",
    "To keep things simple, you will play a game of battleship against ChatGPT, but instead of choosing tiles, both you and ChatGPT will ask questions to find out the position of the ships. This is a rough test about making the right decisions under time pressure to reduce as much uncertainty as possible.",
    "You have 5 rounds. You can ask one question in each round. Each question must be answerable in one word. You have 30 seconds for each round. We will give you the answer at the end of each round. The same goes for ChatGPT.",
    "ChatGPT won't be able to see your questions, but we will give you a boost: you can see ChatGPT's questions.",
    "We did not train ChatGPT for this, but it beat every single person so far in this demo. To this effect, we think millions of copies of ChatGPT defeat will humans in actual war scenarios.",
    "Press the button below to begin. We will show a board to the left."
  ];

  const goToIntro = () => {
    setGameState('intro');
  }

  const resetGameState = () => {
    setGameState('initial');
  }

  const startGame = () => {
    setGameState('userQuestion');
    setCurrentRound(1);
    setCountdown(QUESTION_TIME);
    setQuestionHistory({ user: [], llm: [] });
    setUserGuesses([]);
    startCountdown();
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          if (gameState === 'userQuestion') handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeUp = () => {
    if (userQuestion.trim()) {
      handleQuestionSubmit(new Event('submit') as any);
    } else {
      setUserQuestion("Are there any ships in this area?");
      handleQuestionSubmit(new Event('submit') as any);
    }
  };

  const USER_RESPONSES: Question[] = [
    {
      question: "", // Will be filled with user's actual question
      answer: "No",
      uncertaintyReduction: { percentage: 7.2 }
    },
    {
      question: "",
      answer: "Yes",
      uncertaintyReduction: { percentage: 14.8 }
    },
    {
      question: "",
      answer: "Water",
      uncertaintyReduction: { percentage: 20.6 }
    },
    {
      question: "",
      answer: "2",
      uncertaintyReduction: { percentage: 12.3 }
    },
    {
      question: "",
      answer: "2",
      uncertaintyReduction: { percentage: 11 }
    }
  ];

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    clearInterval(timerRef.current!);

    const userResult = {
      ...USER_RESPONSES[currentRound - 1],
      question: userQuestion
    };

    setQuestionHistory(prev => ({
      ...prev,
      user: [...prev.user, userResult]
    }));

    simulateLLMThinking();
  };

  const simulateLLMThinking = () => {
    setGameState('llmThinking');
    setLlmQuestionsGenerated(0);

    if (counterRef.current) clearInterval(counterRef.current);
    counterRef.current = setInterval(() => {
      setLlmQuestionsGenerated(prev => {
        if (prev >= 90) {
          clearInterval(counterRef.current!);
          setTimeout(updateResults, 1000);
          return 90;
        }
        return prev + Math.floor(Math.random() * 300) + 1;
      });
    }, 100);
  };

  const updateResults = () => {
    const llmResponse = LLM_QUESTIONS[currentRound - 1];
    setCurrentLLMQuestion(llmResponse);
    setQuestionHistory(prev => ({
      ...prev,
      llm: [...prev.llm, llmResponse]
    }));
    setGameState('results');
  };

  const nextRound = () => {
    setCurrentRound(prev => prev + 1);
    setGameState('userQuestion');
    setCountdown(QUESTION_TIME);
    setUserQuestion('');
    setLlmQuestionsGenerated(0);
    setCurrentLLMQuestion(null);
    startCountdown();
  };

  const handleCellClick = (row: number, col: number) => {
    if (gameState !== 'finalGuess' || userGuesses.length >= 6) return;
    const isDuplicate = userGuesses.some(
      guess => guess.row === row && guess.col === col
    );

    if (!isDuplicate) {
      setUserGuesses(prev => [...prev, { row, col }]);
    }
  };

  const checkGuesses = () => {
    const correctGuesses = userGuesses.filter(guess =>
      ships.some(ship => {
        if (ship.horizontal) {
          return guess.row === ship.row &&
            guess.col >= ship.col &&
            guess.col < ship.col + ship.length;
        } else {
          return guess.col === ship.col &&
            guess.row >= ship.row &&
            guess.row < ship.row + ship.length;
        }
      })
    ).length;

    setGameState('gameOver');
  };

  const renderGameBoard = () => (
    <div className="relative w-96 h-96">
      <div className="absolute inset-0">
        <Image
          src="/maps/blank_sea.png"
          alt="Taiwan Map"
          width={500}
          height={500}
          className="w-full h-full object-cover opacity-50"
        />
      </div>

      <div className="absolute inset-0">
        <GridLabels />

        <div className="h-full grid grid-cols-6 grid-rows-6">
          {[...Array(36)].map((_, index) => {
            const row = Math.floor(index / 6);
            const col = index % 6;
            const hasShip = gameState === 'gameOver' &&
              ships.some(ship => {
                if (ship.horizontal) {
                  return ship.row === row &&
                    col >= ship.col &&
                    col < ship.col + ship.length;
                } else {
                  return ship.col === col &&
                    row >= ship.row &&
                    row < ship.row + ship.length;
                }
              });
            const isUserGuess = userGuesses.some(guess =>
              guess.row === row && guess.col === col);
            const isLLMGuess = gameState === 'gameOver' &&
              ([
                { row: 1, col: 3 },
                { row: 1, col: 2 },
                { row: 3, col: 2 },
                { row: 4, col: 2 },
                { row: 4, col: 4 },
                { row: 4, col: 5 }
              ].some(pos => pos.row === row && pos.col === col));

            return (
              <div
                key={index}
                className={`border border-gray-600/50 transition-colors duration-200 relative cursor-pointer
                  ${hoveredCell === index ? 'bg-white/20' : ''}
                  ${gameState === 'finalGuess' ? 'hover:bg-blue-200/50' : ''}`}
                onMouseEnter={() => setHoveredCell(index)}
                onMouseLeave={() => setHoveredCell(null)}
                onClick={() => handleCellClick(row, col)}
              >
                {hasShip && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Ship className="w-6 h-6 text-red-500" />
                  </div>
                )}
                {isUserGuess && (
                  <div className="absolute top-1 left-1">
                    <User className="w-4 h-4 text-blue-500" />
                  </div>
                )}
                {isLLMGuess && (
                  <div className="absolute top-1 right-1">
                    <Bot className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const handleInstructionNavigation = () => {
    if (currentInstructionIndex < instructions.length - 1) {
      setCurrentInstructionIndex(prev => prev + 1);
    } else {
      startGame();
    }
  };

  const MessageBox = ({ children }) => (
    <div className="bg-blue-50 p-6 rounded-lg space-y-4">
      <div className="space-y-3 text-blue-800">{children}</div>
    </div>
  );

  const InitialControls = () => {
    return (
      <div className="space-y-6">
        <MessageBox>
          <p>
            In unfamiliar, high-stakes situations like war, can you make faster, better decisions than AI?
          </p>
        </MessageBox>
        <Button onClick={goToIntro} className="w-full bg-blue-600 hover:bg-blue-700">
          Begin demo
        </Button>
      </div>
    );
  };

  const IntroControls = () => (
    <div className="space-y-6">
      <MessageBox>
        <p>{instructions[currentInstructionIndex]}</p>
        <div className="space-x-2">
          {instructions.map((_, index) => (
            <span
              key={index}
              className={`inline-block w-2 h-2 rounded-full ${index === currentInstructionIndex ? 'bg-blue-600' : 'bg-blue-200'
                }`}
            />
          ))}
        </div>
      </MessageBox>
      <Button onClick={handleInstructionNavigation} className="bg-blue-600 hover:bg-blue-700">
        {currentInstructionIndex === instructions.length - 1 ? 'Begin Game' : 'Next'}
      </Button>
    </div>
  );

  const renderGameControls = () => {
    switch (gameState) {
      case 'initial':
        return <InitialControls />;
      case 'intro':
        return <IntroControls />;

      case 'userQuestion':
        return (
          <div className="space-y-4">
            <Alert className="bg-blue-50">
              <AlertDescription>Round {currentRound} of {TOTAL_ROUNDS}</AlertDescription>
            </Alert>

            <Alert className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <AlertDescription>Time remaining: {countdown} seconds</AlertDescription>
            </Alert>

            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <Input
                value={userQuestion}
                onChange={(e) => setUserQuestion(e.target.value)}
                placeholder="Enter a question that can be answered in one word..."
                className="w-full"
                autoFocus
              />
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!userQuestion.trim()}
              >
                Submit Question
              </Button>
            </form>

            {questionHistory.user.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-gray-700">Previous Questions:</h4>
                <div className="space-y-2">
                  {questionHistory.user.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-lg">
                      <div className="font-medium">Round {index + 1}:</div>
                      <div>Q: "{item.question}"</div>
                      <div>A: {item.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'llmThinking':
        return (
          <div className="space-y-6">
            <Alert className="bg-blue-50">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <AlertDescription>DeepSeek is analyzing possible questions...</AlertDescription>
              </div>
            </Alert>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Questions analyzed:</span>
                <span>{llmQuestionsGenerated.toLocaleString()}</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-200"
                  style={{ width: `${Math.min((llmQuestionsGenerated / 90) * 100, 100)}%` }}
                />
              </div>
            </div>

            <Alert>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <AlertDescription>Your question: "{userQuestion}"</AlertDescription>
              </div>
            </Alert>
          </div>
        );

      case 'results':
        if (currentRound === TOTAL_ROUNDS) {
          return (
            <div className="space-y-6">
              <Alert variant="default" className="bg-blue-50">
                <AlertDescription className="text-lg font-semibold text-blue-800">
                  Questioning phase complete! Now make your guesses for the ship locations.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <QuestionDisplay
                  user={{ question: userQuestion, answer: questionHistory.user[currentRound - 1]?.answer }}
                  llm={{ question: currentLLMQuestion?.question || '' }}
                />

                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Information Gained
                    </h4>
                    <ProgressBar
                      history={questionHistory.user.map(q => ({
                        percentage: q.uncertaintyReduction.percentage,
                        eliminated: q.uncertaintyReduction.eliminated
                      }))}
                      color="bg-blue-500"

                      total={20825}
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      DeepSeek's Information Gained
                    </h4>
                    <ProgressBar
                      history={_.uniqBy(questionHistory.llm, 'question').map(q => ({
                        percentage: q.percentage,
                        eliminated: q.eliminated
                      }))}
                      color="bg-green-500"
                      total={20825}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setGameState('finalGuess')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Make Your Final Guesses
              </Button>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <QuestionDisplay
                user={{ question: userQuestion, answer: questionHistory.user[currentRound - 1]?.answer }}
                llm={{ question: currentLLMQuestion?.question || '' }}
              />

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Information Gained
                  </h4>
                  <ProgressBar
                    history={questionHistory.user.map(q => ({
                      percentage: q.uncertaintyReduction.percentage,
                      eliminated: q.uncertaintyReduction.eliminated
                    }))}
                    color="bg-blue-500"
                    total={20825}
                  />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    DeepSeek's Information Gained
                  </h4>
                  <ProgressBar
                    history={_.uniqBy(questionHistory.llm, 'question').map(q => ({
                      percentage: q.percentage,
                      eliminated: q.eliminated
                    }))}
                    color="bg-green-500"
                    total={20825}
                  />
                </div>
              </div>
            </div>

            <Button onClick={nextRound} className="w-full bg-blue-600 hover:bg-blue-700">
              Next Round
            </Button>
          </div>
        );

      case 'finalGuess':
        return (
          <div className="space-y-6">
            <Alert variant="default" className="bg-blue-50">
              <AlertDescription className="text-lg font-semibold text-blue-800">
                Select 6 tiles where you think the ships are located ({6 - userGuesses.length} remaining)
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg border p-4 space-y-4">
              <h4 className="font-medium text-gray-700">Your guesses:</h4>
              <div className="flex gap-2">
                {userGuesses.map((guess, index) => (
                  <div key={index} className="bg-blue-100 px-3 py-1 rounded-full">
                    {String.fromCharCode(65 + guess.col)}{guess.row + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="font-medium text-gray-700 flex items-center gap-2">
                <User className="h-4 w-4" />
                Your Question History
              </h4>
              <ProgressBar
                history={questionHistory.user.slice(0, TOTAL_ROUNDS).map(q => ({
                  percentage: q.uncertaintyReduction.percentage,
                  eliminated: q.uncertaintyReduction.eliminated
                }))}
                color="bg-blue-500"
                total={20825}
              />
              <div className="mt-4 space-y-3 divide-y divide-gray-200">
                {questionHistory.user.map((item, index) => (
                  <div key={index} className="pt-3 first:pt-0">
                    <div className="font-medium text-gray-600">Round {index + 1}:</div>
                    <div className="mt-1">Q: "{item.question}"</div>
                    <div className="text-gray-600">A: {item.answer}</div>
                  </div>
                ))}
              </div>
            </div>

            {userGuesses.length === 6 && (
              <Button
                onClick={checkGuesses}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Submit Guesses
              </Button>
            )}
          </div>
        );

      case 'gameOver':
        const correctGuesses = userGuesses.filter(guess =>
          ships.some(ship => {
            if (ship.horizontal) {
              return guess.row === ship.row &&
                guess.col >= ship.col &&
                guess.col < ship.col + ship.length;
            } else {
              return guess.col === ship.col &&
                guess.row >= ship.row &&
                guess.row < ship.row + ship.length;
            }
          })
        ).length;

        return (
          <div className="space-y-6">
            <Alert variant="default" className="bg-blue-50">
              <AlertDescription className="text-lg font-semibold text-blue-800">
                You found {correctGuesses} out of 6 ship tiles!
              </AlertDescription>
              <AlertDescription className="text-lg font-semibold text-blue-800">
                DeepSeek found 5 out of 6 ship tiles!
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg border p-4 space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Guesses:
                </h4>
                <div className="flex gap-2">
                  {userGuesses.map((guess, index) => {
                    const isCorrect = ships.some(ship => {
                      if (ship.horizontal) {
                        return ship.row === guess.row && guess.col >= ship.col && guess.col < ship.col + ship.length;
                      } else {
                        return ship.col === guess.col && guess.row >= ship.row && guess.row < ship.row + ship.length;
                      }
                    });
                    return (
                      <div key={index} className={`flex items-center gap-1 px-3 py-1 rounded-full ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        <span>{String.fromCharCode(65 + guess.col)}{guess.row + 1}</span>
                        {isCorrect ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  DeepSeek's Guesses:
                </h4>
                <div className="flex gap-2">
                  {[
                    { row: 1, col: 2 },
                    { row: 1, col: 3 },
                    { row: 3, col: 2 },
                    { row: 4, col: 2 },
                    { row: 4, col: 4 },
                    { row: 4, col: 5 }
                  ].map((guess, index) => {
                    const isCorrect = ships.some(ship => {
                      if (ship.horizontal) {
                        return ship.row === guess.row && guess.col >= ship.col && guess.col < ship.col + ship.length;
                      } else {
                        return ship.col === guess.col && guess.row >= guess.row && guess.row < ship.row + ship.length;
                      }
                    });
                    return (
                      <div key={index} className={`flex items-center gap-1 px-3 py-1 rounded-full ${isCorrect ? 'bg-green-100' : 'bg-red-100'}`}>
                        <span>{String.fromCharCode(65 + guess.col)}{guess.row + 1}</span>
                        {isCorrect ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700">Question-Answer History</h4>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <h5 className="font-medium text-gray-600">Your Progress</h5>
                  </div>
                  <ProgressBar
                    history={questionHistory.user.map(q => ({
                      percentage: q.uncertaintyReduction.percentage,
                      eliminated: q.uncertaintyReduction.eliminated
                    }))}
                    color="bg-blue-500"
                    total={20825}
                  />
                  <div className="ml-6 space-y-3 divide-y divide-gray-200">
                    {questionHistory.user.map((item, index) => (
                      <div key={index} className="pt-3 first:pt-0">
                        <div className="font-medium text-gray-600">Round {index + 1}:</div>
                        <div className="mt-1">Q: "{item.question}"</div>
                        <div className="text-gray-600">A: {item.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 mt-8">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    <h5 className="font-medium text-gray-600">DeepSeek's Progress</h5>
                  </div>
                  <ProgressBar
                    history={_.uniqBy(questionHistory.llm, 'question').map(q => ({
                      percentage: q.percentage,
                      eliminated: q.eliminated
                    }))}
                    color="bg-green-500"
                    total={20825}
                  />
                  <div className="ml-6 space-y-3 divide-y divide-gray-200">
                    {_.uniqBy(questionHistory.llm, 'question').map((item, index) => (
                      <div key={index} className="pt-3 first:pt-0">
                        <div className="font-medium text-gray-600">Round {index + 1}:</div>
                        <div className="mt-1">Q: "{item.question}"</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-4">
                <Brain className="h-4 w-4" />
                DeepSeek's Strategy Explained
              </h4>
              <div className="space-y-4">
                {LLM_EXPLANATIONS.map((item, index) => (
                  <div key={index} className="p-3 bg-white rounded-lg">
                    <p className="font-medium">Q{index + 1}: {item.question}</p>
                    <p className="text-gray-600 mt-1">Purpose: {item.purpose}</p>
                    <p className="text-gray-600">Strategy: {item.strategy}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={resetGameState} className="w-full bg-blue-600 hover:bg-blue-700">
              Restart demo
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center justify-center w-full min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-6xl mx-auto">
        <CardHeader className="text-center pb-16">
          <CardTitle className="text-3xl font-bold">You vs ChatGPT</CardTitle>
          <p className="text-gray-500 text-xl mt-2">Can you outmaneuver AI in naval warfare?</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-16 px-16">
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
type Question = {
  question: string;
  answer: string;
  uncertaintyReduction: { percentage: number; };
};
type LLMQuestion = {
  question: string;
  answer: string;
  percentage: number;
};

// Add a utility function to calculate eliminated scenarios
const calculateEliminatedScenarios = (percentage: number, total: number) => {
  return Math.round((percentage / 100) * total);
};

// Constants
const TOTAL_ROUNDS = 5;
const QUESTION_TIME = 30;
const GRID_SIZE = 6;
const LLM_QUESTIONS: LLMQuestion[] = [
  { question: "How many ships are there in the top half of the board?", answer: "1", percentage: 13.7 },
  { question: "How many tiles are occupied by ships in total?", answer: "6", percentage: 11.5 },
  { question: "Are there more ships on the odd-numbered rows than the even rows?", answer: "No", percentage: 21.3 },
  { question: "How many ships are horizontal?", answer: "2", percentage: 15.4 },
  { question: "Where is the bottom right part of the third ship?", answer: "F5", percentage: 30.2 }
];

// Helper Components
const GridLabels = () => (
  <>
    <div className="absolute -top-8 left-0 right-0 grid grid-cols-6 w-full">
      {[...Array(GRID_SIZE)].map((_, i) => (
        <div key={i} className="flex justify-center font-semibold text-gray-700">
          {String.fromCharCode(65 + i)}
        </div>
      ))}
    </div>
    <div className="absolute -left-8 top-0 h-full flex flex-col">
      {[...Array(GRID_SIZE)].map((_, i) => (
        <div key={i} className="flex items-center justify-end h-1/6 pr-2 font-semibold text-gray-700">
          {i + 1}
        </div>
      ))}
    </div>
  </>
);

const QuestionDisplay = ({
  user, llm, showAnswers = true
}: {
  user: { question: string; answer: string; };
  llm: { question: string; };
  showAnswers?: boolean;
}) => (
  <div className="space-y-4">
    <Alert className="flex flex-col gap-2">
      <div className="flex items-center gap-2 w-full">
        <User className="h-4 w-4" />
        <AlertDescription className="flex-1">Your question: "{user.question}"</AlertDescription>
      </div>
      {showAnswers && <AlertDescription>Answer: {user.answer}</AlertDescription>}
    </Alert>
    <Alert className="flex flex-col gap-2">
      <div className="flex items-center gap-2 w-full">
        <Bot className="h-4 w-4" />
        <AlertDescription className="flex-1">DeepSeek's question: "{llm.question}"</AlertDescription>
      </div>
    </Alert>
  </div>
);
const ProgressBar = ({
  history = [],
  color,
  total
}: {
  history: { percentage: number; }[];
  color: string;
  total: number;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm text-gray-600">
      <span>Scenarios eliminated: {history.reduce((acc, item) =>
        acc + calculateEliminatedScenarios(item.percentage, total), 0).toLocaleString()}</span>
      <span>Remaining scenarios: {(total - history.reduce((acc, item) =>
        acc + calculateEliminatedScenarios(item.percentage, total), 0)).toLocaleString()}</span>
    </div>
    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full flex">
        {history.map((item, index) => {
          const eliminated = calculateEliminatedScenarios(item.percentage, total);
          return (
            <div
              key={index}
              className={`h-full ${color} transition-all duration-500`}
              style={{
                width: `${item.percentage}%`,
                borderRight: index < history.length - 1 ? '2px solid rgba(255, 255, 255, 0.5)' : 'none'
              }}
              title={`Eliminated ${eliminated.toLocaleString()} scenarios`}
            />
          );
        })}
      </div>
    </div>
  </div>
)