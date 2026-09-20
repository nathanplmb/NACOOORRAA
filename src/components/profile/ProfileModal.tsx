import React from "react";
import { X } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit?: (e: React.FormEvent) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onSubmit,
  submitLabel = "Enregistrer",
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#060812]/85 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl glass-modal overflow-hidden my-auto max-h-[88vh] flex flex-col before:absolute before:top-0 before:left-0 before:right-0 before:h-[1.5px] before:bg-gradient-to-r before:from-transparent before:via-white/35 before:to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02] shrink-0">
          <div>
            <h3 className="text-base font-bold text-[#F5F6FA] font-display">{title}</h3>
            {subtitle && <p className="text-xs text-[#9AA0B2] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form or Body */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (onSubmit) onSubmit(e);
          }}
          className="flex flex-col min-h-0 flex-1 overflow-hidden"
        >
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">
            {children}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-white/[0.02] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#9AA0B2] hover:text-[#F5F6FA] hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              Annuler
            </button>
            {onSubmit && (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#D81A45] to-[#FF1A55] rounded-xl hover:shadow-[0_0_16px_rgba(216,26,69,0.4)] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Enregistrement..." : submitLabel}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
