import React, { useState, useEffect, useRef } from "react";
import { Send, Sparkles, Mic, MicOff, Loader2, PenTool, RefreshCw } from "lucide-react";
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
      text: `Olá! 🎵 Eu sou o seu Compositor Virtual. Vou te ajudar a transformar sua história em uma música inesquecível por apenas R$ 1,00!\n\nVocê pode digitar ou segurar o 🎙️ para gravar um áudio.\n\nPra começar: **para quem é essa música** e qual a **ocasião especial**?`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [freeformText, setFreeformText] = useState("");
  const [showFreeform, setShowFreeform] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    "Homenagem p/ Mãe 👩‍👦",
    "Aniversário do Amor 🎂",
    "Agradecimento p/ Amigo 🤝",
    "Sertanejo 🤠",
    "MPB Acústico 🎸",
    "Samba 🥁",
  ];

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ─── Send Text Message ──────────────────────────────────
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

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.text,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        // Show specific rate limit or server error message directly in chat
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.error || "Opa, tive um pequeno problema para responder agora. Pode tentar novamente em alguns instantes?",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Não consegui contato com o compositor virtual. Verifique se o servidor está online ou sua internet ativa.",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Voice Recording (WhatsApp-style) ───────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await sendVoiceMessage(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("Não foi possível acessar seu microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsProcessingAudio(true);
    setIsTyping(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        if (!reader.result) return;
        const base64data = (reader.result as string).split(",")[1];

        try {
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

          const data = await response.json().catch(() => ({}));

          if (response.ok) {
            setMessages((prev) => [
              ...prev,
              {
                sender: "user",
                text: `🎙️ ${data.userTranscript || "Mensagem de voz"}`,
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
              {
                sender: "ai",
                text: data.aiResponse || "Muito legal! Me conta mais?",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                sender: "user",
                text: "🎙️ [Mensagem de voz enviada]",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
              {
                sender: "ai",
                text: data.error || "Tive um problema para processar seu áudio. Digite sua resposta ou tente gravar novamente.",
                timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              },
            ]);
          }
        } catch {
          setMessages((prev) => [
            ...prev,
            {
              sender: "user",
              text: "🎙️ [Mensagem de voz enviada]",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
            {
              sender: "ai",
              text: "Não consegui contato com o servidor para enviar o áudio. Verifique sua conexão de rede.",
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        } finally {
          setIsProcessingAudio(false);
          setIsTyping(false);
        }
      };
    } catch {
      setIsProcessingAudio(false);
      setIsTyping(false);
    }
  };

  // ─── Compose Trigger ────────────────────────────────────
  const triggerCompose = () => {
    if (showFreeform) {
      if (!freeformText.trim()) return;
      onFinishChat([
        {
          sender: "user",
          text: `[História Livre]: ${freeformText}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } else {
      onFinishChat(messages);
    }
  };

  const lastMsg = messages[messages.length - 1]?.text || "";
  const isReadyToCompose =
    lastMsg.toLowerCase().includes("finalizar") ||
    lastMsg.toLowerCase().includes("compor") ||
    messages.filter((m) => m.sender === "user").length >= 3;

  return (
    <div id="chat-container" className="flex-1 flex flex-col min-h-0 relative bg-white">
      <AnimatePresence mode="wait">
        {!showFreeform ? (
          <motion.div
            key="chat-active"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col min-h-0"
          >
            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 bg-white">
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
                    <span className="block text-[10px] opacity-60 text-right mt-1.5 font-mono">{msg.timestamp}</span>
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

            {/* Suggestions */}
            {messages.length < 5 && !isTyping && (
              <div className="px-4 py-2 bg-white border-t border-gray-100 overflow-x-auto whitespace-nowrap flex items-center gap-2 scrollbar-none">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Sugestões:</span>
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(sug.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDFFF]/g, "").trim())}
                    className="inline-flex items-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 border border-gray-200/60 hover:border-[#FF5A5F]/40 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Controls */}
            <div className="p-4 bg-white border-t border-gray-100 space-y-3">
              {isReadyToCompose && (
                <motion.button
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={triggerCompose}
                  className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] text-white font-bold py-3 px-4 rounded-xl shadow-md shadow-[#FF5A5F]/15 flex items-center justify-center gap-2 text-sm tracking-wide transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Concluir e Compor Música 🎵
                </motion.button>
              )}

              {/* Input Row: Mic + Text + Send */}
              <div className="flex items-center gap-2">
                {/* Mic button (WhatsApp style) */}
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={() => isRecording && stopRecording()}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isProcessingAudio || isTyping}
                  className={`p-3 rounded-xl transition-all duration-200 flex items-center justify-center cursor-pointer shrink-0 ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse scale-110"
                      : isProcessingAudio
                      ? "bg-gray-100 text-gray-400"
                      : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                  }`}
                  title={isRecording ? "Solte para enviar" : "Segure para gravar"}
                >
                  {isProcessingAudio ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isRecording ? (
                    <MicOff className="w-5 h-5" />
                  ) : (
                    <Mic className="w-5 h-5" />
                  )}
                </button>

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
                  placeholder={isRecording ? "🔴 Gravando áudio..." : "Digite sua mensagem..."}
                  disabled={isTyping || isRecording}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 disabled:opacity-55"
                />

                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 text-white p-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center cursor-pointer shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>

              {/* Freeform bypass link */}
              <div className="text-center pt-1">
                <button
                  onClick={() => setShowFreeform(true)}
                  className="text-[11px] text-gray-400 hover:text-gray-600 underline transition-colors"
                >
                  Prefiro escrever tudo de uma vez
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* FREEFORM VIEW */
          <motion.div
            key="chat-freeform"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto bg-white"
          >
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#FFF0F0] text-[#FF5A5F] flex items-center justify-center mx-auto border border-[#FF5A5F]/10">
                <PenTool className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-bold text-lg text-gray-900">Criação Livre</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                Conte tudo livremente: quem é a homenagem, memórias marcantes, estilo musical. Nossa IA vai compor a música perfeita!
              </p>
            </div>

            <div className="flex-1 flex flex-col min-h-[220px]">
              <textarea
                value={freeformText}
                onChange={(e) => setFreeformText(e.target.value)}
                placeholder="Exemplo: Quero uma música sertaneja romântica para minha esposa Juliana. Nos conhecemos na faculdade, temos um cachorro chamado Pipoca e fazemos 5 anos de casados..."
                className="w-full flex-1 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/15 resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={triggerCompose}
                disabled={!freeformText.trim()}
                className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 disabled:text-gray-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Criar Minha Música 🎵
              </button>

              <button
                onClick={() => setShowFreeform(false)}
                className="w-full bg-gray-50 hover:bg-gray-100 text-xs text-gray-600 font-semibold py-3 px-4 rounded-xl border border-gray-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Voltar para o Chat
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
