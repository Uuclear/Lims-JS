// ==UserScript==
// @name         实验室管理系统自动登录
// @namespace    http://tampermonkey.net/
// @icon         https://www.scetia.com/favicon.ico
// @version      0.1
// @description  自动填写用户名密码并计算验证码
// @author       slouch
// @match        http://10.1.228.22/
// @match        http://10.1.228.22/UI/login.html?clear=1
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';
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
            middleBox.style.marginBottom = '30%';  // 调整底部边距
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

    // 用户数据
    const userData = [
        { name: '秦臻', username: '13913907254', password: 'ifiwant00' },
        { name: '李晓明', username: '13621929176', password: 'L6543210' },
        { name: '张峙琪', username: '13764697423', password: 'Qiqi_77187718' },
        { name: '胡跃进', username: '15190131025', password: 'Hu320900' },
        { name: '姜华', username: '13916983104', password: 'ab090819' },
        { name: '张志成', username: '15821032852', password: 'yhfgycyydt3' },
        { name: '林岚荣', username: '13816824913', password: 'llr30168' },
        { name: '李成真', username: '18018553643', password: 'lcz123456' }
    ];

    // 创建用户选择界面
    function createUserSelector() {
        const container = document.createElement('div');
        container.style.marginBottom = '20px';

        // 创建下拉框
        const select = document.createElement('select');
        select.style.padding = '6px';
        select.style.width = '300px';

        // 添加默认选项
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = '请选择用户';
        select.appendChild(defaultOption);

        // 添加用户选项
        userData.forEach((user, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.text = user.name;
            select.appendChild(option);
        });

        // 选择事件处理
        select.addEventListener('change', function() {
            const selectedIndex = this.value;
            if (selectedIndex !== '') {
                const user = userData[selectedIndex];
                document.getElementById('username').value = user.username;
                document.getElementById('password').value = user.password;

                // 自动计算验证码
                setTimeout(solveVerifyCode, 100);
            }
        });

        container.appendChild(select);

        // 插入到用户名输入框前面
        const usernameInput = document.getElementById('username');
        usernameInput.parentNode.parentNode.insertBefore(container, usernameInput.parentNode);
    }

    // 解析并计算验证码
    function solveVerifyCode() {
        const verifyCodeElement = document.querySelector('.verify-code');
        if (!verifyCodeElement) return;

        const expression = verifyCodeElement.textContent.trim();
        const numbers = expression.split(/[+\-=]/);
        const num1 = parseInt(numbers[0]);
        const num2 = parseInt(numbers[1]);

        let result;
        if (expression.includes('+')) {
            result = num1 + num2;
        } else if (expression.includes('-')) {
            result = num1 - num2;
        }

        // 填写验证码结果
        const inputElement = document.querySelector('.varify-input-code');
        if (inputElement) {
            inputElement.value = result;
            // 触发input事件以激活验证
            const event = new Event('input', { bubbles: true });
            inputElement.dispatchEvent(event);
        }
    }

    // 使用 MutationObserver 监听 DOM 变化
    function init() {
        const observer = new MutationObserver((mutations, obs) => {
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                createUserSelector();
                obs.disconnect(); // 找到元素后停止观察
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    // 立即执行初始化
    init();
})();