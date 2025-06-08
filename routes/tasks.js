const express = require('express');
const router = express.Router();
const db = require('../server').db;

// Get all tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT t.*, u.username as assigned_to_name, u2.username as created_by_name, l.name as label_name, l.color as label_color ' +
        'FROM tasks t ' +
        'LEFT JOIN users u ON t.assigned_to = u.id ' +
        'LEFT JOIN users u2 ON t.created_by = u2.id ' +
        'LEFT JOIN task_labels tl ON t.id = tl.task_id ' +
        'LEFT JOIN labels l ON tl.label_id = l.id ' +
        'ORDER BY t.created_at DESC',
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    res.json(tasks.rows);
    res.json(tasks.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Create a new task
router.post('/', async (req, res) => {
  try {
    const { title, description, status, priority, category, board_id, assigned_to, labels } = req.body;

    // Insert task
    const taskId = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tasks (title, description, status, priority, category, board_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, status, priority, category, board_id, assigned_to, req.user.id],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });

    // Insert labels if provided
    if (labels && labels.length > 0) {
      const labelInserts = labels.map(labelId => {
        return new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)',
            [taskId, labelId],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      });
      await Promise.all(labelInserts);
    }

    res.status(201).json({ id: taskId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Update a task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, category, assigned_to, labels } = req.body;

    // Update task
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tasks SET title=?, description=?, status=?, priority=?, category=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP ' +
        'WHERE id=? AND created_by=?',
        [title, description, status, priority, category, assigned_to, id, req.user.id],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Update labels
    if (labels !== undefined) {
      // Delete existing labels
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM task_labels WHERE task_id=?', [id], function(err) {
          if (err) return reject(err);
          resolve();
        });
      });
      
      // Insert new labels if provided
      if (labels.length > 0) {
        const labelQueries = labels.map(labelId =>
          new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)',
              [id, labelId],
              function(err) {
                if (err) return reject(err);
                resolve();
              }
            );
          })
        );
        await Promise.all(labelQueries);
      }
    }

    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM tasks WHERE id = ? AND created_by = ?',
        [id, req.user.id],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
