import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      onClick={toggleTheme}
      className="relative inline-flex items-center cursor-pointer"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Toggle Switch */}
      <div className={`
        relative w-20 h-10 rounded-full transition-colors duration-300 ease-in-out
        ${isDark ? 'bg-gray-800' : 'bg-gray-300'}
      `}>
        {/* Toggle Circle */}
        <div className={`
          absolute top-1 w-8 h-8 bg-white rounded-full shadow-md
          transition-transform duration-300 ease-in-out
          ${isDark ? 'translate-x-11' : 'translate-x-1'}
        `} />
        
        {/* Text Label */}
        <div className={`
          absolute inset-0 flex items-center text-sm font-medium
          transition-all duration-300
          ${isDark ? 'text-white justify-start pl-3' : 'text-gray-700 justify-end pr-3'}
        `}>
          {isDark ? 'Dark' : 'Light'}
        </div>
      </div>
    </div>
  );
}
