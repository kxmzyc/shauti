/**
 * 解析器模块 - 负责将粘贴的文本解析为结构化的题目数据
 */
const Parser = (function() {
    /**
     * 将输入文本解析为题目数组
     * @param {string} text - 用户粘贴的题目文本
     * @returns {Array} - 解析后的题目数组
     */
    function parseQuestions(text) {
        if (!text || text.trim() === '') {
            return [];
        }

        // 移除多余的空行和空格
        text = text.replace(/\n{3,}/g, '\n\n').trim();
        
        // 尝试识别题目块
        const questionBlocks = [];
        
        // 方法1：使用"正确答案"或"答案"作为分隔符
        const regex1 = /(.*?(?:(?:正确答案[:：]|答案[:：])\s*[A-D]+[\s]*(?=\n\S|$)))/gs;
        let match;
        
        while ((match = regex1.exec(text)) !== null) {
            if (match[1].trim()) {
                questionBlocks.push(match[1].trim());
            }
        }
        
        // 如果方法1没有找到题目，尝试方法2：按数字序号+题目文本模式分割
        if (questionBlocks.length === 0) {
            const regex2 = /(?:^|\n)(?:\d+[\.\、\）\)]|[一二三四五六七八九十]+[\.\、\）\)])\s*(.*?)(?=(?:\n\d+[\.\、\）\)]|[一二三四五六七八九十]+[\.\、\）\)]|\n*$))/gs;
            
            while ((match = regex2.exec(text)) !== null) {
                if (match[0].trim()) {
                    // 检查这个块是否包含选项特征
                    if (match[0].includes('A') && match[0].includes('B')) {
                        questionBlocks.push(match[0].trim());
                    }
                }
            }
        }
        
        // 如果方法1和方法2都没找到，尝试方法3：按空行分割
        if (questionBlocks.length === 0) {
            const blocks = text.split(/\n\s*\n/);
            for (const block of blocks) {
                if (block.includes('A') && block.includes('B') && 
                   (block.includes('正确答案') || block.includes('答案') || 
                    block.includes('A.') || block.includes('A、') || block.includes('A．'))) {
                    questionBlocks.push(block.trim());
                }
            }
        }

        // 解析每个题目块
        return questionBlocks.map(parseQuestionBlock);
    }

    /**
     * 解析单个题目块
     * @param {string} block - 单个题目的文本块
     * @returns {Object} - 解析后的题目对象
     */
    function parseQuestionBlock(block) {
        // 提取答案 - 支持"正确答案"和"答案"两种格式，支持多选
        let answerMatch = block.match(/(?:正确答案|答案)[:：]\s*([A-D]+)/i);
        let answer = answerMatch ? answerMatch[1].toUpperCase() : '';

        // 移除答案行
        let questionText = block.replace(/(?:正确答案|答案)[:：]\s*[A-D]+.*$/im, '').trim();

        // 提取题号和分数
        let questionNumber = '';
        let questionScore = '';
        
        // 匹配题号 (数字+标点符号)
        const numberMatch = questionText.match(/^(\d+[\.\、\）\)]\s*|\d+\s*[\.\、\）\)]|\d+\.)/);
        if (numberMatch) {
            questionNumber = numberMatch[0].trim();
            // 从题干中移除题号
            questionText = questionText.substring(numberMatch[0].length).trim();
        }
        
        // 匹配分数 (括号中的数字+可能的小数点)
        const scoreMatch = questionText.match(/\(\s*(\d+(?:\.\d+)?)\s*(?:分)?\s*\)/);
        if (scoreMatch) {
            questionScore = scoreMatch[1];
            // 从题干中移除分数
            questionText = questionText.replace(scoreMatch[0], '').trim();
        }

        // 新增：识别括号内的选项作为答案 (例如: (ABCD) 或（ABCD）等格式)
        const bracketAnswerMatch = questionText.match(/[（\(]\s*([A-D]+)\s*[）\)]/i);
        if (bracketAnswerMatch) {
            // 如果找到括号中的答案，覆盖之前可能找到的答案
            answer = bracketAnswerMatch[1].toUpperCase();
            
            // 只移除括号内的答案字母，保留括号本身
            questionText = questionText.replace(/([（\(])\s*[A-D]+\s*([）\)])/i, '$1$2').trim();
        }

        // 提取选项 - 支持多种选项格式：A. A、A．
        const optionsRegex = /([A-D])[.．、]?\s*(.*?)(?=\s*[A-D][.．、]|\s*$|\s*(?:正确答案|答案)[:：])/gsi;
        const options = [];
        let optionMatch;
        
        while ((optionMatch = optionsRegex.exec(questionText)) !== null) {
            options.push({
                label: optionMatch[1].toUpperCase(),
                text: optionMatch[2].trim()
            });
        }

        // 提取题干（选项之前的文本）
        let questionTitle = questionText;
        if (options.length > 0) {
            const firstOptionIndex = questionText.search(/[A-D][.．、]/i);
            if (firstOptionIndex !== -1) {
                questionTitle = questionText.substring(0, firstOptionIndex).trim();
            }
        }

        // 确保有4个选项（A、B、C、D）
        const optionLabels = ['A', 'B', 'C', 'D'];
        const existingLabels = options.map(opt => opt.label);
        
        optionLabels.forEach(label => {
            if (!existingLabels.includes(label)) {
                options.push({
                    label: label,
                    text: '未提供选项'
                });
            }
        });

        // 按选项标签排序
        options.sort((a, b) => optionLabels.indexOf(a.label) - optionLabels.indexOf(b.label));

        // 判断题目类型（单选/多选）
        const isMultipleChoice = answer.length > 1;

        return {
            number: questionNumber,
            score: questionScore,
            title: questionTitle,
            options: options,
            answer: answer,
            userAnswer: null,
            isCorrect: null,
            isMultipleChoice: isMultipleChoice, // 新增：标记题目类型
            userAnswers: isMultipleChoice ? [] : null // 新增：多选题用户选择的答案数组
        };
    }

    // 公开API
    return {
        parseQuestions: parseQuestions
    };
})(); 