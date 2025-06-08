const db = require('../server').db;

// Initialize ML models
const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const classifier = new natural.BayesClassifier();
const priorityClassifier = new natural.BayesClassifier();

// Initialize word vectors
const Word2Vec = require('word2vec');
const w2v = new Word2Vec();

// Initialize TF.js models
const CATEGORY_MODEL_PATH = './models/category_model';
const PRIORITY_MODEL_PATH = './models/priority_model';

let categoryModel = null;
let priorityModel = null;

// Initialize models
async function initializeModels() {
  try {
    // Load TF.js models
    categoryModel = await tf.loadLayersModel(`${CATEGORY_MODEL_PATH}/model.json`);
    priorityModel = await tf.loadLayersModel(`${PRIORITY_MODEL_PATH}/model.json`);

    // Train Naive Bayes classifiers
    await trainClassifiers();

    // Load word vectors
    await loadWordVectors();

    console.log('ML models initialized successfully');
  } catch (error) {
    console.error('Error initializing ML models:', error);
    throw error;
  }
}

// Train classifiers
async function trainClassifiers() {
  try {
    // Get training data
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT title, description, category, priority FROM tasks ' +
        'WHERE category IS NOT NULL AND priority IS NOT NULL ' +
        'LIMIT 10000',
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Train category classifier
    tasks.forEach(task => {
      const text = `${task.title} ${task.description}`;
      classifier.addDocument(text, task.category);
    });
    classifier.train();

    // Train priority classifier
    tasks.forEach(task => {
      const text = `${task.title} ${task.description}`;
      priorityClassifier.addDocument(text, task.priority);
    });
    priorityClassifier.train();

    console.log('Classifiers trained successfully');
  } catch (error) {
    console.error('Error training classifiers:', error);
    throw error;
  }
}

// Load word vectors
async function loadWordVectors() {
  try {
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT title, description FROM tasks ' +
        'WHERE title IS NOT NULL OR description IS NOT NULL ' +
        'LIMIT 10000',
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Train word2vec model
    const texts = tasks.map(task => 
      `${task.title} ${task.description}`
    );

    await w2v.train(texts, {
      size: 100,
      window: 5,
      minCount: 5,
      workers: 4,
      cb: function(err, word, running, total) {
        if (err) throw err;
        console.log(`Training word vectors: ${running}/${total}`);
      }
    });

    console.log('Word vectors trained successfully');
  } catch (error) {
    console.error('Error loading word vectors:', error);
    throw error;
  }
}

// Task classification
async function classifyTask(task) {
  try {
    const text = `${task.title} ${task.description}`;

    // Get category prediction
    const categoryPrediction = classifier.getClassifications(text)[0];
    task.predictedCategory = categoryPrediction.label;
    task.categoryConfidence = categoryPrediction.value;

    // Get priority prediction
    const priorityPrediction = priorityClassifier.getClassifications(text)[0];
    task.predictedPriority = priorityPrediction.label;
    task.priorityConfidence = priorityPrediction.value;

    // Get keyword extraction
    const keywords = extractKeywords(text);
    task.predictedKeywords = keywords;

    // Get sentiment analysis
    const sentiment = analyzeSentiment(text);
    task.predictedSentiment = sentiment;

    return task;
  } catch (error) {
    console.error('Error classifying task:', error);
    throw error;
  }
}

// Keyword extraction
function extractKeywords(text) {
  try {
    // Use TF-IDF for keyword extraction
    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(text);
    
    // Calculate TF-IDF scores
    const wordFrequencies = {};
    words.forEach(word => {
      wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
    });

    // Normalize frequencies
    const totalWords = words.length;
    Object.keys(wordFrequencies).forEach(word => {
      wordFrequencies[word] = wordFrequencies[word] / totalWords;
    });

    // Sort by frequency and take top keywords
    const keywords = Object.entries(wordFrequencies)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, score]) => ({ word, score }));

    return keywords;
  } catch (error) {
    console.error('Error extracting keywords:', error);
    throw error;
  }
}

