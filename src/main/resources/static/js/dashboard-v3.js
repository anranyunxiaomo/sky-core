/**
 * =================================================================
 * Dashboard JavaScript - Sky-Core API 仪表盘核心逻辑
 * =================================================================
 * 
 * 功能模块：
 * 1. 星空粒子动画 (Star Constellation Animation)
 * 2. 流星特效 (Meteor Shower Effect)
 * 3. API 客户端 (API Client)
 * 4. 历史记录管理 (History Manager)
 * 5. UI 交互逻辑 (UI Interaction Logic)
 * 6. 侧边栏折叠 (Sidebar Toggle)
 * 7. 模态框管理 (Modal Management)
 * 8. 请求调试台 (Console Debugger)
 */


/**
 * 全局配置常量
 * 集中管理魔法数字和配置项
 */
const CONFIG = {
    PARTICLE_COUNT: 50,           // 星空粒子数量
    CONNECTION_DISTANCE: 150,     // 连线距离阈值
    HISTORY_MAX_ITEMS: 5          // 历史记录最大条数
};

const JSON_HIGHLIGHT_REGEX = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

// =========================================================================
// 模块 1: 星空粒子动画 (Star Constellation Animation)
// =========================================================================
(function () {
    const canvas = document.getElementById('star-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;
    let particles = [];

    /**
     * 调整画布大小以适应窗口
     * 当窗口大小改变时自动调用
     */
    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    /**
     * 粒子类 - 星空动画的基本单元
     * 每个粒子有位置、速度和大小属性
     */
    class Particle {
        /**
         * 构造函数 - 随机初始化粒子属性
         */
        constructor() {
            this.x = Math.random() * width;  // 随机X坐标
            this.y = Math.random() * height; // 随机Y坐标
            this.vx = (Math.random() - 0.5) * 0.5; // X方向速度
            this.vy = (Math.random() - 0.5) * 0.5; // Y方向速度
            this.size = Math.random() * 2 + 1;     // 粒子大小
        }
        /**
         * 更新粒子位置
         * 边界碰撞时反向移动
         */
        update() {
            this.x += this.vx;
            this.y += this.vy;
            // 边界检测：碰到边缘则反向
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        /**
         * 绘制粒子到画布
         * 使用白色半透明圆形表示星星
         */
        draw() {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // 绘制粒子和连接线
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.update();
            p.draw();

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONFIG.CONNECTION_DISTANCE) {
                    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - dist / CONFIG.CONNECTION_DISTANCE})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate);
    }
    animate();
})();

// =========================================================================
// 模块 2-8: 主要业务逻辑 (Dashboard Core Logic)
// =========================================================================
/**
 * Smart Relay 仪表盘核心逻辑
 * 包含：
 * 1. ApiClient: 统一的 HTTP 请求客户端
 * 2. HistoryManager: 控制台请求历史记录管理
 * 3. UI 交互逻辑 (弹窗、折叠、参数处理)
 */
class ApiClient {
    /**
     * 解析完整 URL
     * 自动处理路径拼接和协议头补全
     * @param {string} base 基础 URL (e.g. http://localhost:8080)
     * @param {string} path 相对路径 (e.g. /api/user)
     */
    static resolveUrl(base, path) {
        let b = (base || '').trim();
        let p = (path || '').trim();
        if (!p) return b;

        // 1. 处理 p 已经是完整 URL 的情况
        if (p.startsWith('http')) return p;
        if (p.startsWith('/http')) return p.slice(1);

        // 2. 自动补全 Base URL 协议头 (修复用户仅输入 IP:Port 导致请求失败的问题)
        // [修改] 允许以 / 开头的相对路径 (适配 Nginx 反向代理)
        if (b && !b.startsWith('http') && !b.startsWith('/')) {
            b = 'http://' + b;
        }

        // 3. 规范化斜杠拼接
        if (b.endsWith('/')) b = b.slice(0, -1);
        if (!p.startsWith('/')) p = '/' + p;

        return b + p;
    }

    static parseHeaders(headerStr) {
        const headers = {};
        if (!headerStr) return headers;
        headerStr.split('\n').forEach(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
                headers[parts[0].trim()] = parts.slice(1).join(':').trim();
            }
        });
        return headers;
    }

    /**
     * 准备并执行 fetch 请求
     * @param {string} method GET, POST 等
     * @param {string} url 完整 URL
     * @param {object} headers 请求头对象
     * @param {string} bodyStr 原始请求体字符串 (JSON 或 Key:Val)
     * @param {string} bodyMode 'json' 或 'form'
     */
    static async send(method, url, headers, bodyStr, bodyMode) {
        // 合并全局 Headers
        const globalRaw = localStorage.getItem('sky_global_headers') || '';
        const globalHeaders = ApiClient.parseHeaders(globalRaw);
        const mergedHeaders = { ...globalHeaders, ...headers };

        const opts = { method, headers: mergedHeaders };
        let targetUrl = url;

        // 0. 路径参数替换 (查找 URL 中的 {name})
        const usedPathKeys = new Set();
        if (bodyMode === 'form' && bodyStr) {
            bodyStr.split('\n').forEach(line => {
                const [k, ...v] = line.split(':');
                if (k && k.trim()) {
                    const key = k.trim();
                    const val = v.join(':').trim();
                    const placeholder = '{' + key + '}';
                    if (targetUrl.includes(placeholder)) {
                        // 修复：使用 split/join 替换所有出现
                        targetUrl = targetUrl.split(placeholder).join(encodeURIComponent(val));
                        usedPathKeys.add(key);
                    }
                }
            });
        }

        // Content-Type 检测
        const hasCT = Object.keys(opts.headers).some(k => k.toLowerCase() === 'content-type');

        if (method === 'GET' || method === 'HEAD') {
            // GET 请求: 将 Form Body 解析为查询参数 (Query Params)
            if (bodyMode === 'form' && bodyStr) {
                const params = new URLSearchParams();
                bodyStr.split('\n').forEach(line => {
                    const [k, ...v] = line.split(':');
                    if (k && k.trim()) {
                        const key = k.trim();
                        if (!usedPathKeys.has(key)) {
                            params.append(key, v.join(':').trim());
                        }
                    }
                });
                const qs = params.toString();
                if (qs) targetUrl += (targetUrl.includes('?') ? '&' : '?') + qs;
            }
            delete opts.body;
        } else {
            // POST/PUT 等非 GET 请求
            if (bodyMode === 'json') {
                if (!hasCT) opts.headers['Content-Type'] = 'application/json';
                try {
                    JSON.parse(bodyStr);
                    opts.body = bodyStr;
                } catch (e) {
                    opts.body = bodyStr;
                }
            } else {
                // Form 模式 -> x-www-form-urlencoded
                if (!hasCT) opts.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                const params = new URLSearchParams();
                if (bodyStr) {
                    bodyStr.split('\n').forEach(line => {
                        const [k, ...v] = line.split(':');
                        if (k && k.trim()) params.append(k.trim(), v.join(':').trim());
                    });
                }
                opts.body = params;
            }
        }

        const startTime = Date.now();
        try {
            const res = await fetch(targetUrl, opts);
            const duration = Date.now() - startTime;

            let text = '';
            let isJson = false;
            const ct = res.headers.get('content-type');

            if (ct && ct.includes('json')) {
                const j = await res.json();
                text = JSON.stringify(j, null, 2);
                isJson = true;
            } else {
                text = await res.text();
            }

            return {
                ok: res.ok,
                status: res.status,
                statusText: res.statusText,
                duration: duration,
                size: new Blob([text]).size,
                text: text,
                isJson: isJson
            };
        } catch (e) {
            return {
                ok: false,
                status: 0,
                statusText: 'Network Error',
                duration: Date.now() - startTime,
                size: 0,
                text: 'Error: ' + e.message,
                isJson: false
            };
        }
    }
}

