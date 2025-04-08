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
            
            // 添加批量修改按钮
            if (!$('#btn_BatchSamplesInfo').length) {
                const samplesInfoBtn = $('#btn_SamplesInfo');
                if (samplesInfoBtn.length) {
                    const batchBtn = $('<button type="button" class="btn btn-primary" id="btn_BatchSamplesInfo" style="margin-left: 7px;">批量修改</button>');
                    samplesInfoBtn.after(batchBtn);
                    
                    // 直接绑定点击事件，而不是使用onclick属性
                    batchBtn.on('click', function() {
                        batchSamplesInfo();
                    });
                }
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

        console.log('开始批量修改，选中的任务数量：', selects.length);
        
        // 创建进度条
        const progressLayer = layer.open({
            type: 1,
            title: '批量修改进度',
            content: '<div style="padding: 20px;"><div class="progress"><div class="progress-bar" role="progressbar" style="width: 0%"></div></div><div class="progress-text" style="text-align: center; margin-top: 10px;">0/' + selects.length + '</div></div>',
            area: ['400px', '150px']
        });

        let completed = 0;
        const total = selects.length;
        
        // 串行处理任务，确保每个任务完成后再处理下一个
        processNextTask(selects, 0, total, completed, progressLayer);
    }
    
    // 串行处理任务
    function processNextTask(tasks, index, total, completed, progressLayer) {
        if (index >= tasks.length) {
            // 所有任务处理完成
            setTimeout(() => {
                layer.close(progressLayer);
                layer.msg('批量修改完成');
                $('#table').bootstrapTable('refresh');
            }, 500);
            return;
        }
        
        const row = tasks[index];
        console.log(`处理第 ${index + 1} 个任务：`, {
            sampleNo: row.sampleNo,
            specification: row.specification
        });
        
        if (!row.specification) {
            console.log('任务没有规格信息：', row);
            completed++;
            updateProgress(completed, total);
            // 处理下一个任务
            setTimeout(() => {
                processNextTask(tasks, index + 1, total, completed, progressLayer);
            }, 300);
            return;
        }
        
        // 获取样品信息HTML内容
        $.ajax({
            url: "../../AjaxRequest/SamplesBase/SamplesBase.ashx",
            type: "POST",
            data: {
                method: "GetSamplesInfoHTML",
                testingOrderId: row.testingOrderId,
                sampleId: row.sampleId
            },
            dataType: "json",
            success: function(data) {
                console.log('成功获取样品信息HTML数据：', data);
                
                if (data && data.length > 0) {
                    const html = data[0].HTML;
                    const tableLine = data[0].tableLine;
                    const item = data[0].item;
                    
                    // 添加短暂延迟，确保HTML内容处理完整
                    setTimeout(() => {
                        try {
                            // 解析规格信息
                            const specParts = row.specification.split(',');
                            let grade = '';
                            let type = '';
                            let spec = '';
                            let condition = '';

                            console.log('原始规格信息：', specParts);

                            // 解析规格型号信息
                            specParts.forEach(part => {
                                part = part.trim();
                                if (part.includes('水下')) {
                                    grade = part;
                                    condition = '需提高等级';
                                    console.log('检测到水下等级：', grade);
                                } else if (part.includes('×')) {
                                    spec = part;
                                    console.log('检测到规格：', spec);
                                } else if (part.includes('养护')) {
                                    type = part;
                                    console.log('检测到种类：', type);
                                } else if (part.match(/^[A-Z]\d+$/)) {
                                    grade = part;
                                    condition = '不需提高等级';
                                    console.log('检测到普通等级：', grade);
                                }
                            });

                            console.log('解析后的信息：', {
                                grade: grade,
                                spec: spec,
                                type: type,
                                condition: condition
                            });

                            // 先解码HTML内容
                            const decodedHtml = html
                                .replace(/&lt;/g, '<')
                                .replace(/&gt;/g, '>')
                                .replace(/&nbsp;/g, ' ')
                                .replace(/&amp;/g, '&')
                                .replace(/&quot;/g, '"')
                                .replace(/&#39;/g, "'");
                            
                            console.log(`任务 ${index + 1}：解码后的HTML片段：`, decodedHtml.substring(0, 200) + '...');

                            // 构建要保存的数据
                            const jsonData = [];

                            // 提取基础信息 - 使用更宽松的正则表达式
                            const testingBasisCodeMatch = decodedHtml.match(/id=["']testingbasisCode0["'][^>]*value=["']([^"']+)["']/i);
                            const testingBasisNameMatch = decodedHtml.match(/id=["']testingbasisChiName0["'][^>]*value=["']([^"']+)["']/i);
                            const testingBasisIdMatch = decodedHtml.match(/id=["']testingbasisId0["'][^>]*value=["']([^"']+)["']/i);
                            const activateIdMatch = decodedHtml.match(/id=["']activateId0["'][^>]*value=["']([^"']+)["']/i);
                            
                            const testingBasisCode = testingBasisCodeMatch ? testingBasisCodeMatch[1] : '';
                            const testingBasisName = testingBasisNameMatch ? testingBasisNameMatch[1] : '';
                            const testingBasisId = testingBasisIdMatch ? testingBasisIdMatch[1] : '';
                            const activateId = activateIdMatch ? activateIdMatch[1] : '';
                            
                            console.log(`任务 ${index + 1}：提取的基础信息：`, {
                                testingBasisCode,
                                testingBasisName,
                                testingBasisId,
                                activateId
                            });
                            
                            // 提取select的选项信息 - 使用更宽松的正则表达式
                            // 等级(item0Select0)
                            const gradeOptions = extractOptions(decodedHtml, 'item0Select0');
                            console.log(`任务 ${index + 1}：等级选项：`, gradeOptions);
                            
                            // 规格(item0Select1)
                            const specOptions = extractOptions(decodedHtml, 'item0Select1');
                            console.log(`任务 ${index + 1}：规格选项：`, specOptions);
                            
                            // 实验条件一(item0Select2)
                            const conditionOptions = extractOptions(decodedHtml, 'item0Select2');
                            console.log(`任务 ${index + 1}：实验条件选项：`, conditionOptions);
                            
                            // 种类(item0Select3)
                            const typeOptions = extractOptions(decodedHtml, 'item0Select3');
                            console.log(`任务 ${index + 1}：种类选项：`, typeOptions);
                            
                            // 获取productDespTypeCode和productDespTypeName - 使用更宽松的正则表达式
                            const gradeCodeMatch = decodedHtml.match(/id=["']item0Code0["'][^>]*value=["']([^"']+)["']/i);
                            const gradeNameMatch = decodedHtml.match(/id=["']item0Name0["'][^>]*value=["']([^"']+)["']/i);
                            const specCodeMatch = decodedHtml.match(/id=["']item0Code1["'][^>]*value=["']([^"']+)["']/i);
                            const specNameMatch = decodedHtml.match(/id=["']item0Name1["'][^>]*value=["']([^"']+)["']/i);
                            const conditionCodeMatch = decodedHtml.match(/id=["']item0Code2["'][^>]*value=["']([^"']+)["']/i);
                            const conditionNameMatch = decodedHtml.match(/id=["']item0Name2["'][^>]*value=["']([^"']+)["']/i);
                            const typeCodeMatch = decodedHtml.match(/id=["']item0Code3["'][^>]*value=["']([^"']+)["']/i);
                            const typeNameMatch = decodedHtml.match(/id=["']item0Name3["'][^>]*value=["']([^"']+)["']/i);
                            
                            // 匹配选项，构建JSON数据
                            // 等级
                            if (grade) {
                                buildJsonItem(
                                    jsonData, 
                                    gradeOptions, 
                                    grade, 
                                    testingBasisCode, 
                                    testingBasisName, 
                                    activateId, 
                                    testingBasisId, 
                                    gradeCodeMatch ? gradeCodeMatch[1] : '等级', 
                                    gradeNameMatch ? gradeNameMatch[1] : '等级',
                                    index
                                );
                            }
                            
                            // 规格
                            if (spec) {
                                buildJsonItem(
                                    jsonData, 
                                    specOptions, 
                                    spec, 
                                    testingBasisCode, 
                                    testingBasisName, 
                                    activateId, 
                                    testingBasisId, 
                                    specCodeMatch ? specCodeMatch[1] : '规格', 
                                    specNameMatch ? specNameMatch[1] : '规格',
                                    index
                                );
                            }
                            
                            // 实验条件一
                            if (condition) {
                                // 打印更详细的比较信息
                                console.log(`任务 ${index + 1}：需要设置的实验条件：`, condition);
                                console.log(`任务 ${index + 1}：可用的实验条件选项：`, conditionOptions.map(o => ({value: o.value, text: o.text})));
                                
                                // 尝试不同的匹配策略
                                let conditionOption = findConditionOption(conditionOptions, condition, grade);
                                
                                if (conditionOption) {
                                    jsonData.push({
                                        testingBasisCode,
                                        testingBasisName,
                                        productDespTypeCode: conditionCodeMatch ? conditionCodeMatch[1] : '实验条件一',
                                        productDespTypeName: conditionNameMatch ? conditionNameMatch[1] : '实验条件一',
                                        productDespValue: conditionOption.text, // 使用选项的text而不是condition
                                        productDespId: conditionOption.value,
                                        activateId,
                                        testingBasisId
                                    });
                                    console.log(`任务 ${index + 1}：添加实验条件数据（匹配成功）：`, {
                                        value: conditionOption.value,
                                        text: conditionOption.text,
                                        originalCondition: condition
                                    });
                                } else {
                                    console.log(`任务 ${index + 1}：未找到匹配的实验条件选项，可用选项：`, conditionOptions.map(o => o.text));
                                }
                            }
                            
                            // 种类
                            if (type) {
                                buildJsonItem(
                                    jsonData, 
                                    typeOptions, 
                                    type, 
                                    testingBasisCode, 
                                    testingBasisName, 
                                    activateId, 
                                    testingBasisId, 
                                    typeCodeMatch ? typeCodeMatch[1] : '种类', 
                                    typeNameMatch ? typeNameMatch[1] : '种类',
                                    index
                                );
                            }

                            console.log(`任务 ${index + 1}：最终要保存的JSON数据：`, jsonData);

                            // 发送保存请求
                            if (jsonData.length > 0) {
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
                                        console.log(`任务 ${index + 1}：保存成功，返回数据：`, data);
                                        completed++;
                                        updateProgress(completed, total);
                                        
                                        // 继续处理下一个任务
                                        setTimeout(() => {
                                            processNextTask(tasks, index + 1, total, completed, progressLayer);
                                        }, 300);
                                    },
                                    error: function(xhr, status, error) {
                                        console.error(`任务 ${index + 1}：保存失败：`, {
                                            xhr: xhr,
                                            status: status,
                                            error: error
                                        });
                                        completed++;
                                        updateProgress(completed, total);
                                        
                                        // 出错也继续处理下一个任务
                                        setTimeout(() => {
                                            processNextTask(tasks, index + 1, total, completed, progressLayer);
                                        }, 300);
                                    }
                                });
                            } else {
                                console.log(`任务 ${index + 1}：没有找到匹配的选项，跳过保存`);
                                completed++;
                                updateProgress(completed, total);
                                
                                // 继续处理下一个任务
                                setTimeout(() => {
                                    processNextTask(tasks, index + 1, total, completed, progressLayer);
                                }, 300);
                            }
                        } catch (e) {
                            console.error(`任务 ${index + 1}：处理出错：`, e);
                            completed++;
                            updateProgress(completed, total);
                            
                            // 出错也继续处理下一个任务
                            setTimeout(() => {
                                processNextTask(tasks, index + 1, total, completed, progressLayer);
                            }, 300);
                        }
                    }, 200); // 添加短暂延迟，确保HTML内容处理完整
                } else {
                    console.error(`任务 ${index + 1}：获取样品信息HTML失败：`, data);
                    completed++;
                    updateProgress(completed, total);
                    
                    // 继续处理下一个任务
                    setTimeout(() => {
                        processNextTask(tasks, index + 1, total, completed, progressLayer);
                    }, 300);
                }
            },
            error: function(xhr, status, error) {
                console.error(`任务 ${index + 1}：获取样品信息HTML失败：`, {
                    xhr: xhr,
                    status: status,
                    error: error
                });
                completed++;
                updateProgress(completed, total);
                
                // 继续处理下一个任务
                setTimeout(() => {
                    processNextTask(tasks, index + 1, total, completed, progressLayer);
                }, 300);
            }
        });
    }
    
    // 更新进度条
    function updateProgress(completed, total) {
        const progress = Math.round((completed / total) * 100);
        $('.progress-bar').css('width', progress + '%');
        $('.progress-text').text(completed + '/' + total);
    }
    
    // 提取选项列表
    function extractOptions(html, selectId) {
        const options = [];
        console.log(`尝试提取select元素ID: ${selectId}的选项`);
        
        // 先尝试寻找select开始标签
        const selectStartPattern = new RegExp(`<select[^>]*id=["']${selectId}["'][^>]*>`, 'i');
        const selectStartMatch = html.match(selectStartPattern);
        
        if (!selectStartMatch) {
            console.error(`未找到ID为${selectId}的select元素起始标签`);
            // 输出HTML片段用于调试
            console.log(`HTML片段: ${html.substring(0, 300)}...`);
            return options;
        }
        
        // 获取select开始位置
        const selectStartPos = html.indexOf(selectStartMatch[0]);
        if (selectStartPos === -1) {
            console.error(`未能确定select元素的起始位置`);
            return options;
        }
        
        // 找到对应的结束标签
        let openTags = 1;
        let endPos = selectStartPos + selectStartMatch[0].length;
        let searchEndPos = Math.min(endPos + 2000, html.length); // 限制搜索范围
        
        // 简单方法尝试找结束标签
        const endTagPos = html.indexOf('</select>', endPos);
        if (endTagPos !== -1 && endTagPos < searchEndPos) {
            // 获取select标签内的内容
            const selectContent = html.substring(endPos, endTagPos);
            console.log(`找到select内容，长度: ${selectContent.length}字符`);
            
            // 提取所有option
            const optionRegex = /<option\s+value=["']([^"']+)["'][^>]*>([^<]+)<\/option>/g;
            let optionMatch;
            while ((optionMatch = optionRegex.exec(selectContent)) !== null) {
                options.push({
                    value: optionMatch[1],
                    text: optionMatch[2].trim()
                });
            }
            
            console.log(`成功从${selectId}提取到${options.length}个选项`);
            
            // 如果选项为空，输出selectContent查看内容
            if (options.length === 0) {
                console.error(`未能从select内容中提取到选项，select内容: ${selectContent}`);
            }
        } else {
            console.error(`未找到select结束标签，或结束标签位置超出搜索范围`);
        }
        
        return options;
    }
    
    // 查找条件选项
    function findConditionOption(options, condition, grade) {
        let conditionOption = null;
        
        // 1. 精确匹配
        conditionOption = options.find(o => o.text === condition);
        
        // 2. 包含匹配
        if (!conditionOption && condition.includes('提高等级')) {
            if (condition.includes('需提高等级')) {
                conditionOption = options.find(o => o.text.includes('需提高等级') || o.text === '需提高等级');
            } else if (condition.includes('不需提高等级')) {
                conditionOption = options.find(o => o.text.includes('不需提高等级') || o.text === '不需提高等级');
            }
        }
        
        // 3. 关键词匹配
        if (!conditionOption) {
            if (condition.includes('需提高')) {
                conditionOption = options.find(o => o.text.includes('需提高'));
            } else if (condition.includes('不需提高')) {
                conditionOption = options.find(o => o.text.includes('不需提高'));
            }
        }
        
        // 4. 如果有水下等级，默认选择"需提高等级"
        if (!conditionOption && grade && grade.includes('水下')) {
            conditionOption = options.find(o => o.text.includes('需提高'));
            if (!conditionOption && options.length > 0) {
                // 如果只有一个选项，直接使用
                conditionOption = options[0];
            }
        }
        
        // 5. 普通等级，默认选择"不需提高等级"
        if (!conditionOption && grade && !grade.includes('水下')) {
            conditionOption = options.find(o => o.text.includes('不需提高'));
            if (!conditionOption && options.length > 0) {
                // 如果只有一个选项，直接使用
                conditionOption = options[0];
            }
        }
        
        return conditionOption;
    }
    
    // 构建JSON数据项
    function buildJsonItem(jsonData, options, value, testingBasisCode, testingBasisName, activateId, testingBasisId, typeCode, typeName, taskIndex) {
        const option = options.find(o => o.text === value);
        if (option) {
            jsonData.push({
                testingBasisCode,
                testingBasisName,
                productDespTypeCode: typeCode,
                productDespTypeName: typeName,
                productDespValue: value,
                productDespId: option.value,
                activateId,
                testingBasisId
            });
            console.log(`任务 ${taskIndex + 1}：添加数据：`, {
                value: option.value,
                text: value
            });
        } else {
            console.log(`任务 ${taskIndex + 1}：未找到匹配的选项，可用选项：`, options.map(o => o.text));
        }
    }
    
    // 开始执行
    waitForTableInit();
})();