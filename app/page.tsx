"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Toaster, toast } from 'sonner'; 
import { formatDistanceToNow } from 'date-fns';
import { 
  Plus, Search, Bell, MoreHorizontal, Home as HomeIcon,
  LogOut, Globe, Mail, Loader2, RefreshCcw, 
  CheckCircle2, Heart, Trash2, ImageIcon, AlertCircle
} from 'lucide-react';

export default function TambayHub() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [likedPosts, setLikedPosts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Email Validation
  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toLowerCase());
  const isEmailValid = validateEmail(email);

  // --- PERSISTENT LOGIN LOGIC ---
  useEffect(() => {
    // 1. Check for an existing session on mount
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      }
      setLoading(false);
    };

    initAuth();

    // 2. Listen for auth changes (Login/Logout/Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Timer logic for resend button
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Real-time Feed Listener
  useEffect(() => {
    fetchGlobalPosts();
    const channel = supabase.channel('global-updates').on('postgres_changes', 
      { event: '*', schema: 'public', table: 'posts' }, () => fetchGlobalPosts()).subscribe();
    
    const savedLikes = localStorage.getItem('tambay_likes');
    if (savedLikes) setLikedPosts(JSON.parse(savedLikes));
    
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchProfile(userId: string) {
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile(prof);
  }

  async function fetchGlobalPosts() {
    const { data } = await supabase.from('global_feed').select('*');
    setPosts(data || []);
  }

  async function handleSendOTP(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!isEmailValid || countdown > 0) return;
    
    setActionLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin }
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      setOtpSent(true);
      setCountdown(60);
      toast.success("Magic Link Sent!");
    }
    setActionLoading(false);
  }

  function handleBackToLogin() {
    setEmail("");
    setOtpSent(false);
    setCountdown(0);
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error("Logout failed");
    else toast.success("Signed out successfully");
  }

  if (loading) return (
    <div className="bg-[#020617] min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="animate-spin text-indigo-500 mx-auto mb-4" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Entering Tambayan...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-[#020617] min-h-screen pb-32 text-slate-100 antialiased font-sans">
      <Toaster position="top-center" theme="dark" />

      {!user ? (
        /* LOGIN SCREEN */
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900/40 border border-white/10 p-12 rounded-[3.5rem] backdrop-blur-3xl shadow-2xl text-center">
            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-3xl mx-auto mb-2 text-white shadow-lg shadow-indigo-600/20">T</div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tighter italic">TambayHub</h2>
                  <p className="text-slate-500 text-sm">Instant access. No passwords.</p>
                </div>
                
                <div className="relative">
                  <input 
                    type="email" 
                    placeholder="name@email.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className={`w-full bg-white/5 border rounded-2xl p-4 text-center outline-none transition-all font-bold ${
                      email.length === 0 ? 'border-white/10' : isEmailValid ? 'border-green-500/50' : 'border-rose-500/50'
                    }`} 
                  />
                  {email.length > 0 && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      {isEmailValid ? <CheckCircle2 size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-rose-500" />}
                    </div>
                  )}
                </div>

                <button 
                  disabled={actionLoading || !isEmailValid} 
                  className={`w-full py-4 rounded-2xl font-bold transition-all ${
                    isEmailValid ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {actionLoading ? <Loader2 className="animate-spin mx-auto" size={20} /> : "Send Magic Link"}
                </button>
              </form>
            ) : (
              <div className="animate-in fade-in zoom-in">
                <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 size={40} className="text-green-500" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-white">Check your email</h2>
                <p className="text-slate-500 text-sm mb-10">We've sent a login link to <b>{email}</b>.</p>
                <button onClick={handleBackToLogin} className="text-slate-500 text-xs hover:text-white">Use different email</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* MAIN FEED */
        <>
          <nav className="bg-[#020617]/80 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-[100] h-16 flex items-center justify-between px-6">
            <div className="flex items-center gap-2 font-black text-xl italic text-white tracking-tighter">TambayHub</div>
            <button onClick={handleLogout} className="p-2.5 bg-white/5 hover:text-red-500 rounded-2xl transition-all"><LogOut size={20}/></button>
          </nav>

          <main className="max-w-xl mx-auto pt-8 px-4">
            <div className="bg-slate-900/40 border border-white/10 rounded-[2.5rem] p-6 mb-10">
              <textarea 
                value={inputText} 
                onChange={e => setInputText(e.target.value)} 
                placeholder="Ano'ng kwento?" 
                className="w-full bg-transparent text-xl outline-none mb-4 resize-none font-medium text-white" 
                rows={2}
              />
              <div className="flex justify-between items-center pt-4 border-t border-white/5">
                <button className="p-2 text-slate-600"><ImageIcon size={20}/></button>
                <button 
                  onClick={() => {
                    if (!inputText.trim()) return;
                    setActionLoading(true);
                    supabase.from('posts').insert([{ content: inputText, user_id: user.id }])
                      .then(() => { setInputText(""); fetchGlobalPosts(); setActionLoading(false); });
                  }}
                  disabled={actionLoading || !inputText.trim()}
                  className="bg-indigo-600 px-8 py-2.5 rounded-2xl font-bold"
                >
                  Post Story
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {posts.map((post) => (
                <article key={post.id} className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-7">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center font-black text-indigo-500 uppercase">{post.username?.charAt(0) || 'U'}</div>
                    <div>
                      <h4 className="font-bold text-white">@{post.username || 'Anonymous'}</h4>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{formatDistanceToNow(new Date(post.created_at), {addSuffix: true})}</p>
                    </div>
                  </div>
                  <p className="text-slate-300 text-[17px] leading-relaxed mb-6">{post.content}</p>
                  <button 
                    onClick={() => {
                      const isLiked = likedPosts.includes(post.id);
                      if (isLiked) {
                        setLikedPosts(prev => prev.filter(id => id !== post.id));
                        supabase.rpc('decrement_likes', { row_id: post.id }).then(() => fetchGlobalPosts());
                      } else {
                        setLikedPosts(prev => [...prev, post.id]);
                        supabase.rpc('increment_likes', { row_id: post.id }).then(() => fetchGlobalPosts());
                      }
                    }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold ${likedPosts.includes(post.id) ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-slate-500'}`}
                  >
                    <Heart size={20} fill={likedPosts.includes(post.id) ? "currentColor" : "none"} />
                    {post.likes || 0}
                  </button>
                </article>
              ))}
            </div>
          </main>

          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-sm h-16 bg-slate-900/90 backdrop-blur-3xl border border-white/10 rounded-full flex items-center justify-around px-8 z-[200]">
             <HomeIcon size={22} className="text-indigo-500" />
             <Search size={22} className="text-slate-500" />
             <div className="bg-indigo-600 w-12 h-12 rounded-full flex items-center justify-center text-white -translate-y-4 border-[6px] border-[#020617] shadow-xl"><Plus size={26}/></div>
             <Bell size={22} className="text-slate-500" />
             <MoreHorizontal size={22} className="text-slate-500" />
          </div>
        </>
      )}
    </div>
  );
}