import React, { useState, useEffect } from 'react';
import { Box, Button, Dialog, DialogTitle, DialogContent, TextField, Typography, IconButton, Menu, MenuItem } from '@mui/material';
import { Add, MoreVert } from '@mui/icons-material';
import axios from 'axios';

const Board = ({ dashboardId }) => {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTaskColumn, setNewTaskColumn] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState(null);

  useEffect(() => {
    fetchColumns();
    fetchTasks();
  }, [dashboardId]);

  const fetchColumns = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/columns/${dashboardId}`);
      setColumns(response.data);
    } catch (error) {
      console.error('Error fetching columns:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`http://localhost:3001/api/tasks?dashboardId=${dashboardId}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      alert('Task title is required');
      return;
    }

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/tasks`, {
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        column_id: newTaskColumn,
        dashboard_id: dashboardId
      });
      
      setTasks([...tasks, response.data]);
      setOpenDialog(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('normal');
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task');
    }
  };

  const handleAddTaskClick = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleColumnMenuClick = (event, column) => {
    setAnchorEl(event.currentTarget);
    setSelectedColumn(column);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Kanban Board
        </Typography>
        <Button variant="contained" color="primary" onClick={handleAddTaskClick}>
          Add Task
        </Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {columns.map((column) => (
          <Box
            key={column.id}
            sx={{
              minWidth: 300,
              bgcolor: 'background.paper',
              borderRadius: 1,
              p: 2,
              position: 'relative'
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">{column.name}</Typography>
              <IconButton
                size="small"
                onClick={(e) => handleColumnMenuClick(e, column)}
              >
                <MoreVert />
              </IconButton>
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
            >
              <MenuItem onClick={handleMenuClose}>Rename</MenuItem>
              <MenuItem onClick={handleMenuClose}>Delete</MenuItem>
            </Menu>

            {tasks
              .filter(task => task.column_id === column.id)
              .map((task) => (
                <Box
                  key={task.id}
                  sx={{
                    p: 2,
                    bgcolor: 'grey.100',
                    mb: 1,
                    borderRadius: 1
                  }}
                >
                  <Typography variant="subtitle1">{task.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {task.description}
                  </Typography>
                </Box>
              ))}
          </Box>
        ))}
      </Box>

      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Add Task</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Title"
            fullWidth
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
          />
          <TextField
            margin="dense"
            select
            label="Priority"
            fullWidth
            value={newTaskPriority}
            onChange={(e) => setNewTaskPriority(e.target.value)}
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
          </TextField>
          <TextField
            margin="dense"
            select
            label="Column"
            fullWidth
            value={newTaskColumn}
            onChange={(e) => setNewTaskColumn(e.target.value)}
          >
            {columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </TextField>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained" color="primary">
            Add Task
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Board;
