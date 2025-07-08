// Code Quest - Adaptive Learning System

class AdaptiveLearning {
  constructor() {
    this.currentUser = null;
    this.adaptationRules = this.initializeAdaptationRules();
  }

  setUser(user) {
    this.currentUser = user;
  }

  clearUser() {
    this.currentUser = null;
  }

  initializeAdaptationRules() {
    return {
      // Difficulty adjustment rules
      difficulty: {
        increaseThreshold: 3, // consecutive correct answers
        decreaseThreshold: 2, // consecutive incorrect answers
        maxDifficulty: 'hard',
        minDifficulty: 'easy'
      },
      
      // Topic focus rules
      topicFocus: {
        weakAreaWeight: 0.4, // 40% questions from weak areas
        regularWeight: 0.6,  // 60% regular questions
        minWeakAreaQuestions: 2
      },
      
      // Hint system rules
      hints: {
        showAfterMistakes: 2,
        progressiveHints: true,
        maxHintsPerQuestion: 3
      },
      
      // Review system rules
      review: {
        reviewAfterDays: 3,
        reviewProbability: 0.3,
        maxReviewQuestions: 5
      }
    };
  }

  // Main adaptive question selection
  getAdaptiveQuestions(allQuestions, targetCount = 10) {
    if (!this.currentUser || !allQuestions.length) {
      return this.shuffleArray(allQuestions).slice(0, targetCount);
    }

    const weakAreas = this.getWeakAreas();
    const recentPerformance = this.getRecentPerformance();
    const currentDifficulty = this.getCurrentDifficulty(recentPerformance);

    let selectedQuestions = [];

    // 1. Add questions from weak areas
    const weakAreaQuestions = this.selectWeakAreaQuestions(allQuestions, weakAreas, targetCount);
    selectedQuestions.push(...weakAreaQuestions);

    // 2. Add review questions
    const reviewQuestions = this.selectReviewQuestions(allQuestions, targetCount - selectedQuestions.length);
    selectedQuestions.push(...reviewQuestions);

    // 3. Fill remaining with difficulty-appropriate questions
    const remainingCount = targetCount - selectedQuestions.length;
    if (remainingCount > 0) {
      const regularQuestions = this.selectRegularQuestions(
        allQuestions, 
        selectedQuestions, 
        currentDifficulty, 
        remainingCount
      );
      selectedQuestions.push(...regularQuestions);
    }

    // 4. Ensure minimum count
    while (selectedQuestions.length < targetCount && selectedQuestions.length < allQuestions.length) {
      const remaining = allQuestions.filter(q => 
        !selectedQuestions.some(sq => sq.id === q.id)
      );
      if (remaining.length === 0) break;
      selectedQuestions.push(remaining[Math.floor(Math.random() * remaining.length)]);
    }

    return this.shuffleArray(selectedQuestions).slice(0, targetCount);
  }

  selectWeakAreaQuestions(allQuestions, weakAreas, targetCount) {
    const weakAreaCount = Math.floor(targetCount * this.adaptationRules.topicFocus.weakAreaWeight);
    const weakQuestions = allQuestions.filter(q => 
      weakAreas.includes(q.topic) || weakAreas.includes(q.category)
    );

    return this.shuffleArray(weakQuestions).slice(0, weakAreaCount);
  }

  selectReviewQuestions(allQuestions, maxCount) {
    if (!this.currentUser) return [];

    const reviewCandidates = this.getReviewCandidates();
    const reviewQuestions = allQuestions.filter(q => 
      reviewCandidates.includes(q.id)
    );

    const reviewCount = Math.min(
      maxCount, 
      this.adaptationRules.review.maxReviewQuestions,
      reviewQuestions.length
    );

    return this.shuffleArray(reviewQuestions).slice(0, reviewCount);
  }

