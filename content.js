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

  // 发送消息给后台
  chrome.runtime.sendMessage(
    { action: 'addLink', data: linkData },
    (response) => {
      showNotification(response.message);
    }
  );
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

// 页面加载完成后创建按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createCollectButton);
} else {
  createCollectButton();
}
