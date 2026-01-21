'use client';

import { CheckCircle, MessageSquare, Bot } from 'lucide-react';

interface ConversationTypeSelectorProps {
  onSelect: (type: 'support' | 'ai') => void;
  onCancel?: () => void;
}

export default function ConversationTypeSelector({ onSelect, onCancel }: ConversationTypeSelectorProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-center mb-6">
        <img 
          src="/tulsi-logo.png" 
          alt="Tulsi AI Support Agent" 
          className="h-12 w-auto"
        />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Start New Conversation
      </h3>
      <p className="text-sm text-gray-600 mb-6">
        Choose how you'd like to get help:
      </p>
      
      <div className="space-y-3">
        {/* Support Agent Option */}
        <button
          onClick={() => onSelect('support')}
          className="w-full flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
            <MessageSquare className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              Talk With Support Agent
              <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-gray-600">
              Get personalized help from our support team for account issues, billing, technical problems, and more.
            </p>
          </div>
        </button>

        {/* AI Agent Option */}
        <button
          onClick={() => onSelect('ai')}
          className="w-full flex items-start gap-4 p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all group"
        >
          <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200">
            <Bot className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1 text-left">
            <div className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
              Talk With AI Agent
              <CheckCircle className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm text-gray-600">
              Query your POS data using natural language. Get instant insights about sales, inventory, customers, and more.
            </p>
          </div>
        </button>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}