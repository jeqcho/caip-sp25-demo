'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Ship, User, Bot } from 'lucide-react';
import _ from 'lodash';
import boards from './boards/boards.json';
import LLM_QA_DATASET from './boards/qa.json'
import LLMQuestionTileChoice from './boards/dummy-question-and-tile-choice.json'

// Types
type GameState = 'initial' | 'intro' | 'userQuestion' | 'llmThinking' | 'results' | 'finalGuess' | 'gameOver';
type Position = { row: number; col: number };
type LLMQA_Type = [string, string, number]
type UserQA = {
  question: string;
  answer: string;
};
type LLMQuestion = {
  question: string;
  answer: string;
  eig: number;
};
type BoardTile = 'H' | 'P' | 'B' | 'R' | 'W';
type BoardType = BoardTile[][];
type ProgressBarHistory = { eig_adjusted: number; }[];
type QKey = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Q5';

const positionsEqual = (a: Position, b: Position): boolean =>
  a.row === b.row && a.col === b.col;

function parseTileLetters(tileString: string): Position[] {
  // Mapping letters to numbers (A becomes 1, B becomes 2, etc.)
  const letterMap = {
    A: 1,
    B: 2,
    C: 3,
    D: 4,
    E: 5,
    F: 6,
  };

  return tileString.split(' ').map(tile => {
    // Get the numeric value for the first letter
    const letterNum: number = letterMap[tile[0] as keyof typeof letterMap] || 0;
    // Parse the remaining part of the tile (e.g., "4" from "A4")
    const tileNumber = Number(tile.slice(1));
    return { col: letterNum - 1, row: tileNumber - 1 };
  });
}


const TOTAL_SCENARIOS = 50000