  selectRegularQuestions(allQuestions, excludeQuestions, difficulty, count) {
    const excludeIds = excludeQuestions.map(q => q.id);
    const availableQuestions = allQuestions.filter(q => 
      !excludeIds.includes(q.id)
    );

    // Filter by difficulty
    const difficultyQuestions = availableQuestions.filter(q => 
      q.difficulty === difficulty
    );

    // If not enough questions of target difficulty, include adjacent difficulties
    let finalQuestions = difficultyQuestions;
    if (finalQuestions.length < count) {
      const adjacentQuestions = availableQuestions.filter(q => 
        this.isAdjacentDifficulty(q.difficulty, difficulty)
      );
      finalQuestions = [...finalQuestions, ...adjacentQuestions];
    }

    // If still not enough, include all remaining
    if (finalQuestions.length < count) {
      finalQuestions = availableQuestions;
    }

    return this.shuffleArray(finalQuestions).slice(0, count);
  }

  // Performance Analysis
  getRecentPerformance(limit = 10) {
    if (!window.progressTracker) return [];
    
    const recentAnswers = window.progressTracker.getRecentAnswers(limit);
    return recentAnswers.map(answer => ({
      isCorrect: answer.isCorrect,
      topic: answer.topic,
      difficulty: answer.difficulty,
      timeSpent: answer.timeSpent,
      timestamp: answer.timestamp
    }));
  }

  getCurrentDifficulty(recentPerformance) {
    if (!recentPerformance.length) return 'easy';

    const recentCorrect = recentPerformance.slice(-5).filter(p => p.isCorrect).length;
    const recentIncorrect = recentPerformance.slice(-5).filter(p => !p.isCorrect).length;

    // Increase difficulty if performing well
    if (recentCorrect >= this.adaptationRules.difficulty.increaseThreshold) {
      return this.increaseDifficulty(this.getLastDifficulty(recentPerformance));
    }

    // Decrease difficulty if struggling
    if (recentIncorrect >= this.adaptationRules.difficulty.decreaseThreshold) {
      return this.decreaseDifficulty(this.getLastDifficulty(recentPerformance));
    }

    return this.getLastDifficulty(recentPerformance) || 'easy';
  }

  getLastDifficulty(recentPerformance) {
    if (!recentPerformance.length) return 'easy';
    return recentPerformance[recentPerformance.length - 1].difficulty || 'easy';
  }

  increaseDifficulty(currentDifficulty) {
    const levels = ['easy', 'medium', 'hard'];
    const currentIndex = levels.indexOf(currentDifficulty);
    return levels[Math.min(currentIndex + 1, levels.length - 1)];
  }

  decreaseDifficulty(currentDifficulty) {
    const levels = ['easy', 'medium', 'hard'];
    const currentIndex = levels.indexOf(currentDifficulty);
    return levels[Math.max(currentIndex - 1, 0)];
  }

  isAdjacentDifficulty(questionDifficulty, targetDifficulty) {
    const levels = ['easy', 'medium', 'hard'];
    const questionIndex = levels.indexOf(questionDifficulty);
    const targetIndex = levels.indexOf(targetDifficulty);
    return Math.abs(questionIndex - targetIndex) === 1;
  }

  // Weak Areas Analysis
  getWeakAreas() {
    if (!window.progressTracker) return [];
    return window.progressTracker.getWeakAreas();
  }

  // Review System
  getReviewCandidates() {
    if (!window.progressTracker) return [];

    const answers = window.progressTracker.getRecentAnswers(100);
    const incorrectAnswers = answers.filter(a => !a.isCorrect);
    
    // Find questions that were answered incorrectly and are due for review
    const reviewCandidates = incorrectAnswers
      .filter(a => this.isDueForReview(a.timestamp))
      .map(a => a.questionId);

    return [...new Set(reviewCandidates)]; // Remove duplicates
  }

  isDueForReview(timestamp) {
    const answerDate = new Date(timestamp);
    const now = new Date();
    const daysDiff = (now - answerDate) / (1000 * 60 * 60 * 24);
    
    return daysDiff >= this.adaptationRules.review.reviewAfterDays &&
           Math.random() < this.adaptationRules.review.reviewProbability;
  }

