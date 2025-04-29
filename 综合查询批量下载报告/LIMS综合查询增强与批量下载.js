// ==UserScript==
// @name         LIMS综合查询增强与批量下载
// @namespace    http://tampermonkey.net/
// @icon         https://www.scetia.com/favicon.ico
// @version      2.8
// @description  为LIMS系统添加综合查询增强与报告批量下载功能，支持原始委托信息和报告文件的批量下载
// @author       Claude
// @match        *://*/IntegratedQueryManage/IntegratedQuery.html*
// @match        */IntegratedQueryManage/IntegratedQuery.html*
// @match        10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.html?menuId=8
// @match        10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.aspx
// @match        http://10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.html?menuId=8
// @match        http://10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.html
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_openInTab
// @connect      10.1.228.22
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-end
// ==/UserScript==

/* 
版本更新说明：
v2.8 - 修复PDF下载链接问题，提取viewer页面中的实际PDF路径；优化统计逻辑，区分委托信息和报告统计；美化弹窗界面
v2.7 - 修复PDF下载损坏的问题，使用二进制模式下载PDF文件
v2.6 - 添加进度条和状态显示，分开统计委托和报告下载情况 
v2.5 - 全面优化下载流程，解决可能导致漏下载文件的问题
v2.4 - 修复对00.htm类型上传PDF报告的处理方式
v2.3 - 合并综合查询增强与批量下载功能
*/

