`timescale 1ns / 1ps
// ===========================================================================
//  flash_led_tb.v —— 自检测试台
//  覆盖基本要求（单灯流水 / sw0 换向 / sw7 启停保持 / 边界回绕）与
//  扩展要求（2 灯流动 / 边界自动换向）。用极小分频让仿真快速完成；
//  综合上板时顶层用默认参数（1 Hz / 4 Hz）。
//  总线约定与参考一致：复位点亮 led[15] (16'h8000)。
// ===========================================================================
module flash_led_tb;
    reg clk = 0;
    always #5 clk = ~clk;            // 100 MHz

    reg rst_n_b = 0, rst_n_e = 0;
    reg sw0 = 0, sw7 = 1;            // sw7=1 流动
    wire [15:0] led_b, led_e;

    // 基本顶层：极小分频 3×3，一个节拍 = 9 个时钟
    flash_led_top #(.DIV_FIRST(3), .DIV_SECOND(3)) basic (
        .clk(clk), .rst_n(rst_n_b), .sw0(sw0), .sw7(sw7), .led(led_b));
    // 扩展顶层：极小分频 3×3
    flash_led_ext_top #(.DIV_FIRST(3), .DIV_SECOND(3)) ext (
        .clk(clk), .rst_n(rst_n_e), .sw0(1'b0), .sw7(1'b0), .led(led_e));

    integer errors = 0;
    reg [15:0] prev;
    integer g;
    // 等 led_b 变化（最多 500 个时钟）
    task step_basic;
        begin
            prev = led_b; g = 0;
            while (led_b === prev && g < 500) begin @(posedge clk); g = g + 1; end
        end
    endtask
    task check(input [15:0] got, input [15:0] exp, input [127:0] tag);
        begin
            if (got !== exp) begin
                $display("FAIL %0s: got %h exp %h", tag, got, exp);
                errors = errors + 1;
            end
        end
    endtask

    initial begin
        $dumpfile("simulation.vcd");
        $dumpvars(0, flash_led_tb);

        // ---- 基本要求：复位 ----
        rst_n_b = 0; sw0 = 0; sw7 = 1; repeat (4) @(posedge clk);
        rst_n_b = 1; @(posedge clk);
        check(led_b, 16'h8000, "reset=8000");

        // ---- sw0=0 向右：8000 -> 4000 -> 2000 ----
        step_basic; check(led_b, 16'h4000, "right1=4000");
        step_basic; check(led_b, 16'h2000, "right2=2000");

        // ---- sw7=0 暂停：保持不变 ----
        sw7 = 0; prev = led_b; repeat (60) @(posedge clk);
        check(led_b, prev, "pause-hold");
        sw7 = 1;

        // ---- sw0=1 向左：当前 -> 左移一位 ----
        sw0 = 1; @(posedge clk);
        prev = led_b; step_basic;
        check(led_b, prev << 1, "left=shiftL");

        // ---- 向右回绕：到 0001 后回 8000 ----
        sw0 = 0; @(posedge clk);
        g = 0;
        while (led_b !== 16'h0001 && g < 5000) begin @(posedge clk); g = g + 1; end
        check(led_b, 16'h0001, "reach=0001");
        step_basic; check(led_b, 16'h8000, "wrap=8000");

        // ---- 扩展要求：复位两灯 C000，自动换向 ----
        rst_n_e = 0; repeat (4) @(posedge clk);
        rst_n_e = 1; @(posedge clk);
        check(led_e, 16'hC000, "ext-reset=C000");
        // 右移一拍 -> 6000
        prev = led_e; g = 0;
        while (led_e === prev && g < 500) begin @(posedge clk); g = g + 1; end
        check(led_e, 16'h6000, "ext-right=6000");

        if (errors == 0) $display("ALL TESTS PASSED");
        else             $display("%0d TEST(S) FAILED", errors);
        $finish;
    end
endmodule
