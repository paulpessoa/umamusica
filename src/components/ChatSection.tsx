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
  const recognitionRef = useRef<any>(null);
  const activeCallAudioRef = useRef<HTMLAudioElement | null>(null);

  const latestTranscriptRef = useRef("");
  const isLiveCallActiveRef = useRef(false);
  const callStatusRef = useRef<"idle" | "listening" | "processing" | "speaking">("idle");

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

  const startContinuousSpeech = () => {
    const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      alert("O seu navegador não suporta reconhecimento de voz direto. Recomendamos usar o Google Chrome ou Microsoft Edge para ter a experiência completa de conversa de voz.");
      setIsLiveCallActive(false);
      return;
    }

    // Stop existing voice synthesis
    if (activeCallAudioRef.current) {
      activeCallAudioRef.current.pause();
    }

    const rec = new SpeechRecognitionImpl();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;

    rec.onstart = () => {
      setCallStatus("listening");
      setLiveUserSubtitle("Ouvindo você...");
      latestTranscriptRef.current = ""; // Clear on start
    };

    rec.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      const text = (final || interim).trim();
      latestTranscriptRef.current = text;
      setLiveUserSubtitle(text || "Ouvindo você...");
    };

    rec.onerror = (e: any) => {
      console.warn("Speech Recognition Error:", e);
      if (isLiveCallActiveRef.current && e.error !== "no-speech") {
        setTimeout(() => {
          try { rec.start(); } catch (err) {}
        }, 300);
      }
    };

    rec.onend = () => {
      const textToProcess = latestTranscriptRef.current.trim();
      if (textToProcess && textToProcess.length > 1) {
        latestTranscriptRef.current = ""; // Reset immediately
        sendSpeechToGemini(textToProcess);
      } else {
        // Restart listening if call remains active and we are still listening
        if (isLiveCallActiveRef.current && callStatusRef.current === "listening") {
          setTimeout(() => {
            try { rec.start(); } catch (err) {}
          }, 600);
        }
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
    }
  };

  const sendSpeechToGemini = async (speechText: string) => {
    setCallStatus("processing");
    setIsTyping(true);

    const userMsg: ChatMessage = {
      sender: "user",
      text: `🎙️ ${speechText}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [...messages, userMsg];
    setMessages(updated);

    try {
      const res = await fetch("/api/chat-continuous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updated,
          text: speechText,
          email
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        const aiMsg: ChatMessage = {
          sender: "ai",
          text: data.aiResponse,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, aiMsg]);
        setLiveAISubtitle(data.aiResponse);

        if (data.triggerCompose) {
          setCallStatus("speaking");
          setLiveUserSubtitle("Composição automática iniciada! Desligando a chamada...");
          
          if (data.aiAudio) {
            const audio = new Audio(data.aiAudio);
            activeCallAudioRef.current = audio;
            audio.onended = () => {
              setIsLiveCallActive(false);
              setCallStatus("idle");
              onFinishChat([...updated, aiMsg]);
            };
            await audio.play().catch(e => console.error(e));
          } else {
            setTimeout(() => {
              setIsLiveCallActive(false);
              setCallStatus("idle");
              onFinishChat([...updated, aiMsg]);
            }, 3000);
          }
          return;
        }

        if (data.aiAudio) {
          setCallStatus("speaking");
          const audio = new Audio(data.aiAudio);
          activeCallAudioRef.current = audio;
          audio.onended = () => {
            if (isLiveCallActiveRef.current) {
              setCallStatus("listening");
              setLiveUserSubtitle("Ouvindo você...");
              try {
                recognitionRef.current?.start();
              } catch (err) {
                console.error(err);
              }
            }
          };
          await audio.play().catch(e => console.error(e));
        } else {
          if (isLiveCallActiveRef.current) {
            setCallStatus("listening");
            setLiveUserSubtitle("Ouvindo você...");
            try {
              recognitionRef.current?.start();
            } catch (err) {}
          }
        }
      } else {
        throw new Error("API return error");
      }
    } catch (err) {
      console.error("Error in continuous speech logic:", err);
      if (isLiveCallActiveRef.current) {
        setCallStatus("listening");
        setLiveUserSubtitle("Ouvindo você...");
        try {
          recognitionRef.current?.start();
        } catch (e) {}
      }
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    if (isLiveCallActive) {
      startContinuousSpeech();
    } else {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (err) {}
      }
      if (activeCallAudioRef.current) {
        activeCallAudioRef.current.pause();
      }
      setCallStatus("idle");
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (err) {}
      }
      if (activeCallAudioRef.current) {
        activeCallAudioRef.current.pause();
      }
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

                  {/* Clean real-time transcription boxes */}
                  <div className="w-full max-w-md space-y-3.5 bg-white/5 border border-white/10 p-5 rounded-2xl text-left">
                    <div className="space-y-1 border-b border-white/5 pb-3">
                      <span className="text-[9px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1">
                        <Mic className="w-3 h-3" /> Você diz:
                      </span>
                      <p className="text-sm text-gray-200 min-h-[22px] italic">
                        "{liveUserSubtitle || "..."}"
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold tracking-wider text-[#FF5A5F] uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Gemini diz:
                      </span>
                      <p className="text-sm font-semibold text-white min-h-[22px] leading-relaxed">
                        {liveAISubtitle || "Ouvindo você... Fale sobre o que deseja para a canção!"}
                      </p>
                    </div>
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
