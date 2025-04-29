// ==UserScript==
// @name         综合查询增强
// @namespace    http://tampermonkey.net/
// @icon         https://www.scetia.com/favicon.ico
// @version      0.1
// @description  显示综合选项并增加委托ID列
// @author       Your name
// @match        10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.aspx
// @match        http://10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.html?menuId=8
// @match        http://10.1.228.22/UI/IntegratedQueryManage/IntegratedQuery.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    setTimeout(function() {
        // 功能1：显示综合选项并设为默认
        var authTypeGroup = document.querySelector('input[name="authType"]').parentNode;
        var newRadio = document.createElement('input');
        newRadio.type = 'radio';
        newRadio.name = 'authType';
        newRadio.value = '5';
        newRadio.checked = true;
        var textNode = document.createTextNode(' 综合(慢)');
        authTypeGroup.appendChild(newRadio);
        authTypeGroup.appendChild(textNode);

        // 取消其他radio的默认选中状态
        var radios = document.getElementsByName('authType');
        for(var i = 0; i < radios.length; i++) {
            if(radios[i].value !== '5') {
                radios[i].checked = false;
            }
        }

        // 功能2：增加委托ID列
        var $table = $('#table');
        var columns = $table.bootstrapTable('getOptions').columns[0];
        columns.splice(2, 0, {
            field: 'testingOrderId',
            title: '委托ID',
            width: 100,
            sortable: true
        });
        $table.bootstrapTable('refreshOptions', {columns: [columns]});
    }, 1000);
})();