'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';

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
  const [localValue, setLocalValue] = useState(value);
  const lastEmitTime = useRef(0);
  const throttleDelay = 100; // 100ms throttle for sending values
  const sliderRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sync local value with prop value when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleChange = useCallback((newValue: number) => {
    // Clamp value to min/max
    let clampedValue = Math.max(min, Math.min(max, newValue));
    
    // Snap to step
    if (step > 0) {
      clampedValue = Math.round(clampedValue / step) * step;
      // Ensure we don't have floating point errors
      clampedValue = Math.round(clampedValue * 1000) / 1000;
    }
    
    setLocalValue(clampedValue);
    
    const now = Date.now();
    if (now - lastEmitTime.current >= throttleDelay) {
      onChange(clampedValue);
      lastEmitTime.current = now;
    }
  }, [onChange, min, max, step]);

  // Calculate position from value
  const calculatePositionFromValue = (val: number) => {
    return ((val - min) / (max - min)) * 100;
  };

  // Calculate value from position
  const calculateValueFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    return min + (percentage / 100) * (max - min);
  }, [min, max, value]);

  // Handle pointer movement (works for both mouse and touch)
  const handlePointerMove = useCallback((clientX: number) => {
    if (!isDragging || disabled) return;
    
    const newValue = calculateValueFromPosition(clientX);
    handleChange(newValue);
  }, [isDragging, disabled, calculateValueFromPosition, handleChange]);

  // Handle pointer down
  const handlePointerDown = useCallback((e: React.PointerEvent | React.TouchEvent) => {
    if (disabled) return;
    
    e.preventDefault(); // Prevent default touch behavior
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const newValue = calculateValueFromPosition(clientX);
    handleChange(newValue);
  }, [disabled, calculateValueFromPosition, handleChange]);

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    // Emit final value when releasing
    onChange(localValue);
  }, [localValue, onChange]);

  // Add global listeners for pointer move/up when dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalPointerMove = (e: PointerEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      handlePointerMove(clientX);
    };

    const handleGlobalPointerUp = () => {
      handlePointerUp();
    };

    // Use both pointer and touch events for maximum compatibility
    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);
    document.addEventListener('touchmove', handleGlobalPointerMove, { passive: false });
    document.addEventListener('touchend', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove);
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('touchmove', handleGlobalPointerMove);
      document.removeEventListener('touchend', handleGlobalPointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Map slider value to percentage for display
  const percentage = calculatePositionFromValue(localValue);

  // Format value for display
  const displayValue = localValue.toFixed(2);

  // Color based on value (negative = blue, positive = red, zero = gray)
  const getSliderColor = () => {
    if (localValue < 0) {
      const intensity = Math.abs(localValue);
      return `rgba(59, 130, 246, ${0.5 + intensity * 0.5})`; // Blue
    } else if (localValue > 0) {
      const intensity = Math.abs(localValue);
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
      
      <div className="relative" ref={sliderRef}>
        {/* Custom styled slider track */}
        <div 
          ref={trackRef}
          className={`slider-track-container relative h-20 bg-gray-100 rounded-lg overflow-hidden touch-none ${
            disabled ? 'opacity-50' : 'cursor-pointer'
          }`}
          onPointerDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Center line indicator */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-gray-400 pointer-events-none"
            style={{ left: '50%' }}
          />
          
          {/* Filled portion */}
          <div 
            className="absolute top-0 bottom-0 transition-all duration-75 pointer-events-none"
            style={{
              backgroundColor: getSliderColor(),
              left: localValue < 0 ? `${percentage}%` : '50%',
              right: localValue > 0 ? `${100 - percentage}%` : '50%',
            }}
          />
          
          {/* Thumb indicator - now larger for easier touch targeting */}
          <div 
            className={`absolute top-1/2 -translate-y-1/2 w-10 h-16 bg-white border-3 rounded-lg shadow-lg transition-transform pointer-events-none ${
              disabled ? 'border-gray-300' : 'border-gray-600'
            } ${isDragging ? 'scale-110 shadow-xl' : ''}`}
            style={{
              left: `calc(${percentage}% - 20px)`,
            }}
          >
            {/* Add inner dot for visual feedback */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-gray-600 rounded-full" />
          </div>
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
