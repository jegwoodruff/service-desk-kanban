import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Add, Delete, Edit, ArrowForward } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const DashboardManager = () => {
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // For now, using mock data
    const mockDashboards = [
      { id: 1, name: 'Project A', description: 'Main development project' },
      { id: 2, name: 'Support Tickets', description: 'Customer support tracking' },
      { id: 3, name: 'Team Tasks', description: 'Team member assignments' },
    ];
    setDashboards(mockDashboards);
    setLoading(false);
  }, []);

  const handleCreateDashboard = () => {
    if (!newDashboardName.trim()) {
      setError('Please enter a dashboard name');
      return;
    }

    // For now, just add to the list
    setDashboards(prev => [
      ...prev,
      {
        id: dashboards.length + 1,
        name: newDashboardName,
        description: 'New dashboard',
        created_at: new Date().toISOString(),
      }
    ]);
    setNewDashboardName('');
    setOpenCreateDialog(false);
  };

  const handleDeleteDashboard = (dashboardId) => {
    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      setDashboards(prev => prev.filter(d => d.id !== dashboardId));
    }
  };

  const handleGoToDashboard = (dashboardId) => {
    navigate(`/dashboard/${dashboardId}`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard Manager
      </Typography>

      <Button
        variant="contained"
        startIcon={<Add />}
        onClick={() => setOpenCreateDialog(true)}
        sx={{ mb: 3 }}
      >
        Create New Dashboard
      </Button>

      {loading && <CircularProgress />}
      {error && <Typography color="error">{error}</Typography>}

      <Grid container spacing={3}>
        {dashboards.map((dashboard) => (
          <Grid item xs={12} sm={6} md={4} key={dashboard.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {dashboard.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {dashboard.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => handleGoToDashboard(dashboard.id)}
                  endIcon={<ArrowForward />}
                >
                  Go to Dashboard
                </Button>
                <IconButton size="small" onClick={() => handleDeleteDashboard(dashboard.id)}>
                  <Delete />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)}>
        <DialogTitle>Create New Dashboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Dashboard Name"
            fullWidth
            value={newDashboardName}
            onChange={(e) => setNewDashboardName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateDashboard} variant="contained" color="primary">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DashboardManager;
