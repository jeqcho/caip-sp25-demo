'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Timer, Brain, User, Bot, Anchor } from 'lucide-react';
import TacticalMap from '@/components/TacticalMap';

// Define types
type TerrainType = 'deepWater' | 'shallowWater' | 'beach' | 'lowland' | 'highland' | 'mountain';
type TerrainData = TerrainType[][];
type Ship = { row: number; col: number; };
type SelectedCell = { x: number; y: number; } | null;

const BattleshipGame = () => {
  // Game state management
  const [gameState, setGameState] = useState('initial');
  const [showResults, setShowResults] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [userQuestion, setUserQuestion] = useState('');
  const [llmQuestion, setLlmQuestion] = useState('');
  const [ships, setShips] = useState<Ship[]>([]);
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
  const [llmQuestionCount, setLlmQuestionCount] = useState(0);
  
  // Terrain state
  const [mapSeed, setMapSeed] = useState(1);
  const [terrainData, setTerrainData] = useState<TerrainData | null>(null);

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const llmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const questionCountRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up intervals
  useEffect(() => {
    const cleanup = () => {
      [timerRef, llmTimerRef, questionCountRef].forEach(ref => {
        if (ref.current) {
          clearInterval(ref.current);
          ref.current = null;
        }
      });
    };

    return cleanup;
  }, []);

  // Callback to receive terrain data from TacticalMap
  const handleTerrainGenerated = useCallback((newTerrain: TerrainData) => {
    setTerrainData(newTerrain);
  }, []);

  const generateShipPositions = useCallback(() => {
    if (!terrainData) return [];
    
    const newShips: Ship[] = [];
    const usedPositions = new Set<string>();
    const seaTiles: Ship[] = [];

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
  }, [terrainData]);

  // Effect to place ships when terrain is ready
  useEffect(() => {
    if (terrainData && gameState === 'userQuestion') {
      const newShips = generateShipPositions();
      setShips(newShips);
    }
  }, [terrainData, gameState, generateShipPositions]);

  const startGame = useCallback(() => {
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
  }, []);

  const startCountdown = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const simulateQuestionGeneration = useCallback(() => {
    if (questionCountRef.current) clearInterval(questionCountRef.current);
    
    questionCountRef.current = setInterval(() => {
      setLlmQuestionCount(prev => {
        if (prev >= 2000) {
          if (questionCountRef.current) {
            clearInterval(questionCountRef.current);
            questionCountRef.current = null;
          }
          return 2000;
        }
        return prev + Math.floor(Math.random() * 100) + 50;
      });
    }, 100);
  }, []);

  const startLlmThinking = useCallback(() => {
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
  }, [simulateQuestionGeneration]);

  const handleQuestionSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (userQuestion.trim()) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
  }, [userQuestion]);

  // Rest of the component remains the same...

  return (
    // ... existing JSX
  );
};

export default BattleshipGame;