// ==UserScript==
// @name         Lims 自动化报告提交流程 (修复iframe和日志)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  自动化处理从数据导入到报告提交的流程, 修复iframe兼容性和日志引号问题.
// @author       Your Name
// @match        http://10.1.228.22/UI/Experiment/ExperimentResult.aspx*
// @match        http://10.1.228.22/UI/Task/TestReport.html*
// @match        http://10.1.228.22/UI/Experiment/ExperimentResultThird.aspx*
// @include      http://10.1.228.22/UI/Experiment/ExperimentResult.aspx*
// @include      http://10.1.228.22/UI/Task/TestReport.html*
// @include      http://10.1.228.22/UI/Experiment/ExperimentResultThird.aspx*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @require      https://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        unsafeWindow
// @grant        GM_addStyle
// ==/UserScript==

/* globals $, GM_setValue, GM_getValue, unsafeWindow, UE, layui */

(function() {
    'use strict';

    // --- 配置 ---
    const TARGET_TEMPLATE_VALUE = "20322"; // 目标模板 Value
    const TARGET_CONCLUSION_VALUE = "--";   // 目标结论性质 Value

    // --- 状态变量 ---
    const STORAGE_KEY_PREFIX = 'lims_auto_';
    const STEP_KEY = STORAGE_KEY_PREFIX + 'step';
    const DATE_KEY = STORAGE_KEY_PREFIX + 'exp_date';
    const REMARK_KEY = STORAGE_KEY_PREFIX + 'remark';

    // --- 日志和进度显示 ---
    let logDiv = null;

    function createLogDiv() {
        // Prevent creating logDiv multiple times if script runs unexpectedly fast/reloads
        if ($('#gm-logger').length > 0) {
            logDiv = $('#gm-logger');
            return;
        }
        logDiv = $('<div id="gm-logger"></div>');
        // Ensure body is ready before appending
        if ($('body').length) {
             $('body').append(logDiv);
             GM_addStyle(`
                #gm-logger {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    width: 250px;
                    max-height: 200px;
                    overflow-y: auto;
                    background-color: rgba(0, 0, 0, 0.7);
                    color: white;
                    padding: 10px;
                    font-size: 12px;
                    border-radius: 5px;
                    z-index: 99999; /* Higher z-index */
                    white-space: pre-wrap; /* Preserve whitespace and newlines */
                    word-wrap: break-word; /* Break long words */
                    box-sizing: border-box;
                }
            `);
             logDiv.html('<strong>自动化脚本日志:</strong><br>'); // Clear previous logs only on creation
        } else {
            // Body not ready yet, try again slightly later
            setTimeout(createLogDiv, 100);
        }
    }

    function log(message) {
        console.log('[LIMS Auto Script]', message);
        // Ensure logDiv is created
        if (!logDiv || logDiv.length === 0) {
            createLogDiv();
            // If createLogDiv had to use setTimeout, log might be called before it's ready
            // So, we retry logging shortly after ensuring creation is triggered.
            setTimeout(() => log(message), 150);
            return;
        }
         // Append message with a timestamp
        const timestamp = new Date().toLocaleTimeString();
        // Sanitize message slightly for HTML display
        const safeMessage = $('<div/>').text(message).html();
        logDiv.append(`[${timestamp}] ${safeMessage}<br>`);
        // Scroll to the bottom
        if (logDiv[0]) { // Check if logDiv actually exists in DOM
           logDiv.scrollTop(logDiv[0].scrollHeight);
        }
    }


    function clearState() {
        log("清除状态变量...");
        return Promise.all([ // Use Promise.all to ensure all async operations complete
             GM_setValue(STEP_KEY, ''),
             GM_setValue(DATE_KEY, ''),
             GM_setValue(REMARK_KEY, '')
        ]).then(() => {
             log("状态已清除。");
        }).catch(err => {
             log(`清除状态时发生错误: ${err}`);
        });
    }

    // --- 页面逻辑 ---

    async function handlePage1() {
        log("尝试处理页面1: 数据导入");
        // Diagnostic: Add a visual indicator that the script is running in this frame
        $('body').prepend('<div style="position:fixed; top:0; left:0; background:red; color:white; padding:2px 5px; font-size:10px; z-index:100000; opacity: 0.8;">[GM P1 Running]</div>');


        // 检查是否是从自动化流程返回，如果是，则清除状态
        const currentStep = await GM_getValue(STEP_KEY, '');
        if (currentStep && currentStep !== 'start' && currentStep !== '') {
             log(`检测到先前步骤 "${currentStep}", 清除状态以重新开始。`);
             await clearState(); // Use await here
             // Optionally add a small delay before proceeding if needed
             // await new Promise(resolve => setTimeout(resolve, 100));
        }


        // 查找"生成报告"按钮
        const generateReportBtn = $('#btn_save2');
        if (!generateReportBtn.length) {
            log("错误：在此框架内未找到'生成报告'按钮 (#btn_save2)。脚本可能在错误的框架中运行，或按钮尚未加载。");
            return;
        }
         log("找到'生成报告'按钮 (#btn_save2)。");

        // 创建"提交"按钮
        const submitBtn = $('<input type="button" value="提交" class="btn btn-success" id="gm_submit_btn" style="margin-left: 10px;">');

        // 避免重复添加按钮
        if ($('#gm_submit_btn').length === 0) {
             generateReportBtn.after(submitBtn);
             log("已添加'提交'按钮。");
        } else {
             log("'提交'按钮已存在。");
             // Ensure the existing button is enabled in case of script reload/partial execution
             $('#gm_submit_btn').prop('disabled', false).val('提交');
        }


        // "提交"按钮点击事件
        $('#gm_submit_btn').off('click').on('click', async function() { // Use .off first to prevent multiple bindings
            log("'提交'按钮被点击。");
            $(this).prop('disabled', true).val('处理中...');

            // 1. 保存数据
            const experimentDate = $('#formatDateAgePeriod').val();
            // For remarks, try to get text. If #lbl_remarks contains other elements, .text() is usually safer.
            const remarks = $('#lbl_remarks').html() ? $('#lbl_remarks').html().trim() : '';

            if (!experimentDate) {
                log("错误：未能获取实验日期 (#formatDateAgePeriod)。");
                alert("未能获取实验日期，请检查页面元素！");
                $(this).prop('disabled', false).val('提交');
                return;
            }

            log(`获取数据: 实验日期=${experimentDate}, 委托备注HTML='${remarks}'`);
            await GM_setValue(DATE_KEY, experimentDate);
            await GM_setValue(REMARK_KEY, remarks);
            await GM_setValue(STEP_KEY, 'page1_submitted');
            log("数据已保存，状态设置为 page1_submitted。");

            // 2. 执行"生成报告"逻辑 (调用 Save3 函数)
            try {
                log("尝试调用 Save3() 函数 (saveType=1)...");
                // 确保函数在页面上下文中可用
                if (typeof unsafeWindow.Save3 === 'function') {
                    // 设置全局变量 saveType 并调用函数
                    unsafeWindow.saveType = "1";
                    // Wrap in a try-catch specific to the unsafeWindow call
                    try {
                        unsafeWindow.Save3();
                        log("Save3() 函数已调用。等待页面跳转...");
                    } catch (save3Error) {
                         log(`页面函数 Save3() 执行时出错: ${save3Error}`);
                         alert(`页面函数 Save3() 执行时出错: ${save3Error}`);
                         $(this).prop('disabled', false).val('提交'); // Re-enable on error
                         await clearState(); // Clear state on error
                         return;
                    }
                    // 按钮保持禁用状态，因为页面即将跳转
                } else {
                    log("错误：无法访问页面函数 Save3()。脚本可能无法继续。");
                    alert("错误：无法访问页面函数 Save3()。脚本可能无法继续。");
                     $(this).prop('disabled', false).val('提交'); // Re-enable if Save3 fails
                     await clearState(); // Clear state on error
                }
            } catch (error) {
                log(`尝试调用 Save3() 前发生错误: ${error}`);
                alert(`尝试调用页面函数前发生错误: ${error}`);
                 $(this).prop('disabled', false).val('提交'); // Re-enable on error
                 await clearState(); // Clear state on error
            }
        });
    }

    async function handlePage2() {
        log("尝试处理页面2: 中间转向");
        $('body').prepend('<div style="position:fixed; top:0; left:0; background:orange; color:white; padding:2px 5px; font-size:10px; z-index:100000; opacity: 0.8;">[GM P2 Running]</div>');

        const currentStep = await GM_getValue(STEP_KEY, '');

        if (currentStep === 'page1_submitted') {
            log("状态正确 (page1_submitted)。开始等待页面内容加载...");

            let tableWaitAttempts = 0;
            const maxTableWaitAttempts = 40; // 20 seconds for table content
            const tableWaitIntervalId = setInterval(async () => {
                tableWaitAttempts++;
                const tableRows = $('#html table tr'); // Check for rows in the dynamic table

                // Check if table exists and has more than 1 row (assuming header + at least one data row)
                if (tableRows.length > 1) {
                    clearInterval(tableWaitIntervalId);
                    log(`页面内容 (表格行数: ${tableRows.length}) 已加载 (尝试 ${tableWaitAttempts}/${maxTableWaitAttempts})。开始等待'下一步'按钮启用...`);

                    // --- Now, wait for the button to be enabled ---
                    let buttonWaitAttempts = 0;
                    const maxButtonWaitAttempts = 20; // 10 seconds for button enable
                    const buttonWaitIntervalId = setInterval(async () => {
                        buttonWaitAttempts++;
                        const nextButton = $('#btn_next'); // Re-check button existence

                        if (nextButton.length === 0) {
                            // Button disappeared? Should not happen often if table loaded.
                            clearInterval(buttonWaitIntervalId);
                            log(`错误：'下一步'按钮在内容加载后消失了 (尝试 ${buttonWaitAttempts}/${maxButtonWaitAttempts})。`);
                            await clearState();
                            return;
                        }

                        const isDisabled = nextButton.is(':disabled');
                        log(`'下一步'按钮状态检查 (尝试 ${buttonWaitAttempts}/${maxButtonWaitAttempts}): 存在, ${isDisabled ? '禁用' : '启用'}`);

                        if (!isDisabled) {
                            // Button exists and is enabled
                            clearInterval(buttonWaitIntervalId);
                            log("'下一步'按钮已启用，准备点击...");
                            await GM_setValue(STEP_KEY, 'page2_submitted');
                            log("状态设置为 page2_submitted。");
                            // Wrap click in try-catch
                            try {
                                nextButton.click();
                                log("已点击'下一步'，等待页面跳转...");
                            } catch (clickError) {
                                log(`点击'下一步'时发生错误: ${clickError}`);
                                alert(`点击'下一步'时发生错误: ${clickError}`);
                                await clearState();
                            }
                        } else {
                            // Button exists but is disabled, continue waiting
                            if (buttonWaitAttempts >= maxButtonWaitAttempts) {
                                clearInterval(buttonWaitIntervalId);
                                log("错误：'下一步'按钮在内容加载后，等待启用超时。");
                                alert("错误：'下一步'按钮长时间未启用，自动化流程中断。");
                                await clearState(); // 清除状态，防止卡住
                            }
                            // else continue waiting for button enable
                        }
                    }, 500); // Check button state every 500ms

                } else {
                    // Table content not yet loaded
                    log(`等待页面内容加载 (尝试 ${tableWaitAttempts}/${maxTableWaitAttempts})... 表格行数: ${tableRows.length}`);
                    if (tableWaitAttempts >= maxTableWaitAttempts) {
                        clearInterval(tableWaitIntervalId);
                        log("错误：等待页面内容 (表格加载) 超时。");
                        alert("错误：页面内容长时间未加载，自动化流程中断。");
                        await clearState(); // 清除状态
                    }
                    // else continue waiting for table content
                }
            }, 500); // Check table content every 500ms

        } else {
            log(`非预期步骤 (${currentStep || '无'})，忽略页面2。`);
        }
    }

    async function handlePage3() {
        log("尝试处理页面3: 报告编辑");
         $('body').prepend('<div style="position:fixed; top:0; left:0; background:blue; color:white; padding:2px 5px; font-size:10px; z-index:100000; opacity: 0.8;">[GM P3 Running]</div>');

        const currentStep = await GM_getValue(STEP_KEY, '');

        if (currentStep === 'page2_submitted') {
            log("状态正确 (page2_submitted)，开始填充报告...");

            // 1. 获取保存的数据
            const experimentDate = await GM_getValue(DATE_KEY, '');
            const remarks = await GM_getValue(REMARK_KEY, '');

            if (!experimentDate) {
                log("错误：无法从存储中获取实验日期。");
                alert("自动化脚本错误：无法获取之前保存的实验日期！");
                await clearState();
                return;
            }
            log(`获取存储数据: 日期=${experimentDate}, 备注='${remarks}'`);

             // 等待页面元素加载 (特别是 UEditor)
            let attempts = 0;
            const maxAttempts = 30; // 30 * 500ms = 15 seconds
            const intervalId = setInterval(async () => {
                attempts++;
                log(`等待页面元素和 UEditor 加载 (尝试 ${attempts}/${maxAttempts})...`);

                const startDateInput = $('#txt_testStartDate');
                const endDateInput = $('#txt_testEndDate');
                const templateSelect = $('#ddl_template');
                const conclusionSelect = $('#ddl_reportResultProperty');
                const submitReportBtn = $('#btn_generate');
                let remarkEditorReady = false;
                try {
                    // Check if UE and the specific editor instance exist and are ready
                    remarkEditorReady = unsafeWindow.UE && typeof unsafeWindow.UE.getEditor === 'function' &&
                                      unsafeWindow.UE.getEditor('txt_remark') &&
                                      unsafeWindow.UE.getEditor('txt_remark').isReady;
                } catch(e) {
                     log(`检查 UEditor 时发生错误: ${e}`);
                }

                // Check all elements exist before proceeding
                if (startDateInput.length && endDateInput.length && templateSelect.length &&
                    conclusionSelect.length && submitReportBtn.length && remarkEditorReady)
                {
                    clearInterval(intervalId);
                    log("页面元素和 UEditor 已准备就绪。");

                    // 2. 填充表单
                    log("填充实验开始/结束日期...");
                    startDateInput.val(experimentDate);
                    endDateInput.val(experimentDate);
                    // 触发 laydate 的可能更新 (如果需要) - 通常 blur() 可以触发验证或更新
                    // Wrap in try-catch as interacting with page elements might fail
                    try {
                       endDateInput.trigger('blur'); // 模拟失去焦点，可能触发页面自身的日期验证/处理
                       log("触发结束日期 blur 事件。");
                    } catch(e) { log(`触发 blur 时出错: ${e}`); }

                    log(`选择模板: ${TARGET_TEMPLATE_VALUE}`);
                    templateSelect.val(TARGET_TEMPLATE_VALUE);
                    try {
                       templateSelect.trigger('change'); // 触发 onchange 事件以调用 ShowThirdData()
                       log("触发模板 change 事件。");
                    } catch(e) { log(`触发 change 时出错: ${e}`); }


                    log(`选择报告结论性质: ${TARGET_CONCLUSION_VALUE}`);
                    conclusionSelect.val(TARGET_CONCLUSION_VALUE);

                    log("填充备注...");
                    try {
                         if (remarks) { // Only set content if remarks are not empty
                            // Ensure editor is ready before setting content
                            if (unsafeWindow.UE.getEditor('txt_remark').isReady) {
                                unsafeWindow.UE.getEditor('txt_remark').setContent(remarks);
                                log("备注已填充。");
                            } else {
                                log("警告: 备注编辑器报告未就绪，稍后重试填充...");
                                setTimeout(() => {
                                     try {
                                         if (unsafeWindow.UE.getEditor('txt_remark').isReady) {
                                             unsafeWindow.UE.getEditor('txt_remark').setContent(remarks);
                                             log("重试填充备注成功。");
                                         } else {
                                             log("错误: 重试填充备注失败，编辑器仍未就绪。");
                                             alert("错误：无法填充备注，编辑器未准备好。");
                                             clearState();
                                         }
                                     } catch (retryError) {
                                         log(`重试填充备注时出错: ${retryError}`);
                                         alert(`重试填充备注时出错: ${retryError}`);
                                         clearState();
                                     }
                                }, 1000); // Wait 1 second and retry
                                return; // Don't proceed to save yet
                            }
                         } else {
                             log("无备注信息，备注字段留空。");
                         }

                    } catch (editorError) {
                        log(`填充备注时出错 (UEditor): ${editorError}`);
                        alert(`填充备注时出错: ${editorError}`);
                        await clearState();
                        return; // Stop if remark filling fails
                    }

                    // 3. 提交报告
                    log("准备调用 Save() 函数 (提交报告)...");
                    // Ensure button is enabled before disabling and clicking
                    submitReportBtn.prop('disabled', false);


                    // 禁用按钮防止重复点击
                    submitReportBtn.prop('disabled', true).val('自动提交中...');


                    try {
                        if (typeof unsafeWindow.Save === 'function') {
                            // Wrap the actual call in try-catch
                            try {
                                unsafeWindow.Save();
                                log("Save() 函数已调用。等待后续操作...");
                                // Mark as submitted *after* successful call attempt
                                await GM_setValue(STEP_KEY, 'page3_submitted');
                                log("状态设置为 page3_submitted。");
                                // Schedule cleanup slightly later to allow navigation/processing
                                setTimeout(async () => {
                                     log("延迟清理状态...");
                                     await clearState();
                                 }, 5000);
                            } catch (saveError) {
                                 log(`页面函数 Save() 执行时出错: ${saveError}`);
                                 alert(`页面函数 Save() 执行时出错: ${saveError}`);
                                 submitReportBtn.prop('disabled', false).val('提交报告并增加附件');
                                 await clearState(); // Clean up state on failure
                            }
                        } else {
                            log("错误：无法访问页面函数 Save()。脚本无法提交报告。");
                            alert("错误：无法访问页面函数 Save()。脚本无法提交报告。");
                            submitReportBtn.prop('disabled', false).val('提交报告并增加附件');
                             await clearState(); // Clean up state on failure
                        }
                    } catch (error) {
                        log(`尝试调用 Save() 前发生错误: ${error}`);
                        alert(`尝试调用 Save() 前发生错误: ${error}`);
                        submitReportBtn.prop('disabled', false).val('提交报告并增加附件');
                         await clearState(); // Clean up state on failure
                    }

                } else if (attempts >= maxAttempts) {
                     clearInterval(intervalId);
                     log("错误：页面元素或 UEditor 在超时后仍未准备就绪。");
                     alert("自动化脚本错误：报告页面加载超时！");
                     await clearState();
                }

            }, 500); // Check every 500ms


        } else {
            log(`非预期步骤 (${currentStep || '无'})，忽略页面3自动化。`);
            // Optionally clear state if landing here unexpectedly
             // if (currentStep && currentStep !== 'page3_submitted') await clearState();
        }
    }

    // --- 主逻辑 ---
    async function main() {
        // Initialize logger on script start, wait for body if necessary
         if ($('body').length) {
            createLogDiv();
         } else {
             $(document).ready(createLogDiv);
         }

        log("脚本启动。");
        log(`当前 URL: ${window.location.href}`);
        log(`框架检测: ${window.self === window.top ? 'Top Window' : 'iFrame'}`); // Log if in iframe


        const url = window.location.href;

        // Use $(document).ready to ensure basic DOM is loaded before executing page logic
        $(document).ready(async () => {
             log("DOM ready. 执行页面逻辑判断...");
             try { // Wrap page logic in try-catch
                 if (url.includes('/UI/Experiment/ExperimentResult.aspx')) {
                     await handlePage1();
                 } else if (url.includes('/UI/Task/TestReport.html')) {
                     await handlePage2();
                 } else if (url.includes('/UI/Experiment/ExperimentResultThird.aspx')) {
                     await handlePage3();
                 } else {
                     log("当前页面 URL 不匹配任何已知自动化步骤。");
                 }
             } catch(pageHandlerError) {
                  log(`处理页面 ${url} 时发生错误: ${pageHandlerError}`);
                  console.error(`Error handling page ${url}:`, pageHandlerError);
                  await clearState(); // Clear state on error within page handler
             }
        });
    }

    // --- 启动脚本 ---
    // Wrap main logic in a try-catch for better error handling
    try {
       main().catch(error => {
           // Use setTimeout to ensure logging functions might be available
           setTimeout(() => {
               log(`脚本主逻辑发生未捕获错误: ${error}`);
               console.error('[LIMS Auto Script] Uncaught error in main:', error, error.stack);
               clearState(); // Attempt cleanup on major error
           }, 100);
        });
    } catch (initError) {
        console.error('[LIMS Auto Script] Initialization error:', initError);
        // Cannot rely on log() here if initialization failed early
        alert(`LIMS Automation Script Initialization Error: ${initError}`);
    }

})();
