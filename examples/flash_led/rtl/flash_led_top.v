`timescale 1ns / 1ps
// ===========================================================================
//  flash_led_top.v  —— 基本要求顶层：16 只 LED 单灯流水
//  参考《实验4 实验要求》第 5 页顶层，端口沿用参考总线写法：
//    clk   : 板载 100 MHz 晶振
//    rst_n : 低有效复位
//    sw0   : 方向选择（0 向右流动, 1 向左流动）
//    sw7   : 启停控制（1 流动, 0 暂停并保持）—— 实验基本要求，参考顶层未含
//    led   : 16 位 LED 总线，复位点亮 led[15]
//  默认分频 10000×10000 → 100 MHz / 1e8 = 1 Hz。
// ===========================================================================
module flash_led_top #(
    parameter integer DIV_FIRST  = 10000,
    parameter integer DIV_SECOND = 10000
) (
    input  wire        clk,
    input  wire        rst_n,
    input  wire        sw0,
    input  wire        sw7,
    output wire [15:0] led
);
    wire rst = ~rst_n;
    wire clk_bps;

    counter #(.DIV_FIRST(DIV_FIRST), .DIV_SECOND(DIV_SECOND)) counter (
        .clk     ( clk     ),
        .rst     ( rst     ),
        .clk_bps ( clk_bps )
    );

    flash_led_ctl #(.LIGHT(1), .auto_dir(1'b0)) flash_led_ctl (
        .clk     ( clk     ),
        .rst     ( rst     ),
        .en      ( sw7     ),
        .dir     ( sw0     ),
        .clk_bps ( clk_bps ),
        .led     ( led     )
    );
endmodule