// 存储 API 响应：{ "normalized_path": "response_text" }
window.API_RESPONSES = {};

/**
 * 历史记录管理器 (用于控制台状态持久化)
 */
class HistoryManager {
    static saveState() {
        try {
            const state = {
                method: document.getElementById('c-method').value,
                url: document.getElementById('c-url').value,
                base: document.getElementById('c-base').value,
                body: document.getElementById('c-body').value,
                headers: document.getElementById('c-headers').value,
                bodyMode: window.cBodyMode || 'json'
            };
            localStorage.setItem('sky_console_state', JSON.stringify(state));
        } catch (e) { console.error(e); }
    }

    static loadState() {
        try {
            const saved = localStorage.getItem('sky_console_state');
            if (!saved) return;
            const state = JSON.parse(saved);
            if (state.method) document.getElementById('c-method').value = state.method;
            if (state.url) document.getElementById('c-url').value = state.url;

            // 防御性编程：防止 "1" 异常值
            if (state.base && state.base !== '1' && state.base.length > 1) {
                document.getElementById('c-base').value = state.base;
            }

            if (state.body) document.getElementById('c-body').value = state.body;
            if (state.headers) document.getElementById('c-headers').value = state.headers;
            if (state.bodyMode) window.setConsoleBodyType(state.bodyMode);
            if (window.updateConsoleUI) window.updateConsoleUI();
        } catch (e) { }
    }
}

// --- GLOBAL DATA ---
let CONTROLLER_GROUPS = {};
let BASE_URL = "";
window.currentPathStr = '';
window.activeItemPathEl = null;
window.cBodyMode = 'json';

// ============ P0 极简功能增强 ============
// 请求历史功能
/**
 * 请求历史管理器
 * 用于保存和加载用户的 API 请求历史
 */
const RequestHistory = {
    /**
     * 保存请求到 LocalStorage
     * @param {Object} request - 请求对象（包含 method, url, headers 等）
     */
    save(request) {
        try {
            const history = JSON.parse(localStorage.getItem('sky-history') || '[]');
            // 添加时间戳并插入到数组开头
            history.unshift({ ...request, timestamp: Date.now() });
            // 保留最近的 N 条记录
            localStorage.setItem('sky-history', JSON.stringify(history.slice(0, CONFIG.HISTORY_MAX_SIZE)));
        } catch (e) {
            console.warn('[RequestHistory] Failed to save:', e);
        }
    },
    /**
     * 从 LocalStorage 加载历史记录
     * @returns {Array} 历史请求数组
     */
    load() {
        try {
            return JSON.parse(localStorage.getItem('sky-history') || '[]');
        } catch (e) {
            console.warn('[RequestHistory] Failed to load:', e);
            return [];
        }
    },
    /**
     * 恢复指定的历史记录到当前请求
     * @param {number} index - 历史记录索引
     */
    restore(index) {
        try {
            const history = this.load();
            const item = history[index];
            if (item) {
                // TODO: 恢复请求参数到 UI (待实现)
                console.log('[RequestHistory] Restoring:', item);
            }
            return item || null; // 确保未找到时返回 null，保持一致性
        } catch (e) {
            console.warn('[RequestHistory] Failed to restore:', e);
            return null;
        }
    }
};

/**
 * JSON 美化函数
 * 将 JSON 文本格式化并添加语法高亮
 * @param {string} text - JSON 文本
 * @returns {string} 格式化后的 HTML
 */
function prettyJSON(text) {
    try {
        const obj = JSON.parse(text);
        const formatted = JSON.stringify(obj, null, 2);
        return syntaxHighlight(formatted);
    } catch (e) {
        return escapeHtml(text);
    }
}

/**
 * JSON 语法高亮函数
 * 为 JSON 文本添加颜色高亮（字符串、数字、布尔值等）
 * @param {string} json - JSON 文本
 * @returns {string} 带有 HTML 样式的高亮文本
 */
function syntaxHighlight(json) {
    json = escapeHtml(json);
    const JSON_HIGHLIGHT_REGEX = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;
    return json.replace(JSON_HIGHLIGHT_REGEX, (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return `<span class="${cls}">${match}</span>`;
    });
}

// 1️⃣ 历史记录 UI 逻辑
/**
 * 切换历史记录下拉菜单显示/隐藏
 * @param {Event} e - 鼠标事件
 */
function toggleHistoryDropdown(e) {
    e?.stopPropagation();
    const dd = document.getElementById('history-dropdown');
    if (dd) {
        const isVisible = dd.style.display === 'block';
        dd.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) renderHistoryList();
    }
}

// 点击外部关闭
document.addEventListener('click', (e) => {
    const dd = document.getElementById('history-dropdown');
    if (dd && dd.style.display === 'block' && !e.target.closest('#history-dropdown') && !e.target.closest('#history-btn')) {
        dd.style.display = 'none';
    }
});

/**
 * 渲染历史记录列表
 * 将保存的请求历史显示为下拉列表
 */
function renderHistoryList() {
    const list = document.getElementById('history-list');
    const history = RequestHistory.load();

    if (history.length === 0) {
        list.innerHTML = '<div style="padding:15px; text-align:center; color:#666; font-size:12px;">暂无历史记录</div>';
        return;
    }

    list.innerHTML = history.slice(0, CONFIG.HISTORY_MAX_ITEMS).map((item, index) => `
        <div class="history-item" data-index="${index}">
            <div class="history-method">${item.method || 'GET'}</div>
            <div class="history-url" title="${item.url || ''}">${(item.url || '').length > 40 ? (item.url || '').substring(0, 40) + '...' : (item.url || '')
        }</div>
        </div>
    `).join('');

    // ✅ 使用事件委托代替每个元素添加监听器（避免内存泄漏）
    list.onclick = (e) => {
        const item = e.target.closest('.history-item');
        if (item) {
            const index = parseInt(item.dataset.index);
            restoreHistoryItem(index);
            document.getElementById('history-dropdown').style.display = 'none';
        }
    };
}

/**
 * 恢复历史记录项到当前请求表单
 * @param {number} index - 历史记录的索引
 */
function restoreHistoryItem(index) {
    const history = RequestHistory.load();
    const item = history[index];
    if (!item) return;

    // 恢复 URL 和方法
    document.getElementById('inpUrl').value = item.url || '';
    if (item.method) setMethod(item.method);

    // 恢复请求头
    if (item.headers) {
        document.getElementById('headerKvContainer').innerHTML = '';
        item.headers.split('\n').forEach(line => {
            const [k, ...v] = line.split(':');
            if (k) addHeaderKv(k.trim(), v.join(':').trim());
        });
    }
}

