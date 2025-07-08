// Code Quest - Daily Quests System

class QuestManager {
  constructor() {
    this.currentUser = null;
    this.questTemplates = this.initializeQuestTemplates();
  }

  setUser(user) {
    this.currentUser = user;
    this.updateDailyQuests();
  }

  clearUser() {
    this.currentUser = null;
  }

  initializeQuestTemplates() {
    return [
      {
        id: 'accuracy_master',
        title: 'Accuracy Master',
        description: 'Answer 5 questions correctly in a row',
        icon: '🎯',
        type: 'accuracy',
        target: 5,
        reward: 100,
        difficulty: 'medium'
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Answer 10 questions in under 5 minutes',
        icon: '⚡',
        type: 'speed',
        target: 10,
        reward: 150,
        difficulty: 'hard'
      },
      {
        id: 'explorer',
        title: 'Knowledge Explorer',
        description: 'Try 3 different topics today',
        icon: '🗺️',
        type: 'exploration',
        target: 3,
        reward: 120,
        difficulty: 'easy'
      },
      {
        id: 'reviewer',
        title: 'Mistake Corrector',
        description: 'Improve on 3 previous mistakes',
        icon: '🔄',
        type: 'review',
        target: 3,
        reward: 80,
        difficulty: 'medium'
      },
      {
        id: 'consistent',
        title: 'Consistency Champion',
        description: 'Study for at least 15 minutes',
        icon: '⏰',
        type: 'time',
        target: 15,
        reward: 75,
        difficulty: 'easy'
      },
      {
        id: 'perfectionist',
        title: 'Perfectionist',
        description: 'Complete a level with 100% accuracy',
        icon: '💯',
        type: 'perfect',
        target: 1,
        reward: 200,
        difficulty: 'hard'
      },
      {
        id: 'learner',
        title: 'Dedicated Learner',
        description: 'Answer 20 questions today',
        icon: '📚',
        type: 'volume',
        target: 20,
        reward: 90,
        difficulty: 'medium'
      },
      {
        id: 'challenger',
        title: 'Challenge Seeker',
        description: 'Complete 2 hard difficulty questions',
        icon: '🔥',
        type: 'difficulty',
        target: 2,
        reward: 110,
        difficulty: 'hard'
      }
    ];
  }

  updateDailyQuests() {
    if (!this.currentUser) return;

    const today = new Date().toDateString();
    const questData = this.currentUser.data.quests;

    // Check if quests need to be refreshed
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
    
    // Select 3-4 quests for today based on user's progress and preferences
    const selectedQuests = this.selectQuestsForUser();
    
    questData.daily = selectedQuests.map(template => ({
      ...template,
      progress: 0,
      completed: false,
      startTime: Date.now()
    }));

    // Reset daily progress tracking
    this.resetDailyProgress();
  }

  selectQuestsForUser() {
    const userLevel = this.currentUser.data.stats.level;
    const weakAreas = this.currentUser.data.progress.weakAreas;
    const recentPerformance = this.getRecentPerformance();

    let availableQuests = [...this.questTemplates];
    let selectedQuests = [];

    // Always include one easy quest
    const easyQuests = availableQuests.filter(q => q.difficulty === 'easy');
    if (easyQuests.length > 0) {
      selectedQuests.push(this.selectRandomQuest(easyQuests));
      availableQuests = availableQuests.filter(q => !selectedQuests.includes(q));
    }

    // Add quest based on weak areas
    if (Object.keys(weakAreas).length > 0) {
      const reviewQuest = availableQuests.find(q => q.type === 'review');
      if (reviewQuest) {
        selectedQuests.push(reviewQuest);
        availableQuests = availableQuests.filter(q => q.id !== reviewQuest.id);
      }
    }

    // Add quest based on recent performance
    if (recentPerformance.accuracy < 70) {
      const accuracyQuest = availableQuests.find(q => q.type === 'accuracy');
      if (accuracyQuest) {
        selectedQuests.push(accuracyQuest);
        availableQuests = availableQuests.filter(q => q.id !== accuracyQuest.id);
      }
    }

    // Fill remaining slots with random appropriate quests
    while (selectedQuests.length < 3 && availableQuests.length > 0) {
      const appropriateQuests = availableQuests.filter(q => 
        this.isQuestAppropriate(q, userLevel)
      );
      
      if (appropriateQuests.length > 0) {
        const quest = this.selectRandomQuest(appropriateQuests);
        selectedQuests.push(quest);
        availableQuests = availableQuests.filter(q => q.id !== quest.id);
      } else {
        break;
      }
    }

    return selectedQuests;
  }

