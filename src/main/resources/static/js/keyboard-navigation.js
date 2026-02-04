/**
 * =================================================================
 * 键盘导航增强 (Keyboard Navigation Enhancement)
 * =================================================================
 * 此模块提供完整的键盘访问支持，包括：
 * - ESC键关闭模态框
 * - Tab键焦点管理
 * - Enter/Space键触发按钮
 */

// ESC 键关闭模态框
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
        // 关闭所有打开的模态框
        const overlays = document.querySelectorAll('.overlay');
        overlays.forEach(overlay => {
            if (overlay.style.display !== 'none' && overlay.classList.contains('active')) {
                // 调用对应的关闭函数
                if (overlay.id === 'settingsOverlay') {
                    closeSettings();
                } else if (overlay.id === 'testOverlay') {
                    closeModal();
                } else if (overlay.id === 'consoleModal') {
                    closeConsoleModal();
                }
            }
        });
    }
});

// 侧边栏切换支持键盘操作
document.addEventListener('DOMContentLoaded', function () {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('keydown', function (e) {
            // Enter 或 Space 键触发
            if (e.key === 'Enter' || e.key === ' ' || e.keyCode === 13 || e.keyCode === 32) {
                e.preventDefault();
                toggleSidebarNew();
            }
        });
    }

    // 为所有按钮添加焦点样式
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('focus', function () {
            this.style.outline = '2px solid rgba(0, 113, 227, 0.5)';
            this.style.outlineOffset = '2px';
        });
        button.addEventListener('blur', function () {
            this.style.outline = '';
            this.style.outlineOffset = '';
        });
    });
});

// 焦点陷阱（Focus Trap）用于模态框
function trapFocus(element) {
    const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', function (e) {
        if (e.key === 'Tab' || e.keyCode === 9) {
            if (e.shiftKey) {
                if (document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                }
            } else {
                if (document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }
        }
    });

    // 自动获得焦点
    if (firstFocusable) {
        setTimeout(() => firstFocusable.focus(), 100);
    }
}
