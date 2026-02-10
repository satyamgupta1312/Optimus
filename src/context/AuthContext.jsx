import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser } from '../services/AuthService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('optimus_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const userData = await loginUser(email, password);
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
        localStorage.removeItem('optimus_user');
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
        isMaker: user?.role === 'MAKER',
        isChecker: user?.role === 'CHECKER'
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
