const express = require('express');
const router = express.Router();
const { processEmail } = require('../services/emailService');

// Route to handle incoming emails
router.post('/incoming', async (req, res) => {
  try {
    // Get email data from request body
    const email = req.body;
    
    // Process the email and create task
    const taskId = await processEmail(email);
    
    res.status(201).json({
      message: 'Email processed successfully',
      taskId
    });
  } catch (error) {
    console.error('Error processing email:', error);
    res.status(500).json({
      error: 'Failed to process email',
      details: error.message
    });
  }
});

module.exports = router;