// 6️⃣ 侧边栏折叠逻辑 (Sidebar Toggle)
/**
 * 切换侧边栏显示状态
 * 
 * 控制侧边栏的显示/隐藏，并处理按钮位置和内容区域的响应式调整。
 * @param {Event} [event] - 触发事件（可选）
 */
function toggleSidebarNew(event) {
    if (event) event.stopPropagation();

    const sb = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-toggle');
    const container = document.querySelector('.container'); // 目标容器

    // 强制顶部定位
    btn.style.top = '260px';

    if (sb.style.display === 'none' || !sb.style.display || sb.style.opacity === '0') {
        // 打开侧边栏
        sb.style.display = 'block';
        setTimeout(() => sb.style.opacity = '1', 10);

        // 推动内容区 (恢复此逻辑以防止遮挡)
        if (container) {
            container.classList.add('padded-force');
        }

        // 移动按钮
        // 按钮固定在 left:20px
        btn.style.left = '20px';
        btn.querySelector('span').innerHTML = '✕';
        btn.style.display = 'block'; // 确保可见
    } else {
        // 关闭侧边栏
        sb.style.opacity = '0';

        // 等待淡出动画完成 (300ms)
        setTimeout(() => {
            sb.style.display = 'none';
            // 动画后重置内容区，防止闪烁
            if (container) {
                container.classList.remove('padded-force');
            }
        }, 300);

        // 重置按钮位置
        btn.style.left = '20px';
        btn.querySelector('span').innerHTML = '☰';
    }
}

/**
 * HTML 转义工具函数
 * 防止 XSS 攻击，将特殊字符转换为 HTML 实体
 * @param {string} text - 需要转义的文本
 * @returns {string} 转义后的安全文本
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 快捷键支持
document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('api-search')?.focus();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        document.querySelector('.exec-btn')?.click();
    }
    if (e.key === 'Escape') {
        closeModal();
        closeConsoleModal();
    }
});

// --- UI CORE ---
/**
 * 切换分组折叠/展开状态
 * 
 * 点击控制器名称时切换该组 API 列表的显示/隐藏。
 * 
 * @param {HTMLElement} el - 被点击的分组标题元素
 */
// 5️⃣ API 分组优化：切换逻辑
function toggleSection(el, groupName) {
    const list = el.nextElementSibling;
    const icon = el.querySelector('.group-toggle-icon');

    if (list.style.maxHeight === '0px' || (list.style.maxHeight && list.style.maxHeight !== '2000px')) { // 修复判定逻辑
        // 展开
        list.style.maxHeight = '2000px';
        list.style.opacity = '1';
        list.style.marginTop = '0';
        icon.textContent = '▼';
        if (groupName) localStorage.setItem('group-' + groupName, 'expanded');
    } else {
        // 折叠
        list.style.maxHeight = '0px';
        list.style.opacity = '0';
        list.style.marginTop = '-10px';
        icon.textContent = '▶';
        if (groupName) localStorage.setItem('group-' + groupName, 'collapsed');
    }
}

/**
 * 显示模态框
 * 渐隐动画显示 overlay 和 modal
 */
function showModal() {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    overlay.style.display = 'block';
    modal.style.display = 'block';
    setTimeout(() => {
        overlay.classList.add('active');
        modal.classList.add('active');
    }, 10);
}

/**
 * 关闭模态框
 * 渐隐动画隐藏 overlay 和 modal
 */
function closeModal() {
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    overlay.classList.remove('active');
    modal.classList.remove('active');
    setTimeout(() => {
        overlay.style.display = 'none';
        modal.style.display = 'none';
    }, 300);
}

/**
 * 设置 HTTP 请求方法
 * 同步更新 UI 显示，并根据方法类型显示/隐藏 Body 区域
 * @param {string} m - HTTP 方法（GET, POST, PUT, DELETE 等）
 */
function setMethod(m) {
    document.getElementById('inpMethod').value = m;
    // 更新分段控件选中状态
    document.querySelectorAll('#methodControl .segment').forEach(el => {
        el.classList.toggle('active', el.innerText === (m === 'DELETE' ? 'DEL' : m));
    });
    // POST/PUT/PATCH 时显示 Body 区域
    const isBody = (m === 'POST' || m === 'PUT' || m === 'PATCH');
    const btns = document.getElementById('bodyTypeControl');
    if (btns) btns.style.display = isBody ? 'flex' : 'none';
    if (!isBody) setBodyMode('form');
    else setBodyMode('json');
}

/**
 * 设置 Body 模式（JSON 或 Form）
 * 切换 UI 显示不同的输入区域
 * @param {string} mode - 'json' 或 'form'
 */
function setBodyMode(mode) {
    // 更新切换按钮状态
    document.querySelectorAll('.body-toggle').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-mode') === mode);
    });
    // 切换显示区域
    const isJson = (mode === 'json');
    document.getElementById('kvParamsArea').style.display = isJson ? 'none' : 'block';
    document.getElementById('jsonParamsArea').style.display = isJson ? 'block' : 'none';
    document.getElementById('paramLabel').innerText = isJson ? 'JSON Body' : 'Form Body / Path Params';
}

/**
 * 更新 URL 预览
 * 
 * 根据当前路径参数和查询参数构建完整 URL 预览。
 */
function updateUrlPreview() {
    try {
        let url = window.currentPathStr || '';
        if (!url) return;
        const hostInput = document.getElementById('target-host');
        let base = hostInput ? hostInput.value.trim() : '';

        let finalPath = url;
        document.querySelectorAll('#kvContainer .kv-row').forEach(row => {
            const k = row.querySelector('.key').value.trim();
            const v = row.querySelector('.val').value.trim();
            if (k) {
                // 修复: 使用 split/join 进行稳健替换 (避免 RegExp 特殊字符问题)
                finalPath = finalPath.split('{' + k + '}').join(v || `{${k}}`);
            }
        });

        document.getElementById('inpUrl').value = ApiClient.resolveUrl(base, finalPath);
    } catch (e) { console.error(e); }
}

function addKv(key, val, isPath) {
    const row = document.createElement('div');
    row.className = 'kv-row' + (isPath ? ' path-var-row' : '');
    row.innerHTML = `
                <input class="form-input key" placeholder="Key" value="${key || ''}" style="flex:1;" oninput="updateUrlPreview()" ${isPath ? 'readonly' : ''}>
                <input class="form-input val" placeholder="Value" value="${val || ''}" style="flex:1;" oninput="updateUrlPreview()">
                ${isPath ? '<span style="font-size:10px; color:var(--accent-blue); padding: 0 5px;">PATH</span>' : '<button class="btn-icon" onclick="this.parentElement.remove(); updateUrlPreview();">&times;</button>'}
            `;
    document.getElementById('kvContainer').appendChild(row);
}

/**
 * 添加请求头键值对行
 * @param {string} key - Header 名称
 * @param {string} val - Header 值
 */
