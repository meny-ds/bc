// Enhanced Progress Tracking System
class EnhancedProgressTracker {
  constructor() {
    this.currentUser = null;
    this.userProgress = {};
    this.userStats = {
      totalXP: 0,
      level: 1,
      currentStreak: 0,
      bestStreak: 0,
      lastLoginDate: null,
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: [],
      weakAreas: {},
      strongAreas: {},
      mistakePatterns: {},
      dailyQuestsCompleted: [],
      lastQuestDate: null,
      lastLevel: 'levels1-2',
      totalScore: 0
    };
    this.dailyQuests = this.generateDailyQuests();
  }

  // Save individual answer with detailed tracking
  saveAnswer(questionId, isCorrect, topic, difficulty, timeSpent, levelId) {
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
    const answersKey = `${this.currentUser.key}_answers`;
    let answers = JSON.parse(localStorage.getItem(answersKey) || '[]');
    answers.push(answerData);
    localStorage.setItem(answersKey, JSON.stringify(answers));

    // Update mistake patterns for adaptive learning
    this.updateMistakePatterns(questionId, isCorrect, topic, difficulty);
    
    // Update user stats
    this.userStats.totalQuestions++;
    if (isCorrect) {
      this.userStats.correctAnswers++;
      this.addXP(this.calculateXP(difficulty, timeSpent));
    }

    // Update last level
    this.userStats.lastLevel = levelId;
    
    this.saveProgress();
    return answerData;
  }

  updateMistakePatterns(questionId, isCorrect, topic, difficulty) {
    if (!isCorrect) {
      // Track mistake patterns
      if (!this.userStats.mistakePatterns[topic]) {
        this.userStats.mistakePatterns[topic] = {
          count: 0,
          questions: [],
          lastMistake: null,
          needsReview: true
        };
      }
      
      this.userStats.mistakePatterns[topic].count++;
      this.userStats.mistakePatterns[topic].lastMistake = new Date().toISOString();
      
      if (!this.userStats.mistakePatterns[topic].questions.includes(questionId)) {
        this.userStats.mistakePatterns[topic].questions.push(questionId);
      }

      // Add to weak areas
      if (!this.userStats.weakAreas[topic]) {
        this.userStats.weakAreas[topic] = 0;
      }
      this.userStats.weakAreas[topic]++;
    } else {
      // Strengthen topic
      if (!this.userStats.strongAreas[topic]) {
        this.userStats.strongAreas[topic] = 0;
      }
      this.userStats.strongAreas[topic]++;
      
      // Remove from weak areas if improved significantly
      if (this.userStats.weakAreas[topic] && this.userStats.strongAreas[topic] > this.userStats.weakAreas[topic] * 2) {
        delete this.userStats.weakAreas[topic];
        if (this.userStats.mistakePatterns[topic]) {
          this.userStats.mistakePatterns[topic].needsReview = false;
        }
      }
    }
  }

  // Adaptive question selection based on mistake patterns
  getAdaptiveQuestions(levelQuestions, count = 10) {
    const weakTopics = Object.keys(this.userStats.weakAreas);
    const adaptedQuestions = [];
    
    // 40% questions from weak areas
    const weakAreaQuestions = levelQuestions.filter(q => 
      weakTopics.includes(q.category) || weakTopics.includes(q.topic)
    );
    adaptedQuestions.push(...this.shuffleArray(weakAreaQuestions).slice(0, Math.floor(count * 0.4)));
    
    // 60% regular questions
    const remainingQuestions = levelQuestions.filter(q => 
      !adaptedQuestions.some(aq => aq.id === q.id)
    );
    adaptedQuestions.push(...this.shuffleArray(remainingQuestions).slice(0, count - adaptedQuestions.length));
    
    return this.shuffleArray(adaptedQuestions).slice(0, count);
  }

