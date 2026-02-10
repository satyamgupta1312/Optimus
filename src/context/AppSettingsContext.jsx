import React, { createContext, useContext, useState } from 'react';

const AppSettingsContext = createContext();

export const AppSettingsProvider = ({ children }) => {
    const [theme, setTheme] = useState('light'); // 'light' | 'dark'
    const [osType, setOsType] = useState('ios'); // 'ios' | 'android'

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const toggleOS = () => {
        setOsType(prev => prev === 'ios' ? 'android' : 'ios');
    };

    return (
        <AppSettingsContext.Provider value={{
            theme,
            setTheme,
            toggleTheme,
            osType,
            setOsType,
            toggleOS
        }}>
            {children}
        </AppSettingsContext.Provider>
    );
};

export const useAppSettings = () => {
    const context = useContext(AppSettingsContext);
    if (!context) {
        throw new Error('useAppSettings must be used within AppSettingsProvider');
    }
    return context;
};
