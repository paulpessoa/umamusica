import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react"; // Vite React Motion might use motion/react or motion depending on version. The package.json lists "motion": "^12.23.24" which provides export to both, let's use "motion"
import { Cookie, Check } from "lucide-react";

// Dynamic script loader for Microsoft Clarity
const loadClarity = () => {
  if ((window as any).clarity) return; // Already loaded
  (function(c, l, a, r, i, t, y) {
    (c as any)[a] = (c as any)[a] || function() {
      ((c as any)[a].q = (c as any)[a].q || []).push(arguments);
    };
    t = l.createElement(r) as any;
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", "xlilxbgkzc");
};

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("umamusica_cookie_consent");
    if (!consent) {
      // Delay presentation slightly for better user flow
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else if (consent === "accepted") {
      loadClarity();
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("umamusica_cookie_consent", "accepted");
    loadClarity();
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("umamusica_cookie_consent", "declined");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:right-auto md:left-4 md:max-w-md z-50"
        >
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-2xl p-5 md:p-6 flex flex-col gap-4 relative overflow-hidden">
            {/* Background Accent Gradient */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#FF5A5F] via-[#FF7E82] to-[#FF5A5F]" />
            
            <div className="flex gap-3 items-start">
              <div className="bg-[#FFF4F2] dark:bg-[#e04f53]/10 p-2.5 rounded-xl text-[#FF5A5F] dark:text-[#FF7E82] shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base flex items-center gap-1.5">
                  Valorizamos sua privacidade
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  Usamos cookies essenciais para manter sua sessão conectada e cookies de análise (Microsoft Clarity) para entender como você interage com o site e melhorar sua experiência.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-1 border-t border-gray-100 dark:border-gray-800/60">
              <a
                href="/privacidade"
                className="text-xs text-[#FF5A5F] dark:text-[#FF7E82] hover:underline font-medium"
              >
                Política de Privacidade
              </a>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleDecline}
                  className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  Recusar
                </button>
                <button
                  onClick={handleAccept}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#FF5A5F] to-[#e04f53] hover:from-[#e04f53] hover:to-[#FF5A5F] shadow-md shadow-[#FF5A5F]/10 active:scale-[0.98] rounded-xl transition-all flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  Aceitar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
