// lims-batch-download.js

// ==UserScript==
// @name         LIMS报告批量下载
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  为LIMS系统添加报告批量下载功能，支持原始委托信息和报告文件的批量下载
// @author       Claude
// @match        *://*/IntegratedQueryManage/IntegratedQuery.html*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_openInTab
// @connect      *
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

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

    // 处理批量下载
    function handleBatchDownload() {
        const rows = $("#table").bootstrapTable("getSelections");
        if (rows.length === 0) {
            layer.alert("请选择要下载的数据！", { icon: 2 });
            return;
        }

        layer.msg('正在获取报告信息...', { icon: 16, time: 0 });
        
        rows.forEach(row => {
            // 获取详情页
            GM_xmlhttpRequest({
                method: "GET",
                url: `../IntegratedQueryManage/IntegratedDetail.aspx?testingOrderId=${row.testingOrderId}`,
                headers: {
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                    "Upgrade-Insecure-Requests": "1"
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
                                if (!url.startsWith('http')) {
                                    url = window.location.origin + (url.startsWith('/') ? '' : '/') + url;
                                }
                                GM_xmlhttpRequest({
                                    method: "GET",
                                    url: url,
                                    responseType: "blob",
                                    onload: function(response) {
                                        const blob = new Blob([response.response], { type: 'text/html' });
                                        const downloadUrl = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = downloadUrl;
                                        link.download = `${row.testingOrderNo}.html`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(downloadUrl);
                                        console.log(`原始委托信息下载成功: ${row.testingOrderNo}`);
                                    }
                                });
                            }
                        }
                    });

                    // 查找报告链接
                    const reportLinks = doc.querySelectorAll('a[onclick*="ShowReport"]');
                    reportLinks.forEach(link => {
                        const onclick = link.getAttribute('onclick');
                        // 跳过原始委托信息
                        if (onclick.includes('TestingOrderHtml')) {
                            return;
                        }

                        // 获取报告编号
                        const reportNo = link.textContent.trim().split('(')[0];

                        // 判断报告类型
                        if (onclick.includes('WaitBuild.aspx')) {
                            // 需要获取附件下载页的报告
                            const match = onclick.match(/ShowReport\('([^']+)'/);
                            if (match) {
                                let url = match[1];
                                // 确保使用完整的URL路径
                                if (url.startsWith('../')) {
                                    url = window.location.origin + '/' + url.substring(3);
                                } else if (url.startsWith('/')) {
                                    url = window.location.origin + url;
                                } else if (!url.startsWith('http')) {
                                    url = window.location.origin + '/' + url;
                                }
                                
                                // 获取附件下载页
                                GM_xmlhttpRequest({
                                    method: "GET",
                                    url: url,
                                    headers: {
                                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                                        "Upgrade-Insecure-Requests": "1",
                                        "Referer": window.location.href
                                    },
                                    onload: function(response) {
                                        const attachmentDoc = parser.parseFromString(response.responseText, 'text/html');
                                        console.log('附件页面内容:', response.responseText); // 调试输出
                                        
                                        // 尝试多种选择器
                                        let downloadLink = attachmentDoc.querySelector('#historyAtta a');
                                        if (!downloadLink) {
                                            downloadLink = attachmentDoc.querySelector('a[href*="/FileUpload/"]');
                                        }
                                        if (!downloadLink) {
                                            downloadLink = Array.from(attachmentDoc.querySelectorAll('a')).find(a => a.textContent.includes('附件下载'));
                                        }
                                        
                                        if (downloadLink) {
                                            let downloadUrl = downloadLink.getAttribute('href');
                                            console.log('找到下载链接:', downloadUrl); // 调试输出
                                            
                                            // 处理相对路径
                                            if (downloadUrl.startsWith('../../')) {
                                                downloadUrl = window.location.origin + '/' + downloadUrl.substring(6);
                                            } else if (downloadUrl.startsWith('../')) {
                                                downloadUrl = window.location.origin + '/' + downloadUrl.substring(3);
                                            } else if (downloadUrl.startsWith('/')) {
                                                downloadUrl = window.location.origin + downloadUrl;
                                            } else if (!downloadUrl.startsWith('http')) {
                                                downloadUrl = window.location.origin + '/' + downloadUrl;
                                            }
                                            
                                            // 使用GM_xmlhttpRequest下载文件
                                            GM_xmlhttpRequest({
                                                method: "GET",
                                                url: downloadUrl,
                                                responseType: "blob",
                                                headers: {
                                                    "Accept": "application/pdf",
                                                    "Upgrade-Insecure-Requests": "1",
                                                    "Referer": url
                                                },
                                                onload: function(response) {
                                                    const blob = new Blob([response.response], { type: 'application/pdf' });
                                                    const downloadUrl = window.URL.createObjectURL(blob);
                                                    const link = document.createElement('a');
                                                    link.href = downloadUrl;
                                                    link.download = `${reportNo}.pdf`;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                    window.URL.revokeObjectURL(downloadUrl);
                                                    console.log(`报告下载成功: ${reportNo}`);
                                                },
                                                onerror: function(error) {
                                                    console.error(`报告下载失败 ${reportNo}:`, error);
                                                }
                                            });
                                        } else {
                                            console.error(`未找到下载链接: ${reportNo}，页面内容:`, response.responseText);
                                            // 尝试直接从原始URL下载
                                            GM_xmlhttpRequest({
                                                method: "GET",
                                                url: url,
                                                responseType: "blob",
                                                headers: {
                                                    "Accept": "application/pdf",
                                                    "Upgrade-Insecure-Requests": "1",
                                                    "Referer": window.location.href
                                                },
                                                onload: function(response) {
                                                    const blob = new Blob([response.response], { type: 'application/pdf' });
                                                    const downloadUrl = window.URL.createObjectURL(blob);
                                                    const link = document.createElement('a');
                                                    link.href = downloadUrl;
                                                    link.download = `${reportNo}.pdf`;
                                                    document.body.appendChild(link);
                                                    link.click();
                                                    document.body.removeChild(link);
                                                    window.URL.revokeObjectURL(downloadUrl);
                                                    console.log(`报告直接下载成功: ${reportNo}`);
                                                },
                                                onerror: function(error) {
                                                    console.error(`报告直接下载失败 ${reportNo}:`, error);
                                                }
                                            });
                                        }
                                    },
                                    onerror: function(error) {
                                        console.error(`获取附件页面失败 ${reportNo}:`, error);
                                    }
                                });
                            }
                        } else if (onclick.includes('.pdf')) {
                            // 直接下载的PDF报告
                            const match = onclick.match(/ShowReport\('([^']+)'/);
                            if (match) {
                                let url = match[1];
                                if (!url.startsWith('http')) {
                                    url = window.location.origin + (url.startsWith('/') ? '' : '/') + url;
                                }
                                // 使用GM_xmlhttpRequest下载文件
                                GM_xmlhttpRequest({
                                    method: "GET",
                                    url: url,
                                    responseType: "blob",
                                    headers: {
                                        "Accept": "application/pdf",
                                        "Upgrade-Insecure-Requests": "1"
                                    },
                                    onload: function(response) {
                                        const blob = new Blob([response.response], { type: 'application/pdf' });
                                        const downloadUrl = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = downloadUrl;
                                        link.download = `${reportNo}.pdf`;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(downloadUrl);
                                        console.log(`报告下载成功: ${reportNo}`);
                                    },
                                    onerror: function(error) {
                                        console.error(`报告下载失败 ${reportNo}:`, error);
                                    }
                                });
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
        addBatchDownloadButton();
    });
})();