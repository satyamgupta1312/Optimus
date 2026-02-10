import React from 'react';
import { Toaster } from 'react-hot-toast';
import MainLayout from './components/Layout/MainLayout';
import { WidgetProvider } from './context/WidgetContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import { UndoRedoProvider } from './context/UndoRedoContext';
import { ActivityLogProvider } from './context/ActivityLogContext';
import LoginPage from './components/Auth/LoginPage';

// Separate component to use the auth hook
const MainApp = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <ActivityLogProvider>
      <UndoRedoProvider>
        <WidgetProvider>
          <MainLayout />
        </WidgetProvider>
      </UndoRedoProvider>
    </ActivityLogProvider>
  );
};

function App() {
  console.log("DEBUG: App rendering");
  return (
    <AppSettingsProvider>
      <AuthProvider>
        <MainApp />
        {/* Global Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '12px',
              padding: '12px 16px',
            },
          }}
        />
      </AuthProvider>
    </AppSettingsProvider>
  );
}

export default App;
