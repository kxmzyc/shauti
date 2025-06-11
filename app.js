/**
 * 主应用模块 - 协调各个模块的工作
 */
const QuizApp = (function() {
    // DOM 元素引用
    const elements = {
        parseButton: document.getElementById('parseButton'),
        questionInput: document.getElementById('questionInput'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        normalModeBtn: document.getElementById('normalModeBtn'),
        errorBookBtn: document.getElementById('errorBookBtn'),
        floatingErrorBookBtn: document.getElementById('floatingErrorBookBtn'),
        backToNormalBtn: document.getElementById('backToNormalBtn'),
        backToNormalFromListBtn: document.getElementById('backToNormalFromListBtn'),
        backToCollectionListBtn: document.getElementById('backToCollectionListBtn'),
        saveSessionErrorsBtn: document.getElementById('saveSessionErrorsBtn'),
        saveAndViewErrorsBtn: document.getElementById('saveAndViewErrorsBtn'),
        ignoreAndContinueBtn: document.getElementById('ignoreAndContinueBtn'),
        backToInputBtn: document.getElementById('backToInputBtn'),
        backToInputFromPromptBtn: document.getElementById('backToInputFromPromptBtn')
    };
    
    // 原始题目数据
    let originalQuestions = [];
    
    // 是否已经完成答题
    let isQuizCompleted = false;
    
    // 保存练习状态
    let savedQuizState = null;

    /**
     * 初始化应用
     */
    function init() {
        // 初始化错题本
        ErrorBook.init();
        
        // 重置原始题目数据
        originalQuestions = [];
        
        // 重置完成状态
        isQuizCompleted = false;
        
        // 清除保存的练习状态
        savedQuizState = null;
        
        // 确保错题本空提示是隐藏的
        Renderer.hideEmptyErrorBook();
        
        // 确保答题完成提示是隐藏的
        Renderer.hideQuizCompletePrompt();
        
        // 绑定事件处理程序
        bindEvents();
        
        // 更新错题本计数
        Renderer.updateErrorBookCount();
        
        // 确保一开始显示输入界面
        document.querySelector('.input-section').classList.remove('hidden');
        document.querySelector('.quiz-section').classList.add('hidden');
        document.querySelector('.collection-list-section').classList.add('hidden');
        document.querySelector('.error-book-empty').classList.add('hidden');
        document.querySelector('.quiz-complete-prompt').classList.add('hidden');
        document.querySelector('.error-practice-actions').classList.add('hidden');
        
        // 强制隐藏可能导致问题的元素
        const quizCompletePrompt = document.querySelector('.quiz-complete-prompt');
        if (quizCompletePrompt) {
            quizCompletePrompt.style.display = 'none';
            quizCompletePrompt.classList.add('hidden');
        }
    }

    /**
     * 绑定事件处理程序
     */
    function bindEvents() {
        // 解析按钮点击事件
        elements.parseButton.addEventListener('click', handleParseQuestions);
        
        // 上一题按钮点击事件
        elements.prevBtn.addEventListener('click', handlePrevQuestion);
        
        // 下一题按钮点击事件
        elements.nextBtn.addEventListener('click', handleNextQuestion);
        
        // 正常模式按钮点击事件
        elements.normalModeBtn.addEventListener('click', switchToNormalMode);
        
        // 错题本按钮点击事件
        elements.errorBookBtn.addEventListener('click', switchToErrorBookMode);
        
        // 浮动错题本按钮点击事件
        elements.floatingErrorBookBtn.addEventListener('click', switchToErrorBookMode);
        
        // 返回正常模式按钮点击事件
        elements.backToNormalBtn.addEventListener('click', switchToNormalMode);
        
        // 从列表返回正常模式按钮点击事件
        elements.backToNormalFromListBtn.addEventListener('click', switchToNormalMode);
        
        // 返回错题集列表按钮点击事件
        elements.backToCollectionListBtn.addEventListener('click', () => {
            ErrorBook.setCollectionListMode(true);
            ErrorBook.setCurrentCollection(null);
            Renderer.showCollectionList();
        });
        
        // 保存会话错题按钮点击事件
        elements.saveSessionErrorsBtn.addEventListener('click', saveSessionErrors);
        
        // 保存并查看错题按钮点击事件
        elements.saveAndViewErrorsBtn.addEventListener('click', () => {
            Renderer.hideQuizCompletePrompt();
            const newCollection = saveSessionErrors();
            if (newCollection) {
                startErrorCollection(newCollection.id);
            }
        });
        
        // 忽略并继续按钮点击事件
        elements.ignoreAndContinueBtn.addEventListener('click', () => {
            Renderer.hideQuizCompletePrompt();
        });
        
        // 返回输入页面按钮点击事件
        elements.backToInputBtn.addEventListener('click', backToInputPage);
        
        // 答题完成提示中返回输入页面按钮点击事件
        elements.backToInputFromPromptBtn.addEventListener('click', () => {
            Renderer.hideQuizCompletePrompt();
            backToInputPage();
        });
    }

    /**
     * 处理解析题目
     */
    function handleParseQuestions() {
        const text = elements.questionInput.value;
        
        if (!text || text.trim() === '') {
            alert('请先粘贴题目文本！');
            return;
        }
        
        // 解析题目
        const questions = Parser.parseQuestions(text);
        
        if (questions.length === 0) {
            alert('未能解析出有效题目，请检查格式！');
            return;
        }
        
        // 保存原始题目数据
        originalQuestions = questions;
        
        // 重置完成状态
        isQuizCompleted = false;
        
        // 清除保存的练习状态
        savedQuizState = null;
        
        // 切换到普通模式
        switchToNormalMode();
    }

    /**
     * 处理提交答案
     */
    function handleSubmitAnswer() {
        // 提交答案
        const isCorrect = Quiz.submitAnswer();
        
        // 更新UI
        const currentIndex = Quiz.getCurrentIndex();
        Renderer.updateIndicatorStatus(currentIndex, isCorrect);
        
        // 更新正确题目计数
        Renderer.updateCorrectCount(Quiz.getCorrectCount());
        
        // 更新错题本计数
        Renderer.updateErrorBookCount();
        
        // 重新渲染当前题目（显示反馈）
        renderCurrentQuestion();
        
        // 如果是最后一题，并且不是错题本模式，并且用户主动提交了答案
        const isLastQuestion = currentIndex === Quiz.getTotalQuestions() - 1;
        if (isLastQuestion && !Quiz.isErrorBookMode() && !isQuizCompleted) {
            // 检查是否所有题目都已作答
            const allQuestionsAnswered = Quiz.getQuestionsStatus().every(status => status.answered);
            
            if (allQuestionsAnswered) {
                isQuizCompleted = true;
                
                // 显示答题完成提示
                setTimeout(() => {
                    Renderer.showQuizCompletePrompt();
                }, 1000);
            }
        }
    }

    /**
     * 处理上一题
     */
    function handlePrevQuestion() {
        if (Quiz.prevQuestion()) {
            renderCurrentQuestion();
        }
    }

    /**
     * 处理下一题
     */
    function handleNextQuestion() {
        if (Quiz.nextQuestion()) {
            renderCurrentQuestion();
        }
    }

    /**
     * 渲染当前题目
     */
    function renderCurrentQuestion() {
        const question = Quiz.getCurrentQuestion();
        const index = Quiz.getCurrentIndex();
        const total = Quiz.getTotalQuestions();
        
        Renderer.renderQuestion(question, index, total);
    }

    /**
     * 设置用户答案
     * @param {string} answer - 用户选择的答案
     */
    function setUserAnswer(answer) {
        Quiz.setUserAnswer(answer);
    }

    /**
     * 跳转到指定题目
     * @param {number} index - 目标题目索引
     */
    function goToQuestion(index) {
        // 移除对已答题的限制，允许自由跳转
        if (Quiz.goToQuestion(index)) {
            renderCurrentQuestion();
            return true;
        }
        return false;
    }
    
    /**
     * 切换到普通模式
     */
    function switchToNormalMode() {
        // 隐藏错题本空提示和答题完成提示
        Renderer.hideEmptyErrorBook();
        Renderer.hideQuizCompletePrompt();
        
        // 如果没有题目，显示输入界面
        if (originalQuestions.length === 0) {
            document.querySelector('.input-section').classList.remove('hidden');
            document.querySelector('.quiz-section').classList.add('hidden');
            document.querySelector('.collection-list-section').classList.add('hidden');
            return;
        }
        
        // 设置模式
        ErrorBook.setErrorBookMode(false);
        
        // 如果有保存的练习状态，恢复它
        if (savedQuizState) {
            // 恢复题目状态
            Quiz.restoreState(savedQuizState.questions, savedQuizState.currentIndex, savedQuizState.correctCount);
            
            // 初始化UI
            Renderer.initQuizUI(savedQuizState.questions);
            
            // 渲染当前题目
            renderCurrentQuestion();
        } else {
            // 初始化题目
            Quiz.init(originalQuestions);
            
            // 初始化UI
            Renderer.initQuizUI(originalQuestions);
            
            // 渲染第一题
            renderCurrentQuestion();
        }
        
        // 更新按钮状态
        updateModeButtons(false);
    }
    
    /**
     * 切换到错题本模式
     */
    function switchToErrorBookMode() {
        // 保存当前练习状态
        if (!ErrorBook.getErrorBookMode() && originalQuestions.length > 0) {
            savedQuizState = {
                questions: Quiz.getQuestionsWithState(),
                currentIndex: Quiz.getCurrentIndex(),
                correctCount: Quiz.getCorrectCount()
            };
        }
        
        // 设置模式
        ErrorBook.setErrorBookMode(true);
        ErrorBook.setCollectionListMode(true);
        
        // 获取错题集合列表
        const collections = ErrorBook.getErrorCollections();
        const sessionErrorCount = ErrorBook.getSessionErrorCount();
        
        // 如果没有错题集和会话错题，显示空提示
        if (collections.length === 0 && sessionErrorCount === 0) {
            Renderer.showEmptyErrorBook();
            return;
        }
        
        // 隐藏错题本空提示和答题完成提示
        Renderer.hideEmptyErrorBook();
        Renderer.hideQuizCompletePrompt();
        
        // 显示错题集列表
        Renderer.showCollectionList();
        
        // 更新按钮状态
        updateModeButtons(true);
    }
    
    /**
     * 开始错题集练习
     * @param {string} collectionId - 错题集ID
     */
    function startErrorCollection(collectionId) {
        // 设置当前错题集
        if (!ErrorBook.setCurrentCollection(collectionId)) {
            alert('错题集不存在或已被删除');
            switchToErrorBookMode();
            return;
        }
        
        // 获取错题集中的题目
        const questions = ErrorBook.getCurrentCollectionQuestions();
        
        // 如果没有题目，返回列表
        if (questions.length === 0) {
            alert('此错题集中没有题目');
            ErrorBook.setCollectionListMode(true);
            Renderer.showCollectionList();
            return;
        }
        
        // 设置模式
        ErrorBook.setErrorBookMode(true);
        ErrorBook.setCollectionListMode(false);
        
        // 初始化题目
        Quiz.init(questions);
        
        // 初始化UI
        Renderer.initQuizUI(questions);
        
        // 渲染第一题
        renderCurrentQuestion();
        
        // 更新按钮状态
        updateModeButtons(true);
    }
    
    /**
     * 保存会话错题为错题集
     * @returns {Object|null} - 创建的错题集或null
     */
    function saveSessionErrors() {
        // 保存会话错题
        const newCollection = ErrorBook.saveSessionErrorsAsCollection();
        
        if (newCollection) {
            // 重新渲染错题集列表
            Renderer.renderCollections();
            
            // 更新错题本计数
            Renderer.updateErrorBookCount();
            
            return newCollection;
        }
        
        return null;
    }
    
    /**
     * 更新模式按钮状态
     * @param {boolean} isErrorMode - 是否错题本模式
     */
    function updateModeButtons(isErrorMode) {
        if (isErrorMode) {
            elements.normalModeBtn.classList.remove('active');
            elements.errorBookBtn.classList.add('active');
        } else {
            elements.normalModeBtn.classList.add('active');
            elements.errorBookBtn.classList.remove('active');
        }
    }

    /**
     * 返回输入页面
     */
    function backToInputPage() {
        // 隐藏其他界面
        document.querySelector('.quiz-section').classList.add('hidden');
        document.querySelector('.collection-list-section').classList.add('hidden');
        document.querySelector('.error-book-empty').classList.add('hidden');
        document.querySelector('.quiz-complete-prompt').classList.add('hidden');
        
        // 显示输入界面
        document.querySelector('.input-section').classList.remove('hidden');
        
        // 重置完成状态
        isQuizCompleted = false;
        
        // 清除保存的练习状态
        savedQuizState = null;
        
        // 确保错题本模式关闭
        ErrorBook.setErrorBookMode(false);
        ErrorBook.setCollectionListMode(false);
        
        // 更新按钮状态
        updateModeButtons(false);
    }

    // 公开API
    return {
        init: init,
        setUserAnswer: setUserAnswer,
        goToQuestion: goToQuestion,
        startErrorCollection: startErrorCollection,
        saveSessionErrors: saveSessionErrors,
        backToInputPage: backToInputPage,
        handleSubmitAnswer: handleSubmitAnswer
    };
})();

// 初始化应用
document.addEventListener('DOMContentLoaded', function() {
    // 仅初始化应用，不执行其他操作
    QuizApp.init();
}); 