  // Hint System
  shouldShowHint(questionId, mistakeCount) {
    return mistakeCount >= this.adaptationRules.hints.showAfterMistakes;
  }

  getProgressiveHint(questionId, hintLevel, question) {
    if (!this.adaptationRules.hints.progressiveHints) {
      return question.hint || "Think about the key concepts involved.";
    }

    const hints = this.generateProgressiveHints(question);
    return hints[Math.min(hintLevel, hints.length - 1)];
  }

  generateProgressiveHints(question) {
    const baseHint = question.hint || "Think about the key concepts involved.";
    
    return [
      "Take your time and think through this step by step.",
      baseHint,
      "Consider reviewing the explanation for similar questions.",
      question.explanation ? `Hint: ${question.explanation.substring(0, 50)}...` : baseHint
    ];
  }

  // Adaptive Feedback
  getAdaptiveFeedback(isCorrect, consecutiveCorrect, consecutiveIncorrect, topic) {
    if (isCorrect) {
      if (consecutiveCorrect >= 3) {
        return "🚀 You're on fire! Great mastery of these concepts!";
      } else if (this.getWeakAreas().includes(topic)) {
        return "💪 Excellent! You're improving in this area!";
      } else {
        return "✅ Well done! Keep up the great work!";
      }
    } else {
      if (consecutiveIncorrect >= 2) {
        return "📚 Let's slow down and review this topic more carefully.";
      } else if (this.getWeakAreas().includes(topic)) {
        return "🎯 This is a challenging area for you. Take your time!";
      } else {
        return "❌ Not quite right. Let's learn from this mistake!";
      }
    }
  }

  // Learning Path Adaptation
  getNextRecommendedLevel(currentLevel, performance) {
    if (!this.currentUser) return null;

    const completedLevels = this.currentUser.data.progress.completedLevels;
    const levelStats = this.currentUser.data.progress.levels[currentLevel];

    // If current level not completed with good accuracy, recommend practice
    if (!levelStats || levelStats.accuracy < 70) {
      return {
        type: 'practice',
        level: currentLevel,
        reason: 'Improve accuracy before moving forward'
      };
    }

    // If weak areas exist, recommend targeted practice
    const weakAreas = this.getWeakAreas();
    if (weakAreas.length > 0) {
      return {
        type: 'review',
        topics: weakAreas,
        reason: 'Strengthen weak areas'
      };
    }

    // Recommend next level
    const nextLevel = this.getNextUnlockedLevel(currentLevel);
    if (nextLevel) {
      return {
        type: 'advance',
        level: nextLevel,
        reason: 'Ready for next challenge'
      };
    }

    return null;
  }

  getNextUnlockedLevel(currentLevel) {
    // This would be implemented based on your level progression logic
    const levelOrder = ['level1', 'level2', 'level3', 'level4', 'level5'];
    const currentIndex = levelOrder.indexOf(currentLevel);
    
    if (currentIndex >= 0 && currentIndex < levelOrder.length - 1) {
      return levelOrder[currentIndex + 1];
    }
    
    return null;
  }

  // Utility Methods
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Analytics and Reporting
  getAdaptationReport() {
    if (!this.currentUser) return null;

    const weakAreas = this.getWeakAreas();
    const recentPerformance = this.getRecentPerformance();
    const currentDifficulty = this.getCurrentDifficulty(recentPerformance);

    return {
      weakAreas,
      currentDifficulty,
      recentAccuracy: this.calculateRecentAccuracy(recentPerformance),
      recommendedFocus: weakAreas.length > 0 ? weakAreas[0] : null,
      adaptationActive: weakAreas.length > 0 || recentPerformance.length > 0
    };
  }

  calculateRecentAccuracy(recentPerformance) {
    if (!recentPerformance.length) return 0;
    const correct = recentPerformance.filter(p => p.isCorrect).length;
    return Math.round((correct / recentPerformance.length) * 100);
  }
}

// Initialize global adaptive learning system
window.adaptiveLearning = new AdaptiveLearning();

// Export for use in other modules
window.AdaptiveLearning = AdaptiveLearning;