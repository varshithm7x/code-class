
import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
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
            <div className="relative w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="absolute top-0 left-0 h-full w-full bg-brand-blue animate-pulse-slow"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
