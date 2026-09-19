import React, { useEffect, useState } from "react";
import { X, Sparkles, AlertCircle } from "lucide-react";

// 1. Unified Badge Component with Liquid Glass Pill Refraction & exact palette
interface BadgeProps {
  children: React.ReactNode;
  variant?: "brand" | "crimson" | "blue" | "green" | "purple" | "amber" | "gray" | "error";
  onClick?: () => void;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = "blue", 
  onClick,
  className = "" 
}) => {
  const baseStyle = "glass-pill inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium select-none transition-spring";
  const hoverStyle = onClick ? "cursor-pointer hover:scale-105 active:scale-95" : "";
  
  const colors = {
    // Crimson NACORA: reserved for active/brand items
    brand: "bg-[rgba(216,26,69,0.18)] text-[#ff6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]",
    crimson: "bg-[rgba(216,26,69,0.18)] text-[#ff6685] border-[rgba(216,26,69,0.35)] shadow-[0_0_12px_rgba(216,26,69,0.2)]",
    // Soft Blue
    blue: "bg-[rgba(14,165,233,0.12)] text-[#38bdf8] border-[rgba(14,165,233,0.25)]",
    // Success Green (#12B76A)
    green: "bg-[rgba(18,183,106,0.14)] text-[#12B76A] border-[rgba(18,183,106,0.28)]",
    // Purple AI
    purple: "bg-[rgba(147,51,234,0.14)] text-[#c084fc] border-[rgba(147,51,234,0.28)]",
    // Amber Warning (#F79009)
    amber: "bg-[rgba(247,144,9,0.14)] text-[#f79009] border-[rgba(247,144,9,0.28)]",
    // Secondary Gray (#9AA0B2)
    gray: "bg-[rgba(255,255,255,0.06)] text-[#9AA0B2] border-[rgba(255,255,255,0.12)]",
    // Destructive Error (#F04438)
    error: "bg-[rgba(240,68,56,0.14)] text-[#f04438] border-[rgba(240,68,56,0.28)]"
  };

  return (
    <span 
      onClick={onClick} 
      className={`${baseStyle} ${colors[variant]} ${hoverStyle} ${className}`}
      style={{ whiteSpace: "nowrap" }}
    >
      {variant === "purple" && <Sparkles className="w-3.5 h-3.5 text-[#c084fc]" />}
      {children}
    </span>
  );
};

// 2. Standard GlassCard with Liquid Glass Refraction & micro-interactions
interface GlassCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  hoverable?: boolean;
  className?: string;
  id?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  onClick, 
  hoverable = true, 
  className = "",
  id
}) => {
  const cardStyle = `
    ${hoverable ? "glass-card-interactive" : "glass-card-static"}
    p-5 
    ${onClick ? "cursor-pointer" : ""} 
    ${className}
  `.trim();

  return (
    <div id={id} onClick={onClick} className={cardStyle}>
      {children}
    </div>
  );
};

