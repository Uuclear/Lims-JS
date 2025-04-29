// ==UserScript==
// @name         LIMS 快速提交报告
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在报告页面添加快速提交按钮，自动填充日期和结论性质并提交。
// @match        http://10.1.228.22/UI/Experiment/ExperimentResultThird.aspx?reportId=&testingBasisId=44504&sampleid=1503748&testingItemId=&sampleNo=HY18-250227-01&taskId=1629027 
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 获取当前日期 YYYY-MM-DD 格式
    function getTodayDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // 月份从 0 开始，需要 +1
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // 查找目标按钮
    const submitButton = document.getElementById('btn_generate');

    if (submitButton) {
        // 创建新的"提交"按钮
        const quickSubmitButton = document.createElement('input');
        quickSubmitButton.setAttribute('id', 'btn_quick_submit');
        quickSubmitButton.setAttribute('type', 'button');
        quickSubmitButton.setAttribute('class', 'btn btn-primary'); // 保持样式一致
        quickSubmitButton.setAttribute('value', '提交');
        quickSubmitButton.style.marginLeft = '10px'; // 添加一些间距

        // 添加点击事件监听器
        quickSubmitButton.addEventListener('click', function() {
            console.log('快速提交按钮被点击');

            const today = getTodayDate();

            // 1. 设置开始和结束日期为今天
            const startDateInput = document.getElementById('txt_testStartDate');
            const endDateInput = document.getElementById('txt_testEndDate');
            if (startDateInput && endDateInput) {
                startDateInput.value = today;
                endDateInput.value = today;
                console.log('日期已设置为:', today);
            } else {
                console.error('未找到日期输入框');
                alert('未找到日期输入框！');
                return;
            }

            // 2. 设置报告结论性质为最后一项 "--"
            const conclusionSelect = document.getElementById('ddl_reportResultProperty');
            if (conclusionSelect && conclusionSelect.options.length > 0) {
                conclusionSelect.selectedIndex = conclusionSelect.options.length - 1; // 选中最后一项
                console.log('报告结论性质已设置为:', conclusionSelect.options[conclusionSelect.selectedIndex].text);
            } else {
                console.error('未找到报告结论性质下拉框');
                 alert('未找到报告结论性质下拉框！');
                return;
            }

            // 3. 调用页面原有的 Save() 函数
            if (typeof unsafeWindow.Save === 'function') {
                console.log('调用 Save() 函数...');
                try {
                   // 检查并执行 Save 函数所需的验证逻辑（简化版，只检查日期）
                   if (!unsafeWindow.showValue(endDateInput)) {
                        console.log("日期验证失败 (showValue)");
                        return;
                   }
                   // 调用原始的 Save 函数
                   unsafeWindow.Save();
                } catch (error) {
                    console.error('调用 Save() 函数时出错:', error);
                    alert('提交过程中发生错误: ' + error.message);
                }
            } else {
                console.error('未找到页面的 Save() 函数');
                alert('无法找到提交功能所需的 Save() 函数！');
            }
        });

        // 将新按钮插入到原按钮之后
        submitButton.parentNode.insertBefore(quickSubmitButton, submitButton.nextSibling);
        console.log('快速提交按钮已添加');

    } else {
        console.error('未找到ID为 "btn_generate" 的按钮');
    }
})();