(function() {
    'use strict';

    // 存储所有下载地址
    const downloadRecords = [];
    
    // 下载统计
    const downloadStats = {
        // 委托统计
        orders: {
            total: 0,       // 总委托数
            processed: 0,   // 已处理委托数
            failed: 0,       // 处理失败委托数
            infoDownloaded: 0, // 原始委托信息下载次数
            infoFailed: 0    // 原始委托信息下载失败次数
        },
        // 报告统计
        reports: {
            total: 0,       // 总报告数
            downloaded: 0,  // 已下载报告数
            failed: 0,      // 下载失败报告数
            skipped: 0      // 跳过的报告数
        }
    };
    
    // 进度显示元素
    let progressContainer = null;
    let progressBar = null;
    let progressText = null;
    let statusText = null;

    // 添加下载记录
    function addDownloadRecord(url, filename) {
        downloadRecords.push(`${filename}: ${url}`);
    }

    // 保存下载记录
    function saveDownloadRecords() {
        const now = new Date();
        const timestamp = `${now.getMonth()+1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
        const content = downloadRecords.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `批量下载${timestamp}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
    }
    
    // 创建进度显示UI
    function createProgressUI() {
        // 如果已存在，则移除
        if (progressContainer) {
            progressContainer.remove();
        }
        
        // 创建进度条容器
        progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            margin-top: 15px;
            padding: 10px;
            background-color: #f5f5f5;
            border-radius: 4px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            display: none;
        `;
        
        // 创建进度条
        const progressBarContainer = document.createElement('div');
        progressBarContainer.style.cssText = `
            width: 100%;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
        `;
        
        progressBar = document.createElement('div');
        progressBar.style.cssText = `
            height: 100%;
            width: 0%;
            background-color: #337ab7;
            transition: width 0.3s;
        `;
        
        // 创建进度文本
        progressText = document.createElement('div');
        progressText.style.cssText = `
            margin-bottom: 5px;
            font-weight: bold;
        `;
        progressText.textContent = '准备中...';
        
        // 创建状态文本
        statusText = document.createElement('div');
        statusText.style.cssText = `
            font-size: 12px;
            color: #666;
        `;
        statusText.textContent = '正在初始化...';
        
        // 组装UI元素
        progressBarContainer.appendChild(progressBar);
        progressContainer.appendChild(progressText);
        progressContainer.appendChild(progressBarContainer);
        progressContainer.appendChild(statusText);
        
        return progressContainer;
    }
    
    // 更新进度条显示
    function updateProgress() {
        if (!progressContainer || !progressBar || !progressText || !statusText) return;
        
        // 计算委托进度百分比
        const orderProgress = downloadStats.orders.total > 0 
            ? Math.round((downloadStats.orders.processed / downloadStats.orders.total) * 100) 
            : 0;
        
        // 更新进度条
        progressBar.style.width = `${orderProgress}%`;
        
        // 更新进度文本
        progressText.textContent = `处理进度: ${orderProgress}% (${downloadStats.orders.processed}/${downloadStats.orders.total}委托)`;
        
        // 更新状态文本 - 分开显示委托和报告统计
        statusText.textContent = `委托: ${downloadStats.orders.processed}/${downloadStats.orders.total} ` +
                               `(原始信息: ${downloadStats.orders.infoDownloaded}份) | ` +
                               `报告: ${downloadStats.reports.downloaded}已下载, ${downloadStats.reports.failed}失败, ${downloadStats.reports.skipped}跳过 (共${downloadStats.reports.total}份)`;
        
        // 确保进度条可见
        progressContainer.style.display = 'block';
    }
    
    // 显示处理状态消息
    function showStatusMessage(message) {
        if (statusText) {
            statusText.textContent = message;
        }
    }

    // 添加批量下载按钮
    function addBatchDownloadButton() {
        const btnContainer = document.querySelector('button[onclick="printAll()"]').parentNode;
        const batchDownloadBtn = document.createElement('button');
        batchDownloadBtn.type = 'button';
        batchDownloadBtn.className = 'btn btn-primary';
        batchDownloadBtn.textContent = '批量下载';
        batchDownloadBtn.onclick = handleBatchDownload;
        btnContainer.appendChild(batchDownloadBtn);
        
        // 创建并添加进度条UI
        const progressUI = createProgressUI();
        btnContainer.parentNode.insertBefore(progressUI, btnContainer.nextSibling);
    }

    // 延迟函数
    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 等待元素出现的函数 - 增加超时处理
    function waitForElement(selector, iframe, maxWait = 20000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            // 如果iframe被移除或不存在，立即拒绝
            if (!iframe || !iframe.contentDocument) {
                return reject(new Error('iframe不存在或已被移除'));
            }

            const checkElement = () => {
                if (!iframe.contentDocument) {
                    return reject(new Error('iframe.contentDocument不存在'));
                }
                
                const element = iframe.contentDocument.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > maxWait) {
                    reject(new Error(`等待元素 ${selector} 超时 (${maxWait}ms)`));
                } else {
                    setTimeout(checkElement, 100);
                }
            };

            checkElement();
        });
    }

    // 处理URL路径的函数
    function processUrl(url) {
        if (!url) return url;

        // 如果是viewer.html链接，提取其中的PDF文件路径
        if (url.includes('viewer.html?file=')) {
            try {
                // 提取file参数
                const fileParam = new URL(url).searchParams.get('file');
                if (fileParam) {
                    // 去除可能存在的随机数参数
                    const cleanParam = fileParam.split('?')[0];
                    console.log(`从viewer链接提取的PDF路径: ${cleanParam}`);
                    
                    // 返回完整的PDF链接
                    const pdfUrl = window.location.origin + (cleanParam.startsWith('/') ? '' : '/') + cleanParam;
                    console.log(`处理后的真实PDF链接: ${pdfUrl}`);
                    return pdfUrl;
                }
            } catch (e) {
                console.error('提取PDF链接时出错:', e);
            }
        }

        // 如果URL包含report/WaitBuild.aspx，添加/UI前缀
        if (url.includes('report/WaitBuild.aspx')) {
            url = url.replace('report/WaitBuild.aspx', 'UI/report/WaitBuild.aspx');
        }

        // 处理相对路径
        if (url.startsWith('../../')) {
            url = window.location.origin + '/' + url.substring(6);
        } else if (url.startsWith('../')) {
            url = window.location.origin + '/' + url.substring(3);
        } else if (url.startsWith('/')) {
            url = window.location.origin + url;
        } else if (!url.startsWith('http')) {
            url = window.location.origin + '/' + url;
        }

        return url;
    }

    // 处理下载的函数
    function handleDownload(url, filename, type = 'direct') {
        // 添加下载记录
        addDownloadRecord(url, filename);

        return new Promise((resolve, reject) => {
            // 检查URL是否为PDF文件
            const isPdf = url.toLowerCase().includes('.pdf') || filename.toLowerCase().endsWith('.pdf');
            
            if (isPdf) {
                // 对PDF文件使用GM_xmlhttpRequest进行二进制下载
                showStatusMessage(`使用二进制模式下载: ${filename}`);
                console.log(`使用二进制模式下载PDF: ${url}`);
                
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    responseType: "blob",
                    timeout: 60000, // 60秒超时
                    onload: function(response) {
                        try {
                            // 检查响应状态
                            if (response.status !== 200) {
                                console.error(`下载PDF失败，HTTP状态码: ${response.status}, URL: ${url}`);
                                reject(new Error(`下载失败，HTTP状态码: ${response.status}`));
                                return;
                            }
                            
                            // 创建Blob对象
                            const blob = response.response;
                            if (!blob || blob.size === 0) {
                                console.error(`下载的PDF文件为空: ${url}`);
                                reject(new Error("下载的文件为空"));
                                return;
                            }
                            
                            console.log(`成功获取到PDF文件，大小: ${blob.size} 字节`);
                            
                            // 创建下载链接
                            const blobUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = blobUrl;
                            a.download = filename || 'download.pdf';
                            document.body.appendChild(a);
                            a.click();
                            
                            // 清理
                            setTimeout(() => {
                                document.body.removeChild(a);
                                URL.revokeObjectURL(blobUrl);
                            }, 100);
                            
                            resolve(true);
                        } catch (error) {
                            console.error(`处理PDF下载时出错: ${error.message}`);
                            reject(error);
                        }
                    },
                    onerror: function(error) {
                        console.error(`下载PDF时网络错误: ${url}`, error);
                        reject(error || new Error("下载时网络错误"));
                    },
                    ontimeout: function() {
                        console.error(`下载PDF超时: ${url}`);
                        reject(new Error("下载超时"));
                    }
                });
            } else if (type === 'direct') {
                // 对非PDF文件使用原有下载方式
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || '';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                resolve(true);
            } else {
                // 在新标签页打开
                window.open(url, '_blank');
                resolve(true);
            }
        });
    }

    // 获取文件类型
    function getFileType(url) {
        const extension = url.split('.').pop().split('?')[0].toLowerCase();
        if (extension === 'pdf' || extension === 'html') {
            return 'direct';
        }
        return 'newTab';
    }

    // 处理原始委托信息HTML内容
    function processHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 查找所有图片元素
        const images = doc.querySelectorAll('img');
        images.forEach(img => {
            let src = img.getAttribute('src');
            if (src && !src.startsWith('http')) {
                // 补全图片地址
                img.src = 'http://10.1.228.22' + (src.startsWith('/') ? '' : '/') + src;
            }
        });

        return doc.documentElement.outerHTML;
    }

    // 处理上传的PDF类型报告（00.htm）
    async function handleUploadedPdfReport(reportId, sampleId, reportNo) {
        return new Promise((resolve, reject) => {
            try {
                console.log(`处理上传的PDF报告: ${reportNo}, 报告ID: ${reportId}, 样品ID: ${sampleId}`);
                showStatusMessage(`正在处理上传的PDF报告: ${reportNo}`);
                
                // 创建一个隐藏的iframe来加载WaitBuild.aspx页面
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                document.body.appendChild(iframe);
                
                // 构建URL并加载
                const waitBuildUrl = `${window.location.origin}/UI/report/WaitBuild.aspx?testingReportId=${reportId}&sampleId=${sampleId}`;
                console.log(`加载WaitBuild页面: ${waitBuildUrl}`);
                
                // 设置超时处理
                const timeoutId = setTimeout(() => {
                    console.error(`加载WaitBuild页面超时: ${reportNo}`);
                    document.body.removeChild(iframe);
                    reject(new Error(`加载WaitBuild页面超时: ${reportNo}`));
                }, 30000); // 30秒超时
                
                iframe.src = waitBuildUrl;
                iframe.onload = async () => {
                    try {
                        // 清除超时计时器
                        clearTimeout(timeoutId);
                        
                        // 等待附件链接元素出现
                        console.log('WaitBuild页面加载完成，查找附件链接');
                        const attachmentLink = await waitForElement('#historyAtta a', iframe);
                        
                        // 获取下载链接
                        let downloadUrl = attachmentLink.getAttribute('href');
                        console.log(`找到附件下载链接: ${downloadUrl}`);
                        
                        // 处理URL
                        downloadUrl = processUrl(downloadUrl);
                        console.log(`处理后的下载URL: ${downloadUrl}`);
                        
                        // 下载文件
                        console.log(`开始下载文件: ${reportNo}`);
                        showStatusMessage(`正在下载报告: ${reportNo}`);
                        await handleDownload(downloadUrl, `${reportNo}.pdf`, 'direct');
                        
                        downloadStats.reports.downloaded++;
                        updateProgress();
                        resolve(true);
                    } catch (error) {
                        console.error(`处理上传PDF报告失败 ${reportNo}:`, error);
                        downloadStats.reports.failed++;
                        updateProgress();
                        reject(error);
                    } finally {
                        // 清理iframe
                        if (document.body.contains(iframe)) {
                            document.body.removeChild(iframe);
                        }
                    }
                };
                
                // 处理加载错误
                iframe.onerror = (error) => {
                    clearTimeout(timeoutId);
                    console.error(`加载WaitBuild页面失败 ${reportNo}:`, error);
                    if (document.body.contains(iframe)) {
                        document.body.removeChild(iframe);
                    }
                    downloadStats.reports.failed++;
                    updateProgress();
                    reject(error);
                };
            } catch (error) {
                console.error(`处理上传PDF报告出错 ${reportNo}:`, error);
                downloadStats.reports.failed++;
                updateProgress();
                reject(error);
            }
        });
    }
    
    // 获取详情页的函数
    function getDetailPage(testingOrderId, testingOrderNo) {
        return new Promise((resolve, reject) => {
            showStatusMessage(`正在获取委托详情: ${testingOrderNo}`);
            GM_xmlhttpRequest({
                method: "GET",
                url: `../IntegratedQueryManage/IntegratedDetail.aspx?testingOrderId=${testingOrderId}`,
                headers: {
                    "Accept": "*/*"
                },
                timeout: 30000, // 30秒超时
                onload: function(response) {
                    resolve({ response, testingOrderId, testingOrderNo });
                },
                onerror: function(error) {
                    console.error(`获取委托详情页失败 ${testingOrderNo}:`, error);
                    reject(error);
                },
                ontimeout: function() {
                    console.error(`获取委托详情页超时 ${testingOrderNo}`);
                    reject(new Error(`获取委托详情页超时 ${testingOrderNo}`));
                }
            });
        });
    }
    
    // 下载原始委托信息的函数
    async function downloadOriginalInfo(url, testingOrderNo) {
        return new Promise((resolve, reject) => {
            showStatusMessage(`正在获取原始委托信息: ${testingOrderNo}`);
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: {
                    "Accept": "text/html"
                },
                timeout: 30000, // 30秒超时
                onload: async function(response) {
                    try {
                        // 处理HTML内容，补全图片地址
                        const processedHtml = processHtml(response.responseText);

                        // 创建Blob并下载
                        const blob = new Blob([processedHtml], { type: 'text/html;charset=utf-8' });
                        const downloadUrl = URL.createObjectURL(blob);
                        showStatusMessage(`正在下载原始委托信息: ${testingOrderNo}`);
                        await handleDownload(downloadUrl, `${testingOrderNo}.html`, 'direct');
                        URL.revokeObjectURL(downloadUrl);
                        
                        // 更新委托信息下载计数，不计入报告统计
                        downloadStats.orders.infoDownloaded = (downloadStats.orders.infoDownloaded || 0) + 1;
                        updateProgress();
                        console.log(`原始委托信息下载完成: ${testingOrderNo}`);
                        resolve(true);
                    } catch (error) {
                        console.error(`处理原始委托信息失败 ${testingOrderNo}:`, error);
                        downloadStats.orders.infoFailed = (downloadStats.orders.infoFailed || 0) + 1;
                        updateProgress();
                        reject(error);
                    }
                },
                onerror: function(error) {
                    console.error(`获取原始委托信息失败 ${testingOrderNo}:`, error);
                    downloadStats.orders.infoFailed = (downloadStats.orders.infoFailed || 0) + 1;
                    updateProgress();
                    reject(error);
                },
                ontimeout: function() {
                    console.error(`获取原始委托信息超时 ${testingOrderNo}`);
                    downloadStats.orders.infoFailed = (downloadStats.orders.infoFailed || 0) + 1;
                    updateProgress();
                    reject(new Error(`获取原始委托信息超时 ${testingOrderNo}`));
                }
            });
        });
    }

    // 处理批量下载
    async function handleBatchDownload() {
        const rows = $("#table").bootstrapTable("getSelections");
        if (rows.length === 0) {
            layer.alert("请选择要下载的数据！", { icon: 2 });
            return;
        }

        // 清空之前的下载记录和统计
        downloadRecords.length = 0;
        downloadStats.orders.total = rows.length;
        downloadStats.orders.processed = 0;
        downloadStats.orders.failed = 0;
        downloadStats.orders.infoDownloaded = 0;
        downloadStats.orders.infoFailed = 0;
        downloadStats.reports.total = 0;
        downloadStats.reports.downloaded = 0;
        downloadStats.reports.failed = 0;
        downloadStats.reports.skipped = 0;
        
        // 显示进度UI并初始化
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = `处理进度: 0% (0/${rows.length}委托)`;
        statusText.textContent = '正在准备下载...';
        updateProgress();

        layer.msg('正在获取报告信息...', { icon: 16, time: 0 });

        // 处理每个委托，使用Promise.allSettled顺序处理
        const processAllRows = async () => {
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                console.log(`开始处理委托单 (${i+1}/${rows.length}): ${row.testingOrderNo}`);
                showStatusMessage(`开始处理委托单 (${i+1}/${rows.length}): ${row.testingOrderNo}`);
                
                try {
                    // 获取详情页
                    const detailPage = await getDetailPage(row.testingOrderId, row.testingOrderNo);
                    await processDetailPage(detailPage);
                    
                    // 处理完成一个委托
                    downloadStats.orders.processed++;
                    updateProgress();
                    console.log(`委托 ${row.testingOrderNo} 处理完成, 进度: ${downloadStats.orders.processed}/${downloadStats.orders.total}`);
                    
                    // 每处理一个委托，延迟一小段时间，避免过多并发请求
                    if (i < rows.length - 1) {
                        await delay(800);
                    }
                } catch (error) {
                    console.error(`处理委托出错 ${row.testingOrderNo}:`, error);
                    downloadStats.orders.processed++;
                    downloadStats.orders.failed++;
                    updateProgress();
                }
                
                // 检查是否全部处理完成
                if (downloadStats.orders.processed === downloadStats.orders.total) {
                    finishDownloadProcess();
                }
            }
        };
        
        // 处理一个详情页面
        const processDetailPage = async ({ response, testingOrderId, testingOrderNo }) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(response.responseText, 'text/html');

            // 收集该委托所有的报告任务
            const allPromises = [];
            
            // 委托统计信息
            const orderStats = {
                totalReports: 0,
                processed: 0
            };

            // 下载原始委托信息
            const originalReportLinks = doc.querySelectorAll('a[onclick*="ShowReport"]');
            originalReportLinks.forEach(link => {
                const onclick = link.getAttribute('onclick');
                if (onclick.includes('TestingOrderHtml')) {
                    const match = onclick.match(/ShowReport\('([^']+)'/);
                    if (match) {
                        let url = match[1];
                        url = processUrl(url);
                        console.log(`原始委托信息下载URL: ${url}`);
                        
                        downloadStats.reports.total++;
                        orderStats.totalReports++;
                        updateProgress();
                        
                        const promise = downloadOriginalInfo(url, testingOrderNo)
                            .catch(err => {
                                console.error(`原始委托信息下载失败: ${testingOrderNo}`, err);
                            })
                            .finally(() => {
                                orderStats.processed++;
                            });
                        
                        allPromises.push(promise);
                    }
                }
            });

            // 查找报告链接
            const reportLinks = doc.querySelectorAll('a[onclick*="ShowReport"]');
            
            // 限制并发下载数量
            const maxConcurrent = 2; // 最多同时处理2个报告
            const reportPromises = [];
            
            // 处理所有报告链接
            for (let i = 0; i < reportLinks.length; i++) {
                const link = reportLinks[i];
                const onclick = link.getAttribute('onclick');
                
                // 跳过原始委托信息
                if (onclick.includes('TestingOrderHtml')) {
                    continue;
                }

                // 获取报告编号
                const reportNo = link.textContent.trim().split('(')[0];
                console.log(`处理报告: ${reportNo}`);
                
                downloadStats.reports.total++;
                orderStats.totalReports++;
                updateProgress();
                
                // 创建一个Promise处理这个报告
                const processReport = async () => {
                    try {
                        // 判断报告类型
                        if (onclick.includes('WaitBuild.aspx')) {
                            // 需要获取附件下载页的报告
                            const match = onclick.match(/ShowReport\('([^']+)'/);
                            if (match) {
                                let url = match[1];
                                url = processUrl(url);
                                console.log(`附件页面URL: ${url}`);

                                // 创建一个隐藏的iframe来加载附件页面
                                const iframe = document.createElement('iframe');
                                iframe.style.display = 'none';
                                document.body.appendChild(iframe);
                                
                                // 设置iframe加载超时
                                const timeoutId = setTimeout(() => {
                                    console.error(`加载iframe超时: ${reportNo}`);
                                    if (document.body.contains(iframe)) {
                                        document.body.removeChild(iframe);
                                    }
                                    throw new Error(`加载iframe超时: ${reportNo}`);
                                }, 30000); // 30秒超时

                                try {
                                    iframe.src = url;
                                    
                                    // 等待iframe加载完成
                                    await new Promise((resolve, reject) => {
                                        iframe.onload = resolve;
                                        iframe.onerror = reject;
                                    });
                                    
                                    // 清除超时
                                    clearTimeout(timeoutId);
                                    
                                    console.log(`iframe加载完成: ${url}`);
                                    
                                    // 等待下载链接出现
                                    const downloadLink = await waitForElement('#historyAtta a', iframe);
                                    console.log('找到下载链接元素:', downloadLink);

                                    let downloadUrl = downloadLink.getAttribute('href');
                                    console.log(`原始下载URL: ${downloadUrl}`);

                                    // 处理URL
                                    downloadUrl = processUrl(downloadUrl);
                                    console.log(`处理后的下载URL: ${downloadUrl}`);

                                    // 根据文件类型决定下载方式
                                    const downloadType = getFileType(downloadUrl);
                                    console.log(`文件下载方式: ${downloadType}`);

                                    // 直接下载文件
                                    console.log(`开始下载文件: ${reportNo}`);
                                    showStatusMessage(`正在下载报告: ${reportNo}`);
                                    await handleDownload(downloadUrl, `${reportNo}`, downloadType);
                                    downloadStats.reports.downloaded++;
                                    updateProgress();
                                } catch (error) {
                                    console.error(`处理报告失败 ${reportNo}:`, error);
                                    downloadStats.reports.failed++;
                                    updateProgress();
                                    throw error;
                                } finally {
                                    // 清理iframe
                                    if (document.body.contains(iframe)) {
                                        document.body.removeChild(iframe);
                                    }
                                    clearTimeout(timeoutId);
                                }
                            }
                        } else if (onclick.includes('.pdf')) {
                            // 直接下载的报告
                            const match = onclick.match(/ShowReport\('([^']+)'/);
                            if (match) {
                                let url = match[1];
                                url = processUrl(url);
                                console.log(`直接下载URL: ${url}`);

                                // 直接下载文件
                                console.log(`开始下载文件: ${reportNo}`);
                                showStatusMessage(`正在下载报告: ${reportNo}`);
                                await handleDownload(url, `${reportNo}.pdf`, 'direct');
                                downloadStats.reports.downloaded++;
                                updateProgress();
                            }
                        } else if (onclick.includes('00.htm')) {
                            // 处理上传的PDF页面类型
                            const reportId = link.getAttribute('data-id');
                            const sampleId = link.getAttribute('data-sampleid');
                            
                            if (reportId && sampleId) {
                                console.log(`需要处理上传的PDF报告: ${reportNo}, 报告ID: ${reportId}, 样品ID: ${sampleId}`);
                                await handleUploadedPdfReport(reportId, sampleId, reportNo);
                            } else {
                                console.error(`缺少上传PDF报告所需的ID信息: ${reportNo}`);
                                downloadStats.reports.skipped++;
                                updateProgress();
                            }
                        } else {
                            // 未知类型的报告，记录但不下载
                            console.warn(`未知类型的报告 ${reportNo}: ${onclick}`);
                            downloadStats.reports.skipped++;
                            updateProgress();
                        }
                    } catch (error) {
                        console.error(`处理报告时出错 ${reportNo}:`, error);
                    } finally {
                        orderStats.processed++;
                    }
                };
                
                // 将报告处理添加到队列
                reportPromises.push(processReport);
            }
            
            // 使用限制并发的方式处理报告
            const processBatch = async () => {
                // 每次处理maxConcurrent个报告
                while (reportPromises.length > 0) {
                    const batch = reportPromises.splice(0, maxConcurrent);
                    const batchPromises = batch.map(fn => fn());
                    await Promise.allSettled(batchPromises);
                    
                    // 短暂延迟，避免过快请求
                    if (reportPromises.length > 0) {
                        await delay(800);
                    }
                }
            };
            
            // 将报告处理添加到所有Promise中
            allPromises.push(processBatch());
            
            // 等待所有任务完成
            await Promise.allSettled(allPromises);
            
            // 输出该委托的处理结果
            console.log(`委托 ${testingOrderNo} 所有报告处理完成: 总共${orderStats.totalReports}份报告, 已处理${orderStats.processed}份`);
            showStatusMessage(`委托 ${testingOrderNo} 处理完成: 成功${downloadStats.reports.downloaded}份报告`);
        };
        
        // 完成下载过程的函数
        const finishDownloadProcess = () => {
            // 保存下载记录
            saveDownloadRecords();
            
            // 显示下载统计信息
            const statsMsg = 
            `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
 ┃       下载任务已完成       ┃
 ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
 
 ┏━━━━━━━ 委托统计 ━━━━━━━┓
 ┃ 总委托数：${downloadStats.orders.total.toString().padStart(5, ' ')}个 ┃
 ┃ 成功处理：${(downloadStats.orders.processed - downloadStats.orders.failed).toString().padStart(5, ' ')}个 ┃
 ┃ 处理失败：${downloadStats.orders.failed.toString().padStart(5, ' ')}个 ┃
 ┃ 原始信息：${downloadStats.orders.infoDownloaded.toString().padStart(5, ' ')}份 ┃
 ┗━━━━━━━━━━━━━━━━━━━━━━━━┛
 
 ┏━━━━━━━ 报告统计 ━━━━━━━┓
 ┃ 总报告数：${downloadStats.reports.total.toString().padStart(5, ' ')}份 ┃
 ┃ 成功下载：${downloadStats.reports.downloaded.toString().padStart(5, ' ')}份 ┃
 ┃ 下载失败：${downloadStats.reports.failed.toString().padStart(5, ' ')}份 ┃
 ┃ 已跳过项：${downloadStats.reports.skipped.toString().padStart(5, ' ')}份 ┃
 ┗━━━━━━━━━━━━━━━━━━━━━━━━┛`;
            
            console.log(statsMsg);
            showStatusMessage(`下载完成！委托: ${downloadStats.orders.processed}/${downloadStats.orders.total}, 报告: ${downloadStats.reports.downloaded}/${downloadStats.reports.total}`);
            
            // 关闭所有层
            layer.closeAll();
            
            // 显示结果
            layer.alert(statsMsg, { icon: 1 });
            
            // 更新最终进度为100%
            progressBar.style.width = '100%';
            progressText.textContent = `处理完成: 100% (${downloadStats.orders.processed}/${downloadStats.orders.total}委托)`;
        };
        
        // 开始处理所有委托
        processAllRows().catch(error => {
            console.error('处理委托过程中发生错误:', error);
            layer.closeAll();
            layer.alert('下载过程中发生错误，请查看控制台获取详细信息', { icon: 2 });
        });
        
        // 显示开始信息
        layer.closeAll();
        layer.msg('下载任务已开始!', { icon: 1 });
    }

    // 综合查询增强功能
    function enhanceIntegratedQuery() {
        // 功能1：显示综合选项并设为默认
        var authTypeGroup = document.querySelector('input[name="authType"]').parentNode;
        var newRadio = document.createElement('input');
        newRadio.type = 'radio';
        newRadio.name = 'authType';
        newRadio.value = '5';
        newRadio.checked = true;
        var textNode = document.createTextNode(' 综合(慢)');
        authTypeGroup.appendChild(newRadio);
        authTypeGroup.appendChild(textNode);

        // 取消其他radio的默认选中状态
        var radios = document.getElementsByName('authType');
        for(var i = 0; i < radios.length; i++) {
            if(radios[i].value !== '5') {
                radios[i].checked = false;
            }
        }

        // 功能2：增加委托ID列
        var $table = $('#table');
        var columns = $table.bootstrapTable('getOptions').columns[0];
        columns.splice(2, 0, {
            field: 'testingOrderId',
            title: '委托ID',
            width: 100,
            sortable: true
        });
        $table.bootstrapTable('refreshOptions', {columns: [columns]});
    }

    // 页面加载完成后初始化功能
    window.addEventListener('load', function() {
        setTimeout(() => {
            try {
                // 添加综合查询增强功能
                enhanceIntegratedQuery();
                
                // 添加批量下载按钮
                addBatchDownloadButton();
                
                console.log('LIMS综合查询增强与批量下载功能已加载');
            } catch (e) {
                console.error('LIMS综合查询增强与批量下载功能加载失败:', e);
            }
        }, 1000);  // 延迟1秒添加功能
    });
})(); 