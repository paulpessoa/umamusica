import React, { useState } from "react";
import { AlertCircle, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, details: string, email: string) => Promise<void>;
  userEmail: string;
  isLoading?: boolean;
}

const DELETE_REASONS = [
  { value: "nao_uso", label: "Não vou usar mais o app" },
  { value: "privacidade", label: "Preocupação com privacidade dos meus dados" },
  { value: "qualidade", label: "Insatisfação com a qualidade" },
  { value: "notificacoes", label: "Muitos e-mails / notificações" },
  { value: "outro", label: "Outro motivo" }
];

export default function DeleteAccountModal({
  isOpen,
  onClose,
  onConfirm,
  userEmail,
  isLoading = false
}: DeleteAccountModalProps) {
  const [emailConfirm, setEmailConfirm] = useState("");
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const emailMatches =
    emailConfirm.trim().toLowerCase() === userEmail.trim().toLowerCase();

  const handleConfirm = async () => {
    if (!emailMatches) {
      setError("O e-mail digitado não confere com sua conta.");
      return;
    }
    if (!selectedReason) {
      setError("Selecione um motivo para continuar.");
      return;
    }
    try {
      await onConfirm(selectedReason, details, emailConfirm.trim());
    } catch (err: any) {
      setError(err.message || "Erro ao excluir a conta.");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isLoading) onClose();
          }}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-3xl p-6 w-full sm:max-w-md shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">
                    Excluir minha conta
                  </h2>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Esta ação é irreversível após 30 dias
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isLoading}
                className="p-1 -mr-2 -mt-1 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-3.5 text-xs text-red-700 space-y-1">
              <p className="leading-relaxed">
                Sua conta entrará em uma lixeira virtual por{" "}
                <strong>30 dias</strong>. Se você não fizer login novamente
                nesse período, a conta e todos os seus dados e músicas criadas
                serão excluídos permanentemente.
              </p>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-wider text-gray-600">
                Por que você quer excluir?
              </label>
              <div className="space-y-2">
                {DELETE_REASONS.map((reason) => (
                  <label
                    key={reason.value}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#FF5A5F]/30 hover:bg-[#FFF4F2]/50 cursor-pointer transition-all"
                  >
                    <input
                      type="radio"
                      name="delete_reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => {
                        setSelectedReason(e.target.value);
                        setError(null);
                      }}
                      disabled={isLoading}
                      className="w-4 h-4 text-[#FF5A5F] cursor-pointer"
                    />
                    <span className="text-xs text-gray-700 font-medium flex-1">
                      {reason.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            {selectedReason === "outro" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                  Detalhes adicionais (opcional)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  disabled={isLoading}
                  placeholder="Conte-nos o que podemos melhorar..."
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all resize-none"
                />
              </motion.div>
            )}

            {/* Email confirmation */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold tracking-wider text-gray-600">
                Confirme digitando seu e-mail
              </label>
              <input
                type="email"
                value={emailConfirm}
                onChange={(e) => {
                  setEmailConfirm(e.target.value);
                  setError(null);
                }}
                placeholder={userEmail}
                disabled={isLoading}
                className={`w-full bg-gray-50 border rounded-xl px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 ${
                  emailConfirm && !emailMatches
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-[#FF5A5F]"
                }`}
              />
              {emailConfirm && !emailMatches && (
                <p className="text-[10px] text-red-500">
                  O e-mail não confere com sua conta.
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || !emailMatches || !selectedReason}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  "Excluindo..."
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir Conta
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
