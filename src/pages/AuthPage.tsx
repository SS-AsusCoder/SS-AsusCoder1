import { useState, type FormEvent } from 'react';
import { Shield, Mail, Lock, User, ArrowRight, AlertCircle, Activity, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/ui/Button';
import { Input, Field } from '../components/ui/Input';

export function AuthPage({ mode, onToggle }: { mode: 'login' | 'register'; onToggle: () => void }) {
  const { signIn, signUp } = useAuth();
  const { push } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        setError(error);
        push('error', 'Sign in failed', error);
      } else {
        push('success', 'Welcome back', 'Authenticated successfully');
      }
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName || 'Security Analyst');
      setLoading(false);
      if (error) {
        setError(error);
        push('error', 'Registration failed', error);
      } else {
        push('success', 'Account created', 'You are now signed in');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgb(14 165 233 / 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgb(6 182 212 / 0.2) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgb(15 23 42 / 0.4) 1px, transparent 1px), linear-gradient(90deg, rgb(15 23 42 / 0.4) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/30">
              <Shield className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-100">SentinelDDoS</p>
              <p className="text-xs text-slate-400 uppercase tracking-widest">Defense Console</p>
            </div>
          </div>
          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-slate-100 leading-tight">
              Real-time DDoS Detection & Mitigation Platform
            </h1>
            <p className="mt-4 text-slate-400 leading-relaxed">
              Enterprise-grade traffic monitoring, intelligent attack detection, and automated mitigation — all in one cybersecurity console.
            </p>
            <div className="mt-8 space-y-3">
              {[
                { icon: Activity, title: 'Live Traffic Monitoring', desc: 'Real-time packets, requests & bandwidth' },
                { icon: Zap, title: 'Intelligent Detection Engine', desc: '11 detection techniques with adaptive thresholds' },
                { icon: ShieldCheck, title: 'Automated Mitigation', desc: 'Block, rate-limit, challenge, geo-block' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <f.icon className="w-4.5 h-4.5 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{f.title}</p>
                    <p className="text-xs text-slate-500">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-600">© 2026 SentinelDDoS — Industry-grade Cybersecurity Platform</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 flex items-center justify-center">
              <Shield className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <p className="text-base font-bold text-slate-100">SentinelDDoS</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Defense Console</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
            <p className="text-sm text-slate-400 mt-1">{mode === 'login' ? 'Access the security operations console' : 'Start monitoring and mitigating DDoS attacks'}</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <Field label="Display Name">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Security Analyst" className="pl-10" />
                  </div>
                </Field>
              )}
              <Field label="Email">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="analyst@sentinel.io" className="pl-10" />
                </div>
              </Field>
              <Field label="Password">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" />
                </div>
              </Field>
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </Button>
            </form>
            <p className="text-center text-sm text-slate-400 mt-6">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={onToggle} className="text-sky-400 hover:text-sky-300 font-medium">
                {mode === 'login' ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
          <p className="text-center text-xs text-slate-600 mt-4">
            Protected by JWT auth · bcrypt password hashing · Row-level security
          </p>
        </div>
      </div>
    </div>
  );
}
