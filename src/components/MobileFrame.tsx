import React from 'react';
import { Music } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface MobileFrameProps {
  children: React.ReactNode;
}

export default function MobileFrame({ children }: MobileFrameProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      id="app-layout"
      className="min-h-screen bg-gray-50 flex flex-col selection:bg-[#FF5A5F] selection:text-white font-sans text-gray-800 antialiased"
    >
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-sm shrink-0">
        <div onClick={() => navigate("/")} className="flex items-center gap-2 cursor-pointer select-none">
          <div className="relative w-8 h-8 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
              className="absolute inset-0 rounded-lg bg-[#FF5A5F] shadow-md shadow-[#FF5A5F]/30"
            />
            <Music className="relative z-10 w-4 h-4 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base text-gray-900 tracking-tight">
              1<span className="text-[#FF5A5F]">Música</span>
            </span>
            <span className="text-sm font-bold text-gray-400">=</span>
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.4, 1],
                  opacity: [0.2, 0.5, 0.2]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 bg-emerald-400 rounded blur-sm"
              />
              <motion.span
                animate={{
                  scale: [1, 1.08, 1],
                  textShadow: [
                    "0 0 6px rgba(16, 185, 129, 0.4)",
                    "0 0 15px rgba(16, 185, 129, 0.7)",
                    "0 0 6px rgba(16, 185, 129, 0.4)"
                  ]
                }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className="relative text-[10px] font-black text-emerald-600 uppercase tracking-wider"
              >
                R$ 1 real
              </motion.span>
            </div>
          </div>
        </div>

        {/* Auth actions */}
        <div className="flex items-center space-x-3.5">
          {user ? (
            <>
              <button
                onClick={() => navigate('/perfil')}
                className="text-xs font-bold text-gray-700 hover:text-[#FF5A5F] transition-colors cursor-pointer"
              >
                Perfil
              </button>
              <div className="w-px h-3.5 bg-gray-200"></div>
              <button
                onClick={logout}
                className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-xs font-bold text-[#FF5A5F] bg-[#FFF0F0] px-4 py-2 rounded-full hover:bg-[#ffe4e4] transition-colors cursor-pointer"
            >
              Entrar
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto flex flex-col bg-white border-x border-gray-100 shadow-sm min-h-0 relative">
        {children}
      </main>
    </div>
  );
}