function addHeaderKv(key, val) {
    const row = document.createElement('div');
    row.className = 'kv-row';
    row.innerHTML = `
                <input class="form-input key" placeholder="Header Name" value="${key || ''}" style="flex:1;">
                <input class="form-input val" placeholder="Value" value="${val || ''}" style="flex:1;">
                <button class="btn-icon" onclick="this.parentElement.remove();">&times;</button>
            `;
    document.getElementById('headerKvContainer').appendChild(row);
}

// --- DASHBOARD LOGIC ---
/**
 * 初始化仪表盘
 * 
 * 加载并渲染 API 列表，设置搜索功能。
 * 调用顺序：fetch API meta -> renderSidebar() -> setupSearch()
 * 
 * @async
 * @throws {Error} 当 meta API 请求失败时
 */
async function initDashboard() {
    try {
        // 修复: 使用注入的 CTX 变量获取绝对上下文路径，以适配 Nginx 子路径部署
        const contextPath = (typeof CTX !== 'undefined' ? CTX : '');
        const cleanContext = contextPath.endsWith('/') ? contextPath : contextPath + '/';
        const res = await fetch(cleanContext + 'api-dashboard/meta');
        const data = await res.json();
        CONTROLLER_GROUPS = data.controllerGroups;
        BASE_URL = data.baseUrl;

        const hostInput = document.getElementById('target-host');
        if (hostInput && !hostInput.value) hostInput.value = BASE_URL;

        renderSidebar();
        loadHost();
        setupSearch();
    } catch (e) {
        console.error(e);
        // 用户反馈：在侧边栏显示错误消息
        const container = document.getElementById('api-list-container');
        if (container) {
            container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--accent-red);">
                <div style="font-size:24px;margin-bottom:10px">⚠️</div>
                <h4 style="margin:0 0 5px 0;font-size:14px;">无法加载 API</h4>
                <p style="font-size:12px;opacity:0.7;margin-bottom:15px">连接失败或服务器未响应</p>
                <button onclick="initDashboard()" style="background:var(--accent-blue);border:none;color:#fff;padding:6px 16px;border-radius:12px;cursor:pointer;">重试</button>
             </div>`;
        }
        // Assuming this new error block is intended to be added for 'api-content'
        if (document.getElementById('api-content')) {
            document.getElementById('api-content').innerHTML = `<div style="padding:40px;text-align:center;color:var(--accent-red);">
                <h4>⚠️ 加载详情失败</h4>
                <p>${e.message}</p>
            </div>`;
        }
    }
}

/**
 * 渲染侧边栏 API 列表
 * 
 * 根据控制器分组显示 API，支持折叠/展开。
 * 每个 API 项显示：方法、路径、描述、操作按钮。
 * 
 * @global {Object} apiData - API 元数据，由 initDashboard() 加载
 */
function renderSidebar() {
    const container = document.getElementById('api-list-container');
    const sidebarList = document.getElementById('sidebar-list');
    const sidebar = document.getElementById('sidebar');
    if (!container || !sidebarList) return;

    container.innerHTML = '';
    sidebarList.innerHTML = '';
    let index = 0;

    for (const [groupName, endpoints] of Object.entries(CONTROLLER_GROUPS)) {
        const groupId = 'group-' + index++;
        const nav = document.createElement('a');
        nav.className = 'sidebar-item';
        nav.onclick = () => {
            document.getElementById(groupId).scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            nav.classList.add('active');
        };
        nav.innerText = groupName;
        sidebarList.appendChild(nav);

        const section = document.createElement('div');
        section.className = 'controller-section';
        section.id = groupId;

        // 5️⃣ API 分组优化：初始化状态
        const isCollapsed = localStorage.getItem('group-' + groupName) === 'collapsed';
        const arrow = isCollapsed ? '▶' : '▼';

        const title = document.createElement('div');
        title.className = 'controller-title group-header';
        title.style.cursor = 'pointer';
        title.innerHTML = `<span class="group-toggle-icon" style="margin-right:10px; width:15px; display:inline-block;">${arrow}</span>${groupName} <span style="font-size:12px;opacity:0.6;margin-left:10px;">${endpoints.length} APIs</span>`; // 移除了右侧 chevron，统一使用左侧图标
        title.onclick = () => toggleSection(title, groupName);
        section.appendChild(title);

        const list = document.createElement('div');
        list.className = 'api-list';
        // 应用初始状态
        if (isCollapsed) {
            list.style.maxHeight = '0px';
            list.style.opacity = '0';
            list.style.marginTop = '-10px';
        }

        endpoints.forEach(ep => {
            const item = document.createElement('div');
            item.className = 'api-item';
            item.onclick = () => openTest(ep);

            let m = ep.method.replace(/[\[\]]/g, '');
            if (m === 'getAll') m = 'ALL';

            // Ensure innerTEXT is used to prevent XSS
            const badge = document.createElement('span');
            badge.className = `method-badge ${m}`;
            badge.textContent = m;
            item.appendChild(badge);

            const apiInfo = document.createElement('div');
            apiInfo.className = 'api-info';

            const pathDiv = document.createElement('div');
            pathDiv.className = 'api-path';
            pathDiv.setAttribute('data-path', ep.path);
            pathDiv.textContent = ApiClient.resolveUrl(document.getElementById('target-host').value, ep.path);
            apiInfo.appendChild(pathDiv);

            const descDiv = document.createElement('div');
            descDiv.className = 'api-desc';
            descDiv.textContent = ep.description || ep.function;  // textContent自动转义
            apiInfo.appendChild(descDiv);

            item.appendChild(apiInfo);

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'api-actions';
            actionsDiv.onclick = (e) => e.stopPropagation();

            const exportBtn = document.createElement('button');
            exportBtn.className = 'btn-test';
            exportBtn.title = '导出文档';
            exportBtn.textContent = '📜';
            exportBtn.onclick = () => exportDoc(ep);
            actionsDiv.appendChild(exportBtn);

            const consoleBtn = document.createElement('button');
            consoleBtn.className = 'btn-test';
            consoleBtn.textContent = '🛠️';
            consoleBtn.onclick = () => openConsoleWithPreset(ep);
            actionsDiv.appendChild(consoleBtn);

            const testBtn = document.createElement('button');
            testBtn.className = 'btn-test';
            testBtn.textContent = '⚡';
            testBtn.onclick = () => openTest(ep);
            actionsDiv.appendChild(testBtn);

            // [REMOVED] TS Button moved to Modal
            // actionsDiv.appendChild(createTsBtn(ep));

            item.appendChild(actionsDiv);
            list.appendChild(item);
        });
        section.appendChild(list);
        container.appendChild(section);
    }
    // 强制显示侧边栏
    // sidebar.style.display = 'block'; // 根据用户请求默认隐藏
}

/**
 * 打开 API 测试模态框
 * 
 * 打开旧版本的测试模态框，使用全局变量 currentEP 存储当前 API。
 * 
 * @param {Object} ep - API 端点对象
 * @deprecated 考虑使用 openConsoleWithPreset() 代替
 */
/**
 * 打开 API 测试模态框
 * 
 * 初始化并显示 API 测试模态框，加载参数和请求体模板。
 * 
 * @param {Object} ep - API 端点对象
 */
function openTest(ep) {
    // 🌍 保存当前 EP 到全局，供 TS/Mock 功能使用
    window.currentEp = ep;

    window.currentPathStr = ep.path;
    const host = document.getElementById('target-host').value;
    document.getElementById('inpUrl').value = ApiClient.resolveUrl(host, ep.path);

    let m = ep.method.replace(/[\[\]]/g, '');
    if (m === 'getAll') m = 'GET';
    setMethod(m);

    document.getElementById('kvContainer').innerHTML = '';
    if (ep.params) {
        ep.params.split(',').forEach(p => {
            if (p.startsWith('PATH:')) addKv(p.split(':')[1], '{' + p.split(':')[1] + '}', true);
            else if (p.trim()) addKv(p.trim(), '');
        });
    }
    if (!document.getElementById('kvContainer').children.length) addKv('', '');

    // 重置请求头
    document.getElementById('headerKvContainer').innerHTML = '';
    addHeaderKv('', '');

    document.getElementById('inpJson').value = ep.bodyTemplate || '';
    setBodyMode(ep.paramType === 'JSON' ? 'json' : 'form');

    document.getElementById('responseBox').style.display = 'none';
    updateUrlPreview();
    showModal();
}

/**
 * 打开控制台并预填 API 参数
 * 基于 API 端点配置自动填充请求参数、方法和 URL
 * @param {Object} ep - API 端点对象
 */
function openConsoleWithPreset(ep) {
    const modal = document.getElementById('consoleModal');
    document.getElementById('c-method').value = ep.method.replace(/[\[\]]/g, '');
    document.getElementById('c-url').value = ep.path;
    document.getElementById('c-base').value = document.getElementById('target-host').value;
    setConsoleBodyType(ep.paramType === 'JSON' ? 'json' : 'form');
    document.getElementById('c-body').value = ep.bodyTemplate || '';

    modal.style.display = 'block';
    modal.querySelector('.modal').style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
        modal.querySelector('.modal').classList.add('active');
    }, 10);
}

// --- CONSOLE SPECIFIC ---
/**
 * 控制台Tab切换
 * 在 Body 和 Headers tab 之间切换
 * @param {HTMLElement} tab - 被点击的标签元素
 * @param {string} contentId - 要显示的内容区域 ID
 */
function switchConsoleTab(tab, contentId) {
    // 切换标签页
    tab.parentElement.querySelectorAll('.c-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // 切换内容
    document.getElementById('c-tab-body').style.display = 'none';
    document.getElementById('c-tab-headers').style.display = 'none';
    document.getElementById(contentId).style.display = 'block';
}

/**
 * 设置控制台 Body 类型（JSON/Form）
 * @param {string} mode - 'json' 或 'form'
 */
function setConsoleBodyType(mode) {
    window.cBodyMode = mode;
    document.getElementById('c-bt-json')?.classList.toggle('active', mode === 'json');
    document.getElementById('c-bt-form')?.classList.toggle('active', mode === 'form');
    const area = document.getElementById('c-body');
    if (area) area.placeholder = mode === 'json' ? '{ "key": "value" }' : "key: val\nkey2: val2";
}

/**
 * 执行控制台 HTTP 请求
 * 
 * 构建并发送 HTTP 请求，显示响应结果。
 * 支持 JSON/FORM 请求体，自动设置 Content-Type。
 * 
 * @async
 * @throws {Error} 当请求失败或响应解析失败时
 * @see setConsoleBodyType() - 设置请求体类型
 */
async function execConsoleRequest() {
    const method = document.getElementById('c-method').value;
    const path = document.getElementById('c-url').value;
    const baseUrl = document.getElementById('c-base').value;
    const bodyStr = document.getElementById('c-body').value;
    const headerStr = document.getElementById('c-headers').value;
    const headers = ApiClient.parseHeaders(headerStr);

    const url = ApiClient.resolveUrl(baseUrl, path);
    const resBodyEl = document.getElementById('c-res-body');

    // 4️⃣ 加载状态优化
    const btnEl = document.querySelector('.btn-primary[onclick="execConsoleRequest()"]');
    if (btnEl) {
        btnEl.disabled = true;
        btnEl.dataset.originalText = btnEl.innerHTML;
        btnEl.innerHTML = '⏳ 请求中...';
        btnEl.style.opacity = '0.6';
    }

    resBodyEl.innerText = 'Sending...';

    try {
        const res = await ApiClient.send(method, url, headers, bodyStr, window.cBodyMode);
        document.getElementById('c-status-bar').style.display = 'flex';
        document.getElementById('c-status').innerText = res.status;
        document.getElementById('c-time').innerText = res.duration + ' ms';
        document.getElementById('c-size').innerText = res.size + ' B';

        // 3️⃣ 响应结果美化
        if (res.text && res.text.trim().startsWith('{')) {
            resBodyEl.innerHTML = prettyJSON(res.text);
        } else {
            resBodyEl.innerText = res.text;
        }
        resBodyEl.style.color = res.ok ? '#00ffca' : '#d00';

        // 1️⃣ 保存请求历史（移到正确位置）
        RequestHistory.save({
            url: path,
            method: method,
            body: bodyStr,
            headers: headerStr
        });

        HistoryManager.saveState();
    } finally {
        // 4️⃣ 恢复按钮状态
        if (btnEl && btnEl.dataset.originalText) {
            btnEl.disabled = false;
            btnEl.innerHTML = btnEl.dataset.originalText;
            btnEl.style.opacity = '1';
        }
    }
}

function openGlobalConsole() {
    document.getElementById('c-base').value = document.getElementById('target-host').value;
    document.getElementById('c-method').value = 'GET';
    document.getElementById('c-url').value = '';
    document.getElementById('c-body').value = '';
    const modal = document.getElementById('consoleModal');
    modal.style.display = 'block';
    modal.querySelector('.modal').style.display = 'block';
    setTimeout(() => {
        modal.classList.add('active');
        modal.querySelector('.modal').classList.add('active');

        // ✅ 修复：移除了错误的 RequestHistory.save()
        // 因为这是打开空白控制台，不需要保存历史
        // 历史记录会在 execConsoleRequest() 执行后自动保存
    }, 10);
}

function closeConsoleModal() {
    const modal = document.getElementById('consoleModal');
    modal.classList.remove('active');
    modal.querySelector('.modal').classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.querySelector('.modal').style.display = 'none';
    }, 300);
}

// --- UTILS ---
/**
 * 初始化搜索功能
 * 
 * 为搜索输入框添加事件监听，实现实时过滤 API 列表的功能。
 * 支持中文、拼音、路径和方法搜索。
 */
function setupSearch() {
    const searchInput = document.getElementById('api-search');
    if (!searchInput) return;
    searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.api-item').forEach(item => {
            item.style.display = item.innerText.toLowerCase().includes(term) ? 'flex' : 'none';
        });
        document.querySelectorAll('.controller-section').forEach(sec => {
            const visible = sec.querySelectorAll('.api-item:not([style*="none"])').length > 0;
            sec.style.display = visible ? 'block' : 'none';
        });
    };
}

/**
 * 从 LocalStorage 加载主机地址配置
 */
function loadHost() {
    const h = localStorage.getItem('sky-host');
    // 基本验证：忽略 "1" 或过短的值
    if (h && h.length > 1 && h !== '1') {
        document.getElementById('target-host').value = h;
    }
    // 触发初始同步
    updateListUrls();

    document.getElementById('target-host').oninput = function () {
        localStorage.setItem('sky-host', this.value);
        updateListUrls();
    };
}

/**
 * 更新 API 列表中所有 URL 预览
 */
function updateListUrls() {
    const host = document.getElementById('target-host').value;
    document.querySelectorAll('.api-path').forEach(el => {
        const path = el.getAttribute('data-path');
        if (path) {
            el.innerText = ApiClient.resolveUrl(host, path);
        }
    });
}

// --- EXPORT Logic ---
/**
 * 导出 API 文档为 Markdown 格式
 * 
 * 请求后端生成 Markdown 文档，自动下载为 .md 文件。
 * 文档包含：API 基本信息、参数表、响应示例等。
 * 
 * @async
 * @param {Object} ep - API 端点对象，包含 path, method, function 等字段
 * @throws {Error} 当导出 API 请求失败时
 */
function exportDoc(ep) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.method = 'POST';
    // Fix: Use absolute context path from injected CTX variable
    const contextPath = (typeof CTX !== 'undefined' ? CTX : '');
    // Ensure contextPath ends with / and api-dashboard doesn't start with / to avoid //
    const cleanContext = contextPath.endsWith('/') ? contextPath : contextPath + '/';
    form.action = cleanContext + 'api-dashboard/export-md';
    form.style.display = 'none';
    form.style.display = 'none';

    const inputUrl = document.createElement('input');
    inputUrl.name = 'url';
    inputUrl.value = ep.url;
    form.appendChild(inputUrl);

    // 检查是否有此 API 的存储响应
    // 尝试匹配路径
    const validPath = ep.path || '';
    const resp = window.API_RESPONSES[validPath];
    if (resp) {
        const inputResp = document.createElement('input');
        inputResp.name = 'responseBody';
        inputResp.value = resp;
        form.appendChild(inputResp);
    }

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
}

/**
 * 保存设置
 * 将全局请求头配置保存到 LocalStorage
 */
function saveSettings() {
    localStorage.setItem('sky_global_headers', document.getElementById('globalHeaders').value);
    closeSettings();
}

/**
 * 打开设置模态框
 * 显示全局设置弹窗，加载已保存的配置
 */
function openSettings() {
    const s = document.getElementById('settingsOverlay');
    s.style.display = 'block';
    s.querySelector('.modal').style.display = 'block';
    document.getElementById('globalHeaders').value = localStorage.getItem('sky_global_headers') || '';
    setTimeout(() => {
        s.classList.add('active');
        s.querySelector('.modal').classList.add('active');
    }, 10);
}

/**
 * 关闭设置模态框
 */
function closeSettings() {
    const s = document.getElementById('settingsOverlay');
    s.classList.remove('active');
    s.querySelector('.modal').classList.remove('active');
    setTimeout(() => s.style.display = 'none', 300);
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.getElementById('consoleModal').classList.contains('active')) execConsoleRequest();
            else if (document.getElementById('modal').classList.contains('active')) sendRequest();
        }
        if (e.key === 'Escape') {
            closeSettings();
            closeConsoleModal();
            closeModal();
        }
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            document.getElementById('api-search')?.focus();
        }
    });
});

// 背景视差效果
document.addEventListener('scroll', () => {
    document.body.style.backgroundPositionY = -(window.scrollY * 0.2) + 'px';
});

window.openGlobalConsole = openGlobalConsole;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.sendRequest = async function () {
    const box = document.getElementById('responseBox');
    box.style.display = 'block';
    box.innerText = '请求中...';
    const method = document.getElementById('inpMethod').value;
    const url = document.getElementById('inpUrl').value;
    const isJson = document.getElementById('jsonParamsArea').style.display !== 'none';
    const bodyStr = isJson ? document.getElementById('inpJson').value :
        Array.from(document.querySelectorAll('#kvContainer .kv-row')).map(r => r.querySelector('.key').value.trim() + ': ' + r.querySelector('.val').value.trim()).filter(l => l.startsWith(': ') === false).join('\n');

    const headers = {};
    document.querySelectorAll('#headerKvContainer .kv-row').forEach(row => {
        const k = row.querySelector('.key').value.trim();
        const v = row.querySelector('.val').value.trim();
        if (k) headers[k] = v;
    });

    const res = await ApiClient.send(method, url, headers, bodyStr, isJson ? 'json' : 'form');

    // 保存响应以便导出（键：来自 window.currentPathStr 的路径）
    if (res.ok && window.currentPathStr) {
        // 内存保护：限制缓存大小为 50 项
        const currentKeys = Object.keys(window.API_RESPONSES);
        if (currentKeys.length >= 50) {
            delete window.API_RESPONSES[currentKeys[0]]; // 移除最旧的
        }
        window.API_RESPONSES[window.currentPathStr] = res.text;
    }

    const statusBar = document.getElementById('t-status-bar');
    if (statusBar) {
        statusBar.style.display = 'flex';
        document.getElementById('t-status').innerText = res.status;
        document.getElementById('t-status').style.background = res.ok ? '#28a745' : '#dc3545';
        document.getElementById('t-time').innerText = res.duration + ' ms';
        document.getElementById('t-size').innerText = res.size + ' B';
    }

    if (res.text && (res.text.includes('{') || res.text.includes('['))) {
        try { box.innerHTML = syntaxHighlight(JSON.stringify(JSON.parse(res.text), null, 2)); }
        catch (e) { box.innerText = res.text; }
    } else { box.innerText = res.text; }
};

/**
 * JSON 语法高亮
 * 
 * 将 JSON 字符串转换为带有 HTML 样式的高亮显示。
 * 支持：字符串、数字、布尔值、null、键名。
 * 
 * @param {string} json - JSON 字符串
 * @returns {string} 带有 <span> 标签的 HTML 字符串
 * @example
 * syntaxHighlight('{"name": "test"}') // 返回带样式的 HTML
 */
function syntaxHighlight(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(JSON_HIGHLIGHT_REGEX, match => {
        let cls = 'number';
        if (/^"/.test(match)) cls = /:$/.test(match) ? 'key' : 'string';
        else if (/true|false/.test(match)) cls = 'boolean';
        else if (/null/.test(match)) cls = 'null';
        return `<span class="${cls}">${match}</span>`;
    });
}

// --- NEW FEATURES (TS & cURL) ---

/**
 * 修复: cURL 复制功能
 * 从测试模态框中获取当前填写的参数，生成 cURL 命令
 */
function copyCurl() {
    const method = document.getElementById('inpMethod').value || 'GET';
    const url = document.getElementById('inpUrl').value;

    if (!url) {
        showToast('请先选择接口', 2000);
        return;
    }

    let cmd = `curl -X ${method} "${url}"`;

    // 请求头
    // 1. Global Headers
    const globalH = document.getElementById('globalHeaders')?.value;
    if (globalH) {
        globalH.split('\n').forEach(line => {
            const p = line.split(':');
            if (p.length >= 2) cmd += ` -H "${p[0].trim()}: ${p.slice(1).join(':').trim()}"`;
        });
    }
    // 2. Local Headers
    document.querySelectorAll('#headerKvContainer .kv-row').forEach(row => {
        const k = row.querySelector('.k-input')?.value;
        const v = row.querySelector('.v-input')?.value;
        if (k) cmd += ` -H "${k}: ${v || ''}"`;
    });

    // 请求体
    if (method !== 'GET') {
        const bodyType = document.querySelector('#bodyTypeControl .active')?.dataset.mode || 'json';
        if (bodyType === 'json') {
            const json = document.getElementById('inpJson').value;
            if (json) {
                // 转义单引号以确保 Shell 安全
                const escaped = json.replace(/'/g, "'\\''");
                cmd += ` -H "Content-Type: application/json" -d '${escaped}'`;
            }
        } else {
            document.querySelectorAll('#kvContainer .kv-row').forEach(row => {
                const k = row.querySelector('.k-input')?.value;
                const v = row.querySelector('.v-input')?.value;
                if (k) cmd += ` -d "${k}=${v || ''}"`;
            });
        }
    }

    navigator.clipboard.writeText(cmd).then(() => {
        showToast('📋 cURL 已复制到剪贴板');
    }).catch(err => {
        console.error('Copy failed', err);
        showToast('❌ 复制失败，请手动复制');
        prompt("Ctrl+C to copy:", cmd);
    });
}

/**
 * TypeScript 接口生成器
 */
/**
 * TypeScript 接口生成器 (Enhanced)
 * 1. 使用 'export interface'
 * 2. 优化嵌套命名
 * 3. 增加 JSDoc 注释
 */
function generateTS(jsonStr, rootName = 'Root') {
    try {
        const obj = JSON.parse(jsonStr);
        let interfaces = new Map(); // 存储生成的接口以避免重复

        const getType = (v, key, parentName) => {
            if (v === null) return 'any';
            const t = typeof v;
            if (t === 'number') return 'number';
            if (t === 'boolean') return 'boolean';
            if (t === 'string') return 'string';
            if (Array.isArray(v)) {
                if (v.length === 0) return 'any[]';
                // 递归检查数组项类型
                const itemType = getType(v[0], key, parentName);
                if (itemType.includes(' ')) return `(${itemType})[]`; // wrap complex union types
                return `${itemType}[]`;
            }
            if (t === 'object') {
                const typeName = capitalize(parentName) + capitalize(key);
                generateInterface(v, typeName);
                return typeName;
            }
            return 'any';
        };

        const generateInterface = (o, name) => {
            if (interfaces.has(name)) return; // 避免无限循环或重复声明

            let lines = [`export interface ${name} {`];
            for (const k in o) {
                const v = o[k];
                const type = getType(v, k, name);
                lines.push(`    ${k}: ${type};`);
            }
            lines.push('}');
            interfaces.set(name, lines.join('\n'));
        };

        const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

        // 入口点
        if (Array.isArray(obj)) {
            const rootItemName = rootName.endsWith('List') ? rootName.slice(0, -4) : rootName + 'Item';
            generateInterface(obj[0] || {}, rootItemName);
            return Array.from(interfaces.values()).join('\n\n') + `\n\nexport type ${rootName} = ${rootItemName}[];`;
        } else {
            generateInterface(obj, rootName);
            return Array.from(interfaces.values()).join('\n\n');
        }

    } catch (e) {
        return `// 生成 TS 时出错：${e.message}\n// 请手动修改原始 JSON`;
    }
}

/**
 * [兼容性适配器] 供 dashboard.html 中的按钮调用
 * 
 * 映射关系：
 * TS 按钮 -> fillRequestData (填充请求参数)
 * Mock 按钮 -> mockResponseData (生成模拟返回值)
 */
function generateCurrentTS() {
    if (!window.currentEp) {
        showToast('❌ 请先选择一个接口');
        return;
    }
    const ep = window.currentEp;
    if (!ep.bodyTemplate) {
        showToast('⚠️ 当前接口无请求体模板 (无需填充)');
        return;
    }
    fillRequestData(ep.bodyTemplate);
}

function mockCurrentData() {
    if (!window.currentEp) {
        showToast('❌ 请先选择一个接口');
        return;
    }
    const ep = window.currentEp;
    // 即使没有模板，也可以生成简单的结构或提示
    if (!ep.responseBodyTemplate) {
        showToast('ℹ️ 当前接口无响应模板，生成通用 Mock');
        mockResponseData('{"message": "Success", "code": 0}');
        return;
    }
    mockResponseData(ep.responseBodyTemplate);
}

/**
 * 注入 TS 按钮到侧边栏
 * (Called by renderSidebar)
 */
/**
 * 智能 Mock 数据生成器
 * 用于在后端未实现时，前端生成假数据
 */
/**
 * 注入 TS 和 Mock 按钮
 */
function createTsBtn(ep) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'contents';

    // TS 按钮 -> 改为 "自动填充请求参数" (Fill Request)
    // 用户的需求：TS 功能 = 接口参数填充
    if (ep.bodyTemplate) {
        const btnFill = document.createElement('button');
        btnFill.className = 'btn-test';
        btnFill.innerHTML = '⚡️ 填充';
        btnFill.title = '根据 TS 定义自动填充请求参数 (Fill Request)';
        btnFill.style.color = '#3178c6';
        btnFill.onclick = (e) => {
            e.stopPropagation();
            fillRequestData(ep.bodyTemplate);
        };
        wrapper.appendChild(btnFill);
    }

    // Mock 按钮 -> "提供模拟返回值" (Mock Response)
    if (ep.responseBodyTemplate) {
        const btnMock = document.createElement('button');
        btnMock.className = 'btn-test';
        btnMock.innerHTML = '🎭 Mock';
        btnMock.title = '生成模拟返回值 (Mock Response)';
        btnMock.style.color = '#e2b340';
        btnMock.onclick = (e) => {
            e.stopPropagation();
            mockResponseData(ep.responseBodyTemplate);
        };
        wrapper.appendChild(btnMock);
    }

    return wrapper;
}

