const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'https://your-render-app-name.onrender.com'],
  methods: ['GET', 'POST'],
  credentials: true
})); // 允许跨域请求
app.use(express.json()); // 解析JSON请求体

// 配置静态文件托管 - 如果前端和后端要一起部署
const staticPath = process.env.NODE_ENV === 'production' 
  ? path.join(__dirname, '../') 
  : path.join(__dirname, '../');
app.use(express.static(staticPath));

// 用户数据文件路径
const usersFilePath = path.join(__dirname, 'users.json');

// 读取用户数据
const getUsersData = () => {
  try {
    const usersData = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(usersData);
  } catch (error) {
    console.error('读取用户数据出错:', error);
    // 如果文件不存在或内容为空，返回初始结构
    return { users: [] };
  }
};

// 保存用户数据
const saveUsersData = (data) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('保存用户数据出错:', error);
  }
};

// 确保用户数据文件存在
const ensureUsersFileExists = () => {
  if (!fs.existsSync(usersFilePath)) {
    saveUsersData({ users: [] });
    console.log('已创建新的users.json文件');
  }
};

// 启动时检查并确保用户数据文件存在
ensureUsersFileExists();

// API根路径
app.get('/api', (req, res) => {
  res.json({
    message: '热搜榜单API服务正在运行',
    status: 'online',
    version: '1.0.0'
  });
});

// 注册API
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证请求数据
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 读取当前用户数据
    const usersData = getUsersData();

    // 检查用户名是否已存在
    const userExists = usersData.users.some(user => user.username === username);
    if (userExists) {
      return res.status(400).json({ success: false, message: '用户名已被使用' });
    }

    // 生成密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 创建新用户
    const newUser = {
      id: Date.now().toString(),
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };

    // 添加用户到数据并保存
    usersData.users.push(newUser);
    saveUsersData(usersData);

    // 返回成功响应（不返回密码）
    return res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: newUser.id,
        username: newUser.username,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 登录API
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 验证请求数据
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
    }

    // 读取用户数据
    const usersData = getUsersData();

    // 查找用户
    const user = usersData.users.find(user => user.username === username);
    if (!user) {
      return res.status(400).json({ success: false, message: '用户名不存在' });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: '密码错误' });
    }

    // 返回成功响应（不返回密码）
    return res.status(200).json({
      success: true,
      message: '登录成功',
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 检查用户名是否可用的API
app.post('/api/check-username', (req, res) => {
  try {
    const { username } = req.body;

    // 验证请求数据
    if (!username) {
      return res.status(400).json({ success: false, message: '用户名不能为空' });
    }

    // 读取用户数据
    const usersData = getUsersData();

    // 检查用户名是否已存在
    const userExists = usersData.users.some(user => user.username === username);

    // 返回结果
    return res.status(200).json({
      success: true,
      available: !userExists
    });
  } catch (error) {
    console.error('检查用户名错误:', error);
    return res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 处理前端路由 - 所有未匹配的路由都返回index.html
app.get('*', (req, res) => {
  // 排除API路由
  if (!req.path.startsWith('/api/')) {
    // 如果请求的是HTML页面
    if (req.accepts('html')) {
      // 检查请求的路径是否存在对应的HTML文件
      const htmlFilePath = path.join(staticPath, req.path.endsWith('.html') ? req.path : `${req.path}.html`);
      if (fs.existsSync(htmlFilePath)) {
        res.sendFile(htmlFilePath);
      } else {
        // 如果请求的是根路径，返回welcome.html
        if (req.path === '/') {
          res.sendFile(path.join(staticPath, 'welcome.html'));
        } else {
          // 否则返回index.html，让前端路由处理
          res.sendFile(path.join(staticPath, 'index.html'));
        }
      }
    } else {
      // 对于非HTML请求，返回404
      res.status(404).send('Not found');
    }
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 