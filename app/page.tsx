'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useFirebaseQueue';
import { Slider } from '@/components/Slider';
import { Footer } from '@/components/Footer';

export default function Home() {
  const {
    isConnected,
    isActive,
    queuePosition,
    queueLength,
    remainingTime,
    joinQueue,
    rejoinQueue,
    sendSliderValue
  } = useSocket();

  const [sliderValue, setSliderValue] = useState(0);
  const [hasJoinedBefore, setHasJoinedBefore] = useState(false);

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    if (isActive) {
      sendSliderValue(value);
    }
  };

  const handleJoinQueue = () => {
    joinQueue();
    setHasJoinedBefore(true);
  };

  const handleRejoinQueue = () => {
    rejoinQueue();
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine UI state
  const showJoinButton = !isActive && queuePosition === -1 && !hasJoinedBefore;
  const showRejoinButton = !isActive && queuePosition === -1 && hasJoinedBefore;
  const isInQueue = queuePosition > 0;
  const isControlling = isActive && queuePosition === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Concrete Canopy - Nuit Blanche London 
          </h1>
          <p className="text-gray-600">
            Take turns controlling the slider to influence the experience.
          </p>
        </header>

        {/* Connection Status */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          {/* Status Banner */}
          {isControlling && (
            <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-green-800">
                    You&apos;re in control!
                  </h2>
                  <p className="text-sm text-green-700">
                    Move the slider to send values to the installation.
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-800">
                    {formatTime(remainingTime)}
                  </div>
                  <div className="text-xs text-green-700">remaining</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-green-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(remainingTime / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isInQueue && (
            <div className="mb-6 p-4 bg-blue-100 border border-blue-300 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-800">
                You&apos;re in the queue
              </h2>
              <p className="text-sm text-blue-700">
                Position: <span className="font-bold">{queuePosition}</span> of {queueLength}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Estimated wait: {formatTime(queuePosition * 30)}
              </p>
            </div>
          )}

          {/* Slider Component */}
          <div className="mb-8">
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              disabled={!isControlling}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center">
            {showJoinButton && (
              <button
                onClick={handleJoinQueue}
                className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
              >
                Join Queue
              </button>
            )}

            {showRejoinButton && (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Your turn has ended. Would you like to go again?
                </p>
                <button
                  onClick={handleRejoinQueue}
                  className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  Rejoin Queue
                </button>
              </div>
            )}

            {(isInQueue || isControlling) && (
              <div className="text-center">
                <p className="text-gray-500 text-sm">
                  {isControlling 
                    ? 'Enjoy your turn! The slider values are being sent to the installation.'
                    : `Please wait for your turn. ${queuePosition - 1} ${queuePosition - 1 === 1 ? 'person' : 'people'} ahead of you.`
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Queue Information */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Queue Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-700">
                {queueLength}
              </div>
              <div className="text-xs text-gray-500">People in Queue</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded">
              <div className="text-2xl font-bold text-gray-700">
                {isControlling ? 'Active' : queuePosition > 0 ? `#${queuePosition}` : 'Not Queued'}
              </div>
              <div className="text-xs text-gray-500">Your Status</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Each person gets 30 seconds to control the slider.</p>
          <p>Values range from -1 to 1 and are sent to Touch Designer in real-time.</p>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
