import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-full"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Toggle Switch Background */}
      <div className={`
        relative w-20 h-8 rounded-full transition-all duration-300 ease-in-out
        ${isDark 
          ? 'bg-slate-700 shadow-inner' 
          : 'bg-gray-200 shadow-inner'
        }
      `}>
        {/* Toggle Circle */}
        <div className={`
          absolute top-0.5 left-0.5 w-7 h-7 bg-white rounded-full shadow-md
          transition-transform duration-300 ease-in-out
          ${isDark ? 'translate-x-12' : 'translate-x-0'}
        `}>
          {/* Optional icon inside circle */}
          <div className="w-full h-full flex items-center justify-center">
            {isDark ? (
              <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
            ) : (
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
            )}
          </div>
        </div>
        
        {/* Text Label */}
        <div className={`
          absolute inset-0 flex items-center text-xs font-medium pointer-events-none
          transition-all duration-300
          ${isDark 
            ? 'text-white justify-start pl-2' 
            : 'text-gray-600 justify-end pr-2'
          }
        `}>
          {isDark ? 'Dark' : 'Light'}
        </div>
      </div>
    </button>
  );
}
