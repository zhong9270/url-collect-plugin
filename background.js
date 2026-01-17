// 初始化存储结构
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ collectedLinks: [] });
});

// 监听消息事件
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'addLink':
      addLink(message.data).then(sendResponse);
      return true;
    case 'getLinks':
      getLinks().then(sendResponse);
      return true;
    case 'deleteLink':
      deleteLink(message.index).then(sendResponse);
      return true;
    case 'clearLinks':
      clearLinks().then(sendResponse);
      return true;
    default:
      sendResponse({ success: false, message: '未知操作' });
      return true;
  }
});

// 添加链接数据
async function addLink(linkData) {
  try {
    const { collectedLinks } = await chrome.storage.local.get('collectedLinks');
    
    // 检查是否已存在相同链接
    const exists = collectedLinks.some(item => item.url === linkData.url);
    if (exists) {
      return { success: false, message: '该链接已存在' };
    }
    
    collectedLinks.unshift({
      title: linkData.title,
      url: linkData.url,
      timestamp: Date.now()
    });
    
    await chrome.storage.local.set({ collectedLinks });
    return { success: true, message: '添加成功' };
  } catch (error) {
    console.error('添加链接失败:', error);
    return { success: false, message: '添加失败' };
  }
}

// 获取所有链接数据
async function getLinks() {
  try {
    const { collectedLinks } = await chrome.storage.local.get('collectedLinks');
    return { success: true, data: collectedLinks || [] };
  } catch (error) {
    console.error('获取链接失败:', error);
    return { success: false, data: [] };
  }
}

// 删除指定链接
async function deleteLink(index) {
  try {
    const { collectedLinks } = await chrome.storage.local.get('collectedLinks');
    collectedLinks.splice(index, 1);
    await chrome.storage.local.set({ collectedLinks });
    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('删除链接失败:', error);
    return { success: false, message: '删除失败' };
  }
}

// 清空所有链接
async function clearLinks() {
  try {
    await chrome.storage.local.set({ collectedLinks: [] });
    return { success: true, message: '清空成功' };
  } catch (error) {
    console.error('清空链接失败:', error);
    return { success: false, message: '清空失败' };
  }
}