'use client';

import React, { useState, useEffect } from 'react';

const TARGET_DATE = new Date('2026-03-31T00:00:00').getTime();

const ReleaseCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = TARGET_DATE - now;

      if (distance < 0) {
        clearInterval(timer);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-black text-white p-6 font-sans">
      <h2 className="text-sm tracking-[0.3em] uppercase mb-4 text-zinc-500">New Single Dropping</h2>
      <h1 className="text-6xl md:text-8xl font-black mb-12 bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-600">
        VIYAC
      </h1>
      
      {/* Countdown Grid */}
      <div className="grid grid-cols-4 gap-4 md:gap-8 mb-16 text-center">
        {Object.entries(timeLeft).map(([label, value]) => (
          <div key={label} className="flex flex-col">
            <span className="text-4xl md:text-6xl font-mono tabular-nums">{value.toString().padStart(2, '0')}</span>
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 mt-2">{label}</span>
          </div>
        ))}
      </div>

      {/* Pre-Save Button */}
      <button disabled
        onClick={() => window.open('https://your-presave-link.com', '_blank')}
        className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-tighter hover:bg-zinc-200 transition-all duration-300 rounded-sm"
      >
        <span className="relative z-10">Pre-Save on Spotify</span>
        <div className="absolute inset-0 bg-blue-500 blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
      </button>

      <p className="mt-8 text-zinc-600 text-xs italic">
        Rocket: Written by Viyac &bull; Vocal Synthesis by AI
      </p>
    </div>
  );
};

export default ReleaseCountdown;
