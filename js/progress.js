// Code Quest - Progress Tracking System

class ProgressTracker {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  setUser(user) {
    this.currentUser = user;
    this.updateStreak();
  }

  clearUser() {
    this.currentUser = null;
  }

  // Answer Tracking
  recordAnswer(questionId, isCorrect, topic, difficulty, timeSpent, levelId) {
    if (!this.currentUser) return;

    const answerData = {
      questionId,
      isCorrect,
      topic,
      difficulty,
      timeSpent,
      levelId,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    // Store individual answer
    this.storeAnswer(answerData);

    // Update user statistics
    this.updateUserStats(answerData);

    // Update mistake patterns
    this.updateMistakePatterns(answerData);

    // Save progress
    this.saveProgress();

    // Notify listeners
    this.notifyListeners('answerRecorded', answerData);

    return answerData;
  }

  storeAnswer(answerData) {
    const answersKey = `${this.currentUser.key}_answers`;
    let answers = this.getStoredAnswers();
    answers.push(answerData);
    
    // Keep only last 1000 answers to prevent storage overflow
    if (answers.length > 1000) {
      answers = answers.slice(-1000);
    }
    
    try {
      localStorage.setItem(answersKey, JSON.stringify(answers));
    } catch (error) {
      console.error('Error storing answer:', error);
    }
  }

  getStoredAnswers() {
    const answersKey = `${this.currentUser.key}_answers`;
    try {
      const answers = localStorage.getItem(answersKey);
      return answers ? JSON.parse(answers) : [];
    } catch (error) {
      console.error('Error retrieving answers:', error);
      return [];
    }
  }

  updateUserStats(answerData) {
    const stats = this.currentUser.data.stats;
    
    stats.totalQuestions++;
    if (answerData.isCorrect) {
      stats.correctAnswers++;
      const xpEarned = this.calculateXP(answerData.difficulty, answerData.timeSpent);
      stats.totalXP += xpEarned;
      stats.totalScore += xpEarned;
      
      // Level up check
      const newLevel = Math.floor(stats.totalXP / 100) + 1;
      if (newLevel > stats.level) {
        stats.level = newLevel;
        this.notifyListeners('levelUp', { newLevel, totalXP: stats.totalXP });
      }
    }
  }

  updateMistakePatterns(answerData) {
    const progress = this.currentUser.data.progress;
    
    if (!answerData.isCorrect) {
      // Track weak areas
      if (!progress.weakAreas[answerData.topic]) {
        progress.weakAreas[answerData.topic] = 0;
      }
      progress.weakAreas[answerData.topic]++;
    } else {
      // Track strong areas
      if (!progress.strongAreas[answerData.topic]) {
        progress.strongAreas[answerData.topic] = 0;
      }
      progress.strongAreas[answerData.topic]++;
      
      // Remove from weak areas if improved significantly
      if (progress.weakAreas[answerData.topic] && 
          progress.strongAreas[answerData.topic] > progress.weakAreas[answerData.topic] * 2) {
        delete progress.weakAreas[answerData.topic];
      }
    }
  }

  calculateXP(difficulty, timeSpent) {
    const baseXP = { easy: 10, medium: 20, hard: 35 }[difficulty] || 10;
    
    // Time bonus
    let multiplier = 1;
    if (timeSpent < 10) multiplier = 1.5;
    else if (timeSpent < 20) multiplier = 1.2;
    
    return Math.round(baseXP * multiplier);
  }

  // Level Progress
  updateLevelProgress(levelId, questionsCorrect, questionsTotal, xpEarned) {
    if (!this.currentUser) return;

    const levelData = this.currentUser.data.progress.levels[levelId] || {
      questionsCorrect: 0,
      questionsTotal: 0,
      attempts: 0,
      xp: 0,
      accuracy: 0,
      completed: false,
      lastAccessed: null
    };

    levelData.questionsCorrect += questionsCorrect;
    levelData.questionsTotal += questionsTotal;
    levelData.attempts += 1;
    levelData.xp += xpEarned;
    levelData.lastAccessed = new Date().toISOString();

    // Calculate accuracy and completion
    if (levelData.questionsTotal > 0) {
      levelData.accuracy = Math.round((levelData.questionsCorrect / levelData.questionsTotal) * 100);
      levelData.percentage = Math.min(100, (levelData.questionsCorrect / Math.max(10, levelData.questionsTotal)) * 100);
    }

    // Mark as completed if accuracy is high enough
    if (levelData.accuracy >= 70 && levelData.questionsTotal >= 8) {
      if (!levelData.completed) {
        levelData.completed = true;
        this.currentUser.data.progress.completedLevels.push(levelId);
        this.notifyListeners('levelCompleted', { levelId, accuracy: levelData.accuracy });
      }
    }

    this.currentUser.data.progress.levels[levelId] = levelData;
    this.saveProgress();
  }

  // Streak Management
  updateStreak() {
    if (!this.currentUser) return;

    const stats = this.currentUser.data.stats;
    const today = new Date().toDateString();
    const lastLogin = stats.lastLoginDate;

    if (lastLogin === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastLogin === yesterday.toDateString()) {
      stats.currentStreak++;
      stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
    } else {
      stats.currentStreak = 1;
    }

    stats.lastLoginDate = today;
    this.saveProgress();
  }

  // Data Persistence
  saveProgress() {
    if (!this.currentUser) return;

    try {
      localStorage.setItem(this.currentUser.key, JSON.stringify(this.currentUser.data));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  // Analytics
  getWeakAreas() {
    if (!this.currentUser) return [];
    return Object.keys(this.currentUser.data.progress.weakAreas);
  }

  getStrongAreas() {
    if (!this.currentUser) return [];
    return Object.keys(this.currentUser.data.progress.strongAreas);
  }

  getRecentAnswers(limit = 50) {
    const answers = this.getStoredAnswers();
    return answers.slice(-limit);
  }

  getTopicPerformance(topic) {
    const answers = this.getStoredAnswers();
    const topicAnswers = answers.filter(a => a.topic === topic);
    
    if (topicAnswers.length === 0) return null;

    const correct = topicAnswers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correct / topicAnswers.length) * 100);
    const avgTime = topicAnswers.reduce((sum, a) => sum + a.timeSpent, 0) / topicAnswers.length;

    return {
      topic,
      totalAnswers: topicAnswers.length,
      correctAnswers: correct,
      accuracy,
      averageTime: Math.round(avgTime)
    };
  }

  getLevelStatistics(levelId) {
    if (!this.currentUser) return null;
    return this.currentUser.data.progress.levels[levelId] || null;
  }

  // Event System
  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
  }

  removeEventListener(event, callback) {
    this.listeners = this.listeners.filter(l => 
      l.event !== event || l.callback !== callback
    );
  }

  notifyListeners(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => {
        try {
          l.callback(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
  }

  // Utility
  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Export Data
  exportUserData() {
    if (!this.currentUser) return null;

    return {
      userData: this.currentUser.data,
      answers: this.getStoredAnswers(),
      exportDate: new Date().toISOString()
    };
  }

  // Import Data
  importUserData(data) {
    if (!this.currentUser || !data) return false;

    try {
      this.currentUser.data = data.userData;
      
      if (data.answers) {
        const answersKey = `${this.currentUser.key}_answers`;
        localStorage.setItem(answersKey, JSON.stringify(data.answers));
      }
      
      this.saveProgress();
      return true;
    } catch (error) {
      console.error('Error importing user data:', error);
      return false;
    }
  }
}

// Initialize global progress tracker
window.progressTracker = new ProgressTracker();

// Export for use in other modules
window.ProgressTracker = ProgressTracker;