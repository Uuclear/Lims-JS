import requests
import json
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 设置请求URL
base_url = "http://10.1.228.22"
query_url = f"{base_url}/AjaxRequest/IntegratedQueryManage/IntegratedQuery.ashx"

# 设置请求头
headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Cookie': 'UserId=4000; ASP.NET_SessionId=o3gl5lbzpc2y2wppg4ac3tme',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.9,es;q=0.8,ko;q=0.7,en;q=0.6',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': base_url,
    'Referer': f"{base_url}/UI/IntegratedQueryManage/IntegratedQuery.html?menuId=8"
}

# 设置完整的查询参数，与网页端完全一致
params = {
    'method': 'GetIntegratedQueryInfo',
    'type': '4',
    'size': '10',             # 每页条数
    'page': '1',              # 当前页
    'testingOrderContractNo': '',
    'testingOrderContractNo2': '',
    'testingOrderNo': '',     # 委托编号
    'testingOrderUnit': '',   # 委托单位
    'testingSamplesNo': '',   # 样品编号
    'testingReportsNo': 'LJ018-25003',  # 报告编号
    'testingType': '',        # 业务类型
    'productType': '',        # 产品大类
    'testingType2': '',       # 检验类别
    'TestBasisCode': '',      # 检测依据编号
    'TestBasisName': '',      # 检测依据名称
    'ProjectName': '',        # 工程名称
    'testingOrderTypeDesp': '', # 抽样单位
    'zhuti': '',              # 实验主体
    'creator': '',            # 委托登记人
    'projectSection': '',     # 工程部位
    'DelegateTimeS': '',      # 委托开始时间
    'DelegateTimeE': '',      # 委托结束时间
    'TestingMechanism': '',   # 检测机构
    'SampleName': '',         # 样品名称
    'Manufacturer': '',       # 生产厂家
    'TypeSpecification': '',  # 规格型号
    'GenerationDateS': '',    # 生成开始日期
    'GenerationDateE': '',    # 生成结束日期
    'ReportProperties': '',   # 报告性质
    'Reviewer': '',           # 审核人
    'Approver': '',           # 批准人
    'contractIndex': '',
    'cha': '1',               # 标记是否进行查询
    'authType': '5'           # 权限类型
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
        # 如果结果是数组,提取更多信息
        if isinstance(result, list):
            print(f"找到 {len(result)} 条记录")
            for i, item in enumerate(result):
                print(f"\n记录 {i+1}:")
                """
                # 展示所有可用字段
                for key, value in item.items():
                    print(f"{key}: {value}")
                
                # 如果想要更有条理地显示，可以按类别组织信息
                """
                print("\n== 委托信息 ==")
                委托字段 = ['testingOrderId', 'testingOrderNo', 'testingOrderContractNo', 'testingOrderUnitName', 
                       'projectName', 'testingOrderTime', 'testingInstituteName', 'totalFee', 
                       'sampleCount', 'reportCount', 'testingOrderStatusCode', 'changeStatus']
                for key in 委托字段:
                    if key in item:
                        print(f"{key}: {item[key]}")
                        
                print("\n== 样品信息 ==")
                样品字段 = ['testingSamplesNo', 'SampleName', 'Manufacturer', 'TypeSpecification']
                for key in 样品字段:
                    if key in item:
                        print(f"{key}: {item[key]}")
                
                print("\n== 报告信息 ==")
                报告字段 = ['testingReportsNo', 'GenerationDate', 'ReportProperties', 'Reviewer', 'Approver']
                for key in 报告字段:
                    if key in item:
                        print(f"{key}: {item[key]}")
                
        else:
            print(json.dumps(result, indent=2, ensure_ascii=False))
    except json.JSONDecodeError:
        print("\n响应不是JSON格式:")
        print(response.text[:500])  # 只打印前500个字符
        
except requests.exceptions.RequestException as e:
    print(f"请求错误: {str(e)}")
    if hasattr(e, 'response') and e.response is not None:
        print(f"状态码: {e.response.status_code}")
        print(f"响应内容: {e.response.text[:500]}")  # 只打印前500个字符