const BattleshipGame = () => {
  const [gameState, setGameState] = useState<GameState>('initial');
  const [currentRound, setCurrentRound] = useState(1);
  const [boardId, setBoardId] = useState(-1);
  const defaultBoard: BoardType = Array.from({ length: 6 }, () => Array(6).fill('W'));
  const [currentBoard, setCurrentBoard] = useState(defaultBoard);
  const [chosenLLMQuestions, setChosenLLMQuestions] = useState<LLMQuestion[]>([]);
  const [llmGuesses, setLLMGuesses] = useState<Position[]>([{}]);
  const [countdown, setCountdown] = useState(QUESTION_TIME);
  const [ships_positions, setShipsPositions] = useState<Position[]>([]);

  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [llmQuestionsGenerated, setLlmQuestionsGenerated] = useState(0);
  const [userGuesses, setUserGuesses] = useState<Position[]>([]);
  const [userQuestion, setUserQuestion] = useState('');
  const [currentLLMQuestion, setCurrentLLMQuestion] = useState<LLMQuestion | null>(null);
  const [userQuestionHistory, setUserQuestionHistory] = useState<UserQA[]>([]);

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

  const calculateAdjustedEIGHistoryForRound = (roundId: number): ProgressBarHistory => {
    const adjusted_eigs = [];   
    var cum_eig: number = 0;
    for (const question of chosenLLMQuestions.slice(0, roundId)) {
      const adjusted_eig = (100 - cum_eig) * question.eig / 100;
      cum_eig += adjusted_eig;
      adjusted_eigs.push(adjusted_eig);
    }
    return adjusted_eigs.map(eig => ({ eig_adjusted: eig }));
  }

  const calculateAdjustedEIGSumForRound = (roundId: number): number => {
    const adjusted_eigs = calculateAdjustedEIGHistoryForRound(roundId);
    const total_eig = adjusted_eigs.reduce((acc, item) => acc + item.eig_adjusted, 0);
    return total_eig;
  }


  const goToIntro = () => {
    setGameState('intro');
  }

  const resetGameState = () => {
    setGameState('initial');
  }

  const getShipsPositionsFromBoard = (board: BoardType): Position[] => {
    const ships_positions: Position[] = []
    for (let row = 0; row < 6; ++row) {
      for (let col = 0; col < 6; ++col) {
        if (["R", "B", "P"].includes(board[row][col])) {
          const ship_position = { row: row, col: col };
          ships_positions.push(ship_position);
        }
      }
    }
    return ships_positions;
  }

  const startGame = () => {
    // choose a boardId between 1 and 10 inclusive
    const questionTileChoiceIndex = Math.floor(Math.random() * LLMQuestionTileChoice.length);
    const questionTileChoice = LLMQuestionTileChoice[questionTileChoiceIndex];
    setBoardId(questionTileChoice.board - 1);
    setCurrentBoard(boards[questionTileChoice.board - 1] as BoardType);

    const llm_questions: LLMQuestion[] = [];
    for (let qid = 1; qid <= TOTAL_ROUNDS; ++qid) {
      const qid_str = `Q${qid}` as QKey;
      const question = LLM_QA_DATASET[questionTileChoice[qid_str]]
      const question_wrapped: LLMQuestion = {
        "question": question.completion,
        "answer": question.answer,
        "eig": question.score,
      }
      llm_questions.push(question_wrapped)
    }
    setChosenLLMQuestions(llm_questions);
    const tileChoice = questionTileChoice.tiles;
    setLLMGuesses(parseTileLetters(tileChoice));

    // store the correct answers
    const shipsPositions = getShipsPositionsFromBoard(boards[questionTileChoice.board - 1] as BoardType);
    setShipsPositions(shipsPositions);

    setGameState('userQuestion');
    setCurrentRound(1);

    setCountdown(QUESTION_TIME);
    setUserQuestionHistory([]);
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

  const fetchAnswerFromAPI = async (question: string, boardId: number): Promise<string> => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/get-answer", {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ question, boardId})
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      return data.answer;
    } catch (error) {
      console.error("Error fetching answer:", error);
      return "An error occurred. Please try again.";
    }
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim()) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    simulateLLMThinking();

    const userResult = {
      question: userQuestion,
      answer: ""
    };

    // Await the API call to get the answer.
    const answer = await fetchAnswerFromAPI(userQuestion, boardId);
    userResult.answer = answer;

    setUserQuestionHistory((prev) => [...prev, userResult]);

    if (counterRef.current) {
      clearInterval(counterRef.current);
    }
    updateResults();
  };

  const simulateLLMThinking = () => {
    setGameState('llmThinking');
    setLlmQuestionsGenerated(0);

    if (counterRef.current) clearInterval(counterRef.current);
    counterRef.current = setInterval(() => {
      setLlmQuestionsGenerated(prev => {
        if (prev >= 90) {
          clearInterval(counterRef.current!);
          return 90;
        }
        return prev + Math.floor(Math.random() * 300) + 1;
      });
    }, 100);
  };

  const updateResults = () => {
    const llmResponse = LLM_QUESTIONS[currentRound - 1];
    setCurrentLLMQuestion(llmResponse);
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


  const checkUserGuesses = () => {
    // const correctGuesses = userGuesses.filter(guess =>
    //   ships.some(ship => {
    //     if (ship.horizontal) {
    //       return guess.row === ship.row &&
    //         guess.col >= ship.col &&
    //         guess.col < ship.col + ship.length;
    //     } else {
    //       return guess.col === ship.col &&
    //         guess.row >= ship.row &&
    //         guess.row < ship.row + ship.length;
    //     }
    //   })
    // ).length;

    setGameState('gameOver');
  };

  const renderGameBoard = () => {
    if (!currentBoard) return null;

    return (
      <div className="relative w-96 h-96 bg-blue-300">
        <div className="absolute inset-0">
          <GridLabels />

          <div className="h-full grid grid-cols-6 grid-rows-6">
            {currentBoard.map((rowData, row) =>
              rowData.map((boardValue, col) => {
                const index = row * 6 + col;
                const isWater = boardValue === "W" || boardValue === "H";

                let cellBackground = "";
                if (gameState === "gameOver") {
                  if (isWater) {
                    cellBackground = "bg-blue-300";
                  } else if (boardValue === "B") {
                    cellBackground = "bg-blue-200";
                  } else if (boardValue === "P") {
                    cellBackground = "bg-purple-200";
                  } else if (boardValue === "R") {
                    cellBackground = "bg-red-200";
                  }
                } else {
                  cellBackground = boardValue === "W" ? "bg-blue-300" : "bg-gray-400";
                }

                const renderShipIcon = gameState === "gameOver" && !isWater;

                const shipColorClass =
                  boardValue === "B"
                    ? "text-blue-500"
                    : boardValue === "P"
                      ? "text-purple-500"
                      : boardValue === "R"
                        ? "text-red-500"
                        : "";

                const isUserGuess = userGuesses.some(
                  (guess) => guess.row === row && guess.col === col
                );

                const isLLMGuess =
                  gameState === "gameOver" &&
                  llmGuesses.some(
                    (guess) => guess.row === row && guess.col === col
                  );

                return (
                  <div
                    key={index}
                    className={`border border-gray-600/50 transition-colors duration-200 relative cursor-pointer ${cellBackground} ${hoveredCell === index ? "bg-white/20" : ""
                      } ${gameState === "finalGuess" ? "hover:bg-blue-200/50" : ""}`}
                    onMouseEnter={() => setHoveredCell(index)}
                    onMouseLeave={() => setHoveredCell(null)}
                    onClick={() => handleCellClick(row, col)}
                  >
                    {renderShipIcon && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Ship className={`w-6 h-6 ${shipColorClass}`} />
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
              })
            )}
          </div>
        </div>
      </div>
    );
  };

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

  const showResultChips = (guesses: Position[]) => {
    return (
      <div className="flex flex-wrap gap-2">
        {guesses.map((guess, index) => {
          const isCorrect = ships_positions.some(position => positionsEqual(position, guess));
          console.log(ships_positions);
          console.log(guess);
          console.log(isCorrect);
          if (!isCorrect) return ''
          return (
            <div
              key={index}
              className={`flex items-center gap-1 px-3 py-1 rounded-full ${isCorrect ? 'bg-green-100' : ''}`}
            >
              <span>{String.fromCharCode(65 + guess.col)}{guess.row + 1}</span>
              {isCorrect && (
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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

            {userQuestionHistory.length > 0 && (
              <div className="mt-6 space-y-4">
                <h4 className="font-medium text-gray-700">Previous Questions:</h4>
                <div className="space-y-2">
                  {userQuestionHistory.map((item, index) => (
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
                <AlertDescription>ChatGPT is analyzing possible questions...</AlertDescription>
              </div>
            </Alert>

            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Analyzing all possible questions...</span>
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
                  user={{ question: userQuestion, answer: userQuestionHistory[currentRound - 1]?.answer }}
                  llm={{ question: chosenLLMQuestions[currentRound - 1].question || '' }}
                />

                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      ChatGPT's Information Gained
                    </h4>
                    <ProgressBar
                      history={calculateAdjustedEIGHistoryForRound(currentRound)}
                      eig_adjusted_sum={calculateAdjustedEIGSumForRound(currentRound)}
                      color="bg-green-500"
                      total={TOTAL_SCENARIOS}
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
                user={{ question: userQuestion, answer: userQuestionHistory[currentRound - 1]?.answer }}
                llm={{ question: chosenLLMQuestions[currentRound - 1]?.question || '' }}
              />

              <div className="space-y-4 mt-4">

                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    ChatGPT has reduced their uncertainty by:
                  </h4>
                  <ProgressBar
                    history={calculateAdjustedEIGHistoryForRound(currentRound)}
                    eig_adjusted_sum={calculateAdjustedEIGSumForRound(currentRound)}
                    color="bg-green-500"
                    total={TOTAL_SCENARIOS}
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
                Select tiles where you think the ships are located.
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
              <div className="mt-4 space-y-3 divide-y divide-gray-200">
                {userQuestionHistory.map((item, index) => (
                  <div key={index} className="pt-3 first:pt-0">
                    <div className="font-medium text-gray-600">Round {index + 1}:</div>
                    <div className="mt-1">Q: "{item.question}"</div>
                    <div className="text-gray-600">A: {item.answer}</div>
                  </div>
                ))}
              </div>
            </div>

            {userGuesses.length > 0 && (
              <Button
                onClick={checkUserGuesses}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Submit Guesses
              </Button>
            )}
          </div>
        );

      case 'gameOver':
        // const correctGuesses = userGuesses.filter(guess =>
        //   ships.some(ship => {
        //     if (ship.horizontal) {
        //       return guess.row === ship.row &&
        //         guess.col >= ship.col &&
        //         guess.col < ship.col + ship.length;
        //     } else {
        //       return guess.col === ship.col &&
        //         guess.row >= ship.row &&
        //         guess.row < ship.row + ship.length;
        //     }
        //   })
        // ).length;

        return (
          <div className="space-y-6">
            <Alert variant="default" className="bg-blue-50">
              <AlertDescription className="text-lg font-semibold text-blue-800">
                Here are the results!
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg border p-4 space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Your Guesses:
                </h4>
                <div className="flex gap-2">
                  {showResultChips(userGuesses)}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium text-gray-700 flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  ChatGPT's Guesses:
                </h4>
                <div className="flex gap-2">
                  {showResultChips(llmGuesses)}
                </div>
              </div>
            </div>

            <Button onClick={resetGameState} className="w-full bg-blue-600 hover:bg-blue-700">
              Restart demo
            </Button>

          </div>
        );
    }
  };

  const renderFinalHistory = () => {
    switch (gameState) {
      case "gameOver":
        return (
          <div className="space-y-6">
            <Alert variant="default" className="bg-blue-50">
              <AlertDescription className="text-lg font-semibold text-blue-800">
                Here’s a summary of your question and answer history.
              </AlertDescription>
            </Alert>
  
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: User Question-Answer History */}
                <div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <h5 className="font-medium text-gray-600">Your Progress</h5>
                    </div>
                    <div className="ml-6 space-y-3 divide-y divide-gray-200">
                      {userQuestionHistory.map((item, index) => (
                        <div key={index} className="pt-3 first:pt-0">
                          <div className="font-medium text-gray-600">
                            Round {index + 1}:
                          </div>
                          <div className="mt-1">Q: "{item.question}"</div>
                          <div className="text-gray-600">A: {item.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
  
                {/* Right: LLM (ChatGPT) Question-Answer History */}
                <div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      <h5 className="font-medium text-gray-600">ChatGPT's Progress</h5>
                    </div>
                    <div className="ml-6 space-y-3 divide-y divide-gray-200">
                      {chosenLLMQuestions.map((item, index) => (
                        <div key={index} className="pt-3 first:pt-0">
                          <div className="font-medium text-gray-600">
                            Round {index + 1}:
                          </div>
                          <div className="mt-1">Q: "{item.question}"</div>
                          <div className="text-gray-600">A: {item.answer}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
          </div>
        );
      default:
        return (<div className="pb-8"></div>);
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 px-16">
            <div className="flex justify-center items-start">
              {renderGameBoard()}
            </div>
            <div className="flex-1">
              {renderGameControls()}
            </div>
          </div>
          <div className="w-full max-w-6xl mx-auto">
            {renderFinalHistory()}
          </div>
        </CardContent>

      </Card>

    </div>
  );
};

export default BattleshipGame;


// Add a utility function to calculate eliminated scenarios
const calculateEliminatedScenarios = (percentage: number, total: number) => {
  return Math.round((percentage / 100) * total);
};

// Constants
const TOTAL_ROUNDS = 5;
const QUESTION_TIME = 30;
const GRID_SIZE = 6;
const LLM_QUESTIONS: LLMQuestion[] = [];

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
        <AlertDescription className="flex-1">ChatGPT's question: "{llm.question}"</AlertDescription>
      </div>
    </Alert>
  </div>
);
const ProgressBar = (props: {
  history: { eig_adjusted: number; }[];
  eig_adjusted_sum: number;
  color: string;
  total: number;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm text-gray-600">
      <span>Scenarios eliminated: {Math.round(props.eig_adjusted_sum / 100 * props.total).toLocaleString()}</span>
      <span>Remaining scenarios: {Math.round((1 - props.eig_adjusted_sum / 100) * props.total).toLocaleString()}</span>
    </div>
    <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full flex">
        {props.history.map((item, index) => {
          const eliminated = calculateEliminatedScenarios(item.eig_adjusted, props.total);
          return (
            <div
              key={index}
              className={`h-full ${props.color} transition-all duration-500`}
              style={{
                width: `${item.eig_adjusted}%`,
                borderRight: index < props.history.length - 1 ? '2px solid rgba(255, 255, 255, 0.5)' : 'none'
              }}
              title={`Eliminated ${eliminated.toLocaleString()} scenarios`}
            />
          );
        })}
      </div>
    </div>
  </div>
)