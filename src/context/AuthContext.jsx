import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, logoutUser } from '../services/AuthService';
import { LocalApiService } from '../services/LocalApiService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [checkerList, setCheckerList] = useState([]);
    const [loadingCheckers, setLoadingCheckers] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('optimus_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.warn("Retreived invalid user data from storage, clearing.", e);
                localStorage.removeItem('optimus_user');
            }
        }
        setLoading(false);
    }, []);

    const fetchCheckerList = useCallback(async () => {
        setLoadingCheckers(true);
        try {
            const users = await LocalApiService.getCheckers();
            setCheckerList(users);
            return users;
        } catch (error) {
            console.error('[AuthContext] Failed to fetch checker list:', error);
            return [];
        } finally {
            setLoadingCheckers(false);
        }
    }, []);

    const login = async (email, password) => {
        try {
            const userData = await loginUser(email, password);

            // Store user early so LocalApiService has X-Optimus-User header
            localStorage.setItem('optimus_user', JSON.stringify(userData));

            // Fetch checker list from local backend to resolve dynamic roles
            try {
                const approvalUsers = await LocalApiService.getCheckers();
                setCheckerList(approvalUsers);

                // If user is not SUPER_ADMIN, check if they're in the checker list
                if (userData.role !== 'SUPER_ADMIN') {
                    const isInCheckerList = approvalUsers.some(
                        (u) => u.email.toLowerCase() === email.toLowerCase()
                    );
                    if (isInCheckerList) {
                        userData.role = 'CHECKER';
                        localStorage.setItem('optimus_user', JSON.stringify(userData));
                    }
                }
            } catch (e) {
                console.warn('[AuthContext] Checker list fetch failed (non-blocking):', e.message);
            }

            setUser(userData);
            return userData;
        } catch (error) {
            // Login itself failed — clean up any early localStorage
            localStorage.removeItem('optimus_user');
            throw error;
        }
    };

    const logout = async () => {
        await logoutUser();
        setUser(null);
        setCheckerList([]);
        localStorage.removeItem('optimus_user');
    };

    const addChecker = async (email, name) => {
        const result = await LocalApiService.addChecker(email, name);
        await fetchCheckerList();
        return result;
    };

    const removeChecker = async (email) => {
        const result = await LocalApiService.removeChecker(email);
        await fetchCheckerList();
        return result;
    };

    const switchRole = () => {
        if (!user) return;
        const newRole = user.role === 'MAKER' ? 'CHECKER' : 'MAKER';
        const newUser = { ...user, role: newRole };
        setUser(newUser);
        localStorage.setItem('optimus_user', JSON.stringify(newUser));
    };

    const value = {
        user,
        login,
        logout,
        switchRole,
        isAuthenticated: !!user,
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
        isChecker: user?.role === 'CHECKER' || user?.role === 'SUPER_ADMIN',
        isMaker: user?.role === 'MAKER',
        checkerList,
        loadingCheckers,
        fetchCheckerList,
        addChecker,
        removeChecker
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
