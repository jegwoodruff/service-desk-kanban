const emailTemplates = {
  taskCreated: {
    subject: 'Your request has been received',
    html: ({ taskId, title, description, supportEmail }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1976d2;">Your Request Has Been Received</h2>
        <p>Thank you for your request. We have received your ticket and will address it as soon as possible.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">Ticket Details</h3>
          <p><strong>Ticket ID:</strong> ${taskId}</p>
          <p><strong>Subject:</strong> ${title}</p>
          <p><strong>Description:</strong><br>${description}</p>
        </div>
        
        <p>You can track your ticket status or reply to this email to add more information.</p>
        <p>If you need to contact support directly, please email ${supportEmail}.</p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  },

  taskUpdated: {
    subject: 'Your ticket has been updated',
    html: ({ taskId, title, status, assignedTo, comment }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1976d2;">Your Ticket Has Been Updated</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">Ticket Details</h3>
          <p><strong>Ticket ID:</strong> ${taskId}</p>
          <p><strong>Subject:</strong> ${title}</p>
          <p><strong>Status:</strong> ${status}</p>
          ${assignedTo ? `<p><strong>Assigned To:</strong> ${assignedTo}</p>` : ''}
        </div>
        
        ${comment ? `
          <div style="background: #e3f2fd; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <h3 style="color: #333; margin-bottom: 15px;">New Comment</h3>
            <p>${comment}</p>
          </div>
        ` : ''}
        
        <p>You can reply to this email to add more information or ask questions.</p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  },

  taskResolved: {
    subject: 'Your ticket has been resolved',
    html: ({ taskId, title, resolution, assignedTo }) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #4caf50;">Your Ticket Has Been Resolved</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">Ticket Details</h3>
          <p><strong>Ticket ID:</strong> ${taskId}</p>
          <p><strong>Subject:</strong> ${title}</p>
          ${assignedTo ? `<p><strong>Resolved By:</strong> ${assignedTo}</p>` : ''}
        </div>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 4px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">Resolution</h3>
          <p>${resolution}</p>
        </div>
        
        <p>If you have any questions about the resolution or need further assistance, please reply to this email.</p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 20px;">
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `
  }
};

module.exports = emailTemplates;
