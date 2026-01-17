// 创建采集按钮
function createCollectButton() {
  const button = document.createElement('div');
  button.id = 'collect-link-button';
  button.innerHTML = '采';
  button.title = '采集当前页面链接';
  
  document.body.appendChild(button);
  
  // 实现拖动功能
  let isDragging = false;
  let startX, startY, offsetX, offsetY;
  
  button.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return; // 只处理左键
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    // 获取按钮当前位置
    const rect = button.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    
    // 禁用文本选择
    document.body.style.userSelect = 'none';
    
    e.preventDefault();
  });
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const x = e.clientX - offsetX;
    const y = e.clientY - offsetY;
    
    // 限制按钮在可视区域内
    const maxX = window.innerWidth - button.offsetWidth;
    const maxY = window.innerHeight - button.offsetHeight;
    
    const newX = Math.max(0, Math.min(x, maxX));
    const newY = Math.max(0, Math.min(y, maxY));
    
    button.style.left = `${newX}px`;
    button.style.top = `${newY}px`;
    
    e.preventDefault();
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  // 点击按钮采集链接
  button.addEventListener('click', (e) => {
    if (isDragging) return;

    collectCurrentLink();
    e.preventDefault();
  });
}

// 采集当前页面链接
function collectCurrentLink() {
  const linkData = {
    title: document.title,
    url: window.location.href
  };

  // 发送消息给后台，添加最严格的安全检查，防止竞态条件
  try {
    // 1. 检查是否在iframe中运行，iframe中chrome.runtime可能不可用
    if (window.self !== window.top) {
      console.warn('Running in iframe, skipping link collection');
      return;
    }
    
    // 2. 立即保存到局部变量，防止竞态条件
    const chromeObj = typeof chrome !== 'undefined' ? chrome : null;
    const runtimeObj = chromeObj && typeof chromeObj.runtime !== 'undefined' ? chromeObj.runtime : null;
    const sendMessageFn = runtimeObj && typeof runtimeObj.sendMessage === 'function' ? runtimeObj.sendMessage : null;
    
    if (sendMessageFn) {
      // 3. 再次检查函数是否可用，确保安全
      if (typeof sendMessageFn === 'function') {
        sendMessageFn(
          { action: 'addLink', data: linkData },
          (response) => {
            // 检查响应是否有效
            if (response && response.message) {
              showNotification(response.message);
            } else {
              showNotification('添加成功');
            }
          }
        );
      } else {
        throw new Error('sendMessage is not a function');
      }
    } else {
      throw new Error('Chrome runtime.sendMessage not available');
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    // 修复：简化错误日志，避免再次访问可能为undefined的chrome对象
    console.error('错误详情:', { 
      chromeType: typeof chrome, 
      isTopWindow: window.self === window.top
    });
    showNotification('添加失败：扩展API不可用');
  }
}

// 显示通知
function showNotification(message) {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.id = 'collect-link-notification';
  notification.textContent = message;

  document.body.appendChild(notification);

  // 3秒后自动移除
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 添加快捷键监听（alt+1）
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === '1') {
    collectCurrentLink();
    e.preventDefault();
  }
});

// 页面加载完成后创建按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createCollectButton);
} else {
  createCollectButton();
}
