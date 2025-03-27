// ==UserScript==
// @name         报告扫描链接添加器
// @namespace    http://tampermonkey.net/
// @icon         https://www.scetia.com/favicon.ico
// @version      0.1
// @description  在报告链接旁添加扫描链接
// @author       Your name
// @match        http://10.1.228.22/UI/IntegratedQueryManage/IntegratedDetail.aspx*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .scan-link {
            margin-left: 10px;
            color: #337ab7;
            text-decoration: none;
        }
        .scan-link:hover {
            text-decoration: underline;
        }
    `);

    // 检查文件是否存在
    function checkFileExists(url) {
        return new Promise((resolve) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url: url,
                onload: function(response) {
                    resolve(response.status === 200);
                },
                onerror: function() {
                    resolve(false);
                }
            });
        });
    }

    // 添加扫描链接
    async function addScanLinks() {
        // 获取报告节点下的所有报告链接
        const reportSection = Array.from(document.querySelectorAll('.tree li span')).find(span =>
            span.textContent.trim() === '报告'
        );

        if (!reportSection) return;

        const reportList = reportSection.closest('li').querySelector('ul');
        if (!reportList) return;

        const reportItems = reportList.querySelectorAll('li a[data-value]');

        for (const link of reportItems) {
            const reportNo = link.getAttribute('data-value');
            if (!reportNo) continue;

            const spanElement = link.querySelector('span');
            if (!spanElement) continue;

            // 检查是否已经添加过链接
            if (spanElement.querySelector('.scan-link')) continue;

            // 检查PDF文件是否存在
            const pdfUrl = `http://192.168.1.23/${reportNo}.pdf`;
            const pdfExists = await checkFileExists(pdfUrl);

            // 检查JPG文件是否存在
            const jpgUrl = `http://192.168.1.23/${reportNo}.jpg`;
            const jpgExists = await checkFileExists(jpgUrl);

            // 添加PDF链接
            if (pdfExists) {
                spanElement.appendChild(document.createElement('br')); // 先添加换行
                const pdfIcon = document.createElement('i');
                pdfIcon.className = 'icon-leaf';
                spanElement.appendChild(pdfIcon); // 添加图标

                const pdfLink = document.createElement('a');
                pdfLink.href = pdfUrl;
                pdfLink.className = 'scan-link';
                pdfLink.textContent = '扫描件PDF';
                pdfLink.target = '_blank';
                spanElement.appendChild(pdfLink);
            } else if (jpgExists) { // 只在没有PDF时才添加JPG链接
                spanElement.appendChild(document.createElement('br')); // 先添加换行
                const jpgIcon = document.createElement('i');
                jpgIcon.className = 'icon-leaf';
                spanElement.appendChild(jpgIcon); // 添加图标

                const jpgLink = document.createElement('a');
                jpgLink.href = jpgUrl;
                jpgLink.className = 'scan-link';
                jpgLink.textContent = '扫描件JPG';
                jpgLink.target = '_blank';
                spanElement.appendChild(jpgLink);
            }
        }
    }

    // 页面加载完成后执行
    function init() {
        // 初始执行
        setTimeout(addScanLinks, 1000); // 添加延时确保页面完全加载

        // 监听DOM变化，处理动态加载的内容
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    setTimeout(addScanLinks, 500);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 确保页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();