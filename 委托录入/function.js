<script type="text/javascript">
        $(".J_menuItem").each(function (t) {
            $(this).attr("data-index") || $(this).attr("data-index", t)
        });
        function printLable() {
            var selections = $("#table").bootstrapTable("getSelections");
            if (selections.length == 0) {
                layer.alert("请至少选中一行数据!", { icon: 5 });
                return;
            }
            var testingOrderId = "";
            for (var i = 0; i < selections.length; i++) {
                testingOrderId += selections[i].testingOrderId += ",";
            }
            if (testingOrderId != "")
                testingOrderId = testingOrderId.substr(0, testingOrderId.length - 1);
            var src = "../SamplesBase/SamplesPrint2.html?testingOrderId=" + testingOrderId;


            window.parent.xiu1(src, "标签打印");
        }
        $(function () {
            $('.form_date').datetimepicker({
                language: 'fr',
                weekStart: 1,
                todayBtn: 1,
                autoclose: 1,
                todayHighlight: 1,
                startView: 2,
                minView: 2,
                forceParse: 0
            });
            getTestingInstitute();
            getTestingType();
            var user = GetQueryString("create");
            var status = GetQueryString("status");
            if (user != "") {
                $("#txt_creator").val(user);
            }
            if (status != "" && status != null) {
                $("#ddl_status").val(status);
            }
            GetSalaryInfo();
        })
        var cha = 0;
        function queryParamsInfo(params) {
            var testingNO = $("#testingNO").val().trim();
            var testingDate = $("#testingDate").val().trim();
            var testingDate1 = $("#testingDate1").val().trim();
            var testingOrderUnitName = $("#testingOrderUnitName").val().trim();
            var projectName = $("#projectName").val().trim();
            var productiveUnit = $("#productiveUnit").val().trim();
            var sampleName = $("#sampleName").val().trim();
            var testingInstituteCode = $("#testingInstitute").val().trim();
            var creator = $("#txt_creator").val();
            var status = $("#ddl_status").val();
            var testingTypeName = $("#ddl_testingType").val();
            return {
                method: "GetTestingOrderList", testingNO: testingNO, status: status,
                testingDate: testingDate, testingOrderUnitName: testingOrderUnitName,
                testingInstituteCode: testingInstituteCode, returnCount: returnCount,
                testingDate1: testingDate1, projectName: projectName, creator: creator,
                sampleName: sampleName, productiveUnit: productiveUnit, testingTypeName: testingTypeName, cha: cha
            }
        }
        //{ field: 'testingOrderTime', title: '委托日期' },
        function GetSalaryInfo() {
            var $table = $('#table').bootstrapTable({
                url: "../../AjaxRequest/TestingOrders/TestingOrders.ashx",
                queryParams: queryParamsInfo,
                sidePagination: "client",//客户端分页
                showColumns: true,
                singleSelect: false,
                editable: true,
                method: 'post',
                pageSize: 10,
                showColumns: false, //不显示下拉框（选择显示的列）
                contentType: "application/x-www-form-urlencoded",
                columns: [//taskRefuseReason
                    { field: 'state', title: '选择', width: "30px", checkbox: true },
                    { field: 'testingOrderNo', width: "115px", title: '委托编号', sortable: true },
                    { field: 'testingTypeName', width: "70px", title: '业务类别', sortable: true },
                    {
                        field: 'testingOrderUnitName', width: "190px", title: '委托单位', formatter: function (value, row, index) {
                            if (value.length > 13) {
                                return "<span title='" + value + "'>" + value.substr(0, 13) + "...</span>";
                            } else {
                                return value;
                            }
                        }
                    },
                    {
                        field: 'testingOrderTime', title: '委托日期', width: "90px", sortable: true, sorter: 'sortDate', formatter: function (value, row, index) {
                            var date = row.testingOrderTime;//.tableInfo;
                            if (date != "" && date != undefined) {
                                return timeStamp2String(date);
                            }
                        }
                    },
                    { field: 'testingOrderStatusName', width: "80px", title: '委托状态' },
                    {
                        field: 'sampleAmount', width: "70px", title: '样品个数', formatter: function (value, row, index) {
                            if (row.testingTypeCode == "工程" || row.testingTypeCode == "检验" || row.testingTypeCode == "评估咨询") {
                                return 0;
                            } else {
                                return value;
                            }
                        }
                    },
                    {
                        field: 'sampleName1', width: "155px", title: '样品一名称', formatter: function (value, row, index) {
                            if (value.length > 10) {
                                if (row.testingTypeCode == "工程" || row.testingTypeCode == "检验" || row.testingTypeCode == "评估咨询") {
                                    return "";
                                } else {
                                    return "<span title='" + value + "'>" + value.substr(0, 10) + "...</span>";
                                }
                            } else {
                                return value;
                            }
                        }
                    },
                    {
                        field: 'testingBasisCode1', width: "200px", title: '检测依据', formatter: function (value, row, index) {
                            var text = "";
                            if (value == null || value == "") {
                                text = row.testingBasisCode2;
                            } else {
                                text = value;
                            }
                            if (text.length > 17) {
                                return "<span title='" + text + "'>" + text.substr(0, 16) + "...</span>";
                            } else {
                                return text;
                            }
                        }
                    },
                    { field: 'creator', width: "70px", title: '登记人' },
                    //{
                    //    field: 'taskRemark', title: '备 注', formatter: function (value, row, index) {
                    //        var text = "";
                    //        if (row.UpdateCount > 0) {
                    //            text = '<span style="color:#FF0000">已变更</span>';
                    //        }
                    //        if (row.ReturnCount > 0) {
                    //            //var html = "操作人：" + row.editor;
                    //            //html += "&#10;操作时间：" + FormatTime(row.editTime);
                    //            //html += "&#10;" + row.taskRefuseReason;
                    //            //if (row.taskRemark != null && row.taskRemark != "")
                    //            //    html += "&#10;" + row.taskRemark;
                    //            //text = "<span style='color:#FF0000' title='" + html + "'>" + row.taskRemark + "</span>";
                    //            text = "<span style='color:#FF0000'>" + row.taskEditor + ":" + row.taskRemark.replace("退回原因附加说明:", "") + "(" + FormatTime(row.editTime) + ")</span>";
                    //        }
                    //        if (row.UpdateCount > 0 && row.ReturnCount > 0) {
                    //            text = "<span style='color:#FF0000'>已变更</span>/<span style='color:#FF0000'>退回委托</span>";
                    //        }
                    //        return text;
                    //    }
                    //}

                ]
            });
        }
        function timeStamp2String(time) {
            var datetime = new Date(time);
            if (datetime == "Invalid Date" && time.length > 0) {
                time = time.replace(/\//g, '-');
                var timess = time.split(' ');
                var times = timess[0].split('-');
                var year = times[0];
                var month = Number(times[1]) < 10 ? "0" + Number(times[1]) : Number(times[1]);
                var date = Number(times[2]) < 10 ? "0" + times[2] : times[2];
                return year + "-" + month + "-" + date;
            } else {
                var year = datetime.getFullYear();
                var month = datetime.getMonth() + 1 < 10 ? "0" + (datetime.getMonth() + 1) : datetime.getMonth() + 1;
                var date = datetime.getDate() < 10 ? "0" + datetime.getDate() : datetime.getDate();
                return year + "-" + month + "-" + date;
            }
        }
        function qk() {
            $("#testingNO").val("");
            $("#testingDate").val("");
            $("#testingDate1").val("");
            $("#testingUnit").val("");
            $("#projectName").val("");
            $("#testingInstitute").val("");
            $("#testingOrderUnitName").val("");
            $("#ddl_testingType").val("");
        }
        function search() {
            //getlist(2);
            cha = 1;
            $('#table').bootstrapTable("refresh");
        }
        var returnCount = 0;
        function selectReturn() {
            returnCount = 1;
            $('#table').bootstrapTable("refresh");
            returnCount = 0;
        }
        var seltestingOrderNo;
        var seltestingOrderId;
        // 提交委托信息
        function smt() {
            $("#Submit").attr("disabled", "disabled");
            var selects = $("#table").bootstrapTable('getSelections');
            if (selects == '') {
                layer.alert("请先选一行");
                $("#Submit").removeAttr("disabled");
            } else {//例行任务，无偏离A
                var testingOrderId = "";
                var testingTypeCode = "";
                var num = 0;//校准的统计
                var num1 = 0;  //协会的统计
                var isSubmit = true;
                for (var i = 0; i < selects.length; i++) {   //多个一起提交
                    testingOrderId += "" + selects[i].testingOrderId + ",";
                    testingTypeCode = selects[i].testingTypeCode;
                    if (testingTypeCode == "校准") {
                        num++;
                    } else if (testingTypeCode == "协会") {
                        num1++;
                    }
                    if (selects[i].testingOrderStatusCode == "1") {
                        isSubmit = false;
                    }
                }
                if (testingOrderId.length > 0) {
                    testingOrderId = testingOrderId.substring(0, testingOrderId.length - 1);
                }
                if (isSubmit && num == 0 && num1 == 0) {
                    var json_data = { method: "SamplesCountBytestingOrderNo", testingOrderId: testingOrderId };
                    ajax2(json_data, submitTestingOrdersBase, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
                } else if (isSubmit && num == selects.length) {
                    var json_data = { method: "SamplesCountBytestingOrderNo_jz", testingOrderId: testingOrderId };
                    ajax2(json_data, DeleteTestingOrdersBase, "../../AjaxRequest/TestingOrders/TestingOrders_jz.ashx", "json");
                } else if (isSubmit && num1 == selects.length) {
                    var json_data = { method: "SamplesCountBytestingOrderNo_xh", testingOrderId: testingOrderId };
                    ajax2(json_data, DeleteTestingOrdersBase, "../../AjaxRequest/TestingOrders/TestingOrders_xh.ashx", "json");
                } else if (!isSubmit) {
                    layer.alert("包含退回委托，不能直接提交！");
                    $("#Submit").removeAttr("disabled");
                } else if (num > 0) {
                    layer.alert("校准委托与其它类型委托不能一起提交！");
                    $("#Submit").removeAttr("disabled");
                } else if (num1 > 0) {
                    layer.alert("协会委托与其它类型委托不能一起提交！");
                    $("#Submit").removeAttr("disabled");
                }
            }
        }

        // 删除委托信息
        function del() {
            $("#Submit").attr("disabled", "disabled");
            var selects = $("#table").bootstrapTable('getSelections');
            if (selects.length != 1) {
                layer.alert("请先选一行数据进行操作", { icon: 5 });
            } else { 
                layer.confirm('是否确定删除数据？', {
                    btn: ['确定', '取消'], //按钮
                    icon: 3,
                    shade: false //不显示遮罩
                }, function (index) { 
                    var json_data = { method: "DelOrder", testingOrderId: selects[0].testingOrderId };
                    ajax(json_data, delData, "TestingOrders/TestingOrders.ashx", "json");
                });
            }
        }
        function delData(data) {
            layer.closeAll();
            if (data.state == "1") {
                layer.alert(data.msg, { icon: 6 }, function () {
                    $('#table').bootstrapTable("refresh");
                });
            } else {
                layer.alert(data.msg, { icon: 5 });
            }
        }

        function AddTestingOrder() {
            window.open("AddTestingOrder.html");
        }
        var url_num = 0; //用来控制新建时，每次弹出不同的界面
        function WriteReport(obj) {
            url_num++;
            var selects = $("#table").bootstrapTable('getSelections');
            if (selects == '') {
                var src = "../TestingOrder/AddTestingOrder.html?v=" + url_num;
                $(obj).attr("data-href", src);
                window.parent.xiu1(src, "新建");
            } else if (selects.length == 1) {
                var testingOrderNo = selects[0].testingOrderNo;
                var testingOrderId = selects[0].testingOrderId;
                var codes = testingOrderNo.split('-');
                text = testingOrderNo;
                var src = "";
                var testingTypeCode = selects[0].testingTypeCode;
                switch (testingTypeCode) {
                    case "抽样":   //如果为抽样，则复制所有信息
                        copyTestingOrderAllInfo2(testingOrderId, testingOrderNo);
                        break;
                    case "工程":
                        src = "../TestingOrder/TestingContractEngineering.html?v=" + url_num + "&testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo;
                        //src = "../TestingOrder/AddTestingOrder.html?v=" + url_num;
                        break;
                    case "收样":   //如果为收样，则复制所有信息
                        copyTestingOrderAllInfo(testingOrderId, testingOrderNo);
                        break;
                    case "检验":
                        src = "../TestingOrder/AddTestingOrder.html?v=" + url_num;
                        //src = "../TestingOrder/TestingContractEngineering.html?v=" + url_num + "&testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo;
                        break;
                    case "评估咨询":
                        if (codes[0] == "JKSD")
                            src = "../TestingOrder/TestingContractEngineering_pg.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        else
                            src = "../TestingOrder/TestingContractEngineering_pj.html?v=" + url_num + "&testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo;
                        break;
                    case "认证抽样":
                        src = "../TestingOrder/TestingContractSampling_rz.html?v=" + url_num + "&testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo;
                        break;
                }
                window.parent.xiu1(src, "新建");
            } else {
                layer.alert("最多只能选择一行")
            }
        }

        function copyTestingOrderAllInfo(testingOrderId, testingOrderNo) {
            layer.confirm('确定复制整个委托信息', { icon: 3 }, function (index) {
                var json_data = { method: "CopyTestingOrdersBase", testingOrderId: testingOrderId, testingOrderNo: testingOrderNo };
                ajax(json_data, function (data) {
                    layer.closeAll('loading');
                    if (data.state == "1") {
                        layer.alert(data.msg, { icon: 1 }, function () {
                            var testingOrderNo_new = data.testingOrderNo;
                            var testingOrderId_new = data.testingOrderId;
                            var src = "../TestingOrder/UpdateTestingContract.html?testingOrderNo=" + testingOrderNo_new + "&testingOrderId=" + testingOrderId_new;
                            layer.closeAll();
                            window.parent.xiu1(src, "编号：" + testingOrderNo_new);
                        });
                    } else {
                        layer.alert(data.msg, { icon: 5 });
                    }
                }, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
                layer.close(index);
                $('#table').bootstrapTable("refresh");
            });
        }

        function copyTestingOrderAllInfo2(testingOrderId, testingOrderNo) {
            layer.confirm('确定复制整个委托信息', { icon: 3 }, function (index) {
                var json_data = { method: "CopyTestingOrdersBase", testingOrderId: testingOrderId, testingOrderNo: testingOrderNo };
                ajax(json_data, function (data) {
                    layer.closeAll('loading');
                    if (data.state == "1") {
                        layer.alert(data.msg, { icon: 1 }, function () {
                            var testingOrderNo_new = data.testingOrderNo;
                            var testingOrderId_new = data.testingOrderId;
                            var src = "../TestingOrder/UpdateTestingContractSampling.html?testingOrderNo=" + testingOrderNo_new + "&testingOrderId=" + testingOrderId_new;
                            layer.closeAll();
                            window.parent.xiu1(src, "编号：" + testingOrderNo_new);
                        });
                    } else {
                        layer.alert(data.msg, { icon: 5 });
                    }
                }, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
                layer.close(index);
                $('#table').bootstrapTable("refresh");
            });
        }

        function Delete() {
            var index = layer.confirm('样品信息也将删除，是否删除委托单？', {
                btn: ['确定', '取消'] //按钮
            }, function () {
                var selects = $("#table").bootstrapTable('getSelections');
                if (selects == '' || selects.length > 1) {
                    layer.alert("请选择一行")
                } else {
                    var testingOrderNo = selects[0].testingOrderNo;
                    var json_data = { method: "DeleteTestingOrdersBase", testingOrderNo: testingOrderNo };
                    ajax(json_data, DeleteTestingOrdersBase, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
                }
            }, function () {
            });
        }
        function DeleteTestingOrdersBase(data) {
            layer.closeAll('loading');
            $("#Submit").removeAttr("disabled");
            //sumbitNum--;
            //if (sumbitNum == 0) {
            if (data.state == "1") {
                layer.alert(data.msg, { icon: 1 });
                $('#table').bootstrapTable("refresh");
            } else {
                layer.alert(data.msg, { icon: 5 });
            }
            // }
        }
        var retuntestingOrderId = "";
        var mainIndex;
        //提交
        function submitTestingOrdersBase(data) {
            layer.closeAll('loading');
            $("#Submit").removeAttr("disabled");
            if (data.state == "1") {
                layer.alert(data.msg, { icon: 1 });
                $('#table').bootstrapTable("refresh");
            } else if (typeof data.retuntestingOrderId != "undefined" && data.retuntestingOrderId != "" && data.retuntestingOrderId.indexOf(",") < 0) {
                retuntestingOrderId = data.retuntestingOrderId;

                mainIndex = layer.open({
                    type: 1,
                    title: "信息",
                    content: $("#delay_div"),
                    area: ['500px', '220px'],
                    success: function (index) {
                        //清空数据表格
                        $("#delayFrm")[0].reset();
                    },
                    end: function () {
                        $("#delay_div").hide();
                        //清空数据表格
                        $("#delayFrm")[0].reset();
                        layer.close(mainIndex);
                    }
                })
            } else {
                layer.alert(data.msg, { icon: 5 });
            }
        }
        // //后台执行修改方法,保存超期说明
        function doSubmitInfo() {
            var delayRemark = $("#delayRemark").val().trim();
            if (delayRemark == "") {
                layer.alert("请填写超期提交原因说明", { icon: 5 });
                return;
            }
            try {
                var json_data = {
                    method: "submitTestingorderBefore",
                    testingOrderId: retuntestingOrderId,
                    delayRemark: delayRemark,
                };
                ajax(json_data, saveDelayRemark, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }
            catch (e) {
                layer.msg(e.message, { time: 2000 });
            }
        }
        function saveDelayRemark(data) {
            layer.closeAll('loading');
            if (data.state == '1') {
                layer.close(mainIndex);
                layer.alert(data.msg, { icon: 1 });
                $('#table').bootstrapTable("refresh");
            }
            else {
                layer.msg(data.msg, { icon: 5 });
            }
        }

        function UpdateTestingContract() {
            var selects = $("#table").bootstrapTable('getSelections');
            if (selects == '' || selects.length > 1) {
                layer.alert("请选择一行");
            } else {
                var testingOrderNo = selects[0].testingOrderNo;
                var testingOrderId = selects[0].testingOrderId;
                text = testingOrderNo;
                var src = "";
                var testingTypeCode = selects[0].testingTypeCode;
                var codes = testingOrderNo.split('-');
                var fileName = "TestingOrder";
                var testingOrderStatusCode = selects[0].testingOrderStatusCode;
                if (testingOrderStatusCode == "1" || testingOrderStatusCode == "-1") {
                    fileName = "TestingOrder2";
                }
                switch (testingTypeCode) {
                    case "抽样":
                        src = "../" + fileName + "/UpdateTestingContractSampling.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                    case "工程":
                        src = "../" + fileName + "/UpdateTestingContractEngineering.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                    case "收样":
                        src = "../" + fileName + "/UpdateTestingContract.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                    case "校准":
                        src = "../" + fileName + "/UpdateTestingContract_jz.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                    case "检验":
                        src = "../" + fileName + "/UpdateTestingContractEngineering.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                    case "认证抽样":
                        src = "../" + fileName + "/UpdateTestingContractSampling_rz.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                    case "评估咨询":
                        if (codes[0] == "JKSD")
                            src = "../" + fileName + "/UpdateTestingContractEngineering_pg.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        else
                            src = "../" + fileName + "/UpdateTestingContractEngineering_pj.html?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId;
                        break;
                }
                window.parent.xiu1(src, "编号：" + testingOrderNo);
            }
        }

        function Print() {
            var selects = $("#table").bootstrapTable('getSelections');
            if (selects == '' || selects.length > 1) {
                layer.alert("请选择一行")
            } else {
                var testingOrderNo = selects[0].testingOrderNo;
                var testingOrderId = selects[0].testingOrderId;
                var testingTypeCode = selects[0].testingTypeCode;
                if (testingTypeCode == "收样") {
                    window.open("PrintTestingOrderReplace.aspx?testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo);
                } else if (testingTypeCode == "抽样") {
                    window.open("PrintTestingOrderReplace_cy.aspx?testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo);
                } else {   //暂不确定工程有无打印模版
                    window.open("PrintTestingOrderReplace.aspx?testingOrderId=" + testingOrderId + "&testingOrderNo=" + testingOrderNo);
                }
            }
        }
        function getTestingInstitute() {
            handle = GetTestingInstituteList;
            var json_data = { method: "GetSelectList", name: "testingInstitute" };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function GetTestingInstituteList(data) {
            layer.closeAll('loading');
            var testingInstitute = $("#testingInstitute");
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
            }
            //if (data.length > 0) {
            //    $("#testingInstitute option[value='0']").remove();
            //}
            testingInstitute.append(option_str);
        }

        function getTestingType() {
            handle = GetTestingTypeList;
            var json_data = { method: "GetSelectList", name: "testCatatory" };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function GetTestingTypeList(data) {
            layer.closeAll('loading');
            var testingTypeName = $("#ddl_testingType");
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemName + '\">' + data[i].itemName + '</option>';
            }
            testingTypeName.append(option_str);
        }

        //打印信息传输
        function printTransfer() {
            var selects = $("#table").bootstrapTable('getSelections');
            if (selects.length == 0) {
                layer.alert("请至少选择一行", { icon: 5 })
            } else {
                var testingOrderIds = "";
                for (var i = 0; i < selects.length; i++) {
                    if (i < selects.length - 1)
                        testingOrderIds += selects[i].testingOrderId + ",";
                    else
                        testingOrderIds += selects[i].testingOrderId
                }
                var index = layer.open({
                    title: '打印机选择',
                    type: 2,
                    area: ['600px', '300px'],
                    fix: true, //固定
                    maxmin: false,
                    content: 'wojiePrint.html?id=' + testingOrderIds
                });
            }
        }

        //按回车触发的事件
        $(window).keydown(function (event) {
            if (event.keyCode == 13) {
                $('#table').bootstrapTable("refresh");
            }
        });
        function sortDate(a, b) {
            var a = a ? a : -1, b = b ? b : -1;
            return Date.parse(a) - Date.parse(b);
        }
        //自动行高
        (function ($) {
            $.fn.autoTextarea = function (options) {
                var defaults = {
                    maxHeight: null,
                    minHeight: $(this).height()
                };
                var opts = $.extend({}, defaults, options);
                return $(this).each(function () {
                    $(this).bind("paste cut keydown keyup focus blur", function () {
                        var height, style = this.style;
                        this.style.height = opts.minHeight + 'px';
                        if (this.scrollHeight > opts.minHeight) {
                            if (opts.maxHeight && this.scrollHeight > opts.maxHeight) {
                                height = opts.maxHeight;
                                style.overflowY = 'scroll';
                            } else {
                                height = this.scrollHeight;
                                style.overflowY = 'hidden';
                            }
                            style.height = height + 'px';
                        }
                    });
                });
            };
        })(jQuery);
        $("textarea").autoTextarea({
            maxHeight: 162,
            minHeight: 60
        });
    </script>

<script type="text/javascript">
        var testingOrderNo;
        var valuer;
        var testingOrderMaxNo;
        var productTypeItemCode;
        var productTypeItemId;
        var testingInstituteCode;
        var residualSampleProcessName;
        var testingInstitutecode;//检测机构初始
        var testCatatorycode;//业务类别
        function GetQueryString(name) {
            var reg = new RegExp("(^|&)" + name + "=([^&]*)(&|$)");
            var r = window.location.search.substr(1).match(reg);
            if (r != null) return decodeURI(r[2]);
            return null;
        }
        function contractClick(obj) {
            if ($(obj).hasClass("layui-form-checked")) {
                $(obj).removeClass("layui-form-checked");
            } else {
                $(obj).addClass("layui-form-checked");
                $("#testingOrderContractNo").val("");
            }
        }
        $("input[type='radio'][name='a']").click(function () {
            var unitEng = $("#testingOrderUnitNameEng").val();
            var unitCn = $("#testingOrderUnitName").val();
            var text = unitCn.replace(unitEng, '').replace('<br/>', '');
            var value = $(this).val();
            if (value == "中文") {
                $("#testingOrderUnitName").val(text);
            } else {
                $("#testingOrderUnitName").val(text + "<br/>" + unitEng);
            }
        })
        var list;
        function setlist(data) {
            list = data;
        }
        function GetSelectList(name) {
            switch (name) {
                case "residualSampleProcess":
                    handle = residualSampleProcess;
                    break;
                case "payment":
                    handle = payment;
                    break;
                case "testingReportAddress":
                    handle = testingReportAddress;
                    break;
                case "taskType":
                    handle = taskType;
                    break;
                case "testingInstitute":
                    handle = GetTestingInstituteList;
                    break;
                case "testCatatory":
                    handle = GetTestCatatoryList;
                    break;
                default:
                    break;
            }
            var json_data = { method: "GetSelectList", name: name };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        // 检测机构初始   并查询业务类别
        function GetTestingInstituteList(data) {
            layer.closeAll('loading');
            var testingInstitute = $("#testingInstitute");
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
            }
            if (data.length > 0) {
                $("#testingInstitute option[value='0']").remove();
            }
            testingInstitute.append(option_str);
            if (testingInstitutecode != null && testingInstitutecode != undefined && testingInstitutecode != '' && testingInstitutecode != 0) {
                $("#testingInstitute").val(testingInstitutecode);
            }
            GetSelectList('testCatatory');
        }
        //初始业务类别
        function GetTestCatatoryList(data) {
            layer.closeAll('loading');
            var testCatatory = $("#testCatatory");
            $("#testCatatory").empty();
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemName + '\">' + data[i].itemName + '</option>';
            }
            if (data.length > 0) {
                $("#testCatatory option[value='0']").remove();
            }
            testCatatory.append(option_str);
            if (testCatatorycode != null && testCatatorycode != undefined && testCatatorycode != '' && testCatatorycode != 0) {
                $("#testCatatory").val(testCatatorycode);
            }
            getprot($("#testingInstitute").val(), $("#testCatatory").val());
            GetTestingTypeSelect($("#testCatatory").val());
        }
        //检验机构   改变事件（显示业务类别）
        function GettestCatatorySelectList() {
            handle = GetTestCatatoryList;
            var json_data = { method: "GetTestCatatoryList", testingInstitute: $("#testingInstitute").val().trim() };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        //业务类别   改变事件（产品大类 检验类别）
        function GetProductTestingType() {
            getprot($("#testingInstitute").val(), $("#testCatatory").val());
            GetTestingTypeSelect($("#testCatatory").val());
            testCatatoryItemName = $("#testCatatory").find("option:selected").text();
            testCatatoryItemCode = $("#testCatatory").val();
            $("#testCatatoryItemName").val(testCatatoryItemName);
            $("#testCatatoryItemCode").val(testCatatoryItemCode);
        }
        //产品大类
        function getprot(testingInstituteCode, testCatatoryCode) {
            handle = GetProductTypeList;
            var json_data = {//testingInstituteCode = "8", testingInstituteItemCode = "工程
                method: "GetProductTypeSelectList", testingInstituteCode: testingInstituteCode,
                testCatatoryCode: testCatatoryCode
            };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function GetProductTypeList(data) {
            layer.closeAll('loading');
            $("#productTypeItem").empty();
            if (data != "" && data != null) {
                var productType = $("#productTypeItem");
                var option_str = "";
                for (var i = 0; i < data.length; i++) {
                    option_str += '<option value=\"' + data[i].productTypeId + '\" data-value=\"' + data[i].productTypeCode + '\">' + data[i].productTypeName + '</option>';
                }
                //if (data.length > 0) {
                //    $("#productTypeItemName option[value='0']").remove();
                //}
                productType.append(option_str);
                if (productTypeItemId != null && productTypeItemId != undefined && productTypeItemId != '' && productTypeItemId != 0) {
                    $("#productTypeItem").val(productTypeItemId);
                }
            }
        }
        function residualSampleProcess(data) {
            layer.closeAll('loading');
            var residualSampleProcess = $("#residualSampleProcessSelect");
            $("#residualSampleProcessSelect").empty();
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
            }
            //if (data.length > 0) {

            //    $("#residualSampleProcessSelect option[value='0']").remove();
            //}

            residualSampleProcess.append(option_str);
            if (residualSampleProcessName != '' && residualSampleProcessName != undefined && residualSampleProcessName != null) {
                $("#residualSampleProcessSelect").val(residualSampleProcessName);
            }
        }
        // 检验费用   预计天数
        function getfeeday() {
            handle = setfeeday;
            var testingOrderId = GetQueryString("testingOrderId");
            var json_data = {//testingInstituteCode = "8", testingInstituteItemCode = "工程
                method: "GetDeptFee", testingOrderId: testingOrderId
            };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function setfeeday(data) {
            layer.closeAll('loading');
            if (data != "" && data != null) {
                var sumfee = 0;
                var sumday = 0;
                for (var i = 0; i < data.length; i++) {
                    sumday = data[i].expectedDay;
                    sumfee += Number(data[i].testingFee) + Number(data[i].otherFee);
                }
                $("#workDay").val(sumday);
                $("#totalFee").val(sumfee);
            }
        }
        function setunitcode() {
            $("#witnessUnitCode").val($("#witnessUnitName").val());
        }
        function setsunit() {
            $("#samplingUnitCode").val($("#samplingUnitName").val());
        }
        function setnull(num) {
            switch (num) {
                case 1:
                    $("#unitId").val("");
                    $("#testingOrderUnitName").val("");
                    $("#clientAddress").val("");
                    $("#clientTel").val("");
                    $("#clientPostNo").val("");
                    break;
                case 2:
                    $("#witnessUnitCode").val("");
                    $("#witnessUnitName").val("");
                    $("#witness").val("");
                    $("#witnessCertificate").val("");
                    $("#witnessContactInfo").val("");
                    break;
                case 3:
                    $("#samplingUnitCode").val("");
                    $("#samplingUnitName").val("");
                    $("#samplingPerson").val("");
                    $("#samplingCertification").val("");
                    $("#samplingContactInfo").val("");
                    break;
            }
        }
        function Load(num) {
            setTimeout(function () { $("#addSampleInfo").removeAttr("disabled"); }, "2000");
            if (num == 1) {

            } else {
                GetSelectList('payment');
                GetSelectList('taskType');
            }
            var testingOrderId = GetQueryString("testingOrderId");
            var json_data = { method: "GetPrincipalPartNameList" };
            ajax(json_data, GetPrincipalPartNameList, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            var json_data = { method: "GetPC_Department_T" };
            ajax(json_data, treedept, "../../AjaxRequest/OA/PC_Department.ashx", "json");
            var json_data = { method: "GetTestingOrdersBaseType", testingOrderId: testingOrderId };
            ajax(json_data, GetTestingOrdersBaseType, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            var json_data = { method: "GetTestingOrdersWitnessType", testingOrderId: testingOrderId };
            ajax(json_data, GetTestingOrdersWitnessType, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            var json_data = { method: "GetTestingOrdersSamplingType", testingOrderId: testingOrderId };
            ajax(json_data, GetTestingOrdersSamplingType, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            var json_data = { method: "GetTestingOrdersAuxiliaryType", testingOrderId: testingOrderId };
            ajax(json_data, GetTestingOrdersAuxiliaryType, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            var json_data = { method: "GetSamplesTestingBasisType", testingOrderId: testingOrderId };
            ajax(json_data, GetSamplesTestingBasisType, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            var json_data = { method: "GetSamplesTestingItemType", testingOrderId: testingOrderId };
            ajax(json_data, GetSamplesTestingItemType, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");

        }
        var testingSampleAddressCode;
        function gettestingSampleAddress() {
            var json_data = { method: "GetSelectList", name: 'testingSampleAddress' };
            ajax(json_data, testingSampleAddress, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function testingSampleAddress(data) {
            layer.closeAll('loading');
            $("#testingSampleAddress").empty();
            var testingSampleAddress = $("#testingSampleAddress");
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
            }
            if (data.length > 0) {
                $("#testingSampleAddress option[value='0']").remove();
            }
            testingSampleAddress.append(option_str);
            if (testingSampleAddressCode != '' && testingSampleAddressCode != null && testingSampleAddressCode != undefined) {
                $("#testingSampleAddress").val(testingSampleAddressCode);
            }
        }
        var testingReportAddressCode;
        function gettestingReportAddressName() {
            var json_data = { method: "GetSelectList", name: 'testingReportAddress' };
            ajax(json_data, testingReportAddress, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function testingReportAddress(data) {
            layer.closeAll('loading');
            $("#testingReportAddress").empty();
            var testingReportAddress = $("#testingReportAddress");
            var option_str = "";
            for (var i = 0; i < data.length; i++) {
                option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
            }
            if (data.length > 0) {
                $("#testingReportAddress option[value='0']").remove();
            }
            testingReportAddress.append(option_str);
            if (testingReportAddressCode != '' && testingReportAddressCode != null && testingReportAddressCode != undefined) {
                $("#testingReportAddress").val(testingReportAddressCode);
            }
        }
        Date.prototype.Format = function (fmt) { //author: meizz
            var o = {
                "M+": this.getMonth() + 1, //月份
                "d+": this.getDate(), //日
                "h+": this.getHours(), //小时
                "m+": this.getMinutes(), //分
                "s+": this.getSeconds(), //秒
                "q+": Math.floor((this.getMonth() + 3) / 3), //季度
                "S": this.getMilliseconds() //毫秒
            };
            if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o)
                if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return fmt;
        }
        function GetTestingOrdersBaseType(data) {
            layer.closeAll('loading');
            if (data.msg == null) {
                $("#testingInstitute").val(data[0].testingInstituteCode);
                $("#testCatatoryItemName").val(data[0].testingTypeName);
                $("#testCatatoryItemCode").val(data[0].testingTypeCode);
                testingInstitutecode = data[0].testingInstituteCode;
                testCatatorycode = data[0].testingTypeCode;
                GetSelectList('testingInstitute');

                productTypeItemCode = data[0].productTypeCode;
                productTypeItemId = data[0].productTypeId;
                testingInstituteCode = data[0].testingInstituteCode;
                $("#testingOrderId").val(data[0].testingOrderId);
                $("#testingTypeDesc").val(data[0].testingTypeDesc);
                //$("#testingOrderContractNo").val(data[0].testingOrderContractNo);
                if ((data[0].contractTypeName == "检验检测-虚拟合同" && data[0].contractId == "1") || data[0].testingOrderContractNo == "") {
                    $("div.layui-form-checkbox").addClass("layui-form-checked");
                } else {
                    $("#testingOrderContractNo").val(data[0].testingOrderContractNo);
                }
                $("#unitId").val(data[0].unitId);
                $("#testingOrderUnitName").val(data[0].testingOrderUnitName);
                if (data[0].testingOrderUnitName.indexOf("<br/>") > 0) {     //判断  单位是否有英文，有的话，通过截取 获得英文
                    $("#testingOrderUnitNameEng").val(data[0].testingOrderUnitName.substring(data[0].testingOrderUnitName.indexOf("<br/>") + 5));
                }
                $("#clientAddress").val(data[0].clientAddress);
                $("#clientPostNo").val(data[0].clientPostNo);
                $("#clientTel").val(data[0].clientTel);
                $("#projectName").val(data[0].projectName);
                $("#projectSection").val(data[0].projectSection);
                $("#projectAddress").val(data[0].projectAddress);

                $("#testingOrderTime").val(timeStamp2String(data[0].testingOrderTime));
                $("#payment").val(data[0].testingFeeUnit);
                testingSampleAddressCode = data[0].testingSampleAddress;
                gettestingSampleAddress();
                testingReportAddressCode = data[0].testingReportAddressCode;
                gettestingReportAddressName();
                //$("#testingReportAddress").val(data[0].testingReportAddressName);
                $("#testingReportAddressRemark").val(data[0].testingReportAddressRemark);
                //$("#testingSampleAddress").(data[0].testingSampleAddress);
                if (data[0].orderNo == "1") {
                    document.getElementById("orderNo1").checked = 'checked';
                } else if (data[0].orderNo == "2") {
                    document.getElementById("orderNo2").checked = 'checked';
                }
                $("#testingSampleAddress").find("option[text='" + data[0].testingSampleAddress + "']").attr("selected", true);
                //检测费用  预计天数
                if ((data[0].totalFee == "" || data[0].totalFee == null) && (data[0].expectedDay == "" || data[0].expectedDay == null)) {
                    getfeeday();
                } else {
                    $("#totalFee").val(data[0].totalFee);
                    $("#workDay").val(data[0].expectedDay);
                }
                gettasktype();
                taskTypecode = data[0].taskTypeName;
                $("#principalPartCode").val(data[0].principalPartCode);
                $("#principalPartName").val(data[0].principalPartName);
                $("#subItems").val(data[0].subItems);
                $("#judgmentBasis").val(data[0].judgmentBasis);
                $("input[type='radio'][name='judgmentType']").each(function () {
                    if (data[0].judgmentType == $(this).val()) {
                        $(this).prop("checked", true).change();
                        $("#judgmentBasis").blur();
                    }
                })
                residualSampleProcessName = data[0].residualSampleProcessName;
                GetSelectList('residualSampleProcess');
                //$("#testCatatoryItemCode").val(data[0].testingTypeCode);
                //$("#testCatatoryItemName").val(data[0].testingTypeName);
                productTypeCode = data[0].productTypeCode;
                testingTypecode = data[0].testingType;
                GetTestingTypeSelect(data[0].testingTypeCode);
                getprot(data[0].testingInstituteCode, data[0].testingTypeCode);
                $("#remark").val(data[0].remark.replace(/@@/g, '\n'));
                testingTypeIds = data[0].testingTypeId;
                if (productTypeCode == "SC") {
                    $("#samplingDate").val(data[0].samplingDate);  
                    var json_data = { method: "GetscTestOrdersBase", testingOrderId: GetQueryString("testingOrderId")};
                    ajax2(json_data, GetscTestOrdersBase, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
                }
            } else {
                layer.alert(data.msg, { icon: 5 });
            }
        }
        function GetscTestOrdersBase(data) {
            layer.closeAll('loading');
            if (data.msg == null) { 
                $("#testId").val(data[0].testId);
                $("#unitName").val(data[0].unitName);
                $("#productSeries").val(data[0].productSeries);
                $("#contractCode").val(data[0].contractCode);
                $("#testCategory").val(data[0].testCategory);
                $("#applyEnterprise").val(data[0].applyEnterprise);
                $("#factoryName").val(data[0].factoryName);
                $("#manufacturer").val(data[0].manufacturer); 
                $("#samplingUser").val(data[0].samplingUser);
                $("#samplingMethod").val(data[0].samplingMethod);
                $("#samplingBase").val(data[0].samplingBase);
                $("#sealingMethod").val(data[0].sealingMethod);
                $("#samplingPlace").val(data[0].samplingPlace);
                $("#samplingNum1").val(data[0].samplingNum1);
                $("#samplingNum2").val(data[0].samplingNum2);
                $("#samplingNum3").val(data[0].samplingNum3);
                $("#sealingLocation").val(data[0].sealingLocation);   
            } 
        }
        var testingTypeIds = "0";
        function GetTestingTypeSelect(ItemCode) {
            handle = testingType;
            var json_data = { method: "GetTestingType", itemCode: ItemCode };
            ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
        }
        function testingType(data) {
            layer.closeAll('loading');
            $("#testingType").html("<option value=\"0\" data-code=\"0\">请选择</option>");
            if (data != "" && data != null) {
                var testingType = $("#testingType");
                var option_str = "";
                for (var i = 0; i < data.length; i++) {
                    option_str += '<option value=\"' + data[i].itemId + '\" data-code=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
                }
                //if (data.length > 0) {
                //    $("#testingType option[value='0']").remove();
                //}
                testingType.append(option_str);
            } else {
                layer.alert('没有检验类别');
            }
            if (Number(testingTypeIds) > 0) {
                $("#testingType").val(testingTypeIds);
                testingTypeChange();
            }
        }
        $(function () {
            testingOrderNo = GetQueryString("testingOrderNo");
            //gettasktype();
            $('#testingOrderNo').val(testingOrderNo);
            var testingOrderId = GetQueryString("testingOrderId");
            GetSampleBasisItem(testingOrderId);

            Load();
            //GetTestingTypeSelect();
            //getprot();
            //var v = $('#form1').easyform();
            //v.is_submit = false;
            //v.complete = function (ef) {
            //    alert("完成");
            //};
            $('#form1').submit(function () {
                try {
                    saveValue();
                }
                catch (e) {
                    alert(e.message);
                }
                return false;
            })
            $('.form_date').datetimepicker({
                language: 'fr',
                weekStart: 1,
                todayBtn: 1,
                autoclose: 1,
                todayHighlight: 1,
                startView: 2,
                minView: 2,
                forceParse: 0
            });

        })

        function saveValue() {
            var testingOrderId = $("#testingOrderId").val();
            var samplingId = $("#samplingId").val();
            var witnessId = $("#witnessId").val();
            var auxiliaryId = $("#auxiliaryId").val();
            var productTypeName = $("#productTypeItem").find("option:selected").text();
            var productTypeCode = $("#productTypeItem option:selected").attr("data-value");
            var productTypeId = $("#productTypeItem").val();
            var testingTypeName = $("#testCatatoryItemName").val();
            var testingTypeCode = $("#testCatatoryItemCode").val();
            var testingOrderNo = $("#testingOrderNo").val();
            var testingTypeDesc = $("#testingType").find("option:selected").text();//$("#testingTypeDesc").val();
            var testingType = $("#testingType").find("option:selected").attr("data-code");
            var testingTypeId = $("#testingType").val();
            var testingOrderContractNo = $("#testingOrderContractNo").val();
            //if (!$("div.layui-form-checkbox").hasClass("layui-form-checked") && testingOrderContractNo == "") {    //强制挂虚拟合同了，这个不需要了  2020-01-05
            //    layer.alert("如果不关联合同，请勾选无合同。");
            //    return;
            //}
            var testingOrderUnitName = $("#testingOrderUnitName").val(); 
            var unitId = $("#unitId").val();
            var clientAddress = $("#clientAddress").val();
            var clientPostNo = $("#clientPostNo").val();
            var clientTel = $("#clientTel").val();
            var projectName = $("#projectName").val();
            var projectSection = $("#projectSection").val();
            var projectAddress = $("#projectAddress").val();
            var testingOrderTime = $("#testingOrderTime").val();
            var samplingUnitName = $("#samplingUnitName").val();
            var samplingUnitCode = $("#samplingUnitCode").val();
            var samplingPerson = $("#samplingPerson").val();
            var samplingCertification = $("#samplingCertification").val();
            var samplingContactInfo = $("#samplingContactInfo").val();
            var witnessUnitName = $("#witnessUnitName").val();
            var witnessUnitCode = $("#witnessUnitCode").val();
            var witness = $("#witness").val();
            var witnessCertificate = $("#witnessCertificate").val();
            var witnessContactInfo = $("#witnessContactInfo").val();
            var residualSampleProcessName = $("#residualSampleProcessSelect").val();
            var totalFee = $("#totalFee").val();
            var testingFeeUnit = $("#payment").find("option:selected").text();
            var testingSampleAddress = $("#testingSampleAddress").val();
            var testingReportAddressRemark = $("#testingReportAddressRemark").val();
            var testingReportAddressCode = $("#testingReportAddress").val();
            var testingReportAddressName = $("#testingReportAddress").find("option:selected").text();
            //var workDay = $("#workDay").val();
            var taskTypeName = $("#taskType").val();
            var remark = $("#remark").val();
            var testingInstituteName = $("#testingInstitute").find("option:selected").text();
            var testingInstituteCode = $("#testingInstitute").val();
            var subItems = $("#subItems").val();
            var judgmentType = $("input[type='radio'][name='judgmentType']:checked").val();
            var judgmentBasis = $("#judgmentBasis").val();
            var orderNo = 0;
            //if ($("#orderNo2").)
            if (document.getElementById("orderNo2").checked == true) {
                orderNo = 2;
            }
            if (document.getElementById("orderNo1").checked == true) {
                orderNo = 1;
            }
            if (testingInstituteCode == "" || testingInstituteCode == null) {
                layer.alert("检测机构为空，不能保存！", { icon: 2 });
                return;
            }
            if (productTypeCode == "0" || productTypeCode == "" || productTypeCode == null) {
                layer.alert("未选择产品大类！", { icon: 2 });
                return;
            }
            if (testingOrderUnitName == "") {
                layer.alert("未选择委托单位！", { icon: 2 });
                return;
            }
            if (testingTypeId == "0" || testingTypeId == "" || testingTypeId == null) {
                layer.alert("未选择检验类别！", { icon: 2 });
                return;
            }
            if (testingTypeId != 0 && testingTypeId != null && testingTypeId != "") {
                testingOrderMaxNo = productTypeCode + testingType + "-" + testingOrderTime.substr(2, 2);
                //alert(testingOrderMaxNo);
            } else {
                layer.alert('没有检验类别', { icon: 2 });
            }
            //if (workDay != "" && workDay != undefined && workDay != null) {
            //    var reg = new RegExp("^[0-9]*$");
            //    if (!reg.test(workDay)) {
            //        layer.msg("预计完成天数格式不正确!");
            //        return;
            //    }
            //    if (!/^[0-9]*$/.test(workDay)) {
            //        layer.msg("预计完成天数格式不正确!");
            //        return;
            //    }
            //}
            var reg = /^[\d\-]+$/;
            //reg = /(^(\d{3,4}-)?\d{7,8})$|(13[0-9]{9})/;
            //reg=/((\d{11})|^((\d{7,8})|(\d{4}|\d{3})-(\d{7,8})|(\d{4}|\d{3})-(\d{7,8})-(\d{4}|\d{3}|\d{2}|\d{1})|(\d{7,8})-(\d{4}|\d{3}|\d{2}|\d{1}))$)/
            //if (clientTel != "" && !reg.test(clientTel)) {
            //    layer.msg("委托单位联系电话输入格式错误！");
            //    return;
            //}
            if (witnessContactInfo != "" && !reg.test(witnessContactInfo)) {
                layer.msg("见证单位联系电话输入格式错误！");
                return;
            }
            if (samplingContactInfo != "" && !reg.test(samplingContactInfo)) {
                layer.msg("取样单位联系电话输入格式错误！");
                return;
            }
            if (judgmentType == "需要" && judgmentBasis == "") {
                layer.msg("请填写判定规则！");
                return;
            }
            //if (totalFee != "" && totalFee != undefined && totalFee != null) {
            //    var reg = new RegExp("^[0-9]*$");
            //    if (!reg.test(totalFee)) {
            //        layer.msg("检验费用格式不正确!");
            //        return;
            //    }
            //}
            var testId = $("#testId").val();;
            var unitName = $("#unitName").val();
            var productSeries = $("#productSeries").val();
            var contractCode = $("#contractCode").val();
            var testCategory = $("#testCategory").val();
            var applyEnterprise = $("#applyEnterprise").val();
            var factoryName = $("#factoryName").val();
            var manufacturer = $("#manufacturer").val();
            var samplingUser = $("#samplingUser").val();
            var samplingMethod = $("#samplingMethod").val();
            var samplingBase = $("#samplingBase").val();
            var sealingMethod = $("#sealingMethod").val();
            var samplingPlace = $("#samplingPlace").val();
            var samplingNum1 = $("#samplingNum1").val();
            var samplingNum2 = $("#samplingNum2").val();
            var samplingNum3 = $("#samplingNum3").val();
            var sealingLocation = $("#sealingLocation").val();
            var samplingDate = $("#samplingDate").val();

            var json_data = {
                method: "UpdateTestingContract", testingOrderMaxNo: testingOrderMaxNo, testingOrderId: testingOrderId, witnessId: witnessId,
                samplingId: samplingId, auxiliaryId: auxiliaryId, productTypeName: productTypeName, testingTypeId: testingTypeId,
                productTypeCode: productTypeCode, productTypeId: productTypeId, testingTypeName: testingTypeName,
                testingTypeCode: testingTypeCode, testingOrderNo: testingOrderNo,
                testingTypeDesc: testingTypeDesc, testingType: testingType, testingOrderContractNo: testingOrderContractNo,
                testingOrderUnitName: testingOrderUnitName, unitId: unitId,
                clientAddress: clientAddress, clientPostNo: clientPostNo, clientTel: clientTel, projectName: projectName,
                projectSection: projectSection, projectAddress: projectAddress, testingOrderTime: testingOrderTime,
                samplingUnitName: samplingUnitName, samplingUnitCode: samplingUnitCode, samplingPerson: samplingPerson,
                samplingCertification: samplingCertification, samplingContactInfo: samplingContactInfo,
                witnessUnitName: witnessUnitName, witnessUnitCode: witnessUnitCode, witness: witness,
                witnessCertificate: witnessCertificate, witnessContactInfo: witnessContactInfo,
                residualSampleProcessName: residualSampleProcessName,
                totalFee: totalFee, testingFeeUnit: testingFeeUnit, subItems: subItems, judgmentType: judgmentType, judgmentBasis: judgmentBasis,
                testingSampleAddress: testingSampleAddress, testingReportAddressRemark: testingReportAddressRemark,
                testingReportAddressCode: testingReportAddressCode, testingReportAddressName: testingReportAddressName,
                taskTypeName: taskTypeName,
                remarks: remark, testingInstituteName: testingInstituteName,
                testingInstituteCode: testingInstituteCode, valuer: valuer, orderNo: orderNo, index: GetQueryString("index"),
                testId: testId,
                unitName: unitName,
                productSeries: productSeries,
                contractCode: contractCode,
                testCategory: testCategory,
                applyEnterprise: applyEnterprise,
                factoryName: factoryName,
                manufacturer: manufacturer,
                samplingUser: samplingUser,
                samplingMethod: samplingMethod,
                samplingBase: samplingBase,
                sealingMethod: sealingMethod,
                samplingPlace: samplingPlace,
                samplingNum1: samplingNum1,
                samplingNum2: samplingNum2,
                samplingNum3: samplingNum3,
                sealingLocation: sealingLocation,
                samplingDate: samplingDate,
            };
            ajax(json_data, updateContract, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");

            //layer.alert("save");
        }

        function updateContract(data) {
            layer.closeAll('loading');
            if (data.isOperation == "已提交") {
                layer.alert("该订单已提交，不能进行编辑", { icon: 5 });
            } else if (data.state == "0") {
                layer.alert(data.msg, { icon: 5 });
            }
            else if (data.state == "1") {
                layer.alert(data.msg, { icon: 1 });
                testingOrderNo = data.testingOrderNo;
                $("#testingOrderNo").val(testingOrderNo);
                Load(1);
                var val = $(window.parent.$(".J_menuTab.active")[0]).attr("data-id");
                var url = "";
                var num = val.indexOf("UpdateTestingContract.html?");
                if (num < 0) {
                    val = "../TestingOrder/UpdateTestingContract.html?";
                    num = val.indexOf("?") + 1;
                } else {
                    num = val.indexOf("testingOrderNo");
                }
                var testingOrderId = GetQueryString("testingOrderId");
                url = val.substring(0, num) + "testingOrderNo=" + data.testingOrderNo + "&testingOrderId=" + testingOrderId;
                $(window.parent.$(".J_menuTab.active")[0]).attr("data-id", url);
                //window.location.href = window.location.origin + window.location.pathname + "?testingOrderNo=" + data.testingOrderNo;
                $(window.parent.$(".J_menuTab.active")[0]).html('编号：' + data.testingOrderNo + '<i class="fa fa-times-circle"></i>')
                var iurl = val.substring(0, num) + "testingOrderNo=" + data.testingOrderNo + "&testingOrderId=" + testingOrderId;
                $(window.frameElement).attr('data-id', iurl);
                $(window.frameElement).attr('src', iurl);

            } else {
                layer.alert(data.msg, { icon: 5 });
            }
        }
        $("#cancel").on("click", function () {
            window.location.href = "TestingOrderBase.html";
        })

        $("#print").on("click", function () {
            $('#savebtn').attr("disabled", true);
            $("#savebtn").addClass("div0");

        })

        $("#addSampleInfo").on("click", function () {
            var testingOrderNo = $("#testingOrderNo").val();
            var testingOrderId = $("#testingOrderId").val();
            var productCode = $("#productTypeItem option:selected").attr("data-value");
            var itemId = $("#productTypeItem").val();
            var testCatatory = $("#testCatatory").val();
            var url_page = "SampleInfo.html";
            if (productCode == "PD" && testCatatory == "收样") {
                url_page = "SampleInfo_pd.html";
            }

            json_data = { method: "GetProductTypeReserve02", itemId: itemId, testingOrderId: testingOrderId };
            try {
                ajax(json_data, function (data) {
                    layer.closeAll();
                    //成功的时候
                    if (data.isOperation == "已提交") {
                        layer.alert("该订单已提交，不能进行编辑", { icon: 5 });
                        return;
                    }
                    layer.closeAll("loading");
                    var reserve02 = "";
                    if (data.state == "1") {
                        reserve02 = data.reserve02;
                    }
                    switch (reserve02) {
                        //case "涂料":
                        //    url_page = "SampleInfo_tl.html";
                        //    break;
                        case "跑道":
                            url_page = "SampleInfo_pd.html";
                            break;
                        case "试块":
                            url_page = "SampleInfo_sk.html";
                            break;
                        default:
                            reserve02 = "通用";
                            url_page = "SampleInfo.html";
                            break;
                    }
                    var index = layer.open({
                        title: '样品信息-' + reserve02,
                        type: 2,
                        area: ['100%', '100%'],
                        fix: true, //不固定
                        maxmin: false,
                        content: url_page + '?index=' + GetQueryString("index") + '&testingOrderId=' + testingOrderId + '&testingOrderNo=' + testingOrderNo + "&testingSampleAddress=" + $("#testingSampleAddress").val() + "&productType=" + $("#productTypeItem option:selected").attr("data-value"),
                        end: function () {
                            location.reload();
                        }
                    });
                }, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }
            catch (e) {
                layer.msg(e.message, { time: 2000 });
            }
        })
        function selperson() {
            var results = $('#tree').treeview('getSelected');
            if ($.trim(results) == "") {
                layer.msg("请选择可见群组", { time: 2000 });
                return;
            } else {
                var text = "";
                valuer = "";
                for (var i = 0; i < results.length; i++) {
                    text += results[i].text + ";";
                    valuer += results[i].href + ";";
                }
                if (text.length > 0)
                    text = text.substr(0, text.length - 1);
                $('#auxiliary').val(text);
            }
            $("#demo").removeClass("in");
        }
        function setTestingReportAddressRemark() {
            $("#testingReportAddressRemark").val($("#testingReportAddress").find("option:selected").text());
        }

        $("#btnwitness").on("click", function () {
            var index = layer.open({
                title: '选择见证单位',
                type: 2,
                area: ['80%', '80%'],
                fix: true,
                maxmin: false,
                content: '../Unit/SelUnit.aspx?unitType=wittness',
                end: function () {
                }
            });
            //layer.full(index);
        })
        $("#btnsampling").on("click", function () {

            var index = layer.open({
                title: '选择取样单位',
                type: 2,
                area: ['80%', '80%'],
                fix: true, //固定
                maxmin: false,
                content: '../Unit/Selunit_t.aspx?unitType=sample',
                end: function () {
                }
            });
            //layer.full(index);
        })
        function addTestingOrderContractNo() {
            var index = layer.open({
                title: '委托合同编号',
                type: 2,
                area: ['90%', '80%'],
                fix: true, //固定
                maxmin: false,
                content: '../contract/contract.aspx?hetong=1',
                end: function () {

                }
            });
        }
        $("#btntestingOrder").on("click", function () {

            index = layer.open({
                title: '选择委托单位',
                type: 2,
                area: ['80%', '80%'],
                fix: true,
                maxmin: false,
                content: '../Unit/unitOrderSelect.html',
                end: function () {
                }
            });
            //layer.full(index);

        })
        function TestingOrdersBaseMaterical() {
            var testingOrderId = GetQueryString("testingOrderId");
            var index = layer.open({
                title: '基材信息',
                type: 2,
                area: ['80%', '80%'],
                fix: true,
                maxmin: false,
                content: 'TestingOrdersBaseMaterical.html?testingOrderNo=' + testingOrderNo + '&testingOrderId=' + testingOrderId,
                end: function () {
                }
            });
        }
        function Print() {
            var itemId = $("#productTypeItem").val();
            var testingOrderId = GetQueryString("testingOrderId");
            json_data = { method: "GetProductTypeReserve02", itemId: itemId };
            try {
                ajax(json_data, function (data) {
                    layer.closeAll("loading");
                    var reserve02 = "";
                    if (data.state == "1") {
                        reserve02 = data.reserve02;
                    }
                    switch (reserve02) {
                        case "密封":
                            url_page = "../TestingOrder/PrintTestingOrderReplace_mf.aspx";
                            break;
                        default:
                            url_page = "../TestingOrder/PrintTestingOrderReplace.aspx";
                            break;
                    }
                    window.open(url_page + "?testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId);
                }, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }
            catch (e) {
                layer.msg(e.message, { time: 2000 });
            }
        }

        function GetSampleBasisItem(testingOrderId) {
            json_data = { method: "GetSampleBasisItem", testingOrderId: testingOrderId };
            handle = bindInfo;
            try {
                ajax(json_data, handle, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }
            catch (e) {
                layer.msg(e.message, { time: 2000 });
            }
        }
        function bindInfo(date) {
            layer.closeAll('loading');
            if (date != null) {
                var num = date.length;
                var sampleNo = "";
                var sampleNo2 = "";
                var sampleNo3 = "";
                var basis = "", basis2 = "", act1 = "", act2 = "";
                var basisCode = "";
                var act3 = "";
                var item = "";
                var htmlTest = "";
                var arr = new Array();
                var arr_index = 0;
                arr[arr_index] = "";
                for (var i = 0; i < num; i++) {
                    sampleNo = date[i].sampleNo;
                    basis = date[i].testingBasisName;
                    act1 = date[i].activateId;
                    basisCode = date[i].testingBasisCode;
                    if (i < num - 1) {
                        act3 = date[i + 1].activateId;
                        sampleNo3 = date[i + 1].sampleNo;
                    } else {
                        basisCode2 = "";
                        sampleNo3 = "";
                    }
                    item = date[i].testingItemName;
                    if (sampleNo != sampleNo2) {
                        if (i == 0) {
                            htmlTest += sampleNo + ": ▽▽";
                            arr[arr_index] += sampleNo + ": ▽▽";
                        } else {
                            htmlTest += "▽▽" + sampleNo + ": ▽▽";
                            arr[arr_index] += "▽▽";
                            arr_index++;
                            arr[arr_index] = sampleNo + ": ▽▽";
                        }
                    }
                    if (act1 != act2 || sampleNo != sampleNo2) {
                        if (basisCode != "00000") {
                            basis += ": (";
                        }
                        if (i == 0 || sampleNo2 != sampleNo) {
                            htmlTest += basisCode + "" + basis;
                            arr[arr_index] += basisCode + "" + basis;
                        } else {
                            htmlTest += "▽▽" + basisCode + "" + basis;
                            arr[arr_index] += "▽▽" + basisCode + "" + basis;
                        }
                    }
                    if (i == 0 || act1 != act2 || sampleNo2 != sampleNo) {
                        htmlTest += item;
                        arr[arr_index] += item;
                    } else {
                        htmlTest += "; " + item;
                        arr[arr_index] += "; " + item;
                    }
                    if (basisCode != "00000" && (act1 != act3 || sampleNo3 != sampleNo)) {
                        htmlTest += ")";
                        arr[arr_index] += ")";
                    }
                    if ((i + 1) == num && i > 0)
                        arr[arr_index] += "▽▽";
                    sampleNo2 = sampleNo;
                    act2 = act1;
                }
                var IsSame = true;
                for (var i = 0; i <= arr_index; i++) {
                    if (i > 0) {
                        if (arr[arr_index] != arr[arr_index - 1]) {
                            IsSame = false;
                        }
                    }
                }
                if (IsSame) {
                    htmlTest = arr[0];
                }
                if (htmlTest != "" && htmlTest != undefined)
                    htmlTest = htmlTest.replace(/▽▽/g, "\n").replace(/空标准/g, "");
                if (htmlTest != "")
                    $("#testingBasisItem").val(htmlTest);
            }
        }

        function feeday(obj) {
            if ($("#testingOrderNo").val() == "") {
                return;
            } else {
                var testingOrderId = GetQueryString("testingOrderId");
                var testingOrderNo = $("#testingOrderNo").val();
                var tiltlename = "";
                if (obj == 1) {
                    tiltlename = "预计天数详情";
                } else {
                    tiltlename = "费用详情";
                }
                var index = layer.open({
                    title: tiltlename,
                    type: 2,
                    area: ['80%', '80%'],
                    fix: true,
                    maxmin: false,
                    content: "DetailFeeAndDay_new.html?Type=" + obj + "&testingOrderNo=" + testingOrderNo + "&testingOrderId=" + testingOrderId,
                    end: function () {
                    }
                });
            }
        }

        function testingorderattachment() {
            var testingOrderId = GetQueryString("testingOrderId");
            if ($("#testingOrderNo").val() == "" || $("#testingOrderNo").val() == null) {
                layer.alert("请先保存委托信息再上传附件！");
                return;
            } else {
                var index = layer.open({
                    title: '委托附件',
                    type: 2,
                    area: ['80%', '80%'],
                    fix: true, //固定
                    maxmin: false,
                    content: 'TestingOrderAttachment.html?testingOrderNo=' + $("#testingOrderNo").val() + "&testingOrderId=" + testingOrderId,
                    end: function () {
                    }
                });
            }
        }



        //////////////////////////////0---------------------------------------------------------------
        var indexState = 1;
        //点击按钮，判断状态是否是已提交，如果是不允许做操作
        function isOperation(index) {
            indexState = index;
            var testingOrderId = GetQueryString("testingOrderId");
            //如果是1那么是基材信息，2那就是委托附件
            json_data = { method: "isOperation", testingOrderId: testingOrderId };
            try {
                ajax(json_data, caoZuoResult, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }
            catch (e) {
                layer.msg(e.message, { time: 2000 });
            }

        }

        function caoZuoResult(data) {
            layer.closeAll();
            if (data.testingOrderStatusName == "已提交") {
                //那么就是
                layer.alert("该订单已提交，不能进行编辑", { icon: 5 });
            } else {
                if (indexState == 1) {
                    //基材信息
                    TestingOrdersBaseMaterical();
                } else {
                    //委托附件
                    testingorderattachment();
                }
            }
        }
        // 提交委托信息
        function sub() {
            mainIndex = layer.confirm('确定提交委托？', {
                btn: ['确定', '取消'] //按钮
            }, function () {
                testingOrderId = GetQueryString("testingOrderId");
                var json_data = { method: "SamplesCountBytestingOrderNo", testingOrderId: testingOrderId };
                ajax2(json_data, ClosePage, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }, function () {

            });
        }
        var retuntestingOrderId = "";
        var mainIndex;
        function ClosePage(data) {
            layer.closeAll('loading');
            if (data.state == "1") {
                layer.alert(data.msg, { icon: 1 }, function () {
                    window.parent.closeActiveTab();
                });
            } else if (typeof data.retuntestingOrderId != "undefined" && data.retuntestingOrderId != "" && data.retuntestingOrderId.indexOf(",") < 0) {
                layer.close(mainIndex);
                retuntestingOrderId = data.retuntestingOrderId;
                //layer.alert(retuntestingOrderId);
                var index = layer.open({
                    type: 1,
                    title: "信息",
                    content: $("#delay_div"),
                    area: ['500px', '220px'],
                    success: function (index) {
                        //清空数据表格
                        $("#delayFrm")[0].reset();
                    },
                    end: function () {
                        $("#delay_div").hide();
                        //清空数据表格
                        $("#delayFrm")[0].reset();
                        layer.close(index);
                    }
                })
            } else {
                layer.msg(data.msg, { icon: 5 });
            }
        }
        // //后台执行修改方法,保存超期说明
        function doSubmitInfo() {
            var delayRemark = $("#delayRemark").val().trim();
            if (delayRemark == "") {
                layer.alert("请填写超期提交原因说明", { icon: 5 });
                return;
            }
            try {
                var json_data = {
                    method: "submitTestingorderBefore",
                    testingOrderId: retuntestingOrderId,
                    delayRemark: delayRemark,
                };
                ajax(json_data, saveDelayRemark, "../../AjaxRequest/TestingOrders/TestingOrders.ashx", "json");
            }
            catch (e) {
                layer.msg(e.message, { time: 2000 });
            }
        }
        function saveDelayRemark(data) {
            layer.closeAll('loading');
            if (data.state == '1') { 
                layer.alert(data.msg, { icon: 1 }, function () {
                    window.parent.closeActiveTab();
                });
            }
            else {
                layer.msg(data.msg, { icon: 5 });
            }
        }
        function testingTypeChange() {
            var value = $("#testingType").val(); 
            var value2 = $("#productTypeItem").val();
            if (value2 == "62272") {  //SC-强制性产品认证
                $(".hide_tr1").show();
                $(".hide_tr2").hide();
            }
            else {
                $(".hide_tr1").hide();
                $(".hide_tr2").show();
                if (value == "51281" || value == "40557") {
                    $("#projectName").attr("disabled", "disabled").val("");
                    $("#projectSection").attr("disabled", "disabled").val("");
                    $("#projectAddress").attr("disabled", "disabled").val("");
                } else {
                    $("#projectName").removeAttr("disabled");
                    $("#projectSection").removeAttr("disabled");
                    $("#projectAddress").removeAttr("disabled");
                }
            }
        }
        //自动行高
        (function ($) {
            $.fn.autoTextarea = function (options) {
                var defaults = {
                    maxHeight: null,
                    minHeight: $(this).height()
                };
                var opts = $.extend({}, defaults, options);
                return $(this).each(function () {
                    $(this).bind("paste cut keydown keyup focus blur", function () {
                        var height, style = this.style;
                        this.style.height = opts.minHeight + 'px';
                        if (this.scrollHeight > opts.minHeight) {
                            if (opts.maxHeight && this.scrollHeight > opts.maxHeight) {
                                height = opts.maxHeight;
                                style.overflowY = 'scroll';
                            } else {
                                height = this.scrollHeight;
                                style.overflowY = 'hidden';
                            }
                            style.height = height + 'px';
                        }
                    });
                });
            };
        })(jQuery);
        $("textarea").autoTextarea({
            maxHeight: 162,
            minHeight: 60
        });
    </script>
<script>
    layui.use(['layer', 'form', 'element', 'laydate'], function () {
        var element = layui.element;
        var laydate = layui.laydate;
        var form = layui.form;
        GetSelectList('GetTestingInstituteList', 'testingInstitute');
        form.on('select(select1)', function (data) {
            var elem = data.elem; // 获得 select 原始 DOM 对象
            var value = data.value; // 获得被选中的值
            var othis = data.othis; // 获得 select 元素被替换后的 jQuery 对象
            GetProductSelectList();
            var testCatatoryItemCode = $("#testCatatory").val();
            judge(testCatatoryItemCode);
        });
        form.on('select(select2)', function (data) {
            var elem = data.elem; // 获得 select 原始 DOM 对象
            var value = data.value; // 获得被选中的值
            var othis = data.othis; // 获得 select 元素被替换后的 jQuery 对象
            judge(value);
        });
        layui.form.render();
    }) 
    function GetSelectList(hand, name) {
        if (hand == 'GetTestingInstituteList') {
            var json_data = { method: "GetSelectList", name: name };
            ajax2(json_data, GetTestingInstituteList, "TestingOrders/TestingOrders.ashx", "json");
        } else if (hand == 'GetTestCatatoryList') {
            var json_data = { method: "GetTestCatatoryList", testingInstitute: $("#testingInstitute").val().trim() };
            ajax2(json_data, GetTestCatatoryList, "TestingOrders/TestingOrders.ashx", "json");
        }
    }
    function GetProductSelectList() {
        GetSelectList('GetTestCatatoryList', '');

    }
    function judge(value) {
        var option_str = '<option value="">请选择</option>';
        option_str += '<option value="通用">通用</option>';
        if (value == "评估咨询") {   //查询是否有JK 大类权限，如果有，则开放菜单
            //var json_data = { method: "GetTestCatatoryList", testingInstitute: $("#testingInstitute").val().trim() };
            //ajax2(json_data, GetTestCatatoryList, "TestingOrders/TestingOrders.ashx", "json");
            option_str += '<option value="MSDS">MSDS</option>';
        } 
        $('#orderType').html(option_str);
        if ($('#orderType option').length == 2) {
            $('#orderType').val("通用");
        }
        layui.form.render();
    }
    function next() {
        var testCatatoryItemCode = $("#testCatatory").val();
        var testCatatoryItemName = $("#testCatatory").find("option:selected").text();
        var testingInstituteItemCode = $("#testingInstitute").val();
        var testingInstituteItemName = $("#testingInstitute").find("option:selected").text();
        var orderType = $("#orderType").val();
        if (testCatatoryItemCode == '') {
            layer.alert("请选择业务类别", { icon: 5 });
            return;
        }
        if (testingInstituteItemCode == '') {
            layer.alert("请选择检验机构", { icon: 5 });
            return;
        }
        if (orderType == '') {
            layer.alert("请选择委托类型", { icon: 5 });
            return;
        }
        if (testCatatoryItemCode == '抽样') {
            window.location.href = "TestingContractSampling.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        } else if (testCatatoryItemCode == '工程') {
            window.location.href = "TestingContractEngineering.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode + "&type=3";

        } else if (testCatatoryItemCode == '检验') {
            window.location.href = "TestingContractEngineering.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode + "&type=3";
        } else if (testCatatoryItemCode == '收样') {
            window.location.href = "TestingContract.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        } else if (testCatatoryItemCode == '校准') {
            window.location.href = "TestingContract_jz.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        }
        else if (testCatatoryItemCode == '认证抽样') {
            window.location.href = "TestingContractSampling_rz.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        }
        else if (testCatatoryItemCode == '评估咨询') {
            if (orderType == "通用")
                window.location.href = "TestingContractEngineering_pj.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode + "&type=3";
            else
                window.location.href = "TestingContractEngineering_pg.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        }
    }

    function GetTestingInstituteList(data) {
        layer.closeAll('loading');
        var testingInstitute = $("#testingInstitute");
        var option_str = "";
        for (var i = 0; i < data.length; i++) {
            option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
        }
        testingInstitute.append(option_str);
        GetSelectList('GetTestCatatoryList', 'testCatatory');
        layui.form.render();
    }
    function GetTestCatatoryList(data) {
        layer.closeAll('loading');
        var testCatatory = $("#testCatatory");
        $("#testCatatory").empty();
        var option_str = "";
        for (var i = 0; i < data.length; i++) {
            if (data[i].itemName != "电商")
                option_str += '<option value=\"' + data[i].itemName + '\">' + data[i].itemName + '</option>';
        }
        testCatatory.append(option_str);
        layui.form.render();
    }

</script>
<script>
    layui.use(['layer', 'form', 'element', 'laydate'], function () {
        var element = layui.element;
        var laydate = layui.laydate;
        var form = layui.form;
        GetSelectList('GetTestingInstituteList', 'testingInstitute');
        form.on('select(select1)', function (data) {
            var elem = data.elem; // 获得 select 原始 DOM 对象
            var value = data.value; // 获得被选中的值
            var othis = data.othis; // 获得 select 元素被替换后的 jQuery 对象
            GetProductSelectList();
            var testCatatoryItemCode = $("#testCatatory").val();
            judge(testCatatoryItemCode);
        });
        form.on('select(select2)', function (data) {
            var elem = data.elem; // 获得 select 原始 DOM 对象
            var value = data.value; // 获得被选中的值
            var othis = data.othis; // 获得 select 元素被替换后的 jQuery 对象
            judge(value);
        });
        layui.form.render();
    }) 
    function GetSelectList(hand, name) {
        if (hand == 'GetTestingInstituteList') {
            var json_data = { method: "GetSelectList", name: name };
            ajax2(json_data, GetTestingInstituteList, "TestingOrders/TestingOrders.ashx", "json");
        } else if (hand == 'GetTestCatatoryList') {
            var json_data = { method: "GetTestCatatoryList", testingInstitute: $("#testingInstitute").val().trim() };
            ajax2(json_data, GetTestCatatoryList, "TestingOrders/TestingOrders.ashx", "json");
        }
    }
    function GetProductSelectList() {
        GetSelectList('GetTestCatatoryList', '');

    }
    function judge(value) {
        var option_str = '<option value="">请选择</option>';
        option_str += '<option value="通用">通用</option>';
        if (value == "评估咨询") {   //查询是否有JK 大类权限，如果有，则开放菜单
            //var json_data = { method: "GetTestCatatoryList", testingInstitute: $("#testingInstitute").val().trim() };
            //ajax2(json_data, GetTestCatatoryList, "TestingOrders/TestingOrders.ashx", "json");
            option_str += '<option value="MSDS">MSDS</option>';
        } 
        $('#orderType').html(option_str);
        if ($('#orderType option').length == 2) {
            $('#orderType').val("通用");
        }
        layui.form.render();
    }
    function next() {
        var testCatatoryItemCode = $("#testCatatory").val();
        var testCatatoryItemName = $("#testCatatory").find("option:selected").text();
        var testingInstituteItemCode = $("#testingInstitute").val();
        var testingInstituteItemName = $("#testingInstitute").find("option:selected").text();
        var orderType = $("#orderType").val();
        if (testCatatoryItemCode == '') {
            layer.alert("请选择业务类别", { icon: 5 });
            return;
        }
        if (testingInstituteItemCode == '') {
            layer.alert("请选择检验机构", { icon: 5 });
            return;
        }
        if (orderType == '') {
            layer.alert("请选择委托类型", { icon: 5 });
            return;
        }
        if (testCatatoryItemCode == '抽样') {
            window.location.href = "TestingContractSampling.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        } else if (testCatatoryItemCode == '工程') {
            window.location.href = "TestingContractEngineering.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode + "&type=3";

        } else if (testCatatoryItemCode == '检验') {
            window.location.href = "TestingContractEngineering.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode + "&type=3";
        } else if (testCatatoryItemCode == '收样') {
            window.location.href = "TestingContract.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        } else if (testCatatoryItemCode == '校准') {
            window.location.href = "TestingContract_jz.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        }
        else if (testCatatoryItemCode == '认证抽样') {
            window.location.href = "TestingContractSampling_rz.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        }
        else if (testCatatoryItemCode == '评估咨询') {
            if (orderType == "通用")
                window.location.href = "TestingContractEngineering_pj.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode + "&type=3";
            else
                window.location.href = "TestingContractEngineering_pg.html?testCatatoryItemName=" + testCatatoryItemName + "&testCatatoryItemCode=" + testCatatoryItemCode + "&testingInstituteItemName=" + testingInstituteItemName + "&testingInstituteItemCode=" + testingInstituteItemCode;
        }
    }

    function GetTestingInstituteList(data) {
        layer.closeAll('loading');
        var testingInstitute = $("#testingInstitute");
        var option_str = "";
        for (var i = 0; i < data.length; i++) {
            option_str += '<option value=\"' + data[i].itemCode + '\">' + data[i].itemName + '</option>';
        }
        testingInstitute.append(option_str);
        GetSelectList('GetTestCatatoryList', 'testCatatory');
        layui.form.render();
    }
    function GetTestCatatoryList(data) {
        layer.closeAll('loading');
        var testCatatory = $("#testCatatory");
        $("#testCatatory").empty();
        var option_str = "";
        for (var i = 0; i < data.length; i++) {
            if (data[i].itemName != "电商")
                option_str += '<option value=\"' + data[i].itemName + '\">' + data[i].itemName + '</option>';
        }
        testCatatory.append(option_str);
        layui.form.render();
    }

</script>