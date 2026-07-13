import React from "react";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileFrame from "../components/MobileFrame";

export default function FAQ() {
  const navigate = useNavigate();

  const faqData = [
    {
      q: "Como funciona o 1Música?",
      a: "Basta responderes a algumas perguntas simples sobre a pessoa homenageada e a ocasião no nosso chat, escolheres um género musical, e nossa inteligência artificial cria uma canção personalizada em minutos. O pagamento é feito via Pix e custa apenas R$ 1,00. Assim que o pagamento é confirmado, a composição é gerada imediatamente."
    },
    {
      q: "Posso partilhar as minhas canções?",
      a: "Sim! Cada canção vem com uma linda página de partilha exclusiva que podes enviar por WhatsApp, email ou redes sociais. A pessoa homenageada verá uma página dedicada com um reprodutor de música para ouvir o presente de qualquer dispositivo. O momento em que carregam no play é inesquecível!"
    },
    {
      q: "Guardam as minhas informações de pagamento?",
      a: "Não. Todos os pagamentos são processados em total segurança diretamente pelo Mercado Pago. O 1Música nunca guarda os teus dados de cartão ou informações de pagamento sensíveis nos nossos servidores. Todo o processo é encriptado pela plataforma oficial de pagamentos."
    },
    {
      q: "Durante quanto tempo são guardadas as minhas canções?",
      a: "As canções que compraste ficam guardadas na tua conta por tempo indefinido. Podes ouvi-las, transferi-las e partilhá-las a qualquer momento acedendo ao teu perfil na plataforma."
    },
    {
      q: "E se a minha canção não for gerada ou ficar bloqueada?",
      a: "Isto raramente acontece, mas caso o processo falhe ou fique travado, basta recarregares a página do reprodutor ou tentares novamente em alguns minutos. Se o problema persistir, contacta a nossa equipa de suporte pelo e-mail contato@qisites.com.br e resolveremos a tua situação o mais rápido possível."
    },
    {
      q: "Quais são os requisitos de login?",
      a: "Criamos um sistema de login sem senhas complicadas. Podes criar uma conta apenas informando o teu e-mail. Enviamos um código numérico rápido de verificação para a tua caixa de entrada para autenticar o teu acesso de forma simples e segura."
    },
    {
      q: "Onde posso encontrar as minhas canções compradas?",
      a: "Todas as canções que compraste ficam organizadas na secção “Minhas Músicas” que podes aceder clicando no teu Perfil no topo do site. Podes ouvir, partilhar ou retomar pagamentos de criações pendentes a qualquer momento."
    }
  ];

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">Dúvidas Frequentes</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3 pt-2">
            {faqData.map((item, idx) => (
              <details
                key={idx}
                className="group border border-gray-100 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-all overflow-hidden [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex items-center justify-between p-4 cursor-pointer outline-none select-none">
                  <span className="text-xs font-bold text-gray-800 leading-snug pr-4">
                    {item.q}
                  </span>
                  <span className="transition-transform duration-200 text-gray-400 group-open:rotate-180 shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </summary>
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-white">
                  <p className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-line">
                    {item.a}
                  </p>
                </div>
              </details>
            ))}
          </div>

          <div className="bg-[#FFF0F0] border border-[#FF5A5F]/10 rounded-2xl p-4.5 text-center space-y-2 mt-4">
            <p className="text-xs font-bold text-gray-800">Ainda tem dúvidas?</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Pode contactar a nossa equipa de suporte a qualquer momento através do e-mail oficial:
            </p>
            <a
              href="mailto:contato@qisites.com.br"
              className="block font-mono text-xs text-[#FF5A5F] hover:underline"
            >
              contato@qisites.com.br
            </a>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
