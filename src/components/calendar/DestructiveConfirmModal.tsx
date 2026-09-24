import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DestructiveConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  itemName?: string;
  itemType?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DestructiveConfirmModal: React.FC<DestructiveConfirmModalProps> = ({
  isOpen,
  title,
  description,
  itemName,
  itemType,
  confirmLabel = "Confirmer la suppression",
  cancelLabel = "Annuler",
  isProcessing = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="glass-panel relative w-full max-w-md overflow-hidden rounded-3xl p-6 sm:p-7 space-y-5 border border-red-500/20 bg-[#0B0F19]/95 shadow-[0_0_50px_rgba(216,26,69,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Close */}
        <div className="flex items-start justify-between">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-[#FF6685] shadow-[0_0_20px_rgba(216,26,69,0.2)]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="p-1.5 rounded-xl text-[#9AA0B2] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white font-display tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-[#9AA0B2] leading-relaxed">
            {description}
          </p>

          {itemName && (
            <div className="mt-3 p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs">
              <span className="text-[10px] text-[#9AA0B2] uppercase font-bold tracking-wider block mb-0.5">
                {itemType || "Élément ciblé"}
              </span>
              <span className="font-semibold text-white truncate block">
                {itemName}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-semibold text-[#9AA0B2] hover:text-white transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D81A45] to-[#FF6685] hover:opacity-95 text-xs font-bold text-white shadow-[0_4px_16px_rgba(216,26,69,0.4)] transition-all cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isProcessing ? "Suppression en cours..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
