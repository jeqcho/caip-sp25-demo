import React, { useMemo } from 'react';

// Initial terrain pattern for server-side rendering
const initialTerrain = [
  ['deepWater', 'deepWater', 'deepWater', 'shallowWater', 'lowland', 'lowland'],
  ['deepWater', 'deepWater', 'shallowWater', 'beach', 'lowland', 'shallowWater'],
  ['deepWater', 'shallowWater', 'beach', 'lowland', 'shallowWater', 'deepWater'],
  ['deepWater', 'shallowWater', 'lowland', 'highland', 'shallowWater', 'deepWater'],
  ['shallowWater', 'beach', 'highland', 'shallowWater', 'deepWater', 'deepWater'],
  ['lowland', 'lowland', 'shallowWater', 'deepWater', 'deepWater', 'deepWater'],
];

// Terrain types and their visual properties
const terrainTypes = {
  deepWater: { name: 'Deep Water', color: '#2C7AAF', pattern: 'deepWaterPattern' },
  shallowWater: { name: 'Shallow Water', color: '#5497C4', pattern: 'shallowWaterPattern' },
  beach: { name: 'Beach', color: '#D4C391', pattern: 'beachPattern' },
  lowland: { name: 'Lowland', color: '#8BAF75', pattern: 'lowlandPattern' },
  highland: { name: 'Highland', color: '#6A8C59', pattern: 'highlandPattern' },
  mountain: { name: 'Mountain', color: '#505F44', pattern: 'mountainPattern' },
};

