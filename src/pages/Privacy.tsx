import React from "react";
import { ArrowLeft, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MobileFrame from "../components/MobileFrame";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <MobileFrame>
      <div className="flex flex-col h-full bg-white overflow-y-auto">
        {/* Header */}
        <div className="flex items-center p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 ml-2">Privacidade</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto text-pink-500">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">Política de Privacidade</h2>
            <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Saiba como tratamos os seus dados e o que guardamos no seu navegador.
            </p>
          </div>

          <div className="text-gray-600 space-y-5 text-xs md:text-sm leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">1. Introdução</h3>
              <p>
                O 1Música está empenhado em proteger a sua privacidade. Esta política explica como recolhemos, utilizamos e salvaguardamos as suas informações ao utilizar a nossa plataforma.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">2. Armazenamento no Navegador</h3>
              <p>
                Para fornecer os nossos serviços básicos e compreender o uso do site, armazenamos algumas informações locais no seu navegador:
              </p>
              <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                <p className="font-semibold text-gray-800">Cookies e Armazenamento Local Essenciais:</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>
                    <strong className="text-gray-800">umamusica_user (Local Storage):</strong> Guarda os dados da sua sessão de login (e-mail, token de sessão, nome e saldo de músicas gratuitas) para mantê-lo conectado enquanto navega pela plataforma.
                  </li>
                  <li>
                    <strong className="text-gray-800">umamusica_cookie_consent (Local Storage):</strong> Guarda a sua preferência de cookies (se aceitou ou recusou o rastreamento do Microsoft Clarity).
                  </li>
                </ul>

                <p className="font-semibold text-gray-800 mt-3">Cookies de Análise e Desempenho (Opcionais):</p>
                <p>
                  Caso você aceite a nossa barra de consentimento de cookies, habilitamos o <strong className="text-gray-800">Microsoft Clarity</strong>, que cria os seguintes cookies:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-gray-600">
                  <li>
                    <strong className="text-gray-800">_clck (Cookie):</strong> Guarda um identificador único de usuário para que possamos entender como visitantes interagem com o site de forma agregada ao longo de várias visitas.
                  </li>
                  <li>
                    <strong className="text-gray-800">_clsk (Cookie):</strong> Guarda o identificador da sessão atual para ligar múltiplos acessos a páginas na mesma visita.
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">3. Como utilizamos estes dados</h3>
              <p>
                Os dados de sessão do utilizador servem unicamente para identificar a sua conta e as suas criações musicais personalizadas. Os dados analíticos do Microsoft Clarity são utilizados para gerar mapas de calor agregados (heatmaps) e reproduções de sessões de uso de forma anônima, ajudando-nos a identificar falhas de design, erros técnicos e otimizar o fluxo de checkout e criação de letras.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">4. Segurança dos Seus Dados</h3>
              <p>
                Suas informações de login são validadas através de códigos únicos de verificação de uso único enviados ao seu e-mail. Não guardamos senhas. O processo de pagamento via Pix é gerido integralmente pelo Mercado Pago, assegurando que não guardamos nem temos acesso a dados financeiros sensíveis.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-bold text-gray-800 text-sm">5. Gestão de Consentimento</h3>
              <p>
                Você pode revogar ou alterar o seu consentimento de cookies analíticos limpando os cookies do seu navegador ou limpando o armazenamento local da plataforma a qualquer momento.
              </p>
            </section>
          </div>

          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4.5 text-center space-y-2">
            <p className="text-xs font-bold text-gray-800">Dúvidas sobre privacidade?</p>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Fale conosco através do nosso e-mail de suporte:
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
