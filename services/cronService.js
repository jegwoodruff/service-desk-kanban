const nodeCron = require('node-cron');
const db = require('../server').db;

// Function to check and notify about SLA breaches
async function checkSlaBreaches() {
  try {
    // Get all active tasks with SLAs
    const tasks = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, s.* FROM tasks t 
        LEFT JOIN slas s ON t.sla_id = s.id 
        WHERE t.status != 'completed' AND s.id IS NOT NULL
      `, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    const now = new Date();
    const notifications = [];

    for (const task of tasks) {
      const created = new Date(task.created_at);
      const responseDue = new Date(created.getTime() + task.response_time);
      const resolutionDue = new Date(created.getTime() + task.resolution_time);

      // Check if response time breached
      if (responseDue < now) {
        notifications.push({
          type: 'response_breach',
          task_id: task.id,
          task_title: task.title,
          due_date: responseDue,
          time_overdue: now - responseDue,
          assigned_to: task.assigned_to
        });
      }

      // Check if resolution time breached
      if (resolutionDue < now) {
        notifications.push({
          type: 'resolution_breach',
          task_id: task.id,
          task_title: task.title,
          due_date: resolutionDue,
          time_overdue: now - resolutionDue,
          assigned_to: task.assigned_to
        });
      }
    }

    // Send notifications for breaches
    if (notifications.length > 0) {
      // Insert breaches into database
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO sla_breaches (task_id, type, notified_at, time_overdue) VALUES (?, ?, ?, ?)',
          notifications.map(n => [
            n.task_id,
            n.type,
            now,
            n.time_overdue
          ]),
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });

      // Send email notifications
      for (const notification of notifications) {
        // Get user email
        const user = await new Promise((resolve, reject) => {
          db.get(
            'SELECT email FROM users WHERE id = ?',
            [notification.assigned_to],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });

        if (user && user.email) {
          const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            }
          });

          await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: user.email,
            subject: `SLA Breach Alert: ${notification.task_title}`,
            html: `
              <p>Alert: SLA breach detected for task "${notification.task_title}"</p>
              <p>Task Description: ${notification.description}</p>
              <p>Assigned To: ${notification.assigned_to}</p>
              <p>SLA Response Deadline: ${notification.type === 'response_breach' ? notification.due_date.toLocaleString() : 'N/A'}</p>
              <p>SLA Resolution Deadline: ${notification.type === 'resolution_breach' ? notification.due_date.toLocaleString() : 'N/A'}</p>
              <p>Current Time: ${now.toLocaleString()}</p>
              <p>Please take immediate action to resolve this issue.</p>
            `
          });
        }

        // Update task status
        await new Promise((resolve, reject) => {
          db.run(
            'UPDATE tasks SET status = ?, sla_breached = 1 WHERE id = ?',
            ['breached', notification.task_id],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      }
    }
  } catch (error) {
    console.error('Error checking SLA breaches:', error);
  }
}

// Initialize cron jobs
const initializeCronJobs = () => {
  // Check SLA breaches every 15 minutes
  nodeCron.schedule('*/15 * * * *', () => {
    checkSlaBreaches().catch(err => {
      console.error('Error in SLA breach check:', err);
    });
  });

  // Generate SLA reports daily at midnight
  nodeCron.schedule('0 0 * * *', () => {
    generateSlaReports().catch(err => {
      console.error('Error in SLA report generation:', err);
    });
  }, {
    timezone: 'UTC'
  });
};

// Function to generate SLA reports
async function generateSlaReports() {
  try {
    const statistics = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          s.id,
          s.name,
          s.response_time,
          s.resolution_time,
          COUNT(t.id) as total_tasks,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
          SUM(CASE 
          WHEN t.status = 'completed' 
          AND (julianday(t.completed_at) - julianday(t.created_at)) * 86400 <= s.resolution_time 
          THEN 1 ELSE 0 
        END) as on_time_tasks
      FROM slas s 
      LEFT JOIN tasks t ON s.id = t.sla_id 
      WHERE t.created_at >= datetime('now', '-1 day')
      GROUP BY s.id, s.name, s.response_time, s.resolution_time
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Send report to administrators
    const admins = await new Promise((resolve, reject) => {
      db.all(
        'SELECT email FROM users WHERE role = ?',
        ['admin'],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    if (admins && admins.length > 0) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        }
      });

      // Create report HTML
      const reportHtml = `
        <h2>Daily SLA Report</h2>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        <table border="1">
          <tr>
            <th>SLA Name</th>
            <th>Response Time</th>
            <th>Resolution Time</th>
            <th>Total Tasks</th>
            <th>Completed Tasks</th>
            <th>On-Time Tasks</th>
            <th>On-Time Percentage</th>
          </tr>
          ${statistics.map(stat => `
            <tr>
              <td>${stat.name}</td>
              <td>${stat.response_time / 3600} hours</td>
              <td>${stat.resolution_time / 3600} hours</td>
              <td>${stat.total_tasks}</td>
              <td>${stat.completed_tasks}</td>
              <td>${stat.on_time_tasks}</td>
              <td>${stat.total_tasks > 0 ? ((stat.on_time_tasks / stat.total_tasks) * 100).toFixed(1) : 0}%</td>
            </tr>
          `).join('')}
        </table>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: admins.map(admin => admin.email).join(','),
        subject: 'Daily SLA Compliance Report',
        html: reportHtml
      });
    }
  } catch (error) {
    console.error('Error generating SLA reports:', error);
  }
}

module.exports = {
  initializeCronJobs
};
