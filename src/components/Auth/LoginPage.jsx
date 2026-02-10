import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, ArrowRight } from 'lucide-react';

const LoginPage = () => {
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 shadow-xl rounded-xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 p-8 text-center">
                    <div className="flex items-center justify-center mb-4">
                        <img
                            src="/assets/optimus-logo.png"
                            alt="Optimus Logo"
                            className="h-24 w-auto"
                        />
                    </div>
                    <p className="text-blue-100 mt-2 text-sm">Widget Management Portal</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        {error && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm border border-red-100">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="mt-2 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign In'}
                            {!isSubmitting && <ArrowRight size={18} />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
