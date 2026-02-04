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

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2 + 1;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) particles.push(new Particle());

    function animate() {
        ctx.clearRect(0, 0, width, height);

        // Draw Particles & Connections
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
    static resolveUrl(base, path) {
        let b = (base || '').trim();
        let p = (path || '').trim();
        if (!p) return b;

        // Handle cases where p is already a full URL (including /http://host/path)
        if (p.startsWith('http')) return p;
        if (p.startsWith('/http')) return p.slice(1);

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
     * Prepares and executes the fetch request
     * @param {string} method GET, POST, etc.
     * @param {string} url Full URL
     * @param {object} headers Headers object
     * @param {string} bodyStr Raw body string (JSON or Key:Val)
     * @param {string} bodyMode 'json' or 'form'
     */
    static async send(method, url, headers, bodyStr, bodyMode) {
        // Merge Global Headers
        const globalRaw = localStorage.getItem('sky_global_headers') || '';
        const globalHeaders = ApiClient.parseHeaders(globalRaw);
        const mergedHeaders = { ...globalHeaders, ...headers };

        const opts = { method, headers: mergedHeaders };
        let targetUrl = url;

        // 0. Path Variable Substitution (Search for {name} in URL)
        const usedPathKeys = new Set();
        if (bodyMode === 'form' && bodyStr) {
            bodyStr.split('\n').forEach(line => {
                const [k, ...v] = line.split(':');
                if (k && k.trim()) {
                    const key = k.trim();
                    const val = v.join(':').trim();
                    const placeholder = '{' + key + '}';
                    if (targetUrl.includes(placeholder)) {
                        // Fix: Use split/join to replace ALL occurrences
                        targetUrl = targetUrl.split(placeholder).join(encodeURIComponent(val));
                        usedPathKeys.add(key);
                    }
                }
            });
        }

        // Content-Type Detection
        const hasCT = Object.keys(opts.headers).some(k => k.toLowerCase() === 'content-type');

        if (method === 'GET' || method === 'HEAD') {
            // For GET: Parse Form Body as Query Params
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
            // For POST/PUT/etc
            if (bodyMode === 'json') {
                if (!hasCT) opts.headers['Content-Type'] = 'application/json';
                try {
                    JSON.parse(bodyStr);
                    opts.body = bodyStr;
                } catch (e) {
                    opts.body = bodyStr;
                }
            } else {
                // Form Mode -> x-www-form-urlencoded
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

// Store API responses: { "normalized_path": "response_text" }
window.API_RESPONSES = {};

/**
 * History Manager for Console Persistence
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

            // Defense against "1" bug
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
const RequestHistory = {
    save(request) {
        try {
            const history = JSON.parse(localStorage.getItem('sky-history') || '[]');
            history.unshift({ ...request, timestamp: Date.now() });
            localStorage.setItem('sky-history', JSON.stringify(history.slice(0, CONFIG.HISTORY_MAX_SIZE)));
        } catch (e) {
            console.warn('[RequestHistory] Failed to save:', e);
        }
    },
    load() {
        try {
            return JSON.parse(localStorage.getItem('sky-history') || '[]');
        } catch (e) {
            console.warn('[RequestHistory] Failed to load:', e);
            return [];
        }
    },
    restore(index) {
        try {
            const history = this.load();
            return history[index] || null;
        } catch (e) {
            console.warn('[RequestHistory] Failed to restore:', e);
            return null;
        }
    }
};

// 3️⃣ JSON 美化功能
function prettyJSON(text) {
    try {
        const obj = JSON.parse(text);
        const formatted = JSON.stringify(obj, null, 2);
        return syntaxHighlight(formatted);
    } catch (e) {
        return escapeHtml(text);
    }
}

function syntaxHighlight(json) {
    json = escapeHtml(json);
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
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
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

// 1️⃣ 历史记录 UI 逻辑
function toggleHistoryDropdown(e) {
    e?.stopPropagation();
    const dd = document.getElementById('history-dropdown');
    if (dd.style.display === 'none') {
        renderHistoryList();
        dd.style.display = 'block';
    } else {
        dd.style.display = 'none';
    }
}

// 点击外部关闭
document.addEventListener('click', (e) => {
    const dd = document.getElementById('history-dropdown');
    if (dd && dd.style.display === 'block' && !e.target.closest('#history-dropdown') && !e.target.closest('#history-btn')) {
        dd.style.display = 'none';
    }
});

function renderHistoryList() {
    const list = document.getElementById('history-list');
    const history = RequestHistory.load();

    if (history.length === 0) {
        list.innerHTML = '<div style="padding:15px; text-align:center; color:#666; font-size:12px;">暂无历史记录</div>';
        return;
    }

    // ✅ 修复内存泄漏：使用data-index代替onclick，通过事件委托处理
    list.innerHTML = history.map((item, index) => `
                <div data-history-index="${index}" class="history-item" style="padding:10px 15px; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; transition:background 0.2s;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <span class="${item.method}" style="font-size:10px; padding:2px 6px; border-radius:4px;">${item.method}</span>
                        <span style="font-size:10px; color:#666;">${new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div style="font-size:12px; color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:monospace;">${item.url}</div>
                </div>
            `).join('');

    // ✅ 使用事件委托代替每个元素添加监听器（避免内存泄漏）
    list.onclick = (e) => {
        const historyItem = e.target.closest('.history-item');
        if (historyItem) {
            const index = parseInt(historyItem.getAttribute('data-history-index'));
            restoreHistoryItem(index);
        }
    };
}

function restoreHistoryItem(index) {
    const item = RequestHistory.restore(index);
    if (!item) return;

    document.getElementById('c-method').value = item.method;
    document.getElementById('c-url').value = item.url;
    document.getElementById('c-body').value = item.body || '';
    document.getElementById('c-headers').value = item.headers || '';

    // 自动切换 Body Tab
    if (item.body) {
        switchConsoleTab(document.querySelector('.c-tab:first-child'), 'c-tab-body');
    }

    document.getElementById('history-dropdown').style.display = 'none';
}

// 6️⃣ 侧边栏折叠逻辑 (Sidebar Toggle)
function toggleSidebarNew(event) {
    if (event) event.stopPropagation();

    const sb = document.getElementById('sidebar');
    const btn = document.getElementById('sidebar-toggle');
    const container = document.querySelector('.container'); // Target Container

    // Force Top position
    btn.style.top = '260px';

    if (sb.style.display === 'none' || !sb.style.display || sb.style.opacity === '0') {
        // Open Sidebar
        sb.style.display = 'block';
        setTimeout(() => sb.style.opacity = '1', 10);

        // Push Content (Restored to prevent overlap/covering)
        if (container) {
            container.classList.add('padded-force');
        }

        // Move Button
        // Button stays fixed at left:20px
        btn.style.left = '20px';
        btn.querySelector('span').innerHTML = '✕';
        btn.style.display = 'block'; // Ensure visible
    } else {
        // Close Sidebar
        sb.style.opacity = '0';

        // Wait for fade out to complete (300ms)
        setTimeout(() => {
            sb.style.display = 'none';
            // Reset Content AFTER fade to avoid overlap glitch
            if (container) {
                container.classList.remove('padded-force');
            }
        }, 300);

        // Reset Button
        btn.style.left = '20px';
        btn.querySelector('span').innerHTML = '☰';
    }
}

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

function setMethod(m) {
    document.getElementById('inpMethod').value = m;
    document.querySelectorAll('#methodControl .segment').forEach(el => {
        el.classList.toggle('active', el.innerText === (m === 'DELETE' ? 'DEL' : m));
    });
    const isBody = (m === 'POST' || m === 'PUT' || m === 'PATCH');
    const btns = document.getElementById('bodyTypeControl');
    if (btns) btns.style.display = isBody ? 'flex' : 'none';
    if (!isBody) setBodyMode('form');
    else setBodyMode('json');
}

function setBodyMode(mode) {
    document.querySelectorAll('.body-toggle').forEach(el => {
        el.classList.toggle('active', el.getAttribute('data-mode') === mode);
    });
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
                // Fix: Use split/join for robust replacement (No RegExp)
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
        const res = await fetch('api-dashboard/meta');
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
        // User Feedback: Show error message in sidebar
        const container = document.getElementById('api-list-container');
        if (container) {
            container.innerHTML = `<div style="padding:20px;text-align:center;color:var(--accent-red);">
                <div style="font-size:24px;margin-bottom:10px">⚠️</div>
                <h4 style="margin:0 0 5px 0;font-size:14px;">无法加载 API</h4>
                <p style="font-size:12px;opacity:0.7;margin-bottom:15px">连接失败或服务器未响应</p>
                <button onclick="initDashboard()" style="background:var(--accent-blue);border:none;color:#fff;padding:6px 16px;border-radius:12px;cursor:pointer;">重试</button>
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

            // ✅ 修复XSS：使用DOM API代替innerHTML，防止ep.description中的脚本注入
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

            item.appendChild(actionsDiv);
            list.appendChild(item);
        });
        section.appendChild(list);
        container.appendChild(section);
    }
    // 强制显示侧边栏
    // sidebar.style.display = 'block'; // Default hidden as per user request
}

/**
 * 打开 API 测试模态框
 * 
 * 打开旧版本的测试模态框，使用全局变量 currentEP 存储当前 API。
 * 
 * @param {Object} ep - API 端点对象
 * @deprecated 考虑使用 openConsoleWithPreset() 代替
 */
function openTest(ep) {
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

    // Reset Headers
    document.getElementById('headerKvContainer').innerHTML = '';
    addHeaderKv('', '');

    document.getElementById('inpJson').value = ep.bodyTemplate || '';
    setBodyMode(ep.paramType === 'JSON' ? 'json' : 'form');

    document.getElementById('responseBox').style.display = 'none';
    updateUrlPreview();
    showModal();
}

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
function switchConsoleTab(tab, contentId) {
    // Toggle Tabs
    tab.parentElement.querySelectorAll('.c-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // Toggle Content
    document.getElementById('c-tab-body').style.display = 'none';
    document.getElementById('c-tab-headers').style.display = 'none';
    document.getElementById(contentId).style.display = 'block';
}

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
 * 设置搜索功能
 * 
 * 监听搜索框输入，过滤 API 列表。
 * 区分大小写，匹配路径、方法、描述。
 */
function setupSearch() {
    const inp = document.getElementById('api-search');
    if (!inp) return;
    inp.oninput = (e) => {
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

function loadHost() {
    const h = localStorage.getItem('sky-host');
    // Basic validation: ignore "1" or too short values
    if (h && h.length > 1 && h !== '1') {
        document.getElementById('target-host').value = h;
    }
    // Trigger initial sync
    updateListUrls();

    document.getElementById('target-host').oninput = function () {
        localStorage.setItem('sky-host', this.value);
        updateListUrls();
    };
}

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
    form.action = 'api-dashboard/export-md';
    form.style.display = 'none';

    const inputUrl = document.createElement('input');
    inputUrl.name = 'url';
    inputUrl.value = ep.url;
    form.appendChild(inputUrl);

    // Check if we have a stored response for this API
    // Try matching path
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

function saveSettings() {
    localStorage.setItem('sky_global_headers', document.getElementById('globalHeaders').value);
    closeSettings();
}

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

// Background Parallax
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

    // Save Response for Export (Key: Path from window.currentPathStr)
    if (res.ok && window.currentPathStr) {
        // Memory Protection: Cap cache size to 50 items
        const currentKeys = Object.keys(window.API_RESPONSES);
        if (currentKeys.length >= 50) {
            delete window.API_RESPONSES[currentKeys[0]]; // Remove oldest
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
