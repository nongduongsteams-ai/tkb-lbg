"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, ArrowRight, Sparkles, GraduationCap, Cpu } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-[#030308] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* AI/Tech Ambient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Orbs */}
        <div className="absolute -top-[10%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/20 blur-[130px] mix-blend-screen animate-[pulse_6s_ease-in-out_infinite]" />
        <div className="absolute top-[20%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-cyan-600/15 blur-[100px] mix-blend-screen animate-[pulse_5s_ease-in-out_infinite_alternate]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-purple-600/20 blur-[140px] mix-blend-screen animate-[pulse_7s_ease-in-out_infinite]" />
        
        {/* Subtle Tech Grid */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z' fill='%239C92AC' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E")` 
          }} 
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-[440px] z-10"
      >
        {/* Glassmorphism Card */}
        <div 
          className="backdrop-blur-xl bg-[#0a0a14]/70 border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)] flex flex-col relative overflow-hidden"
          style={{ padding: '40px' }} // AGENTS.md rule compliance
        >
          {/* Top glowing line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-50" />

          {/* Header */}
          <div className="text-center mb-10 relative">
            <div className="flex items-center justify-center space-x-3 mb-5">
              <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                <Cpu className="w-7 h-7 text-white absolute" />
                <Sparkles className="w-4 h-4 text-cyan-300 absolute -top-1 -right-1 animate-pulse" />
              </div>
              <div className="relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-[0_0_20px_rgba(6,182,212,0.5)]">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white via-cyan-100 to-cyan-400 drop-shadow-sm pb-1">
              AI TKB-LBG Pro
            </h1>
            <p className="text-cyan-200/70 text-[13px] font-semibold tracking-wide uppercase mt-1">
              Hệ thống điều hành All in one
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-grow" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-widest ml-1 flex items-center gap-2" htmlFor="email">
                <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                Tài khoản Email
              </label>
              <div className="relative group">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gv@c2nt.edu.vn"
                  required
                  autoComplete="email"
                  className="w-full bg-[#0f111a]/80 border border-white/5 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all text-sm font-medium group-hover:border-white/10"
                  style={{ padding: '14px 20px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-[11px] font-extrabold text-indigo-300 uppercase tracking-widest ml-1 flex items-center gap-2" htmlFor="password">
                <span className="w-1 h-1 rounded-full bg-purple-500"></span>
                Mật khẩu
              </label>
              <div className="relative group">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full bg-[#0f111a]/80 border border-white/5 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all pr-12 text-sm font-medium group-hover:border-white/10"
                  style={{ padding: '14px 20px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-400 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:via-indigo-500 hover:to-purple-500 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 text-white font-black rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all duration-300 flex items-center justify-center gap-3 text-sm uppercase tracking-wider relative overflow-hidden"
              style={{ padding: '16px 20px', marginTop: '12px' }}
            >
              {/* Button shine effect */}
              <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
              
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                  <span className="relative z-10">Đang khởi động AI...</span>
                </>
              ) : (
                <>
                  <span className="relative z-10">Truy cập Hệ thống</span> <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" />
                </>
              )}
            </button>
          </form>

          {/* Footer & Copyright */}
          <div className="border-t border-white/10 text-center flex flex-col items-center justify-center" style={{ marginTop: '40px', paddingTop: '24px', gap: '8px' }}>
            <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">
              Phát triển với
            </div>
            <div className="text-sm font-black bg-gradient-to-r from-[#DFE278] via-[#4ade80] to-[#2dd4bf] bg-clip-text text-transparent drop-shadow-md pb-0.5 tracking-wide">
              Nông Dưỡng - AI
            </div>
            <p className="text-[10px] font-medium text-zinc-600 m-0">
              Phiên bản Pro 1.3.3 &copy; 2026
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
