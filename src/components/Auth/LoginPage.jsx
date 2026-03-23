import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, ArrowRight, Loader2 } from 'lucide-react';

const ENV_OPTIONS = [
    { key: 'PROD', label: 'PROD', desc: 'samaan.apnamart.in' },
    { key: 'UAT', label: 'UAT', desc: 'smapi-cu.apnamart.in' },
];

const LoginPage = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentEnv = localStorage.getItem('optimus_env') || 'PROD';
    const [selectedEnv, setSelectedEnv] = useState(currentEnv);

    const handleEnvChange = (env) => {
        if (env === selectedEnv) return;
        setSelectedEnv(env);
        localStorage.setItem('optimus_env', env);
        window.location.reload();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            await login(email, password);
        } catch (err) {
            setError('Login failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeEnvConfig = ENV_OPTIONS.find(e => e.key === selectedEnv) || ENV_OPTIONS[0];

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Card */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <h1 className="text-lg font-bold text-slate-800">Widget Management Portal</h1>
                        <div className="flex items-center justify-center gap-1.5 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[12px] text-slate-400">{activeEnvConfig.desc}</span>
                        </div>
                    </div>

                    {/* Environment Toggle */}
                    <div className="flex bg-slate-100 p-0.5 rounded-lg mb-6">
                        {ENV_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => handleEnvChange(opt.key)}
                                className={`flex-1 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
                                    selectedEnv === opt.key
                                        ? 'bg-white text-slate-800 shadow-sm'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        {error && (
                            <div className="bg-red-50 text-red-600 px-3 py-2 rounded-lg text-[12px] border border-red-100">
                                {error}
                            </div>
                        )}

                        {/* Username */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-1 focus:ring-slate-300 transition-all"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={15} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[13px] text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-300 focus:ring-1 focus:ring-slate-300 transition-all"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-1 bg-slate-800 text-white font-medium py-2 rounded-lg hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 text-[13px] disabled:opacity-60"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    Sign In
                                    <ArrowRight size={14} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-[11px] text-slate-400 mt-4">
                    Optimus — Homepage Widget Management
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
