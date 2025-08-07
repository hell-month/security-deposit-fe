'use client';

import { useEffect, useRef } from 'react';

interface ErrorPopupProps {
  error: string | null;
  onClose: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

export const ErrorPopup = ({ error, onClose, onRetry, showRetry = false }: ErrorPopupProps) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle click outside to dismiss popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Handle escape key to dismiss popup
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (error) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [error, onClose]);

  // Don't render if no error
  if (!error) return null;

  // Format error message for user-friendly display
  const formatErrorMessage = (errorMessage: string): string => {
    // Remove technical details and make more user-friendly
    const cleanMessage = errorMessage
      .replace(/^Error:\s*/i, '')
      .replace(/\s*\(.*?\)$/, '') // Remove parenthetical technical details
      .trim();

    // Ensure first letter is capitalized and ends with period
    const formatted = cleanMessage.charAt(0).toUpperCase() + cleanMessage.slice(1);
    return formatted.endsWith('.') ? formatted : `${formatted}.`;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div 
        ref={modalRef}
        className="bg-gray-800/95 backdrop-blur-sm border border-gray-600/40 rounded-2xl shadow-2xl max-w-md w-full mx-6 transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4"
        style={{
          padding: `12px`,
          display: 'flex',
          flexDirection: `column`,
          gap: `8px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-600/30">
          <div className="flex items-center space-x-4">
            <div>
              <h3 
                id="error-title" 
                className="text-lg font-bold text-white"
              >
                Transaction Failed
              </h3>
            </div>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-gray-700/50 cursor-pointer"
            aria-label="Close error dialog"
          >
            <svg 
              className="h-5 w-5" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8" style={{
              display: `flex`,
                  flexDirection: `column`,
                  gap: `8px`,
        }}>
          <div className="rounded-xl p-6 mb-8">
            <p 
              id="error-description"
              className="text-gray-200 text-sm leading-relaxed"
            >
              {formatErrorMessage(error)}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex space-x-4">
            {showRetry && onRetry && (
              <button
                onClick={() => {
                  onRetry();
                  onClose();
                }}
                className="flex-1 py-4 px-6 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
              >
                Try Again
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-4 px-6 bg-gray-700 text-white rounded-xl font-semibold hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};