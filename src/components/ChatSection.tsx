import React, { useState, useEffect, useRef } from "react";
import { Send, Clock, Sparkles, MessageCircle, RefreshCw, PenTool, Mic, MicOff, Volume2, VolumeX, Loader2, PhoneCall, PhoneOff, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ChatMessage } from "../types";

interface ChatSectionProps {
  email: string;
  onFinishChat: (transcript: ChatMessage[]) => void;
}

export default function ChatSection({ email, onFinishChat }: ChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "ai",
      text: `Olá! Eu sou o seu Compositor Virtual. Vou te ajudar a transformar sua história em uma música inesquecível por apenas R$ 1,00!\n\nVocê também pode falar comigo por voz ativando o **Modo Entrevista Live**! 🎙️\n\nPara começarmos, me conta: **para quem é essa música** e qual a **ocasião especial**?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [isTimeout, setIsTimeout] = useState(false);
  const [freeformText, setFreeformText] = useState("");

  // Live Assistant Audio Mode States
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isPlayingAssistantVoice, setIsPlayingAssistantVoice] = useState(false);

  // Continuous Hands-free Live Call States
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [liveUserSubtitle, setLiveUserSubtitle] = useState("");
  const [liveAISubtitle, setLiveAISubtitle] = useState("");
  const [callStatus, setCallStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [callDuration, setCallDuration] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeAudioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const speakingTimeoutRef = useRef<any>(null);
  const assistantResponseActiveRef = useRef<boolean>(false);
  const assistantGenerationCompleteRef = useRef<boolean>(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const consecutiveBargeInChunksRef = useRef<number>(0);
  const bargeInGraceUntilRef = useRef<number>(0);
  const setupCompletedRef = useRef<boolean>(false);
  const isStoppingRef = useRef<boolean>(false);
  const currentAIResponseRef = useRef<string>("");

  const isLiveCallActiveRef = useRef(false);
  const callStatusRef = useRef<"idle" | "listening" | "processing" | "speaking" | "connecting">("idle");

  useEffect(() => {
    isLiveCallActiveRef.current = isLiveCallActive;
  }, [isLiveCallActive]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    let interval: any = null;
    if (isLiveCallActive) {
      setCallDuration(0);
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isLiveCallActive]);

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestions for interactive prompt chips
  const generalSuggestions = [
    "Homenagem p/ Mãe 👩‍👦",
    "Aniversário do Amor 🎂",
    "Agradecimento p/ Amigo 🤝",
    "Sertanejo Universitário 🤠",
    "MPB Acústico 🎸",
    "Samba Animado 🥁",
  ];

  // Stop assistant voice on unmount
  useEffect(() => {
    return () => {
      if (assistantAudioRef.current) {
        assistantAudioRef.current.pause();
      }
    };
  }, []);

  // Continuous Voice Call helpers
  const getChecklist = () => {
    const history = messages.map(m => m.text.toLowerCase()).join(" ");
    const userMessages = messages.filter(m => m.sender === "user");
    return [
      {
        id: "destinatario",
        label: "Destinatário (Para quem é?)",
        completed: history.includes("mãe") || history.includes("namorad") || history.includes("amig") || history.includes("avô") || history.includes("avó") || history.includes("pai") || history.includes("irmã") || history.includes("filh") || userMessages.length >= 1
      },
      {
        id: "ocasiao",
        label: "Ocasião (Qual o motivo?)",
        completed: history.includes("aniversário") || history.includes("declaração") || history.includes("casamento") || history.includes("agradecer") || history.includes("natal") || history.includes("homenagem") || userMessages.length >= 1
      },
      {
        id: "estilo",
        label: "Estilo Musical (Sertanejo, Pop, MPB...)",
        completed: history.includes("sertanejo") || history.includes("pop") || history.includes("mpb") || history.includes("samba") || history.includes("rock") || history.includes("gospel") || history.includes("acústico") || history.includes("forró")
      },
      {
        id: "memorias",
        label: "Lembranças e Detalhes Poéticos",
        completed: history.length > 140 || history.includes("lembr") || history.includes("história") || history.includes("viagem") || history.includes("apelido") || userMessages.length >= 2
      },
      {
        id: "tom",
        label: "Tom (Emocionante ou Alegre?)",
        completed: history.includes("emocionante") || history.includes("alegre") || history.includes("engraçado") || history.includes("romântico") || history.includes("divertido") || userMessages.length >= 2
      }
    ];
  };

  const playAudio = (base64: string) => {
    if (!audioContextOutRef.current) {
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextOutRef.current.state === "suspended") {
      audioContextOutRef.current.resume();
    }

    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }

    const buffer = audioContextOutRef.current.createBuffer(1, float32Array.length, 24000);
    buffer.getChannelData(0).set(float32Array);

    const source = audioContextOutRef.current.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContextOutRef.current.destination);
    activeAudioSourcesRef.current.add(source);

    source.onended = () => {
      activeAudioSourcesRef.current.delete(source);
      checkPlaybackEnded();
    };

    if (nextPlayTimeRef.current < audioContextOutRef.current.currentTime) {
      nextPlayTimeRef.current = audioContextOutRef.current.currentTime + 0.05;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;

    assistantResponseActiveRef.current = true;
    setCallStatus("speaking");

    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
    speakingTimeoutRef.current = setTimeout(
      checkPlaybackEnded,
      Math.max(300, (nextPlayTimeRef.current - audioContextOutRef.current.currentTime) * 1000)
    );
  };

  const stopQueuedAudio = () => {
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
    for (const source of activeAudioSourcesRef.current) {
      try {
        source.stop();
      } catch (e) {}
    }
    activeAudioSourcesRef.current.clear();
    if (audioContextOutRef.current) {
      nextPlayTimeRef.current = audioContextOutRef.current.currentTime;
    }
  };

  const checkPlaybackEnded = () => {
    if (!assistantGenerationCompleteRef.current || activeAudioSourcesRef.current.size > 0) {
      return;
    }
    assistantResponseActiveRef.current = false;
    assistantGenerationCompleteRef.current = false;
    consecutiveBargeInChunksRef.current = 0;
    setCallStatus("listening");
  };

  const getAudioLevel = (inputData: Float32Array) => {
    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < inputData.length; i++) {
      const abs = Math.abs(inputData[i]);
      peak = Math.max(peak, abs);
      sumSquares += inputData[i] * inputData[i];
    }
    return {
      rms: Math.sqrt(sumSquares / Math.max(1, inputData.length)),
      peak
    };
  };

  const shouldSendMicAudio = (inputData: Float32Array) => {
    if (
      !setupCompletedRef.current ||
      !isLiveCallActiveRef.current ||
      !wsRef.current ||
      wsRef.current.readyState !== WebSocket.OPEN
    ) {
      return false;
    }

    const now = Date.now();
    const level = getAudioLevel(inputData);
    const isAssistantOutputActive = assistantResponseActiveRef.current || activeAudioSourcesRef.current.size > 0;

    if (isAssistantOutputActive) {
      // Barge-in thresholds
      const BARGE_IN_RMS_THRESHOLD = 0.045;
      const BARGE_IN_PEAK_THRESHOLD = 0.12;
      const BARGE_IN_REQUIRED_CHUNKS = 2;
      const BARGE_IN_GRACE_MS = 1800;

      const strongSpeech = level.rms >= BARGE_IN_RMS_THRESHOLD || level.peak >= BARGE_IN_PEAK_THRESHOLD;
      consecutiveBargeInChunksRef.current = strongSpeech ? consecutiveBargeInChunksRef.current + 1 : 0;

      if (consecutiveBargeInChunksRef.current >= BARGE_IN_REQUIRED_CHUNKS) {
        bargeInGraceUntilRef.current = now + BARGE_IN_GRACE_MS;
        consecutiveBargeInChunksRef.current = 0;
        console.log("[Agente Live] Barge-in detected", level);
        
        stopQueuedAudio();
        assistantResponseActiveRef.current = false;
        assistantGenerationCompleteRef.current = false;
        setCallStatus("processing");
        return true;
      }
      return false;
    }

    // Standard activity check to trigger "processing" state
    const MIC_ACTIVITY_RMS_THRESHOLD = 0.012;
    if (callStatusRef.current === "listening" && level.rms >= MIC_ACTIVITY_RMS_THRESHOLD) {
      setCallStatus("processing");
    }
    return true;
  };

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true }
      });
      micStreamRef.current = stream;

      const audioContextIn = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextInRef.current = audioContextIn;

      const source = audioContextIn.createMediaStreamSource(stream);
      const micProcessor = audioContextIn.createScriptProcessor(4096, 1, 1);
      micProcessorRef.current = micProcessor;

      micProcessor.onaudioprocess = (event) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const inputData = event.inputBuffer.getChannelData(0);

        if (!shouldSendMicAudio(inputData)) return;

        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        }

        let binary = "";
        const bytes = new Uint8Array(pcm16.buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }

        wsRef.current.send(JSON.stringify({
          realtimeInput: {
            audio: { data: btoa(binary), mimeType: "audio/pcm;rate=16000" }
          }
        }));
      };

      const silentGain = audioContextIn.createGain();
      silentGain.gain.value = 0;
      source.connect(micProcessor);
      micProcessor.connect(silentGain);
      silentGain.connect(audioContextIn.destination);

      console.log("[Agente Live] Mic ready");
      return true;
    } catch (err) {
      console.error("[Agente Live] Mic error:", err);
      return false;
    }
  };

  const stopMic = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
      } catch (e) {}
    }
    if (micProcessorRef.current) {
      try { micProcessorRef.current.disconnect(); } catch (e) {}
      micProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      try { micStreamRef.current.getTracks().forEach((track) => track.stop()); } catch (e) {}
      micStreamRef.current = null;
    }
    if (audioContextInRef.current) {
      try { audioContextInRef.current.close(); } catch (e) {}
      audioContextInRef.current = null;
    }
  };

  const handleLiveUserTranscript = (text: string) => {
    if (!text.trim()) return;
    setLiveUserSubtitle(text);
    const userMsg: ChatMessage = {
      sender: "user",
      text: `🎙️ ${text}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
  };

  const startContinuousSpeech = async () => {
    isStoppingRef.current = false;
    setupCompletedRef.current = false;
    assistantResponseActiveRef.current = false;
    assistantGenerationCompleteRef.current = false;
    consecutiveBargeInChunksRef.current = 0;
    currentAIResponseRef.current = "";

    setCallStatus("connecting");
    setLiveUserSubtitle("Conectando ao Gemini...");
    setLiveAISubtitle("");

    try {
      const keyRes = await fetch("/api/gemini-key");
      const keyData = await keyRes.json();
      const apiKey = keyData.apiKey;

      if (!apiKey) {
        throw new Error("Chave da API do Gemini não configurada.");
      }

      const MODEL = "models/gemini-2.5-flash-native-audio-latest";
      const WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;

      if (!audioContextOutRef.current) {
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      audioContextOutRef.current.resume();
      nextPlayTimeRef.current = audioContextOutRef.current.currentTime;

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      const systemInstructionText = `
Você é o Compositor Virtual do UnaMusica.com.br, um assistente caloroso, simpático e super criativo que ajuda pessoas a criarem músicas personalizadas e emocionantes para quem amam, por apenas R$ 1,00 via Pix.
Seu objetivo é conduzir uma entrevista de onboarding profunda, calorosa e engajadora com o usuário para capturar absolutamente todas as informações necessárias para gerar a base da música:
1. Destinatário (para quem é a música?)
2. Ocasião especial (aniversário, declaração de amor, agradecimento, etc.)
3. Estilo musical (Sertanejo, Pop, MPB, Samba, etc.)
4. Lembranças, apelidos, piadas internas e histórias reais.
5. Tom desejado (emocionante ou alegre).

Instruções importantes de voz:
- Responda sempre em Português do Brasil de forma extremamente natural, simpática, curta e concisa (máximo 2 a 3 frases por resposta), pois esta é uma conversa de voz em tempo real.
- Faça apenas uma pergunta clara e instigante de cada vez.
- Se o usuário falar algo ofensivo ou inadequado, chame a atenção de forma educada.
- Quando tiver coletado todos os detalhes essenciais de forma clara, diga expressamente algo como: "Perfeito! Já tenho todos os detalhes para compor a sua canção. Você pode clicar no botão Compor Música abaixo para gerarmos a sua melodia."
`;

      ws.onopen = () => {
        console.log("[Agente Live] WebSocket open");
        ws.send(JSON.stringify({
          setup: {
            model: MODEL,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
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
            systemInstruction: { parts: [{ text: systemInstructionText }] }
          }
        }));
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data instanceof Blob ? await event.data.text() : event.data);

        if (data.setupComplete) {
          setupCompletedRef.current = true;
          console.log("[Agente Live] Setup complete");
          setCallStatus("listening");
          setLiveUserSubtitle("Ouvindo você...");
          startMic();

          // Trigger initial greeting automatically
          setTimeout(() => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.send(JSON.stringify({
                clientContent: {
                  turns: [{ role: "user", parts: [{ text: "Olá. Por favor, apresente-se calorosamente como o Compositor Virtual da UnaMusica e pergunte-me para quem é a música." }] }],
                  turnComplete: true
                }
              }));
            }
          }, 500);
        }

        if (data.serverContent?.interrupted) {
          console.log("[Agente Live] Interrupted by user speaking");
          stopQueuedAudio();
          assistantResponseActiveRef.current = false;
          assistantGenerationCompleteRef.current = false;
          setCallStatus("listening");
        }

        if (data.serverContent?.modelTurn?.parts) {
          data.serverContent.modelTurn.parts.forEach((part: any) => {
            if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
              playAudio(part.inlineData.data);
            }
          });
        }

        if (data.serverContent?.inputTranscription?.text) {
          const userText = data.serverContent.inputTranscription.text;
          console.log("[Agente Live] User Transcript:", userText);
          handleLiveUserTranscript(userText);
        }

        if (data.serverContent?.outputTranscription?.text) {
          const aiTextPart = data.serverContent.outputTranscription.text;
          console.log("[Agente Live] AI Transcript Part:", aiTextPart);
          currentAIResponseRef.current += aiTextPart;
          setLiveAISubtitle(currentAIResponseRef.current);
        }

        if (data.serverContent?.turnComplete || data.serverContent?.generationComplete) {
          assistantGenerationCompleteRef.current = true;
          checkPlaybackEnded();

          // Commit current accumulated AI subtitle to the history messages
          if (currentAIResponseRef.current.trim()) {
            const currentResponse = currentAIResponseRef.current.trim();
            currentAIResponseRef.current = "";
            setMessages((prev) => [
              ...prev,
              {
                sender: "ai",
                text: currentResponse,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              }
            ]);
          }
        }
      };

      ws.onerror = (err) => {
        console.error("[Agente Live] WS error:", err);
        setCallStatus("idle");
        setLiveUserSubtitle("Erro na conexão...");
      };

      ws.onclose = () => {
        console.log("[Agente Live] WS close");
        if (!isStoppingRef.current) {
          stopContinuousSpeech();
        }
      };

    } catch (err: any) {
      console.error("[Agente Live] Error starting live WebSocket:", err);
      setCallStatus("idle");
      setLiveUserSubtitle("Erro ao conectar.");
    }
  };

  const stopContinuousSpeech = () => {
    isStoppingRef.current = true;
    stopMic();
    stopQueuedAudio();

    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    wsRef.current = null;
    setCallStatus("idle");
  };

  useEffect(() => {
    if (isLiveCallActive) {
      startContinuousSpeech();
    } else {
      stopContinuousSpeech();
    }
    return () => {
      stopContinuousSpeech();
    };
  }, [isLiveCallActive]);

  const startRecording = async () => {
    try {
      // Clear any playing audio
      if (assistantAudioRef.current) {
        assistantAudioRef.current.pause();
        setIsPlayingAssistantVoice(false);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleSendVoiceMessage(audioBlob);
        
        // Turn off stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Não foi possível acessar seu microfone. Verifique as permissões de gravação de áudio em seu navegador.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);
    setIsTyping(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        if (!reader.result) return;
        const base64data = (reader.result as string).split(",")[1];
        
        const response = await fetch("/api/chat-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audio: base64data,
            mimeType: "audio/webm",
            messages,
            email,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          
          // 1. Add user transcribed text
          const userMsg: ChatMessage = {
            sender: "user",
            text: `🎙️ ${data.userTranscript || "Mensagem de voz enviada"}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          // 2. Add AI reply
          const aiMsg: ChatMessage = {
            sender: "ai",
            text: data.aiResponse || "Muito legal! Me conta mais?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => [...prev, userMsg, aiMsg]);

          // 3. Play the generated voice reply from Gemini Live TTS
          if (data.aiAudio) {
            const audio = new Audio(data.aiAudio);
            assistantAudioRef.current = audio;
            setIsPlayingAssistantVoice(true);
            audio.onended = () => {
              setIsPlayingAssistantVoice(false);
            };
            audio.play().catch(e => console.error("Voice playback failed:", e));
          }
        } else {
          throw new Error("Voice API response not ok");
        }
        setIsProcessingAudio(false);
        setIsTyping(false);
      };
    } catch (err) {
      console.error("Error processing voice message:", err);
      setIsProcessingAudio(false);
      setIsTyping(false);
      
      const fallbackReplies = [
        "Nossa, que história incrível! Qual estilo musical você quer para essa homenagem?",
        "Entendido! Que memórias marcantes ou momentos especiais podemos citar?",
        "Que lindo! Prefere uma música bem emocionante ou bem alegre?"
      ];
      const randomReply = fallbackReplies[Math.min(messages.filter(m => m.sender === 'user').length, fallbackReplies.length - 1)];
      setMessages((prev) => [
        ...prev,
        {
          sender: "user",
          text: "🎙️ [Mensagem de voz enviada]",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        {
          sender: "ai",
          text: randomReply,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  const toggleAssistantSound = () => {
    if (assistantAudioRef.current) {
      if (isPlayingAssistantVoice) {
        assistantAudioRef.current.pause();
        setIsPlayingAssistantVoice(false);
      } else {
        assistantAudioRef.current.play().catch(e => console.error(e));
        setIsPlayingAssistantVoice(true);
      }
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsTimeout(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, email }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiMsg: ChatMessage = {
          sender: "ai",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error("Erro na API");
      }
    } catch (err) {
      // Graceful local AI responses if API is failing
      const fallbackReplies = [
        "Que história maravilhosa! Que estilo musical combina mais com essa homenagem? (Sertanejo, Pop, Rock, Samba, etc.)",
        "Me conta duas memórias ou detalhes divertidos que representem a amizade de vocês para colocarmos no refrão!",
        "Perfeito! Prefere que a música seja emocionante de fazer chorar ou bem alegre e divertida?",
        "Entendido! Estou preparando tudo aqui. Quer concluir e compor agora?"
      ];
      
      const randomReply = fallbackReplies[Math.min(messages.filter(m => m.sender === 'user').length, fallbackReplies.length - 1)];
      
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: randomReply,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Strip emojis for prompt sending
    const cleanedText = suggestion.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim();
    handleSendMessage(cleanedText);
  };

  const triggerCompose = () => {
    if (isTimeout) {
      if (!freeformText.trim()) return;
      onFinishChat([
        {
          sender: "user",
          text: `[História Livre]: ${freeformText}`,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } else {
      onFinishChat(messages);
    }
  };

  // Determine if AI suggested wrapping up
  const lastMessageText = messages[messages.length - 1]?.text || "";
  const isReadyToCompose = lastMessageText.toLowerCase().includes("finalizar") || 
                           lastMessageText.toLowerCase().includes("compor") || 
                           messages.filter(m => m.sender === "user").length >= 3;

  return (
    <div id="chat-container-layout" className="flex-1 flex flex-col min-h-0 relative bg-white">
      
      <AnimatePresence mode="wait">
        {!isTimeout ? (
          /* ACTIVE CHAT VIEW */
          <motion.div 
            key="chat-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {isLiveCallActive ? (
              /* GORGEOUS IMMERSIVE INTERACTIVE LIVE CALL OVERLAY (GEMINI STYLE) */
              <div className="flex-1 flex flex-col min-h-0 bg-slate-950 text-white relative overflow-hidden">
                
                {/* Floating background gradient circles for cinematic effect */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                  <div className="absolute top-[10%] left-[10%] w-72 h-72 rounded-full bg-[#FF5A5F]/10 blur-3xl animate-[pulse_6s_infinite]"></div>
                  <div className="absolute bottom-[10%] right-[10%] w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl animate-[pulse_8s_infinite_2s]"></div>
                </div>

                {/* Header info */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400">Chamada Live IA</h3>
                      <p className="text-[10px] text-gray-400">Conversando por Voz em Tempo Real</p>
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-xs font-mono font-bold text-gray-300">
                    {formatCallDuration(callDuration)}
                  </div>
                </div>

                {/* Central content area: Single column minimalist layout */}
                <div className="flex-1 flex flex-col justify-between items-center p-6 min-h-0 z-10 overflow-y-auto space-y-6">
                  
                  {/* Top status */}
                  <div className="text-center space-y-1">
                    <p className="text-sm font-semibold tracking-wide text-gray-300 uppercase">
                      {callStatus === "listening" ? "🟢 Ouvindo você..." :
                       callStatus === "processing" ? "⏳ Analisando..." :
                       callStatus === "speaking" ? "🔊 IA Falando..." : "Iniciando..."}
                    </p>
                    <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                      {callStatus === "listening" ? "Fale naturalmente, a IA irá responder por áudio." :
                       callStatus === "processing" ? "Formulando a resposta..." :
                       "Para concluir, clique em Compor Música."}
                    </p>
                  </div>

                  {/* Central Audio Visualizer Sphere (Gemini Style) */}
                  <div className="relative flex items-center justify-center w-52 h-52">
                    
                    {/* Pulsing rings */}
                    <div className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                      callStatus === "listening" ? "bg-emerald-500/10 animate-ping" :
                      callStatus === "processing" ? "bg-indigo-500/10 animate-spin" :
                      "bg-[#FF5A5F]/20 animate-[pulse_1.5s_infinite]"
                    }`}></div>

                    <div className={`absolute w-40 h-40 rounded-full transition-all duration-1000 ${
                      callStatus === "listening" ? "border-2 border-emerald-400/20 scale-105" :
                      callStatus === "processing" ? "border-2 border-dashed border-indigo-400/30 rotate-45" :
                      "border-2 border-[#FF5A5F]/30 scale-110"
                    }`}></div>

                    {/* Central core orb */}
                    <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${
                      callStatus === "listening" ? "bg-emerald-500 shadow-emerald-500/20" :
                      callStatus === "processing" ? "bg-indigo-600 shadow-indigo-500/20" :
                      "bg-[#FF5A5F] shadow-[#FF5A5F]/30"
                    }`}>
                      <Sparkles className="w-9 h-9 text-white animate-[pulse_2s_infinite]" />
                      <span className="text-[10px] font-black tracking-widest text-white/90 uppercase mt-1">Live Mode</span>
                    </div>

                    {/* Speech waves indicator */}
                    {callStatus === "speaking" && (
                      <div className="absolute -bottom-4 flex items-end gap-1.5 h-6">
                        <span className="w-1.5 bg-[#FF5A5F] rounded-full animate-[bounce_1s_infinite_100ms] h-4"></span>
                        <span className="w-1.5 bg-[#FF5A5F] rounded-full animate-[bounce_1s_infinite_300ms] h-6"></span>
                        <span className="w-1.5 bg-[#FF5A5F] rounded-full animate-[bounce_1s_infinite_200ms] h-3"></span>
                        <span className="w-1.5 bg-[#FF5A5F] rounded-full animate-[bounce_1s_infinite_400ms] h-5"></span>
                        <span className="w-1.5 bg-[#FF5A5F] rounded-full animate-[bounce_1s_infinite_150ms] h-3"></span>
                      </div>
                    )}
                  </div>

             

                </div>

                {/* Bottom Call Controls with Hang Up and Finish Compose */}
                <div className="p-6 border-t border-white/5 bg-slate-950/80 z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                  {/* Red Hang Up Button */}
                  <button
                    onClick={() => {
                      setIsLiveCallActive(false);
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer shadow-lg shadow-red-600/10 active:scale-95"
                  >
                    <PhoneOff className="w-4.5 h-4.5" />
                    <span>Desligar Chamada</span>
                  </button>

                  {/* White Finish Compose Button */}
                  <button
                    onClick={() => {
                      setIsLiveCallActive(false);
                      triggerCompose();
                    }}
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-white hover:bg-gray-100 text-gray-900 font-bold flex items-center justify-center gap-2 transition-transform duration-200 cursor-pointer shadow-lg active:scale-95"
                  >
                    <Sparkles className="w-4 h-4 text-[#FF5A5F]" />
                    <span>Compor Música 🎵</span>
                  </button>
                </div>

              </div>
            ) : (
              /* REGULAR TEXT/PUSH-TO-TALK CHAT SCANNABLE VIEW */
              <>
                {/* Scrollable Chat History */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent bg-white">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                          msg.sender === "user"
                            ? "bg-[#FF5A5F] text-white rounded-br-none"
                            : "bg-gray-50 text-gray-800 rounded-bl-none border border-gray-100"
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.text}</p>
                        <span className="block text-[10px] opacity-60 text-right mt-1.5 font-mono">
                          {msg.timestamp}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-50 text-gray-400 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5 border border-gray-100">
                        <span className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                        <span className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                        <span className="w-2 h-2 bg-[#FF5A5F] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Float Suggestions Area */}
                {messages.length < 5 && !isTyping && (
                  <div className="px-4 py-2 bg-white border-t border-gray-100 overflow-x-auto whitespace-nowrap flex items-center gap-2 scrollbar-none">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Sugestões:</span>
                    {generalSuggestions.map((sug, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(sug)}
                        className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 border border-gray-200/60 hover:border-[#FF5A5F]/40 px-3 py-1.5 rounded-full transition-colors duration-200"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                )}

                {/* Bottom Actions and Controls */}
                <div className="p-4 bg-white border-t border-gray-100 space-y-3">
                  
                  {isReadyToCompose && (
                    <motion.button
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      onClick={triggerCompose}
                      className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all duration-300 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 animate-spin" />
                      Concluir e Compor Música 🎵
                    </motion.button>
                  )}

                  {/* Clean Input with Live IA Trigger */}
                  <div className="flex items-center gap-2">
                    {/* Continuous voice call trigger button styled like Gemini Live */}
                    <button
                      onClick={() => {
                        setIsLiveMode(false);
                        setIsLiveCallActive(true);
                      }}
                      className="bg-indigo-50/80 hover:bg-indigo-100 text-indigo-600 border border-indigo-100/50 p-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold font-sans active:scale-95 shrink-0"
                      title="Iniciar chamada de voz Gemini Live"
                    >
                      <PhoneCall className="w-4.5 h-4.5 animate-pulse text-indigo-500" />
                      <span className="hidden sm:inline">Conversação Live IA</span>
                    </button>

                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
                      placeholder="Converse com a IA Compositora..."
                      disabled={isTyping}
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 disabled:opacity-55"
                    />

                    <button
                      onClick={() => handleSendMessage(inputValue)}
                      disabled={!inputValue.trim() || isTyping}
                      className="bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 text-white p-3.5 rounded-xl transition-all duration-200 shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Force freeform bypass button */}
                  <div className="text-center pt-1">
                    <button 
                      onClick={() => {
                        if (assistantAudioRef.current) assistantAudioRef.current.pause();
                        setIsPlayingAssistantVoice(false);
                        setIsTimeout(true);
                      }}
                      className="text-[11px] text-gray-400 hover:text-gray-600 underline transition-colors"
                    >
                      Prefiro escrever a história inteira de uma vez
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        ) : (
          /* FREEFORM FALLBACK VIEW (ON TIMEOUT OR REQUEST) */
          <motion.div 
            key="chat-fallback"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto bg-white"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#FFF0F0] text-[#FF5A5F] flex items-center justify-center mx-auto border border-[#FF5A5F]/10">
                <PenTool className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">
                Criação Livre de História
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                Não se preocupe com o tempo! Conte tudo aqui livremente sobre quem você quer homenagear, memórias marcantes e o estilo musical. Nossa IA vai organizar e compor a música perfeita!
              </p>
            </div>

            <div className="flex-1 flex flex-col min-h-[220px]">
              <textarea
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                placeholder="Exemplo: Quero uma música sertaneja romântica para a minha esposa Juliana. Nos conhecemos na faculdade, temos um cachorro chamado Pipoca e fazemos 5 anos de casados no próximo sábado..."
                className="w-full flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 resize-none leading-relaxed"
              ></textarea>
            </div>

            <div className="space-y-3">
              <button
                onClick={triggerCompose}
                disabled={!freeformText.trim()}
                className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm tracking-wide transition-all duration-300 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Criar Minha Música por R$ 1,00 🎵
              </button>

              <button
                onClick={() => {
                  setTimeLeft(300);
                  setIsTimeout(false);
                }}
                className="w-full bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 font-semibold py-3 px-4 rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Voltar para o Chat Interativo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
