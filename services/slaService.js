const db = require('../server').db;

// Function to get all SLAs
async function getAllSLAs() {
  try {
    const result = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM slas ORDER BY priority DESC',
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    return result;
  } catch (error) {
    console.error('Error getting SLAs:', error);
    throw error;
  }
}

// Function to get SLA by ID
async function getSlaById(id) {
  try {
    const result = await new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM slas WHERE id = ?',
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    return result;
  } catch (error) {
    console.error('Error getting SLA:', error);
    throw error;
  }
}

// Function to create new SLA
async function createSla(sla) {
  try {
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO slas (name, description, response_time, resolution_time, category, priority) VALUES (?, ?, ?, ?, ?, ?)',
        [sla.name, sla.description, sla.response_time, sla.resolution_time, sla.category, sla.priority],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
    return result;
  } catch (error) {
    console.error('Error creating SLA:', error);
    throw error;
  }
}

// Function to update SLA
async function updateSla(id, sla) {
  try {
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE slas SET name = ?, description = ?, response_time = ?, resolution_time = ?, category = ?, priority = ? WHERE id = ?',
        [sla.name, sla.description, sla.response_time, sla.resolution_time, sla.category, sla.priority, id],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
    return true;
  } catch (error) {
    console.error('Error updating SLA:', error);
    throw error;
  }
}

// Function to delete SLA
async function deleteSla(id) {
  try {
    // First update any tasks using this SLA
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tasks SET sla_id = NULL WHERE sla_id = ?',
        [id],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    // Then delete the SLA
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM slas WHERE id = ?',
        [id],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
    return true;
  } catch (error) {
    console.error('Error deleting SLA:', error);
    throw error;
  }
}

// Function to check SLA compliance
async function checkSlaCompliance(task) {
  try {
    if (!task.sla_id) return null;

    const sla = await getSlaById(task.sla_id);
    if (!sla) return null;

    const now = new Date();
    const created = new Date(task.created_at);

    // Check response time
    const responseDue = new Date(created.getTime() + sla.response_time);
    const responseBreached = responseDue < now;

    // Check resolution time
    const resolutionDue = new Date(created.getTime() + sla.resolution_time);
    const resolutionBreached = resolutionDue < now;

    return {
      sla,
      responseDue,
      resolutionDue,
      responseBreached,
      resolutionBreached,
      timeLeft: {
        response: responseDue - now,
        resolution: resolutionDue - now
      }
    };
  } catch (error) {
    console.error('Error checking SLA compliance:', error);
    throw error;
  }
}

// Function to get tasks breaching SLAs
async function getBreachingTasks() {
  try {
    const result = await new Promise((resolve, reject) => {
      db.all(
        'SELECT t.*, s.* FROM tasks t ' +
        'LEFT JOIN slas s ON t.sla_id = s.id ' +
        "WHERE t.status != ? AND s.id IS NOT NULL",
        ['completed'],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    const breachingTasks = result.filter(task => {
      const now = new Date();
      const created = new Date(task.created_at);
      const responseDue = new Date(created.getTime() + task.response_time);
      const resolutionDue = new Date(created.getTime() + task.resolution_time);
      
      return responseDue < now || resolutionDue < now;
    });

    return breachingTasks;
  } catch (error) {
    console.error('Error getting breaching tasks:', error);
    throw error;
  }
}

// Function to get SLA statistics
async function getSlaStatistics() {
  try {
    const result = await new Promise((resolve, reject) => {
      db.all(
        'SELECT ' +
        's.id, ' +
        's.name, ' +
        's.response_time, ' +
        's.resolution_time, ' +
        "COUNT(t.id) as total_tasks, " +
        "SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks, " +
        "SUM(CASE WHEN t.status = 'completed' AND (julianday(t.completed_at) - julianday(t.created_at)) * 86400 <= s.resolution_time THEN 1 ELSE 0 END) as on_time_tasks " +
        'FROM slas s ' +
        'LEFT JOIN tasks t ON s.id = t.sla_id ' +
        'GROUP BY s.id, s.name, s.response_time, s.resolution_time',
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    const statistics = result.map(stat => ({
      ...stat,
      compliance_rate: stat.total_tasks > 0 ? 
        (stat.on_time_tasks / stat.total_tasks * 100).toFixed(2) : 0
    }));

    return statistics;
  } catch (error) {
    console.error('Error getting SLA statistics:', error);
    throw error;
  }
}

module.exports = {
  getAllSLAs,
  getSlaById,
  createSla,
  updateSla,
  deleteSla,
  checkSlaCompliance,
  getBreachingTasks,
  getSlaStatistics
};
