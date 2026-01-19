AttachementPreview.tsx




import React from 'react';
import { 
  DocumentTextIcon, 
  DocumentIcon, 
  PhotoIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

export interface Attachment {
  id: string;
  file_name: string;
  file_type: 'image' | 'document' | 'pdf' | 'spreadsheet' | 'archive' | 'other';
  file_size: number;
  file_url: string;
  mime_type: string;
  uploaded_at: string;
}

interface AttachmentPreviewProps {
  attachments: Attachment[];
  onRemove?: (attachmentId: string) => void;
  onDownload?: (attachment: Attachment) => void;
  showActions?: boolean;
  layout?: 'grid' | 'list';
  className?: string;
}

export default function AttachmentPreview({
  attachments,
  onRemove,
  onDownload,
  showActions = true,
  layout = 'list',
  className = '',
}: AttachmentPreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <PhotoIcon className="h-5 w-5" />;
      case 'pdf':
        return <DocumentTextIcon className="h-5 w-5" />;
      case 'document':
      case 'spreadsheet':
        return <DocumentIcon className="h-5 w-5" />;
      default:
        return <DocumentIcon className="h-5 w-5" />;
    }
  };

  const handleDownload = (attachment: Attachment) => {
    if (onDownload) {
      onDownload(attachment);
    } else {
      // Default download behavior
      window.open(attachment.file_url, '_blank');
    }
  };

  if (attachments.length === 0) return null;

  if (layout === 'grid') {
    return (
      <div className={`grid grid-cols-2 gap-2 ${className}`}>
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="relative group rounded-lg border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors"
          >
            {attachment.file_type === 'image' ? (
              <div className="aspect-square relative">
                <img
                  src={attachment.file_url}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                />
                {showActions && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handleDownload(attachment)}
                      className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                    </button>
                    {onRemove && (
                      <button
                        onClick={() => onRemove(attachment.id)}
                        className="p-2 bg-white rounded-full text-red-600 hover:bg-red-50"
                        title="Remove"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3">
                <div className="flex items-center space-x-2">
                  <div className="text-gray-400">
                    {getFileIcon(attachment.file_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(attachment.file_size)}
                    </p>
                  </div>
                  {showActions && (
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleDownload(attachment)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      {onRemove && (
                        <button
                          onClick={() => onRemove(attachment.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Remove"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // List layout
  return (
    <div className={`space-y-2 ${className}`}>
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center space-x-3 p-2 rounded-lg border border-white/20 hover:border-white/40 transition-colors bg-white/10 backdrop-blur-sm"
        >
          {attachment.file_type === 'image' ? (
            <img
              src={attachment.file_url}
              alt={attachment.file_name}
              className="h-12 w-12 rounded object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded bg-white/20 flex items-center justify-center flex-shrink-0 text-current">
              {getFileIcon(attachment.file_type)}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {attachment.file_name}
            </p>
            <p className="text-xs opacity-70">
              {formatFileSize(attachment.file_size)}
            </p>
          </div>

          {showActions && (
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button
                onClick={() => handleDownload(attachment)}
                className="p-1.5 hover:bg-white/20 rounded transition-colors"
                title="Download"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
              </button>
              {onRemove && (
                <button
                  onClick={() => onRemove(attachment.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-white/20 rounded transition-colors"
                  title="Remove"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}