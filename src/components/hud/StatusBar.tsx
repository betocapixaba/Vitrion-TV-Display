import React, { useState, useEffect } from 'react';
import { WifiOff, Settings, ShieldCheck } from 'lucide-react';

interface StatusBarProps {
  isOnline: boolean;
  totalItems: number;
  currentIndex: number;
  onOpenDiagnostics: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isOnline,
  totalItems,
  currentIndex,
  onOpenDiagnostics,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide status controls after 5 seconds of inactivity so signage is unencumbered
  useEffect(() => {
    let timer: number;
    const showAndScheduleHide = () => {
      setIsVisible(true);
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        setIsVisible(false);
      }, 5000);
    };

    window.addEventListener('mousemove', showAndScheduleHide);
    window.addEventListener('keydown', showAndScheduleHide);
    showAndScheduleHide();

    return () => {
      window.removeEventListener('mousemove', showAndScheduleHide);
      window.removeEventListener('keydown', showAndScheduleHide);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      className={`fixed bottom-6 left-8 right-8 z-40 flex items-center justify-between pointer-events-none transition-all duration-500 ${
        isVisible || !isOnline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Left: Offline notice or subtle badge */}
      <div className="flex items-center space-x-3 pointer-events-auto">
        {!isOnline && (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-amber-950/80 border border-amber-600/70 text-amber-300 text-xs backdrop-blur-md shadow-xl animate-pulse">
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">OFFLINE • Reproduzindo do Cache Local</span>
          </div>
        )}
      </div>

      {/* Right: Loop progress dots & Diagnostic trigger */}
      <div className="flex items-center space-x-3 pointer-events-auto">
        {totalItems > 1 && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
            {Array.from({ length: totalItems }).map((_, i) => (
              <span
                key={i}
                className={`transition-all duration-300 rounded-full ${
                  i === currentIndex
                    ? 'w-4 h-1.5 bg-sky-400'
                    : 'w-1.5 h-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
        )}

        <button
          onClick={onOpenDiagnostics}
          title="Abrir Menu de Diagnóstico (Tecla M)"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 hover:border-white/30 text-slate-300 hover:text-white text-xs transition-all shadow-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500"
        >
          <Settings className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline font-medium">Menu (M)</span>
        </button>
      </div>
    </div>
  );
};
