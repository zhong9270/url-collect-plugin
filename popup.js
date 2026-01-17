// 全局变量
let currentPage = 1;
const pageSize = 10; // 每页显示10条记录
let allLinks = [];
let searchKeyword = '';

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    initPopup();
});

// 初始化弹出界面
function initPopup() {
    // 加载数据
    loadLinks();
    
    // 绑定事件监听器
    document.getElementById('link-collector-export-btn').addEventListener('click', exportToExcel);
    document.getElementById('link-collector-copy-btn').addEventListener('click', copyToClipboard);
    document.getElementById('link-collector-clear-btn').addEventListener('click', clearAllLinks);
    
    // 绑定分页按钮事件
    document.getElementById('link-collector-prev-btn').addEventListener('click', goToPrevPage);
    document.getElementById('link-collector-next-btn').addEventListener('click', goToNextPage);
    
    // 绑定搜索输入事件
    const searchInput = document.getElementById('link-collector-search-input');
    searchInput.addEventListener('input', (e) => {
        searchKeyword = e.target.value.trim();
        currentPage = 1; // 搜索时重置到第一页
        renderPagedLinks();
    });
}

// 从后台加载链接数据
function loadLinks() {
    chrome.runtime.sendMessage({ action: 'getLinks' }, (response) => {
        if (response.success) {
            allLinks = response.data;
            currentPage = 1; // 重置到第一页
            renderPagedLinks();
        } else {
            showNotification('加载数据失败');
        }
    });
}

// 渲染分页后的链接列表
function renderPagedLinks() {
    const tbody = document.getElementById('link-collector-links-tbody');
    const countEl = document.getElementById('link-collector-count');
    const emptyState = document.getElementById('link-collector-empty-state');
    const tableContainer = document.querySelector('.table-container');
    const pagination = document.getElementById('link-collector-pagination');
    
    // 搜索过滤
    let filteredLinks = allLinks;
    if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        filteredLinks = allLinks.filter(link => 
            link.title.toLowerCase().includes(keyword) || 
            link.url.toLowerCase().includes(keyword)
        );
    }
    
    // 更新统计信息
    countEl.textContent = `共 ${filteredLinks.length} 条记录${searchKeyword ? ` (搜索: "${searchKeyword}")` : ''}`;
    
    // 显示/隐藏空状态和分页控件
    if (filteredLinks.length === 0) {
        emptyState.style.display = 'block';
        tableContainer.style.display = 'none';
        pagination.style.display = 'none';
        return;
    } else {
        emptyState.style.display = 'none';
        tableContainer.style.display = 'block';
        pagination.style.display = 'flex';
    }
    
    // 计算分页数据
    const totalPages = Math.ceil(filteredLinks.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageLinks = filteredLinks.slice(startIndex, endIndex);
    
    // 渲染表格内容
    tbody.innerHTML = '';
    
    pageLinks.forEach((link, index) => {
        // 计算原始索引，用于删除操作
        const originalIndex = allLinks.findIndex(item => item.timestamp === link.timestamp);
        // 倒序序号：过滤后总数 - 当前页内索引 - (当前页-1)*每页数量
        const displayIndex = filteredLinks.length - index - (currentPage - 1) * pageSize;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${displayIndex}</td>
            <td class="title-cell" title="${link.title}">${link.title}</td>
            <td class="url-cell"><a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${link.url}">${link.url}</a></td>
            <td class="action-cell">
                <button class="btn btn-small btn-danger delete-btn" data-index="${originalIndex}" title="删除">🗑️</button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // 绑定删除按钮事件
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            deleteLink(index);
        });
    });
    
    // 更新分页信息和按钮状态
    updatePagination(totalPages);
}

// 更新分页控件
function updatePagination(totalPages) {
    const prevBtn = document.getElementById('link-collector-prev-btn');
    const nextBtn = document.getElementById('link-collector-next-btn');
    const pageInfo = document.getElementById('link-collector-page-info');
    
    // 检查元素是否存在
    if (!prevBtn || !nextBtn || !pageInfo) {
        console.error('分页控件元素未找到');
        return;
    }
    
    // 更新分页信息
    pageInfo.textContent = `${currentPage} / ${totalPages}`;
    
    // 更新按钮状态
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // 添加禁用样式
    if (prevBtn.disabled) {
        prevBtn.classList.add('btn-disabled');
    } else {
        prevBtn.classList.remove('btn-disabled');
    }
    
    if (nextBtn.disabled) {
        nextBtn.classList.add('btn-disabled');
    } else {
        nextBtn.classList.remove('btn-disabled');
    }
}

// 上一页
function goToPrevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderPagedLinks();
    }
}

// 下一页
function goToNextPage() {
    const totalPages = Math.ceil(allLinks.length / pageSize);
    if (currentPage < totalPages) {
        currentPage++;
        renderPagedLinks();
    }
}

// 删除指定链接
function deleteLink(index) {
    chrome.runtime.sendMessage({ action: 'deleteLink', index }, (response) => {
        if (response.success) {
            showNotification('删除成功');
            loadLinks(); // 重新加载数据
        } else {
            showNotification('删除失败');
        }
    });
}

// 清空所有链接
function clearAllLinks() {
    if (confirm('确定要清空所有采集的链接吗？')) {
        chrome.runtime.sendMessage({ action: 'clearLinks' }, (response) => {
            if (response.success) {
                showNotification('清空成功');
                loadLinks(); // 重新加载数据
            } else {
                showNotification('清空失败');
            }
        });
    }
}

// 导出为Excel（CSV格式）
function exportToExcel() {
    chrome.runtime.sendMessage({ action: 'getLinks' }, (response) => {
        if (response.success && response.data.length > 0) {
            const links = response.data;
            
            // 生成CSV内容
            let csvContent = '\uFEFF标题,链接\n'; // UTF-8 BOM + 表头
            
            links.forEach(link => {
                // 处理CSV特殊字符
                const title = link.title.replace(/"/g, '""');
                const url = link.url.replace(/"/g, '""');
                csvContent += `"${title}","${url}"\n`;
            });
            
            // 创建下载链接
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `采集链接_${new Date().toISOString().slice(0, 10)}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                showNotification('导出成功');
            } else {
                showNotification('导出失败：浏览器不支持');
            }
        } else {
            showNotification('没有可导出的数据');
        }
    });
}

// 复制到剪贴板
function copyToClipboard() {
    chrome.runtime.sendMessage({ action: 'getLinks' }, (response) => {
        if (response.success && response.data.length > 0) {
            const links = response.data;
            
            // 生成制表符分隔的内容
            let clipboardContent = '标题\t链接\n'; // 表头
            
            links.forEach(link => {
                clipboardContent += `${link.title}\t${link.url}\n`;
            });
            
            // 复制到剪贴板
            navigator.clipboard.writeText(clipboardContent).then(() => {
                showNotification('复制成功，可直接粘贴到Excel');
            }).catch(err => {
                console.error('复制失败:', err);
                showNotification('复制失败，请手动复制');
            });
        } else {
            showNotification('没有可复制的数据');
        }
    });
}

// 显示通知
function showNotification(message) {
    const notification = document.getElementById('link-collector-notification');
    notification.textContent = message;
    notification.className = 'notification show';
    
    // 3秒后自动隐藏
    setTimeout(() => {
        notification.className = 'notification hidden';
    }, 3000);
}