/**
 * [新功能] 根据模板自动填充请求参数
 * 对应用户需求：TS功能 = 接口参数填充
 */
function fillRequestData(templateStr) {
    try {
        const template = JSON.parse(templateStr);
        const mockData = generateMockFromTemplate(template);
        const jsonStr = JSON.stringify(mockData, null, 2);

        // 自动切换到 JSON 模式
        setBodyMode('json');

        // 填充到输入框
        const input = document.getElementById('inpJson');
        if (input) {
            input.value = jsonStr;
            // 触发高亮或格式化（如果有）
        }
        showToast('⚡️ 请求参数已自动填充');
    } catch (e) {
        console.error(e);
        showToast('❌ 参数填充失败: 模板无效');
    }
}

/**
 * [优化] 生成模拟返回值
 * 对应用户需求：Mock功能 = 模拟返回值
 */
function mockResponseData(templateStr) {
    try {
        const template = JSON.parse(templateStr);
        const mockData = generateMockFromTemplate(template);

        // 显示在响应结果框
        const box = document.getElementById('responseBox');
        if (box) {
            box.innerHTML = syntaxHighlight(JSON.stringify(mockData, null, 2));
            showToast('🎭 Mock 返回值已生成', 1500);
        }
    } catch (e) {
        showToast('❌ Mock 生成失败');
    }
}