const TacticalMap = ({ 
  width = 600, 
  height = 600, 
  gridSize = 6, 
  onCellHover, 
  selectedCell, 
  seed = 1, 
  onTerrainGenerated 
}) => {
  // Enhanced terrain generation with multiple features
  const terrainData = useMemo(() => {
    if (seed === 1) {
      return initialTerrain;
    }

    // Improved seeded random function with better distribution
    const seededRandom = (x, y, salt = 0) => {
      const dot = x * 12.9898 + y * 78.233 + seed * 43758.5453 + salt * 7919;
      return ((Math.sin(dot) * 43758.5453) % 1 + 1) / 2;
    };

    // Generate multiple layers of noise for different features
    const generateNoiseLayer = (scale, salt) => {
      return Array(gridSize).fill().map((_, i) => 
        Array(gridSize).fill().map((_, j) => {
          const nx = i / gridSize * scale;
          const ny = j / gridSize * scale;
          return seededRandom(nx, ny, salt);
        })
      );
    };

    // Generate continental structure
    const continentalNoise = generateNoiseLayer(1, 1);
    const mountainNoise = generateNoiseLayer(2, 2);
    const detailNoise = generateNoiseLayer(4, 3);

    // Combine noise layers with different weights
    const combinedTerrain = Array(gridSize).fill().map((_, i) =>
      Array(gridSize).fill().map((_, j) => {
        const continental = continentalNoise[i][j] * 0.5;
        const mountain = mountainNoise[i][j] * 0.3;
        const detail = detailNoise[i][j] * 0.2;
        return continental + mountain + detail;
      })
    );

    // Initial terrain type assignment with height-based biomes
    const assignTerrainType = (height) => {
      if (height < 0.3) return 'deepWater';
      if (height < 0.4) return 'shallowWater';
      if (height < 0.45) return 'beach';
      if (height < 0.6) return 'lowland';
      if (height < 0.75) return 'highland';
      return 'mountain';
    };

    let terrainType = combinedTerrain.map(row =>
      row.map(height => assignTerrainType(height))
    );

    // Apply coastal smoothing
    const smoothCoastline = (terrain) => {
      return terrain.map((row, i) =>
        row.map((cell, j) => {
          const neighbors = [];
          for (let di = -1; di <= 1; di++) {
            for (let dj = -1; dj <= 1; dj++) {
              const ni = i + di;
              const nj = j + dj;
              if (ni >= 0 && ni < gridSize && nj >= 0 && nj < gridSize) {
                neighbors.push(terrain[ni][nj]);
              }
            }
          }

          // Count water vs land neighbors
          const waterCount = neighbors.filter(n => 
            n === 'deepWater' || n === 'shallowWater'
          ).length;
          const landCount = neighbors.length - waterCount;

          // Apply smoothing rules
          if (cell === 'beach') {
            if (waterCount > landCount + 1) return 'shallowWater';
            if (landCount > waterCount + 1) return 'lowland';
          }
          return cell;
        })
      );
    };

    // Apply coastal smoothing multiple times
    for (let i = 0; i < 2; i++) {
      terrainType = smoothCoastline(terrainType);
    }

    // Create islands and lakes
    const createFeatures = (terrain) => {
      const featureNoise = generateNoiseLayer(3, 4);
      
      return terrain.map((row, i) =>
        row.map((cell, j) => {
          const feature = featureNoise[i][j];
          
          // Create islands in water
          if ((cell === 'deepWater' || cell === 'shallowWater') && feature > 0.85) {
            return 'beach';
          }
          
          // Create lakes in land
          if ((cell === 'lowland' || cell === 'highland') && feature > 0.9) {
            return 'shallowWater';
          }
          
          return cell;
        })
      );
    };

    terrainType = createFeatures(terrainType);

    return terrainType;
  }, [seed, gridSize]);

  // Notify parent of terrain updates
  React.useEffect(() => {
    if (onTerrainGenerated) {
      onTerrainGenerated(terrainData);
    }
  }, [terrainData, onTerrainGenerated]);

  // Generate unique pattern IDs for this instance
  const patternIds = {
    deepWaterPattern: `deepWater-${seed}`,
    shallowWaterPattern: `shallowWater-${seed}`,
    beachPattern: `beach-${seed}`,
    lowlandPattern: `lowland-${seed}`,
    highlandPattern: `highland-${seed}`,
    mountainPattern: `mountain-${seed}`,
  };

  return (
    <svg 
      width={width} 
      height={height} 
      className="border border-gray-300 rounded-lg"
      viewBox={`0 0 ${width} ${height}`}
    >
      <defs>
        {/* Deep Water Pattern */}
        <pattern id={patternIds.deepWaterPattern} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={terrainTypes.deepWater.color}/>
          <path d="M0 10 Q5 8, 10 10 T20 10" 
                fill="none" 
                stroke="#1B5C8D"
                strokeWidth="0.5"
                transform="translate(0,0)"/>
          <path d="M0 10 Q5 12, 10 10 T20 10" 
                fill="none" 
                stroke="#1B5C8D"
                strokeWidth="0.5"
                transform="translate(0,5)"/>
        </pattern>

        {/* Shallow Water Pattern */}
        <pattern id={patternIds.shallowWaterPattern} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={terrainTypes.shallowWater.color}/>
          <path d="M0 10 Q5 9, 10 10 T20 10" 
                fill="none" 
                stroke="#3A7EA6"
                strokeWidth="0.3"
                transform="translate(0,0)"/>
        </pattern>

        {/* Beach Pattern */}
        <pattern id={patternIds.beachPattern} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={terrainTypes.beach.color}/>
          <circle cx="5" cy="5" r="0.3" fill="#C4B381"/>
          <circle cx="15" cy="15" r="0.3" fill="#C4B381"/>
        </pattern>

        {/* Lowland Pattern */}
        <pattern id={patternIds.lowlandPattern} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={terrainTypes.lowland.color}/>
          <path d="M10,2 L12,5 L8,5 Z" fill="#7A9C64" transform="rotate(30,10,10)"/>
        </pattern>

        {/* Highland Pattern */}
        <pattern id={patternIds.highlandPattern} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={terrainTypes.highland.color}/>
          <path d="M5,5 L8,2 L11,5 Z" fill="#597A47"/>
          <path d="M15,15 L18,12 L21,15 Z" fill="#597A47"/>
        </pattern>

        {/* Mountain Pattern */}
        <pattern id={patternIds.mountainPattern} width="20" height="20" patternUnits="userSpaceOnUse">
          <rect width="20" height="20" fill={terrainTypes.mountain.color}/>
          <path d="M10,2 L15,10 L5,10 Z" fill="#3D4A33"/>
          <path d="M15,8 L20,16 L10,16 Z" fill="#3D4A33" transform="translate(-5,0)"/>
        </pattern>

        <filter id="cellGlow">
          <feGaussianBlur stdDeviation="2" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      {terrainData.map((row, i) => 
        row.map((cell, j) => {
          const cellWidth = width / gridSize;
          const cellHeight = height / gridSize;
          const x = i * cellWidth;
          const y = j * cellHeight;

          return (
            <g key={`${i}-${j}`}>
              <rect
                x={x}
                y={y}
                width={cellWidth}
                height={cellHeight}
                fill={`url(#${patternIds[terrainTypes[cell].pattern]})`}
                className="transition-colors duration-200"
              />

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

      <g transform={`translate(${width - 40}, ${height - 40})`}>
        <circle r="15" fill="white" fillOpacity="0.8"/>
        <path d="M0,-15 L4,-4 L0,-6 L-4,-4 Z" fill="#555"/>
        <path d="M0,15 L4,4 L0,6 L-4,4 Z" fill="#999"/>
        <path d="M15,0 L4,4 L6,0 L4,-4 Z" fill="#999"/>
        <path d="M-15,0 L-4,4 L-6,0 L-4,-4 Z" fill="#999"/>
        <text x="0" y="-18" textAnchor="middle" fontSize="8">N</text>
      </g>
    </svg>
  );
};

export default TacticalMap;