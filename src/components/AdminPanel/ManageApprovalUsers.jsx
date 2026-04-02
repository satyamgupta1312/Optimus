import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Trash2, Shield, Loader2 } from 'lucide-react';

const SUPER_ADMIN_IDENTIFIERS = ['satyam.gupta@apnamart.in', 'manoj.kumar'];

const ManageApprovalUsers = () => {
    const { checkerList, loadingCheckers, fetchCheckerList, addChecker, removeChecker } = useAuth();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [adding, setAdding] = useState(false);
    const [removingEmail, setRemovingEmail] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCheckerList();
    }, [fetchCheckerList]);

    const handleAdd = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        if (!trimmedEmail || !trimmedName) {
            setError('Both email and name are required.');
            return;
        }

        if (SUPER_ADMIN_IDENTIFIERS.includes(trimmedEmail)) {
            setError('Super Admin is already a checker by default.');
            return;
        }

        if (checkerList.some((u) => u.email.toLowerCase() === trimmedEmail)) {
            setError('This user is already a checker.');
            return;
        }

        setAdding(true);
        try {
            const result = await addChecker(trimmedEmail, trimmedName);
            if (result.success === false) {
                setError(result.error || 'Failed to add user.');
            } else {
                setEmail('');
                setName('');
            }
        } catch (err) {
            setError('Failed to add user. Please try again.');
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (userEmail) => {
        setRemovingEmail(userEmail);
        try {
            await removeChecker(userEmail);
        } catch (err) {
            setError('Failed to remove user. Please try again.');
        } finally {
            setRemovingEmail(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Add User Form */}
            <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Email or Username</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@apnamart.in or username"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={adding}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={adding}
                        />
                    </div>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={adding}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {adding ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    {adding ? 'Adding...' : 'Add Checker'}
                </button>
            </form>

            {/* Divider */}
            <div className="border-t border-slate-200" />

            {/* User List */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Current Checkers {!loadingCheckers && `(${checkerList.length + 1})`}
                </h3>

                {loadingCheckers ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-4">
                        <Loader2 size={16} className="animate-spin" />
                        Loading users...
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Super Admins — always shown, not removable */}
                        {[
                            { name: 'Satyam Gupta', id: 'satyam.gupta@apnamart.in' },
                            { name: 'Manoj Kumar', id: 'manoj.kumar' },
                        ].map((admin) => (
                            <div key={admin.id} className="flex items-center justify-between px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Shield size={14} className="text-amber-600" />
                                    <div>
                                        <span className="text-sm font-medium text-slate-800">{admin.name}</span>
                                        <span className="text-xs text-slate-500 ml-2">{admin.id}</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                                    Super Admin
                                </span>
                            </div>
                        ))}

                        {/* Dynamic checker list */}
                        {checkerList.map((checker) => (
                            <div
                                key={checker.email}
                                className="flex items-center justify-between px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                            >
                                <div>
                                    <span className="text-sm font-medium text-slate-800">{checker.name}</span>
                                    <span className="text-xs text-slate-500 ml-2">{checker.email}</span>
                                    {checker.addedAt && (
                                        <span className="text-[10px] text-slate-400 ml-2">
                                            Added {new Date(checker.addedAt).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRemove(checker.email)}
                                    disabled={removingEmail === checker.email}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title={`Remove ${checker.name}`}
                                >
                                    {removingEmail === checker.email ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Trash2 size={14} />
                                    )}
                                </button>
                            </div>
                        ))}

                        {checkerList.length === 0 && (
                            <p className="text-xs text-slate-400 py-2">No additional checkers added yet.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageApprovalUsers;