/**
 * [核心逻辑] 智能 Mock 数据生成器
 * 递归生成符合类型的随机数据
 */
function generateMockFromTemplate(tpl) {
    if (tpl === null) return null;

    // 1. 基础类型
    if (typeof tpl === 'number') {
        return Math.floor(Math.random() * 1000); // 随机数字
    }
    if (typeof tpl === 'boolean') {
        return Math.random() > 0.5;
    }

    // 2. 字符串智能识别
    if (typeof tpl === 'string') {
        const lower = tpl.toLowerCase();
        if (lower.includes('time') || lower.includes('date')) return new Date().toISOString();
        if (lower.includes('name')) return 'User-' + Math.floor(Math.random() * 100);
        if (lower.includes('id')) return 'ID-' + Math.random().toString(36).substr(2, 6).toUpperCase();
        if (lower.includes('email')) return `test${Math.floor(Math.random() * 100)}@example.com`;
        if (lower.includes('url')) return 'http://localhost:8080/demo';
        if (lower.includes('status')) return 'ACTIVE';
        if (lower.includes('desc')) return 'This is a mock description.';
        return 'Mock String';
    }

    // 3. 数组生成 (生成 2 个示例项)
    if (Array.isArray(tpl)) {
        if (tpl.length === 0) return [];
        return [generateMockFromTemplate(tpl[0]), generateMockFromTemplate(tpl[0])];
    }

    // 4. 对象递归
    if (typeof tpl === 'object') {
        const res = {};
        for (const k in tpl) {
            res[k] = generateMockFromTemplate(tpl[k]);
        }
        return res;
    }

    return tpl;
}

