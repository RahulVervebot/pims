AttachementButton.tsx:

import React, { useRef, useState } from 'react';
import { PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface AttachmentFile {
  file: File;
  preview?: string;
  id: string;
}

interface AttachmentButtonProps {
  onFileSelect: (files: AttachmentFile[]) => void;
  disabled?: boolean;
  maxSizeMB?: number;
  allowedTypes?: string[];
  multiple?: boolean;
  className?: string;
}

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif',
  'pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'csv',
  'zip', 'rar'
];

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif'];

export default function AttachmentButton({
  onFileSelect,
  disabled = false,
  maxSizeMB = 10,
  allowedTypes = ALLOWED_EXTENSIONS,
  multiple = true,
  className = '',
}: AttachmentButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedTypes.includes(extension)) {
      return `File type .${extension} is not supported. Allowed types: ${allowedTypes.join(', ')}`;
    }

    // Check file size
    const isImage = IMAGE_EXTENSIONS.includes(extension);
    const maxSize = isImage ? 5 * 1024 * 1024 : maxSizeMB * 1024 * 1024; // 5MB for images, 10MB for others
    
    if (file.size > maxSize) {
      return `File size exceeds ${isImage ? '5MB' : maxSizeMB + 'MB'} limit`;
    }

    // Check for dangerous patterns in filename
    const dangerousPatterns = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '..', '../'];
    if (dangerousPatterns.some(pattern => file.name.toLowerCase().includes(pattern))) {
      return 'File name contains dangerous patterns';
    }

    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    const validFiles: AttachmentFile[] = [];

    for (const file of files) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        continue;
      }

      const attachmentFile: AttachmentFile = {
        file,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      // Generate preview for images
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension && IMAGE_EXTENSIONS.includes(extension)) {
        try {
          const preview = await readFileAsDataURL(file);
          attachmentFile.preview = preview;
        } catch (error) {
          console.error('Failed to generate preview:', error);
        }
      }

      validFiles.push(attachmentFile);
    }

    if (validFiles.length > 0) {
      onFileSelect(validFiles);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const acceptedTypes = allowedTypes.map(ext => `.${ext}`).join(',');

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={disabled}
        className={`p-2 rounded-lg transition-colors ${
          disabled
            ? 'text-gray-300 cursor-not-allowed'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
        } ${className}`}
        aria-label="Attach file"
        title="Attach file"
      >
        <PaperClipIcon className="h-5 w-5" />
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept={acceptedTypes}
        multiple={multiple}
        className="hidden"
      />

      {error && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-red-50 border border-red-200 rounded-lg shadow-lg z-10">
          <div className="flex items-start justify-between">
            <p className="text-xs text-red-600 pr-2">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}