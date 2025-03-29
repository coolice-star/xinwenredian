document.addEventListener('DOMContentLoaded', function() {
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
        let apiUrl = '';
        
        // 根据平台选择对应的API
        switch(platform) {
            case 'weibo':
                // 使用微博热搜API
                apiUrl = 'https://weibo.com/ajax/side/hotSearch';
                break;
            case 'zhihu':
                // 使用知乎热榜API
                apiUrl = 'https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=50&desktop=true';
                break;
            case 'baidu':
                // 由于跨域限制，这里使用jsonp代理访问百度热搜
                return fetchBaiduHotSearch();
            default:
                throw new Error('不支持的平台');
        }
        
        // 为避免跨域问题，使用cors代理
        const corsProxyUrl = 'https://corsproxy.io/?';
        const response = await fetch(corsProxyUrl + encodeURIComponent(apiUrl));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 根据不同平台处理数据
        switch(platform) {
            case 'weibo':
                return processWeiboData(data);
            case 'zhihu':
                return processZhihuData(data);
            default:
                return [];
        }
    } catch (error) {
        console.error('获取热搜数据出错:', error);
        // 如果API获取失败，返回备用数据
        return getMockHotSearchData(platform);
    }
}

// 处理微博热搜数据
function processWeiboData(data) {
    if (!data || !data.data || !data.data.realtime) {
        return [];
    }
    
    // 从微博API响应中提取热搜数据
    return data.data.realtime.slice(0, 15).map((item, index) => {
        return {
            title: item.note,
            hotIndex: formatNumber(item.num),
            url: `https://s.weibo.com/weibo?q=${encodeURIComponent('#' + item.note + '#')}`
        };
    });
}

// 处理知乎热榜数据
function processZhihuData(data) {
    if (!data || !data.data) {
        return [];
    }
    
    // 从知乎API响应中提取热搜数据
    return data.data.slice(0, 15).map((item, index) => {
        const target = item.target;
        return {
            title: target.title,
            hotIndex: `${formatNumber(target.metrics.heat)} 热度`,
            url: `https://www.zhihu.com/question/${target.id}`
        };
    });
}

// 获取百度热搜数据（使用备用方法）
function fetchBaiduHotSearch() {
    // 由于百度API限制较多，这里使用模拟数据
    return Promise.resolve(getMockHotSearchData('baidu'));
    
    // 如果未来有可用的百度热搜API，可以在这里实现
    // 例如，通过代理服务器或者使用第三方API服务
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
function generateContent(title, platform) {
    const contentGeneration = document.getElementById('contentGeneration');
    
    // 显示生成中状态
    contentGeneration.innerHTML = `
        <div class="generating">
            <h3>正在为您生成"${title}"的相关图文</h3>
            <div class="progress-bar">
                <div class="progress"></div>
            </div>
            <p>AI正在分析热搜内容，请稍候...</p>
        </div>
    `;
    
    // 模拟向AI服务发送请求生成内容
    // 实际使用时，这里应该调用真实的AI生成API
    setTimeout(() => {
        // 获取模拟生成的内容
        const generatedContent = getMockGeneratedContent(title, platform);
        renderGeneratedContent(generatedContent);
    }, 3000);
}

// 渲染生成的内容
function renderGeneratedContent(content) {
    const contentGeneration = document.getElementById('contentGeneration');
    
    contentGeneration.innerHTML = `
        <div class="generated-content">
            <h2>${content.title}</h2>
            <img src="${content.imageUrl}" alt="${content.title}" class="content-image">
            <div class="content-text">
                ${content.text}
            </div>
            <button class="share-btn" onclick="showShareModal('${content.title}')">
                <i class="fa-solid fa-share-nodes"></i> 分享内容
            </button>
        </div>
    `;
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
`;

document.head.appendChild(style); 