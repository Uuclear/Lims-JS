// ==UserScript==
// @name         Lims 批量复核/审核/批准 (模拟流程版)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  在报告复核/审核/批准页面添加批量处理功能，使用模拟真实审批流程的方式
// @author       Your Name
// @match        http://10.1.228.22/UI/report/ReportAuditInfo.aspx*
// @include      http://10.1.228.22/UI/report/ReportAuditInfo.aspx*
// @match        http://10.1.228.22/UI/report/AuditTestingReport_new*.aspx*
// @include      http://10.1.228.22/UI/report/AuditTestingReport_new*.aspx*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=10.1.228.22
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // --- 常量定义 ---
    const STORAGE_KEY_PREFIX = 'lims_batch_';
    const TASK_QUEUE_KEY = STORAGE_KEY_PREFIX + 'task_queue';
    const PROCESSING_KEY = STORAGE_KEY_PREFIX + 'processing';
    const CURRENT_TASK_KEY = STORAGE_KEY_PREFIX + 'current_task';
    const RESULTS_KEY = STORAGE_KEY_PREFIX + 'results';

    // --- 检查 jQuery 是否加载 ---
    if (typeof $ === 'undefined') {
        console.error("批量审批脚本：jQuery 未加载!");
        return;
    }

    // --- 日志记录函数 ---
    let logArea = null;
    function log(message) {
        console.log("[批量审批]", message);
        if (!logArea) {
            logArea = $('#gm-batch-log-area');
        }
        if (logArea && logArea.length) {
            const timestamp = new Date().toLocaleTimeString();
            const safeMessage = $('<div/>').text(message).html(); // 基本的 HTML 转义
            logArea.append(`<div>[${timestamp}] ${safeMessage}</div>`);
            logArea.scrollTop(logArea[0].scrollHeight); // 滚动到底部
        }
    }

    // --- 进度条更新函数 ---
    let progressBar = null;
    let progressText = null;
    function updateProgress(current, total) {
        if (!progressBar) {
            progressBar = $('#gm-batch-progress-bar');
            progressText = $('#gm-batch-progress-text');
        }
        if (progressBar && progressBar.length) {
            const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
            progressBar.css('width', percentage + '%').attr('aria-valuenow', percentage);
            progressText.text(`${current} / ${total} (${percentage}%)`);
        }
    }

    // --- 主初始化函数，根据当前页面类型执行不同逻辑 ---
    async function initialize() {
        // 判断当前是在报告列表页面还是在审批页面
        const url = window.location.href;
        
        if (url.includes('ReportAuditInfo.aspx')) {
            // 在报告列表页面
            log("初始化报告列表页面...");
            initReportListPage();
        } else if (url.includes('AuditTestingReport_new')) {
            // 在审批页面
            log("检测到审批页面，准备自动处理...");
            handleAuditPage();
        }
    }

    // --- 在报告列表页面初始化UI和功能 ---
    function initReportListPage() {
        // 清理任何可能存在的旧状态
        GM_setValue(PROCESSING_KEY, false);
        GM_setValue(TASK_QUEUE_KEY, JSON.stringify([]));
        GM_setValue(CURRENT_TASK_KEY, JSON.stringify({}));
        GM_setValue(RESULTS_KEY, JSON.stringify({success: 0, fail: 0}));
        
        // 添加界面元素 (按钮, 进度条, 日志区域)
        const queryButton = $('.panel-body button:contains("查询")');
        if (queryButton.length > 0 && $('#gm-batch-process-btn').length === 0) {
            const batchButton = $('<button type="button" class="btn btn-success" id="gm-batch-process-btn" style="margin-top: 10px; margin-left: 10px;">批量处理</button>');
            const progressContainer = $(`
                <div id="gm-batch-progress-container" style="margin-top: 15px; display: none;">
                    <strong>批量处理进度:</strong>
                     <span id="gm-batch-progress-text">0 / 0 (0%)</span>
                    <div class="progress" style="margin-bottom: 5px;">
                        <div id="gm-batch-progress-bar" class="progress-bar progress-bar-success progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%; min-width: 2em;">
                            <span class="sr-only">0% Complete</span>
                        </div>
                    </div>
                    <div id="gm-batch-log-area" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; background-color: #f8f8f8; padding: 5px; font-size: 11px; margin-top: 5px;"></div>
                </div>
            `);

            queryButton.after(batchButton);
            queryButton.parent().append(progressContainer);
            log("已添加'批量处理'按钮和进度/日志区域。");

            batchButton.on('click', handleBatchProcess);
        } else if ($('#gm-batch-process-btn').length > 0) {
             log("'批量处理'按钮已存在。");
        } else {
            log("错误：未找到'查询'按钮，无法添加'批量处理'按钮。");
        }

        // 给表格添加复选框
        setTimeout(addCheckboxesToTable, 1500);
        
        // 检查是否有正在进行的批量处理任务
        checkPendingTasks();
    }
    
    // --- 检查是否有待处理的任务 ---
    async function checkPendingTasks() {
        const isProcessing = await GM_getValue(PROCESSING_KEY, false);
        
        if (isProcessing) {
            const taskQueue = JSON.parse(await GM_getValue(TASK_QUEUE_KEY, '[]'));
            const results = JSON.parse(await GM_getValue(RESULTS_KEY, '{"success":0,"fail":0}'));
            
            if (taskQueue.length > 0) {
                log("检测到未完成的批量处理任务，继续处理...");
                
                // 显示进度条并更新状态
                $('#gm-batch-process-container').show();
                $('#gm-batch-process-btn').prop('disabled', true).text('处理中...');
                
                const totalTasks = taskQueue.length + results.success + results.fail;
                const currentProgress = results.success + results.fail;
                updateProgress(currentProgress, totalTasks);
                
                // 继续处理下一个任务
                processNextTask();
            } else {
                // 任务队列为空但状态仍为处理中，可能是刚完成最后一个任务
                log("所有任务已处理完毕。");
                await GM_setValue(PROCESSING_KEY, false);
                
                // 显示结果
                alert(`批量处理完成！\n成功: ${results.success}\n失败: ${results.fail}`);
                
                // 重置状态
                $('#gm-batch-process-btn').prop('disabled', false).text('批量处理');
                // $('#gm-batch-progress-container').hide();
            }
        }
    }

    // --- 添加复选框到表格，并监控表格变化 ---
    function addCheckboxesToTable() {
        log("开始添加复选框到表格...");
        try {
            // 获取表格
            const table = $('#tbInfo');
            if (table.length === 0) {
                log("错误：未找到表格 (#tbInfo)");
                return;
            }
            
            // 立即添加一次复选框
            addCheckboxes(table);
            
            // 设置MutationObserver监听表格DOM变化
            if (!window.gm_table_observer) {
                log("设置表格MutationObserver...");
                
                // 创建观察器实例
                window.gm_table_observer = new MutationObserver(function(mutations) {
                    // 检查是否有相关变化需要重新添加复选框
                    const needsReapply = mutations.some(mutation => {
                        // 如果tbody内容变化，或者有节点被替换/添加/删除
                        return (mutation.type === 'childList' && 
                               (mutation.target.tagName === 'TBODY' || 
                                mutation.target.closest('tbody')));
                    });
                    
                    if (needsReapply) {
                        log("检测到表格内容变化，重新添加复选框...");
                        // 短暂延迟确保DOM已完全更新
                        setTimeout(() => addCheckboxes(table), 50);
                    }
                });
                
                // 配置观察选项
                const config = { 
                    childList: true,    // 观察直接子节点变化
                    subtree: true,      // 观察所有后代节点变化
                    attributes: false,  // 不观察属性变化
                    characterData: false // 不观察文本变化
                };
                
                // 开始观察
                window.gm_table_observer.observe(table[0], config);
                
                // 处理分页点击事件
                $('.fixed-table-pagination .pagination a').off('click.gm').on('click.gm', function() {
                    log("检测到分页按钮点击，准备重新添加复选框...");
                    setTimeout(() => addCheckboxes(table), 200);
                });
                
                // 处理页面大小改变
                $('.fixed-table-pagination .dropdown-menu a').off('click.gm').on('click.gm', function() {
                    log("检测到页面大小改变，准备重新添加复选框...");
                    setTimeout(() => addCheckboxes(table), 200);
                });
            }
            
        } catch (e) {
            log(`添加复选框监听时出错: ${e}`);
            console.error("添加复选框监听时出错:", e);
        }
    }

    // 实际添加复选框的函数
    function addCheckboxes(table) {
        log("执行添加复选框...");
        
        // 1. 添加复选框到表头
        const headerRow = table.find('thead tr');
        if (headerRow.length === 0) {
            log("错误：未找到表头行");
            return;
        }
        
        // 检查是否已添加复选框列
        if (headerRow.find('th.checkbox-column').length === 0) {
            // 在第一列前添加复选框列
            headerRow.prepend(`
                <th class="checkbox-column" style="width: 40px; text-align: center;">
                    <input type="checkbox" id="checkAll" title="全选/取消全选">
                </th>
            `);
            
            // 绑定全选事件
            $('#checkAll').off('click').on('click', function() {
                const isChecked = $(this).prop('checked');
                table.find('tbody tr td.checkbox-column input[type="checkbox"]').prop('checked', isChecked);
            });
        }
        
        // 2. 添加复选框到每一行数据 (没有复选框的行)
        const rows = table.find('tbody tr').filter(function() {
            return $(this).find('td.checkbox-column').length === 0;
        });
        
        if (rows.length > 0) {
            rows.each(function() {
                // 给每一行添加复选框，在第一列前
                $(this).prepend(`
                    <td class="checkbox-column" style="width: 40px; text-align: center;">
                        <input type="checkbox" name="btSelectItem" class="row-checkbox">
                    </td>
                `);
            });
            
            log(`添加了 ${rows.length} 个新的行复选框`);
        } else {
            log("所有行已有复选框，无需添加");
        }
    }

    // --- 批量处理逻辑 ---
    async function handleBatchProcess() {
        log("------ 开始批量处理 ------");
        const batchButton = $('#gm-batch-process-btn');
        const progressContainer = $('#gm-batch-progress-container');
        logArea = $('#gm-batch-log-area');

        batchButton.prop('disabled', true).text('处理中...');
        logArea.html('');
        progressContainer.show();
        updateProgress(0, 0);

        // 确定当前正在处理的状态类型
        const currentType = $("#sltType").val();
        let targetStatus;
        let actionName = "";

        switch (currentType) {
            case '1': targetStatus = '2'; actionName = "复核"; break;
            case '2': targetStatus = '3'; actionName = "审核"; break;
            case '3': targetStatus = '9'; actionName = "批准"; break;
            default:
                log(`错误：当前选择的处理类别 (${$("#sltType option:selected").text()} - ${currentType}) 不支持批量操作。`);
                alert("请选择 '待复核', '待审核', 或 '待批准' 类别进行批量处理。");
                batchButton.prop('disabled', false).text('批量处理');
                progressContainer.hide();
                return;
        }
        log(`当前处理类别: ${actionName} (类型 ${currentType}), 操作目标状态码: ${targetStatus}`);

        // 获取选中的行
        const checkedRows = $('#tbInfo tbody tr').filter(function() {
            return $(this).find('td.checkbox-column input[type="checkbox"]').prop('checked');
        });

        if (checkedRows.length === 0) {
            log("未选择任何报告。");
            alert("请先勾选需要处理的报告。");
            batchButton.prop('disabled', false).text('批量处理');
            progressContainer.hide();
            return;
        }

        // 创建任务队列
        const taskQueue = [];
        
        // 收集选中行的信息
        checkedRows.each(function() {
            const row = $(this);
            
            // 从a标签的onclick属性中提取数据
            const onclickAttr = row.find('td:last a').attr('onclick');
            if (!onclickAttr) {
                log(`跳过行: 无法获取onclick属性`);
                return;
            }
            
            // 提取AuditReport函数参数
            // 假设格式是 onclick="AuditReport('0','HY188-250396','2301746','1503748','','2')"
            const match = onclickAttr.match(/AuditReport\('([^']+)','([^']+)','([^']+)','([^']+)','([^']*)','([^']+)'\)/);
            if (!match) {
                log(`跳过行: 无法解析onclick属性: ${onclickAttr}`);
                return;
            }
            
            // 提取参数
            const isNormal = match[1];
            const reportCode = match[2];
            const reportId = match[3];
            const sampleId = match[4];
            const standBy1 = match[5];
            const status = match[6];
            
            // 构建URL，与原始AuditReport函数相同逻辑
            let url;
            if (isNormal === "0") {
                url = `../report/AuditTestingReport_new2.aspx?testingReportCode=${reportCode}&testingReportId=${reportId}&reportStatus=${status}&isBack=0&v=2&sampleId=${sampleId}`;
            } else if (standBy1 === "线上签名" || standBy1 === "电子科技业务章" || standBy1 === "公司电子公章") {
                url = `../report/AuditTestingReport_new3.aspx?testingReportCode=${reportCode}&testingReportId=${reportId}&reportStatus=${status}&isBack=0&v=2&sampleId=${sampleId}`;
            } else {
                url = `../report/AuditTestingReport_new_fb.aspx?testingReportCode=${reportCode}&testingReportId=${reportId}&reportStatus=${status}&isBack=0&v=2&sampleId=${sampleId}`;
            }
            
            // 添加到任务队列
            taskQueue.push({
                url: url,
                reportCode: reportCode,
                reportId: reportId,
                sampleId: sampleId,
                status: status
            });
        });

        const total = taskQueue.length;
        log(`创建了 ${total} 个待处理任务。`);
        
        // 保存任务队列和初始状态
        await GM_setValue(TASK_QUEUE_KEY, JSON.stringify(taskQueue));
        await GM_setValue(PROCESSING_KEY, true);
        await GM_setValue(RESULTS_KEY, JSON.stringify({success: 0, fail: 0}));
        
        // 开始处理第一个任务
        processNextTask();
    }
    
    // --- 处理任务队列中的下一个任务 ---
    async function processNextTask() {
        // 获取当前状态
        const isProcessing = await GM_getValue(PROCESSING_KEY, false);
        if (!isProcessing) {
            log("批量处理已停止。");
            return;
        }
        
        // 获取任务队列
        const taskQueue = JSON.parse(await GM_getValue(TASK_QUEUE_KEY, '[]'));
        const results = JSON.parse(await GM_getValue(RESULTS_KEY, '{"success":0,"fail":0}'));
        
        if (taskQueue.length === 0) {
            // 所有任务处理完毕
            log("所有任务已处理完毕。");
            await GM_setValue(PROCESSING_KEY, false);
            
            // 显示结果
            alert(`批量处理完成！\n成功: ${results.success}\n失败: ${results.fail}`);
            
            // 刷新页面以显示最新状态
            location.reload();
            return;
        }
        
        // 获取并移除队列中的第一个任务
        const task = taskQueue.shift();
        await GM_setValue(TASK_QUEUE_KEY, JSON.stringify(taskQueue));
        await GM_setValue(CURRENT_TASK_KEY, JSON.stringify(task));
        
        // 更新进度
        const totalTasks = taskQueue.length + results.success + results.fail + 1; // +1 是当前任务
        const currentProgress = results.success + results.fail;
        updateProgress(currentProgress, totalTasks);
        
        log(`开始处理报告: ${task.reportCode} (ID: ${task.reportId})`);
        
        // 创建iframe加载审批页面
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%; height:600px; border:1px solid #ccc;';
        iframe.src = task.url;
        iframe.id = 'gm-audit-iframe';
        
        // 添加iframe到页面
        const iframeContainer = $('#gm-iframe-container');
        if (iframeContainer.length === 0) {
            $('<div id="gm-iframe-container" style="margin-top:15px; display:none;"></div>').appendTo('.panel-body');
        }
        $('#gm-iframe-container').html('').append(iframe);
        
        // 等待iframe加载完成并执行自动审批
        iframe.onload = function() {
            log(`iframe加载完成，准备自动处理...`);
            
            try {
                // 尝试在iframe中执行操作
                const iframeWindow = iframe.contentWindow;
                const iframeDoc = iframeWindow.document;
                
                // 查找审批意见选择框并选择"同意"
                setTimeout(() => {
                    try {
                        const approverResultSelect = iframeDoc.getElementById('approverResult');
                        if (approverResultSelect) {
                            approverResultSelect.value = "同意";
                            log("已选择'同意'选项。");
                            
                            // 查找审批提交按钮并点击
                            setTimeout(() => {
                                try {
                                    // 找到提交按钮并点击
                                    const submitBtn = iframeDoc.querySelector('button[onclick*="AuditReport"]');
                                    if (submitBtn) {
                                        log("找到提交按钮，准备点击...");
                                        
                                        // 模拟点击
                                        const clickEvent = iframeDoc.createEvent('MouseEvents');
                                        clickEvent.initEvent('click', true, true);
                                        submitBtn.dispatchEvent(clickEvent);
                                        
                                        log(`已点击提交按钮，报告 ${task.reportCode} 处理完成。`);
                                        
                                        // 更新成功计数
                                        results.success++;
                                        GM_setValue(RESULTS_KEY, JSON.stringify(results));
                                        
                                        // 等待操作完成后处理下一个任务
                                        setTimeout(() => {
                                            $('#gm-iframe-container').html('');
                                            processNextTask();
                                        }, 2000);
                                    } else {
                                        log(`错误：未找到提交按钮。`);
                                        results.fail++;
                                        GM_setValue(RESULTS_KEY, JSON.stringify(results));
                                        
                                        // 继续处理下一个任务
                                        setTimeout(() => {
                                            $('#gm-iframe-container').html('');
                                            processNextTask();
                                        }, 1000);
                                    }
                                } catch (e) {
                                    log(`点击提交按钮时出错: ${e}`);
                                    results.fail++;
                                    GM_setValue(RESULTS_KEY, JSON.stringify(results));
                                    
                                    // 继续处理下一个任务
                                    setTimeout(() => {
                                        $('#gm-iframe-container').html('');
                                        processNextTask();
                                    }, 1000);
                                }
                            }, 1000);
                        } else {
                            log(`错误：未找到审批意见选择框。`);
                            results.fail++;
                            GM_setValue(RESULTS_KEY, JSON.stringify(results));
                            
                            // 继续处理下一个任务
                            setTimeout(() => {
                                $('#gm-iframe-container').html('');
                                processNextTask();
                            }, 1000);
                        }
                    } catch (e) {
                        log(`设置审批意见时出错: ${e}`);
                        results.fail++;
                        GM_setValue(RESULTS_KEY, JSON.stringify(results));
                        
                        // 继续处理下一个任务
                        setTimeout(() => {
                            $('#gm-iframe-container').html('');
                            processNextTask();
                        }, 1000);
                    }
                }, 2000); // 等待2秒确保页面元素加载完成
            } catch (e) {
                log(`iframe操作出错: ${e}`);
                results.fail++;
                GM_setValue(RESULTS_KEY, JSON.stringify(results));
                
                // 继续处理下一个任务
                setTimeout(() => {
                    $('#gm-iframe-container').html('');
                    processNextTask();
                }, 1000);
            }
        };
        
        iframe.onerror = function() {
            log(`iframe加载出错，无法处理报告 ${task.reportCode}`);
            results.fail++;
            GM_setValue(RESULTS_KEY, JSON.stringify(results));
            
            // 继续处理下一个任务
            setTimeout(() => {
                $('#gm-iframe-container').html('');
                processNextTask();
            }, 1000);
        };
    }
    
    // --- 处理审批页面 ---
    function handleAuditPage() {
        // 判断是否是从批量处理打开的页面
        GM_getValue(PROCESSING_KEY, false).then(isProcessing => {
            if (isProcessing) {
                log("检测到这是批量处理打开的审批页面，准备自动处理...");
                
                // 显示一个特殊标记以提示这是自动处理
                $('body').prepend('<div style="position:fixed; top:0; left:0; background:green; color:white; padding:2px 5px; font-size:10px; z-index:100000; opacity: 0.8;">[批量审批自动处理中]</div>');
                
                // 等待页面元素加载完成
                setTimeout(() => {
                    // 选择"同意"选项
                    const approverResult = document.getElementById('approverResult');
                    if (approverResult) {
                        approverResult.value = "同意";
                        log("已选择'同意'选项");
                        
                        // 点击提交按钮
                        setTimeout(() => {
                            // 找到提交按钮 (根据onclick属性包含"AuditReport"的按钮)
                            const submitBtn = document.querySelector('button[onclick*="AuditReport"]');
                            if (submitBtn) {
                                log("找到提交按钮，准备点击...");
                                submitBtn.click();
                                log("已点击提交按钮");
                            } else {
                                log("错误：未找到提交按钮");
                            }
                        }, 1000);
                    } else {
                        log("错误：未找到审批意见选择框");
                    }
                }, 2000);
            }
        });
    }

    // --- 脚本入口点 ---
    $(document).ready(initialize);
})();