  generateDailyQuests() {
    const questTemplates = [
      {
        id: 'streak_master',
        title: 'Code Streak Master',
        description: 'Complete 5 questions without making a mistake',
        reward: 100,
        type: 'accuracy',
        target: 5,
        icon: '🎯',
        progress: 0
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Answer 10 questions in under 5 minutes',
        reward: 150,
        type: 'speed',
        target: 10,
        icon: '⚡',
        progress: 0
      },
      {
        id: 'knowledge_explorer',
        title: 'Knowledge Explorer',
        description: 'Try 3 different topics today',
        reward: 120,
        type: 'exploration',
        target: 3,
        icon: '🗺️',
        progress: 0
      },
      {
        id: 'mistake_corrector',
        title: 'Mistake Corrector',
        description: 'Review and improve on 5 previous mistakes',
        reward: 80,
        type: 'review',
        target: 5,
        icon: '🔄',
        progress: 0
      },
      {
        id: 'consistency_champion',
        title: 'Consistency Champion',
        description: 'Study for at least 20 minutes',
        reward: 75,
        type: 'time',
        target: 20,
        icon: '⏰',
        progress: 0
      }
    ];

    // Select 3 random quests for today
    return this.shuffleArray(questTemplates).slice(0, 3);
  }

  updateQuestProgress(type, value = 1) {
    this.dailyQuests.forEach(quest => {
      if (quest.type === type && quest.progress < quest.target) {
        quest.progress += value;
        if (quest.progress >= quest.target) {
          this.completeQuest(quest);
        }
      }
    });
  }

  completeQuest(quest) {
    if (!this.userStats.dailyQuestsCompleted.includes(quest.id)) {
      this.userStats.dailyQuestsCompleted.push(quest.id);
      this.addXP(quest.reward);
      this.showAchievement(`🎯 Quest Complete: ${quest.title}! +${quest.reward} XP`);
    }
  }

  calculateXP(difficulty, timeSpent) {
    let baseXP = { easy: 10, medium: 20, hard: 35 }[difficulty] || 10;
    
    // Time bonus
    if (timeSpent < 15) baseXP *= 1.5;
    else if (timeSpent < 30) baseXP *= 1.2;
    
    return Math.round(baseXP);
  }

  addXP(amount) {
    this.userStats.totalXP += amount;
    this.userStats.totalScore += amount;
    
    // Level calculation
    const newLevel = Math.floor(this.userStats.totalXP / 100) + 1;
    if (newLevel > this.userStats.level) {
      this.userStats.level = newLevel;
      this.showAchievement(`🎉 Level Up! You're now level ${newLevel}!`);
    }
  }

