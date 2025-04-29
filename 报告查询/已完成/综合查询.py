import requests
import json
import urllib3
import webbrowser
import time
import os
from urllib.parse import urlparse
try:
    import browser_cookie3
except ImportError:
    browser_cookie3 = None

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 设置请求URL
base_url = "http://10.1.228.22"
login_url = f"{base_url}/UI/Login/Login.html"
query_page_url = f"{base_url}/UI/IntegratedQueryManage/IntegratedQuery.html?menuId=8"
query_url = f"{base_url}/AjaxRequest/IntegratedQueryManage/IntegratedQuery.ashx"

def parse_cookie_string(cookie_str):
    """从字符串解析cookie"""
    cookies = {}
    if cookie_str:
        cookie_pairs = cookie_str.split(';')
        for pair in cookie_pairs:
            if '=' in pair:
                name, value = pair.strip().split('=', 1)
                cookies[name] = value
    return cookies

def get_cookies_from_browser(domain):
    """从浏览器获取指定域名的cookie"""
    if not browser_cookie3:
        return {}
        
    try:
        # 尝试从Chrome获取
        cookies = browser_cookie3.chrome(domain_name=domain)
        if cookies:
            return {cookie.name: cookie.value for cookie in cookies}
    except Exception as e:
        print(f"从Chrome获取cookie失败: {str(e)}")
    
    try:
        # 尝试从Edge获取
        cookies = browser_cookie3.edge(domain_name=domain)
        if cookies:
            return {cookie.name: cookie.value for cookie in cookies}
    except Exception as e:
        print(f"从Edge获取cookie失败: {str(e)}")
    
    try:
        # 尝试从Firefox获取
        cookies = browser_cookie3.firefox(domain_name=domain)
        if cookies:
            return {cookie.name: cookie.value for cookie in cookies}
    except Exception as e:
        print(f"从Firefox获取cookie失败: {str(e)}")
    
    # 都失败则返回空
    return {}

