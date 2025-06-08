require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const db = new sqlite3.Database('./database.db');

// Function to kill processes using a specific port
const killPortProcesses = (port) => {
  return new Promise((resolve, reject) => {
    exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`, (error) => {
      if (error) {
        console.error(`Error killing processes on port ${port}:`, error);
      }
      resolve();
    });
  });
};

// Function to get a random available port
const getRandomPort = () => {
  return Math.floor(Math.random() * 1000) + 3000; // Random port between 3000-3999
};

// Initialize database
const initDB = () => {
  return new Promise((resolve, reject) => {
    try {
      // Create tables
      db.serialize(() => {
        db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'agent',
            senior BOOLEAN DEFAULT false,
            working_hours_start TEXT,
            working_hours_end TEXT,
            timezone TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) throw err;
          });

        db.run(`
          CREATE TABLE IF NOT EXISTS boards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) throw err;
          });

        db.run(`
          CREATE TABLE IF NOT EXISTS dashboards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) throw err;
          });

        db.run(`
          CREATE TABLE IF NOT EXISTS columns (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            dashboard_id INTEGER NOT NULL,
            order_index INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dashboard_id) REFERENCES dashboards(id)
          )`, (err) => {
            if (err) throw err;
          });

        db.run(`
          CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            priority TEXT NOT NULL DEFAULT 'normal',
            status TEXT NOT NULL DEFAULT 'todo',
            dashboard_id INTEGER NOT NULL,
            column_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dashboard_id) REFERENCES dashboards(id),
            FOREIGN KEY (column_id) REFERENCES columns(id)
          )`, (err) => {
            if (err) throw err;
          });

        // Insert mock dashboards if they don't exist
        const sampleDashboards = [
          { name: 'Project A', description: 'Main project dashboard' },
          { name: 'Project B', description: 'Secondary project dashboard' },
          { name: 'Project C', description: 'Third project dashboard' }
        ];

        sampleDashboards.forEach(dashboard => {
          db.get('SELECT id FROM dashboards WHERE name = ?', [dashboard.name], (err, row) => {
            if (err) throw err;
            if (!row) {
              db.run(`
                INSERT INTO dashboards (name, description, created_at, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
              `, [dashboard.name, dashboard.description], (err) => {
                if (err) throw err;
              });
            }
          });
        });

        // Insert mock tasks if they don't exist
        db.get('SELECT id FROM tasks WHERE title = ?', ['Sample Task 1'], (err, row) => {
          if (err) throw err;
          if (!row) {
            db.run(`
              INSERT INTO tasks (title, description, priority, status, dashboard_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, ['Sample Task 1', 'This is a sample task', 'normal', 'todo', 1], (err) => {
              if (err) throw err;
            });
          }
        });

        db.get('SELECT id FROM tasks WHERE title = ?', ['Sample Task 2'], (err, row) => {
          if (err) throw err;
          if (!row) {
            db.run(`
              INSERT INTO tasks (title, description, priority, status, dashboard_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, ['Sample Task 2', 'Another sample task', 'high', 'in-progress', 1], (err) => {
              if (err) throw err;
            });
          }
        });

        db.run(`
          CREATE TABLE IF NOT EXISTS slas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            response_time INTEGER NOT NULL, -- in seconds
            resolution_time INTEGER NOT NULL, -- in seconds
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )`, (err) => {
            if (err) throw err;
          });

        db.run(`
          CREATE TABLE IF NOT EXISTS sla_breaches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            notified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            time_overdue INTEGER NOT NULL,
            FOREIGN KEY (task_id) REFERENCES tasks(id)
          )`, (err) => {
            if (err) throw err;
          });

        // Create indexes

        db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)', (err) => {
          if (err) throw err;
        });
        db.run('CREATE INDEX IF NOT EXISTS idx_tasks_dashboard ON tasks(dashboard_id)', (err) => {
          if (err) throw err;
        });

        console.log('Database initialized successfully');
        resolve();
      });
    } catch (error) {
      console.error('Error initializing database:', error);
      reject(error);
    }
  });
};

// Create Express app
const app = express();
const port = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['https://jegwoodruff.github.io'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Handle all other requests by serving the index.html file
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  }
}); // Use port from environment variable or default to 3001

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize database before starting server
initDB().then(() => {
  // Add error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
  });

  // Dashboard endpoints
  app.get('/api/dashboards', async (req, res) => {
    try {
      const dashboards = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM dashboards
          ORDER BY created_at DESC
        `, [], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      res.json(dashboards);
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      res.status(500).json({ error: 'Failed to fetch dashboards' });
    }
  });

  // Column endpoints
  app.get('/api/columns/:dashboardId', async (req, res) => {
    try {
      const { dashboardId } = req.params;
      const columns = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM columns 
          WHERE dashboard_id = ?
          ORDER BY order_index ASC
        `, [dashboardId], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
      res.json(columns);
    } catch (error) {
      console.error('Error fetching columns:', error);
      res.status(500).json({ error: 'Failed to fetch columns' });
    }
  });

  app.post('/api/columns', async (req, res) => {
    try {
      const { name, dashboardId, orderIndex } = req.body;
      const result = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO columns (name, dashboard_id, order_index, created_at, updated_at)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [name, dashboardId, orderIndex], function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        });
      });
      res.json({ id: result });
    } catch (error) {
      console.error('Error creating column:', error);
      res.status(500).json({ error: 'Failed to create column' });
    }
  });

  app.put('/api/columns/:columnId', async (req, res) => {
    try {
      const { columnId } = req.params;
      const { name, orderIndex } = req.body;
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE columns 
          SET name = ?, order_index = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [name, orderIndex, columnId], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating column:', error);
      res.status(500).json({ error: 'Failed to update column' });
    }
  });

  app.delete('/api/columns/:columnId', async (req, res) => {
    try {
      const { columnId } = req.params;
      await new Promise((resolve, reject) => {
        db.run(`
          DELETE FROM columns WHERE id = ?
        `, [columnId], function(err) {
          if (err) reject(err);
          resolve();
        });
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting column:', error);
      res.status(500).json({ error: 'Failed to delete column' });
    }
  });

  app.post('/api/dashboards', async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Dashboard name is required' });
      }

      const dashboard = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO dashboards (name, description, created_at, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [name, description || ''], function(err) {
          if (err) reject(err);
          resolve({
            id: this.lastID,
            name,
            description: description || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      });

      res.status(201).json(dashboard);
    } catch (error) {
      console.error('Error creating dashboard:', error);
      res.status(500).json({ error: 'Failed to create dashboard' });
    }
  });

  // Task endpoints
  app.get('/api/tasks', async (req, res) => {
    try {
      const { dashboardId } = req.query;
      if (!dashboardId) {
        return res.status(400).json({ error: 'Dashboard ID is required' });
      }

      // Validate dashboard ID
      const dashboardIdNum = parseInt(dashboardId);
      if (isNaN(dashboardIdNum) || dashboardIdNum <= 0) {
        return res.status(400).json({ error: 'Invalid dashboard ID' });
      }

      // Check if dashboard exists
      const dashboardExists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM dashboards WHERE id = ?', [dashboardIdNum], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (!dashboardExists) {
        return res.status(404).json({ error: 'Dashboard not found' });
      }

      const tasks = await new Promise((resolve, reject) => {
        db.all(`
          SELECT * FROM tasks 
          WHERE dashboard_id = ?
          ORDER BY status ASC, priority DESC
        `, [dashboardIdNum], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });

      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const { title, description, priority, status, dashboardId } = req.body;
      if (!title || !dashboardId) {
        return res.status(400).json({ error: 'Title and dashboard ID are required' });
      }

      const task = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO tasks (title, description, priority, status, dashboard_id, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [title, description, priority || 'normal', status || 'todo', dashboardId], function(err) {
          if (err) reject(err);
          resolve({
            id: this.lastID,
            title,
            description,
            priority: priority || 'normal',
            status: status || 'todo',
            dashboardId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        });
      });

      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:taskId', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { status, dashboardId } = req.body;
      if (!taskId || !dashboardId) {
        return res.status(400).json({ error: 'Task ID and dashboard ID are required' });
      }

      const result = await new Promise((resolve, reject) => {
        db.run(`
          UPDATE tasks 
          SET status = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND dashboard_id = ?
        `, [status, taskId, dashboardId], function(err) {
          if (err) reject(err);
          resolve(this.changes > 0);
        });
      });

      if (!result) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json({ message: 'Task updated successfully' });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Settings routes
  app.get('/api/settings', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.id;

      // For now, return default settings
      const settings = {
        theme: 'light',
        notifications: true,
        language: 'en'
      };

      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/settings', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.id;

      const { theme, notifications, language } = req.body;
      
      // For now, just return success
      res.json({ message: 'Settings updated successfully' });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Validate email
      if (!email.includes('@')) {
        return res.status(400).json({ message: 'Invalid email format' });
      }

      // Validate password
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      // Check if user already exists
      const userExists = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          resolve(row);
        });
      });

      if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
          [email, email, hashedPassword, 'user'],
          function(err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed: users.email')) {
                return reject({ status: 400, message: 'Email already exists' });
              }
              return reject(err);
            }
            resolve(this.lastID);
          }
        );
      });

      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Login route
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Login attempt:', req.body);
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        console.log('Login error: Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Get user
      const user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
          if (err) {
            console.error('Database error:', err);
            reject(err);
          }
          console.log('User found:', row ? 'yes' : 'no');
          resolve(row);
        });
      });

      if (!user) {
        console.log('Login error: User not found');
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password verification:', validPassword ? 'success' : 'failure');
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'service-desk-kanban-secret',
        { expiresIn: '24h' }
      );

      console.log('Login successful');
      res.json({ token });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Other API routes
  app.get('/api/boards', async (req, res) => {
    try {
      const boards = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM boards', (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
      res.json(boards);
    } catch (error) {
      console.error('Error fetching boards:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/boards/:boardId/tasks', async (req, res) => {
    try {
      const { boardId } = req.params;
      const tasks = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM tasks WHERE board_id = ?', [boardId], (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/boards', async (req, res) => {
    try {
      const { name } = req.body;
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO boards (name) VALUES (?)', [name], function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        });
      });
      res.status(201).json({ message: 'Board created successfully' });
    } catch (error) {
      console.error('Error creating board:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const { title, description, priority, column_id, dashboard_id } = req.body;
      
      // Validate required fields
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!dashboard_id) {
        return res.status(400).json({ error: 'Dashboard ID is required' });
      }
      
      // Validate priority (optional, default to 'normal')
      const validPriorities = ['low', 'normal', 'high'];
      const taskPriority = priority && validPriorities.includes(priority) ? priority : 'normal';
      
      await new Promise((resolve, reject) => {
        db.run('INSERT INTO tasks (title, description, priority, column_id, dashboard_id) VALUES (?, ?, ?, ?, ?)',
          [title, description, taskPriority, column_id, dashboard_id],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return reject(err);
            }
            resolve(this.lastID);
          });
      });
      
      res.status(201).json({ message: 'Task created successfully' });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  app.put('/api/tasks/:taskId/status', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { status } = req.body;
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [status, taskId],
          function(err) {
            if (err) reject(err);
            resolve();
          }
        );
      });
      res.json({ message: 'Task status updated successfully' });
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Start server with error handling
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  }).on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Trying to kill the process...`);
      killPortProcesses(port)
        .then(() => {
          console.log(`Successfully killed process on port ${port}. Restarting server...`);
          // Restart server after a short delay
          setTimeout(() => {
            app.listen(port, () => {
              console.log(`Server running on port ${port}`);
            });
          }, 1000);
        })
        .catch(err => {
          console.error('Failed to kill process:', err);
          process.exit(1);
        });
    } else {
      console.error('Server error:', error);
      process.exit(1);
    }
  });
}).catch((error) => {
  console.error('Failed to initialize database:', error);
  process.exit(1);
});
