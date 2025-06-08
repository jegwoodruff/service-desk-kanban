const db = require('../server').db;

// Function to get user skills and expertise
async function getUserSkills() {
  try {
    const result = await new Promise((resolve, reject) => {
      db.all(
        'SELECT u.id, u.username, u.email, u.role,
              GROUP_CONCAT(DISTINCT s.name) as skills,
              GROUP_CONCAT(DISTINCT c.name) as categories
         FROM users u
         LEFT JOIN user_skills us ON u.id = us.user_id
         LEFT JOIN skills s ON us.skill_id = s.id
         LEFT JOIN user_categories uc ON u.id = uc.user_id
         LEFT JOIN categories c ON uc.category_id = c.id
         GROUP BY u.id, u.username, u.email, u.role',
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    return result.map(row => ({
      ...row,
      skills: row.skills ? row.skills.split(',') : [],
      categories: row.categories ? row.categories.split(',') : []
    }));
  } catch (error) {
    console.error('Error getting user skills:', error);
    throw error;
  }
}

// Function to get user workload
async function getUserWorkload(userId) {
  try {
    const result = await new Promise((resolve, reject) => {
      db.get(
        'SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN t.status = ? THEN 1 END) as pending_tasks,
          COUNT(CASE WHEN t.status = ? THEN 1 END) as in_progress_tasks,
          AVG(STRFTIME('%s', 'now') - STRFTIME('%s', t.created_at)) as avg_task_age
         FROM tasks t
         WHERE t.assigned_to = ? AND t.status != ?
         GROUP BY t.assigned_to',
        ['todo', 'in_progress', userId, 'completed'],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    return result || {
      total_tasks: 0,
      pending_tasks: 0,
      in_progress_tasks: 0,
      avg_task_age: 0
    };
  } catch (error) {
    console.error('Error getting user workload:', error);
    throw error;
  }
}

// Function to calculate agent suitability score
function calculateSuitabilityScore(task, agent) {
  const score = {
    base: 100,
    skillMatch: 0,
    categoryMatch: 0,
    workloadPenalty: 0,
    priorityBoost: 0,
    slaPenalty: 0
  };

  // Skill matching
  if (task.skills && agent.skills) {
    const matchingSkills = task.skills.filter(skill => 
      agent.skills.includes(skill)
    ).length;
    score.skillMatch = matchingSkills * 10;
  }

  // Category matching
  if (task.category && agent.categories) {
    score.categoryMatch = agent.categories.includes(task.category) ? 20 : 0;
  }

  // Workload penalty
  const workload = agent.workload;
  score.workloadPenalty = -Math.min(workload.pending_tasks * 5, 50);

  // Priority boost
  score.priorityBoost = task.priority === 'high' ? 30 : 
                       task.priority === 'medium' ? 20 : 10;

  // SLA penalty
  if (task.sla_id) {
    const now = new Date();
    const created = new Date(task.created_at);
    const responseDue = new Date(created.getTime() + task.response_time);
    if (responseDue < now) {
      score.slaPenalty = -50;
    }
  }

  return score.base + 
         score.skillMatch + 
         score.categoryMatch + 
         score.workloadPenalty + 
         score.priorityBoost + 
         score.slaPenalty;
}

// Function to find best agent for a task
async function findBestAgent(task) {
  try {
    // Get all agents
    const agents = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, email FROM users WHERE role = ?',
        ['agent'],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Get skills and workload for each agent
    const agentData = await Promise.all(agents.rows.map(async agent => {
      const skills = await getUserSkills();
      const workload = await getUserWorkload(agent.id);
      return {
        ...agent,
        ...skills[0],
        workload
      };
    }));

    // Calculate suitability scores
    const scores = agentData.map(agent => ({
      agent,
      score: calculateSuitabilityScore(task, agent)
    }));

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    // Return top agent if score is above threshold
    const threshold = 50; // Minimum acceptable score
    if (scores[0].score >= threshold) {
      return scores[0].agent;
    }

    return null;
  } catch (error) {
    console.error('Error finding best agent:', error);
    throw error;
  }
}

// Function to auto-assign tasks
async function autoAssignTask(taskId) {
  try {
    // Get task details
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

    // Find best agent
    const bestAgent = await findBestAgent(task);

    if (bestAgent) {
      // Update task assignment
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE tasks SET assigned_to = ? WHERE id = ?',
          [bestAgent.id, taskId],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Create assignment comment
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO comments (task_id, user_id, content, type) VALUES (?, ?, ?, ?)',
          [taskId, bestAgent.id, 'Task automatically assigned based on SLA and agent availability', 'system'],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Send notification
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: bestAgent.email,
        subject: `New Task Assignment: ${task.title}`,
        html: `
          <p>You have been automatically assigned to task: ${task.title}</p>
          <p>Priority: ${task.priority}</p>
          <p>Category: ${task.category}</p>
          <p>SLA Response Time: ${task.response_time / 3600} hours</p>
          <p>Please address this task as soon as possible.</p>
        `
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error auto-assigning task:', error);
    throw error;
  }
}

// Function to reassign tasks based on SLA breaches
async function reassignBreachingTasks() {
  try {
    // Get all breaching tasks
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM tasks ' +
         'WHERE status != ? ' +
           'AND sla_id IS NOT NULL ' +
           'AND sla_breached = ?',
        ['completed', true],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    const now = new Date();
    const reassignments = [];

    for (const task of tasks) {
      // Find new agent
      const newAgent = await findBestAgent(task);
      if (newAgent && newAgent.id !== task.assigned_to) {
        reassignments.push({
          taskId: task.id,
          oldAgent: task.assigned_to,
          newAgent: newAgent.id
        });

        // Update task assignment
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE tasks SET assigned_to = ? WHERE id = ?',
            [newAgent.id, task.id],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });

        // Create reassignment comment
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO comments (task_id, user_id, content, type) VALUES (?, ?, ?, ?)',
            [task.id, newAgent.id, 'Task reassigned due to SLA breach', 'system'],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });

        // Send notification
        const transporter = nodemailer.createTransport({
          host: process.env.EMAIL_HOST,
          port: process.env.EMAIL_PORT,
          secure: process.env.EMAIL_SECURE === 'true',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: newAgent.email,
          subject: `Task Reassigned: ${task.title}`,
          html: `
            <p>You have been reassigned to task: ${task.title}</p>
            <p>Reason: SLA breach</p>
            <p>Priority: ${task.priority}</p>
            <p>Category: ${task.category}</p>
            <p>Please address this task immediately.</p>
          `
        });
      const created = new Date(task.created_at);
      const responseDue = new Date(created.getTime() + task.response_time);
      
      // Check if response time breached
      if (responseDue < now) {
        // Find new agent
        const newAgent = await findBestAgent(task);
        if (newAgent && newAgent.id !== task.assigned_to) {
          reassignments.push({
            taskId: task.id,
            oldAgent: task.assigned_to,
            newAgent: newAgent.id
          });
        }
      }
    }

    // Process reassignments
    for (const reassignment of reassignments) {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE tasks SET assigned_to = ?, status = ? WHERE id = ?',
          [reassignment.newAgent, 'in_progress', reassignment.taskId],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Create reassignment comment
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO comments (task_id, user_id, content, type) VALUES (?, ?, ?, ?)',
          [reassignment.taskId, reassignment.newAgent, 'Task reassigned due to SLA breach', 'system'],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Send notification to new agent
      const newAgent = await new Promise((resolve, reject) => {
        db.get(
          'SELECT email FROM users WHERE id = ?',
          [reassignment.newAgent],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          }
        );
      });

      if (newAgent) {
        const task = await new Promise((resolve, reject) => {
        db.get(
          'SELECT title, priority, category FROM tasks WHERE id = ?',
          [reassignment.taskId],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          }
        );
      });  

        if (task) {
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: newAgent.rows[0].email,
            subject: `Reassigned Task: ${task.rows[0].title}`,
            html: `
              <p>This task has been reassigned to you due to SLA breach:</p>
              <p>Title: ${task.rows[0].title}</p>
              <p>Priority: ${task.rows[0].priority}</p>
              <p>Category: ${task.rows[0].category}</p>
              <p>Please address this task immediately.</p>
            `
          });
        }
      }
    }

    return reassignments.length;
  } catch (error) {
    console.error('Error reassigning breaching tasks:', error);
    throw error;
  }
}

module.exports = {
  findBestAgent,
  autoAssignTask,
  reassignBreachingTasks
};
