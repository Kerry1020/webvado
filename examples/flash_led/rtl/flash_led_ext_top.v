`timescale 1ns / 1ps
// ===========================================================================
//  flash_led_ext_top.v  —— 扩展要求顶层
//  每次点亮 2 只 LED、流速 4 Hz、不用开关控制、到达边界自动左右换向。
//    clk   : 板载 100 MHz 晶振
//    rst_n : 低有效复位
//    sw0/sw7 : 扩展要求不使用（自动换向、常流动），端口保留以共用同一 xdc
//    led   : 16 位 LED 总线
//  默认分频 5000×5000 → 100 MHz / 2.5e7 = 4 Hz。
// ===========================================================================
module flash_led_ext_top #(
    parameter integer DIV_FIRST  = 5000,
    parameter integer DIV_SECOND = 5000
) (
    input  wire        clk,
    input  wire        rst_n,
    input  wire        sw0,   // 未使用
    input  wire        sw7,   // 未使用
    output wire [15:0] led
);
    wire rst = ~rst_n;
    wire clk_bps;

    counter #(.DIV_FIRST(DIV_FIRST), .DIV_SECOND(DIV_SECOND)) counter (
        .clk     ( clk     ),
        .rst     ( rst     ),
        .clk_bps ( clk_bps )
    );

    // LIGHT=2 两灯同亮，auto_dir=1 到边界自动换向、无视 en/dir 恒流动
    flash_led_ctl #(.LIGHT(2), .auto_dir(1'b1)) flash_led_ctl (
        .clk     ( clk     ),
        .rst     ( rst     ),
        .en      ( 1'b1    ),
        .dir     ( 1'b0    ),
        .clk_bps ( clk_bps ),
        .led     ( led     )
    );
endmodule
