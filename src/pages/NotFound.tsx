import React from "react";
import { ArrowRight, FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileFrame from "../components/MobileFrame";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-[#FFF0F0] to-white/0 pointer-events-none" />

        <div className="px-6 flex-1 flex flex-col items-center justify-center text-center space-y-6 relative z-10">
          <div className="w-16 h-16 bg-[#FFF0F0] border border-[#FF5A5F]/15 rounded-3xl flex items-center justify-center text-[#FF5A5F] shadow-sm animate-bounce">
            <FileQuestion className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">404</h1>
            <h2 className="text-base font-bold text-gray-800">Página Não Encontrada</h2>
            <p className="text-xs text-gray-500 max-w-[240px] mx-auto leading-relaxed">
              Opa! A página que procura não existe ou foi removida do 1Música.
            </p>
          </div>

          <button
            onClick={() => navigate("/")}
            className="w-full max-w-[200px] py-3.5 bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold rounded-2xl shadow-md shadow-[#FF5A5F]/15 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer"
          >
            Voltar ao Início
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 text-center text-[10px] text-gray-400">
          © 2026 1Música · Feito com ❤️ por Qisites
        </div>
      </div>
    </MobileFrame>
  );
}
