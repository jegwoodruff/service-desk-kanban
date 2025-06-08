import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  AppBar,
  Toolbar,
  IconButton,
  Link,
} from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const Settings = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [settings, setSettings] = useState({
    theme: 'light',
    notifications: true,
    language: 'en',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Fetch current settings from server
    const fetchSettings = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/settings');
        setSettings(response.data);
      } catch (err) {
        console.error('Error loading settings:', err);
        if (err.response?.status === 401) {
          setError('Please log in to access settings');
        } else {
          setError('Failed to load settings');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleChange = (prop) => (event) => {
    setSettings({ ...settings, [prop]: event.target.value });
  };

  const handleSave = async () => {
    try {
      await axios.put('http://localhost:3001/api/settings', settings);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving settings:', err);
      if (err.response?.status === 401) {
        setError('Please log in to save settings');
      } else {
        setError('Failed to save settings');
      }
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {loading && <Typography>Loading settings...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      
      {!loading && !error && (
        <>
          <AppBar position="static" color="default" elevation={0}>
            <Toolbar>
              <IconButton
                edge="start"
                color="inherit"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowBack />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                Settings
              </Typography>
            </Toolbar>
          </AppBar>

          <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Settings
            </Typography>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Theme
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={settings.theme}
                  label="Theme"
                  onChange={handleChange('theme')}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Notifications</InputLabel>
                <Select
                  value={settings.notifications ? 'on' : 'off'}
                  label="Notifications"
                  onChange={(e) => setSettings({ ...settings, notifications: e.target.value === 'on' })}
                >
                  <MenuItem value="on">On</MenuItem>
                  <MenuItem value="off">Off</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Language
              </Typography>
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Language</InputLabel>
                <Select
                  value={settings.language}
                  label="Language"
                  onChange={handleChange('language')}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Español</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                </Select>
              </FormControl>
            </Paper>

            <Button
              variant="contained"
              color="primary"
              onClick={handleSave}
              sx={{ mt: 2 }}
            >
              Save Settings
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default Settings;
