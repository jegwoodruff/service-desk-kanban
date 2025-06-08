import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem as MuiMenuItem,
  Menu,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import { MoreVert, Edit, Delete, Category, Timer, Add, Close } from '@mui/icons-material';
import styled from 'styled-components';

const TaskContainer = styled(Box)`
  background: white;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: transform 0.2s;
  position: relative;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .task-options {
    position: absolute;
    top: 8px;
    right: 8px;
    display: none;
  }

  &:hover .task-options {
    display: block;
  }
`;

const Task = ({ task, index, innerRef, draggableProps, dragHandleProps }) => {
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [categories, setCategories] = React.useState([
    { id: 1, name: 'Bug', color: '#ff4444' },
    { id: 2, name: 'Feature', color: '#4caf50' },
    { id: 3, name: 'Maintenance', color: '#2196f3' },
    { id: 4, name: 'Documentation', color: '#f57c00' }
  ]);
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [selectedSla, setSelectedSla] = React.useState(null);

  const handleTaskClick = () => {
    setOpen(true);
  };

  const handleOptionsClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCategorySelect = (event) => {
    setSelectedCategory(event.target.value);
    // TODO: Save category to task
    handleClose();
  };

  const handleSlaSelect = (event) => {
    setSelectedSla(event.target.value);
    // TODO: Save SLA to task
    handleClose();
  };

  return (
    <TaskContainer
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      onClick={handleTaskClick}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" marginBottom={1}>
        <Typography variant="subtitle2" fontWeight="bold">
          {task.title}
        </Typography>
        <Box className="task-options">
          <IconButton size="small" onClick={handleOptionsClick}>
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      <Typography variant="body2" color="textSecondary" paragraph>
        {task.description}
      </Typography>

      <Box display="flex" gap={1} marginTop={1}>
        {selectedCategory && (
          <Chip
            label={selectedCategory.name}
            size="small"
            style={{ backgroundColor: selectedCategory.color }}
          />
        )}
        {selectedSla && (
          <Chip
            label={`${selectedSla}h SLA`}
            size="small"
            color="primary"
          />
        )}
        <Chip label={task.priority} size="small" />
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MuiMenuItem onClick={handleClose}>
          <ListItemIcon>
            <Category />
          </ListItemIcon>
          <ListItemText primary="Categories" />
        </MuiMenuItem>
        <MuiMenuItem onClick={handleClose}>
          <ListItemIcon>
            <Timer />
          </ListItemIcon>
          <ListItemText primary="Set SLA" />
        </MuiMenuItem>
        <Divider />
        <MuiMenuItem onClick={handleClose}>
          <ListItemIcon>
            <Add />
          </ListItemIcon>
          <ListItemText primary="Add Label" />
        </MuiMenuItem>
        <MuiMenuItem onClick={handleClose}>
          <ListItemIcon>
            <Close />
          </ListItemIcon>
          <ListItemText primary="Close Task" />
        </MuiMenuItem>
      </Menu>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Task Details</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2}>
            <TextField
              fullWidth
              label="Title"
              value={task.title}
              disabled
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={task.description}
              disabled
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory?.id || ''}
                onChange={handleCategorySelect}
                displayEmpty
              >
                <MuiMenuItem value="">
                  <em>None</em>
                </MuiMenuItem>
                {categories.map((cat) => (
                  <MuiMenuItem key={cat.id} value={cat.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box
                        sx={{
                          width: 16,
                          height: 16,
                          backgroundColor: cat.color,
                          borderRadius: '50%',
                        }}
                      />
                      {cat.name}
                    </Box>
                  </MuiMenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>SLA (hours)</InputLabel>
              <Select
                value={selectedSla || ''}
                onChange={handleSlaSelect}
                displayEmpty
              >
                <MuiMenuItem value="">
                  <em>None</em>
                </MuiMenuItem>
                <MuiMenuItem value="2">2h</MuiMenuItem>
                <MuiMenuItem value="4">4h</MuiMenuItem>
                <MuiMenuItem value="8">8h</MuiMenuItem>
                <MuiMenuItem value="24">24h</MuiMenuItem>
                <MuiMenuItem value="48">48h</MuiMenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </TaskContainer>
  );
};

export default Task;