// Sentiment analysis
function analyzeSentiment(text) {
  try {
    // Use VADER for sentiment analysis
    const vader = require('vader-sentiment').SentimentIntensityAnalyzer;
    const sentiment = vader.polarity_scores(text);

    // Map to our scale
    const sentimentScale = {
      score: sentiment.compound,
      label: sentiment.compound >= 0.05 ? 'positive' :
             sentiment.compound <= -0.05 ? 'negative' : 'neutral'
    };

    return sentimentScale;
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    throw error;
  }
}

// Task prediction
async function predictTask(task) {
  try {
    // Convert text to tensor
    const text = `${task.title} ${task.description}`;
    const tensor = await textToTensor(text);

    // Predict category
    const categoryPrediction = categoryModel.predict(tensor);
    const categoryIndex = categoryPrediction.argMax(1).dataSync()[0];
    const categories = await getCategories();
    task.predictedCategory = categories[categoryIndex];

    // Predict priority
    const priorityPrediction = priorityModel.predict(tensor);
    const priorityIndex = priorityPrediction.argMax(1).dataSync()[0];
    const priorities = ['low', 'medium', 'high'];
    task.predictedPriority = priorities[priorityIndex];

    return task;
  } catch (error) {
    console.error('Error predicting task:', error);
    throw error;
  }
}

// Convert text to tensor
async function textToTensor(text) {
  try {
    // Tokenize text
    const tokenizer = new natural.WordTokenizer();
    const words = tokenizer.tokenize(text);

    // Get word vectors
    const vectors = words.map(word => {
      const vector = w2v.getWordVector(word);
      return vector ? vector : new Array(100).fill(0);
    });

    // Convert to tensor
    return tf.tensor(vectors);
  } catch (error) {
    console.error('Error converting text to tensor:', error);
    throw error;
  }
}

// Get categories
async function getCategories() {
  try {
    const categories = await new Promise((resolve, reject) => {
      db.all(
        'SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL',
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
    return categories.map(row => row.category);
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
}

// Update task with ML predictions
async function updateTaskWithPredictions(taskId) {
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

    if (!task) {
      throw new Error('Task not found');
    }

    const predictions = await classifyTask(task);

    // Update task with predictions
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE tasks SET ' +
        'predicted_category = ?, ' +
        'predicted_priority = ?, ' +
        'category_confidence = ?, ' +
        'priority_confidence = ?, ' +
        'predicted_keywords = ?, ' +
        'predicted_sentiment = ?, ' +
        'last_ml_update = CURRENT_TIMESTAMP ' +
        'WHERE id = ?',
        [
          predictions.predictedCategory,
          predictions.predictedPriority,
          predictions.categoryConfidence,
          predictions.priorityConfidence,
          JSON.stringify(predictions.predictedKeywords),
          JSON.stringify(predictions.predictedSentiment),
          taskId
        ],
        function(err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });

    return predictions;
  } catch (error) {
    console.error('Error updating task with predictions:', error);
    throw error;
  }
}

// Batch process tasks
async function processTasksBatch() {
  try {
    // Get tasks that need processing
    const tasks = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id FROM tasks ' +
        'WHERE predicted_category IS NULL ' +
        'OR last_ml_update IS NULL ' +
        "OR julianday(last_ml_update) < julianday('now', '-1 day')",
        [],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // Process each task
    for (const task of tasks) {
      await updateTaskWithPredictions(task.id);
    }

    return tasks.length;
  } catch (error) {
    console.error('Error processing tasks batch:', error);
    throw error;
  }
}

// Initialize service
async function init() {
  try {
    await initializeModels();
    console.log('ML Service initialized');
  } catch (error) {
    console.error('Error initializing ML service:', error);
    throw error;
  }
}

// Export functions
module.exports = {
  init,
  classifyTask,
  predictTask,
  updateTaskWithPredictions,
  processTasksBatch
};
