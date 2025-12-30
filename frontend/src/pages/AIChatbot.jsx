import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, MessageCircle, Trash2 } from 'lucide-react'
import { useAuth } from '../auth/useAuth'

export default function AIChatbot() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    {
      from: 'bot',
      text: "Hello! I'm your AI health assistant. I can help you understand your medical reports, explain biomarkers, and answer questions about your health data. How can I assist you today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Convert messages to conversation history format for API
  const getConversationHistory = () => {
    return messages.map(msg => ({
      role: msg.from === 'bot' ? 'assistant' : 'user',
      content: msg.text
    }))
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = {
      from: 'user',
      text: input.trim(),
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const token = await user.getIdToken()

      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.text,
          user_id: user.uid,
          conversation_history: getConversationHistory()
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(errorData || 'Failed to get response')
      }

      const data = await response.json()

      const botMessage = {
        from: 'bot',
        text: data.response,
        timestamp: data.timestamp
      }

      setMessages(prev => [...prev, botMessage])
    } catch (err) {
      console.error('Chat error:', err)
      setError(err.message || 'Failed to send message. Please try again.')
      
      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          from: 'bot',
          text: "I'm sorry, I encountered an error processing your request. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true
        }
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearConversation = () => {
    setMessages([
      {
        from: 'bot',
        text: "Hello! I'm your AI health assistant. I can help you understand your medical reports, explain biomarkers, and answer questions about your health data. How can I assist you today?",
        timestamp: new Date().toISOString()
      }
    ])
    setError('')
  }

  const formatTime = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return ''
    }
  }

  const suggestedQuestions = [
    "What does my vitamin D level mean?",
    "Explain my hemoglobin results",
    "What is a normal blood glucose range?",
    "How can I improve my biomarkers?",
    "What diet changes do you recommend?"
  ]

  const handleSuggestedQuestion = (question) => {
    setInput(question)
    inputRef.current?.focus()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageCircle size={28} color="#0ea5a4" />
          AI Health Assistant
        </h2>
        <button 
          onClick={clearConversation}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Trash2 size={16} />
          Clear Chat
        </button>
      </div>

      <div className="card" style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Messages Area */}
        <div 
          style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.from === 'bot' ? 'flex-start' : 'flex-end',
                gap: 10
              }}
            >
              {msg.from === 'bot' && (
                <div 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    background: 'linear-gradient(180deg, #0ea5a4, #059e95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <Bot size={20} color="#fff" />
                </div>
              )}
              
              <div style={{ maxWidth: '70%' }}>
                <div
                  style={{
                    background: msg.from === 'bot' 
                      ? (msg.isError ? '#fef2f2' : '#f8fafc')
                      : 'linear-gradient(180deg, #0ea5a4, #059e95)',
                    color: msg.from === 'bot' 
                      ? (msg.isError ? '#dc2626' : '#1e293b')
                      : '#fff',
                    padding: '12px 16px',
                    borderRadius: msg.from === 'bot' 
                      ? '4px 16px 16px 16px' 
                      : '16px 4px 16px 16px',
                    border: msg.from === 'bot' && !msg.isError ? '1px solid #e2e8f0' : 'none',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.text}
                </div>
                <div 
                  style={{ 
                    fontSize: 11, 
                    color: '#94a3b8', 
                    marginTop: 4,
                    textAlign: msg.from === 'bot' ? 'left' : 'right'
                  }}
                >
                  {formatTime(msg.timestamp)}
                </div>
              </div>

              {msg.from === 'user' && (
                <div 
                  style={{ 
                    width: 36, 
                    height: 36, 
                    borderRadius: '50%', 
                    background: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <User size={20} color="#64748b" />
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div 
                style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(180deg, #0ea5a4, #059e95)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Bot size={20} color="#fff" />
              </div>
              <div
                style={{
                  background: '#f8fafc',
                  padding: '12px 16px',
                  borderRadius: '4px 16px 16px 16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ color: '#64748b' }}>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions (show only when few messages) */}
        {messages.length <= 2 && (
          <div style={{ padding: '0 16px 12px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, marginTop: 12 }}>
              Suggested questions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedQuestion(question)}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    borderRadius: 20,
                    padding: '6px 12px',
                    fontSize: 13,
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#e2e8f0'
                    e.target.style.borderColor = '#cbd5e1'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#f1f5f9'
                    e.target.style.borderColor = '#e2e8f0'
                  }}
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ 
            padding: '8px 16px', 
            background: '#fef2f2', 
            color: '#dc2626',
            fontSize: 13,
            borderTop: '1px solid #fecaca'
          }}>
            {error}
          </div>
        )}

        {/* Input Area */}
        <div 
          style={{ 
            padding: 16, 
            borderTop: '1px solid #e2e8f0',
            background: '#fafbfc'
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your health reports, biomarkers, or get health advice..."
              className="input"
              style={{
                flex: 1,
                resize: 'none',
                minHeight: 44,
                maxHeight: 120,
                padding: '12px 16px',
                fontSize: 14,
                lineHeight: 1.4
              }}
              rows={1}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading 
                  ? 'linear-gradient(180deg, #0ea5a4, #059e95)' 
                  : '#e2e8f0',
                color: input.trim() && !loading ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 500,
                transition: 'all 0.15s ease'
              }}
            >
              {loading ? (
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <Send size={18} />
              )}
              Send
            </button>
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
            Press Enter to send • Shift + Enter for new line
          </div>
        </div>
      </div>

      {/* Inline styles for spinner animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
