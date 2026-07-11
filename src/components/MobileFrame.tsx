import React from 'react';
import { Sparkles, Music, Star, ShieldCheck } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
}

export default function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div 
      id="mobile-frame-container" 
      className="min-h-screen bg-[#F8F9FA] lg:bg-[#F3F4F6] flex items-stretch lg:items-center justify-center py-0 lg:py-8 px-0 lg:px-6 selection:bg-[#FF5A5F] selection:text-white font-sans text-gray-800 antialiased overflow-x-hidden"
    >
      <div className="flex flex-col lg:flex-row w-full max-w-6xl min-h-screen lg:min-h-[750px] lg:h-[85vh] lg:max-h-[900px] bg-white lg:rounded-3xl lg:shadow-[0_25px_60px_rgba(0,0,0,0.06)] overflow-visible lg:overflow-hidden lg:border lg:border-gray-100/80">
        
        {/* LEFT BRAND PANEL (Visible on lg screens) */}
        <div className="hidden lg:flex flex-col justify-between lg:w-1/2 lg:shrink-0 p-14 bg-[#FFF4F2] relative overflow-hidden">
          {/* Subtle background circles */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-white rounded-full opacity-40 blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-10">
              <div className="w-10 h-10 bg-[#FF5A5F] rounded-xl flex items-center justify-center shadow-md shadow-[#FF5A5F]/20">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-gray-900">
                UnaMusica<span className="text-[#FF5A5F]">.com.br</span>
              </span>
            </div>
            
            <h1 className="text-5xl font-extrabold text-gray-950 leading-tight mb-6 tracking-tight">
              Sua vida virou <span className="text-[#FF5A5F] relative">música.<span className="absolute left-0 bottom-1 w-full h-1.5 bg-[#FF5A5F]/15 rounded-full"></span></span>
            </h1>
            <p className="text-base text-gray-600 leading-relaxed max-w-sm">
              Transforme memórias, brincadeiras e histórias reais em uma canção profissional personalizada por apenas R$ 1,00.
            </p>
          </div>

          {/* Core USP bullet points */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-[#FF5A5F]/10">
                <Sparkles className="w-5 h-5 text-[#FF5A5F]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Compositor Inteligente</p>
                <p className="text-xs text-gray-500">Perguntas fáceis no chat para guiar sua homenagem</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-emerald-100">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Liberação Pix Imediata</p>
                <p className="text-xs text-gray-500">Geração automática pelo estúdio via AbacatePay</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-400 relative z-10">
            © 2026 UnaMusica • Feito para emocionar ❤️
          </div>
        </div>

        {/* RIGHT APP FRAME / MOBILE container */}
        <div className="flex-1 min-w-0 lg:w-1/2 lg:shrink-0 flex flex-col bg-white relative min-h-screen lg:min-h-0 lg:h-full">
          
          {/* Floating Live Indicator Badge on desktop view */}
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md shadow-sm rounded-full py-1.5 px-3 border border-gray-100 hidden lg:flex items-center space-x-2 z-50">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estúdio Online</span>
          </div>

          {/* Interactive Responsive Content Container */}
          <div 
            id="phone-frame" 
            className="relative w-full flex-1 flex flex-col overflow-hidden transition-all duration-300 min-h-0"
          >
            {/* Inner Brand Header Bar */}
            <header id="app-brand-header" className="relative z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between lg:justify-end shrink-0">
              <div className="flex items-center gap-2 lg:hidden">
                <div className="w-8 h-8 rounded-lg bg-[#FF5A5F] flex items-center justify-center shadow-md shadow-[#FF5A5F]/15">
                  <Music className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <span className="font-bold text-base text-gray-900 tracking-tight">
                    UnaMusica
                  </span>
                  <span className="text-[#FF5A5F] font-bold text-sm ml-0.5">.com.br</span>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-[#FFF4F2] border border-[#FF5A5F]/10 px-2.5 py-1 rounded-full text-[#FF5A5F] text-xs font-bold">
                <Sparkles className="w-3 h-3 text-[#FF5A5F] animate-pulse" />
                <span>R$ 1,00</span>
              </div>
            </header>

            {/* Content Display Area */}
            <main id="app-main-content" className="flex-1 flex flex-col min-h-0 relative bg-white">
              {children}
            </main>
          </div>
        </div>

      </div>
    </div>
  );
}

