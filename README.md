# 🎵 1Música — Suas palavras viram música

Plataforma inovadora que transforma histórias reais, memórias e sentimentos em músicas exclusivas por apenas **R$ 1,00** através de Inteligência Artificial.

<div align="center">
  <a href="https://umamusica.vercel.app" target="_blank">
    <img src="./demo-umamusica.gif" alt="1Música Demo" width="100%" style="border-radius: 16px; box-shadow: 0 8px 30px rgba(0,0,0,0.12);" />
  </a>
  <p><em>Clique na imagem acima para testar a aplicação na Vercel! 🚀</em></p>
</div>

---

## 🚀 Deployments & Links Úteis

* **Frontend (Vercel):** [https://umamusica.vercel.app](https://umamusica.vercel.app)
* **API / Backend (Cloud Run Produção):** [https://umamusica-369350924489.us-east1.run.app](https://umamusica-369350924489.us-east1.run.app)
* **AI Studio Preview / Dev (Cloud Run):** [https://ais-dev-nnhg6xmwqtqe6av4j4tmgt-511413117051.us-east1.run.app/](https://ais-dev-nnhg6xmwqtqe6av4j4tmgt-511413117051.us-east1.run.app/)

---

## 🛠️ O que contém e Como Funciona

A plataforma foi desenhada com foco em simplicidade, gamificação e usabilidade mobile.

1. **Compositor Inteligente por Chat & Voz:**
   - O usuário conversa de forma dinâmica e amigável com a IA.
   - Suporte para envio de **mensagens de voz** (estilo WhatsApp) com transcrição e entendimento de contexto automáticos.
2. **Criação Livre com Revisor IA:**
   - Para quem prefere escrever a história toda de uma vez.
   - Possui o botão **"Revisar com IA"** que roda uma análise instantânea via Gemini, sugerindo melhorias como gênero musical faltante, nomes ou detalhes marcantes sem consumir a música do usuário.
3. **Pagamento Instantâneo por PIX:**
   - Integração com MercadoPago para compras rápidas de créditos por R$ 1,00.
   - Liberação automatizada imediata do saldo.
4. **Programa de Indicação Premiada:**
   - Links amigáveis (`/convite/:code`) com máscara de segurança para proteção de dados do indicador (ex: `pau***@gmail.com`).
   - Ao se cadastrar, tanto quem indicou quanto quem foi indicado ganham **1 música gratuita**.
5. **Player de Música com Letra Sincronizada:**
   - Interface premium de reprodução com controle de progresso.
   - Letras e metadados gerados exibidos dinamicamente na tela com opção de download de áudio.

---

## 🏗️ Arquitetura do Sistema

O projeto é estruturado em duas partes principais servidas de forma integrada ou independente:

### Frontend
- **Framework:** React + TypeScript + Vite.
- **Estilização:** Tailwind CSS (v4) com animações fluídas via `motion` (Framer Motion).
- **Icons:** `lucide-react`.

### Backend
- **Framework:** Node.js com Express e TypeScript (`server.ts`).
- **Bundler:** Compilado e minificado em um único arquivo CJS (`dist/server.cjs`) através do `esbuild` para facilidade de deploy em containers Docker no Cloud Run.

### Banco de Dados & Serviços
- **Supabase (PostgreSQL):** Gerenciamento de usuários, tokens de sessão, histórico de pedidos (`orders`), músicas criadas e dados de indicação.
- **Inteligência Artificial (Google Gemini SDK):** Utiliza o modelo `gemini-3.5-flash` para guiar a conversa interativa, transcrever áudios enviados no chat e revisar rascunhos de histórias.
- **Nodemailer / SMTP:** Envio de e-mails para validação OTP de login sem senha (passwordless).

---

## 💻 Como Rodar Localmente

### Pré-requisitos
- Node.js (v18+) instalado
- Banco de dados Supabase configurado (tabelas e schema disponíveis em `supabase_schema.sql`)

### Instalação
1. Clone o repositório e acesse a pasta.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Crie e preencha as variáveis de ambiente no arquivo `.env` (use o `.env.example` como base).
4. Inicie o servidor em modo de desenvolvimento (com auto-reload/watch ativado no backend):
   ```bash
   npm run dev
   ```
   *O app rodará em: [http://localhost:3000](http://localhost:3000)*

---

## 🗺️ Próximos Passos (Roadmap)

- [ ] **Integração Real de Geração de Áudio:** Conexão de API externa (ex: Suno AI, Udio, vAudio) para gerar a música cantada e em alta qualidade ao invés de usar o placeholder gerado de IA.
- [ ] **Webhooks do MercadoPago:** Implementação do webhook real para aprovação automática do pagamento no backend sem simulação manual.
- [ ] **Player de Áudio Avançado:** Suporte a reprodução em segundo plano e playlists com criações da comunidade.
- [ ] **Feed Público:** Espaço para usuários compartilharem suas criações favoritas de forma pública na plataforma.
