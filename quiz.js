/**
 * 答题模块 - 负责处理答题逻辑和状态
 */
const Quiz = (function() {
    // 题目数组
    let questions = [];
    
    // 当前题目索引
    let currentIndex = 0;
    
    // 正确题目计数
    let correctCount = 0;

    /**
     * 初始化答题模块
     * @param {Array} questionData - 解析后的题目数据
     */
    function init(questionData) {
        questions = questionData || [];
        currentIndex = 0;
        correctCount = 0;
        
        // 重置所有题目的答题状态
        questions.forEach(question => {
            question.userAnswer = null;
            question.isCorrect = null;
            if (question.isMultipleChoice) {
                question.userAnswers = [];
            }
        });
        
        // 如果没有题目，直接返回
        if (questions.length === 0) {
            return false;
        }
        
        return true;
    }

    /**
     * 获取当前题目
     * @returns {Object} - 当前题目对象
     */
    function getCurrentQuestion() {
        return questions[currentIndex];
    }

    /**
     * 获取题目总数
     * @returns {number} - 题目总数
     */
    function getTotalQuestions() {
        return questions.length;
    }

    /**
     * 获取当前题目索引
     * @returns {number} - 当前题目索引
     */
    function getCurrentIndex() {
        return currentIndex;
    }

    /**
     * 获取正确题目数量
     * @returns {number} - 正确题目数量
     */
    function getCorrectCount() {
        return correctCount;
    }

    /**
     * 设置用户答案
     * @param {string} answer - 用户选择的答案
     */
    function setUserAnswer(answer) {
        if (currentIndex >= 0 && currentIndex < questions.length) {
            const question = questions[currentIndex];
            
            if (question.isMultipleChoice) {
                // 多选题处理
                const index = question.userAnswers.indexOf(answer);
                if (index === -1) {
                    // 如果答案不在数组中，添加它
                    question.userAnswers.push(answer);
                } else {
                    // 如果答案已在数组中，移除它
                    question.userAnswers.splice(index, 1);
                }
                // 按字母顺序排序
                question.userAnswers.sort();
                // 更新userAnswer字段，用于兼容现有代码
                question.userAnswer = question.userAnswers.join('');
            } else {
                // 单选题处理
                question.userAnswer = answer;
            }
        }
    }

    /**
     * 检查用户是否选择了某个选项（用于多选题）
     * @param {string} option - 选项标签
     * @returns {boolean} - 是否已选择
     */
    function isOptionSelected(option) {
        if (currentIndex >= 0 && currentIndex < questions.length) {
            const question = questions[currentIndex];
            if (question.isMultipleChoice) {
                return question.userAnswers.includes(option);
            } else {
                return question.userAnswer === option;
            }
        }
        return false;
    }

    /**
     * 提交答案
     * @returns {boolean} - 答案是否正确
     */
    function submitAnswer() {
        const question = questions[currentIndex];
        
        // 如果没有选择答案，不处理
        if (question.isMultipleChoice) {
            if (question.userAnswers.length === 0) {
                return false;
            }
        } else if (!question.userAnswer) {
            return false;
        }
        
        // 判断答案是否正确
        let isCorrect = false;
        if (question.isMultipleChoice) {
            // 多选题：答案必须完全匹配（不考虑顺序）
            const correctAnswers = question.answer.split('');
            isCorrect = question.userAnswers.length === correctAnswers.length && 
                        correctAnswers.every(a => question.userAnswers.includes(a));
        } else {
            // 单选题：直接比较
            isCorrect = question.userAnswer === question.answer;
        }
        
        question.isCorrect = isCorrect;
        
        // 更新正确题目计数
        if (isCorrect && question.isCorrect === true) {
            correctCount++;
        }
        
        // 错题本处理
        if (ErrorBook.getErrorBookMode()) {
            // 如果是错题本模式，更新错题状态
            ErrorBook.updateErrorStatus(question, isCorrect);
        } else {
            // 如果是普通模式，错误题目加入错题本
            if (!isCorrect) {
                ErrorBook.addErrorQuestion(question);
            }
        }
        
        return isCorrect;
    }

    /**
     * 转到下一题
     * @returns {boolean} - 是否成功切换到下一题
     */
    function nextQuestion() {
        // 移除对已答题的限制，允许直接进入下一题
        if (currentIndex < questions.length - 1) {
            currentIndex++;
            return true;
        }
        return false;
    }

    /**
     * 转到上一题
     * @returns {boolean} - 是否成功切换到上一题
     */
    function prevQuestion() {
        if (currentIndex > 0) {
            currentIndex--;
            return true;
        }
        return false;
    }

    /**
     * 跳转到指定题目
     * @param {number} index - 目标题目索引
     * @returns {boolean} - 是否成功跳转
     */
    function goToQuestion(index) {
        if (index >= 0 && index < questions.length) {
            currentIndex = index;
            return true;
        }
        return false;
    }

    /**
     * 获取所有题目的状态
     * @returns {Array} - 题目状态数组
     */
    function getQuestionsStatus() {
        return questions.map(q => ({
            answered: q.isMultipleChoice ? q.userAnswers.length > 0 : q.userAnswer !== null,
            isCorrect: q.isCorrect
        }));
    }

    /**
     * 是否处于错题本模式
     * @returns {boolean} - 是否处于错题本模式
     */
    function isErrorBookMode() {
        return ErrorBook.getErrorBookMode();
    }

    /**
     * 获取带有状态的题目数组
     * @returns {Array} - 带有用户答案和正确性状态的题目数组
     */
    function getQuestionsWithState() {
        return JSON.parse(JSON.stringify(questions));
    }
    
    /**
     * 恢复练习状态
     * @param {Array} savedQuestions - 保存的题目数组
     * @param {number} savedIndex - 保存的当前题目索引
     * @param {number} savedCorrectCount - 保存的正确题目计数
     */
    function restoreState(savedQuestions, savedIndex, savedCorrectCount) {
        questions = savedQuestions;
        currentIndex = savedIndex;
        correctCount = savedCorrectCount;
        return true;
    }

    // 公开API
    return {
        init: init,
        getCurrentQuestion: getCurrentQuestion,
        getTotalQuestions: getTotalQuestions,
        getCurrentIndex: getCurrentIndex,
        getCorrectCount: getCorrectCount,
        setUserAnswer: setUserAnswer,
        isOptionSelected: isOptionSelected,
        submitAnswer: submitAnswer,
        nextQuestion: nextQuestion,
        prevQuestion: prevQuestion,
        goToQuestion: goToQuestion,
        getQuestionsStatus: getQuestionsStatus,
        isErrorBookMode: isErrorBookMode,
        getQuestionsWithState: getQuestionsWithState,
        restoreState: restoreState
    };
})(); 