// ==UserScript==
// @name         任务查询页表格增强
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  在任务查询页表格中增加规格型号、成型日期、龄期和实验日期列，删除信息沟通列，增加排序功能
// @author       You
// @match        *://*/*quests/quests1.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    let tableModified = false;
    
    // 当页面加载完成后执行
    window.addEventListener('load', function() {
        // 等待表格初始化完成
        waitForTableInit();
    });
    
    // 等待表格初始化完成
    function waitForTableInit() {
        if (typeof $('#table').bootstrapTable === 'function' && $('#table').data('bootstrap.table')) {
            // 表格已初始化，执行修改
            setTimeout(function() {
                // 修改表格结构，不触发查询
                modifyTableStructure();
                tableModified = true;
                
                // 监听后续的查询操作
                const searchButton = document.querySelector('input[value="查询"]');
                if (searchButton && !searchButton.dataset.eventBound) {
                    searchButton.dataset.eventBound = 'true';
                    searchButton.addEventListener('click', function() {
                        // 在查询后确保表格结构保持修改状态
                        setTimeout(function() {
                            if (!checkColumnsModified()) {
                                modifyTableStructure();
                            }
                        }, 500);
                    });
                }
            }, 1000); // 给表格一些时间完全初始化
        } else {
            setTimeout(waitForTableInit, 300);
        }
    }
    
    // 检查表格列是否已被修改
    function checkColumnsModified() {
        var $table = $('#table');
        var columns = $table.bootstrapTable('getOptions').columns[0];
        
        // 检查是否有 specification 列，这是我们添加的第一个列
        for (let i = 0; i < columns.length; i++) {
            if (columns[i].field === 'specification') {
                return true;
            }
        }
        return false;
    }
    
    // 仅修改表格结构，不触发数据刷新
    function modifyTableStructure() {
        var $table = $('#table');
        var columns = $table.bootstrapTable('getOptions').columns[0];
        var modified = false;
        
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
            modified = true;
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
        if (remainingDayIndex !== -1 && !checkColumnsModified()) {
            // 添加规格型号列
            columns.splice(remainingDayIndex + 1, 0, {
                field: 'specification',
                title: '规格型号',
                width: 150,
                sortable: true,
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
                sortable: true,
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
                sortable: true,
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
                sortable: true,
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
            
            modified = true;
        }
        
        // 给所有列添加排序功能（除了复选框列）
        columns.forEach(function(column) {
            if (column.field !== 'state') { // 排除复选框列
                column.sortable = true;
            }
        });
        
        if (modified) {
            // 仅更新列结构，不刷新数据
            $table.bootstrapTable('refreshOptions', {
                columns: [columns]
            });
            
            // 确保表格头部的排序样式正确显示
            setTimeout(function() {
                addSortableClassToHeaders();
            }, 300);
        }
    }
    
    function addSortableClassToHeaders() {
        const headers = document.querySelectorAll('#table th .th-inner');
        headers.forEach(function(header) {
            // 检查是否是复选框列
            const parentTh = header.closest('th');
            if (parentTh && (parentTh.getAttribute('data-field') === 'state' || 
                parentTh.querySelector('.fht-cell input'))) {
                // 是复选框列，不添加排序类
                if (header.classList.contains('sortable')) {
                    header.classList.remove('sortable', 'both', 'asc', 'desc');
                }
            } else {
                // 不是复选框列，添加排序类
                if (!header.classList.contains('sortable')) {
                    header.classList.add('sortable', 'both');
                }
            }
        });
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
    
    // 观察DOM变化，确保排序样式在表格重新加载后仍然有效
    const observer = new MutationObserver(function(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList' && document.querySelector('#table th')) {
                // 检查表格结构是否需要修改
                if (!checkColumnsModified() && tableModified) {
                    modifyTableStructure();
                }
                
                // 更新表头排序样式
                addSortableClassToHeaders();
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