  isQuestAppropriate(quest, userLevel) {
    // Adjust quest difficulty based on user level
    if (userLevel <= 2 && quest.difficulty === 'hard') return false;
    if (userLevel <= 1 && quest.difficulty === 'medium') return false;
    return true;
  }

  selectRandomQuest(quests) {
    return quests[Math.floor(Math.random() * quests.length)];
  }

  getRecentPerformance() {
    if (!window.progressTracker) return { accuracy: 0, questionsAnswered: 0 };

    const recentAnswers = window.progressTracker.getRecentAnswers(20);
    const correct = recentAnswers.filter(a => a.isCorrect).length;
    
    return {
      accuracy: recentAnswers.length > 0 ? Math.round((correct / recentAnswers.length) * 100) : 0,
      questionsAnswered: recentAnswers.length
    };
  }

  // Quest Progress Tracking
  updateQuestProgress(type, value = 1, metadata = {}) {
    if (!this.currentUser) return;

    const questData = this.currentUser.data.quests;
    let questsCompleted = false;

    questData.daily.forEach(quest => {
      if (quest.type === type && !quest.completed) {
        const oldProgress = quest.progress;
        quest.progress = Math.min(quest.progress + value, quest.target);
        
        // Check for completion
        if (quest.progress >= quest.target && oldProgress < quest.target) {
          quest.completed = true;
          this.completeQuest(quest);
          questsCompleted = true;
        }
      }
    });

    // Update specific quest types with metadata
    this.updateSpecificQuestTypes(type, metadata);

    if (questsCompleted) {
      this.updateQuestDisplay();
    }

    this.saveQuestData();
  }

  updateSpecificQuestTypes(type, metadata) {
    const questData = this.currentUser.data.quests;

    switch (type) {
      case 'time':
        // Track study time
        if (!questData.dailyProgress) questData.dailyProgress = {};
        if (!questData.dailyProgress.studyTime) questData.dailyProgress.studyTime = 0;
        questData.dailyProgress.studyTime += metadata.timeSpent || 1;
        
        // Update time-based quests
        questData.daily.forEach(quest => {
          if (quest.type === 'time' && !quest.completed) {
            quest.progress = Math.min(questData.dailyProgress.studyTime, quest.target);
            if (quest.progress >= quest.target) {
              quest.completed = true;
              this.completeQuest(quest);
            }
          }
        });
        break;

      case 'exploration':
        // Track topics explored
        if (!questData.dailyProgress) questData.dailyProgress = {};
        if (!questData.dailyProgress.topicsExplored) questData.dailyProgress.topicsExplored = new Set();
        
        if (metadata.topic) {
          questData.dailyProgress.topicsExplored.add(metadata.topic);
          
          questData.daily.forEach(quest => {
            if (quest.type === 'exploration' && !quest.completed) {
              quest.progress = questData.dailyProgress.topicsExplored.size;
              if (quest.progress >= quest.target) {
                quest.completed = true;
                this.completeQuest(quest);
              }
            }
          });
        }
        break;

      case 'difficulty':
        // Track hard questions completed
        if (metadata.difficulty === 'hard') {
          questData.daily.forEach(quest => {
            if (quest.type === 'difficulty' && !quest.completed) {
              quest.progress = Math.min(quest.progress + 1, quest.target);
              if (quest.progress >= quest.target) {
                quest.completed = true;
                this.completeQuest(quest);
              }
            }
          });
        }
        break;

      case 'volume':
        // Track total questions answered
        if (!questData.dailyProgress) questData.dailyProgress = {};
        if (!questData.dailyProgress.questionsAnswered) questData.dailyProgress.questionsAnswered = 0;
        questData.dailyProgress.questionsAnswered++;
        
        questData.daily.forEach(quest => {
          if (quest.type === 'volume' && !quest.completed) {
            quest.progress = questData.dailyProgress.questionsAnswered;
            if (quest.progress >= quest.target) {
              quest.completed = true;
              this.completeQuest(quest);
            }
          }
        });
        break;
    }
  }

