import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  Container,
  Paper,
  Grid,
} from '@mui/material';
import { Menu, ChevronLeft, ChevronRight } from '@mui/icons-material';
import Board from '../Board/Board';
import Settings from '../Settings/Settings';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const drawerWidth = 240;

const Dashboard = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard Manager', path: '/dashboard' },
    { text: 'Settings', path: '/settings' },
    { text: 'Logout', onClick: logout },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboards = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/dashboards');
        setDashboards(response.data);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch dashboards');
        setLoading(false);
      }
    };
    fetchDashboards();
  }, []);

  const { pathname } = location;
  const dashboardIdStr = pathname.split('/dashboard/')[1];
  const dashboardId = dashboardIdStr ? parseInt(dashboardIdStr) : null;

  // Validate dashboard ID
  if (dashboardIdStr && isNaN(dashboardId) || dashboardId <= 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <Typography variant="h5" color="error">
          Invalid Dashboard ID
        </Typography>
        <Button variant="contained" color="primary" onClick={() => navigate('/dashboard')}>
          Go to Dashboard Manager
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            {dashboardId ? `Dashboard ${dashboardId}` : 'Dashboard Manager'}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Button color="inherit" onClick={logout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text} 
                onClick={() => item.onClick ? item.onClick() : handleNavigation(item.path)}
              >
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
          open
        >
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.text} 
                onClick={() => item.onClick ? item.onClick() : handleNavigation(item.path)}
              >
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: 'calc(100vh - 64px)',
          bgcolor: '#f5f5f5'
        }}
      >
        <Box sx={{ mt: 4 }}>
          {location.pathname === '/dashboard' ? (
            <Container maxWidth="lg">
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Paper sx={{ p: 3 }}>
                    <Typography 
                      variant="h5" 
                      gutterBottom 
                      sx={{ 
                        textAlign: 'center',
                        marginBottom: 3
                      }}
                    >
                      Dashboard Manager
                    </Typography>
                    {loading ? (
                      <Typography>Loading dashboards...</Typography>
                    ) : error ? (
                      <Typography color="error">{error}</Typography>
                    ) : (
                      <Grid container spacing={3}>
                        {dashboards.map((dashboard) => (
                          <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
                            <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <Typography 
                                variant="h6" 
                                gutterBottom 
                                sx={{ 
                                  textAlign: 'center',
                                  fontWeight: 'bold',
                                  marginBottom: 2
                                }}
                              >
                                {dashboard.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {dashboard.description || 'No description'}
                              </Typography>
                              <Button
                                variant="contained"
                                color="primary"
                                sx={{ mt: 'auto' }}
                                onClick={() => navigate(`/dashboard/${dashboard.id}`)}
                              >
                                Go to Dashboard
                              </Button>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Paper>
                </Grid>
              </Grid>
            </Container>
          ) : location.pathname.startsWith('/dashboard/') ? (
            <Board dashboardId={dashboardId} />
          ) : location.pathname === '/settings' ? (
            <Settings />
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
