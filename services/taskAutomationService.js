const db = require('../server').db;

// Automation Rules table
const AUTOMATION_RULES = {
  // Priority-based rules
  HIGH_PRIORITY: {
    conditions: {
      priority: 'high',
      category: ['critical', 'emergency']
    },
    actions: {
      assignTo: 'senior_agent',
      addLabel: 'urgent',
      setDueDate: '24h'
    }
  },

  // Category-based rules
  TECH_SUPPORT: {
    conditions: {
      category: 'technical_support',
      keywords: ['error', 'bug', 'system failure']
    },
    actions: {
      assignTo: 'tech_support_team',
      addLabel: 'technical',
      setDueDate: '48h'
    }
  },

  // SLA-based rules
  SLA_BREACH: {
    conditions: {
      slaBreached: true,
      priority: ['high', 'medium']
    },
    actions: {
      escalateTo: 'manager',
      addLabel: 'escalated',
      sendNotification: true
    }
  },

  // Time-based rules
  AUTO_CLOSE: {
    conditions: {
      status: 'completed',
      daysSinceCompletion: 7
    },
    actions: {
      archive: true,
      addLabel: 'archived'
    }
  }
};

// Function to evaluate automation rules
async function evaluateRules(task) {
  try {
    const matchedRules = [];

    // Check each rule
    for (const [ruleName, rule] of Object.entries(AUTOMATION_RULES)) {
      if (await checkRuleConditions(task, rule.conditions)) {
        matchedRules.push({
          name: ruleName,
          actions: rule.actions
        });
      }
    }

    // Apply actions from highest priority rule
    if (matchedRules.length > 0) {
      const rule = matchedRules[0]; // Rules are ordered by priority
      await applyRuleActions(task, rule.actions);
    }

    return matchedRules;
  } catch (error) {
    console.error('Error evaluating automation rules:', error);
    throw error;
  }
}

// Function to check rule conditions
async function checkRuleConditions(task, conditions) {
  try {
    // Check priority
    if (conditions.priority && task.priority !== conditions.priority) {
      return false;
    }

    // Check category
    if (conditions.category && 
        !conditions.category.includes(task.category)) {
      return false;
    }

    // Check keywords
    if (conditions.keywords) {
      const keywordsMatch = conditions.keywords.some(keyword => 
        task.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(keyword.toLowerCase()))
      );
      if (!keywordsMatch) return false;
    }

    // Check SLA breach
    if (conditions.slaBreached) {
      const sla = await pool.query(
        'SELECT response_time, resolution_time FROM slas WHERE id = $1',
        [task.sla_id]
      );

      if (sla.rows.length > 0) {
        const now = new Date();
        const created = new Date(task.created_at);
        const responseDue = new Date(created.getTime() + sla.rows[0].response_time);
        if (!responseDue < now) return false;
      } else {
        return false;
      }
    }

    // Check status
    if (conditions.status && task.status !== conditions.status) {
      return false;
    }

    // Check days since completion
    if (conditions.daysSinceCompletion) {
      if (task.status !== 'completed') return false;
      const completedAt = new Date(task.completed_at);
      const daysSince = (new Date() - completedAt) / (1000 * 60 * 60 * 24);
      if (daysSince < conditions.daysSinceCompletion) return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking rule conditions:', error);
    throw error;
  }
}

// Function to apply rule actions
async function applyRuleActions(task, actions) {
  try {
    const updates = [];

    // Handle assignment
    if (actions.assignTo) {
      const userId = await getUserForAssignment(actions.assignTo);
      if (userId) {
        updates.push(
          pool.query(
            'UPDATE tasks SET assigned_to = $1 WHERE id = $2',
            [userId, task.id]
          )
        );
      }
    }

    // Add labels
    if (actions.addLabel) {
      const labelId = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM labels WHERE name = ?',
          [actions.addLabel],
          (err, row) => {
            if (err) return reject(err);
            resolve(row ? row.id : null);
          }
        );
      });

      if (labelId) {
        updates.push(
          await new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)',
              [task.id, labelId],
              function(err) {
                if (err) return reject(err);
                resolve();
              }
            );
          })
        );
      }
    }

    // Set due date
    if (actions.setDueDate) {
      const dueDate = new Date();
      dueDate.setHours(dueDate.getHours() + parseInt(actions.setDueDate));
      updates.push(
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE tasks SET due_date = ? WHERE id = ?',
            [dueDate, task.id],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        })
      );
    }

    // Archive task
    if (actions.archive) {
      updates.push(
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE tasks SET archived = ? WHERE id = ?',
            [true, task.id],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        })
      );
    }

    // Send notification
    if (actions.sendNotification) {
      updates.push(sendAutomationNotification(task, actions));
    }

    await Promise.all(updates);

    // Create automation log
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO task_automation_logs (task_id, rule_name, actions, created_at) VALUES (?, ?, ?, ?)',
        [task.id, Object.keys(AUTOMATION_RULES).find(r => 
          JSON.stringify(AUTOMATION_RULES[r].actions) === JSON.stringify(actions)
        ), JSON.stringify(actions), new Date()],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    return true;
  } catch (error) {
    console.error('Error applying rule actions:', error);
    throw error;
  }
}

// Function to get user for assignment
async function getUserForAssignment(role) {
  try {
    switch (role) {
      case 'senior_agent':
        return (await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM users WHERE role = ? AND senior = ? LIMIT 1',
            ['agent', true],
            (err, row) => {
              if (err) return reject(err);
              resolve(row ? row.id : null);
            }
          );
        })) || null;
      case 'tech_support_team':
        return (await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM users WHERE role = ? LIMIT 1',
            ['tech_support'],
            (err, row) => {
              if (err) return reject(err);
              resolve(row ? row.id : null);
            }
          );
        })) || null;
      case 'manager':
        return (await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM users WHERE role = ? LIMIT 1',
            ['manager'],
            (err, row) => {
              if (err) return reject(err);
              resolve(row ? row.id : null);
            }
          );
        })) || null;
      default:
        return null;
    }
  } catch (error) {
    console.error('Error getting user for assignment:', error);
    throw error;
  }
}

// Function to send automation notification
async function sendAutomationNotification(task, actions) {
  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT email FROM users WHERE id = ?',
        [task.assigned_to],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (user) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const actionList = Object.entries(actions)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: `Task Automation: ${task.title}`,
        html: `
          <p>Task has been automatically updated:</p>
          <p>Title: ${task.title}</p>
          <p>Actions taken:</p>
          <div>${actionList}</div>
          <p>Please review the changes.</p>
        `
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending automation notification:', error);
    throw error;
  }
}

// Function to run automation on all tasks
async function runTaskAutomation() {
  try {
    // Get all active tasks
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM tasks WHERE status != ? AND status != ? ORDER BY priority DESC, created_at ASC',
        ['archived', 'completed'],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Process each task
    for (const task of tasks) {
      await evaluateRules(task);
    }

    return true;
  } catch (error) {
    console.error('Error running task automation:', error);
    throw error;
  }
}

// Function to run automation on a specific task
async function runTaskAutomationForTask(taskId) {
  try {
    const task = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM tasks WHERE id = ?',
        [taskId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (!task.rows.length) {
      throw new Error('Task not found');
    }

    await evaluateRules(task.rows[0]);
    return true;
  } catch (error) {
    console.error('Error running automation for task:', error);
    throw error;
  }
}

module.exports = {
  runTaskAutomation,
  runTaskAutomationForTask,
  evaluateRules
};
