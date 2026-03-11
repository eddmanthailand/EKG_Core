"use client";

import { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { Terminal, Send, Activity, Server, ActivitySquare } from 'lucide-react';

const PixelAgentsStandalone = dynamic(() => import('@/components/pixel-agents/StandaloneWrapper'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-zinc-950 text-zinc-400 font-medium text-[16px] border border-white/10 rounded-3xl">
      Initializing EKG M.A.T.R.I.X...
    </div>
  ),
});

interface MemoryLog {
  id: string;
  created_at: string;
  action_type: string;
  status: string;
  triggered_by: string;
  details: any;
}

export default function Home() {
  const [logs, setLogs] = useState<MemoryLog[]>([]);
  const [command, setCommand] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('synapse_memory_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setLogs(data.reverse());
    }

    fetchLogs();

    const channel = supabase
      .channel('dashboard_logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'synapse_memory_logs' },
        (payload) => {
          setLogs((prev) => [...prev, payload.new as MemoryLog]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'synapse_memory_logs' },
        (payload) => {
          setLogs((prev) => 
            prev.map(log => log.id === payload.new.id ? (payload.new as MemoryLog) : log)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await supabase.from('synapse_memory_logs').insert({
        action_type: command.trim(),
        status: 'started',
        triggered_by: 'admin_terminal',
      });
      setCommand('');
    } catch (error) {
      console.error("Error sending command:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveCommand = async (id: string, currentStatus: string) => {
     if (currentStatus === 'completed') return;
     try {
        await supabase.from('synapse_memory_logs').update({ status: 'completed' }).eq('id', id);
     } catch (err) {
        console.error("Error resolving command", err);
     }
  }

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 font-sans tracking-tight selection:bg-blue-500/30 overflow-x-hidden flex flex-col antialiased">
      {/* Sleek Header */}
      <header className="bg-zinc-900/40 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center justify-between px-8 py-5">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ActivitySquare className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight text-white leading-tight">
                EKG Synapse <span className="text-zinc-500 font-medium text-[20px]">Core</span>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 bg-zinc-800/50 px-4 py-2 rounded-full border border-white/5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[14px] font-medium text-zinc-300">System Online</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 max-h-[calc(100vh-85px)]">
        
        {/* Left Span: Live Preview Window */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative">
           <div className="px-6 py-4 border-b border-white/10 bg-zinc-800/30 flex items-center justify-between min-h-[60px]">
              <h2 className="text-[16px] font-medium flex items-center gap-3 text-zinc-200">
                <Activity className="w-5 h-5 text-cyan-400" /> 
                Live Preview Window
              </h2>
           </div>
           
           <div className="flex-1 relative overflow-hidden bg-black/60 rounded-b-[2rem]">
              <PixelAgentsStandalone />
           </div>
        </div>

        {/* Right Span: Logs & Command Terminal */}
        <div className="flex flex-col gap-8 max-h-full">
           
           {/* Terminal Input */}
           <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col shrink-0">
               <div className="px-6 py-4 border-b border-white/10 bg-zinc-800/30 min-h-[60px] flex items-center">
                  <h2 className="text-[16px] font-medium flex items-center gap-3 text-zinc-200">
                    <Terminal className="w-5 h-5 text-indigo-400" /> 
                    Command Terminal
                  </h2>
               </div>
               <div className="p-6">
                  <form onSubmit={handleSendCommand} className="relative">
                    <input 
                      type="text" 
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      placeholder='Assign task...'
                      className="w-full bg-black/40 border border-white/10 text-[18px] text-white px-6 py-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all placeholder:text-zinc-600 font-medium"
                      disabled={isSubmitting}
                    />
                    <button 
                      type="submit" 
                      disabled={isSubmitting || !command.trim()}
                      className="absolute right-3 top-3 p-2.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
               </div>
           </div>

           {/* Setup Action & Step Logs */}
           <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col flex-1 min-h-0">
               <div className="px-6 py-4 border-b border-white/10 bg-zinc-800/30 flex justify-between items-center min-h-[60px]">
                  <h2 className="text-[16px] font-medium flex items-center gap-3 text-zinc-200">
                    <Server className="w-5 h-5 text-emerald-400" /> 
                    Action Logs
                  </h2>
                  <span className="text-[14px] bg-zinc-800 border border-white/10 text-zinc-300 px-3 py-1 rounded-full font-medium shadow-inner">
                    {logs.length}
                  </span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center text-zinc-500 py-10 text-[16px]">No actions recorded yet.</div>
                  ) : (
                    logs.map((log) => (
                      <div 
                        key={log.id} 
                        className={`p-5 rounded-2xl border flex flex-col gap-3 transition-colors ${
                          log.status === 'started' ? 'bg-indigo-500/10 border-indigo-500/20 shadow-inner' : 
                          log.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 shadow-inner' : 
                          'bg-zinc-800/30 border-white/5'
                        }`}
                      >
                         <div className="flex items-center justify-between">
                            <span className="text-zinc-400 text-[14px] font-medium">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                            <span className={`px-2.5 py-1 rounded-md text-[12px] font-bold tracking-wide uppercase ${
                              log.status === 'started' ? 'bg-indigo-500/20 text-indigo-300' :
                              log.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' :
                              'bg-zinc-700 text-zinc-300'
                            }`}>
                              {log.status}
                            </span>
                         </div>
                         <div className="text-zinc-100 text-[16px] font-medium leading-relaxed">
                            {log.action_type}
                         </div>
                         {/* Quick action button to simulate completion */}
                         {log.status === 'started' && (
                            <button 
                              onClick={() => handleResolveCommand(log.id, log.status)}
                              className="self-end mt-2 text-[14px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                            >
                              Mark as Done
                            </button>
                         )}
                      </div>
                    ))
                  )}
                  <div ref={logsEndRef} />
               </div>
           </div>

        </div>
      </main>
    </div>
  );
}
