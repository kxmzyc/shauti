/**
 * 错题本模块 - 负责记录和管理错题
 */
const ErrorBook = (function() {
    // 本地存储的键名
    const STORAGE_KEY_CURRENT = 'quiz_error_questions'; // 兼容旧版本
    const STORAGE_KEY_COLLECTIONS = 'quiz_error_collections'; // 新版本错题集合列表
    
    // 错题集合列表
    let errorCollections = [];
    
    // 当前错题集合ID
    let currentCollectionId = null;
    
    // 当前是否处于错题本模式
    let isErrorBookMode = false;
    
    // 当前是否处于错题集合列表模式
    let isCollectionListMode = false;
    
    /**
     * 初始化错题本
     */
    function init() {
        // 从本地存储加载错题集合
        loadErrorCollections();
        
        // 确保默认不启用错题本相关模式
        isErrorBookMode = false;
        isCollectionListMode = false;
        currentCollectionId = null;
        
        // 迁移旧版本数据（如果有）
        migrateOldData();
    }
    
    /**
     * 迁移旧版本数据到新格式
     */
    function migrateOldData() {
        const oldData = localStorage.getItem(STORAGE_KEY_CURRENT);
        if (oldData) {
            try {
                const oldQuestions = JSON.parse(oldData);
                if (oldQuestions && oldQuestions.length > 0) {
                    // 创建一个包含旧数据的错题集
                    const oldCollection = createErrorCollection('旧版错题集', oldQuestions);
                    // 保存新集合
                    saveErrorCollections();
                    // 清除旧数据
                    localStorage.removeItem(STORAGE_KEY_CURRENT);
                }
            } catch (e) {
                console.error('迁移旧错题数据失败:', e);
            }
        }
    }
    
    /**
     * 从本地存储加载错题集合
     */
    function loadErrorCollections() {
        const storedData = localStorage.getItem(STORAGE_KEY_COLLECTIONS);
        if (storedData) {
            try {
                errorCollections = JSON.parse(storedData);
            } catch (e) {
                console.error('加载错题集合失败:', e);
                errorCollections = [];
            }
        }
    }
    
    /**
     * 保存错题集合到本地存储
     */
    function saveErrorCollections() {
        try {
            localStorage.setItem(STORAGE_KEY_COLLECTIONS, JSON.stringify(errorCollections));
        } catch (e) {
            console.error('保存错题集合失败:', e);
        }
    }
    
    /**
     * 创建新的错题集合
     * @param {string} name - 错题集合名称
     * @param {Array} questions - 题目数组
     * @returns {Object} - 新创建的错题集合
     */
    function createErrorCollection(name, questions = []) {
        const timestamp = Date.now();
        const formattedDate = formatDate(timestamp);
        
        const collection = {
            id: 'error_' + timestamp,
            name: name || formattedDate,
            timestamp: timestamp,
            dateCreated: formattedDate,
            questions: questions.map(q => ({
                number: q.number,
                score: q.score,
                title: q.title,
                options: JSON.parse(JSON.stringify(q.options)),
                answer: q.answer,
                userAnswer: q.userAnswer,
                isCorrect: false
            }))
        };
        
        errorCollections.push(collection);
        saveErrorCollections();
        
        return collection;
    }
    
    /**
     * 格式化日期
     * @param {number} timestamp - 时间戳
     * @returns {string} - 格式化后的日期字符串
     */
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
    
    /**
     * 添加错题到当前会话的临时错题集
     * @param {Object} question - 错题对象
     */
    function addErrorQuestion(question) {
        // 检查临时错题集是否已存在
        let tempCollection = errorCollections.find(c => c.id === 'temp_session');
        
        if (!tempCollection) {
            // 创建临时错题集
            tempCollection = {
                id: 'temp_session',
                name: '当前会话错题',
                timestamp: Date.now(),
                dateCreated: formatDate(Date.now()),
                questions: [],
                isTemporary: true // 标记为临时集合
            };
            errorCollections.push(tempCollection);
        }
        
        // 检查题目是否已存在于错题集
        const existIndex = tempCollection.questions.findIndex(q => 
            q.title === question.title && 
            q.answer === question.answer
        );
        
        if (existIndex === -1) {
            // 创建错题副本
            const errorQuestion = {
                number: question.number,
                score: question.score,
                title: question.title,
                options: JSON.parse(JSON.stringify(question.options)),
                answer: question.answer,
                userAnswer: question.userAnswer,
                isCorrect: false
            };
            
            tempCollection.questions.push(errorQuestion);
            saveErrorCollections();
        }
    }
    
    /**
     * 保存当前会话的临时错题集为永久错题集
     * @returns {Object|null} - 创建的错题集或null
     */
    function saveSessionErrorsAsCollection() {
        // 查找临时错题集
        const tempIndex = errorCollections.findIndex(c => c.id === 'temp_session');
        
        if (tempIndex !== -1 && errorCollections[tempIndex].questions.length > 0) {
            const tempCollection = errorCollections[tempIndex];
            
            // 创建新的永久错题集
            const timestamp = Date.now();
            const formattedDate = formatDate(timestamp);
            
            const newCollection = {
                id: 'error_' + timestamp,
                name: formattedDate,
                timestamp: timestamp,
                dateCreated: formattedDate,
                questions: JSON.parse(JSON.stringify(tempCollection.questions))
            };
            
            // 添加新集合并清空临时集合
            errorCollections.push(newCollection);
            errorCollections[tempIndex].questions = [];
            
            saveErrorCollections();
            return newCollection;
        }
        
        return null;
    }
    
    /**
     * 获取错题集合列表
     * @returns {Array} - 错题集合列表（不包括临时集合）
     */
    function getErrorCollections() {
        // 返回非临时集合
        return errorCollections.filter(c => !c.isTemporary);
    }
    
    /**
     * 获取临时错题集
     * @returns {Object|null} - 临时错题集
     */
    function getTemporaryCollection() {
        return errorCollections.find(c => c.id === 'temp_session') || null;
    }
    
    /**
     * 根据ID获取错题集合
     * @param {string} id - 错题集合ID
     * @returns {Object|null} - 错题集合
     */
    function getCollectionById(id) {
        return errorCollections.find(c => c.id === id) || null;
    }
    
    /**
     * 设置当前错题集合
     * @param {string} id - 错题集合ID
     * @returns {boolean} - 是否成功设置
     */
    function setCurrentCollection(id) {
        const collection = getCollectionById(id);
        if (collection) {
            currentCollectionId = id;
            return true;
        }
        return false;
    }
    
    /**
     * 获取当前错题集合
     * @returns {Object|null} - 当前错题集合
     */
    function getCurrentCollection() {
        if (!currentCollectionId) return null;
        return getCollectionById(currentCollectionId);
    }
    
    /**
     * 获取当前错题集合的所有题目
     * @returns {Array} - 错题数组
     */
    function getCurrentCollectionQuestions() {
        const collection = getCurrentCollection();
        return collection ? collection.questions : [];
    }
    
    /**
     * 重命名错题集合
     * @param {string} id - 错题集合ID
     * @param {string} newName - 新名称
     * @returns {boolean} - 是否成功重命名
     */
    function renameCollection(id, newName) {
        const index = errorCollections.findIndex(c => c.id === id);
        if (index !== -1) {
            errorCollections[index].name = newName;
            saveErrorCollections();
            return true;
        }
        return false;
    }
    
    /**
     * 删除错题集合
     * @param {string} id - 错题集合ID
     * @returns {boolean} - 是否成功删除
     */
    function deleteCollection(id) {
        const index = errorCollections.findIndex(c => c.id === id);
        if (index !== -1) {
            errorCollections.splice(index, 1);
            saveErrorCollections();
            
            // 如果删除的是当前集合，清除当前集合ID
            if (currentCollectionId === id) {
                currentCollectionId = null;
            }
            
            return true;
        }
        return false;
    }
    
    /**
     * 更新错题状态
     * @param {Object} question - 题目对象
     * @param {boolean} isCorrect - 是否答对
     */
    function updateErrorStatus(question, isCorrect) {
        if (!currentCollectionId) return;
        
        const collection = getCurrentCollection();
        if (!collection) return;
        
        // 查找题目索引
        const index = collection.questions.findIndex(q => 
            q.title === question.title && 
            q.answer === question.answer
        );
        
        if (index !== -1) {
            if (isCorrect) {
                // 如果答对了，从错题集中移除
                collection.questions.splice(index, 1);
            } else {
                // 如果还是答错了，更新错题记录
                collection.questions[index].userAnswer = question.userAnswer;
            }
            
            saveErrorCollections();
        }
    }
    
    /**
     * 获取错题总数
     * @returns {number} - 错题总数
     */
    function getTotalErrorCount() {
        return errorCollections.reduce((total, collection) => {
            // 只计算非临时集合
            if (!collection.isTemporary) {
                return total + collection.questions.length;
            }
            return total;
        }, 0);
    }
    
    /**
     * 获取当前会话错题数
     * @returns {number} - 当前会话错题数
     */
    function getSessionErrorCount() {
        const tempCollection = getTemporaryCollection();
        return tempCollection ? tempCollection.questions.length : 0;
    }
    
    /**
     * 切换错题本模式
     * @param {boolean} mode - 是否启用错题本模式
     */
    function setErrorBookMode(mode) {
        isErrorBookMode = !!mode;
        
        // 如果退出错题本模式，重置集合列表模式和当前集合
        if (!isErrorBookMode) {
            isCollectionListMode = false;
            currentCollectionId = null;
        }
    }
    
    /**
     * 获取错题本模式状态
     * @returns {boolean} - 是否处于错题本模式
     */
    function getErrorBookMode() {
        return isErrorBookMode;
    }
    
    /**
     * 设置是否显示集合列表
     * @param {boolean} mode - 是否显示集合列表
     */
    function setCollectionListMode(mode) {
        isCollectionListMode = !!mode;
    }
    
    /**
     * 获取集合列表模式状态
     * @returns {boolean} - 是否处于集合列表模式
     */
    function getCollectionListMode() {
        return isCollectionListMode;
    }
    
    // 公开API
    return {
        init: init,
        addErrorQuestion: addErrorQuestion,
        saveSessionErrorsAsCollection: saveSessionErrorsAsCollection,
        getErrorCollections: getErrorCollections,
        getTemporaryCollection: getTemporaryCollection,
        getCollectionById: getCollectionById,
        setCurrentCollection: setCurrentCollection,
        getCurrentCollection: getCurrentCollection,
        getCurrentCollectionQuestions: getCurrentCollectionQuestions,
        renameCollection: renameCollection,
        deleteCollection: deleteCollection,
        updateErrorStatus: updateErrorStatus,
        getTotalErrorCount: getTotalErrorCount,
        getSessionErrorCount: getSessionErrorCount,
        setErrorBookMode: setErrorBookMode,
        getErrorBookMode: getErrorBookMode,
        setCollectionListMode: setCollectionListMode,
        getCollectionListMode: getCollectionListMode
    };
})(); 