// 工具：简单提示
function showToast(msg, duration = 2000) {
    let t = document.getElementById('sky-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'sky-toast';
        t.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.8); color:white; padding:10px 20px; border-radius:8px; z-index:9999; font-size:14px; pointer-events:none; transition:opacity 0.3s;";
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.style.opacity = '1';
    setTimeout(() => t.style.opacity = '0', duration);
}
// 为 onclick 全局导出
/**
 * 修复: cURL 复制功能 (智能版)
 * 
 * 自动识别测试弹窗或高级控制台的上下文。
 * 智能处理 Content-Type：GET 请求不添加，POST/PUT 自动添加（除非手动已设）。
 */
function copyCurl() {
    // 1. 判断来源 (简单弹窗 vs 高级控制台)
    const isConsole = document.getElementById('consoleModal').style.display !== 'none';

    // 2. 获取基础信息
    const methodElem = document.getElementById(isConsole ? 'c-method' : 'inpMethod');
    const urlElem = document.getElementById(isConsole ? 'c-url' : 'inpUrl');

    const valMethod = isConsole ? methodElem.value : (methodElem.value || 'GET');
    const valUrl = isConsole
        ? ApiClient.resolveUrl(document.getElementById('c-base').value, urlElem.value)
        : urlElem.value;

    if (!valUrl) {
        showToast('请先选择接口', 2000);
        return;
    }

    let cmd = `curl -X ${valMethod} "${valUrl}"`;
    let addedHeaders = new Set(); // 追踪已添加的 Header，防止重复

    // 3. 处理 Headers
    // (A) 全局 Headers
    const globalH = document.getElementById('globalHeaders')?.value;
    if (globalH) {
        globalH.split('\n').forEach(line => {
            const p = line.split(':');
            if (p.length >= 2) {
                const key = p[0].trim();
                cmd += ` -H "${key}: ${p.slice(1).join(':').trim()}"`;
                addedHeaders.add(key.toLowerCase());
            }
        });
    }

    // (B) 局部 Headers
    if (isConsole) {
        // 控制台: 解析文本域
        const cHeaders = document.getElementById('c-headers').value;
        if (cHeaders) {
            cHeaders.split('\n').forEach(line => {
                const p = line.split(':');
                if (p.length >= 2) {
                    const key = p[0].trim();
                    cmd += ` -H "${key}: ${p.slice(1).join(':').trim()}"`;
                    addedHeaders.add(key.toLowerCase());
                }
            });
        }
    } else {
        // 简单弹窗: 解析 KV 行
        document.querySelectorAll('#headerKvContainer .kv-row').forEach(row => {
            const k = row.querySelector('.k-input')?.value;
            const v = row.querySelector('.v-input')?.value;
            if (k) {
                cmd += ` -H "${k}: ${v || ''}"`;
                addedHeaders.add(k.toLowerCase());
            }
        });
    }

    // 4. 处理 Body 和 Content-Type
    // 只有非 GET/HEAD 请求才处理 Body
    if (valMethod !== 'GET' && valMethod !== 'HEAD') {
        let bodyType = 'json';
        if (isConsole) {
            const activeSeg = document.querySelector('#c-body-controls .segment.active');
            if (activeSeg && activeSeg.innerText.trim() === 'Form') bodyType = 'form';
        } else {
            const activeSeg = document.querySelector('#bodyTypeControl .active');
            if (activeSeg && activeSeg.dataset.mode === 'form') bodyType = 'form';
        }

        if (bodyType === 'json') {
            const jsonVal = document.getElementById(isConsole ? 'c-body' : 'inpJson').value;
            if (jsonVal) {
                // 仅当用户未手动设置 Content-Type 时自动添加
                if (!addedHeaders.has('content-type')) {
                    cmd += ` -H "Content-Type: application/json"`;
                }
                // 转义单引号，防止 Shell 注入
                const escaped = jsonVal.replace(/'/g, "'\\''");
                cmd += ` -d '${escaped}'`;
            }
        } else {
            // 表单数据
            if (isConsole) {
                const raw = document.getElementById('c-body').value;
                if (raw) {
                    if (!addedHeaders.has('content-type')) {
                        cmd += ` -H "Content-Type: application/x-www-form-urlencoded"`;
                    }
                    cmd += ` -d '${raw.replace(/'/g, "'\\''")}'`;
                }
            } else {
                document.querySelectorAll('#kvContainer .kv-row').forEach(row => {
                    const k = row.querySelector('.k-input')?.value;
                    const v = row.querySelector('.v-input')?.value;
                    if (k) cmd += ` -d "${k}=${v || ''}"`;
                });
            }
        }
    }

    navigator.clipboard.writeText(cmd).then(() => {
        showToast('📋 cURL 已复制到剪贴板');
    }).catch(err => {
        console.error('Copy failed', err);
        showToast('❌ 复制失败，请手动复制');
        prompt("Ctrl+C to copy:", cmd);
    });
}




// 全局导出
window.copyCurl = copyCurl;
window.copyResponse = function () {
    const text = document.getElementById('c-res-body').innerText;
    if (text) {
        navigator.clipboard.writeText(text).then(() => showToast('✅ 响应已复制'));
    }
};
