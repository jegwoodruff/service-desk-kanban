import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Menu,
  MenuListProps,
} from '@mui/material';
import { Add, MoreVert } from '@mui/icons-material';
import styled from 'styled-components';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from 'react-beautiful-dnd';
import Task from './Task';

const BoardContainer = styled(Box)`
  display: flex;
  gap: 16px;
  padding: 16px;
  min-width: 100%;
  overflow-x: auto;
`;

const ColumnContainer = styled(Box)`
  background: #f5f5f5;
  border-radius: 4px;
  padding: 8px;
  min-height: 600px;
  width: 300px;
  flex: 1;
  max-width: 300px;
`;

const ColumnHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const AddTaskButton = styled(Button)`
  width: 100%;
  margin-top: 8px;
`;

const Board = ({ dashboardId }) => {
  const [columns, setColumns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTaskColumn, setNewTaskColumn] = useState('todo');
  const [addColumnDialogOpen, setAddColumnDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedColumn, setSelectedColumn] = useState(null);

  useEffect(() => {
    // Fetch columns from API
    const fetchColumns = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/columns/${dashboardId}`);
        setColumns(response.data);
      } catch (error) {
        console.error('Error fetching columns:', error);
        setError('Failed to fetch columns');
      }
    };
    fetchColumns();

    if (!dashboardId || dashboardId <= 0) {
      setError('Invalid dashboard ID');
      setLoading(false);
      return;
    }

    // Fetch tasks from API
    setLoading(true);
    axios.get(`http://localhost:3001/api/tasks?dashboardId=${dashboardId}`)
      .then(response => {
        if (!response.data || !Array.isArray(response.data)) {
          throw new Error('Invalid response format');
        }
        // Transform API response to match our expected format
        const transformedTasks = response.data.map(task => ({
          ...task,
          id: task.id.toString(), // Convert to string for react-beautiful-dnd
          dashboardId: task.dashboard_id // Normalize field name
        }));
        setTasks(transformedTasks);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching tasks:', error);
        const errorMessage = error.response?.data?.error || 
          error.message || 
          'Failed to fetch tasks';
        setError(errorMessage);
        setLoading(false);
      });
  }, [dashboardId]);

  const handleAddColumn = async () => {
    if (!newColumnName.trim()) {
      setError('Column name is required');
      return;
    }

    try {
      await axios.post('http://localhost:3001/api/columns', {
        name: newColumnName,
        dashboardId,
        orderIndex: columns.length
      });
      setAddColumnDialogOpen(false);
      setNewColumnName('');
      // Refresh columns
      const response = await axios.get(`http://localhost:3001/api/columns/${dashboardId}`);
      setColumns(response.data);
    } catch (error) {
      console.error('Error creating column:', error);
      setError(error.response?.data?.error || 'Failed to create column');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      setError('Task title is required');
      return;
    }

    try {
      // Validate dashboard ID
      if (!dashboardId) {
        setError('Dashboard ID is missing');
        return;
      }

      const response = await axios.post('http://localhost:3001/api/tasks', {
        title: newTaskTitle,
        description: newTaskDescription,
        priority: newTaskPriority,
        column_id: newTaskColumn,
        dashboard_id: dashboardId
      });
      
      // Refresh tasks after creation
      const { data } = await axios.get(`http://localhost:3001/api/tasks?dashboardId=${dashboardId}`);
      setTasks(data);
      
      setOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('normal');
      setError('');
    } catch (error) {
      console.error('Error creating task:', error);
      setError(error.response?.data?.error || 'Failed to create task');
    }
  };

  const onDragEndHandler = async (result) => {
    if (!result.destination) return;

    const source = result.source;
    const destination = result.destination;

    if (source.droppableId === destination.droppableId) {
      // Reorder within the same column
      const items = Array.from(tasks);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setTasks(items);
    } else {
      // Move between columns
      const sourceItems = Array.from(tasks);
      const destinationItems = Array.from(tasks);
      const [movedItem] = sourceItems.splice(source.index, 1);
      destinationItems.splice(destination.index, 0, movedItem);
      const updateTaskColumn = async (taskId, newColumnId) => {
        try {
          await axios.put(`http://localhost:3001/api/tasks/${taskId}`, {
            column_id: newColumnId,
            dashboardId
          });
          setTasks(tasks.map(task =>
            task.id === taskId ? { ...task, column_id: newColumnId } : task
          ));
        } catch (error) {
          console.error('Error updating task column:', error);
          setError(error.response?.data?.error || 'Failed to update task');
        }
      };
      const newColumn = columns.find(col => col.id === destination.droppableId);
      if (newColumn) {
        updateTaskColumn(movedItem.id, newColumn.id);
      }
    }
  };

  return (
    <DragDropContext onDragEnd={onDragEndHandler}>
      {loading && <Typography>Loading...</Typography>}
      {error && <Typography color="error">{error}</Typography>}
      
      <Dialog open={addColumnDialogOpen} onClose={() => setAddColumnDialogOpen(false)}>
        <DialogTitle>Add New Column</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Column Name"
            fullWidth
            value={newColumnName}
            onChange={(e) => setNewColumnName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddColumnDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddColumn} color="primary">Add</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Add New Task</DialogTitle>
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
          <FormControl fullWidth margin="dense">
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
            >
              <MenuItem value="normal">Normal</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Column</InputLabel>
            <Select
              value={newTaskColumn}
              onChange={(e) => setNewTaskColumn(e.target.value)}
            >
              {columns.map((column) => (
                <MenuItem key={column.id} value={column.id}>{column.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTask} color="primary">Add</Button>
        </DialogActions>
      </Dialog>

      <Box>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h5" mr={2}>Columns</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => {
              setAddColumnDialogOpen(true);
              setNewColumnName('');
            }}
          >
            Add Column
          </Button>
        </Box>

        <Droppable droppableId="columns" direction="horizontal" type="column">
          {(provided) => (
            <Box
              display="flex"
              gap={2}
              sx={{
                '& .column': {
                  flex: '0 0 auto',
                  minWidth: 300,
                  maxWidth: 300,
                  width: 300,
                }
              }}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {columns.map((column, index) => (
                <Draggable
                  key={column.id}
                  draggableId={column.id.toString()}
                  index={index}
                >
                  {(provided) => (
                    <ColumnContainer
                      className="column"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                    >
                      <ColumnHeader>
                        <Typography variant="h6" gutterBottom>
                          {column.name}
                        </Typography>
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedColumn(column);
                            e.preventDefault();
                          }}
                        >
                          <MoreVert />
                        </IconButton>
                      </ColumnHeader>
                      <Droppable droppableId={column.id.toString()}>
                        {(provided) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                          >
                            {tasks
                              .filter(task => task.column_id === column.id)
                              .map((task, index) => (
                                <Draggable
                                  key={task.id}
                                  draggableId={task.id}
                                  index={index}
                                >
                                  {(provided) => (
                                    <Task
                                      task={task}
                                      index={index}
                                      provided={provided}
                                    />
                                  )}
                                </Draggable>
                              ))}
                            {provided.placeholder}
                          </Box>
                        )}
                      </Droppable>
                      <AddTaskButton
                        variant="outlined"
                        onClick={() => {
                          setOpen(true);
                          setNewTaskColumn(column.id);
                        }}
                      >
                        Add Task
                      </AddTaskButton>
                    </ColumnContainer>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>

        {/* Column Actions Menu */}
        {selectedColumn && (
          <Menu
            open={!!selectedColumn}
            anchorEl={selectedColumn}
            onClose={() => setSelectedColumn(null)}
            MenuListProps={{
              'aria-labelledby': 'column-menu',
            }}
          >
            <MenuItem
              onClick={async () => {
                try {
                  await axios.delete(`http://localhost:3001/api/columns/${selectedColumn.id}`);
                  setColumns(columns.filter(col => col.id !== selectedColumn.id));
                } catch (error) {
                  console.error('Error deleting column:', error);
                  setError('Failed to delete column');
                }
                setSelectedColumn(null);
              }}
            >
              Delete Column
            </MenuItem>
            <MenuItem
              onClick={async () => {
                try {
                  const newName = prompt('Enter new column name:', selectedColumn.name);
                  if (newName) {
                    await axios.put(`http://localhost:3001/api/columns/${selectedColumn.id}`, {
                      name: newName
                    });
                    setColumns(columns.map(col =>
                      col.id === selectedColumn.id ? { ...col, name: newName } : col
                    ));
                  }
                } catch (error) {
                  console.error('Error renaming column:', error);
                  setError('Failed to rename column');
                }
                setSelectedColumn(null);
              }}
            >
              Rename Column
            </MenuItem>
          </Menu>
        )}
      </Box>
    </DragDropContext>
  );
};

export default Board;
