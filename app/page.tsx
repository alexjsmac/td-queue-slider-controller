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
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-red-900/20">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black mb-4 relative inline-block">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-purple-500 to-cyan-500 animate-pulse">
              Concrete Canopy
            </span>
            <br />
            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg blur opacity-30 animate-pulse"></div>
          </h1>
          <p className="text-gray-400 text-lg tracking-wide mt-4">
            Take turns controlling the slider to influence the visuals and audio
          </p>
        </header>

        {/* Connection Status */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-3 h-3 ${
              isConnected ? 'bg-cyan-400 shadow-cyan-400/50' : 'bg-red-600 shadow-red-600/50'
            } shadow-lg animate-pulse`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
            <span className={`text-sm font-mono tracking-wider ${
              isConnected ? 'text-cyan-400' : 'text-red-400'
            }`}>
              [{isConnected ? 'SYSTEM::ONLINE' : 'SYSTEM::OFFLINE'}]
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-gray-900/90 backdrop-blur-sm border border-purple-500/30 rounded-none p-8 mb-8 relative overflow-hidden">
          {/* Glitch effect corners */}
          <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-cyan-500/50"></div>
          <div className="absolute top-0 right-0 w-20 h-20 border-r-2 border-t-2 border-cyan-500/50"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 border-l-2 border-b-2 border-cyan-500/50"></div>
          <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-cyan-500/50"></div>
          {/* Status Banner */}
          {isControlling && (
            <div className="mb-6 p-4 bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-cyan-500/50 relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-pulse"></div>
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-cyan-400 tracking-wider uppercase">
                    [ACTIVE CONTROL]
                  </h2>
                  <p className="text-sm text-gray-400 font-mono">
                    &gt; TRANSMITTING TO CONCRETE CANOPY_
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-mono font-bold text-cyan-400 tabular-nums">
                    {formatTime(remainingTime)}
                  </div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider">Cycles Remaining</div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1 bg-gray-800 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-500 transition-all duration-1000 ease-linear shadow-lg shadow-cyan-500/50"
                  style={{ width: `${(remainingTime / 30) * 100}%` }}
                />
              </div>
            </div>
          )}

          {isInQueue && (
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/50 relative">
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
              <h2 className="text-lg font-bold text-purple-400 tracking-wider uppercase">
                [QUEUE::POSITION]
              </h2>
              <p className="text-sm text-gray-400 font-mono mt-2">
                RANK: <span className="text-purple-400 font-bold text-xl">{queuePosition}</span> / {queueLength}
              </p>
              <p className="text-xs text-gray-500 mt-1 font-mono">
                ETA: {formatTime(queuePosition * 30)}
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
                className="group relative px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/50 overflow-hidden"
              >
                <span className="relative z-10">[ENTER QUEUE]</span>
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg blur opacity-30 group-hover:opacity-100 transition-opacity animate-pulse"></div>
              </button>
            )}

            {showRejoinButton && (
              <div className="text-center">
                <p className="text-red-400 mb-4 font-mono uppercase tracking-wide">
                  [SESSION::TERMINATED] - REINITIALIZE?
                </p>
                <button
                  onClick={handleRejoinQueue}
                  className="group relative px-10 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white font-bold uppercase tracking-wider transition-all hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50 overflow-hidden"
                >
                  <span className="relative z-10">[REQUEUE]</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
            )}

            {(isInQueue || isControlling) && (
              <div className="text-center">
                <p className="text-gray-400 text-sm font-mono">
                  {isControlling 
                    ? '> SIGNAL_TRANSMISSION::ACTIVE | CONCRETE_CANOPY_LINK::ESTABLISHED'
                    : `> STANDBY_MODE | QUEUE_AHEAD::${queuePosition - 1} ${queuePosition - 1 === 1 ? 'USER' : 'USERS'}`
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Queue Information */}
        <div className="bg-gray-900/90 backdrop-blur-sm border border-red-500/30 p-6 relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500 to-transparent"></div>
          <h3 className="text-lg font-bold text-red-400 mb-3 uppercase tracking-wider">
            [SYSTEM::METRICS]
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-black/50 border border-gray-800">
              <div className="text-3xl font-mono font-bold text-cyan-400 tabular-nums">
                {queueLength.toString().padStart(2, '0')}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-2">USERS_IN_QUEUE</div>
            </div>
            <div className="text-center p-3 bg-black/50 border border-gray-800">
              <div className="text-3xl font-mono font-bold text-purple-400">
                {isControlling ? 'LIVE' : queuePosition > 0 ? `#${queuePosition.toString().padStart(2, '0')}` : 'NULL'}
              </div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mt-2">STATUS_CODE</div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-center text-xs text-gray-600 font-mono uppercase tracking-wider">
          <p className="mb-1">&lt; CYCLE_TIME::30_SECONDS &gt;</p>
          <p>&lt; VALUE_RANGE::-1.000_TO_1.000 &gt;</p>
          <p className="text-cyan-600 mt-2">[ REALTIME_TRANSMISSION::ENABLED ]</p>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
