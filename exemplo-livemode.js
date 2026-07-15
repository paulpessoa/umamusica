;(function () {
  if (document.getElementById("car-assistant-widget-host")) {
    console.log("O assistente ja esta em execucao.")
    return
  }

  const EXPRESSIONS = {
    base: "https://i.imgur.com/iBP34AA.png",
    closed_eyes: "https://i.imgur.com/EzRbyFc.png",
    waving: "https://i.imgur.com/vfki4ZN.png",
    pointing: "https://i.imgur.com/vCQkf1Y.png",
    smiling_closed: "https://i.imgur.com/XzLnqwx.png",
    surprised: "https://i.imgur.com/wlEkdAw.png"
  }

  Object.values(EXPRESSIONS).forEach((src) => {
    const img = new Image()
    img.src = src
  })

  const host = document.createElement("div")
  host.id = "car-assistant-widget-host"
  host.style.position = "fixed"
  host.style.top = "50%"
  host.style.right = "20px"
  host.style.transform = "translateY(-50%)"
  host.style.zIndex = "2147483647"
  ;(document.body || document.documentElement).appendChild(host)

  const shadow = host.attachShadow({ mode: "open" })

  const widgetStyle = document.createElement("style")
  widgetStyle.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');

        :host { all: initial; }

        #widget-container {
            font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            display: flex;
            flex-direction: row-reverse;
            align-items: center;
            gap: 16px;
        }

        #car-fab {
            width: 105px;
            height: 140px;
            background-image: url('${EXPRESSIONS.base}');
            background-position: center;
            background-size: contain;
            background-repeat: no-repeat;
            border: none;
            border-radius: 0;
            background-color: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.3));
            flex-shrink: 0;
            transition: transform 0.2s ease, filter 0.2s ease;
            user-select: none;
            position: relative;
            overflow: visible;
        }

        #car-fab:hover { transform: scale(1.1); }
        #car-fab:active { transform: scale(0.95); }

        .ai-processing #car-fab {
            animation: pulse-glow 1.5s infinite;
        }

        @keyframes pulse-glow {
            0% { filter: drop-shadow(0 0 2px rgba(92, 123, 90, 0.5)); }
            50% { filter: drop-shadow(0 0 15px rgba(92, 123, 90, 0.9)); }
            100% { filter: drop-shadow(0 0 2px rgba(92, 123, 90, 0.5)); }
        }

        .voice-bars {
            position: absolute;
            bottom: 18px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            gap: 3px;
            height: 20px;
        }

        .voice-bars span {
            display: block;
            width: 3px;
            border-radius: 3px;
            background: #ffffff;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            transition: all 0.2s ease;
            transform-origin: bottom;
        }

        .voice-bars span:nth-child(1) { height: 6px; }
        .voice-bars span:nth-child(2) { height: 10px; }
        .voice-bars span:nth-child(3) { height: 16px; }
        .voice-bars span:nth-child(4) { height: 10px; }
        .voice-bars span:nth-child(5) { height: 6px; }

        .ai-speaking .voice-bars span {
            animation: wave 0.6s ease-in-out infinite alternate;
        }

        .ai-speaking .voice-bars span:nth-child(1) { animation-delay: 0s; }
        .ai-speaking .voice-bars span:nth-child(2) { animation-delay: 0.1s; }
        .ai-speaking .voice-bars span:nth-child(3) { animation-delay: 0.2s; }
        .ai-speaking .voice-bars span:nth-child(4) { animation-delay: 0.3s; }
        .ai-speaking .voice-bars span:nth-child(5) { animation-delay: 0.4s; }

        @keyframes wave {
            0% { transform: scaleY(0.4); }
            100% { transform: scaleY(1.3); }
        }

        #car-panel {
            background-color: #5c7b5a;
            border: 2px solid #ffffff;
            border-radius: 20px;
            padding: 10px;
            width: 280px;
            max-height: 70vh;
            overflow-y: auto;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
            transition: opacity 0.3s ease, transform 0.3s ease;
            transform-origin: right center;
            scrollbar-width: none;
        }

        #car-panel::-webkit-scrollbar { display: none; }

        #car-panel.hidden {
            opacity: 0;
            transform: scale(0.9) translateX(20px);
            pointer-events: none;
        }

        #car-panel img {
            width: 100%;
            border-radius: 12px;
            display: block;
            object-fit: contain;
            background: #ffffff;
        }

        .fallback-container {
            padding: 24px 16px;
            text-align: center;
        }

        .fallback-container p {
            font-size: 15px;
            font-weight: 500;
            color: #ffffff;
            margin: 0;
            line-height: 1.4;
        }

        @media (max-width: 520px) {
            #widget-container {
                flex-direction: column-reverse;
                align-items: flex-end;
                gap: 10px;
            }

            #car-panel {
                width: min(280px, calc(100vw - 32px));
                max-height: 58vh;
                transform-origin: bottom right;
            }
        }
    `
  shadow.appendChild(widgetStyle)

  const widgetHTML = document.createElement("div")
  widgetHTML.id = "widget-container"
  widgetHTML.innerHTML = `
        <div id="car-fab" title="Iniciar Assistente CAR">
            <div class="voice-bars" aria-hidden="true">
                <span></span><span></span><span></span><span></span><span></span>
            </div>
        </div>
        <div id="car-panel" class="hidden">
            <div id="car-panel-content"></div>
        </div>
    `
  shadow.appendChild(widgetHTML)

  const fab = shadow.getElementById("car-fab")
  let isDragging = false
  let isMoved = false
  let startX = 0
  let startY = 0
  let initialLeft = 0
  let initialTop = 0

  fab.addEventListener("mousedown", (event) => {
    isDragging = true
    isMoved = false
    startX = event.clientX
    startY = event.clientY

    const rect = host.getBoundingClientRect()
    host.style.right = "auto"
    host.style.bottom = "auto"
    host.style.transform = "none"
    initialLeft = rect.left
    initialTop = rect.top
    host.style.left = `${initialLeft}px`
    host.style.top = `${initialTop}px`
    fab.style.cursor = "grabbing"
  })

  window.addEventListener("mousemove", (event) => {
    if (!isDragging) return
    event.preventDefault()
    const dx = event.clientX - startX
    const dy = event.clientY - startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isMoved = true
    host.style.left = `${initialLeft + dx}px`
    host.style.top = `${initialTop + dy}px`
  })

  window.addEventListener("mouseup", () => {
    if (!isDragging) return
    isDragging = false
    fab.style.cursor = "pointer"
  })

  fab.addEventListener("click", () => {
    if (isMoved) return
    if (["idle", "closed", "error"].includes(connectionState)) {
      startCall()
    } else {
      stopCall(false)
    }
  })

  let expressionTimeout = null
  let blinkInterval = null

  function setExpression(expression, duration = 0) {
    if (!fab || !EXPRESSIONS[expression]) return
    if (expressionTimeout) {
      clearTimeout(expressionTimeout)
      expressionTimeout = null
    }

    fab.style.backgroundImage = `url('${EXPRESSIONS[expression]}')`

    if (duration > 0) {
      expressionTimeout = setTimeout(() => {
        if (connectionState === "processing") {
          setExpression("smiling_closed")
        } else {
          setExpression("base")
        }
      }, duration)
    }
  }

  function startBlinking() {
    if (blinkInterval) return
    blinkInterval = setInterval(
      () => {
        if (fab.style.backgroundImage.includes(EXPRESSIONS.base)) {
          fab.style.backgroundImage = `url('${EXPRESSIONS.closed_eyes}')`
          setTimeout(() => {
            if (fab.style.backgroundImage.includes(EXPRESSIONS.closed_eyes)) {
              fab.style.backgroundImage = `url('${EXPRESSIONS.base}')`
            }
          }, 150)
        }
      },
      3500 + Math.random() * 2000
    )
  }

  function stopBlinking() {
    if (blinkInterval) clearInterval(blinkInterval)
    blinkInterval = null
  }

  // Em produção, prefira token efêmero em backend. Como solicitado, este exemplo permanece em um único HTML.
  const apiKey = ""
  const MODEL = "models/gemini-2.5-flash-native-audio-latest"
  const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`
  const DEBUG_LOGS = true
  const DEBUG_VERBOSE = false
  const DEBUG_IMPORTANT_EVENTS = new Set([
    "app:init",
    "state:set",
    "setup:send",
    "setup:complete",
    "setup:duplicate-complete-ignored",
    "trigger:initial-send",
    "trigger:initial-duplicate-skipped",
    "server:summary",
    "server:interrupted",
    "transcript:user",
    "transcript:assistant",
    "tool:call-received",
    "tool:handle-start",
    "tool:function-start",
    "tool:render-request",
    "tool:duplicate-visual",
    "tool:response-send",
    "ui:render-guide-visual",
    "guide:visual-rendered",
    "audio:queue-stop",
    "assistant:response-start",
    "assistant:playback-ended",
    "mic:barge-in-detected",
    "mic:suppressed-during-assistant",
    "ws:close",
    "ws:error",
    "call:stop",
    "mic:error"
  ])
  const MIC_ACTIVITY_RMS_THRESHOLD = 0.012
  const BARGE_IN_RMS_THRESHOLD = 0.045
  const BARGE_IN_PEAK_THRESHOLD = 0.12
  const BARGE_IN_REQUIRED_CHUNKS = 2
  const BARGE_IN_GRACE_MS = 1800
  const MIC_SUPPRESSION_LOG_INTERVAL_MS = 2000
  const GUIDE_VISUALS = [
    {
      refs: ["1 - faça seu car.png"],
      path: "https://i.imgur.com/DBMtUZn.png",
      title: "Faça seu CAR"
    },
    {
      refs: ["2 - Selecione o estado do seu imóvel rural.png"],
      path: "https://i.imgur.com/5YJxIL9.png",
      title: "Seleção do estado"
    },
    {
      refs: ["3 - botão para acessar o modulo.png"],
      path: "https://i.imgur.com/hSKDF9C.png",
      title: "Acessar módulo"
    },
    {
      refs: ["4 - Botão cadastro pre-preenchido.png"],
      path: "https://i.imgur.com/q8Xo10y.png",
      title: "Cadastro pré-preenchido"
    },
    {
      refs: ["5 - Botão cadastrar novo imovel.png"],
      path: "https://i.imgur.com/jqszr58.png",
      title: "Cadastrar novo imóvel"
    },
    {
      refs: ["1 - Informações do proprietario.png"],
      path: "https://i.imgur.com/dBew8fA.png",
      title: "Informações do proprietário"
    },
    {
      refs: ["2 - Botão de adicionar.png"],
      path: "https://i.imgur.com/NS0Zizd.png",
      title: "Botão adicionar"
    },
    {
      refs: ["salvar sempre.png"],
      path: "https://i.imgur.com/lkrsSyJ.png",
      title: "Salvar antes de avançar"
    },
    {
      refs: ["1 - associar imovel.png"],
      path: "https://i.imgur.com/Na1nFCb.png",
      title: "Associar imóvel"
    },
    {
      refs: ["1 - propriedade ou posse.png"],
      path: "https://i.imgur.com/ToXSVpi.png",
      title: "Propriedade ou posse"
    },
    {
      refs: ["1 - representante.png"],
      path: "https://i.imgur.com/2TmAkch.png",
      title: "Representante"
    },
    {
      refs: ["1 - Ativar visualização.gif"],
      path: "https://i.imgur.com/KKyQeKA.gif",
      title: "Ativar visualização"
    },
    {
      refs: ["2 - limite e sede do imovel.png"],
      path: "https://i.imgur.com/1nWLa97.png",
      title: "Limite e sede do imóvel"
    },
    {
      refs: ["3 - usando ferramenta de poligono.gif"],
      path: "https://i.imgur.com/pMxJFyR.gif",
      title: "Ferramenta de polígono"
    },
    {
      refs: ["4 - editando poligono.gif"],
      path: "https://i.imgur.com/OH6AUxg.gif",
      title: "Editar polígono"
    },
    {
      refs: ["5 - definindo sede do imovel.gif"],
      path: "https://i.imgur.com/rKeyfUg.gif",
      title: "Definir sede do imóvel"
    },
    {
      refs: ["6 - Outras areas.png"],
      path: "https://i.imgur.com/2dqwiS1.png",
      title: "Outras áreas"
    }
  ]
  const CAR_GUIDE = `
    # **Guia do Instrutor: Auxílio no Cadastro do Módulo Pré-preenchido do SICAR**

    ## **1\. Acesso ao Sistema e Login**

    1. **Começar cadastro:** Oriente o produtor a procurar o botão "Faça seu CAR" [1 - faça seu car.png].
    2. Selecione o estado do seu imóvel rural [2 - Selecione o estado do seu imóvel rural.png].
    3. Apos a escolha do estado ooriente o usuario a Clicar no botão azul escuro de "Acesse o modulo de cadastro pre-preenchido" [3 - botão para acessar o modulo.png].
    4. **Login Gov.br:** Solicite que o produtor insira o CPF e a senha [CPF e a senha]. 
    5. Clicar no botão de cadastro pre-preenchido no centro da tela, o botão a direita [4 - Botão cadastro pre-preenchido.png].
    6. **Navegação Inicial:** Na tela principal, mostre as duas opções ao usuário e oriente-o a clicar em **Módulo de Cadastro Pré-preenchido** e depois em **"Cadastrar um novo imóvel"** [5 - Botão cadastrar novo imovel.png].

    ## **2\. Passo a Passo da Facilitação do Cadastro**

    ### **Etapa 1: Identificação (Proprietários e Possuidores)**

    1. Peça ao produtor para inserir o **CPF** do usuario que esta na conversa [1 - Informações do proprietario.png].  
    2. Solicite a **Data de Nascimento** associada àquele CPF [por exemplo: 01/01/1980].  
    * 💡 **Dica para o Instrutor (Explicação):** Explique ao usuário que o sistema valida automaticamente o CPF com a Receita Federal, por isso a data de nascimento precisa estar exata. Mostre como o sistema preenche o nome sozinho.  
    3. Peça ao usuario para clicar em adicionar quando as outras informações forem carregadas automaticamente [2 - Botão de adicionar.png].
    4. **Ação Crítica:** Lembre o usuário de rolar a tela e clicar em **Salvar** antes de avançar [salvar sempre.png].
    5. Peça para o usuario clicar em proximo, botão que fica ao lado de salvar [Botão Proximo].

    ### **Etapa 2: Imóvel (Vínculo SNCR)**

    1. O sistema solicitará a associação com o cadastro SNCR (Incra) da bases de dados fundiários oficiais do governo federal (SNCR e SIGEF). Oriente o usuário a **Associar os imoveis** da lista [1 - associar imovel.png].   
    2. Oriente o usuario a preencher os dados do Dados do imóvel os campos são Nome do imóvel, UF, Município, O imóvel rural foi objeto de desmembramento de imóvel já cadastrado no CAR?, Descrição de acesso, Zona de localização, Código do Cadastro Imobiliário Brasileiro – CIB, Marque se houve alteração na área do imóvel após 22/07/2008, Endereço de correspondência: CEP, Bairro, Logradouro e numero [Nome do imóvel, UF, Município, Endereço de correspondência, ...].
    * 💡 **Dica para o Instrutor (Explicação):** Não repita o nome de todos os campos, fale somente os primeiros e fique a disposição caso o suario tenha alguma duvida sobre o preenchimento dos outros campos. 
    3. Peça para clicar em **Salvar** e ir para a próxima etapa [salvar sempre.png].
    4. Peça para o usuario clicar em proximo, botão que fica ao lado de salvar [Botão Proximo].

    Informações sobre essa tela: a tela de associação serve para vincular o imóvel rural cadastrado na base do CAR com as bases de dados fundiários oficiais do governo federal (SNCR e SIGEF).Veja como funciona a dinâmica dessa tela com base na imagem:Estrutura da TelaCruzamento de Dados: O sistema faz uma busca automática e lista os imóveis encontrados no Cadastro Nacional de Imóveis Rurais (SNCR/INCRA) que possuem alguma correspondência de nome, CPF/CNPJ ou localização com o seu imóvel do CAR.Informações Exibidas: Para cada imóvel encontrado, você visualiza o nome da propriedade, o município/UF, o código oficial do imóvel no INCRA, a área total em hectares (ha) e o status de certificação no SIGEF.Ações DisponíveisConferência de Documentos: O botão Documentação permite que você abra e analise os documentos comprobatórios daquele imóvel cadastrado no INCRA para garantir que se trata da mesma área.Verificação do SIGEF: O botão SIGEF associado mostra se aquela parcela já possui a certificação de georreferenciamento vinculada.Vincular Imóvel: Na última coluna (Associar), existe uma chave de ativação (botão de ligar/desligar) para cada linha. Para realizar a associação, basta ativar a chave correspondente ao imóvel correto.

    ### **Etapa 3: Documentação**

    1. Explique que os documentos necessários variam de acordo com a sua escolha no campo Propriedade ou Posse e pergunte ao usuario qual o caso dele [1 - propriedade ou posse.png].
    **Caso seja "Propriedade"** (Imóvel Registrado) oriente o usuario precisará dos dados da Certidão de Matrícula ou do Livro de Registro do Cartório de Registro de Imóveis (CRI). Caso ele pergunte explique o que é cada documento: Certidão de registro, Contrato de compra e venda, Em regularização, Escritura, Imissão de Posse.
    **Caso seja "Posse"** (Sem Registro Definitivo)Caso o produtor não tenha a escritura registrada em cartório, você deve marcar a opção "Posse" e poderá inserir documentos como:Contrato de Compra e Venda (particular ou público).Declaração de Posse Mansa e Pacífica.Formal de Partilha (em caso de inventário não finalizado).Título de Domínio Provisório ou Concessão de Direito Real de Uso emitido por órgão público (como o INCRA ou institutos estaduais de terra).
    2. Oriente o usuario a preencher as informações da tela e que ele pode perguntar sobre tudo que estiver com duvida, inclusive como obter cada documento [Me pergunte].
    * 💡 **Dica para o Instrutor (Explicação):** Não fale muito, deixe o usuario perguntar, pergunte o que o usuario esta vendo na tela. 
    3. Peça para clicar em **Salvar** e prosseguir [salvar sempre.png].
    4. Peça para o usuario clicar em proximo, botão que fica ao lado de salvar [Botão Proximo].

    ### **Etapa 4: Representante**

    1. Explique ao produtor que ele pode adicionar um representante (inserindo CPF e Data de Nascimento) ou deixar em branco, caso ele mesmo seja o responsável [1 - representante.png].  
    2. Peça para clicar em **Salvar** e prosseguir [salvar sempre.png].
    3. Peça para o usuario clicar em proximo, botão que fica ao lado de salvar [Botão Proximo]. 
    * 💡 **Dica Visual (Mostre na tela):** Aponte para o topo da tela do usuário e mostre a ele que o círculo de progresso das etapas fica com um tom de azul mais escuro apenas quando a etapa é salva com sucesso.

    Informações sobre essa tela: No âmbito do SICAR (Sistema Nacional de Cadastro Ambiental Rural), o representante é a pessoa autorizada a agir em nome do proprietário ou possuidor do imóvel rural. Esse usuário tem permissão para acessar todas as funcionalidades disponíveis ao titular do imóvel, incluindo a retificação de informações cadastrais, o atendimento a notificações emitidas pelos órgãos competentes, a elaboração e submissão do Projeto de Regularização Ambiental, bem como o gerenciamento dos ativos ambientais vinculados ao imóvel. A figura do representante é essencial para viabilizar a regularização e a manutenção do cadastro, especialmente quando o titular não realiza essas ações diretamente.

    ### **Etapa 5: Geo (Desenho do Imóvel)**

    *Esta é a etapa mais complexa para o produtor. Acompanhe com calma.*

    1. **Visualização:** Mostre ao usuário o menu esquerdo. Oriente-o a ativar camadas como *Terras Indígenas* e *Unidades de Conservação* para entender o entorno do seu imóvel e evitar sobreposições [1 - Ativar visualização.gif].  
    2. **Desenho Obrigatório:** Guie o produtor a clicar em "Limite do imóvel" [2 - limite e sede do imovel.png].  
    3. Ajude o usuário a usar a ferramenta de polígonos no mapa. O objetivo é que o desenho chegue perto do valor de hectares declarado no SNCR (ex: 133 ha) [3 - usando ferramenta de poligono.gif].  
    3. **Ajuste de Tolerância:** Se o sistema acusar uma grande diferença de área após a confirmação:  
    * Oriente o usuário a clicar no ícone de **Lápis (Editar)**.  
    * Ajude-o a arrastar os vértices para diminuir ou aumentar a área até que a barra de tolerância do sistema fique verde [4 - editando poligono.gif].
    4. Guie o produtor a clicar em "Sede do imovel" [2 - limite e sede do imovel.png].
    5. Ajude o usuario a definir a sede do imovel clicando no icone de pin e depois clicando sobre o imovel no mapa [5 - definindo sede do imovel.gif].
    6. Peça para clicar em **Salvar** e prosseguir [salvar sempre.png].
    7. Oriente o usuario que que novas areas para registrar serão liberadas para preenchimento [6 - Outras areas.png]
    * ⚠️ **Alerta Jurídico ao usuario:** **Feições Opcionais no Sistema (Mas Obrigatórias por Lei):** O sistema permite avançar sem desenhar APP e Reserva Legal. Aproveite este momento para explicar ao produtor que, embora o sistema não trave, a lei obriga o mapeamento da Área de Preservação Permanente (APP) e da Reserva Legal. (Veja a "Base Legal" no fim deste guia para embasar sua explicação). 
    8. Oriente o usuario a preencher as informações da tela e que ele pode perguntar sobre tudo que estiver com duvida a qualquer momento sobre as areas [3 - usando ferramenta de poligono.gif].

    ### **Etapa 6: Alertas e Pendências**

    1. Ajude o produtor a interpretar a tela de alertas:  
    * **Amarelo:** Alertas não impeditivos. Tranquilize o usuário, informando que ele pode prosseguir.  
    * **Vermelho:** Alertas impeditivos. Ajude o usuário a ler o erro, voltar na etapa indicada e corrigir a falha [Alertas].  
    2. Peça para o usuario clicar em proximo, botão que fica ao lado de salvar [Botão Proximo].

    ### **Etapa 7: Resumo e Finalização**

    1. Peça ao usuário para revisar as informações no quadro resumo.  
    2. Estando tudo correto, oriente-o a clicar em **Salvar Imóvel** e confirmar o envio.

    ## **3\. Finalização e Entrega**

    1. Após o envio, parabenize o produtor e mostre na tela onde acessar o **Recibo de Inscrição do CAR**.  
    2. Oriente-o a **baixar e guardar o recibo**, anotando o Número do Registro.  
    3. Mostre a ele como a propriedade agora aparece na "Central do Proprietário" com o status *"Aguardando análise"*, e onde fica o botão **Retificar** caso ele precise alterar algo no futuro.

    ## **📚 Base Legal para o Instrutor (Tira-dúvidas)**

    Use estas informações para responder a questionamentos dos produtores sobre o "porquê" de o sistema exigir certos procedimentos:

    * **Por que tenho que fazer esse cadastro?**  
    * *Base Legal:* A criação do CAR e a sua obrigatoriedade para todos os imóveis rurais do país estão previstas na **Lei nº 12.651/2012, Art. 29**.  
    * **Por que o sistema pede CPF, comprovantes e coordenadas? (Etapas 1 e 3\)**  
    * *Base Legal:* A exigência de identificação do proprietário e da propriedade é uma determinação expressa da **Lei nº 12.651/2012, Art. 29, § 1º, incisos I e II**.  
    * **Eu preciso mesmo desenhar tudo no mapa? (Etapa 5 \- Geo)**  
    * *Base Legal:* Sim. O mapeamento do perímetro, das Áreas de Preservação Permanente (APPs), Áreas de Uso Restrito e Reserva Legal é uma obrigação estrita definida pela **Lei nº 12.651/2012, Art. 29, § 1º, inciso III**, e detalhada no **Decreto nº 7.830/2012, Art. 5º**. Ignorar o desenho dessas áreas faz com que o cadastro nasça irregular perante a lei, mesmo que o sistema permita avançar as telas.
    `

  const SYSTEM_INSTRUCTION = `
    Você é a Carla assistente de voz para o Cadastro Ambiental Rural. Fale diretamente com o produtor/proprietário rural, como se estivesse ao lado dele acompanhando a tela e ajudando a preencher o Módulo de Cadastro Pré-preenchido do SICAR.

    Não se comporte como uma narradora de tutorial. Não fale "instrutor" para o usuário. Chame o usuário de "produtor", "proprietário" ou pelo nome dele quando souber.

    Siga o guia abaixo como fonte principal. Não invente CPF, senha, datas, imóveis ou informações cadastrais. Quando esses dados forem necessários, peça ao produtor para usar os próprios dados reais dele, o login Gov.br dele e as informações reais do imóvel rural.

    ${CAR_GUIDE}

    PROTOCOLO OBRIGATÓRIO DE CONVERSA:
    1. Faça UMA pergunta ou dê UMA ação por vez. Nunca entregue duas etapas juntas.
    2. Depois de orientar uma ação, PARE. Não continue explicando, não antecipe o próximo passo e não leia conteúdo extra do guia.
    3. Só avance para o próximo passo depois que o usuário responder algo indicando que fez, chegou na tela, quer seguir, ou precisa de ajuda.
    4. Se o usuário pedir ajuda ou tiver dúvida, responda a dúvida em no máximo 2 frases e retome o MESMO passo. Não avance a sequência.
    5. Se a fala do usuário estiver incompleta, confusa ou se você não tiver certeza, NÃO avance. Peça uma confirmação curta.
    6. A conversa sempre começa perguntando o nome do usuário. Depois que o usuário responder o nome, comece o item "1. Acesso ao Sistema e Login" do guia.
    7. No fluxo normal, não pergunte em qual tela o usuário está e não comece pelo meio; a exceção é quando o próprio usuário disser claramente que já está em uma etapa específica e pedir ajuda dali.
    8. No fluxo normal, nunca pule uma referência visual da sequência obrigatória. Use o histórico da conversa para saber em qual ação vocês estão e avance apenas para a próxima ação natural, exceto quando o usuário pedir explicitamente ajuda em uma etapa mais adiantada.
    9. Cada resposta sua após o nome deve ter no máximo: uma chamada renderGuideVisual + uma frase curta de orientação + uma frase curta pedindo para avisar ao concluir.
    10. É proibido continuar falando depois de pedir para o usuário avisar. A próxima fala só vem depois da resposta do usuário.

    REGRA OBRIGATÓRIA DE IMAGENS E REFERÊNCIAS:
    - Cada ação do guia possui uma referência visual entre colchetes, por exemplo [1 - faça seu car.png] ou [CPF e a senha].
    - Antes de falar qualquer orientação que tenha referência entre colchetes, chame a ferramenta renderGuideVisual com a referência exata, sem os colchetes.
    - Espere a ferramenta retornar e só então fale a orientação correspondente.
    - Use uma chamada de ferramenta por vez e mostre somente a referência da ação atual.
    - Não fale o nome dos arquivos de imagem e não leia o texto entre colchetes em voz alta.
    - Se a referência tiver imagem, a tela mostrará a imagem. Se não tiver imagem, a tela mostrará o texto de apoio.
    - Não chame renderGuideVisual para o próximo passo enquanto o usuário não responder ao passo atual.
    - A ferramenta só exibe a referência escolhida; ela não decide a etapa por você. A interpretação da fala natural do usuário é sua.
    - Se renderGuideVisual retornar status "already_visible", não chame a mesma referência de novo. Continue a orientação sem mencionar nome de arquivo.

    REGRA DE PRESENÇA VISUAL:
    - Fale como se estivesse acompanhando a tela junto com o usuário.
    - Depois que a ferramenta mostrar a imagem ou texto de apoio, descreva o alvo de forma visual e direta: "na tela você vai ver...", "aqui no centro aparece...", "do lado direito tem...", "procure esse botão azul...", "nessa parte da tela...".
    - Quando a posição estiver clara pelo guia ou pela imagem, use localização: centro, lado direito, topo, menu esquerdo, fim da página, botão ao lado de Salvar.
    - Quando a posição não estiver clara, não invente. Diga: "procure na tela a opção..." ou "nessa tela, localize...".
    - Evite linguagem genérica como "acesse a opção" quando puder orientar visualmente: prefira "na tela, clique no botão..." ou "aqui do lado esquerdo, escolha...".
    - Não diga que está vendo dados pessoais reais do usuário. Você está vendo apenas a tela/imagem de apoio.

    REGRA DE ATALHO POR PEDIDO DO USUÁRIO:
    - Se o usuário disser claramente que já está em uma etapa ou tela específica e pedir ajuda, ajude a partir dessa etapa. Exemplos: "estou na etapa de GEO", "me ajude com a demarcação da área", "estou na documentação", "estou nos alertas".
    - Nesses casos, não force o usuário a voltar ao início do tutorial. Confirme em uma frase curta que vai ajudar naquela etapa e siga com a ação visual adequada.
    - Antes de orientar, chame renderGuideVisual com a referência mais adequada ao pedido atual e depois fale apenas uma ação por vez.
    - Se o pedido for sobre GEO ou demarcação de área, use estas referências como ponto de entrada: [1 - Ativar visualização.gif] para camadas e visualização; [2 - limite e sede do imovel.png] para escolher Limite do imóvel ou Sede do imóvel; [3 - usando ferramenta de poligono.gif] para desenhar a área; [4 - editando poligono.gif] para ajustar vértices ou tolerância; [5 - definindo sede do imovel.gif] para marcar a sede.
    - Se o pedido for sobre Documentação, comece por [1 - propriedade ou posse.png]. Se for Identificação, comece por [1 - Informações do proprietario.png]. Se for Imóvel ou SNCR, comece por [1 - associar imovel.png]. Se for Representante, comece por [1 - representante.png]. Se for Alertas, comece por [Alertas].
    - Depois de entrar pela etapa solicitada, continue sequencialmente dentro daquela etapa, esperando a resposta do usuário entre uma ação e outra.

    REGRA DE ESPERA:
    - Interprete respostas naturais do usuário pelo sentido, não por comandos fixos. Exemplos de avanço podem vir como "pronto", "já fiz", "estou nessa tela", "pode seguir", "cliquei", ou outras formas equivalentes.
    - Se a transcrição parecer ruído, palavra cortada, idioma errado ou fala incompleta, trate como incerto e peça uma confirmação curta antes de chamar ferramenta.
    - Não peça uma palavra específica para o produtor responder.
    - Não crie comandos fixos para confirmar que uma ação terminou.
    - Instrução de execução deve ter este formato: diga o que fazer agora + peça para o usuário avisar quando terminar + pare.
    - Varie a frase final de forma natural. Exemplos: "Quando terminar, me avise.", "Assim que fizer isso, pode me avisar.", "Depois que concluir, me diga.", "Quando estiver nessa tela, me avise."
    - Não repita "Faça com calma" em todos os passos. Use essa frase só ocasionalmente.
    - Exemplo correto: "Agora entre com seu CPF e senha do Gov.br. Quando terminar, me avise."
    - Exemplo errado: "Entre com seu CPF e senha do Gov.br. Já conseguiu fazer o login?"
    - Exemplo correto: "Agora clique em Salvar no fim da página. Assim que salvar, pode me avisar."
    - Exemplo errado: "Clique em Salvar. Já salvou?"
    - Exemplo correto: "Aqui no centro da tela aparece o botão de cadastro pré-preenchido. Clique nele e me avise quando abrir."
    - Exemplo correto: "No menu esquerdo do mapa, procure a camada indicada e ative essa visualização. Depois me avise."
    - Exemplo correto: "No fim da página, encontre o botão Salvar. Assim que salvar, me avise."
    - Exemplo errado: "Agora clique em Faça seu CAR. Depois selecione o estado e faça login." Isso pula etapas.
    - Exemplo errado: "Enquanto você faz isso, vou explicar a próxima etapa." Isso fala sem parar.

    ROTEIRO DE ABERTURA:
    1. Ao iniciar, apresente-se rapidamente e pergunte o nome do usuário, por exemplo: "Olá, eu vou te ajudar no cadastro do CAR pré-preenchido. Qual é o seu nome?" ou "Como posso te chamar?"
    2. Depois que o produtor responder o nome, chame-o pelo nome se possível e comece o tutorial pelo Acesso ao Sistema e Login.
    3. Antes da primeira orientação do tutorial, chame renderGuideVisual com "1 - faça seu car.png".
    4. Depois que a ferramenta retornar, diga algo como: "Na tela, procure o botão Faça seu CAR e clique nele. Quando estiver nessa tela, me avise."
    5. Pare de falar e espere o produtor responder antes de avançar.

    SEQUÊNCIA OBRIGATÓRIA DE REFERÊNCIAS VISUAIS:
    Siga esta ordem sem pular itens. Antes de orientar cada item, chame renderGuideVisual com a referência exata. Em cada turno, use somente o próximo número da lista.
    1. [1 - faça seu car.png]
    2. [2 - Selecione o estado do seu imóvel rural.png]
    3. [3 - botão para acessar o modulo.png]
    4. [CPF e a senha]
    5. [4 - Botão cadastro pre-preenchido.png]
    6. [5 - Botão cadastrar novo imovel.png]
    7. [1 - Informações do proprietario.png]
    8. [por exemplo: 01/01/1980]
    9. [2 - Botão de adicionar.png]
    10. [salvar sempre.png]
    11. [Botão Proximo]
    12. [1 - associar imovel.png]
    13. [Nome do imóvel, UF, Município, Endereço de correspondência, ...]
    14. [salvar sempre.png]
    15. [Botão Proximo]
    16. [1 - propriedade ou posse.png]
    17. [Me pergunte]
    18. [salvar sempre.png]
    19. [Botão Proximo]
    20. [1 - representante.png]
    21. [salvar sempre.png]
    22. [Botão Proximo]
    23. [1 - Ativar visualização.gif]
    24. [2 - limite e sede do imovel.png]
    25. [3 - usando ferramenta de poligono.gif]
    26. [4 - editando poligono.gif]
    27. [2 - limite e sede do imovel.png]
    28. [5 - definindo sede do imovel.gif]
    29. [salvar sempre.png]
    30. [6 - Outras areas.png]
    31. [3 - usando ferramenta de poligono.gif]
    32. [Alertas]
    33. [Botão Proximo]

    REGRAS DE AVANÇO:
    - Use a SEQUÊNCIA OBRIGATÓRIA como fonte de avanço no fluxo normal. Se o usuário pedir explicitamente ajuda em uma etapa específica, use a REGRA DE ATALHO POR PEDIDO DO USUÁRIO.
    - Não agrupe itens por etapa. Mesmo quando vários itens pertencem a "Acesso" ou "Geo", trate cada referência visual como uma ação independente.
    - No fluxo normal, não avance de uma etapa para outra até concluir todos os itens visuais anteriores.
    - Explicações conceituais só entram quando o usuário perguntar ou quando forem indispensáveis para o passo atual; ainda assim, responda curto e volte ao mesmo passo.

    Se o produtor tentar pular etapas sem dizer onde está ou sem pedir ajuda em uma etapa específica, diga com gentileza que para evitar erro vocês vão seguir a ordem do guia e concluir o passo atual primeiro.
    `

  let ws = null
  let audioContextOut = null
  let nextPlayTime = 0
  let speakingTimeout = null
  let isStopping = false
  let connectionState = "idle"
  let setupCompleted = false
  let audioPartCount = 0
  let playRequestCount = 0
  let scheduledAudioCount = 0
  let modelTurnCount = 0
  let initialPromptSent = false
  let assistantResponseActive = false
  let assistantGenerationComplete = false
  let assistantPlaybackEndedLogged = false
  let consecutiveBargeInChunks = 0
  let bargeInGraceUntil = 0
  let lastMicSuppressionLogAt = 0
  let lastUserTranscript = ""
  let lastUserTranscriptAt = 0
  let lastRawUserTranscript = ""
  let lastRawUserTranscriptAt = 0
  let lastRenderedReference = ""
  let lastRenderedAt = 0
  const processedFunctionCallIds = new Set()
  const activeAudioSources = new Set()

  let micStream = null
  let audioContextIn = null
  let micProcessor = null

  const carPanel = shadow.getElementById("car-panel")
  const carPanelContent = shadow.getElementById("car-panel-content")

  logEvent("app:init", {
    model: MODEL,
    endpoint: "v1alpha BidiGenerateContent"
  })
  setConnectionState("idle")

  function logEvent(stage, details = {}) {
    if (!DEBUG_LOGS) return
    if (!DEBUG_VERBOSE && !DEBUG_IMPORTANT_EVENTS.has(stage)) return
    const time = new Date().toISOString()
    console.log(
      `[CAR Live] ${time} | ${stage} | ${serializeLogDetails(details)}`
    )
  }

  function logWarn(stage, details = {}) {
    const time = new Date().toISOString()
    console.warn(
      `[CAR Live] ${time} | ${stage} | ${serializeLogDetails(details)}`
    )
  }

  function logError(stage, error, details = {}) {
    const time = new Date().toISOString()
    console.error(
      `[CAR Live] ${time} | ${stage} | ${serializeLogDetails({ error: describeError(error), ...details })}`
    )
  }

  function serializeLogDetails(details = {}) {
    try {
      return JSON.stringify(details, (_key, value) => {
        if (value instanceof Error) return describeError(value)
        if (value instanceof Set) return Array.from(value)
        if (typeof value === "string")
          return value.length > 450 ? `${value.slice(0, 450)}...` : value
        return value
      })
    } catch (error) {
      return JSON.stringify({ unserializable: true, message: String(error) })
    }
  }

  function describeError(error) {
    if (!error) return null
    return {
      name: error.name || "Error",
      message: error.message || String(error)
    }
  }

  function debugSnapshot(extra = {}) {
    return {
      connectionState,
      setupCompleted,
      lastRenderedReference,
      lastUserTranscript: shortenLogText(lastUserTranscript),
      lastUserTranscriptAgeMs: lastUserTranscriptAt
        ? Date.now() - lastUserTranscriptAt
        : null,
      lastRawUserTranscript: shortenLogText(lastRawUserTranscript),
      lastRawUserTranscriptAgeMs: lastRawUserTranscriptAt
        ? Date.now() - lastRawUserTranscriptAt
        : null,
      activeAudioSources: activeAudioSources.size,
      assistantResponseActive,
      assistantGenerationComplete,
      processedFunctionCalls: processedFunctionCallIds.size,
      ...extra
    }
  }

  function shortenLogText(text, maxLength = 180) {
    const value = String(text || "")
      .replace(/\s+/g, " ")
      .trim()
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
  }

  function isMeaningfulUserTranscript(text) {
    const raw = String(text || "")
      .trim()
      .toLowerCase()
    if (!raw || raw === "<noise>" || raw === "[noise]" || raw === "(noise)")
      return false

    const normalized = normalizeText(text)
    if (!normalized) return false
    if (normalized.length < 2) return false
    if (normalized === "noise") return false

    const ignored = new Set([
      "ah",
      "ha",
      "hum",
      "uh",
      "eh",
      "e",
      "a",
      "o",
      "po",
      "ta",
      "ne"
    ])
    if (ignored.has(normalized)) return false
    if (!/[a-z0-9]/.test(normalized)) return false

    return true
  }

  function logServerMessage(data) {
    const content = data.serverContent || {}
    const parts = content.modelTurn?.parts || []
    const audioParts = parts.filter((part) =>
      part.inlineData?.mimeType?.startsWith("audio/pcm")
    ).length
    const nonAudioParts = parts.length - audioParts
    const inputText = content.inputTranscription?.text || ""
    const outputText = content.outputTranscription?.text || ""
    const shouldLog =
      data.setupComplete ||
      data.toolCall ||
      content.interrupted ||
      content.turnComplete ||
      content.generationComplete ||
      inputText ||
      outputText ||
      nonAudioParts

    if (!shouldLog) return

    logEvent(
      "server:summary",
      debugSnapshot({
        keys: Object.keys(data),
        serverContentKeys: Object.keys(content),
        setupComplete: Boolean(data.setupComplete),
        interrupted: Boolean(content.interrupted),
        turnComplete: Boolean(content.turnComplete),
        generationComplete: Boolean(content.generationComplete),
        hasToolCall: Boolean(data.toolCall),
        toolCallNames: data.toolCall?.functionCalls?.map((fc) => fc.name) || [],
        modelTurnParts: parts.length,
        audioParts,
        nonAudioParts,
        inputText: shortenLogText(inputText),
        outputText: shortenLogText(outputText)
      })
    )
  }

  function setConnectionState(state, message) {
    if (connectionState !== state || message) {
      logEvent("state:set", { from: connectionState, to: state, message })
    }
    connectionState = state

    const defaults = {
      idle: "Aguardando início",
      connecting: "Conectando",
      listening: "Ouvindo",
      processing: "Processando",
      speaking: "Assistente falando",
      error: "Erro de conexão",
      closed: "Conexão encerrada"
    }
    const label = message || defaults[state] || defaults.idle
    const isRunning =
      state === "connecting" ||
      state === "listening" ||
      state === "processing" ||
      state === "speaking"

    if (state === "speaking") {
      widgetHTML.classList.add("ai-speaking")
      widgetHTML.classList.remove("ai-processing")
      setExpression("base")
      startBlinking()
    } else if (
      state === "connecting" ||
      state === "listening" ||
      state === "processing"
    ) {
      widgetHTML.classList.remove("ai-speaking")
      widgetHTML.classList.add("ai-processing")

      if (state === "processing") {
        setExpression("smiling_closed")
        stopBlinking()
      } else if (state === "listening") {
        setExpression("base")
        startBlinking()
      }
    } else {
      widgetHTML.classList.remove("ai-speaking", "ai-processing")
      setExpression("base")
      stopBlinking()
    }

    if (state === "error") {
      setExpression("surprised", 3000)
    }

    fab.title = `${isRunning ? "Parar" : "Iniciar"} Assistente CAR - ${label}`
  }

  function showSessionUi() {
    logEvent("ui:show-session")
    carPanel.classList.add("hidden")
    carPanelContent.innerHTML = ""
    setExpression("waving", 3000)
  }

  function resetSessionUi() {
    logEvent("ui:reset-session")
    removeDynamicCards()
    hideSpeakingVisual()
    lastUserTranscript = ""
    lastUserTranscriptAt = 0
    lastRawUserTranscript = ""
    lastRawUserTranscriptAt = 0
    lastRenderedReference = ""
    lastRenderedAt = 0
    assistantResponseActive = false
    assistantGenerationComplete = false
    assistantPlaybackEndedLogged = false
    consecutiveBargeInChunks = 0
    bargeInGraceUntil = 0
    lastMicSuppressionLogAt = 0
  }

  function removeDynamicCards() {
    const dynamicCards = shadow.querySelectorAll("[data-dynamic-card]")
    logEvent("ui:remove-dynamic-cards", { count: dynamicCards.length })
    dynamicCards.forEach((card) => card.remove())
    carPanel.classList.add("hidden")
    carPanelContent.innerHTML = ""
  }

  function showSpeakingVisual() {}

  function hideSpeakingVisual() {}

  function sendAudioStreamEnd() {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      logEvent("audio:stream-end-skipped", {
        hasSocket: Boolean(ws),
        readyState: ws?.readyState
      })
      return
    }
    try {
      logEvent("audio:stream-end-send")
      ws.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }))
    } catch (error) {
      logWarn("audio:stream-end-error", { error })
    }
  }

  function stopQueuedAudio() {
    logEvent("audio:queue-stop", { activeSources: activeAudioSources.size })
    clearTimeout(speakingTimeout)
    speakingTimeout = null

    for (const source of activeAudioSources) {
      try {
        source.stop()
      } catch (error) {
        logEvent("audio:source-already-ended", { error })
      }
    }

    activeAudioSources.clear()
    if (audioContextOut) nextPlayTime = audioContextOut.currentTime
    widgetHTML.classList.remove("ai-speaking")
  }

  function markAssistantResponseStarted(source) {
    if (!assistantResponseActive) {
      assistantResponseActive = true
      assistantPlaybackEndedLogged = false
      assistantGenerationComplete = false
      logEvent("assistant:response-start", debugSnapshot({ source }))
    }
    setConnectionState("speaking")
  }

  function markAssistantGenerationComplete(reason) {
    assistantGenerationComplete = true
    if (!assistantResponseActive && connectionState === "processing") {
      setConnectionState("listening")
      return
    }
    finishAssistantPlaybackIfIdle(reason)
  }

  function finishAssistantPlaybackIfIdle(reason) {
    if (
      !assistantResponseActive ||
      !assistantGenerationComplete ||
      hasQueuedAssistantAudio()
    )
      return

    assistantResponseActive = false
    assistantGenerationComplete = false
    consecutiveBargeInChunks = 0
    bargeInGraceUntil = 0
    if (!assistantPlaybackEndedLogged) {
      assistantPlaybackEndedLogged = true
      logEvent("assistant:playback-ended", debugSnapshot({ reason }))
    }

    if (connectionState === "speaking" || connectionState === "processing") {
      setConnectionState("listening")
    }
  }

  function handleInterrupted() {
    logEvent("server:interrupted")
    stopQueuedAudio()
    assistantResponseActive = false
    assistantGenerationComplete = false
    setConnectionState("processing", "Processando interrupção")
    setExpression("surprised", 1500)
  }

  function getAudioLevel(inputData) {
    let sumSquares = 0
    let peak = 0
    for (let i = 0; i < inputData.length; i++) {
      const abs = Math.abs(inputData[i])
      peak = Math.max(peak, abs)
      sumSquares += inputData[i] * inputData[i]
    }

    return {
      rms: Math.sqrt(sumSquares / Math.max(1, inputData.length)),
      peak
    }
  }

  function hasQueuedAssistantAudio() {
    return activeAudioSources.size > 0
  }

  function isAssistantOutputActive() {
    return (
      assistantResponseActive ||
      connectionState === "speaking" ||
      hasQueuedAssistantAudio()
    )
  }

  function shouldSendMicAudio(inputData) {
    if (
      !setupCompleted ||
      connectionState === "idle" ||
      connectionState === "connecting" ||
      connectionState === "error" ||
      connectionState === "closed"
    ) {
      return false
    }

    const now = Date.now()
    const level = getAudioLevel(inputData)

    if (isAssistantOutputActive()) {
      const strongSpeech =
        level.rms >= BARGE_IN_RMS_THRESHOLD ||
        level.peak >= BARGE_IN_PEAK_THRESHOLD
      consecutiveBargeInChunks = strongSpeech ? consecutiveBargeInChunks + 1 : 0

      if (consecutiveBargeInChunks >= BARGE_IN_REQUIRED_CHUNKS) {
        bargeInGraceUntil = now + BARGE_IN_GRACE_MS
        consecutiveBargeInChunks = 0
        logEvent(
          "mic:barge-in-detected",
          debugSnapshot({
            rms: Number(level.rms.toFixed(5)),
            peak: Number(level.peak.toFixed(5))
          })
        )
        stopQueuedAudio()
        assistantResponseActive = false
        assistantGenerationComplete = false
        setConnectionState("processing", "Processando interrupção")
        setExpression("surprised", 1500)
        return true
      }

      if (now - lastMicSuppressionLogAt > MIC_SUPPRESSION_LOG_INTERVAL_MS) {
        lastMicSuppressionLogAt = now
        logEvent(
          "mic:suppressed-during-assistant",
          debugSnapshot({
            rms: Number(level.rms.toFixed(5)),
            peak: Number(level.peak.toFixed(5)),
            consecutiveBargeInChunks
          })
        )
      }
      return false
    }

    consecutiveBargeInChunks = 0
    if (
      connectionState === "listening" &&
      level.rms >= MIC_ACTIVITY_RMS_THRESHOLD
    ) {
      setConnectionState("processing", "Processando sua fala")
    }
    return true
  }

  async function startMic() {
    try {
      logEvent("mic:start-request")
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Seu navegador não oferece suporte ao uso do microfone nesta página."
        )
      }

      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      logEvent("mic:stream-granted", {
        tracks: micStream.getAudioTracks().map((track) => ({
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState
        }))
      })

      audioContextIn = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      })
      logEvent("mic:audio-context-created", {
        sampleRate: audioContextIn.sampleRate
      })
      const source = audioContextIn.createMediaStreamSource(micStream)
      micProcessor = audioContextIn.createScriptProcessor(4096, 1, 1)
      let micChunkCount = 0

      micProcessor.onaudioprocess = (event) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) return
        const inputData = event.inputBuffer.getChannelData(0)
        if (!shouldSendMicAudio(inputData)) return

        const pcm16 = new Int16Array(inputData.length)

        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]))
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
        }

        let binary = ""
        const bytes = new Uint8Array(pcm16.buffer)
        for (let i = 0; i < bytes.byteLength; i++)
          binary += String.fromCharCode(bytes[i])

        micChunkCount += 1
        if (micChunkCount === 1 || micChunkCount % 100 === 0) {
          logEvent("mic:audio-chunk-send", {
            chunk: micChunkCount,
            samples: inputData.length,
            bytes: bytes.byteLength
          })
        }

        ws.send(
          JSON.stringify({
            realtimeInput: {
              audio: {
                data: btoa(binary),
                mimeType: "audio/pcm;rate=16000"
              }
            }
          })
        )
      }

      const silentGain = audioContextIn.createGain()
      silentGain.gain.value = 0
      source.connect(micProcessor)
      micProcessor.connect(silentGain)
      silentGain.connect(audioContextIn.destination)
      logEvent("mic:ready")
      return true
    } catch (err) {
      logError("mic:error", err, { name: err.name, message: err.message })
      sendAudioStreamEnd()
      const denied =
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
      setConnectionState(
        "error",
        denied
          ? "Microfone negado. Permita o acesso e tente novamente."
          : "Erro no microfone. Tente novamente."
      )
      stopMic(false)
      return false
    }
  }

  function stopMic(sendEnd = true) {
    logEvent("mic:stop", {
      sendEnd,
      hasProcessor: Boolean(micProcessor),
      hasStream: Boolean(micStream),
      hasContext: Boolean(audioContextIn)
    })
    if (sendEnd) sendAudioStreamEnd()
    if (micProcessor) micProcessor.disconnect()
    if (micStream) micStream.getTracks().forEach((track) => track.stop())
    if (audioContextIn) audioContextIn.close()
    micStream = null
    audioContextIn = null
    micProcessor = null
  }

  function playAudio(base64) {
    playRequestCount += 1
    if (playRequestCount === 1 || playRequestCount % 50 === 0) {
      logEvent("audio:play-request", {
        count: playRequestCount,
        base64Length: base64?.length || 0
      })
    }
    if (!audioContextOut) {
      audioContextOut = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      })
      logEvent("audio:output-context-created", {
        sampleRate: audioContextOut.sampleRate
      })
    }
    if (audioContextOut.state === "suspended") audioContextOut.resume()

    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    const int16Array = new Int16Array(bytes.buffer)
    const float32Array = new Float32Array(int16Array.length)
    for (let i = 0; i < int16Array.length; i++)
      float32Array[i] = int16Array[i] / 32768

    const buffer = audioContextOut.createBuffer(1, float32Array.length, 24000)
    buffer.getChannelData(0).set(float32Array)

    const source = audioContextOut.createBufferSource()
    source.buffer = buffer
    source.connect(audioContextOut.destination)
    activeAudioSources.add(source)
    source.onended = () => {
      activeAudioSources.delete(source)
      finishAssistantPlaybackIfIdle("source-ended")
    }

    if (nextPlayTime < audioContextOut.currentTime)
      nextPlayTime = audioContextOut.currentTime + 0.05
    source.start(nextPlayTime)
    nextPlayTime += buffer.duration
    scheduledAudioCount += 1
    if (scheduledAudioCount === 1 || scheduledAudioCount % 50 === 0) {
      logEvent("audio:scheduled", {
        count: scheduledAudioCount,
        duration: buffer.duration,
        nextPlayTime,
        activeSources: activeAudioSources.size
      })
    }

    markAssistantResponseStarted("audio")

    clearTimeout(speakingTimeout)
    speakingTimeout = setTimeout(
      () => {
        finishAssistantPlaybackIfIdle("playback-timeout")
      },
      Math.max(300, (nextPlayTime - audioContextOut.currentTime) * 1000)
    )
  }

  function startCall() {
    logEvent("call:start-click", { connectionState })
    if (
      connectionState === "connecting" ||
      connectionState === "listening" ||
      connectionState === "processing" ||
      connectionState === "speaking"
    )
      return

    if (!window.WebSocket) {
      setConnectionState(
        "error",
        "Este navegador não oferece suporte a WebSocket."
      )
      return
    }

    isStopping = false
    setupCompleted = false
    audioPartCount = 0
    playRequestCount = 0
    scheduledAudioCount = 0
    modelTurnCount = 0
    initialPromptSent = false
    assistantResponseActive = false
    assistantGenerationComplete = false
    assistantPlaybackEndedLogged = false
    consecutiveBargeInChunks = 0
    bargeInGraceUntil = 0
    lastMicSuppressionLogAt = 0
    lastUserTranscript = ""
    lastUserTranscriptAt = 0
    lastRawUserTranscript = ""
    lastRawUserTranscriptAt = 0
    lastRenderedReference = ""
    lastRenderedAt = 0
    processedFunctionCallIds.clear()
    removeDynamicCards()
    showSessionUi()

    if (!audioContextOut)
      audioContextOut = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24000
      })
    audioContextOut.resume()
    nextPlayTime = audioContextOut.currentTime

    setConnectionState("connecting")

    logEvent("ws:create", {
      urlWithoutKey: WS_URL.replace(apiKey, "[API_KEY]")
    })
    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      logEvent("ws:open")
      const setupMessage = {
        setup: {
          model: MODEL,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Kore"
                }
              }
            }
          },
          realtimeInputConfig: {
            automaticActivityDetection: {
              disabled: false,
              startOfSpeechSensitivity: "START_SENSITIVITY_LOW",
              endOfSpeechSensitivity: "END_SENSITIVITY_LOW",
              prefixPaddingMs: 250,
              silenceDurationMs: 600
            }
          },
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }]
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "renderGuideVisual",
                  description:
                    "Mostra a imagem ou texto de apoio do guia para o passo atual do Cadastro Ambiental Rural.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      referencia: {
                        type: "STRING",
                        description:
                          "Texto exato da referência visual do guia, sem colchetes. Exemplo: 1 - faça seu car.png"
                      }
                    },
                    required: ["referencia"]
                  }
                }
              ]
            }
          ]
        }
      }

      logEvent("setup:send", {
        model: setupMessage.setup.model,
        responseModalities:
          setupMessage.setup.generationConfig?.responseModalities,
        hasSpeechConfig: Boolean(
          setupMessage.setup.generationConfig?.speechConfig
        ),
        hasInputTranscription: Boolean(
          setupMessage.setup.inputAudioTranscription
        ),
        hasOutputTranscription: Boolean(
          setupMessage.setup.outputAudioTranscription
        ),
        realtimeInputConfig: setupMessage.setup.realtimeInputConfig,
        tools: setupMessage.setup.tools[0].functionDeclarations.map(
          (tool) => tool.name
        )
      })
      ws.send(JSON.stringify(setupMessage))
    }

    ws.onmessage = async (event) => {
      const textData =
        event.data instanceof Blob ? await event.data.text() : event.data
      const data = JSON.parse(textData)
      logServerMessage(data)
      logEvent("ws:message", {
        keys: Object.keys(data),
        hasSetupComplete: Boolean(data.setupComplete),
        hasServerContent: Boolean(data.serverContent),
        hasToolCall: Boolean(data.toolCall),
        serverContentKeys: data.serverContent
          ? Object.keys(data.serverContent)
          : []
      })

      if (data.setupComplete) {
        if (setupCompleted) {
          logWarn("setup:duplicate-complete-ignored")
          return
        }
        setupCompleted = true
        logEvent("setup:complete")
        setConnectionState("listening")
        const micStarted = await startMic()
        if (!micStarted) {
          logWarn("setup:mic-not-started-close-ws")
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.onclose = null
            ws.close()
          }
          ws = null
          return
        }

        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            if (initialPromptSent) {
              logWarn("trigger:initial-duplicate-skipped")
              return
            }
            initialPromptSent = true
            logEvent("trigger:initial-send")
            ws.send(
              JSON.stringify({
                clientContent: {
                  turns: [
                    {
                      role: "user",
                      parts: [
                        {
                          text: 'A conexão foi iniciada. Fale uma única frase curta se apresentando como assistente do CAR pré-preenchido e pergunte o nome do usuário, por exemplo: "Olá, eu vou te ajudar no CAR pré-preenchido. Como posso te chamar?" Depois pare totalmente de falar e aguarde a resposta pelo microfone. Não inicie o tutorial, não chame ferramenta, não pergunte em qual tela ele está e não mostre link.'
                        }
                      ]
                    }
                  ],
                  turnComplete: true
                }
              })
            )
          } else {
            logWarn("trigger:initial-skipped", {
              hasSocket: Boolean(ws),
              readyState: ws?.readyState
            })
          }
        }, 500)
      }

      if (data.serverContent?.interrupted) {
        handleInterrupted()
      }

      if (data.serverContent?.modelTurn?.parts) {
        modelTurnCount += 1
        if (modelTurnCount === 1 || modelTurnCount % 50 === 0) {
          logEvent("server:model-turn", {
            count: modelTurnCount,
            parts: data.serverContent.modelTurn.parts.length
          })
        }
        data.serverContent.modelTurn.parts.forEach((part) => {
          if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
            audioPartCount += 1
            if (audioPartCount === 1 || audioPartCount % 50 === 0) {
              logEvent("server:audio-part", {
                count: audioPartCount,
                mimeType: part.inlineData.mimeType,
                dataLength: part.inlineData.data?.length || 0
              })
            }
            playAudio(part.inlineData.data)
          } else {
            logEvent("server:non-audio-part", { keys: Object.keys(part) })
          }
        })
      }

      if (data.serverContent?.inputTranscription?.text) {
        const rawTranscript = data.serverContent.inputTranscription.text
        lastRawUserTranscript = rawTranscript
        lastRawUserTranscriptAt = Date.now()
        const isAssistantEchoWindow =
          isAssistantOutputActive() && Date.now() >= bargeInGraceUntil
        const meaningfulTranscript =
          isMeaningfulUserTranscript(rawTranscript) && !isAssistantEchoWindow

        if (meaningfulTranscript) {
          lastUserTranscript = rawTranscript
          lastUserTranscriptAt = Date.now()
          if (connectionState === "listening") {
            setConnectionState("processing", "Processando sua fala")
          }
        }

        logEvent(
          "transcript:user",
          debugSnapshot({
            text: shortenLogText(rawTranscript),
            meaningfulTranscript,
            ignoredAsAssistantEcho: isAssistantEchoWindow
          })
        )
      }

      if (data.serverContent?.outputTranscription?.text) {
        markAssistantResponseStarted("transcription")
        logEvent(
          "transcript:assistant",
          debugSnapshot({
            text: shortenLogText(data.serverContent.outputTranscription.text)
          })
        )
      }

      if (data.serverContent?.generationComplete) {
        markAssistantGenerationComplete("generationComplete")
      }

      if (data.serverContent?.turnComplete) {
        markAssistantGenerationComplete("turnComplete")
      }

      if (data.toolCall?.functionCalls) {
        logEvent(
          "tool:call-received",
          debugSnapshot({
            count: data.toolCall.functionCalls.length,
            calls: data.toolCall.functionCalls.map((fc) => ({
              id: fc.id,
              name: fc.name,
              args: fc.args
            }))
          })
        )
        handleToolCall(data.toolCall)
      }
    }

    ws.onerror = (err) => {
      logError("ws:error", err)
      setConnectionState("error", "Erro de conexão ou API. Tente novamente.")
    }

    ws.onclose = (event) => {
      logWarn("ws:close", {
        code: event.code,
        reason: event.reason || "(sem reason)",
        wasClean: event.wasClean,
        isStopping,
        connectionState,
        setupCompleted
      })
      if (!isStopping) stopCall(true, event)
    }
  }

  function handleToolCall(toolCall) {
    logEvent(
      "tool:handle-start",
      debugSnapshot({ count: toolCall.functionCalls.length })
    )
    const functionResponses = []

    for (const fc of toolCall.functionCalls) {
      let result = { status: "ok" }
      logEvent(
        "tool:function-start",
        debugSnapshot({ id: fc.id, name: fc.name, args: fc.args })
      )

      try {
        if (processedFunctionCallIds.has(fc.id)) {
          result = {
            status: "duplicate_ignored",
            message:
              "Esta chamada de ferramenta já foi processada nesta sessão."
          }
        } else {
          processedFunctionCallIds.add(fc.id)
        }

        if (result.status === "duplicate_ignored") {
          // A resposta ainda é enviada para manter o protocolo de toolResponse completo.
        } else if (fc.name === "renderGuideVisual") {
          const requestedReference = cleanVisualReference(
            fc.args?.referencia ||
              fc.args?.visualRef ||
              fc.args?.texto ||
              fc.args?.legenda
          )
          logEvent(
            "tool:render-request",
            debugSnapshot({
              id: fc.id,
              requestedReference
            })
          )

          if (isRecentDuplicateVisual(requestedReference)) {
            result = {
              status: "already_visible",
              displayed: "already_visible",
              message:
                "A referência visual solicitada já estava visível. Continue sem repetir nem mencionar nome de arquivo."
            }
            logEvent(
              "tool:duplicate-visual",
              debugSnapshot({
                id: fc.id,
                requestedReference,
                result
              })
            )
          } else {
            result = renderGuideVisual(fc.args || {})
            logEvent(
              "guide:visual-rendered",
              debugSnapshot({
                id: fc.id,
                requestedReference,
                result
              })
            )
          }
        } else {
          result = {
            status: "ignored",
            message: `Ferramenta desconhecida: ${fc.name}`
          }
        }
      } catch (error) {
        logError("tool:function-error", error, { id: fc.id, name: fc.name })
        result = { status: "error", message: error.message }
      }

      functionResponses.push({
        id: fc.id,
        name: fc.name,
        response: { result }
      })
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      logEvent(
        "tool:response-send",
        debugSnapshot({
          count: functionResponses.length,
          functionResponses
        })
      )
      ws.send(JSON.stringify({ toolResponse: { functionResponses } }))
    } else {
      logWarn("tool:response-skipped", {
        hasSocket: Boolean(ws),
        readyState: ws?.readyState
      })
    }
  }

  function stopCall(isFromClose = false, closeEvent = null) {
    logEvent("call:stop", {
      isFromClose,
      isStopping,
      closeCode: closeEvent?.code,
      closeReason: closeEvent?.reason,
      closeWasClean: closeEvent?.wasClean,
      hasSocket: Boolean(ws),
      socketState: ws?.readyState
    })
    if (isStopping && !isFromClose) return
    isStopping = true

    stopMic(true)
    const socketToClose = ws
    ws = null

    if (socketToClose && socketToClose.readyState !== WebSocket.CLOSED) {
      logEvent("ws:close-request", { readyState: socketToClose.readyState })
      socketToClose.onclose = null
      socketToClose.close()
    }

    stopQueuedAudio()
    if (audioContextOut) {
      audioContextOut.close()
      audioContextOut = null
    }
    resetSessionUi()
    const closeMessage = closeEvent
      ? `${setupCompleted ? "Conexão encerrada" : "Inicialização encerrada"} (${closeEvent.code}${closeEvent.reason ? `: ${closeEvent.reason}` : ""})`
      : undefined
    setConnectionState(
      isFromClose && !setupCompleted
        ? "error"
        : isFromClose
          ? "closed"
          : "idle",
      closeMessage
    )
    isStopping = false
  }

  function renderGuideVisual(args) {
    const reference = cleanVisualReference(
      args.referencia || args.visualRef || args.texto || args.legenda
    )
    const visual = findGuideVisual(reference)
    logEvent(
      "ui:render-guide-visual",
      debugSnapshot({
        args,
        normalizedReference: reference,
        hasImage: Boolean(visual),
        imagePath: visual?.path || null
      })
    )
    hideSpeakingVisual()
    const title =
      args.titulo || visual?.title || reference || "Referência do guia"

    lastRenderedReference = reference
    lastRenderedAt = Date.now()
    setExpression("pointing", 4000)

    if (visual) {
      carPanelContent.innerHTML = `<img data-guide-image src="${assetUrl(visual.path)}" alt="${escapeHtml(title)}">`
      const image = carPanelContent.querySelector("[data-guide-image]")
      image?.addEventListener("error", () => renderVisualFallback(reference))
      carPanel.classList.remove("hidden")
      return {
        status: "ok",
        displayed: "image",
        message:
          "A referência visual foi exibida na interface. Oriente o usuário sem mencionar nome de arquivo."
      }
    }

    renderVisualFallback(reference)
    carPanel.classList.remove("hidden")
    return {
      status: "ok",
      displayed: "text",
      message:
        "A referência de apoio foi exibida na interface. Oriente o usuário sem mencionar o texto técnico da referência."
    }
  }

  function isRecentDuplicateVisual(reference) {
    return (
      lastRenderedReference &&
      normalizeText(lastRenderedReference) === normalizeText(reference) &&
      Date.now() - lastRenderedAt < 15000
    )
  }

  function renderVisualFallback(reference) {
    const fallbackText = reference || "Sem referência visual"
    carPanelContent.innerHTML = `
            <div class="fallback-container">
                <p>${escapeHtml(fallbackText)}</p>
            </div>
        `
  }

  function findGuideVisual(reference) {
    const normalizedReference = normalizeText(reference)
    if (!normalizedReference) return null
    return (
      GUIDE_VISUALS.find((visual) =>
        visual.refs.some((ref) => {
          const normalizedRef = normalizeText(ref)
          return (
            normalizedReference === normalizedRef ||
            normalizedReference.includes(normalizedRef) ||
            normalizedRef.includes(normalizedReference)
          )
        })
      ) || null
    )
  }

  function cleanVisualReference(value) {
    return String(value || "")
      .trim()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .trim()
  }

  function normalizeText(value) {
    return cleanVisualReference(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
  }

  function assetUrl(path) {
    return escapeHtml(encodeURI(path).replaceAll("#", "%23"))
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }
})()
