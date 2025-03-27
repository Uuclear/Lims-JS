// ==UserScript==
// @name         任务查询页表格增强
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  在任务查询页表格中增加规格型号、成型日期、龄期和实验日期列，删除信息沟通列
// @author       You
// @match        *://*/*quests/quests1.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 等待表格初始化完成
    function waitForTableInit() {
        if (typeof $('#table').bootstrapTable === 'function' && $('#table').data('bootstrap.table')) {
            setTimeout(modifyTable, 500); // 给表格一些时间加载数据
        } else {
            setTimeout(waitForTableInit, 300);
        }
    }
    
    function modifyTable() {
        // 获取表格的列配置
        var $table = $('#table');
        var columns = $table.bootstrapTable('getOptions').columns[0];
        
        // 查找要删除的列索引（信息沟通列）
        let commColumnIndex = -1;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].field === 'nextUSERS') {
                commColumnIndex = i;
                break;
            }
        }
        
        // 删除信息沟通列
        if (commColumnIndex !== -1) {
            columns.splice(commColumnIndex, 1);
        }
        
        // 查找剩余天数列的索引
        let remainingDayIndex = -1;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].field === 'remainingDay') {
                remainingDayIndex = i;
                break;
            }
        }
        
        // 在剩余天数列后添加新列
        if (remainingDayIndex !== -1) {
            // 添加规格型号列
            columns.splice(remainingDayIndex + 1, 0, {
                field: 'specification',
                title: '规格型号',
                width: 150,
                formatter: function(value, row, index) {
                    if (!row._loaded) {
                        loadTaskDetails(row);
                        row._loaded = true;
                    }
                    return row.specification || '--';
                }
            });
            
            // 添加成型日期列
            columns.splice(remainingDayIndex + 2, 0, {
                field: 'formatDate',
                title: '成型日期',
                width: 100,
                formatter: function(value, row, index) {
                    if (!row._loaded) {
                        loadTaskDetails(row);
                        row._loaded = true;
                    }
                    return row.formatDate ? FormatTime(row.formatDate) : '--';
                }
            });
            
            // 添加龄期列
            columns.splice(remainingDayIndex + 3, 0, {
                field: 'agePeriod',
                title: '龄期',
                width: 70,
                formatter: function(value, row, index) {
                    if (!row._loaded) {
                        loadTaskDetails(row);
                        row._loaded = true;
                    }
                    return row.agePeriod || '--';
                }
            });
            
            // 添加实验日期列
            columns.splice(remainingDayIndex + 4, 0, {
                field: 'formatDateAgePeriod',
                title: '实验日期',
                width: 100,
                formatter: function(value, row, index) {
                    if (!row._loaded) {
                        loadTaskDetails(row);
                        row._loaded = true;
                    }
                    if (row.formatDate && row.agePeriod) {
                        return calculateTestDate(row.formatDate, row.agePeriod);
                    }
                    return '--';
                }
            });
        }
        
        // 刷新表格
        $table.bootstrapTable('refreshOptions', {columns: [columns]});
    }
    
    function loadTaskDetails(row) {
        // 如果任务ID和样品ID存在，则发送AJAX请求获取详细信息
        if (row.taskId && row.sampleId) {
            $.ajax({
                url: "../../AjaxRequest/TestingOrders/TestingOrders.ashx",
                type: "POST",
                data: {
                    method: "GetSamplesBaseList",
                    testingOrderId: row.testingOrderId,
                    sampleId: row.sampleId
                },
                dataType: "json",
                async: false,
                success: function(data) {
                    if (data && data.length > 0) {
                        // 将获取的详细信息设置到行数据中
                        row.specification = data[0].specification || '';
                        row.formatDate = data[0].formatDate || '';
                        row.agePeriod = data[0].agePeriod || '';
                    }
                }
            });
        }
    }
    
    function calculateTestDate(formatDate, agePeriod) {
        try {
            const date = new Date(formatDate);
            const days = parseInt(agePeriod);
            if (!isNaN(date.getTime()) && !isNaN(days)) {
                date.setDate(date.getDate() + days);
                return date.toLocaleDateString();
            }
        } catch (e) {
            console.error('日期计算错误', e);
        }
        return '--';
    }
    
    // 开始执行
    waitForTableInit();
})();