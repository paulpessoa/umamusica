import React from "react";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileFrame from "../components/MobileFrame";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">Termos de Uso</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto text-indigo-500">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Termos de Uso</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Regras e condições para o uso do estúdio 1Música.
            </p>
          </div>

          <div className="text-gray-600 space-y-5 text-xs md:text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">1. Aceitação dos Termos</h3>
              <p>
                Ao utilizar a plataforma 1Música, você concorda em cumprir e estar vinculado a estes termos de uso. Se você não concordar com algum destes termos, não utilize o nosso serviço.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">2. O Serviço e as Músicas</h3>
              <p>
                O 1Música é um estúdio virtual autônomo baseado em inteligência artificial. Criamos composições líricas e melódicas personalizadas com base nos inputs inseridos no chat pelo usuário. As criações destinam-se exclusivamente para fins de entretenimento pessoal e presentes.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">3. Responsabilidade pelo Conteúdo</h3>
              <p>
                Você é o único responsável pelos dados e descrições fornecidas no chat para a criação da canção. É expressamente proibido enviar dados ofensivos, discriminatórios, caluniosos ou que infrinjam direitos de terceiros. Reservamo-nos o direito de cancelar a geração e suspender a conta caso seja detetado abuso.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">4. Compras e Reembolsos</h3>
              <p>
                Cada criação personalizada custa R$ 1,00 e o pagamento é efetuado via Pix através do provedor Mercado Pago. Por se tratar de um produto digital gerado de forma imediata e personalizada com base nos seus inputs exclusivos, as transações concluídas são definitivas e não elegíveis para reembolso, exceto em caso de falha técnica comprovada no processamento da melodia.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">5. Cookies e Privacidade</h3>
              <p>
                Utilizamos armazenamento local e cookies de terceiros para melhorar o serviço e autenticar seu perfil. A aceitação e recusa de cookies de análise podem ser gerenciadas diretamente pelo banner de cookies na tela inicial do site. Para mais detalhes consulte a nossa <a href="/privacidade" className="text-purple-600 underline font-medium">Política de Privacidade</a>.
              </p>
            </section>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 text-center space-y-2">
            <p className="text-xs font-bold text-gray-800">Dúvidas sobre os termos?</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Entre em contato conosco:
            </p>
            <a href="mailto:contato@qisites.com.br" className="block font-mono text-xs text-[#FF5A5F] hover:underline">
              contato@qisites.com.br
            </a>
          </div>
        </div>
      </div>
    </MobileFrame>
  );
}
