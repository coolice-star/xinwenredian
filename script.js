document.addEventListener('DOMContentLoaded', function() {
    // API地址配置
    window.API_BASE_URL = 'https://xinwenredian.onrender.com/api';
    
    // 初始化日期和时间显示
    updateDateTime();
    
    // 初始化平台选项卡
    initTabs();
    
    // 默认加载微博热搜
    loadHotSearchList('weibo');
    
    // 注册模态框关闭事件
    document.getElementById('closeModal').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modal');
        if (event.target === modal) {
            closeModal();
        }
    });

    // 检查用户登录状态
    handleUserAuth();
});

// 更新日期和时间显示
function updateDateTime() {
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    
    document.getElementById('currentDate').textContent = now.toLocaleDateString('zh-CN', dateOptions);
    document.getElementById('updateTime').textContent = now.toLocaleTimeString('zh-CN', timeOptions);
}

// 初始化平台选项卡
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // 移除所有active类
            tabBtns.forEach(tab => tab.classList.remove('active'));
            
            // 添加active类到当前点击的按钮
            this.classList.add('active');
            
            // 加载对应平台的热搜
            const platform = this.getAttribute('data-platform');
            loadHotSearchList(platform);
        });
    });
}

// 加载热搜列表
function loadHotSearchList(platform) {
    const hotSearchList = document.getElementById('hotSearchList');
    
    // 显示加载状态
    hotSearchList.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>正在加载${getPlatformName(platform)}数据...</p>
        </div>
    `;
    
    // 根据平台获取热搜数据
    fetchHotSearchData(platform)
        .then(data => {
            renderHotSearchList(data, platform);
        })
        .catch(error => {
            console.error('获取热搜数据失败:', error);
            hotSearchList.innerHTML = `
                <div class="error-state">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <p>获取热搜数据失败，请稍后再试</p>
                    <button class="retry-btn" onclick="loadHotSearchList('${platform}')">
                        <i class="fa-solid fa-rotate"></i> 重试
                    </button>
                </div>
            `;
        });
}

// 获取平台名称
function getPlatformName(platform) {
    const platformNames = {
        'weibo': '微博热搜',
        'zhihu': '知乎热榜',
        'baidu': '百度热搜'
    };
    
    return platformNames[platform] || '热搜';
}

// 从API获取热搜数据
async function fetchHotSearchData(platform) {
    try {
        // 使用免费开放的热搜API
        let apiUrl = '';
        
        // 根据平台选择对应的API
        switch(platform) {
            case 'weibo':
                // 使用imsyy开放的微博热搜API
                apiUrl = 'https://api-hot.imsyy.top/weibo';
                break;
            case 'zhihu':
                // 使用imsyy开放的知乎热榜API
                apiUrl = 'https://api-hot.imsyy.top/zhihu';
                break;
            case 'baidu':
                // 使用imsyy开放的百度热搜API
                apiUrl = 'https://api-hot.imsyy.top/baidu';
                break;
            default:
                throw new Error('不支持的平台');
        }
        
        // 显示正在尝试获取数据的状态
        const hotSearchList = document.getElementById('hotSearchList');
        hotSearchList.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>正在获取${getPlatformName(platform)}数据...</p>
            </div>
        `;
        
        // 设置请求超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        // 发送API请求
        const response = await fetch(apiUrl, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        // 清除超时定时器
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 验证API返回的数据格式
        if (!data || data.code !== 200 || !data.data || !Array.isArray(data.data)) {
            throw new Error('API返回的数据格式错误');
        }
        
        // 根据不同平台处理数据
        switch(platform) {
            case 'weibo':
                return processWeiboHotData(data);
            case 'zhihu':
                return processZhihuHotData(data);
            case 'baidu':
                return processBaiduHotData(data);
            default:
                return [];
        }
    } catch (error) {
        console.error(`获取${getPlatformName(platform)}数据出错:`, error);
        
        // 显示特定的错误消息
        let errorMessage = '获取热搜数据失败，请稍后再试';
        
        if (error.name === 'AbortError') {
            errorMessage = '请求超时，请检查网络连接';
        } else if (error.message.includes('服务器响应错误')) {
            errorMessage = `服务器响应异常: ${error.message}`;
        } else if (error.message.includes('数据格式错误')) {
            errorMessage = '数据格式异常，正在使用备用数据';
        }
        
        const hotSearchList = document.getElementById('hotSearchList');
        hotSearchList.innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>${errorMessage}</p>
                <button class="retry-btn" onclick="loadHotSearchList('${platform}')">
                    <i class="fa-solid fa-rotate"></i> 重试
                </button>
                <div class="backup-notice">
                    <i class="fa-solid fa-circle-info"></i>
                    <p>正在切换到备用数据源...</p>
                </div>
            </div>
        `;
        
        // 如果API获取失败，返回备用数据
        return getMockHotSearchData(platform);
    }
}

// 处理微博热搜数据
function processWeiboHotData(data) {
    if (!data || !data.data) {
        return [];
    }
    
    return data.data.slice(0, 15).map((item) => {
        return {
            title: item.title || item.name || '',
            hotIndex: item.hot || '热搜',
            url: item.url || `https://s.weibo.com/weibo?q=${encodeURIComponent(item.title || item.name || '')}`
        };
    });
}

