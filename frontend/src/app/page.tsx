"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Plus, FileText, Settings, HelpCircle, 
  Share2, ChevronRight, Send, Paperclip, MoreVertical, 
  Maximize2, X, ExternalLink, Loader2, Info, Database,
  CheckCircle2, AlertCircle
} from 'lucide-react';
// Import React Markdown
import ReactMarkdown from 'react-markdown';

// --- Types for Backend Integration ---
interface Citation {
  filename: string;
  content: string;
  similarity: number; 
}

interface ChatMessage {
  role: 'user' | 'ai' | 'assistant'; 
  content: string;
  citations?: Citation[];
}

interface ChatSession {
  id: string;
  title: string;
}

export default function SecureBrainDashboard() {
  // --- UI State ---
  const [activeDoc, setActiveDoc] = useState<{title: string, content: string, fileUrl?: string} | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'chat' | 'documents'>('chat');
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({});
  const [dbFiles, setDbFiles] = useState<string[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  
  // NEW: State to track if history is currently loading
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  // --- Refs & Config ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null); 
  const tenantId = "a4e69a0a-c349-4dd8-a923-e7c1ce02f0e6"; 

  // --- Initialize & Local Storage ---
  useEffect(() => {
    const savedSessions = localStorage.getItem(`sessions_${tenantId}`);
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        loadSession(parsed[0].id);
      }
    } else {
      createNewSession();
    }
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(`sessions_${tenantId}`, JSON.stringify(sessions));
    }
  }, [sessions]);

  // Auto-scroll Effect
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing, isLoadingHistory]);

  // --- Backend Actions ---

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000); 
  };

  const createNewSession = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/v1/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, title: "New Conversation" })
      });
      if (response.ok) {
        const data = await response.json();
        const newSession = { id: data.session_id, title: "New Conversation" };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([]);
        setCurrentView('chat');
      }
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };

  const loadSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setCurrentView('chat');
    setActiveDoc(null);
    setMessages([]);
    setIsLoadingHistory(true); // START LOADING EFFECT
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/chat/sessions/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.history) setMessages(data.history);
      }
    } catch (err) {
      console.error("Failed to load history", err);
      showToast("Failed to load chat history.", "error");
    } finally {
      setIsLoadingHistory(false); // STOP LOADING EFFECT
    }
  };

  const fetchDatabaseFiles = async () => {
    setIsLoadingDb(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/documents/?tenant_id=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setDbFiles(data.files);
      }
    } catch (err) {
      console.error("Failed to fetch documents from database", err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const fileUrl = URL.createObjectURL(file);
    const safeKey = file.name.toLowerCase();
    
    setLocalFiles(prev => ({ ...prev, [file.name]: fileUrl }));

    const formData = new FormData();
    formData.append("file", file);
    formData.append("tenant_id", tenantId); 

    try {
      const response = await fetch("http://localhost:8000/api/v1/upload/", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        showToast(`${file.name} successfully uploaded and indexed!`, 'success');
        if (currentView === 'documents') fetchDatabaseFiles();
      } else {
        const error = await response.json();
        showToast(`Upload Error: ${error.detail}`, 'error');
      }
    } catch (err) {
      showToast("Network error during upload.", 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = ''; 
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    let activeSession = currentSessionId;
    if (!activeSession) {
       await createNewSession();
       activeSession = currentSessionId; 
    }

    const userQuery = inputText;
    setInputText("");
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsProcessing(true);

    if (messages.length === 0 && activeSession) {
       setSessions(prev => prev.map(s => s.id === activeSession ? { ...s, title: userQuery.substring(0, 30) + '...' } : s));
    }

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQuery,
          tenant_id: tenantId,
          session_id: activeSession
        }),
      });

      if (response.ok) {
        const data = await response.json(); 
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: data.answer, 
          citations: data.citations 
        }]);
      } else if (response.status === 429) {
        showToast("Rate limit exceeded. Please wait a moment.", "error");
      }
    } catch (err) {
      showToast("Failed to connect to AI engine.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const getSearchQuery = (content: string) => {
    if (!content) return "";
    const cleanText = content.replace(/[^\w\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const searchWords = cleanText.split(' ').slice(0, 4).join(' ');
    return encodeURIComponent(`"${searchWords}"`);
  };

  const getFileUrl = (filename: string) => {
    const safeName = filename.toLowerCase();
    const foundKey = Object.keys(localFiles).find(k => k.toLowerCase() === safeName);
    return foundKey ? localFiles[foundKey] : undefined;
  };

  const allUniqueFiles = Array.from(new Set([...dbFiles, ...Object.keys(localFiles)]));

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden relative">
      
      {/* --- TOAST NOTIFICATION --- */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl font-medium animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'success' ? 'bg-slate-800 text-white' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} className="text-green-400" /> : <AlertCircle size={18} />}
          <span className="text-sm">{toast.message}</span>
        </div>
      )}

      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-4 flex items-center gap-2 mb-4">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">SECURE BRAIN</span>
        </div>

        <button 
          onClick={createNewSession}
          className="mx-4 mb-6 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus size={18} /> New Chat
        </button>

        <nav className="flex-1 overflow-y-auto px-2 flex flex-col">
          
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Recent Chats</div>
          <div className="space-y-1 mb-6 flex-1 overflow-y-auto">
            {sessions.map((session) => (
              <div 
                key={session.id}
                onClick={() => loadSession(session.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id && currentView === 'chat'
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <MessageSquare size={16} className="shrink-0 opacity-70" /> 
                <span className="text-sm truncate">{session.title}</span>
              </div>
            ))}
          </div>

          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Workspace</div>
          <div 
            onClick={() => {
              setCurrentView('documents');
              fetchDatabaseFiles(); 
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors mb-2 ${
              currentView === 'documents' 
                ? 'bg-blue-50 text-blue-600 font-medium' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database size={16} /> <span className="text-sm">Legal Documents</span>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-xl">
            <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center text-orange-700 font-bold text-xs">AM</div>
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-bold truncate">Alex Morgan</div>
              <div className="text-[10px] text-slate-500 truncate" title={tenantId}>Tenant Active</div>
            </div>
          </div>
        </div>
      </aside>

      {/* --- MAIN AREA --- */}
      <main className={`flex-1 flex flex-col min-w-0 bg-slate-50/30 transition-all duration-300 ${activeDoc ? 'max-w-[50%]' : 'max-w-full'}`}>
        
        <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-sm">
              {currentView === 'chat' ? 'Action-RAG SME Assistant' : 'Workspace / Legal Documents'}
            </h2>
            {/* Added isLoadingHistory to the top right spinner as well */}
            {(isProcessing || isLoadingDb || isLoadingHistory) && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </div>
        </header>

        {/* --- DYNAMIC CONTENT: CHAT vs DOCUMENTS --- */}
        {currentView === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              
              {/* --- LOADING HISTORY EFFECT --- */}
              {isLoadingHistory ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <Loader2 size={40} className="animate-spin text-blue-500 opacity-80" />
                    <p className="text-sm font-medium animate-pulse">Loading conversation history...</p>
                 </div>
              ) : messages.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm">Upload a document and ask a question to begin.</p>
                 </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-4'}`}>
                    {(msg.role === 'ai' || msg.role === 'assistant') && (
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                        <span className="text-white text-xs font-bold">⚡</span>
                      </div>
                    )}
                    <div className="flex-1 space-y-4 max-w-[80%]">
                      
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none ml-auto' : 'bg-white border border-slate-100 shadow-sm'}`}>
                        {(msg.role === 'ai' || msg.role === 'assistant') ? (
                          <div className="prose prose-sm prose-slate max-w-none">
                            <ReactMarkdown
                              components={{
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="marker:text-blue-500" {...props} />,
                                strong: ({node, ...props}) => <strong className="font-semibold text-slate-900" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-md font-bold mb-2 mt-3" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                              }}
                            >
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>

                      {(msg.role === 'ai' || msg.role === 'assistant') && msg.citations && msg.citations.length > 0 && (
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <ExternalLink size={12} /> Source References
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.citations.map((cite, cIdx) => (
                              <button 
                                key={cIdx}
                                onClick={() => setActiveDoc({ 
                                  title: cite.filename, 
                                  content: cite.content,
                                  fileUrl: getFileUrl(cite.filename)
                                })}
                                className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:border-blue-400 hover:text-blue-600 transition-colors shadow-sm"
                              >
                                <FileText size={14} className="text-blue-500" /> 
                                {cite.filename}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* --- "AI IS THINKING" EFFECT --- */}
              {isProcessing && !isLoadingHistory && (
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 mt-1">
                    <span className="text-white text-xs font-bold">⚡</span>
                  </div>
                  <div className="p-4 rounded-2xl text-sm leading-relaxed bg-white border border-slate-100 shadow-sm flex items-center gap-3 text-slate-500 max-w-[80%]">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="font-medium">Synthesizing answer from documents...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="max-w-3xl mx-auto relative">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt" />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Paperclip size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => fileInputRef.current?.click()} />
                </div>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all disabled:opacity-50"
                  placeholder="Ask questions about company documents..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={isProcessing || isLoadingHistory}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button 
                    onClick={handleSendMessage} 
                    className="bg-blue-600 p-2 rounded-xl text-white hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50" 
                    disabled={isProcessing || isLoadingHistory}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* DOCUMENTS GRID VIEW */
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800">Company Database</h1>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm"
                >
                  <Plus size={16} /> Upload New
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt" />
              </div>

              {allUniqueFiles.length === 0 ? (
                <div className="text-center py-20 bg-white border border-slate-200 border-dashed rounded-2xl">
                  <Database size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-sm font-bold text-slate-600 mb-1">No documents in Database</h3>
                  <p className="text-xs text-slate-400">Upload PDFs or text files to index them for AI retrieval.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUniqueFiles.map((filename, idx) => {
                    const localUrl = getFileUrl(filename);
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setActiveDoc({ 
                          title: filename, 
                          content: "Stored in Supabase Vector Database. Ask the AI a question to retrieve specific content chunks.", 
                          fileUrl: localUrl 
                        })}
                        className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
                      >
                        <div className={`p-3 rounded-lg ${filename.toLowerCase().endsWith('.pdf') ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                          <FileText size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{filename}</h4>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${localUrl ? 'text-green-600' : 'text-slate-400'}`}>
                            {localUrl ? '🟢 Session PDF Ready' : '☁️ Database Memory'}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* --- DOCUMENT VIEWER WITH NATIVE HIGHLIGHTING --- */}
      {activeDoc && (
        <aside className="w-1/2 border-l border-slate-200 bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300 shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] z-10">
          <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-red-50 p-1.5 rounded">
                <FileText className="text-red-500 w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-bold leading-tight truncate">{activeDoc.title}</h3>
                <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 rounded uppercase">Verified Source</span>
              </div>
            </div>
            <X size={20} className="cursor-pointer hover:text-slate-800 shrink-0" onClick={() => setActiveDoc(null)} />
          </header>

          <div className="flex-1 overflow-hidden bg-slate-200 relative">
            {activeDoc.fileUrl && activeDoc.title.toLowerCase().endsWith('.pdf') ? (
              <iframe 
                src={`${activeDoc.fileUrl}${activeDoc.content.includes("Stored in Supabase") ? '' : `#search=${getSearchQuery(activeDoc.content)}&view=FitH`}&toolbar=0&navpanes=0`} 
                className="w-full h-full border-0"
                title={activeDoc.title}
              />
            ) : (
              <div className="h-full overflow-y-auto p-12 flex justify-center">
                <div className="bg-white w-full max-w-2xl shadow-xl p-16 relative h-fit">
                  <div className="flex items-center gap-2 mb-6 border-b pb-2 text-orange-600">
                    <Info size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest">Extracted Text View</span>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-6 text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {activeDoc.content}
                  </div>
                  <p className="mt-8 text-xs text-slate-400 italic">
                    {activeDoc.title.toLowerCase().endsWith('.pdf') 
                      ? "Original file unavailable in browser memory. Please re-upload without refreshing to view the PDF layout." 
                      : "Browsers cannot render this file format natively. Displaying text view."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}