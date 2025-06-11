/**
 * 渲染器模块 - 负责将题目数据渲染到页面上
 */
const Renderer = (function() {
    // DOM 元素引用
    const elements = {
        quizSection: document.querySelector('.quiz-section'),
        inputSection: document.querySelector('.input-section'),
        questionNumber: document.querySelector('.question-number'),
        questionText: document.querySelector('.question-text'),
        optionsContainer: document.querySelector('.options-container'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        questionIndicators: document.getElementById('questionIndicators'),
        feedback: document.querySelector('.feedback'),
        progress: document.querySelector('.progress'),
        correctCount: document.querySelector('.correct-count'),
        totalCount: document.querySelector('.total-count'),
        errorBookCount: document.querySelector('.error-book-count'),
        errorCount: document.querySelector('.error-count'),
        errorBadge: document.querySelector('.error-badge'),
        modeInfo: document.querySelector('.mode-info'),
        errorBookEmpty: document.querySelector('.error-book-empty'),
        collectionListSection: document.querySelector('.collection-list-section'),
        collectionsContainer: document.querySelector('.collections-container'),
        sessionErrorInfo: document.getElementById('sessionErrorInfo'),
        sessionErrorCount: document.querySelectorAll('.session-error-count'),
        errorPracticeActions: document.querySelector('.error-practice-actions'),
        renameModal: document.getElementById('renameModal'),
        collectionNameInput: document.getElementById('collectionNameInput'),
        quizCompletePrompt: document.querySelector('.quiz-complete-prompt')
    };

    /**
     * 初始化答题界面
     * @param {Array} questions - 题目数组
     */
    function initQuizUI(questions) {
        if (!questions || questions.length === 0) {
            return;
        }

        // 显示答题区域，隐藏其他区域
        elements.quizSection.classList.remove('hidden');
        elements.inputSection.classList.add('hidden');
        elements.collectionListSection.classList.add('hidden');

        // 更新总题数
        elements.totalCount.textContent = questions.length;

        // 创建题目指示器
        createQuestionIndicators(questions);

        // 更新进度条
        updateProgressBar(Quiz.getCurrentIndex(), questions.length);
        
        // 更新错题数量显示
        updateErrorBookCount();
        
        // 根据模式更新UI
        updateModeUI();
        
        // 更新正确题目计数
        updateCorrectCount(Quiz.getCorrectCount());
    }

    /**
     * 创建题目指示器
     * @param {Array} questions - 题目数组
     */
    function createQuestionIndicators(questions) {
        elements.questionIndicators.innerHTML = '';
        
        questions.forEach((_, index) => {
            const indicator = document.createElement('div');
            indicator.className = 'indicator';
            indicator.textContent = index + 1;
            indicator.dataset.index = index;
            
            indicator.addEventListener('click', () => {
                // 只有已答题目或当前题目可以点击跳转
                QuizApp.goToQuestion(parseInt(indicator.dataset.index));
            });
            
            elements.questionIndicators.appendChild(indicator);
        });
    }

    /**
     * 渲染当前题目
     * @param {Object} question - 当前题目对象
     * @param {number} index - 当前题目索引
     * @param {number} total - 题目总数
     */
    function renderQuestion(question, index, total) {
        // 更新题号
        let questionNumberText = `${index + 1} / ${total}`;
        
        // 如果题目有原始题号，添加到显示中
        if (question.number) {
            questionNumberText = `${question.number} (${questionNumberText})`;
        }
        
        // 如果题目有分数，添加到显示中
        if (question.score) {
            questionNumberText += ` [${question.score}分]`;
        }
        
        elements.questionNumber.textContent = questionNumberText;
        
        // 更新题干
        elements.questionText.textContent = question.title;
        
        // 添加多选题提示
        if (question.isMultipleChoice) {
            const multipleChoiceHint = document.createElement('div');
            multipleChoiceHint.className = 'multiple-choice-hint';
            multipleChoiceHint.textContent = '【多选题】请选择所有正确选项';
            elements.questionText.appendChild(multipleChoiceHint);
        }
        
        // 更新选项
        renderOptions(question.options, question.userAnswer, question.answer, question.isCorrect, question.isMultipleChoice, question.userAnswers);
        
        // 更新按钮状态
        updateButtonStates(index, total, question.userAnswer, question.isCorrect);
        
        // 更新题目指示器
        updateQuestionIndicators(index);
        
        // 更新反馈区域
        updateFeedback(question);
        
        // 更新进度条
        updateProgressBar(index, total);
        
        // 错题模式下显示返回列表按钮
        if (ErrorBook.getErrorBookMode() && !ErrorBook.getCollectionListMode()) {
            elements.errorPracticeActions.classList.remove('hidden');
        } else {
            elements.errorPracticeActions.classList.add('hidden');
        }
    }

    /**
     * 渲染选项
     * @param {Array} options - 选项数组
     * @param {string|null} userAnswer - 用户选择的答案
     * @param {string} correctAnswer - 正确答案
     * @param {boolean|null} isCorrect - 是否回答正确
     * @param {boolean} isMultipleChoice - 是否为多选题
     * @param {Array} userAnswers - 多选题用户选择的答案数组
     */
    function renderOptions(options, userAnswer, correctAnswer, isCorrect, isMultipleChoice, userAnswers) {
        elements.optionsContainer.innerHTML = '';
        
        // 创建提交按钮（如果是多选题）
        let submitBtn = null;
        let submitBtnContainer = null;
        
        if (isMultipleChoice && isCorrect === null) {
            submitBtnContainer = document.createElement('div');
            submitBtnContainer.className = 'multiple-choice-submit';
            
            submitBtn = document.createElement('button');
            submitBtn.textContent = '提交答案';
            submitBtn.className = 'multiple-choice-submit-btn';
            submitBtn.disabled = !(userAnswers && userAnswers.length > 0); // 没有选择时禁用按钮
            
            submitBtn.addEventListener('click', () => {
                if (userAnswers && userAnswers.length > 0) {
                    QuizApp.handleSubmitAnswer();
                }
            });
            
            submitBtnContainer.appendChild(submitBtn);
        }
        
        options.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            
            // 为多选题添加特殊样式
            if (isMultipleChoice) {
                optionElement.classList.add('multiple-choice');
            }
            
            // 设置选择状态
            let isSelected = false;
            
            if (isMultipleChoice) {
                // 多选题：检查选项是否在用户选择的答案数组中
                isSelected = userAnswers && userAnswers.includes(option.label);
            } else {
                // 单选题：直接比较
                isSelected = userAnswer === option.label;
            }
            
            if (isSelected) {
                optionElement.classList.add('selected');
                
                // 如果已提交答案，添加正确/错误样式
                if (isCorrect !== null) {
                    if (isCorrect) {
                        optionElement.classList.add('correct');
                    } else {
                        optionElement.classList.add('incorrect');
                    }
                }
            }
            
            // 如果已提交答案且当前选项是正确答案中的一个，标记为正确
            if (isCorrect !== null && correctAnswer.includes(option.label)) {
                optionElement.classList.add('correct');
            }
            
            optionElement.dataset.label = option.label;
            
            // 创建选项标记（单选为圆形，多选为方形）
            const labelSpan = document.createElement('span');
            labelSpan.className = isMultipleChoice ? 'option-label checkbox' : 'option-label';
            labelSpan.textContent = option.label + '.';
            
            const textSpan = document.createElement('span');
            textSpan.className = 'option-text';
            textSpan.textContent = option.text;
            
            optionElement.appendChild(labelSpan);
            optionElement.appendChild(textSpan);
            
            optionElement.addEventListener('click', () => {
                // 如果已经提交过答案，不允许再次选择
                if (isCorrect !== null) {
                    return;
                }
                
                if (isMultipleChoice) {
                    // 多选题：切换选中状态
                    optionElement.classList.toggle('selected');
                    QuizApp.setUserAnswer(option.label);
                    
                    // 更新提交按钮状态
                    if (submitBtn) {
                        // 检查是否有任何选项被选中
                        const anySelected = document.querySelectorAll('.option.multiple-choice.selected').length > 0;
                        submitBtn.disabled = !anySelected;
                    }
                    
                    // 多选题不直接提交答案，需要点击提交按钮
                } else {
                    // 单选题：移除其他选项的选中状态
                    document.querySelectorAll('.option').forEach(el => {
                        el.classList.remove('selected');
                    });
                    
                    // 添加当前选项的选中状态
                    optionElement.classList.add('selected');
                    
                    // 更新当前题目的用户答案
                    QuizApp.setUserAnswer(option.label);
                    
                    // 单选题直接提交答案
                    QuizApp.handleSubmitAnswer();
                }
            });
            
            elements.optionsContainer.appendChild(optionElement);
        });
        
        // 添加提交按钮（如果是多选题）
        if (submitBtnContainer) {
            elements.optionsContainer.appendChild(submitBtnContainer);
        }
    }

    /**
     * 更新按钮状态
     * @param {number} index - 当前题目索引
     * @param {number} total - 题目总数
     * @param {string|null} userAnswer - 用户选择的答案
     * @param {boolean|null} isCorrect - 是否回答正确
     */
    function updateButtonStates(index, total, userAnswer, isCorrect) {
        // 上一题按钮
        elements.prevBtn.disabled = index === 0;
        
        // 下一题按钮 - 移除对已答题的限制
        elements.nextBtn.disabled = index === total - 1;
    }

    /**
     * 更新题目指示器
     * @param {number} currentIndex - 当前题目索引
     */
    function updateQuestionIndicators(currentIndex) {
        const questionsStatus = Quiz.getQuestionsStatus();
        
        document.querySelectorAll('.indicator').forEach((indicator, index) => {
            // 设置当前题目高亮
            indicator.classList.toggle('current', index === currentIndex);
            
            // 设置题目状态样式
            if (questionsStatus[index]) {
                if (questionsStatus[index].isCorrect === true) {
                    indicator.classList.add('correct');
                    indicator.classList.remove('incorrect');
                } else if (questionsStatus[index].isCorrect === false) {
                    indicator.classList.add('incorrect');
                    indicator.classList.remove('correct');
                }
            }
            
            // 移除未完成题目的不可点击样式
            indicator.style.cursor = 'pointer';
            indicator.style.opacity = '1';
        });
    }

    /**
     * 更新反馈区域
     * @param {Object} question - 当前题目对象
     */
    function updateFeedback(question) {
        const feedback = elements.feedback;
        
        // 如果用户还没有提交答案，隐藏反馈
        if (question.isCorrect === null) {
            feedback.classList.add('hidden');
            return;
        }
        
        // 显示反馈
        feedback.classList.remove('hidden');
        
        // 设置反馈样式和内容
        if (question.isCorrect) {
            feedback.className = 'feedback correct';
            feedback.textContent = '✓ 回答正确！';
            
            // 如果是错题本模式，显示已从错题本移除的提示
            if (Quiz.isErrorBookMode()) {
                feedback.textContent = '✓ 回答正确！此题已从错题本移除';
            }
        } else {
            feedback.className = 'feedback incorrect';
            
            if (question.isMultipleChoice) {
                feedback.textContent = `✗ 本题为多选题，你的选择有误。正确答案是 ${question.answer}`;
            } else {
                feedback.textContent = `✗ 回答错误，正确答案是 ${question.answer}`;
            }
            
            // 如果不是错题本模式，显示已添加到错题本的提示
            if (!Quiz.isErrorBookMode()) {
                if (question.isMultipleChoice) {
                    feedback.textContent = `✗ 本题为多选题，你的选择有误。正确答案是 ${question.answer}（已加入错题本）`;
                } else {
                    feedback.textContent = `✗ 回答错误，正确答案是 ${question.answer}（已加入错题本）`;
                }
            }
        }
    }

    /**
     * 更新进度条
     * @param {number} index - 当前题目索引
     * @param {number} total - 题目总数
     */
    function updateProgressBar(index, total) {
        const progressPercentage = ((index + 1) / total) * 100;
        elements.progress.style.width = `${progressPercentage}%`;
    }

    /**
     * 更新指示器状态
     * @param {number} index - 当前题目索引
     * @param {boolean} isCorrect - 是否回答正确
     */
    function updateIndicatorStatus(index, isCorrect) {
        const indicators = document.querySelectorAll('.indicator');
        
        if (index >= 0 && index < indicators.length) {
            if (isCorrect) {
                indicators[index].classList.add('correct');
                indicators[index].classList.remove('incorrect');
            } else {
                indicators[index].classList.add('incorrect');
                indicators[index].classList.remove('correct');
            }
        }
    }

    /**
     * 更新正确题目计数
     * @param {number} count - 正确题目数量
     */
    function updateCorrectCount(count) {
        elements.correctCount.textContent = count;
    }
    
    /**
     * 更新错题本计数
     */
    function updateErrorBookCount() {
        const errorCount = ErrorBook.getTotalErrorCount();
        const sessionErrorCount = ErrorBook.getSessionErrorCount();
        
        // 更新错题数量显示
        elements.errorCount.textContent = errorCount;
        elements.errorBadge.textContent = errorCount;
        
        // 更新当前会话错题数
        elements.sessionErrorCount.forEach(el => {
            el.textContent = sessionErrorCount;
        });
        
        try {
            // 如果当前会话有错题，显示保存提示
            if (sessionErrorCount > 0) {
                elements.sessionErrorInfo.classList.remove('hidden');
            } else {
                elements.sessionErrorInfo.classList.add('hidden');
            }
            
            // 如果有错题，显示错题本计数和浮动按钮
            if (errorCount > 0 || sessionErrorCount > 0) {
                elements.errorBookCount.classList.remove('hidden');
                const floatingBtn = document.querySelector('.floating-error-book');
                if (floatingBtn) {
                    floatingBtn.classList.add('show');
                    floatingBtn.style.display = 'block';
                }
            } else {
                elements.errorBookCount.classList.add('hidden');
                const floatingBtn = document.querySelector('.floating-error-book');
                if (floatingBtn) {
                    floatingBtn.classList.remove('show');
                    floatingBtn.style.display = 'none';
                }
            }
        } catch (e) {
            console.error('更新错题本计数出错:', e);
        }
    }
    
    /**
     * 更新模式UI
     */
    function updateModeUI() {
        if (Quiz.isErrorBookMode()) {
            // 错题本模式
            elements.modeInfo.classList.add('error-mode');
            
            if (ErrorBook.getCollectionListMode()) {
                elements.modeInfo.textContent = '';
            } else {
                const collection = ErrorBook.getCurrentCollection();
                if (collection) {
                    elements.modeInfo.textContent = `错题练习：${collection.name}`;
                } else {
                    elements.modeInfo.textContent = '错题本模式';
                }
            }
        } else {
            // 普通模式
            elements.modeInfo.classList.remove('error-mode');
            elements.modeInfo.textContent = '';
        }
    }
    
    /**
     * 显示错题本为空提示
     */
    function showEmptyErrorBook() {
        elements.errorBookEmpty.classList.remove('hidden');
        elements.inputSection.classList.add('hidden');
        elements.quizSection.classList.add('hidden');
        elements.collectionListSection.classList.add('hidden');
    }
    
    /**
     * 隐藏错题本为空提示
     */
    function hideEmptyErrorBook() {
        elements.errorBookEmpty.classList.add('hidden');
    }
    
    /**
     * 显示错题集列表
     */
    function showCollectionList() {
        // 隐藏其他页面
        elements.quizSection.classList.add('hidden');
        elements.inputSection.classList.add('hidden');
        elements.errorBookEmpty.classList.add('hidden');
        
        // 显示错题集列表
        elements.collectionListSection.classList.remove('hidden');
        
        // 渲染错题集列表
        renderCollections();
        
        // 更新UI
        updateErrorBookCount();
    }
    
    /**
     * 渲染错题集列表
     */
    function renderCollections() {
        // 获取所有错题集
        const collections = ErrorBook.getErrorCollections();
        
        // 清空容器
        elements.collectionsContainer.innerHTML = '';
        
        if (collections.length === 0) {
            // 如果没有错题集，显示提示
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'empty-collections';
            emptyMessage.textContent = '还没有保存的错题练习集';
            elements.collectionsContainer.appendChild(emptyMessage);
            return;
        }
        
        // 按时间戳降序排序
        collections.sort((a, b) => b.timestamp - a.timestamp);
        
        // 渲染每个错题集
        collections.forEach(collection => {
            const card = createCollectionCard(collection);
            elements.collectionsContainer.appendChild(card);
        });
    }
    
    /**
     * 创建错题集卡片
     * @param {Object} collection - 错题集对象
     * @returns {HTMLElement} - 错题集卡片元素
     */
    function createCollectionCard(collection) {
        const card = document.createElement('div');
        card.className = 'collection-card';
        card.dataset.id = collection.id;
        
        const nameEl = document.createElement('div');
        nameEl.className = 'collection-name';
        nameEl.textContent = collection.name;
        
        const infoEl = document.createElement('div');
        infoEl.className = 'collection-info';
        
        const questionsEl = document.createElement('div');
        questionsEl.className = 'collection-questions';
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-exclamation-circle';
        
        const questionsCount = document.createElement('span');
        questionsCount.textContent = `${collection.questions.length} 题`;
        
        questionsEl.appendChild(icon);
        questionsEl.appendChild(questionsCount);
        
        const dateEl = document.createElement('div');
        dateEl.className = 'collection-date';
        dateEl.textContent = collection.dateCreated;
        
        infoEl.appendChild(questionsEl);
        infoEl.appendChild(dateEl);
        
        // 编辑按钮
        const editBtn = document.createElement('button');
        editBtn.className = 'collection-edit';
        editBtn.title = '重命名';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        
        // 编辑按钮点击事件
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡
            openRenameModal(collection.id, collection.name);
        });
        
        // 删除按钮
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'collection-delete';
        deleteBtn.title = '删除';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        
        // 删除按钮点击事件
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止冒泡
            if (confirm(`确定要删除错题集"${collection.name}"吗？`)) {
                ErrorBook.deleteCollection(collection.id);
                renderCollections();
                updateErrorBookCount();
            }
        });
        
        card.appendChild(nameEl);
        card.appendChild(infoEl);
        card.appendChild(editBtn);
        card.appendChild(deleteBtn);
        
        // 卡片点击事件 - 进入错题练习
        card.addEventListener('click', () => {
            QuizApp.startErrorCollection(collection.id);
        });
        
        return card;
    }
    
    /**
     * 打开重命名模态框
     * @param {string} collectionId - 错题集ID
     * @param {string} currentName - 当前名称
     */
    function openRenameModal(collectionId, currentName) {
        // 设置当前值
        elements.collectionNameInput.value = currentName;
        elements.renameModal.dataset.collectionId = collectionId;
        
        // 显示模态框
        elements.renameModal.classList.remove('hidden');
        
        // 聚焦输入框
        elements.collectionNameInput.focus();
    }
    
    /**
     * 关闭重命名模态框
     */
    function closeRenameModal() {
        elements.renameModal.classList.add('hidden');
    }
    
    /**
     * 确认重命名错题集
     */
    function confirmRename() {
        const collectionId = elements.renameModal.dataset.collectionId;
        const newName = elements.collectionNameInput.value.trim();
        
        if (newName) {
            ErrorBook.renameCollection(collectionId, newName);
            closeRenameModal();
            renderCollections();
            
            // 如果当前正在查看的是被重命名的错题集，更新模式信息
            if (ErrorBook.getCurrentCollection() && ErrorBook.getCurrentCollection().id === collectionId) {
                updateModeUI();
            }
        }
    }
    
    /**
     * 显示答题完成提示
     */
    function showQuizCompletePrompt() {
        // 如果不是错题本模式，才显示答题完成提示
        if (!Quiz.isErrorBookMode()) {
            // 更新会话错题数
            updateErrorBookCount();
            
            // 如果没有错题，不显示提示
            if (ErrorBook.getSessionErrorCount() === 0) {
                return;
            }
            
            // 检查是否有题目
            const questions = Quiz.getQuestionsStatus();
            if (!questions || questions.length === 0) {
                return;
            }
            
            // 检查是否所有题目都已回答
            if (!questions.every(status => status.answered)) {
                return;
            }
            
            // 显示提示
            elements.quizCompletePrompt.classList.remove('hidden');
        }
    }
    
    /**
     * 隐藏答题完成提示
     */
    function hideQuizCompletePrompt() {
        elements.quizCompletePrompt.classList.add('hidden');
        // 确保样式完全隐藏
        elements.quizCompletePrompt.style.display = 'none';
    }
    
    // 初始化模态框事件
    document.getElementById('cancelRenameBtn').addEventListener('click', closeRenameModal);
    document.getElementById('confirmRenameBtn').addEventListener('click', confirmRename);
    
    // 初始化答题完成提示事件
    document.getElementById('ignoreAndContinueBtn').addEventListener('click', hideQuizCompletePrompt);

    // 公开API
    return {
        initQuizUI: initQuizUI,
        renderQuestion: renderQuestion,
        updateIndicatorStatus: updateIndicatorStatus,
        updateCorrectCount: updateCorrectCount,
        updateErrorBookCount: updateErrorBookCount,
        updateModeUI: updateModeUI,
        showEmptyErrorBook: showEmptyErrorBook,
        hideEmptyErrorBook: hideEmptyErrorBook,
        showCollectionList: showCollectionList,
        renderCollections: renderCollections,
        openRenameModal: openRenameModal,
        closeRenameModal: closeRenameModal,
        confirmRename: confirmRename,
        showQuizCompletePrompt: showQuizCompletePrompt,
        hideQuizCompletePrompt: hideQuizCompletePrompt
    };
})(); 