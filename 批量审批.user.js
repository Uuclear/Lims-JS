// ==UserScript==
// @name         LIMS批量审批
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  为LIMS系统添加批量审批功能
// @author       Your name
// @match        */report/ReportAuditInfo.aspx*
// @match        */report/AuditTestingReport_new2.aspx*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 主页面(复核审核批准.html)的处理
    if (location.href.includes('ReportAuditInfo.aspx')) {
        // 添加勾选列
        addCheckboxColumn();
        // 添加批量审批按钮
        addBatchApprovalButton();
    }

    // 审批页面(同意.html)的处理
    if (location.href.includes('AuditTestingReport_new2.aspx')) {
        // 如果是批量审批模式且有未处理的任务，自动执行审批
        if (sessionStorage.getItem('batchApproval') === 'true' && 
            sessionStorage.getItem('pendingTasks')) {
            autoApprove();
        }
    }

    // 添加勾选列函数
    function addCheckboxColumn() {
        // 获取表格
        const table = document.getElementById('tbInfo');
        if (!table) return;

        // 添加表头勾选框
        const headerRow = table.querySelector('thead tr');
        if (headerRow) {
            const checkboxHeader = document.createElement('th');
            checkboxHeader.style.width = '30px';
            checkboxHeader.style.textAlign = 'center';  // 表头居中
            const headerCheckbox = document.createElement('input');
            headerCheckbox.type = 'checkbox';
            headerCheckbox.style.margin = '0';  // 移除默认margin使其完全居中
            headerCheckbox.addEventListener('change', function() {
                const checkboxes = table.querySelectorAll('td input[type="checkbox"]');
                checkboxes.forEach(cb => cb.checked = this.checked);
            });
            checkboxHeader.appendChild(headerCheckbox);
            headerRow.insertBefore(checkboxHeader, headerRow.firstChild);
        }

        // 为每行添加勾选框
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const tbody = table.querySelector('tbody');
                    if (tbody) {
                        const rows = tbody.querySelectorAll('tr');
                        rows.forEach(row => {
                            // 检查是否已经添加了勾选框
                            if (!row.querySelector('td input[type="checkbox"]')) {
                                const checkboxCell = document.createElement('td');
                                checkboxCell.style.textAlign = 'center';
                                checkboxCell.style.verticalAlign = 'middle';  // 垂直居中
                                const checkbox = document.createElement('input');
                                checkbox.type = 'checkbox';
                                checkbox.style.margin = '0';  // 移除默认margin使其完全居中
                                checkboxCell.appendChild(checkbox);
                                row.insertBefore(checkboxCell, row.firstChild);
                            }
                        });
                    }
                }
            });
        });

        // 观察表格内容变化
        observer.observe(table, {
            childList: true,
            subtree: true
        });

        // 初始化现有行的勾选框
        const tbody = table.querySelector('tbody');
        if (tbody) {
            const rows = tbody.querySelectorAll('tr');
            rows.forEach(row => {
                const checkboxCell = document.createElement('td');
                checkboxCell.style.textAlign = 'center';
                checkboxCell.style.verticalAlign = 'middle';  // 垂直居中
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.style.margin = '0';  // 移除默认margin使其完全居中
                checkboxCell.appendChild(checkbox);
                row.insertBefore(checkboxCell, row.firstChild);
            });
        }
    }

    // 添加批量审批按钮函数
    function addBatchApprovalButton() {
        const queryButton = document.querySelector('button[onclick="Search()"]');
        if (!queryButton) return;

        const batchButton = document.createElement('button');
        batchButton.type = 'button';
        batchButton.className = 'btn btn-primary';
        batchButton.style.marginLeft = '10px';
        batchButton.style.marginTop = '10px';  // 与查询按钮对齐
        batchButton.textContent = '一键同意';
        batchButton.onclick = startBatchApproval;

        queryButton.parentNode.insertBefore(batchButton, queryButton.nextSibling);
    }

    // 开始批量审批
    async function startBatchApproval() {
        const table = document.getElementById('tbInfo');
        if (!table) return;

        const checkedRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => {
            return row.querySelector('td input[type="checkbox"]')?.checked;
        });

        if (checkedRows.length === 0) {
            alert('请至少选择一条记录！');
            return;
        }

        // 获取用户信息
        const userId = await getUserId();
        if (!userId) {
            alert('无法获取用户信息！');
            return;
        }

        // 获取所有需要审批的任务
        const tasks = checkedRows.map(row => {
            const operationCell = row.querySelector('td:last-child a');
            if (!operationCell) return null;
            const onclick = operationCell.getAttribute('onclick');
            if (!onclick) return null;
            // 提取AuditReport函数的参数
            const matches = onclick.match(/AuditReport\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/);
            if (!matches) return null;
            return {
                testingReportId: matches[3],
                auditUserId: userId.userId,
                auditUserName: userId.userName,
                auditResult: '同意',
                auditRemark: '',
                auditStatus: matches[6]
            };
        }).filter(task => task !== null);

        if (tasks.length === 0) {
            alert('选中的记录中没有可以审批的项目！');
            return;
        }

        // 显示进度提示
        const progressDiv = document.createElement('div');
        progressDiv.style.position = 'fixed';
        progressDiv.style.top = '50%';
        progressDiv.style.left = '50%';
        progressDiv.style.transform = 'translate(-50%, -50%)';
        progressDiv.style.padding = '20px';
        progressDiv.style.background = 'white';
        progressDiv.style.border = '1px solid #ccc';
        progressDiv.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        progressDiv.style.zIndex = '9999';
        document.body.appendChild(progressDiv);

        // 处理所有任务
        let processed = 0;
        let failed = 0;

        async function processTask(index) {
            if (index >= tasks.length) {
                // 所有任务处理完成
                document.body.removeChild(progressDiv);
                const message = failed > 0 ? 
                    `处理完成！成功：${processed - failed}，失败：${failed}` :
                    '所有选中的记录已处理完成！';
                alert(message);
                window.location.reload();
                return;
            }

            progressDiv.textContent = `正在处理第 ${index + 1}/${tasks.length} 条记录...`;
            
            // 发送审批请求
            const task = tasks[index];
            try {
                const response = await $.ajax({
                    url: "report/testingReportQuery.ashx",
                    type: "POST",
                    data: {
                        method: "AuditReport_new",
                        model: JSON.stringify(task)
                    }
                });

                if (response && response.state === "1") {
                    processed++;
                } else {
                    failed++;
                    console.error('处理失败:', response);
                }
            } catch (error) {
                failed++;
                console.error('请求错误:', error);
            }

            // 等待一段时间后处理下一个任务
            await new Promise(resolve => setTimeout(resolve, 1000));
            await processTask(index + 1);
        }

        // 开始处理第一个任务
        await processTask(0);
    }

    // 获取用户信息
    async function getUserId() {
        try {
            // 打开一个审批页面来获取用户信息
            const firstRow = document.querySelector('#tbInfo tbody tr');
            if (!firstRow) return null;

            const operationCell = firstRow.querySelector('td:last-child a');
            if (!operationCell) return null;

            const onclick = operationCell.getAttribute('onclick');
            if (!onclick) return null;

            const matches = onclick.match(/AuditReport\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/);
            if (!matches) return null;

            const response = await $.ajax({
                url: `AuditTestingReport_new2.aspx?testingReportCode=${matches[2]}&testingReportId=${matches[3]}&reportStatus=${matches[6]}&isBack=0&v=2&sampleId=${matches[4]}`,
                type: "GET"
            });

            // 从响应中提取用户ID和用户名
            const userIdMatch = response.match(/id="userId"\s+value="([^"]+)"/);
            const userNameMatch = response.match(/id="userName"\s+value="([^"]+)"/);

            if (userIdMatch && userNameMatch) {
                return {
                    userId: userIdMatch[1],
                    userName: userNameMatch[1]
                };
            }
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
        return null;
    }

    // 自动审批函数
    function autoApprove() {
        // 选择"同意"选项
        const approverResult = document.getElementById('approverResult');
        if (approverResult) {
            approverResult.value = '同意';
        }

        // 点击提交按钮
        const submitButton = document.getElementById('submit');
        if (submitButton) {
            // 获取待处理任务列表
            const pendingTasks = JSON.parse(sessionStorage.getItem('pendingTasks') || '[]');
            
            // 移除当前任务
            pendingTasks.shift();
            
            // 更新待处理任务列表
            sessionStorage.setItem('pendingTasks', JSON.stringify(pendingTasks));

            // 监听提交完成事件
            const handleSubmitComplete = function() {
                // 关闭当前窗口
                window.close();
                
                // 在主窗口中处理下一个任务
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage('processNextTask', '*');
                }
            };

            // 覆盖原有的updateSucess2函数
            window.updateSucess2 = function(data) {
                if (data.state === "1") {
                    setTimeout(handleSubmitComplete, 500);
                }
            };

            // 点击提交按钮
            submitButton.click();
        }
    }

    // 监听消息
    window.addEventListener('message', function(event) {
        if (event.data === 'processNextTask') {
            processNextTask();
        }
    });
})(); 