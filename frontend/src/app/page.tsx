"use client";

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Plus, FileText, Settings, HelpCircle, 
  Share2, ChevronRight, Send, Paperclip, MoreVertical, 
  Maximize2, X, ExternalLink, Loader2, Info, Database
} from 'lucide-react';

// --- Types for Backend Integration ---
interface Citation {
  filename: string;
  content: string;
  similarity: number; 
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
}

export default function SecureBrainDashboard() {
  // --- UI State ---
  const [activeDoc, setActiveDoc] = useState<{title: string, content: string, fileUrl?: string} | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [currentView, setCurrentView] = useState<'chat' | 'documents'>('chat');
  
  const [localFiles, setLocalFiles] = useState<Record<string, string>>({});
  
  // NEW: State to hold files fetched directly from the database
  const [dbFiles, setDbFiles] = useState<string[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  
  // --- Refs & Config ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tenantId = "a4e69a0a-c349-4dd8-a923-e7c1ce02f0e6"; 

  // --- Backend Actions ---

  // Fetch documents from DB
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
        const data = await response.json();
        alert(`Success: ${data.message}`);
        // Refresh DB files if we are on the documents view
        if (currentView === 'documents') fetchDatabaseFiles();
      } else {
        const error = await response.json();
        alert(`Upload Error: ${error.detail}`);
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;

    const userQuery = inputText;
    setInputText("");
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setIsProcessing(true);

    try {
      const response = await fetch("http://localhost:8000/api/v1/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: userQuery,
          tenant_id: tenantId
        }),
      });

      if (response.ok) {
        const data = await response.json(); 
        setMessages(prev => [...prev, { 
          role: 'ai', 
          content: data.answer, 
          citations: data.citations 
        }]);
      }
    } catch (err) {
      console.error("Chat failed", err);
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

  // Combine local files and DB files, removing duplicates
  const allUniqueFiles = Array.from(new Set([...dbFiles, ...Object.keys(localFiles)]));

  return (
    <div className="flex h-screen bg-white font-sans text-slate-800 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <aside className="w-64 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        <div className="p-4 flex items-center gap-2 mb-4">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <MessageSquare className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">SECURE BRAIN</span>
        </div>

        <button 
          onClick={() => setCurrentView('chat')}
          className={`mx-4 mb-6 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-all shadow-sm ${
            currentView === 'chat' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Plus size={18} /> New Chat
        </button>

        <nav className="flex-1 overflow-y-auto px-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Workspace</div>
          
          <div 
            onClick={() => {
              setCurrentView('documents');
              fetchDatabaseFiles(); // Trigger DB fetch on click
            }}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
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
            {(isProcessing || isLoadingDb) && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
          </div>
        </header>

        {/* --- DYNAMIC CONTENT: CHAT vs DOCUMENTS --- */}
        {currentView === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {messages.length === 0 && (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm">Upload a document and ask a question to begin.</p>
                 </div>
              )}
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'gap-4'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">⚡</span>
                    </div>
                  )}
                  <div className="flex-1 space-y-4 max-w-[80%]">
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none ml-auto' : 'bg-white border border-slate-100 shadow-sm'}`}>
                      {msg.content}
                    </div>

                    {msg.role === 'ai' && msg.citations && msg.citations.length > 0 && (
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
              ))}
            </div>

            <div className="p-6 border-t border-slate-200 bg-white">
              <div className="max-w-3xl mx-auto relative">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.docx,.txt" />
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Paperclip size={18} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => fileInputRef.current?.click()} />
                </div>
                <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  placeholder="Ask questions about company documents..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button onClick={handleSendMessage} className="bg-blue-600 p-2 rounded-xl text-white hover:bg-blue-700 shadow-md transition-colors" disabled={isProcessing}>
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </  >
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
        <aside className="w-1/2 border-l border-slate-200 bg-slate-100 flex flex-col animate-in slide-in-from-right duration-300 shrink-0">
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