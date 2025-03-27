// ==UserScript==
// @name         LIMS报告批量下载
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  为LIMS系统添加报告批量下载功能，支持原始委托信息和报告文件的批量下载
// @author       Claude
// @match        *://*/IntegratedQueryManage/IntegratedQuery.html*
// @match        */IntegratedQueryManage/IntegratedQuery.html*
// @match        10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.html?menuId=8
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_openInTab
// @connect      10.1.228.22
// @connect      localhost
// @connect      127.0.0.1
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 存储所有下载地址
    const downloadRecords = [];

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

    // 添加批量下载按钮
    function addBatchDownloadButton() {
        const btnContainer = document.querySelector('button[onclick="printAll()"]').parentNode;
        const batchDownloadBtn = document.createElement('button');
        batchDownloadBtn.type = 'button';
        batchDownloadBtn.className = 'btn btn-primary';
        batchDownloadBtn.textContent = '批量下载';
        batchDownloadBtn.onclick = handleBatchDownload;
        btnContainer.appendChild(batchDownloadBtn);
    }

    // 等待元素出现的函数
    function waitForElement(selector, iframe, maxWait = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = iframe.contentDocument.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > maxWait) {
                    reject(new Error(`等待元素 ${selector} 超时`));
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

        if (type === 'direct') {
            // 直接下载（用于pdf和html文件）
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || '';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // 在新标签页打开（用于其他类型文件）
            window.open(url, '_blank');
        }
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

    // 处理批量下载
    function handleBatchDownload() {
        const rows = $("#table").bootstrapTable("getSelections");
        if (rows.length === 0) {
            layer.alert("请选择要下载的数据！", { icon: 2 });
            return;
        }

        // 清空之前的下载记录
        downloadRecords.length = 0;

        layer.msg('正在获取报告信息...', { icon: 16, time: 0 });

        let processedCount = 0;  // 添加计数器
        const totalCount = rows.length;

        rows.forEach(row => {
            console.log(`处理委托单: ${row.testingOrderNo}`);
            // 获取详情页
            GM_xmlhttpRequest({
                method: "GET",
                url: `../IntegratedQueryManage/IntegratedDetail.aspx?testingOrderId=${row.testingOrderId}`,
                headers: {
                    "Accept": "*/*"
                },
                onload: function(response) {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(response.responseText, 'text/html');

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

                                // 获取并处理原始委托信息HTML
                                GM_xmlhttpRequest({
                                    method: "GET",
                                    url: url,
                                    headers: {
                                        "Accept": "text/html"
                                    },
                                    onload: function(response) {
                                        // 处理HTML内容，补全图片地址
                                        const processedHtml = processHtml(response.responseText);

                                        // 创建Blob并下载
                                        const blob = new Blob([processedHtml], { type: 'text/html;charset=utf-8' });
                                        const downloadUrl = URL.createObjectURL(blob);
                                        handleDownload(downloadUrl, `${row.testingOrderNo}.html`, 'direct');
                                        URL.revokeObjectURL(downloadUrl);

                                        console.log(`原始委托信息下载开始: ${row.testingOrderNo}`);
                                    }
                                });
                            }
                        }
                    });

                    // 查找报告链接
                    const reportLinks = doc.querySelectorAll('a[onclick*="ShowReport"]');
                    let reportProcessed = 0;
                    const totalReports = reportLinks.length;

                    reportLinks.forEach((link, index) => {
                        const onclick = link.getAttribute('onclick');
                        // 跳过原始委托信息
                        if (onclick.includes('TestingOrderHtml')) {
                            reportProcessed++;
                            return;
                        }

                        // 获取报告编号
                        const reportNo = link.textContent.trim().split('(')[0];
                        console.log(`处理报告: ${reportNo}`);
                        console.log(`报告onclick事件: ${onclick}`);

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

                                iframe.src = url;
                                iframe.onload = async () => {
                                    try {
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
                                        handleDownload(downloadUrl, `${reportNo}`, downloadType);
                                    } catch (error) {
                                        console.error(`等待下载链接失败 ${reportNo}:`, error);
                                        if (iframe.contentDocument) {
                                            console.log('iframe内容:', iframe.contentDocument.documentElement.innerHTML);
                                        }
                                    } finally {
                                        // 清理iframe
                                        document.body.removeChild(iframe);
                                        reportProcessed++;
                                        if (reportProcessed === totalReports) {
                                            processedCount++;
                                            if (processedCount === totalCount) {
                                                setTimeout(() => {
                                                    saveDownloadRecords();
                                                    layer.closeAll();
                                                    layer.msg('所有下载任务已完成!', { icon: 1 });
                                                }, 1000);
                                            }
                                        }
                                    }
                                };
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
                                handleDownload(url, `${reportNo}.pdf`, 'direct');
                            }
                        }
                    });
                }
            });
        });

        layer.closeAll();
        layer.msg('下载任务已开始!', { icon: 1 });
    }

    // 页面加载完成后添加按钮
    window.addEventListener('load', function() {
        setTimeout(addBatchDownloadButton, 1000);  // 延迟1秒添加按钮
    });
})();