  completeQuest(quest) {
    if (!this.currentUser) return;

    // Award XP
    this.currentUser.data.stats.totalXP += quest.reward;
    this.currentUser.data.stats.totalScore += quest.reward;

    // Add to completed quests
    this.currentUser.data.quests.completed.push({
      ...quest,
      completedAt: new Date().toISOString()
    });

    // Show achievement notification
    if (window.codeQuest) {
      window.codeQuest.showAchievement(`🎯 Quest Complete: ${quest.title}! +${quest.reward} XP`);
    }

    // Check for quest-related achievements
    this.checkQuestAchievements();

    this.saveQuestData();
  }

  checkQuestAchievements() {
    const completedCount = this.currentUser.data.quests.completed.length;
    const achievements = this.currentUser.data.stats.achievements;

    // Quest completion milestones
    const milestones = [
      { count: 5, achievement: '🏆 Quest Novice - 5 quests completed' },
      { count: 25, achievement: '🏆 Quest Warrior - 25 quests completed' },
      { count: 50, achievement: '🏆 Quest Master - 50 quests completed' },
      { count: 100, achievement: '🏆 Quest Legend - 100 quests completed' }
    ];

    milestones.forEach(milestone => {
      if (completedCount >= milestone.count && !achievements.includes(milestone.achievement)) {
        achievements.push(milestone.achievement);
        if (window.codeQuest) {
          window.codeQuest.showAchievement(milestone.achievement);
        }
      }
    });

    // Daily quest completion streak
    const today = new Date().toDateString();
    const todayCompleted = this.currentUser.data.quests.daily.filter(q => q.completed).length;
    
    if (todayCompleted >= 3) {
      const streakAchievement = '🔥 Daily Quest Master - All quests completed today';
      if (!achievements.includes(streakAchievement)) {
        achievements.push(streakAchievement);
        if (window.codeQuest) {
          window.codeQuest.showAchievement(streakAchievement);
        }
      }
    }
  }

  resetDailyProgress() {
    if (!this.currentUser) return;
    
    this.currentUser.data.quests.dailyProgress = {
      studyTime: 0,
      questionsAnswered: 0,
      topicsExplored: new Set(),
      accuracyStreak: 0,
      speedQuestions: 0
    };
  }

  // UI Updates
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

  // Data Persistence
  saveQuestData() {
    if (!this.currentUser) return;

    try {
      // Convert Set to Array for storage
      if (this.currentUser.data.quests.dailyProgress?.topicsExplored instanceof Set) {
        this.currentUser.data.quests.dailyProgress.topicsExplored = 
          Array.from(this.currentUser.data.quests.dailyProgress.topicsExplored);
      }

      localStorage.setItem(this.currentUser.key, JSON.stringify(this.currentUser.data));
    } catch (error) {
      console.error('Error saving quest data:', error);
    }
  }

  // Analytics
  getQuestStatistics() {
    if (!this.currentUser) return null;

    const questData = this.currentUser.data.quests;
    const totalCompleted = questData.completed.length;
    const todayCompleted = questData.daily.filter(q => q.completed).length;
    const todayTotal = questData.daily.length;

    return {
      totalQuestsCompleted: totalCompleted,
      todayProgress: `${todayCompleted}/${todayTotal}`,
      completionRate: todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0,
      totalXPFromQuests: questData.completed.reduce((sum, q) => sum + q.reward, 0)
    };
  }

  // Public API for other modules
  trackAnswer(isCorrect, topic, difficulty, timeSpent) {
    // Track various quest types based on answer
    this.updateQuestProgress('volume', 1);
    
    if (isCorrect) {
      this.updateQuestProgress('accuracy', 1);
    }
    
    if (difficulty === 'hard' && isCorrect) {
      this.updateQuestProgress('difficulty', 1, { difficulty });
    }
    
    if (topic) {
      this.updateQuestProgress('exploration', 0, { topic });
    }
    
    if (timeSpent) {
      this.updateQuestProgress('time', timeSpent / 60, { timeSpent: timeSpent / 60 }); // Convert to minutes
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
}

// Initialize global quest manager
window.questManager = new QuestManager();

// Export for use in other modules
window.QuestManager = QuestManager;