  showAchievement(message) {
    // Create achievement notification
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      color: #000;
      padding: 15px 20px;
      border-radius: 10px;
      font-weight: bold;
      z-index: 1001;
      transform: translateX(300px);
      transition: transform 0.5s ease;
      box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
      max-width: 300px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(300px)';
      setTimeout(() => document.body.removeChild(notification), 500);
    }, 4000);
  }

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Session management
  setLoginSession(username, password) {
    localStorage.setItem('cq_current_user', JSON.stringify({username, password}));
  }

  getLoginSession() {
    try {
      return JSON.parse(localStorage.getItem('cq_current_user'));
    } catch(e) { 
      return null; 
    }
  }

  clearLoginSession() {
    localStorage.removeItem('cq_current_user');
  }

  login(auto = false) {
    let username, password;
    
    if (auto) {
      const session = this.getLoginSession();
      if (!session) return false;
      username = session.username;
      password = session.password;
    } else {
      username = document.getElementById('loginUsername').value.trim();
      password = document.getElementById('loginPassword').value;
      
      if (!username || !password) {
        document.getElementById('loginMsg').textContent = "Please enter both username and password.";
        return false;
      }
      
      this.setLoginSession(username, password);
    }

    const userKey = `cq_user_${username}_${password}`;
    let savedData = localStorage.getItem(userKey);
    
    if (!savedData) {
      this.initializeNewUser();
      this.saveUserData(userKey);
    } else {
      const data = JSON.parse(savedData);
      this.userProgress = data.progress || {};
      this.userStats = { ...this.userStats, ...data.stats };
      this.updateStreak();
    }

    this.currentUser = { username, password, key: userKey };
    this.updateDailyQuests();
    
    return true;
  }

  initializeNewUser() {
    this.userProgress = {
      levels12: { completed: false, accuracy: 0, attempts: 0, xp: 0, questionsCorrect: 0, questionsTotal: 0 },
      levels34: { completed: false, accuracy: 0, attempts: 0, xp: 0, questionsCorrect: 0, questionsTotal: 0 },
      levels56: { completed: false, accuracy: 0, attempts: 0, xp: 0, questionsCorrect: 0, questionsTotal: 0 },
      levels78: { completed: false, accuracy: 0, attempts: 0, xp: 0, questionsCorrect: 0, questionsTotal: 0 },
      levels910: { completed: false, accuracy: 0, attempts: 0, xp: 0, questionsCorrect: 0, questionsTotal: 0 }
    };
    
    this.userStats = {
      totalXP: 0,
      level: 1,
      currentStreak: 1,
      bestStreak: 1,
      lastLoginDate: new Date().toDateString(),
      totalQuestions: 0,
      correctAnswers: 0,
      achievements: ['🎉 Welcome to Code Quest!'],
      weakAreas: {},
      strongAreas: {},
      mistakePatterns: {},
      dailyQuestsCompleted: [],
      lastQuestDate: new Date().toDateString(),
      lastLevel: 'levels1-2',
      totalScore: 0
    };
  }

  updateStreak() {
    const today = new Date().toDateString();
    const lastLogin = this.userStats.lastLoginDate;
    
    if (lastLogin === today) return;
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastLogin === yesterday.toDateString()) {
      this.userStats.currentStreak++;
      this.userStats.bestStreak = Math.max(this.userStats.bestStreak, this.userStats.currentStreak);
    } else {
      this.userStats.currentStreak = 1;
    }
    
    this.userStats.lastLoginDate = today;
  }

  updateDailyQuests() {
    const today = new Date().toDateString();
    if (this.userStats.lastQuestDate !== today) {
      this.dailyQuests = this.generateDailyQuests();
      this.userStats.lastQuestDate = today;
      this.userStats.dailyQuestsCompleted = [];
    }
  }

  updateLevelProgress(levelKey, questionsCorrect, questionsTotal, xpEarned) {
    if (!this.userProgress[levelKey]) return;
    
    const level = this.userProgress[levelKey];
    level.questionsCorrect += questionsCorrect;
    level.questionsTotal += questionsTotal;
    level.attempts += 1;
    level.xp += xpEarned;
    
    if (level.questionsTotal > 0) {
      level.accuracy = Math.round((level.questionsCorrect / level.questionsTotal) * 100);
    }
    
    if (level.accuracy >= 70 && level.questionsTotal >= 8) {
      level.completed = true;
      this.showAchievement(`🎉 Level ${levelKey.replace('levels', '')} Completed!`);
    }
    
    this.userStats.totalXP += xpEarned;
    this.userStats.totalQuestions += questionsTotal;
    this.userStats.correctAnswers += questionsCorrect;
    this.userStats.lastLevel = levelKey;
    
    this.saveProgress();
  }

  saveProgress() {
    if (this.currentUser) {
      const data = {
        progress: this.userProgress,
        stats: this.userStats
      };
      localStorage.setItem(this.currentUser.key, JSON.stringify(data));
    }
  }

  saveUserData(userKey) {
    const data = {
      progress: this.userProgress,
      stats: this.userStats
    };
    localStorage.setItem(userKey, JSON.stringify(data));
  }

  logout() {
    this.clearLoginSession();
    this.currentUser = null;
    this.userProgress = {};
    this.userStats = {};
  }
}

// Export for use in other files
if (typeof window !== 'undefined') {
  window.EnhancedProgressTracker = EnhancedProgressTracker;
}