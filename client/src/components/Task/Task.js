import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
} from '@mui/material';
import { MoreVert, Label, PriorityHigh, AccessTime } from '@mui/icons-material';
import styled from 'styled-components';

const TaskContainer = styled(Card)`
  cursor: pointer;
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-2px);
  }
`;

const TaskHeader = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const TaskLabels = styled(Box)`
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 8px;
`;

const Task = ({ task, onDrag, draggable }) => {
  const { title, description, priority, category, dueDate, labels } = task;

  return (
    <TaskContainer
      draggable={draggable}
      onDragStart={onDrag}
      sx={{ mb: 2 }}
    >
      <CardContent>
        <TaskHeader>
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
          <IconButton size="small">
            <MoreVert />
          </IconButton>
        </TaskHeader>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          {priority && (
            <Chip
              icon={<PriorityHigh />}
              label={priority}
              size="small"
              color={priority === 'high' ? 'error' : priority === 'medium' ? 'warning' : 'success'}
            />
          )}
          {category && (
            <Chip
              icon={<Label />}
              label={category}
              size="small"
              sx={{ backgroundColor: '#e3f2fd' }}
            />
          )}
          {dueDate && (
            <Chip
              icon={<AccessTime />}
              label={`Due: ${new Date(dueDate).toLocaleDateString()}`}
              size="small"
              sx={{ backgroundColor: '#fff3e0' }}
            />
          )}
        </Box>
        {labels && labels.length > 0 && (
          <TaskLabels>
            {labels.map((label) => (
              <Chip
                key={label.id}
                label={label.name}
                size="small"
                sx={{ backgroundColor: label.color }}
              />
            ))}
          </TaskLabels>
        )}
      </CardContent>
    </TaskContainer>
  );
};

export default Task;
