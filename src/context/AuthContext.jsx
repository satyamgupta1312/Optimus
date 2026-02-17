import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, logoutUser } from '../services/AuthService';
import { GoogleSheetService } from '../services/GoogleSheetService';

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
            const users = await GoogleSheetService.getApprovalUsers();
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

            // Fetch checker list from Google Sheet to resolve dynamic roles
            const approvalUsers = await GoogleSheetService.getApprovalUsers();
            setCheckerList(approvalUsers);

            // If user is not SUPER_ADMIN, check if they're in the checker list
            if (userData.role !== 'SUPER_ADMIN') {
                const isInCheckerList = approvalUsers.some(
                    (u) => u.email.toLowerCase() === email.toLowerCase()
                );
                if (isInCheckerList) {
                    userData.role = 'CHECKER';
                }
            }

            setUser(userData);
            localStorage.setItem('optimus_user', JSON.stringify(userData));
            return userData;
        } catch (error) {
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
        const result = await GoogleSheetService.addApprovalUser(email, name);
        if (result.success !== false) {
            await fetchCheckerList();
        }
        return result;
    };

    const removeChecker = async (email) => {
        const result = await GoogleSheetService.removeApprovalUser(email);
        if (result.success !== false) {
            await fetchCheckerList();
        }
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