// 3. Centralized Button conforming strictly to Liquid Glass Design System
interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "ai" | "danger";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = "secondary",
  size = "md",
  icon,
  className = "",
  ...props
}) => {
  const baseStyle = "select-none cursor-pointer focus:outline-none transition-all flex items-center justify-center shrink-0";
  
  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-xl font-medium",
    md: "h-9 px-3.5 text-xs gap-2 rounded-xl font-semibold",
    lg: "h-10 px-5 text-sm gap-2.5 rounded-xl font-bold"
  };

  const styles = {
    // Crimson Red Primary CTA (#D81A45 with visionOS gradient and glow)
    primary: "glass-btn-primary",
    // Translucent glass secondary
    secondary: "glass-btn-secondary",
    // Transparent ghost with subtle glass hover
    ghost: "bg-white/[0.04] hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/10 rounded-xl",
    // Violet/Purple AI button
    ai: "bg-gradient-to-r from-purple-900/30 to-rose-900/30 hover:from-purple-900/45 hover:to-rose-900/45 text-purple-200 hover:text-white border border-purple-500/30 shadow-[0_4px_16px_rgba(147,51,234,0.22)] rounded-xl",
    // Destructive Danger
    danger: "bg-[rgba(240,68,56,0.14)] hover:bg-[rgba(240,68,56,0.22)] text-[#F04438] hover:text-white border border-[rgba(240,68,56,0.3)] rounded-xl"
  };

  return (
    <button 
      className={`${baseStyle} ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="flex items-center justify-center shrink-0">{icon}</span>}
      <span className="whitespace-nowrap">{children}</span>
    </button>
  );
};

// 4. Liquid Glass Modal overlay with high blur factor and proper depth
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "md" | "lg" | "xl" | "detail" | "fullscreen";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title = "",
  children,
  size = "lg"
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    md: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    detail: "max-w-5xl",
    fullscreen: "max-w-[95vw] h-[90vh]"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Heavy Blur Background Overlay */}
      <div 
        className="fixed inset-0 bg-[#060812]/80 backdrop-blur-2xl transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal Container with Liquid Glass Panel */}
      <div className={`relative w-full ${sizeClasses[size]} glass-modal flex flex-col overflow-hidden transition-spring z-10 shadow-[0_25px_60px_-10px_rgba(0,0,0,0.85)]`}>
        {/* Header - only rendered if title provided */}
        {title ? (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
            <h3 className="text-base font-bold text-[#F5F6FA] flex items-center gap-2.5 select-none font-display">
              {title}
            </h3>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] border border-white/5 transition-spring cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : null}

        {/* Content */}
        <div className={`flex-1 overflow-y-auto ${size === "detail" ? "p-5 sm:p-7 max-h-none" : "p-6 max-h-[78vh]"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

// 5. Toast notification singleton/state wrapper
export interface ToastInfo {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "ai";
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastInfo[]>([]);

  const showToast = (message: string, type: ToastInfo["type"] = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, showToast, removeToast };
};

export const ToastContainer: React.FC<{ toasts: ToastInfo[], onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        const types = {
          success: "bg-emerald-950/80 border-emerald-500/30 text-emerald-300",
          error: "bg-rose-950/80 border-rose-500/30 text-rose-300",
          info: "bg-[#0a0d18]/90 border-white/15 text-[#F5F6FA]",
          ai: "bg-purple-950/90 border-purple-500/30 text-purple-200"
        };

        const iconColor = {
          success: "text-[#12B76A]",
          error: "text-[#F04438]",
          info: "text-[#0EA5E9]",
          ai: "text-[#c084fc]"
        };

        return (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl ${types[toast.type]} shadow-[0_15px_35px_rgba(0,0,0,0.5)] transition-spring`}
          >
            {toast.type === "ai" ? (
              <Sparkles className="w-5 h-5 flex-shrink-0 text-purple-400 animate-pulse" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#F04438]" />
            ) : (
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 bg-current ${iconColor[toast.type]}`} />
            )}
            
            <div className="flex-1 text-xs font-medium">
              {toast.message}
            </div>

            <button 
              onClick={() => onDismiss(toast.id)}
              className="p-1 rounded hover:bg-white/10 text-[#9AA0B2] hover:text-[#F5F6FA] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export interface ToastProps {
  isOpen: boolean;
  message: string;
  type: "success" | "error" | "info" | "ai";
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ isOpen, message, type, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, message, onClose]);

  if (!isOpen) return null;

  const types = {
    success: "bg-[#062817]/90 border-[#12B76A]/40 text-emerald-200",
    error: "bg-[#2d080e]/90 border-[#F04438]/40 text-rose-200",
    info: "bg-[#0a0d18]/90 border-white/15 text-[#F5F6FA]",
    ai: "bg-[#1f0b38]/90 border-purple-500/40 text-purple-200"
  };

  const iconColor = {
    success: "text-[#12B76A]",
    error: "text-[#F04438]",
    info: "text-[#0EA5E9]",
    ai: "text-[#c084fc]"
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 p-1 max-w-sm w-full rounded-2xl border border-white/15 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] transition-all duration-300 bg-[#060812]/85 text-[#F5F6FA]">
      <div className={`pointer-events-auto flex items-start gap-3 p-3.5 w-full ${types[type]} rounded-xl border`}>
        {type === "ai" ? (
          <Sparkles className="w-4 h-4 flex-shrink-0 text-[#c084fc] animate-pulse mt-0.5" />
        ) : type === "error" ? (
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#F04438] mt-0.5" />
        ) : (
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-current ${iconColor[type]}`} />
        )}
        
        <div className="flex-1 text-xs font-medium pr-2">
          {message}
        </div>

        <button 
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-[#9AA0B2] hover:text-white cursor-pointer flex-shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
