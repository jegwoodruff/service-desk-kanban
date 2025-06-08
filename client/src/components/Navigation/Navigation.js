import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Button,
  Link,
} from '@mui/material';
import { ArrowBack, Menu } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const Navigation = ({ title, onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.pathname === '/dashboard') {
      navigate('/login');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <AppBar position="static" color="default" elevation={0}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          onClick={handleBack}
          sx={{ mr: 2 }}
        >
          {location.pathname === '/dashboard' ? <Menu /> : <ArrowBack />}
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {title || 'Service Desk Kanban'}
        </Typography>
        <Box>
          <Button color="inherit" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={() => navigate('/settings')}>
            Settings
          </Button>
          <Button color="inherit" onClick={() => navigate('/login')}>
            Logout
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
