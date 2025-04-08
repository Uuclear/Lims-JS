// ==UserScript==
// @name         任务查询页表格增强
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  在任务查询页表格中增加规格型号、成型日期、龄期和实验日期列，删除信息沟通列，增加排序功能，增加批量修改功能
// @author       You
// @match        http://10.1.228.22/UI/Task/TaskManagement.html*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    let tableModified = false;
    let originalSearchFunction;
    let originalBatchSamplesInfoFunction;
    
    // 等待表格初始化完成
    function waitForTableInit() {
        if (typeof $('#table').bootstrapTable === 'function' && $('#table').data('bootstrap.table')) {
            // 表格已初始化，保存原始搜索函数并进行拦截
            if (typeof window.Search === 'function' && !originalSearchFunction) {
                originalSearchFunction = window.Search;
                window.Search = function() {
                    // 第一次调用Search时修改表格
                    if (!tableModified) {
                        modifyTable();
                        tableModified = true;
                    }
                    // 调用原始搜索函数
                    originalSearchFunction.apply(this, arguments);
                };
            }
            
            // 保存并重写批量修改函数
            if (typeof window.BatchSamplesInfo === 'function' && !originalBatchSamplesInfoFunction) {
                originalBatchSamplesInfoFunction = window.BatchSamplesInfo;
                window.BatchSamplesInfo = batchSamplesInfo;
            }
            
            // 监听查询按钮点击事件
            const searchButton = document.querySelector('input[value="查询"]');
            if (searchButton && !searchButton.dataset.eventBound) {
                searchButton.dataset.eventBound = 'true';
                searchButton.addEventListener('click', function() {
                    if (!tableModified) {
                        setTimeout(modifyTable, 300);
                        tableModified = true;
                    }
                });
            }
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
        }
        
        // 给所有列添加排序功能（除了复选框列）
        columns.forEach(function(column) {
            if (column.field !== 'state') { // 排除复选框列
                column.sortable = true;
            }
        });
        
        // 刷新表格
        $table.bootstrapTable('refreshOptions', {
            columns: [columns]
        });
        
        // 确保表格头部的排序样式正确显示
        setTimeout(function() {
            addSortableClassToHeaders();
        }, 300);
    }
    
    function addSortableClassToHeaders() {
        const headers = document.querySelectorAll('#table th .th-inner');
        headers.forEach(function(header) {
            // 检查是否是复选框列
            if (header.parentElement.getAttribute('data-field') === 'state' || 
                header.parentElement.querySelector('.fht-cell input')) {
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
            if (mutation.type === 'childList' && 
                document.querySelector('#table th') && 
                tableModified) {
                addSortableClassToHeaders();
            }
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 批量修改函数
    function batchSamplesInfo() {
        const selects = $("#table").bootstrapTable('getSelections');
        if (selects.length === 0) {
            layer.msg("请选择要修改的任务");
            return;
        }
        
        // 创建进度条
        const progressLayer = layer.open({
            type: 1,
            title: '批量修改进度',
            content: '<div style="padding: 20px;"><div class="progress"><div class="progress-bar" role="progressbar" style="width: 0%"></div></div><div class="progress-text" style="text-align: center; margin-top: 10px;">0/' + selects.length + '</div></div>',
            area: ['400px', '150px']
        });
        
        let completed = 0;
        const total = selects.length;
        
        // 逐个处理选中的任务
        selects.forEach((row, index) => {
            setTimeout(() => {
                if (row.specification) {
                    const specParts = row.specification.split(' ');
                    let grade = '';
                    let type = '';
                    let spec = '';
                    let condition = '';
                    
                    // 解析规格型号信息
                    specParts.forEach(part => {
                        if (part.includes('水下')) {
                            grade = part.replace('水下', '');
                            condition = '需提高等级';
                        } else if (part.includes('等级')) {
                            grade = part;
                            condition = '不需提高等级';
                        } else if (part.includes('规格')) {
                            spec = part;
                        } else if (part.includes('种类')) {
                            type = part;
                        }
                    });
                    
                    // 构建要保存的数据
                    const jsonData = [{
                        testingBasisCode: row.testingBasisCode,
                        testingBasisName: row.testingBasisName,
                        productDespTypeCode: 'GRADE',
                        productDespTypeName: '等级',
                        productDespValue: grade,
                        productDespId: grade,
                        activateId: row.activateId,
                        testingBasisId: row.testingBasisId
                    }, {
                        testingBasisCode: row.testingBasisCode,
                        testingBasisName: row.testingBasisName,
                        productDespTypeCode: 'TYPE',
                        productDespTypeName: '种类',
                        productDespValue: type,
                        productDespId: type,
                        activateId: row.activateId,
                        testingBasisId: row.testingBasisId
                    }, {
                        testingBasisCode: row.testingBasisCode,
                        testingBasisName: row.testingBasisName,
                        productDespTypeCode: 'SPEC',
                        productDespTypeName: '规格',
                        productDespValue: spec,
                        productDespId: spec,
                        activateId: row.activateId,
                        testingBasisId: row.testingBasisId
                    }, {
                        testingBasisCode: row.testingBasisCode,
                        testingBasisName: row.testingBasisName,
                        productDespTypeCode: 'CONDITION',
                        productDespTypeName: '实验条件一',
                        productDespValue: condition,
                        productDespId: condition,
                        activateId: row.activateId,
                        testingBasisId: row.testingBasisId
                    }];
                    
                    // 发送保存请求
                    $.ajax({
                        url: "../../AjaxRequest/SamplesBase/SamplesBase.ashx",
                        type: "POST",
                        data: {
                            method: "SaveAddSamplesInfo",
                            jsonData: JSON.stringify(jsonData),
                            len: jsonData.length,
                            testingOrderNo: row.testingOrderNo,
                            sampleNo: row.sampleNo,
                            testingOrderId: row.testingOrderId,
                            sampleId: row.sampleId
                        },
                        dataType: "json",
                        success: function(data) {
                            completed++;
                            const progress = Math.round((completed / total) * 100);
                            $('.progress-bar').css('width', progress + '%');
                            $('.progress-text').text(completed + '/' + total);
                            
                            if (completed === total) {
                                setTimeout(() => {
                                    layer.close(progressLayer);
                                    layer.msg('批量修改完成');
                                    $('#table').bootstrapTable('refresh');
                                }, 500);
                            }
                        },
                        error: function() {
                            completed++;
                            if (completed === total) {
                                setTimeout(() => {
                                    layer.close(progressLayer);
                                    layer.msg('批量修改完成，部分任务可能修改失败');
                                    $('#table').bootstrapTable('refresh');
                                }, 500);
                            }
                        }
                    });
                } else {
                    completed++;
                    if (completed === total) {
                        setTimeout(() => {
                            layer.close(progressLayer);
                            layer.msg('批量修改完成，部分任务可能修改失败');
                            $('#table').bootstrapTable('refresh');
                        }, 500);
                    }
                }
            }, index * 500); // 添加延迟，避免请求过于密集
        });
    }
    
    // 开始执行
    waitForTableInit();
})();