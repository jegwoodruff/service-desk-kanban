import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box } from '@mui/material';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Layout/Dashboard';
import Settings from './components/Settings/Settings';
import Navigation from './components/Navigation/Navigation';
import DashboardManager from './components/DashboardManager/DashboardManager';
import './styles/global.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: 'Futura PT, sans-serif',
    h1: {
      fontFamily: 'Futura PT, sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Futura PT, sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Futura PT, sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: 'Futura PT, sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: 'Futura PT, sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: 'Futura PT, sans-serif',
      fontWeight: 700,
    },
    body1: {
      fontFamily: 'Futura PT, sans-serif',
    },
    body2: {
      fontFamily: 'Futura PT, sans-serif',
    },
  },
});

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/login" element={
            !isAuthenticated ? (
              <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <Navigation title="Login" />
                <Box sx={{ p: 3 }}>
                  <Login />
                </Box>
              </Box>
            ) : (
              <Navigate to="/dashboard" />
            )
          } />
          <Route path="/register" element={
            !isAuthenticated ? (
              <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <Navigation title="Register" />
                <Box sx={{ p: 3 }}>
                  <Register />
                </Box>
              </Box>
            ) : (
              <Navigate to="/dashboard" />
            )
          } />
          <Route path="/dashboard" element={
            isAuthenticated ? (
              <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <Navigation title="Dashboard Manager" />
                <Box sx={{ p: 3 }}>
                  <DashboardManager />
                </Box>
              </Box>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/dashboard/:id" element={
            isAuthenticated ? (
              <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <Navigation title="Dashboard" />
                <Box sx={{ p: 3 }}>
                  <Dashboard />
                </Box>
              </Box>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/settings" element={
            isAuthenticated ? (
              <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
                <Navigation title="Settings" />
                <Box sx={{ p: 3 }}>
                  <Settings />
                </Box>
              </Box>
            ) : (
              <Navigate to="/login" />
            )
          } />
          <Route path="/*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
