import React, { useState, useEffect, useMemo } from 'react';
import { useCallback } from 'react';
import _ from 'lodash';

const TacticalMap = ({ width = 600, height = 600, gridSize = 6, onCellHover, selectedCell }) => {
  // Generate noise for terrain
  const generateNoise = useCallback((octaves, frequency, persistence) => {
    const noise = Array(width).fill().map(() => Array(height).fill(0));
    
    for (let octave = 0; octave < octaves; octave++) {
      const freq = frequency * Math.pow(2, octave);
      const amp = persistence ** octave;
      
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          // Using multiple sine waves for pseudo-random noise
          noise[x][y] += amp * (
            Math.sin(x / freq) * Math.cos(y / freq) +
            Math.sin((x + y) / freq) * Math.cos(x / freq) +
            Math.sin(y / freq) * Math.cos((x + y) / freq)
          );
        }
      }
    }
    
    return noise;
  }, [width, height]);

  // Generate terrain data
  const terrainData = useMemo(() => {
    const noise = generateNoise(4, 30, 0.5);
    const terrain = Array(gridSize).fill().map(() => Array(gridSize).fill('sea'));
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        let avgNoise = 0;
        const samples = 10;
        
        // Sample multiple points within each cell for smoother transitions
        for (let sx = 0; sx < samples; sx++) {
          for (let sy = 0; sy < samples; sy++) {
            const x = Math.floor(i * cellWidth + (sx * cellWidth) / samples);
            const y = Math.floor(j * cellHeight + (sy * cellHeight) / samples);
            avgNoise += noise[x][y];
          }
        }
        
        avgNoise /= (samples * samples);
        terrain[i][j] = avgNoise > 0.2 ? 'land' : 'sea';
      }
    }
    
    return terrain;
  }, [gridSize, width, height, generateNoise]);

  return (
    <svg 
      width={width} 
      height={height} 
      className="border border-gray-300 rounded-lg"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* Sea Pattern */}
        <pattern id="seaPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#a8d5e5"/>
          <path d="M0 10 Q5 8, 10 10 T20 10" 
                fill="none" 
                stroke="#95c8dc" 
                strokeWidth="0.5"
                transform="translate(0,0)"/>
          <path d="M0 10 Q5 12, 10 10 T20 10" 
                fill="none" 
                stroke="#95c8dc" 
                strokeWidth="0.5"
                transform="translate(0,5)"/>
        </pattern>

        {/* Land Pattern */}
        <pattern id="landPattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill="#c5d5a8"/>
          <circle cx="5" cy="5" r="0.5" fill="#b3c396"/>
          <circle cx="15" cy="15" r="0.5" fill="#b3c396"/>
          <path d="M10,2 L12,5 L8,5 Z" fill="#b3c396" transform="rotate(30,10,10)"/>
        </pattern>

        {/* Mountain Pattern */}
        <pattern id="mountainPattern" width="30" height="30" patternUnits="userSpaceOnUse">
          <path d="M15,5 L25,25 L5,25 Z" fill="#a89e8e" stroke="#998e7e" strokeWidth="0.5"/>
          <path d="M15,10 L20,20 L10,20 Z" fill="#b5aa9a" stroke="#a89e8e" strokeWidth="0.5"/>
        </pattern>

        {/* Grid Cell Highlight */}
        <filter id="cellGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {/* Render terrain */}
      {terrainData.map((row, i) => 
        row.map((cell, j) => {
          const cellWidth = width / gridSize;
          const cellHeight = height / gridSize;
          const x = i * cellWidth;
          const y = j * cellHeight;
          
          // Calculate neighboring cells for smooth transitions
          const hasLandNeighbor = {
            top: j > 0 && terrainData[i][j-1] === 'land',
            right: i < gridSize-1 && terrainData[i+1][j] === 'land',
            bottom: j < gridSize-1 && terrainData[i][j+1] === 'land',
            left: i > 0 && terrainData[i-1][j] === 'land'
          };

          return (
            <g key={`${i}-${j}`}>
              {/* Base terrain */}
              <rect
                x={x}
                y={y}
                width={cellWidth}
                height={cellHeight}
                fill={cell === 'land' ? 'url(#landPattern)' : 'url(#seaPattern)'}
                className="transition-colors duration-200"
              />
              
              {/* Terrain transitions */}
              {cell === 'land' && Object.entries(hasLandNeighbor).map(([direction, hasNeighbor]) => {
                if (!hasNeighbor) {
                  let transitionPath = '';
                  switch(direction) {
                    case 'top':
                      transitionPath = `M${x},${y} L${x+cellWidth},${y} L${x+cellWidth},${y+10} Q${x+cellWidth/2},${y+5} ${x},${y+10} Z`;
                      break;
                    case 'right':
                      transitionPath = `M${x+cellWidth},${y} L${x+cellWidth},${y+cellHeight} L${x+cellWidth-10},${y+cellHeight} Q${x+cellWidth-5},${y+cellHeight/2} ${x+cellWidth-10},${y} Z`;
                      break;
                    case 'bottom':
                      transitionPath = `M${x},${y+cellHeight} L${x+cellWidth},${y+cellHeight} L${x+cellWidth},${y+cellHeight-10} Q${x+cellWidth/2},${y+cellHeight-5} ${x},${y+cellHeight-10} Z`;
                      break;
                    case 'left':
                      transitionPath = `M${x},${y} L${x},${y+cellHeight} L${x+10},${y+cellHeight} Q${x+5},${y+cellHeight/2} ${x+10},${y} Z`;
                      break;
                  }
                  return (
                    <path
                      key={direction}
                      d={transitionPath}
                      fill="url(#landPattern)"
                      opacity="0.7"
                    />
                  );
                }
                return null;
              })}

              {/* Grid lines */}
              <rect
                x={x}
                y={y}
                width={cellWidth}
                height={cellHeight}
                fill="none"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="0.5"
                onMouseEnter={() => onCellHover && onCellHover(i, j)}
                style={{ cursor: 'pointer' }}
              />

              {/* Highlight for selected cell */}
              {selectedCell && selectedCell.x === i && selectedCell.y === j && (
                <rect
                  x={x}
                  y={y}
                  width={cellWidth}
                  height={cellHeight}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="2"
                  filter="url(#cellGlow)"
                  opacity="0.5"
                />
              )}

              {/* Cell coordinates */}
              <text
                x={x + cellWidth/2}
                y={y + cellHeight/2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="rgba(0,0,0,0.5)"
                fontSize="12"
                className="select-none pointer-events-none"
              >
                {`${String.fromCharCode(65 + i)}${j + 1}`}
              </text>
            </g>
          );
        })
      )}

      {/* Compass Rose */}
      <g transform={`translate(${width - 60}, ${height - 60})`}>
        <circle r="20" fill="white" fillOpacity="0.8"/>
        <path d="M0,-20 L5,-5 L0,-8 L-5,-5 Z" fill="#555"/>
        <path d="M0,20 L5,5 L0,8 L-5,5 Z" fill="#999"/>
        <path d="M20,0 L5,5 L8,0 L5,-5 Z" fill="#999"/>
        <path d="M-20,0 L-5,5 L-8,0 L-5,-5 Z" fill="#999"/>
        <text x="0" y="-25" textAnchor="middle" fontSize="10">N</text>
      </g>
    </svg>
  );
};

export default TacticalMap;