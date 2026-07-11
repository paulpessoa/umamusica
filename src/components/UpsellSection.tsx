import React, { useState, useRef } from "react";
import { Upload, X, Film, Check, Shield, Image as ImageIcon, Sparkles, RefreshCw, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface UpsellSectionProps {
  orderId: string;
  isPaid: boolean;
  onUpsellCompleted: () => void;
  audioIsPlaying?: boolean;
  audioCurrentTime?: number;
}

export default function UpsellSection({ 
  orderId, 
  isPaid, 
  onUpsellCompleted,
  audioIsPlaying,
  audioCurrentTime = 0,
}: UpsellSectionProps) {
  const [images, setImages] = useState<{ id: string; url: string }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isPlayingSlideshow, setIsPlayingSlideshow] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slideshowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const newImages: { id: string; url: string }[] = [];
    
    // Limit to 10 total images
    const slotsLeft = 10 - images.length;
    const limit = Math.min(fileList.length, slotsLeft);

    for (let i = 0; i < limit; i++) {
      const file = fileList[i];
      if (file.type.startsWith("image/")) {
        const url = URL.createObjectURL(file);
        newImages.push({
          id: Math.random().toString(36).substr(2, 9),
          url
        });
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const filtered = prev.filter((img) => img.id !== id);
      // Clean up object URLs to prevent memory leaks
      const removed = prev.find((img) => img.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return filtered;
    });
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleBuyUpsell = () => {
    setShowPayment(true);
  };

  const handleSimulatePayment = async () => {
    setIsProcessingPayment(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/upsell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setTimeout(() => {
          setIsProcessingPayment(false);
          setShowPayment(false);
          onUpsellCompleted();
          startSlideshow();
        }, 1500);
      }
    } catch (e) {
      console.error("Upsell purchase failed", e);
      setIsProcessingPayment(false);
    }
  };

  // Slideshow Player simulator
  const startSlideshow = () => {
    if (images.length === 0) return;
    setIsPlayingSlideshow(true);
    setCurrentSlideIndex(0);

    if (slideshowTimerRef.current) clearInterval(slideshowTimerRef.current);
    
    slideshowTimerRef.current = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % images.length);
    }, 3000); // 3 seconds per slide
  };

  const stopSlideshow = () => {
    setIsPlayingSlideshow(false);
    if (slideshowTimerRef.current) {
      clearInterval(slideshowTimerRef.current);
      slideshowTimerRef.current = null;
    }
  };

  // Sync slideshow index with the active playing audio
  React.useEffect(() => {
    if (audioIsPlaying && images.length > 0) {
      const slideDuration = 3.5; // 3.5 seconds per slide
      const index = Math.floor(audioCurrentTime / slideDuration) % images.length;
      setCurrentSlideIndex(index);
      setIsPlayingSlideshow(true);
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
        slideshowTimerRef.current = null;
      }
    } else if (!audioIsPlaying && !slideshowTimerRef.current) {
      setIsPlayingSlideshow(false);
    }
  }, [audioIsPlaying, audioCurrentTime, images.length]);

  // Clean up timers on unmount
  React.useEffect(() => {
    return () => {
      if (slideshowTimerRef.current) {
        clearInterval(slideshowTimerRef.current);
      }
    };
  }, []);

  return (
    <div id="upsell-container-card" className="bg-white border border-gray-100 rounded-3xl p-6 space-y-5 shadow-sm relative overflow-hidden">
      
      {/* Visual Accent Top Right */}
      <div className="absolute -top-12 -right-12 w-28 h-28 bg-[#FFF0F0] rounded-full blur-2xl pointer-events-none"></div>

      {/* Main Header Pitch */}
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FFF0F0] text-[#FF5A5F] flex items-center justify-center shrink-0 border border-[#FF5A5F]/10">
          <Film className="w-6 h-6 animate-pulse" />
        </div>
        <div className="space-y-1">
          <h3 className="font-bold text-gray-900 text-sm leading-snug">
            Transformar essa música em um vídeo com fotos? 📸
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Nós montamos um clipe emocionante com sincronização automática de fotos. Perfeito para postar no TikTok, Reels ou enviar no WhatsApp!
          </p>
        </div>
      </div>

      {!isPaid ? (
        /* PURCHASE FLOW */
        <div className="space-y-4 pt-1">
          {/* File Dropzone Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerUpload}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-[#FF5A5F] bg-[#FFF0F0]"
                : "border-gray-200 hover:border-gray-300 bg-gray-50/50 hover:bg-gray-50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              multiple
              className="hidden"
            />
            <div className="flex flex-col items-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-white text-gray-400 flex items-center justify-center border border-gray-100">
                <Upload className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">
                  Arraste ou clique para enviar fotos
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Selecione até 10 fotos marcantes (Formatos JPG, PNG)
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Photos Grid */}
          {images.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Fotos adicionadas ({images.length}/10)
                </span>
                <button
                  onClick={() => setImages([])}
                  className="text-[10px] text-[#FF5A5F] hover:underline font-bold"
                >
                  Limpar tudo
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 max-h-[140px] overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                {images.map((img) => (
                  <div key={img.id} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-white group">
                    <img src={img.url} alt="Uploaded preview" className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-[#FF5A5F] hover:text-white text-white p-0.5 rounded-full transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Box & Buy Action (Disabled - Coming Soon) */}
          <div className="bg-gray-50 border border-gray-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[9px] bg-amber-500/10 text-amber-600 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block">
                Em breve ⚡
              </span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Geração de Clipe IA</span>
              <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                A sincronização de fotos com o ritmo da música está em homologação.
              </p>
            </div>
            <button
              disabled={true}
              className="bg-gray-100 text-gray-400 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-none cursor-not-allowed transition-all duration-200 w-full sm:w-auto justify-center"
            >
              <Film className="w-3.5 h-3.5 text-gray-400" />
              Indisponível (Em Breve)
            </button>
          </div>
        </div>
      ) : (
        /* COMPLETED VIDEO SLIDESHOW PREVIEW */
        <div className="space-y-4 pt-1">
          {images.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-video bg-gray-950 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center group">
                {/* Active photo transition frame */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentSlideIndex}
                    src={images[currentSlideIndex].url}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                </AnimatePresence>

                {/* Video Play HUD overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 flex flex-col justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] bg-[#FF5A5F] text-white font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 animate-spin" />
                      Clipe IA Gerado
                    </span>
                    <span className="text-xs font-mono text-white/90">
                      Slide {currentSlideIndex + 1}/{images.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-center">
                    <button
                      onClick={isPlayingSlideshow ? stopSlideshow : startSlideshow}
                      className="w-11 h-11 bg-white hover:bg-gray-100 text-gray-900 rounded-full flex items-center justify-center shadow-md transform transition active:scale-95 cursor-pointer"
                    >
                      {isPlayingSlideshow ? <Pause className="w-5 h-5 fill-gray-900" /> : <Play className="w-5 h-5 fill-gray-900 ml-0.5" />}
                    </button>
                  </div>

                  <div className="text-[10px] text-gray-200 font-mono text-center">
                    Sincronizado automaticamente com o ritmo da música
                  </div>
                </div>

                {!isPlayingSlideshow && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button
                      onClick={startSlideshow}
                      className="w-12 h-12 bg-[#FF5A5F] text-white rounded-full flex items-center justify-center shadow-md cursor-pointer transform hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={isPlayingSlideshow ? stopSlideshow : startSlideshow}
                  className="flex-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-colors font-semibold"
                >
                  {isPlayingSlideshow ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {isPlayingSlideshow ? "Pausar Clipe" : "Reproduzir Clipe"}
                </button>
                <button
                  onClick={() => alert("Seu vídeo clipe final está sendo baixado em alta resolução!")}
                  className="bg-[#FF5A5F] hover:bg-[#e04f53] text-white text-xs px-5 py-3 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Baixar Clipe MP4
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-400">Nenhuma foto carregada para o clipe.</p>
              <button onClick={() => {}} className="text-[#FF5A5F] text-xs font-semibold hover:underline mt-2 block mx-auto">Adicionar fotos agora</button>
            </div>
          )}
        </div>
      )}

      {/* PIX POPUP OVERLAY */}
      <AnimatePresence>
        {showPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col justify-center p-6 space-y-4"
          >
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-[#FFF0F0] text-[#FF5A5F] flex items-center justify-center mx-auto border border-[#FF5A5F]/10">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <h4 className="font-extrabold text-gray-900 text-sm">Checkout Clipe Premium</h4>
              <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                Para liberar a geração automática do seu vídeo clipe com as {images.length} fotos, confirme o Pix de R$ 9,90.
              </p>
            </div>

            {/* Fake QR code representation */}
            <div className="bg-white p-2 w-32 h-32 mx-auto rounded-xl border border-gray-100 shadow-sm flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=unamusica-upsell-payment-9.90-order-${orderId}`}
                alt="Pix Upsell QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleSimulatePayment}
                disabled={isProcessingPayment}
                className="w-full bg-[#FF5A5F] hover:bg-[#e04f53] disabled:bg-gray-100 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                {isProcessingPayment ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Confirmar Simulação Pix (+ R$ 9,90) ⚡
              </button>
              <button
                onClick={() => setShowPayment(false)}
                disabled={isProcessingPayment}
                className="w-full bg-transparent hover:bg-gray-50 text-gray-400 text-[10px] py-1.5 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
