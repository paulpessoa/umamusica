import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Gift } from "lucide-react";
import MobileFrame from "../components/MobileFrame";

export default function Invite() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviterEmail, setInviterEmail] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!code) {
      setError(true);
      setLoading(false);
      return;
    }

    fetch(`${import.meta.env.VITE_API_URL || ""}/api/invite/${code}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        if (data.email) {
          setInviterEmail(data.email);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  return (
    <MobileFrame>
      <div className="flex-1 bg-white flex flex-col items-center justify-center p-6 text-center">
        {loading ? (
          <Loader2 className="w-10 h-10 text-[#FF5A5F] animate-spin" />
        ) : error ? (
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
              <Gift className="w-10 h-10 text-red-300" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Convite Inválido</h1>
            <p className="text-gray-500 mb-8 max-w-sm">
              Parece que este link de indicação não existe mais ou está incorreto.
            </p>
            <button
              onClick={() => navigate("/")}
              className="w-full max-w-xs bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-6 rounded-2xl transition-all cursor-pointer"
            >
              Ir para a Página Inicial
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
              Você ganhou um <br />
              <span className="text-[#FF5A5F]">convite especial!</span>
            </h1>
            <p className="text-[15px] text-gray-600 mb-10 max-w-sm leading-relaxed">
              O seu amigo <strong className="text-gray-900">{inviterEmail}</strong> te indicou para transformar a sua história em uma música exclusiva e inesquecível.
            </p>

            <button
              onClick={() => navigate(`/login?ref=${code}`)}
              className="w-full max-w-xs bg-[#FF5A5F] hover:bg-[#e0484d] text-white font-bold py-4 px-6 rounded-2xl shadow-[0_8px_25px_rgba(255,90,95,0.35)] flex items-center justify-center gap-2 text-lg tracking-wide transition-all active:scale-95 cursor-pointer"
            >
              Aceitar Convite
              <ArrowRight className="w-6 h-6" />
            </button>
            <p className="text-xs text-gray-400 mt-6 max-w-[280px] text-center">
              Ao criar sua conta, seu amigo ganhará saldo para criar mais músicas gratuitas.
            </p>
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
