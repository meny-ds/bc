// Code Quest - Unified Application Logic
class CodeQuestApp {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
    this.progressTracker = new ProgressTracker();
    this.adaptiveLearning = new AdaptiveLearning();
    this.questManager = new QuestManager();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Initialize subsystems
      this.adaptiveLearning.setProgressTracker(this.progressTracker);
      this.questManager.setProgressTracker(this.progressTracker);
      
      // Try auto-login
      const session = this.getStoredSession();
      if (session) {
        await this.login(session.username, session.password, true);
      }
      
      this.isInitialized = true;
      console.log('Code Quest initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Code Quest:', error);
    }
  }

  // Session Management
  getStoredSession() {
    try {
      const session = localStorage.getItem('cq_session');
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error('Error reading session:', error);
      return null;
    }
  }

  setStoredSession(username, password) {
    try {
      localStorage.setItem('cq_session', JSON.stringify({ username, password }));
    } catch (error) {
      console.error('Error storing session:', error);
    }
  }

  clearStoredSession() {
    try {
      localStorage.removeItem('cq_session');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  }

  // User Authentication
  async login(username, password, isAutoLogin = false) {
    try {
      if (!isAutoLogin) {
        if (!username || !password) {
          this.showLoginMessage('Please enter both username and password.');
          return false;
        }
        
        if (username.length < 3) {
          this.showLoginMessage('Username must be at least 3 characters.');
          return false;
        }
      }

      const userKey = `cq_user_${username}_${btoa(password)}`;
      let userData = this.loadUserData(userKey);
      
      if (!userData) {
        userData = this.createNewUser(username);
        this.saveUserData(userKey, userData);
      }

      this.currentUser = { username, password, key: userKey, data: userData };

      if (!isAutoLogin) {
        this.setStoredSession(username, password);
      }

      // Initialize subsystems with user
      this.progressTracker.setUser(this.currentUser);
      this.questManager.setUser(this.currentUser);
      this.adaptiveLearning.setUser(this.currentUser);

      this.showMainContent();
      this.updateUserInterface();
      this.updateStreak();

      return true;
    } catch (error) {
      console.error('Login error:', error);
      this.showLoginMessage('Login failed. Please try again.');
      return false;
    }
  }

  logout() {
    try {
      this.currentUser = null;
      this.clearStoredSession();
      this.showLoginForm();
      
      this.progressTracker.clearUser();
      this.questManager.clearUser();
      this.adaptiveLearning.clearUser();
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // User Data Management
  loadUserData(userKey) {
    try {
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading user data:', error);
      return null;
    }
  }

  saveUserData(userKey, userData) {
    try {
      localStorage.setItem(userKey, JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  createNewUser(username) {
    return {
      username,
      createdAt: new Date().toISOString(),
      stats: {
        totalXP: 0,
        level: 1,
        currentStreak: 1,
        bestStreak: 1,
        lastLoginDate: new Date().toDateString(),
        totalQuestions: 0,
        correctAnswers: 0,
        totalScore: 0,
        achievements: ['🎉 Welcome to Code Quest!']
      },
      progress: {
        levels: {},
        completedLevels: [],
        currentLevel: 'level1',
        weakAreas: {},
        strongAreas: {}
      },
      quests: {
        daily: [],
        completed: [],
        lastQuestDate: new Date().toDateString()
      }
    };
  }

  // UI Management
  showLoginForm() {
    const loginSection = document.getElementById('loginSection');
    const mainContent = document.getElementById('mainContent');
    const userHud = document.getElementById('userHud');
    
    if (loginSection) loginSection.style.display = 'block';
    if (mainContent) mainContent.style.display = 'none';
    if (userHud) userHud.style.display = 'none';
  }

  showMainContent() {
    const loginSection = document.getElementById('loginSection');
    const mainContent = document.getElementById('mainContent');
    const userHud = document.getElementById('userHud');
    
    if (loginSection) loginSection.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (userHud) userHud.style.display = 'block';
  }

  showLoginMessage(message) {
    const msgElement = document.getElementById('loginMsg');
    if (msgElement) {
      msgElement.textContent = message;
      msgElement.style.color = message.includes('success') ? '#00ff00' : '#ffd700';
    }
  }

  updateUserInterface() {
    if (!this.currentUser) return;

    const userData = this.currentUser.data;
    const stats = userData.stats;

    // Update HUD elements
    this.updateElement('currentUser', userData.username);
    this.updateElement('totalXP', stats.totalXP);
    this.updateElement('userLevel', stats.level);
    this.updateElement('currentStreak', stats.currentStreak);
    this.updateElement('overallAccuracy', this.calculateAccuracy(stats));

    // Update XP bar
    this.updateXPBar(stats);

    // Update levels grid
    this.updateLevelsGrid();

    // Update progress stats
    this.updateProgressStats();

    // Update daily quests
    this.questManager.updateDailyQuests();
  }

  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }

  calculateAccuracy(stats) {
    if (stats.totalQuestions === 0) return '0%';
    return Math.round((stats.correctAnswers / stats.totalQuestions) * 100) + '%';
  }

  updateXPBar(stats) {
    const currentLevelXP = (stats.level - 1) * 100;
    const nextLevelXP = stats.level * 100;
    const progressXP = stats.totalXP - currentLevelXP;
    const xpToNext = nextLevelXP - stats.totalXP;

    this.updateElement('xpToNext', Math.max(0, xpToNext));
    
    const fillElement = document.getElementById('xpFill');
    if (fillElement) {
      const percentage = Math.min(100, (progressXP / 100) * 100);
      fillElement.style.width = percentage + '%';
    }
  }

  updateLevelsGrid() {
    const grid = document.getElementById('levelsGrid');
    if (!grid) return;

    const levels = this.getLevelsData();
    grid.innerHTML = '';

    levels.forEach(level => {
      const card = this.createLevelCard(level);
      grid.appendChild(card);
    });
  }

  getLevelsData() {
    return [
      {
        id: 'level1',
        title: 'Level 1-2: Programming Basics',
        icon: '🌱',
        description: 'Variables, strings, and your first Python programs',
        difficulty: 'beginner',
        unlocked: true,
        file: 'levels/level1.html'
      },
      {
        id: 'level2',
        title: 'Level 3-4: Math & Decisions',
        icon: '🔢',
        description: 'Calculations, if/else statements, and logical thinking',
        difficulty: 'beginner',
        unlocked: this.isLevelUnlocked('level1'),
        file: 'levels/level2.html'
      },
      {
        id: 'level3',
        title: 'Level 5-6: Loops & Functions',
        icon: '🔄',
        description: 'Repetition, automation, and code organization',
        difficulty: 'intermediate',
        unlocked: this.isLevelUnlocked('level2'),
        file: 'levels/level3.html'
      },
      {
        id: 'level4',
        title: 'Level 7-8: Interactive & Visual',
        icon: '🎨',
        description: 'User interaction, graphics, and creative programming',
        difficulty: 'intermediate',
        unlocked: this.isLevelUnlocked('level3'),
        file: 'levels/level4.html'
      },
      {
        id: 'level5',
        title: 'Level 9-10: Final Projects',
        icon: '🏆',
        description: 'Complete applications and portfolio projects',
        difficulty: 'advanced',
        unlocked: this.isLevelUnlocked('level4'),
        file: 'levels/level5.html'
      }
    ];
  }

  isLevelUnlocked(levelId) {
    if (!this.currentUser) return false;
    const levelData = this.currentUser.data.progress.levels[levelId];
    return levelData && levelData.completed;
  }

  createLevelCard(level) {
    const card = document.createElement('div');
    card.className = `level-card ${level.unlocked ? '' : 'locked'}`;
    
    const progress = this.getLevelProgress(level.id);
    const progressPercent = Math.round(progress.percentage);
    
    card.innerHTML = `
      <div class="level-icon">${level.icon}</div>
      <div class="level-title">${level.title}</div>
      <div class="level-description">${level.description}</div>
      <div class="level-progress">
        <div class="progress-stats">
          <span>Progress: ${progressPercent}%</span>
          <span>🎯 ${progress.accuracy}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progressPercent}%"></div>
        </div>
        <div class="progress-stats">
          <span>⭐ ${progress.xp} XP</span>
          <span>📝 ${progress.questions} questions</span>
        </div>
      </div>
    `;

    if (level.unlocked) {
      card.onclick = () => this.openLevel(level);
    } else {
      card.onclick = () => this.showLockedMessage();
    }

    return card;
  }

  getLevelProgress(levelId) {
    if (!this.currentUser) {
      return { percentage: 0, accuracy: 0, xp: 0, questions: 0 };
    }

    const levelData = this.currentUser.data.progress.levels[levelId];
    if (!levelData) {
      return { percentage: 0, accuracy: 0, xp: 0, questions: 0 };
    }

    return {
      percentage: levelData.percentage || 0,
      accuracy: levelData.accuracy || 0,
      xp: levelData.xp || 0,
      questions: levelData.totalQuestions || 0
    };
  }

  updateProgressStats() {
    const statsContainer = document.getElementById('progressStats');
    if (!statsContainer || !this.currentUser) return;

    const stats = this.currentUser.data.stats;
    const completedLevels = this.currentUser.data.progress.completedLevels.length;
    const totalLevels = this.getLevelsData().length;

    statsContainer.innerHTML = `
      <div class="stat-card">
        <div class="stat-value">${stats.totalXP}</div>
        <div class="stat-label">Total XP</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${completedLevels}/${totalLevels}</div>
        <div class="stat-label">Levels Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.currentStreak}</div>
        <div class="stat-label">Day Streak</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${this.calculateAccuracy(stats)}</div>
        <div class="stat-label">Overall Accuracy</div>
      </div>
    `;
  }

  openLevel(level) {
    if (this.currentUser) {
      this.currentUser.data.progress.currentLevel = level.id;
      this.saveUserData(this.currentUser.key, this.currentUser.data);
    }
    
    window.location.href = level.file;
  }

  showLockedMessage() {
    this.showAchievement('Complete previous levels to unlock this one!');
  }

  // Achievement System
  showAchievement(message) {
    const notification = document.createElement('div');
    notification.className = 'achievement-notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }, 4000);
  }

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
      
      if (stats.currentStreak % 7 === 0) {
        this.showAchievement(`🔥 ${stats.currentStreak} Day Streak! You're on fire!`);
      }
    } else {
      stats.currentStreak = 1;
    }

    stats.lastLoginDate = today;
    this.saveUserData(this.currentUser.key, this.currentUser.data);
  }
}

// Progress Tracking System
class ProgressTracker {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
  }

  setUser(user) {
    this.currentUser = user;
  }

  clearUser() {
    this.currentUser = null;
  }

  recordAnswer(questionId, isCorrect, topic, difficulty, timeSpent, levelId) {
    if (!this.currentUser) return;

    const answerData = {
      questionId, isCorrect, topic, difficulty, timeSpent, levelId,
      timestamp: new Date().toISOString(),
      sessionId: this.generateSessionId()
    };

    this.storeAnswer(answerData);
    this.updateUserStats(answerData);
    this.updateMistakePatterns(answerData);
    this.saveProgress();
    this.notifyListeners('answerRecorded', answerData);

    return answerData;
  }

  storeAnswer(answerData) {
    const answersKey = `${this.currentUser.key}_answers`;
    let answers = this.getStoredAnswers();
    answers.push(answerData);
    
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
      if (!progress.weakAreas[answerData.topic]) {
        progress.weakAreas[answerData.topic] = 0;
      }
      progress.weakAreas[answerData.topic]++;
    } else {
      if (!progress.strongAreas[answerData.topic]) {
        progress.strongAreas[answerData.topic] = 0;
      }
      progress.strongAreas[answerData.topic]++;
      
      if (progress.weakAreas[answerData.topic] && 
          progress.strongAreas[answerData.topic] > progress.weakAreas[answerData.topic] * 2) {
        delete progress.weakAreas[answerData.topic];
      }
    }
  }

  calculateXP(difficulty, timeSpent) {
    const baseXP = { easy: 10, medium: 20, hard: 35 }[difficulty] || 10;
    
    let multiplier = 1;
    if (timeSpent < 10) multiplier = 1.5;
    else if (timeSpent < 20) multiplier = 1.2;
    
    return Math.round(baseXP * multiplier);
  }

  updateLevelProgress(levelId, questionsCorrect, questionsTotal, xpEarned) {
    if (!this.currentUser) return;

    const levelData = this.currentUser.data.progress.levels[levelId] || {
      questionsCorrect: 0, questionsTotal: 0, attempts: 0, xp: 0,
      accuracy: 0, completed: false, lastAccessed: null
    };

    levelData.questionsCorrect += questionsCorrect;
    levelData.questionsTotal += questionsTotal;
    levelData.attempts += 1;
    levelData.xp += xpEarned;
    levelData.lastAccessed = new Date().toISOString();

    if (levelData.questionsTotal > 0) {
      levelData.accuracy = Math.round((levelData.questionsCorrect / levelData.questionsTotal) * 100);
      levelData.percentage = Math.min(100, (levelData.questionsCorrect / Math.max(10, levelData.questionsTotal)) * 100);
    }

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

  saveProgress() {
    if (!this.currentUser) return;
    try {
      localStorage.setItem(this.currentUser.key, JSON.stringify(this.currentUser.data));
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }

  getWeakAreas() {
    if (!this.currentUser) return [];
    return Object.keys(this.currentUser.data.progress.weakAreas);
  }

  getRecentAnswers(limit = 50) {
    const answers = this.getStoredAnswers();
    return answers.slice(-limit);
  }

  addEventListener(event, callback) {
    this.listeners.push({ event, callback });
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

  generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Adaptive Learning System
class AdaptiveLearning {
  constructor() {
    this.currentUser = null;
    this.progressTracker = null;
  }

  setUser(user) {
    this.currentUser = user;
  }

  clearUser() {
    this.currentUser = null;
  }

  setProgressTracker(tracker) {
    this.progressTracker = tracker;
  }

  getAdaptiveQuestions(allQuestions, targetCount = 10) {
    if (!this.currentUser || !allQuestions.length) {
      return this.shuffleArray(allQuestions).slice(0, targetCount);
    }

    const weakAreas = this.getWeakAreas();
    let selectedQuestions = [];

    // 40% from weak areas
    const weakAreaQuestions = allQuestions.filter(q => 
      weakAreas.includes(q.topic) || weakAreas.includes(q.category)
    );
    const weakCount = Math.floor(targetCount * 0.4);
    selectedQuestions.push(...this.shuffleArray(weakAreaQuestions).slice(0, weakCount));

    // 60% regular questions
    const remainingQuestions = allQuestions.filter(q => 
      !selectedQuestions.some(sq => sq.id === q.id)
    );
    const regularCount = targetCount - selectedQuestions.length;
    selectedQuestions.push(...this.shuffleArray(remainingQuestions).slice(0, regularCount));

    // Ensure we have enough questions
    while (selectedQuestions.length < targetCount && selectedQuestions.length < allQuestions.length) {
      const remaining = allQuestions.filter(q => 
        !selectedQuestions.some(sq => sq.id === q.id)
      );
      if (remaining.length === 0) break;
      selectedQuestions.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    return this.shuffleArray(selectedQuestions).slice(0, targetCount);
  }

  getWeakAreas() {
    if (!this.progressTracker) return [];
    return this.progressTracker.getWeakAreas();
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Quest Management System
class QuestManager {
  constructor() {
    this.currentUser = null;
    this.progressTracker = null;
    this.questTemplates = [
      {
        id: 'accuracy_master', title: 'Accuracy Master',
        description: 'Answer 5 questions correctly in a row',
        icon: '🎯', type: 'accuracy', target: 5, reward: 100
      },
      {
        id: 'speed_demon', title: 'Speed Demon',
        description: 'Answer 10 questions in under 5 minutes',
        icon: '⚡', type: 'speed', target: 10, reward: 150
      },
      {
        id: 'explorer', title: 'Knowledge Explorer',
        description: 'Try 3 different topics today',
        icon: '🗺️', type: 'exploration', target: 3, reward: 120
      },
      {
        id: 'consistent', title: 'Consistency Champion',
        description: 'Study for at least 15 minutes',
        icon: '⏰', type: 'time', target: 15, reward: 75
      }
    ];
  }

  setUser(user) {
    this.currentUser = user;
    this.updateDailyQuests();
  }

  clearUser() {
    this.currentUser = null;
  }

  setProgressTracker(tracker) {
    this.progressTracker = tracker;
  }

  updateDailyQuests() {
    if (!this.currentUser) return;

    const today = new Date().toDateString();
    const questData = this.currentUser.data.quests;

    if (questData.lastQuestDate !== today) {
      this.generateDailyQuests();
      questData.lastQuestDate = today;
      this.saveQuestData();
    }

    this.updateQuestDisplay();
  }

  generateDailyQuests() {
    if (!this.currentUser) return;

    const questData = this.currentUser.data.quests;
    const selectedQuests = this.shuffleArray(this.questTemplates).slice(0, 3);
    
    questData.daily = selectedQuests.map(template => ({
      ...template,
      progress: 0,
      completed: false,
      startTime: Date.now()
    }));

    this.resetDailyProgress();
  }

  resetDailyProgress() {
    if (!this.currentUser) return;
    this.currentUser.data.quests.dailyProgress = {
      studyTime: 0, questionsAnswered: 0, topicsExplored: new Set(),
      accuracyStreak: 0, speedQuestions: 0
    };
  }

  updateQuestProgress(type, value = 1, metadata = {}) {
    if (!this.currentUser) return;

    const questData = this.currentUser.data.quests;
    let questsCompleted = false;

    questData.daily.forEach(quest => {
      if (quest.type === type && !quest.completed) {
        const oldProgress = quest.progress;
        quest.progress = Math.min(quest.progress + value, quest.target);
        
        if (quest.progress >= quest.target && oldProgress < quest.target) {
          quest.completed = true;
          this.completeQuest(quest);
          questsCompleted = true;
        }
      }
    });

    if (questsCompleted) {
      this.updateQuestDisplay();
    }

    this.saveQuestData();
  }

  completeQuest(quest) {
    if (!this.currentUser) return;

    this.currentUser.data.stats.totalXP += quest.reward;
    this.currentUser.data.stats.totalScore += quest.reward;

    this.currentUser.data.quests.completed.push({
      ...quest,
      completedAt: new Date().toISOString()
    });

    if (window.app) {
      window.app.showAchievement(`🎯 Quest Complete: ${quest.title}! +${quest.reward} XP`);
    }

    this.saveQuestData();
  }

  updateQuestDisplay() {
    const questsContainer = document.getElementById('dailyQuests');
    if (!questsContainer || !this.currentUser) return;

    const questData = this.currentUser.data.quests;
    questsContainer.innerHTML = '';

    questData.daily.forEach(quest => {
      const questCard = this.createQuestCard(quest);
      questsContainer.appendChild(questCard);
    });
  }

  createQuestCard(quest) {
    const card = document.createElement('div');
    card.className = `quest-card ${quest.completed ? 'completed' : ''}`;
    
    const progressPercent = Math.round((quest.progress / quest.target) * 100);
    
    card.innerHTML = `
      <div class="quest-header">
        <span class="quest-icon">${quest.icon}</span>
        <span class="quest-title">${quest.title}</span>
        ${quest.completed ? '<span style="color: #00ff00;">✅</span>' : ''}
      </div>
      <div class="quest-description">${quest.description}</div>
      <div class="quest-progress">
        Progress: ${quest.progress}/${quest.target}
        <div class="quest-progress-bar">
          <div class="quest-progress-fill" style="width: ${progressPercent}%"></div>
        </div>
      </div>
      <div class="quest-reward">${quest.completed ? 'Completed!' : `+${quest.reward} XP`}</div>
    `;

    return card;
  }

  saveQuestData() {
    if (!this.currentUser) return;
    try {
      localStorage.setItem(this.currentUser.key, JSON.stringify(this.currentUser.data));
    } catch (error) {
      console.error('Error saving quest data:', error);
    }
  }

  trackAnswer(isCorrect, topic, difficulty, timeSpent) {
    this.updateQuestProgress('volume', 1);
    
    if (isCorrect) {
      this.updateQuestProgress('accuracy', 1);
    }
    
    if (topic) {
      this.updateQuestProgress('exploration', 0, { topic });
    }
    
    if (timeSpent) {
      this.updateQuestProgress('time', timeSpent / 60, { timeSpent: timeSpent / 60 });
    }
  }

  trackLevelCompletion(accuracy) {
    if (accuracy === 100) {
      this.updateQuestProgress('perfect', 1);
    }
  }

  trackStudyTime(minutes) {
    this.updateQuestProgress('time', minutes, { timeSpent: minutes });
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Global functions
function initializeApp() {
  window.app = new CodeQuestApp();
  window.app.initialize();
}

function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  window.app.login(username, password);
}

function logout() {
  window.app.logout();
}

function createStars() {
  const starsContainer = document.getElementById('stars');
  if (!starsContainer) return;
  
  for (let i = 0; i < 100; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.width = star.style.height = Math.random() * 3 + 1 + 'px';
    star.style.animationDelay = Math.random() * 2 + 's';
    starsContainer.appendChild(star);
  }
}

// Export classes for use in other modules
window.CodeQuestApp = CodeQuestApp;
window.ProgressTracker = ProgressTracker;
window.AdaptiveLearning = AdaptiveLearning;
window.QuestManager = QuestManager;
</parameter>