const db = require('../server').db;

// Function to create or get conversation thread
async function getOrCreateThread(email) {
  try {
    const { subject, from, messageId, references } = email;
    
    // Extract task ID from references (if this is a reply)
    let taskId;
    if (references) {
      const match = references.match(/task-(\d+)/);
      if (match) {
        taskId = parseInt(match[1]);
        return { taskId, isNew: false };
      }
    }

    // If no references, create a new task
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tasks (title, description, status, priority, category, created_by, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [subject, '', 'todo', 'normal', 'email', 1, 'email'],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
    taskId = result;
    
    // Create conversation thread
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO conversation_threads (task_id, subject, last_message_id) VALUES (?, ?, ?)',
        [taskId, subject, messageId],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    return { taskId, isNew: true };
  } catch (error) {
    console.error('Error creating conversation thread:', error);
    throw error;
  }
}

// Function to add message to conversation
async function addMessageToConversation(email, taskId) {
  try {
    const { from, subject, text, html, messageId, date } = email;
    
    // Add message to conversation
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO conversation_messages (thread_id, sender, content_text, content_html, message_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [taskId, from, text, html, messageId, date],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Update thread's last message ID
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE conversation_threads SET last_message_id = ? WHERE task_id = ?',
        [messageId, taskId],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    return true;
  } catch (error) {
    console.error('Error adding message to conversation:', error);
    throw error;
  }
}

// Function to get conversation history
async function getConversationHistory(taskId) {
  try {
    const history = await new Promise((resolve, reject) => {
      db.all(
        'SELECT cm.*, u.username as sender_name, u.email as sender_email ' +
        'FROM conversation_messages cm ' +
        'LEFT JOIN users u ON cm.sender = u.email ' +
        'WHERE cm.thread_id = ? ' +
        'ORDER BY cm.created_at ASC',
        [taskId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    return history;
  } catch (error) {
    console.error('Error getting conversation history:', error);
    throw error;
  }
}

// Function to get related tasks
async function getRelatedTasks(email) {
  try {
    const { references, inReplyTo } = email;
    
    // Extract task IDs from references and inReplyTo
    const taskIds = [];
    if (references) {
      const matches = references.matchAll(/task-(\d+)/g);
      for (const match of matches) {
        taskIds.push(parseInt(match[1]));
      }
    }
    if (inReplyTo) {
      const match = inReplyTo.match(/task-(\d+)/);
      if (match) {
        taskIds.push(parseInt(match[1]));
      }
    }

    if (taskIds.length === 0) return [];

    const relatedTasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT t.*, u.username as assigned_to_name ' +
        'FROM tasks t ' +
        'LEFT JOIN users u ON t.assigned_to = u.id ' +
        'WHERE t.id IN (' + taskIds.map(() => '?').join(',') + ')',
        taskIds,
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    return relatedTasks;
  } catch (error) {
    console.error('Error getting related tasks:', error);
    throw error;
  }
}

module.exports = {
  getOrCreateThread,
  addMessageToConversation,
  getConversationHistory,
  getRelatedTasks
};