// 处理知乎热榜数据
function processZhihuHotData(data) {
    if (!data || !data.data) {
        return [];
    }
    
    return data.data.slice(0, 15).map((item) => {
        return {
            title: item.title || item.target?.title || '',
            hotIndex: item.hot || item.target?.metrics?.heat || '热度',
            url: item.url || item.target?.url || `https://www.zhihu.com/question/${item.target?.id || ''}`
        };
    });
}

// 处理百度热搜数据
function processBaiduHotData(data) {
    if (!data || !data.data) {
        return [];
    }
    
    return data.data.slice(0, 15).map((item) => {
        return {
            title: item.title || item.word || '',
            hotIndex: item.hot || item.search_index || '热搜',
            url: item.url || item.link || `https://www.baidu.com/s?wd=${encodeURIComponent(item.title || item.word || '')}`
        };
    });
}

// 格式化数字
function formatNumber(num) {
    if (!num) return '0';
    
    if (num >= 100000000) {
        return (num / 100000000).toFixed(1) + '亿';
    } else if (num >= 10000) {
        return (num / 10000).toFixed(1) + '万';
    } else {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

// 渲染热搜列表
function renderHotSearchList(data, platform) {
    const hotSearchList = document.getElementById('hotSearchList');
    let html = '';
    
    data.forEach((item, index) => {
        const rankClass = index < 3 ? `top${index + 1}` : '';
        
        html += `
            <div class="hot-search-item" data-title="${item.title}" data-platform="${platform}">
                <div class="rank ${rankClass}">${index + 1}</div>
                <div class="hot-search-content">
                    <div class="title">${item.title}</div>
                    <div class="hot-index">
                        <i class="fa-solid fa-fire-flame-curved hot-icon"></i>
                        ${item.hotIndex}
                    </div>
                </div>
            </div>
        `;
    });
    
    hotSearchList.innerHTML = html;
    
    // 为每个热搜项添加点击事件
    const hotSearchItems = document.querySelectorAll('.hot-search-item');
    hotSearchItems.forEach(item => {
        item.addEventListener('click', function() {
            // 移除所有selected类
            hotSearchItems.forEach(i => i.classList.remove('selected'));
            
            // 添加selected类到当前点击的项
            this.classList.add('selected');
            
            // 获取热搜标题和平台
            const title = this.getAttribute('data-title');
            const platform = this.getAttribute('data-platform');
            
            // 生成AI内容
            generateContent(title, platform);
        });
    });
}

// 生成AI内容
async function generateContent(title, platform) {
    // 显示加载状态
    document.getElementById('contentGeneration').innerHTML = `
        <div class="loading-content">
            <div class="spinner"></div>
            <p>AI正在分析"${title}"相关新闻，请稍候...</p>
        </div>
    `;
    
    try {
        // 在生产环境中这里应该调用真实的AI生成API
        // 为了演示，这里使用本地模拟的内容
        let content;
        
        // 如果是开发环境，使用本地模拟内容
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            content = await generateLocalContent(title, platform);
        } else {
            // 生产环境中调用真实API
            // 这里应该替换为实际的API调用
            content = await fetchAIGeneratedContent(title, platform);
        }
        
        // 渲染生成的内容
        renderGeneratedContent(content);
    } catch (error) {
        console.error('生成内容失败:', error);
        document.getElementById('contentGeneration').innerHTML = `
            <div class="error-state">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>AI内容生成失败，请稍后再试</p>
                <button class="retry-btn" onclick="generateContent('${title}', '${platform}')">
                    <i class="fa-solid fa-rotate"></i> 重试
                </button>
            </div>
        `;
    }
}

// 从API获取AI生成的内容
async function fetchAIGeneratedContent(title, platform) {
    try {
        // 调用后端API生成内容
        const response = await fetch(`${window.API_BASE_URL}/generate-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                platform
            })
        });
        
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || '生成内容失败');
        }
        
        return data.content;
    } catch (error) {
        console.error('获取AI生成内容失败:', error);
        // 如果API调用失败，返回本地模拟内容
        return getMockGeneratedContent(title, platform);
    }
}

// 生成本地内容
function generateLocalContent(title, platform) {
    // 根据热搜标题中的关键词确定内容类型
    const keywordCategories = {
        政治: ['政府', '政策', '总统', '主席', '国务院', '中央', '会议', '改革', '制度', '法律', '法规', '政治', '选举', '官员', '公务员', '国家', '民族'],
        经济: ['经济', '金融', '股市', '股票', '市场', '贸易', '投资', '债券', '基金', '理财', '银行', '货币', '人民币', '美元', '欧元', '汇率', '通货膨胀', '房价', '房地产', '楼市', '产业'],
        科技: ['科技', '技术', '互联网', '数字', '芯片', '智能', '人工智能', 'AI', '5G', '6G', '通信', '电子', '手机', '电脑', '量子', '航天', '卫星', '航空', '机器人', '算法', '大模型', '大数据'],
        教育: ['教育', '学校', '大学', '高考', '考研', '考试', '学生', '老师', '教师', '课程', '教学', '培训', '学习', '毕业', '学术', '论文', '科研', '留学'],
        社会: ['社会', '事件', '热点', '现象', '话题', '趋势', '群体', '阶层', '就业', '工作', '失业', '创业', '养老', '医疗', '保险', '福利', '公平', '正义', '权利'],
        娱乐: ['明星', '艺人', '演员', '歌手', '音乐', '电影', '电视剧', '综艺', '节目', '娱乐', '爆料', '八卦', '绯闻', '恋情', '婚姻', '时尚', '穿搭', '造型'],
        体育: ['体育', '运动', '比赛', '选手', '球员', '足球', '篮球', '乒乓球', '网球', '奥运', '世界杯', '冠军', '亚军', '季军', '夺冠', '奖牌', '金牌', '银牌', '铜牌'],
        健康: ['健康', '医疗', '医院', '医生', '疾病', '病毒', '药物', '治疗', '症状', '保健', '养生', '饮食', '瘦身', '减肥', '锻炼', '健身', '营养', '免疫', '心理', '精神'],
        环境: ['环境', '气候', '天气', '污染', '环保', '生态', '自然', '灾害', '台风', '地震', '洪水', '干旱', '暴雨', '暴雪', '雾霾', '低碳', '节能', '可持续']
    };
    
    // 确定热搜标题所属的类别
    let category = '';
    const titleLower = title.toLowerCase();
    
    for (const [cat, keywords] of Object.entries(keywordCategories)) {
        for (const keyword of keywords) {
            if (titleLower.includes(keyword)) {
                category = cat;
                break;
            }
        }
        if (category) break;
    }
    
    // 如果没有找到匹配的类别，默认为社会类
    if (!category) {
        category = '社会';
    }
    
    // 根据类别生成标题
    let generatedTitle;
    switch (category) {
        case '政治':
            generatedTitle = `${title}引发广泛关注：政策走向与未来展望`;
            break;
        case '经济':
            generatedTitle = `${title}：市场动态与经济影响分析`;
            break;
        case '科技':
            generatedTitle = `${title}：技术革新如何改变未来`;
            break;
        case '教育':
            generatedTitle = `${title}：教育变革的新思考`;
            break;
        case '社会':
            generatedTitle = `${title}背后的社会现象值得关注`;
            break;
        case '娱乐':
            generatedTitle = `聚焦：${title}引发全民热议`;
            break;
        case '体育':
            generatedTitle = `${title}：体坛盛事背后的精彩故事`;
            break;
        case '健康':
            generatedTitle = `${title}：健康关注与科学解读`;
            break;
        case '环境':
            generatedTitle = `${title}警示：环境保护刻不容缓`;
            break;
        default:
            generatedTitle = `${title}引发广泛关注与思考`;
    }
    
    // 根据类别生成内容
    let paragraphs = [];
    const platformName = getPlatformName(platform);
    
    // 第一段：介绍热搜现象
    paragraphs.push(`近日，"${title}"在${platformName}持续走高，引发广泛关注和讨论。据数据显示，该话题热度不断攀升，相关讨论量和搜索量呈现爆发式增长，成为当下民众关注的焦点之一。`);
    
    // 第二段：根据类别生成相关分析
    switch (category) {
        case '政治':
            paragraphs.push(`分析人士指出，"${title}"反映了当前政策环境的重要变化趋势。各方对此议题展开了深入讨论，专家认为这将对未来的政策走向产生深远影响。相关部门已对此高度重视，并表示将继续关注事态发展。`);
            paragraphs.push(`从历史视角来看，类似"${title}"的议题往往预示着重要的政策调整或制度创新。公众对此表现出浓厚的关注度，反映了民众对国家治理与政策演变的高度参与意识。`);
            break;
        case '经济':
            paragraphs.push(`经济学家表示，"${title}"背后折射出当前经济发展的新动向。市场对此反应强烈，多家金融机构已发布研究报告，分析其对宏观经济和行业发展的潜在影响。投资者密切关注相关动态，市场情绪出现明显波动。`);
            paragraphs.push(`专家预测，随着"${title}"相关事态的进一步发展，可能会对特定行业格局产生结构性影响。企业和个人投资者应密切关注政策导向和市场变化，及时调整策略以应对可能出现的机遇与挑战。`);
            break;
        case '科技':
            paragraphs.push(`科技界专家指出，"${title}"标志着技术创新的重要突破。这一发展可能加速相关领域的技术迭代和产业升级，引领未来发展方向。多家科技企业已表示将加大研发投入，积极布局相关技术路线。`);
            paragraphs.push(`从全球视角看，"${title}"所代表的技术趋势已成为国际竞争的焦点。业内人士认为，把握这一技术发展机遇，对提升国家科技竞争力具有战略意义。普通用户也将从这一技术进步中获益，体验更加智能和便捷的服务。`);
            break;
        case '教育':
            paragraphs.push(`教育界人士表示，"${title}"引发了人们对当前教育方式和理念的深度思考。这一话题的热议反映了社会对教育问题的普遍关注，以及对教育改革的期待。相关教育机构已开始研究应对策略，探索更适合未来发展的教育模式。`);
            paragraphs.push(`有专家指出，"${title}"背后体现的教育现象值得每一位教育工作者和家长深思。只有正视问题、积极应对，才能为下一代创造更好的学习环境和成长空间。期待相关部门能够借此机会，推动教育体系的优化和完善。`);
            break;
        case '社会':
            paragraphs.push(`社会学家分析认为，"${title}"所反映的现象折射出当代社会深层次的变化。这一话题之所以引发广泛共鸣，正是因为它触及了公众的切身体验和情感认同。从某种程度上说，它已成为观察社会发展的一个独特窗口。`);
            paragraphs.push(`不少网友在评论中表达了对"${title}"的个人看法和情感共鸣。这种集体讨论本身就是社会良性互动的体现，有助于凝聚共识、推动问题解决。希望通过理性讨论，能够为相关社会议题找到更好的解决方案。`);
            break;
        case '娱乐':
            paragraphs.push(`文娱产业观察人士表示，"${title}"成为热搜的背后，反映了当下大众文化消费的新趋势。这一话题迅速在各大社交平台发酵，引发粉丝群体的广泛讨论和互动。相关视频和评论的播放量与分享量呈现爆发式增长。`);
            paragraphs.push(`有业内人士指出，"${title}"的热度不仅带动了相关内容的传播，也为产业链上的各方创造了新的商业机会。随着话题持续发酵，预计将带动周边产品销售和相关作品的关注度提升。这一现象也为行业创作提供了新的灵感和方向。`);
            break;
        case '体育':
            paragraphs.push(`体育评论员指出，"${title}"所引发的关注度反映了大众对体育赛事和运动员的热情支持。这一事件不仅是体育领域的重要时刻，也成为国民共同关注的话题。赛场内外的精彩故事和感人瞬间，激发了公众的广泛讨论。`);
            paragraphs.push(`随着"${title}"相关讨论的深入，更多体育背后的故事和价值被挖掘出来。专业人士认为，体育精神和拼搏态度值得每个人学习，这也是体育能够始终保持强大生命力和感染力的关键所在。期待在未来的赛场上看到更多精彩表现。`);
            break;
        case '健康':
            paragraphs.push(`医疗健康专家表示，"${title}"引发的讨论提醒人们更加重视健康管理和疾病预防。相关医疗机构已发布专业解读和建议，帮助公众正确认识这一健康议题。专业医生呼吁公众在获取相关信息时注重科学性和权威性。`);
            paragraphs.push(`健康领域专家强调，面对"${title}"相关信息，公众应保持理性态度，避免不必要的恐慌或忽视。建议通过正规渠道了解专业知识，遵循科学指导，保持健康的生活方式。必要时应及时咨询医疗专业人士，获取个性化的健康建议。`);
            break;
        case '环境':
            paragraphs.push(`环保专家指出，"${title}"背后反映的环境问题值得社会各界高度关注。这一现象提醒人们重新思考人与自然的关系，以及可持续发展的重要性。相关环保组织已展开调研和行动，呼吁公众共同参与环境保护。`);
            paragraphs.push(`分析人士表示，解决"${title}"相关的环境挑战需要政府、企业和个人的共同努力。从政策制定到个人生活习惯的改变，每一步都至关重要。期待通过全社会的协作，能够为子孙后代留下一个更加美丽、健康的地球家园。`);
            break;
        default:
            paragraphs.push(`分析人士指出，"${title}"之所以能够成为热点，主要是因为它触及了当下社会的痛点和难点问题，引发了广泛共鸣。同时，该话题也反映了当前社会发展过程中的一些重要变化和转型。`);
            paragraphs.push(`从趋势来看，随着社会媒体的发展和信息传播速度的加快，类似"${title}"这样的话题将会更加频繁地出现在公众视野中，并引发更广泛的讨论和思考。`);
    }
    
    // 第三段：总结与展望
    paragraphs.push(`我们将持续关注"${title}"的后续发展，为您带来最新的相关资讯和深度分析。期待通过对这一话题的探讨，能够促进社会各界的理性思考，推动相关领域的良性发展。`);
    
    // 转换为HTML格式
    const contentHtml = paragraphs.map(p => `<p>${p}</p>`).join('');
    
    return {
        title: generatedTitle,
        text: contentHtml,
        isBackup: false
    };
}

// 渲染生成的内容
function renderGeneratedContent(content) {
    const contentGeneration = document.getElementById('contentGeneration');
    
    let noticeHtml = '';
    if (content.isBackup && content.isError) {
        noticeHtml = `
            <div class="error-notice">
                <i class="fa-solid fa-triangle-exclamation"></i>
                <p>内容生成失败，请稍后重试</p>
            </div>
        `;
    } else if (content.isBackup) {
        noticeHtml = `
            <div class="backup-notice">
                <i class="fa-solid fa-circle-info"></i>
                <p>当前显示的是备用内容，AI服务暂时不可用</p>
            </div>
        `;
    }
    
    const contentHtml = `
        <div class="generated-content">
            <h2>${content.title}</h2>
            <img src="${content.imageUrl}" alt="${content.title}" class="content-image">
            <div class="content-text">
                ${content.text}
            </div>
            ${noticeHtml}
            <button class="share-btn" onclick="showShareModal('${content.title}')">
                <i class="fa-solid fa-share-nodes"></i> 分享内容
            </button>
        </div>
    `;
    
    contentGeneration.innerHTML = contentHtml;
}

// 显示分享模态框
function showShareModal(title) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <h3>分享"${title}"</h3>
        <div class="share-options">
            <div class="share-option">
                <i class="fab fa-weixin"></i>
                <span>微信</span>
            </div>
            <div class="share-option">
                <i class="fab fa-weibo"></i>
                <span>微博</span>
            </div>
            <div class="share-option">
                <i class="fa-solid fa-link"></i>
                <span>复制链接</span>
            </div>
            <div class="share-option">
                <i class="fa-solid fa-qrcode"></i>
                <span>二维码</span>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

// ===== 模拟数据 =====

// 获取模拟热搜数据（当API请求失败时的备用数据）
function getMockHotSearchData(platform) {
    const mockData = {
        'weibo': [
            { title: '国务院批准浙江宁波等23个城市为第六批国家电子商务示范城市', hotIndex: '3,045,678' },
            { title: '考研成绩公布', hotIndex: '2,987,432' },
            { title: '奥运冠军杨倩宣布退役', hotIndex: '2,543,210' },
            { title: '专家称退休教师被返聘存在法律风险', hotIndex: '2,101,345' },
            { title: '男子花20多万买下自家门前土地铺路', hotIndex: '1,987,654' },
            { title: '医院回应医生拒绝给河南籍患者看病', hotIndex: '1,876,543' },
            { title: '新一轮冷空气将影响我国大部地区', hotIndex: '1,765,432' },
            { title: '14岁女孩玩手机玩到住院', hotIndex: '1,654,321' },
            { title: '今年我国将开建2.3万公里高速公路铁路', hotIndex: '1,543,210' },
            { title: '林志颖因经济纠纷被起诉', hotIndex: '1,432,109' },
            { title: '女子住民宿发现多个隐藏摄像头', hotIndex: '1,321,098' },
            { title: '老人去世7天后跳脱卡', hotIndex: '1,210,987' },
            { title: '新一轮冷空气将影响我国大部地区', hotIndex: '1,098,765' },
            { title: '男子花7000万买别墅发现只是使用权', hotIndex: '987,654' },
            { title: '小学生发明板擦"高铁"走红', hotIndex: '876,543' }
        ],
        'zhihu': [
            { title: '为什么年轻人不愿意进工厂了？', hotIndex: '1,345,678 热度' },
            { title: '大模型技术发展到今天，我们离AGI还有多远？', hotIndex: '1,287,432 热度' },
            { title: '如何看待国内ChatGPT类产品对标OpenAI进行差异化竞争？', hotIndex: '1,143,210 热度' },
            { title: '超长期通勤（单程2小时以上）是一种怎样的体验？', hotIndex: '1,001,345 热度' },
            { title: '本科毕业工作几年后再考研是否值得？', hotIndex: '987,654 热度' },
            { title: '有哪些听起来很高级，实际上很简单的计算机科学术语？', hotIndex: '876,543 热度' },
            { title: '为什么很多老师不愿意当班主任？', hotIndex: '765,432 热度' },
            { title: '如何评价今年的考研形势？', hotIndex: '654,321 热度' },
            { title: '2024年楼市会好转吗？', hotIndex: '543,210 热度' },
            { title: '为什么街边的饭店比高档餐厅的饭菜更香？', hotIndex: '432,109 热度' },
            { title: '有哪些书籍是值得推荐给年轻人看的？', hotIndex: '321,098 热度' },
            { title: '人工智能会导致程序员失业吗？', hotIndex: '210,987 热度' },
            { title: '有什么推荐的国产电影吗？', hotIndex: '198,765 热度' },
            { title: '在大学里如何高效学习？', hotIndex: '187,654 热度' },
            { title: '为什么很多公司技术栈选择Vue而不是React？', hotIndex: '176,543 热度' }
        ],
        'baidu': [
            { title: '世界睡眠日：超3亿中国人有睡眠障碍', hotIndex: '4,762,138 热搜指数' },
            { title: '2024年考研国家线公布', hotIndex: '4,567,890 热搜指数' },
            { title: '油价迎年内第四涨', hotIndex: '4,123,456 热搜指数' },
            { title: '共享单车将迎来定价机制改革', hotIndex: '3,789,012 热搜指数' },
            { title: '今日春分', hotIndex: '3,654,789 热搜指数' },
            { title: '胖东来员工每周单休可享13薪', hotIndex: '3,456,789 热搜指数' },
            { title: '春日樱花正当时', hotIndex: '3,210,987 热搜指数' },
            { title: '著名武侠小说家蔡澜去世', hotIndex: '3,109,876 热搜指数' },
            { title: '清明机票搜索量暴涨12倍', hotIndex: '2,987,654 热搜指数' },
            { title: '男子花20万买土地为全村修路', hotIndex: '2,876,543 热搜指数' },
            { title: '女子应聘被告知996包吃住', hotIndex: '2,765,432 热搜指数' },
            { title: '315晚会曝光的翻新绿皮火车', hotIndex: '2,654,321 热搜指数' },
            { title: '乐山大佛景区洪水退去', hotIndex: '2,543,210 热搜指数' },
            { title: '多地拟将牛肉面纳入非遗', hotIndex: '2,432,109 热搜指数' },
            { title: '苹果因降频门在欧盟赔偿每人67欧元', hotIndex: '2,321,098 热搜指数' }
        ]
    };
    
    return mockData[platform] || [];
}

// 获取模拟生成的内容
function getMockGeneratedContent(title, platform) {
    // 随机图片URL
    const randomImageNumber = Math.floor(Math.random() * 10) + 1;
    const imageUrl = `https://source.unsplash.com/random/800x450?sig=${randomImageNumber}&news`;
    
    // 构建内容文本
    const text = `
        <p>近日，"${title}"引发广泛关注和讨论。据${getPlatformName(platform)}显示，该话题热度持续攀升，引发社会各界热议。</p>
        <p>相关专家表示，这一现象反映了当前社会的重要趋势和民众关注的焦点。从数据分析来看，该话题在短时间内获得了大量的讨论量和转发量，体现了公众对此事件的高度关注。</p>
        <p>有分析人士指出，"${title}"之所以能够成为热点，主要是因为它触及了当下社会的痛点和难点问题，引发了广泛共鸣。同时，该话题也反映了当前社会发展过程中的一些重要变化和转型。</p>
        <p>从趋势来看，随着社会媒体的发展和信息传播速度的加快，类似"${title}"这样的话题将会更加频繁地出现在公众视野中，并引发更广泛的讨论和思考。</p>
        <p>我们将持续关注"${title}"的后续发展，为您带来最新的相关资讯和深度分析。</p>
    `;
    
    return {
        title: title,
        imageUrl: imageUrl,
        text: text
    };
}

// 为分享按钮和错误状态添加样式
const style = document.createElement('style');
style.textContent = `
    .share-btn {
        background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
        color: white;
        border: none;
        padding: 0.8rem 1.5rem;
        border-radius: 50px;
        font-weight: 500;
        cursor: pointer;
        transition: var(--transition);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-top: 2rem;
        box-shadow: 0 4px 12px rgba(255, 56, 92, 0.2);
    }
    
    .share-btn i {
        margin-right: 8px;
    }
    
    .share-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(255, 56, 92, 0.3);
    }
    
    .share-options {
        display: flex;
        justify-content: space-around;
        margin-top: 2rem;
    }
    
    .share-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        padding: 1rem;
        border-radius: 8px;
        transition: var(--transition);
    }
    
    .share-option:hover {
        background-color: rgba(0, 0, 0, 0.03);
    }
    
    .share-option i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: var(--accent-color);
    }

    .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 2rem;
        color: var(--light-text);
    }

    .error-state i {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: var(--primary-color);
    }

    .retry-btn {
        margin-top: 1rem;
        background-color: var(--secondary-color);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
    }

    .retry-btn i {
        margin-right: 6px;
    }
    
    .error-notice {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: rgba(255, 56, 92, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        color: var(--primary-color);
    }
    
    .error-notice i {
        margin-right: 8px;
        font-size: 1.2rem;
    }
    
    .error-notice p {
        margin: 0;
        font-size: 0.9rem;
    }
    
    .backup-notice {
        margin-top: 1.5rem;
        padding: 1rem;
        background-color: rgba(72, 118, 255, 0.1);
        border-radius: 8px;
        display: flex;
        align-items: center;
        color: #4876FF;
    }
    
    .backup-notice i {
        margin-right: 8px;
        font-size: 1.2rem;
    }
    
    .backup-notice p {
        margin: 0;
        font-size: 0.9rem;
    }
`;

document.head.appendChild(style);

// 用户登录状态管理
function handleUserAuth() {
    const userActionsElement = document.getElementById('userActions');
    if (!userActionsElement) return;

    // 获取用户信息
    const user = getCurrentUser();

    if (user) {
        // 用户已登录，显示用户信息和退出按钮
        userActionsElement.innerHTML = `
            <div class="user-info">
                <span class="username"><i class="fas fa-user-circle"></i> ${user.username}</span>
                <button id="logoutBtn" class="logout-btn"><i class="fas fa-sign-out-alt"></i> 退出登录</button>
            </div>
        `;

        // 添加退出登录事件
        document.getElementById('logoutBtn').addEventListener('click', function() {
            // 调用共享的登出函数
            logout();
        });
    } else {
        // 用户未登录，显示登录和注册按钮
        userActionsElement.innerHTML = `
            <a href="login.html" class="auth-link" id="loginBtn">登录</a>
            <a href="register.html" class="auth-link register" id="registerBtn">注册</a>
        `;
    }
} 