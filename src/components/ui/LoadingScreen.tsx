import React, { useState, useEffect } from 'react';

const quotes = [
  {
    text: "When a metric becomes a target it fails to be a good metric.",
    author: "Goodhart's Law"
  },
  {
    text: "What gets measured, gets improved.",
    author: "Peter Drucker"
  }
];

const LoadingScreen: React.FC = () => {
  const [randomQuote, setRandomQuote] = useState(quotes[0]);

  useEffect(() => {
    // Select a random quote when component mounts
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setRandomQuote(quotes[randomIndex]);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto">
        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-brand-blue flex items-center justify-center">
            <span className="text-white text-xl font-bold">CC</span>
          </div>
          
          <div className="space-y-2">
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">Loading</h1>
              <p className="text-sm text-gray-500">Please wait...</p>
            </div>
            
            <div className="flex justify-center">
              <div className="relative w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="absolute top-0 left-0 h-full w-full bg-brand-blue animate-pulse-slow"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle quote section */}
        <div className="text-center max-w-md mx-auto">
          <blockquote className="text-sm text-gray-400 italic">
            "{randomQuote.text}"
          </blockquote>
          <cite className="text-xs text-gray-300 not-italic mt-2 block">
            — {randomQuote.author}
          </cite>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
