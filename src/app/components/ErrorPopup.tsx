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
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div 
        ref={modalRef}
        className="bg-gray-900 border-2 border-red-500 rounded-lg shadow-2xl max-w-md w-full mx-4 transform transition-all duration-200 ease-out"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            {/* Error icon */}
            <div className="flex-shrink-0">
              <svg 
                className="h-6 w-6 text-red-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                />
              </svg>
            </div>
            <h3 
              id="error-title" 
              className="text-lg font-medium text-white"
            >
              Transaction Error
            </h3>
          </div>
          
          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-800"
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
        <div className="p-6">
          <p 
            id="error-description"
            className="text-gray-300 text-sm leading-relaxed mb-6"
          >
            {formatErrorMessage(error)}
          </p>

          {/* Action buttons */}
          <div className="flex space-x-3">
            {showRetry && onRetry && (
              <button
                onClick={() => {
                  onRetry();
                  onClose();
                }}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                Retry
              </button>
            )}
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};