def check_cookie_valid(cookies):
    """检查cookie是否有效"""
    if not cookies or 'UserId' not in cookies or 'ASP.NET_SessionId' not in cookies:
        return False
        
    # 尝试发送一个简单请求验证cookie
    headers = {
        'Cookie': '; '.join([f"{name}={value}" for name, value in cookies.items()]),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(
            query_page_url,
            headers=headers,
            verify=False,
            timeout=5
        )
        # 如果响应中包含登录表单，说明cookie无效
        if 'login-form' in response.text.lower() or response.status_code != 200:
            return False
            
        # 额外检查是否成功加载了查询页面
        return '委托查询' in response.text or 'IntegratedQuery' in response.text
    except Exception as e:
        print(f"验证cookie时出错: {str(e)}")
        return False

def get_manual_cookie():
    """手动输入cookie"""
    print("\n自动获取cookie失败，请手动输入cookie")
    print("请按照以下步骤操作：")
    print("1. 在浏览器中打开开发者工具（按F12）")
    print("2. 切换到Network（网络）选项卡")
    print("3. 刷新页面或点击任何请求")
    print("4. 选择一个请求，在右侧找到Headers（标头）")
    print("5. 找到Cookie字段并复制其完整内容")
    
    cookie_str = input("\n请粘贴cookie字符串: ")
    return parse_cookie_string(cookie_str)

def login_and_get_cookies():
    """打开浏览器让用户登录并获取cookie"""
    print(f"正在打开登录页面: {login_url}")
    print("请在浏览器中登录系统...")
    webbrowser.open(login_url)
    
    # 等待用户登录
    input("登录完成后请按回车键继续...")
    time.sleep(2)  # 给浏览器一点时间保存cookie
    
    # 尝试从浏览器获取cookie
    domain = urlparse(base_url).netloc
    cookies = get_cookies_from_browser(domain)
    
    # 检查是否获取到了必要的cookie
    if not cookies or not check_cookie_valid(cookies):
        print("自动获取cookie失败，尝试手动输入...")
        cookies = get_manual_cookie()
        
        if not check_cookie_valid(cookies):
            print("无法获取有效的cookie，请确保您已成功登录系统")
            return None
    
    print("成功获取cookie!")
    print(f"Cookie内容: {'; '.join([f'{k}={v}' for k,v in cookies.items()])}")
    return cookies

def query_report(report_no, cookies):
    """根据报告编号查询委托信息"""
    # 设置请求头
    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': '; '.join([f"{name}={value}" for name, value in cookies.items()]),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Accept-Encoding': 'gzip, deflate',
        'Accept-Language': 'zh-CN,zh;q=0.9,es;q=0.8,ko;q=0.7,en;q=0.6',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': base_url,
        'Referer': query_page_url
    }

    # 设置查询参数
    params = {
        'method': 'GetIntegratedQueryInfo',
        'type': '4',
        'size': '10',
        'page': '1',
        'testingReportsNo': report_no,  # 报告编号
        'cha': '1',
        'authType': '5'  # 使用综合查询(最高权限)
    }

    try:
        # 发送POST请求
        response = requests.post(
            query_url,
            headers=headers,
            data=params,
            verify=False
        )
        
        # 输出请求信息
        print(f"请求URL: {response.request.url}")
        print(f"请求方法: {response.request.method}")
        print(f"状态码: {response.status_code}")
        
        # 检查响应状态
        response.raise_for_status()
        
        # 尝试解析JSON响应
        try:
            result = response.json()
            print("\n查询结果:")
            # 如果结果是数组,提取信息
            if isinstance(result, list):
                print(f"找到 {len(result)} 条记录")
                
                if len(result) > 0:
                    # 打印委托信息
                    for i, item in enumerate(result):
                        print(f"\n记录 {i+1}:")
                        print("\n== 委托信息 ==")
                        # 显示所有可用字段
                        for key, value in item.items():
                            if value:  # 只显示非空字段
                                print(f"{key}: {value}")
                                
                    return result
                else:
                    print("没有找到匹配的记录,请检查报告编号是否正确")
            else:
                print(json.dumps(result, indent=2, ensure_ascii=False))
            
            return result
        except json.JSONDecodeError:
            print("\n响应不是JSON格式:")
            print(response.text[:500])  # 只打印前500个字符
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"请求错误: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"状态码: {e.response.status_code}")
            print(f"响应内容: {e.response.text[:500]}")  # 只打印前500个字符
        return None

def save_cookies(cookies, filename='cookies.txt'):
    """保存cookie到文件"""
    with open(filename, 'w') as f:
        for key, value in cookies.items():
            f.write(f"{key}={value}\n")
    print(f"Cookie已保存到 {filename}")

def load_cookies(filename='cookies.txt'):
    """从文件加载cookie"""
    cookies = {}
    try:
        if os.path.exists(filename):
            with open(filename, 'r') as f:
                for line in f:
                    if '=' in line:
                        key, value = line.strip().split('=', 1)
                        cookies[key] = value
            print(f"已从 {filename} 加载Cookie")
        return cookies
    except Exception as e:
        print(f"加载Cookie失败: {str(e)}")
        return {}

def main():
    # 先尝试从文件加载cookie
    cookies = load_cookies()
    
    # 验证cookie是否有效
    if not check_cookie_valid(cookies):
        print("Cookie无效或不存在，需要重新登录")
        cookies = login_and_get_cookies()
        if not cookies:
            print("无法获取有效的cookie，程序退出")
            return
        else:
            # 保存新获取的cookie
            save_cookies(cookies)
    
    # 循环查询
    while True:
        report_no = input("\n请输入报告编号(输入'q'退出): ")
        if report_no.lower() == 'q':
            break
        
        if not report_no.strip():
            print("报告编号不能为空")
            continue
        
        # 查询报告
        result = query_report(report_no, cookies)
        
        # 如果查询失败且返回None，可能是cookie失效
        if result is None:
            print("查询失败，尝试重新获取cookie...")
            cookies = login_and_get_cookies()
            if cookies:
                # 保存新获取的cookie
                save_cookies(cookies)
                # 重试查询
                query_report(report_no, cookies)
            else:
                print("无法获取有效的cookie，请检查网络连接或系统状态")

if __name__ == "__main__":
    main()