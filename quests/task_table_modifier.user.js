// ==UserScript==
// @name         任务查询表格修改器
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  修改任务查询表格,添加规格型号等列
// @author       Your name
// @match        */quests/quests1.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待表格加载完成
    function waitForTable() {
        return new Promise(resolve => {
            const checkTable = () => {
                const table = document.querySelector('#table');
                if (table) {
                    resolve(table);
                } else {
                    setTimeout(checkTable, 100);
                }
            };
            checkTable();
        });
    }

    // 修改表格列定义
    async function modifyTable() {
        const table = await waitForTable();
        
        // 获取表格的thead和tbody
        const thead = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        
        // 删除"信息沟通"列
        const infoCommCell = thead.querySelector('th[data-field="nextUSERS"]');
        if (infoCommCell) {
            infoCommCell.remove();
        }
        
        // 添加新列
        const newColumns = [
            {field: 'specification', title: '规格型号', width: 120},
            {field: 'formatDate', title: '成型日期', width: 100},
            {field: 'agePeriod', title: '龄期', width: 80},
            {field: 'experimentDate', title: '实验日期', width: 100}
        ];
        
        newColumns.forEach(col => {
            const th = document.createElement('th');
            th.setAttribute('data-field', col.field);
            th.setAttribute('data-width', col.width);
            th.textContent = col.title;
            thead.appendChild(th);
        });
        
        // 修改bootstrap-table配置
        const tableOptions = $(table).bootstrapTable('getOptions');
        tableOptions.columns[0].splice(tableOptions.columns[0].findIndex(col => col.field === 'nextUSERS'), 1);
        newColumns.forEach(col => {
            tableOptions.columns[0].push(col);
        });
        $(table).bootstrapTable('refreshOptions', tableOptions);
        
        // 监听行点击事件,获取详情数据
        $(table).on('click-row.bs.table', function(e, row) {
            const testingOrderId = row.testingOrderId;
            const sampleId = row.sampleId;
            
            // 获取详情数据
            $.ajax({
                url: '../../AjaxRequest/TestingOrders/TestingOrders.ashx',
                method: 'POST',
                data: {
                    method: 'GetSamplesBaseList',
                    testingOrderId: testingOrderId,
                    sampleId: sampleId
                },
                success: function(data) {
                    if (data && data[0]) {
                        // 更新表格行数据
                        const rowData = {
                            specification: data[0].specification || '',
                            formatDate: data[0].formatDate ? new Date(data[0].formatDate).toLocaleDateString() : '',
                            agePeriod: data[0].agePeriod || '',
                            experimentDate: data[0].formatDate && data[0].agePeriod ? 
                                new Date(new Date(data[0].formatDate).getTime() + data[0].agePeriod * 24 * 60 * 60 * 1000).toLocaleDateString() : ''
                        };
                        
                        $(table).bootstrapTable('updateRow', {
                            index: $(table).bootstrapTable('getData').findIndex(r => r.sampleId === sampleId),
                            row: rowData
                        });
                    }
                }
            });
        });
    }

    // 页面加载完成后执行
    window.addEventListener('load', modifyTable);
})(); 