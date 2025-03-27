// ==UserScript==
// @name         隐藏登录页面底部图片
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  隐藏登录页面底部的两张图片并调整页面布局
// @author       Your name
// @match        http://10.1.228.22/UI/Index/Login.html
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 等待页面加载完成
    window.addEventListener('load', function() {
        // 隐藏二维码区域
        const qrcodeDiv = document.getElementById('qrcode_div');
        if (qrcodeDiv) {
            qrcodeDiv.style.display = 'none';
        }
        
        // 隐藏QQ二维码图片
        const qqQrcode = document.querySelector('img[src="/UI/images/qq_qrode.png"]');
        if (qqQrcode) {
            qqQrcode.style.display = 'none';
        }

        // 调整页面布局
        const middleBox = document.querySelector('.middle-box');
        if (middleBox) {
            middleBox.style.marginTop = '10%';  // 调整顶部边距
            middleBox.style.marginBottom = '10%';  // 调整底部边距
        }

        // 调整整体容器样式
        const container = document.querySelector('.gray-bg');
        if (container) {
            container.style.minHeight = '100vh';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.justifyContent = 'center';
            container.style.alignItems = 'center';
        }
    });
})(); 