'use client';

import React, { useState, useCallback, useRef } from 'react';

interface SliderProps {
  min?: number;
  max?: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  min = -1,
  max = 1,
  step = 0.01,
  value,
  onChange,
  disabled = false,
  className = ''
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastEmitTime = useRef(0);
  const throttleDelay = 100; // 100ms throttle for sending values

  const handleChange = useCallback((newValue: number) => {
    const now = Date.now();
    if (now - lastEmitTime.current >= throttleDelay) {
      onChange(newValue);
      lastEmitTime.current = now;
    }
  }, [onChange]);

  // Map slider value to percentage for display
  const percentage = ((value - min) / (max - min)) * 100;

  // Format value for display
  const displayValue = value.toFixed(2);

  // Color based on value (negative = blue, positive = red, zero = gray)
  const getSliderColor = () => {
    if (value < 0) {
      const intensity = Math.abs(value);
      return `rgba(59, 130, 246, ${0.5 + intensity * 0.5})`; // Blue
    } else if (value > 0) {
      const intensity = Math.abs(value);
      return `rgba(239, 68, 68, ${0.5 + intensity * 0.5})`; // Red
    }
    return 'rgba(107, 114, 128, 0.5)'; // Gray
  };

  return (
    <div className={`slider-container ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium text-gray-600">Min: {min}</span>
        <span className={`text-2xl font-bold ${disabled ? 'text-gray-400' : 'text-gray-800'}`}>
          {displayValue}
        </span>
        <span className="text-sm font-medium text-gray-600">Max: {max}</span>
      </div>
      
      <div className="relative">
        {/* Custom styled slider track */}
        <div className="slider-track-container relative h-16 bg-gray-100 rounded-lg overflow-hidden">
          {/* Center line indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400"
            style={{ left: '50%' }}
          />
          
          {/* Filled portion */}
          <div 
            className="absolute top-0 bottom-0 transition-all duration-75"
            style={{
              backgroundColor: getSliderColor(),
              left: value < 0 ? `${percentage}%` : '50%',
              right: value > 0 ? `${100 - percentage}%` : '50%',
            }}
          />
          
          {/* Slider input (invisible but functional) */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => handleChange(parseFloat(e.target.value))}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            style={{ WebkitAppearance: 'none' }}
          />
          
          {/* Thumb indicator */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-6 h-12 bg-white border-2 rounded shadow-lg transition-all ${
              disabled ? 'border-gray-300' : 'border-gray-600'
            } ${isDragging ? 'scale-110 shadow-xl' : ''}`}
            style={{
              left: `calc(${percentage}% - 12px)`,
              pointerEvents: 'none'
            }}
          />
        </div>
        
        {/* Scale markers */}
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-500">-1.00</span>
          <span className="text-xs text-gray-500">-0.50</span>
          <span className="text-xs text-gray-500 font-medium">0.00</span>
          <span className="text-xs text-gray-500">0.50</span>
          <span className="text-xs text-gray-500">1.00</span>
        </div>
      </div>

      {disabled && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Slider is disabled. Join the queue to control it!
        </div>
      )}
    </div>
  );
}
