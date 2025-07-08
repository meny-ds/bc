// Code Quest - Core Application Logic

class CodeQuestApp {
  constructor() {
    this.currentUser = null;
    this.isInitialized = false;
  }

  // Initialize the application
  async initialize() {
    if (this.isInitialized) return;
    
    try {
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
        // Validate input
        if (!username || !password) {
          this.showLoginMessage('Please enter both username and password.');
          return false;
        }
        
        if (username.length < 3) {
          this.showLoginMessage('Username must be at least 3 characters.');
          return false;
        }
      }

      // Create user key
      const userKey = `cq_user_${username}_${btoa(password)}`;
      
      // Load or create user data
      let userData = this.loadUserData(userKey);
      if (!userData) {
        userData = this.createNewUser(username);
        this.saveUserData(userKey, userData);
      }

      // Set current user
      this.currentUser = {
        username,
        password,
        key: userKey,
        data: userData
      };

      // Store session
      if (!isAutoLogin) {
        this.setStoredSession(username, password);
      }

      // Update UI
      this.showMainContent();
      this.updateUserInterface();
      
      // Initialize subsystems
      window.progressTracker.setUser(this.currentUser);
      window.questManager.setUser(this.currentUser);
      window.adaptiveLearning.setUser(this.currentUser);

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
      
      // Reset subsystems
      window.progressTracker.clearUser();
      window.questManager.clearUser();
      window.adaptiveLearning.clearUser();
      
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
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('userHud').style.display = 'none';
  }

  showMainContent() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('userHud').style.display = 'block';
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

    // Update HUD
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
        unlocked: false,
        file: 'levels/level2.html'
      },
      {
        id: 'level3',
        title: 'Level 5-6: Loops & Functions',
        icon: '🔄',
        description: 'Repetition, automation, and code organization',
        difficulty: 'intermediate',
        unlocked: false,
        file: 'levels/level3.html'
      },
      {
        id: 'level4',
        title: 'Level 7-8: Interactive & Visual',
        icon: '🎨',
        description: 'User interaction, graphics, and creative programming',
        difficulty: 'intermediate',
        unlocked: false,
        file: 'levels/level4.html'
      },
      {
        id: 'level5',
        title: 'Level 9-10: Final Projects',
        icon: '🏆',
        description: 'Complete applications and portfolio projects',
        difficulty: 'advanced',
        unlocked: false,
        file: 'levels/level5.html'
      }
    ];
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
    // Store current level
    if (this.currentUser) {
      this.currentUser.data.progress.currentLevel = level.id;
      this.saveUserData(this.currentUser.key, this.currentUser.data);
    }
    
    // Navigate to level
    window.location.href = level.file;
  }

  showLockedMessage() {
    alert('Complete previous levels to unlock this one!');
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

  // Utility Methods
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

// Global functions
function initializeApp() {
  window.codeQuest = new CodeQuestApp();
  window.codeQuest.initialize();
}

function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  window.codeQuest.login(username, password);
}

function logout() {
  window.codeQuest.logout();
}

// Stars animation
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

// Export for use in other modules
window.CodeQuestApp = CodeQuestApp;