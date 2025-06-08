const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const slaService = require('../services/slaService');

// Middleware to validate SLA intervals
const validateInterval = (field) => {
  return check(field)
    .isInt({ min: 1 })
    .withMessage(`${field} must be a positive integer`);
};

// Get all SLAs
router.get('/', auth, async (req, res) => {
  try {
    const slas = await slaService.getAllSLAs();
    res.json(slas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SLA by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const sla = await slaService.getSlaById(req.params.id);
    if (!sla) {
      return res.status(404).json({ error: 'SLA not found' });
    }
    res.json(sla);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new SLA
router.post('/', auth, [
  check('name').notEmpty().withMessage('Name is required'),
  check('description').optional(),
  validateInterval('response_time'),
  validateInterval('resolution_time'),
  check('category').optional(),
  check('priority').isInt({ min: 1 }).withMessage('Priority must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sla = {
      name: req.body.name,
      description: req.body.description,
      response_time: req.body.response_time,
      resolution_time: req.body.resolution_time,
      category: req.body.category,
      priority: req.body.priority
    };

    const id = await slaService.createSla(sla);
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update SLA
router.put('/:id', auth, [
  check('name').optional(),
  check('description').optional(),
  validateInterval('response_time'),
  validateInterval('resolution_time'),
  check('category').optional(),
  check('priority').isInt({ min: 1 }).withMessage('Priority must be a positive integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const sla = {
      name: req.body.name,
      description: req.body.description,
      response_time: req.body.response_time,
      resolution_time: req.body.resolution_time,
      category: req.body.category,
      priority: req.body.priority
    };

    await slaService.updateSla(req.params.id, sla);
    res.json({ message: 'SLA updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete SLA
router.delete('/:id', auth, async (req, res) => {
  try {
    await slaService.deleteSla(req.params.id);
    res.json({ message: 'SLA deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SLA statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const statistics = await slaService.getSlaStatistics();
    res.json(statistics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get breaching tasks
router.get('/breaching', auth, async (req, res) => {
  try {
    const breachingTasks = await slaService.getBreachingTasks();
    res.json(breachingTasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
