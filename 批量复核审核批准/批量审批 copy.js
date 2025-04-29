// ==UserScript==
// @name         Lims 批量复核/审核/批准
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  在报告复核/审核/批准页面添加批量处理功能，使用直接DOM操作添加复选框
// @author       Your Name
// @match        http://10.1.228.22/UI/report/ReportAuditInfo.aspx*
// @include      http://10.1.228.22/UI/report/ReportAuditInfo.aspx*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=10.1.228.22
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.4.1/js/bootstrap.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.18.3/bootstrap-table.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.18.3/locale/bootstrap-table-zh-CN.min.js
// @resource     BOOTSTRAP_CSS https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.4.1/css/bootstrap.min.css
// @resource     TABLE_CSS https://cdnjs.cloudflare.com/ajax/libs/bootstrap-table/1.18.3/bootstrap-table.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        unsafeWindow
// ==/UserScript==

/* globals $, bootstrapTable, unsafeWindow */

(function() {
    'use strict';
    
    // --- 常量定义 ---
    const AJAX_URL = "../../AjaxRequest/report/testingReportQuery.ashx"; // ReportAuditInfo.aspx 页面的相对路径

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

    // --- 获取用户信息函数 ---
    async function getUserInfo() {
        log("开始获取最新用户信息...");
        
        // 获取表格第一行的onclick属性，提取参数
        try {
            const firstRow = $('#tbInfo tbody tr:first');
            const onclickAttr = firstRow.find('td:last a').attr('onclick');
            
            if (!onclickAttr) {
                throw new Error("未找到表格行中的操作链接");
            }
            
            // 解析 AuditReport 函数参数
            const match = onclickAttr.match(/AuditReport\('([^']+)','([^']+)','([^']+)','([^']+)','([^']*)','([^']+)'\)/);
            
            if (!match) {
                throw new Error("无法解析操作链接中的参数");
            }
            
            // 获取参数
            const isNormal = match[1];
            const reportCode = match[2];
            const reportId = match[3];
            const sampleId = match[4];
            const standBy1 = match[5];
            const status = match[6];
            
            log(`从表格行获取审批参数: reportCode=${reportCode}, reportId=${reportId}, sampleId=${sampleId}, status=${status}`);
            
            // 构建用于iframe的URL
            let iframeSrc;
            if (isNormal === "0") {
                iframeSrc = `../report/AuditTestingReport_new2.aspx?testingReportCode=${reportCode}&testingReportId=${reportId}&reportStatus=${status}&isBack=0&v=2&sampleId=${sampleId}`;
            } else if (standBy1 === "线上签名" || standBy1 === "电子科技业务章" || standBy1 === "公司电子公章") {
                iframeSrc = `../report/AuditTestingReport_new3.aspx?testingReportCode=${reportCode}&testingReportId=${reportId}&reportStatus=${status}&isBack=0&v=2&sampleId=${sampleId}`;
            } else {
                iframeSrc = `../report/AuditTestingReport_new_fb.aspx?testingReportCode=${reportCode}&testingReportId=${reportId}&reportStatus=${status}&isBack=0&v=2&sampleId=${sampleId}`;
            }
            
            log(`从iframe获取用户信息: ${iframeSrc}`);
            
            // 使用iframe加载审批页面
            const userInfo = await getUserInfoFromIframe(iframeSrc);
            if (!userInfo || !userInfo.userId || !userInfo.userName) {
                throw new Error("从审批页面获取用户信息失败");
            }
            
            log(`成功获取用户信息: ID=${userInfo.userId}, Name=${userInfo.userName}`);
            return userInfo;
            
        } catch (e) {
            log(`获取用户信息失败: ${e.message}`);
            alert(`获取用户信息失败: ${e.message}\n请确保表格中有至少一行数据，且操作列有审批按钮。`);
            return null;
        }
    }

    // 辅助函数：从iframe获取用户信息
    function getUserInfoFromIframe(iframeSrc) {
        return new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:absolute; left:-9999px; width:1px; height:1px; visibility:hidden;';
            iframe.src = iframeSrc;
            
            // 设置加载超时
            const timeoutId = setTimeout(() => {
                document.body.removeChild(iframe);
                reject(new Error("获取用户信息超时"));
            }, 8000);
            
            iframe.onload = function() {
                try {
                    clearTimeout(timeoutId);
                    
                    // 等待一小段时间确保iframe内容完全加载
                    setTimeout(() => {
                        try {
                            // 尝试从iframe获取用户信息
                            const iframeUserId = iframe.contentWindow.document.getElementById('userId')?.value;
                            const iframeUserName = iframe.contentWindow.document.getElementById('userName')?.value;
                            
                            log(`从iframe获取到: userId=${iframeUserId}, userName=${iframeUserName}`);
                            
                            if (iframeUserId && iframeUserName) {
                                resolve({userId: iframeUserId, userName: iframeUserName});
                            } else {
                                // 尝试从script标签获取
                                const scripts = iframe.contentWindow.document.querySelectorAll('script');
                                let foundInfo = false;
                                
                                for (const script of scripts) {
                                    if (script.textContent) {
                                        const userIdMatch = script.textContent.match(/userId\s*=\s*['"]([^'"]+)['"]/);
                                        const userNameMatch = script.textContent.match(/userName\s*=\s*['"]([^'"]+)['"]/);
                                        
                                        if (userIdMatch && userIdMatch[1] && userNameMatch && userNameMatch[1]) {
                                            resolve({userId: userIdMatch[1], userName: userNameMatch[1]});
                                            foundInfo = true;
                                            break;
                                        }
                                    }
                                }
                                
                                if (!foundInfo) {
                                    reject(new Error("在iframe中未找到用户信息"));
                                }
                            }
                        } catch (e) {
                            reject(e);
                        } finally {
                            document.body.removeChild(iframe);
                        }
                    }, 1000);
                } catch (e) {
                    clearTimeout(timeoutId);
                    document.body.removeChild(iframe);
                    reject(e);
                }
            };
            
            iframe.onerror = function() {
                clearTimeout(timeoutId);
                document.body.removeChild(iframe);
                reject(new Error("iframe加载失败"));
            };
            
            document.body.appendChild(iframe);
        });
    }

    // --- 执行单次审批的函数 ---
    async function approveReport(reportCode, reportId, sampleId, targetStatus, userInfo) {
        log(`开始处理报告: ${reportCode} (ID: ${reportId}), 目标状态: ${targetStatus}`);

        const model = {
            testingReportId: reportId,
            auditUserId: userInfo.userId,
            auditUserName: userInfo.userName,
            auditResult: "同意", // 根据需求硬编码为"同意"
            auditRemark: "",    // 根据需求硬编码为空
            auditStatus: targetStatus
        };

        return new Promise((resolve, reject) => {
            $.ajax({
                url: AJAX_URL,
                type: 'POST',
                contentType: "application/x-www-form-urlencoded",
                data: {
                    method: "AuditReport_new",
                    model: JSON.stringify(model)
                },
                dataType: 'json',
                success: function(data) {
                    if (data && data.state === "1") {
                        log(`成功处理报告: ${reportCode}. ${data.msg || ''}`);
                        resolve(true);
                    } else {
                        log(`处理报告 ${reportCode} 失败: ${data ? data.msg : '未知错误或无效响应'}`);
                        resolve(false);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    log(`处理报告 ${reportCode} 时发生 AJAX 错误: ${textStatus} - ${errorThrown}`);
                    console.error("AJAX 错误详情:", jqXHR);
                    resolve(false);
                }
            });
        });
    }

    // --- 主初始化函数 ---
    function initialize() {
        log("脚本初始化...");

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

        // 在try块外部声明userInfo变量
        let userInfo;
        
        // 获取用户信息
        try {
            userInfo = await getUserInfo();
            if (!userInfo) {
                batchButton.prop('disabled', false).text('批量处理');
                progressContainer.hide();
                return;
            }
        } catch (e) {
            log(`获取用户信息时出错: ${e.message}`);
            alert(`获取用户信息时出错: ${e.message}`);
            batchButton.prop('disabled', false).text('批量处理');
            progressContainer.hide();
            return;
        }

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

        const total = checkedRows.length;
        log(`找到 ${total} 个选中的报告准备进行 ${actionName}。`);
        updateProgress(0, total);

        let successCount = 0;
        let failCount = 0;

        // 按顺序处理选中的行
        for (let i = 0; i < total; i++) {
            const row = checkedRows[i];
            
            // 从行中提取需要的数据
            // 注意：这里的选择器需要根据实际的表格结构调整
            // 这里假设每行有多个<td>，其中包含报告ID、报告编号和样本ID
            const reportCode = $(row).find('td:eq(3)').text().trim(); // 假设第4列是报告编号
            
            // 从a标签的onclick属性中提取数据
            // 假设格式是 onclick="AuditReport('0','HY188-250396','2301746','1503748','','2')"
            const onclickAttr = $(row).find('td:last a').attr('onclick');
            if (!onclickAttr) {
                log(`跳过行: 无法获取onclick属性`);
                failCount++;
                continue;
            }
            
            // 提取reportId和sampleId (根据实际的onclick格式调整)
            // 使用正则表达式提取数据
            const match = onclickAttr.match(/AuditReport\('(\d+)','([^']+)','(\d+)','(\d+)'/);
            if (!match) {
                log(`跳过行: 无法从onclick属性解析数据: ${onclickAttr}`);
                failCount++;
                continue;
            }
            
            // 解析提取的数据
            // 这里的索引取决于实际的AuditReport函数参数顺序
            const isNormal = match[1];
            const reportCode2 = match[2]; // 这应该匹配之前提取的reportCode
            const reportId = match[3];
            const sampleId = match[4];
            
            log(`处理行: reportId=${reportId}, reportCode=${reportCode}, sampleId=${sampleId}`);
            
            updateProgress(i, total);
            try {
                const success = await approveReport(reportCode, reportId, sampleId, targetStatus, userInfo);
                if (success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (e) {
                failCount++;
                log(`处理报告 ${reportCode} 时发生意外错误: ${e}`);
            }
            
            // 在请求之间添加延迟
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        updateProgress(total, total);
        log(`------ 批量处理完成 ------`);
        log(`总计: ${total}, 成功: ${successCount}, 失败: ${failCount}`);
        alert(`批量处理完成！\n成功: ${successCount}\n失败: ${failCount}`);

        batchButton.prop('disabled', false).text('批量处理');
        
        // 刷新页面以显示最新状态
        log("正在刷新页面...");
        location.reload();
    }

    // --- 脚本入口点 ---
    $(document).ready(initialize);

})();
