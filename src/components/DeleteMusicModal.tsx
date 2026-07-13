import React, { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DeleteMusicModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (reasonCategory: string, reasonDetails: string) => Promise<void>;
    songTitle?: string;
    isLoading?: boolean;
}

const DELETE_REASONS = [
    { value: "not_satisfied", label: "Não gostei da música/letra" },
    { value: "audio_quality", label: "Qualidade do áudio ruim" },
    { value: "payment_issue", label: "Problema com o pagamento" },
    { value: "new_version", label: "Vou criar uma nova versão" },
    { value: "no_longer_needed", label: "Não preciso mais" },
    { value: "other", label: "Outro motivo" }
];

export default function DeleteMusicModal({
    isOpen,
    onClose,
    onConfirm,
    songTitle = "Música",
    isLoading = false
}: DeleteMusicModalProps) {
    const [selectedReason, setSelectedReason] = useState("");
    const [additionalDetails, setAdditionalDetails] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        if (!selectedReason) {
            setError("Por favor, selecione um motivo");
            return;
        }

        try {
            await onConfirm(selectedReason, additionalDetails);
            // Reset form
            setSelectedReason("");
            setAdditionalDetails("");
            setError(null);
            onClose();
        } catch (err: any) {
            setError(err.message || "Erro ao deletar música");
        }
    };

    if (!isOpen) return null;

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
                        className="bg-white rounded-3xl p-6 w-full sm:max-w-md shadow-2xl space-y-4"
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center text-red-500 shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-900 text-sm">
                                        Aviso importante!
                                    </h2>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Esta ação é irreversível
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
                                Ao excluir <span className="font-semibold">"{songTitle}"</span>, ela será removida
                                permanentemente da sua biblioteca e não poderá ser recuperada.
                            </p>
                        </div>

                        {/* Reason Selection */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold tracking-wider text-gray-600">
                                Por que você quer deletar?
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
                        {selectedReason === "other" && (
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
                                    value={additionalDetails}
                                    onChange={(e) => setAdditionalDetails(e.target.value)}
                                    disabled={isLoading}
                                    placeholder="Conte-nos o que podemos melhorar..."
                                    rows={3}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-all resize-none"
                                />
                            </motion.div>
                        )}

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
                                disabled={isLoading || !selectedReason}
                                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors"
                            >
                                {isLoading ? "Deletando..." : "Deletar Permanentemente"}
                            </button>
                        </div>

                        {/* Info */}
                        <p className="text-[10px] text-gray-500 text-center pt-1">
                            Seus dados de feedback nos ajudam a melhorar.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
