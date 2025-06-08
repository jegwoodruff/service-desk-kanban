const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const emailTemplates = require('../templates/email-templates');
const conversationService = require('./conversationService');
const db = require('../server').db;

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to handle incoming emails
async function processEmail(email) {
  try {
    const { subject, text, html, from, attachments, messageId, date, references } = email;
    
    // Parse the email address to get the user ID if it's in the format: user-id+email@domain.com
    const match = from.match(/^(\d+)\+.*@/);
    const userId = match ? parseInt(match[1]) : null;

    // Get or create conversation thread
    const { taskId, isNew } = await conversationService.getOrCreateThread(email);

    // Add message to conversation
    await conversationService.addMessageToConversation(email, taskId);

    // If new thread, create initial task
    if (isNew) {
      // Create task from email
      const task = {
        title: subject,
        description: html || text,
        status: 'todo',
        priority: 'normal',
        category: 'email',
        created_by: userId || 1, // Default to admin if no user ID found
        source: 'email'
      };

      // Insert task into database
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO tasks (title, description, status, priority, category, created_by, source) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [subject, html || text, 'todo', 'normal', 'email', userId || 1, 'email'],
          function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
          }
        );
      });

      taskId = result;
    } else {
      // Update task if it already exists
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ?, category = ?, created_by = ? WHERE id = ?',
          [subject, html || text, 'todo', 'normal', 'email', userId || 1, taskId],
          function(err) {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    }

    // Save attachments if any
    if (attachments && attachments.length > 0) {
      const attachmentPromises = attachments.map(async (attachment) => {
        // Save attachment to disk
        const attachmentPath = path.join(__dirname, '../uploads', `task_${taskId}_${attachment.filename}`);
        await fs.promises.writeFile(attachmentPath, attachment.content);
        
        // Store attachment reference in database
        await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO task_attachments (task_id, filename, content_type, data) VALUES (?, ?, ?, ?)',
            [taskId, attachment.filename, attachment.contentType, attachment.content],
            function(err) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      });

      await Promise.all(attachmentPromises);
    }

    // Get related tasks for context
    const relatedTasks = await conversationService.getRelatedTasks(email);

    // Send confirmation email using template
    const template = emailTemplates.taskCreated;
    const supportEmail = process.env.EMAIL_FROM;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: from,
      subject: template.subject,
      html: template.html({ 
        taskId, 
        title: subject, 
        description: html || text, 
        supportEmail,
        relatedTasks: relatedTasks.map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignedTo: t.assigned_to_name
        }))
      })
    });

    return taskId;
  } catch (error) {
    console.error('Error processing email:', error);
    throw error;
  }
}

// Function to send notifications
async function sendNotification(to, subject, templateName, templateData) {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: template.subject,
      html: template.html(templateData)
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}

// Function to handle email replies
async function handleEmailReply(email) {
  try {
    // Get or create conversation thread
    const { taskId } = await conversationService.getOrCreateThread(email);

    // Add message to conversation
    await conversationService.addMessageToConversation(email, taskId);

    // Get task details
    const task = await new Promise((resolve, reject) => {
      db.get(
        'SELECT t.*, u.username as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?',
        [taskId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    
    if (!task) {
      throw new Error('Task not found');
    }

    // Add comment to task
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO comments (task_id, user_id, content, type) VALUES (?, ?, ?, ?)',
        [taskId, 1, email.html || email.text, 'email'],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Send notification to assigned user
    if (task.assigned_to) {
      const assignedUser = await new Promise((resolve, reject) => {
        db.get(
          'SELECT * FROM users WHERE id = ?',
          [task.assigned_to],
          (err, row) => {
            if (err) return reject(err);
            resolve(row);
          }
        );
      });

      if (assignedUser) {
        const conversationHistory = await conversationService.getConversationHistory(taskId);
        
        await sendNotification(
          assignedUser.email,
          'New comment on your ticket',
          'taskUpdated',
          {
            taskId,
            title: task.title,
            status: task.status,
            comment: email.html || email.text,
            conversationHistory: conversationHistory.map(msg => ({
              sender: msg.sender_name || msg.sender_email,
              content: msg.content_html || msg.content_text,
              timestamp: msg.created_at
            }))
          }
        );
      }
    }

    return taskId;
  } catch (error) {
    console.error('Error handling email reply:', error);
    throw error;
  }
}

module.exports = {
  processEmail,
  sendNotification,
  handleEmailReply
};
