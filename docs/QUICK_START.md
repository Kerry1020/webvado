# 第一个 Verilog 工程 / First Verilog project

先按 [README](../README.md) 启动服务并安装 OSS CAD Suite。

以下两个源文件也放在 `examples/counter/`。服务启动后运行 `bash scripts/demo.sh` 可创建一个独立示例工程，已有同名工程会被拒绝而不是覆盖。

## 1. 新建工程

点击 **File → New Project**，名称使用一个未占用的名称，例如 `counter_demo`，器件选择 `ice40hx8k`。

## 2. 添加设计文件

点击 **Add Sources**，文件类型选择 **Design source**，文件名 `counter.v`。在编辑器内替换为以下内容并保存：

```verilog
module counter (
  input wire clk,
  input wire rst,
  output reg [3:0] count
);
  always @(posedge clk) begin
    if (rst) count <= 4'd0;
    else count <= count + 1'b1;
  end
endmodule
```

在文件树右键 `counter.v` → **Set as Top**。然后运行 **Tools → Check Syntax**。

## 3. 添加 testbench

再次点击 **Add Sources**，选择 **Simulation source**，文件名 `counter_tb.v`，保存以下内容：

```verilog
`timescale 1ns / 1ps
module counter_tb;
  reg clk = 0;
  reg rst = 1;
  wire [3:0] count;
  counter dut (.clk(clk), .rst(rst), .count(count));
  always #5 clk = ~clk;
  initial begin
    $dumpfile("counter.vcd");
    $dumpvars(0, counter_tb);
    #12 rst = 0;
    #100;
    if (count !== 4'd10) $fatal(1, "Counter mismatch: %d", count);
    $display("COUNTER_PASS");
    $finish;
  end
endmodule
```

点击 **Run Simulation**。预期出现 VCD 波形，日志包含 `COUNTER_PASS`。仿真包含 `srcs/rtl` 与 `srcs/sim`，综合只使用设计文件。

## 4. 综合与 bitstream

点击 **Run Synthesis**，查看综合网表和资源报告。iCE40 的布局布线使用 nextpnr，打包使用 icepack。

实际板卡需要匹配的封装和 PCF。通过 **Add Sources → Constraint** 添加 `.pcf`，每个外部端口映射到板卡允许的管脚。不要直接套用其他板子的 pin number。未提供引脚约束的构建即使成功，也只能用于检查工具流程，不能据此声称已经在硬件上验证。

**Run Implementation** 生成布局布线结果，**Generate Bitstream** 生成配置文件；构建错误会显示在控制台中。**Open Hardware Manager** 可检测电缆并烧录（编程只由手动点击触发，过期位流会被拒绝）；本仓库的验证没有连接物理板卡，不声称真实烧录已通过。

## 5. 日常操作

- 点击文件树中的文件打开它；工具栏 Save 或 Ctrl/Cmd+S 保存。
- File → Close Project 关闭，File → Open Project 重新打开；文件内容保存在服务器磁盘上。
- Help → Language 切换中英文。
- Settings 配置编辑器选项；工具链版本在 Help → About 中查看。
- 控制台输入 `help` 查看支持的命令。它不是完整的 Tcl 环境。

## 测试

```sh
npm run check
npm test
npm run test:integration
npm run test:e2e
```

集成测试需要真实工具链，浏览器测试需要 Playwright Chromium。测试使用临时工程；不要用已有的用户工程作为测试夹具。
