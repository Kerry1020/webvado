`timescale 1ns / 1ps
// ===========================================================================
//  flash_led_ctl.v  —— 流水灯控制模块
//  参考《实验4 实验要求》第 7 页 flash_led_ctl.v，保持其总线约定：
//    复位点亮 led[15] (16'h8000)；dir=0 向右流动(led>>1)，dir=1 向左(led<<1)。
//  在参考代码基础上补齐实验要求：
//    · en  (SW7)      : 1 流动 / 0 暂停并保持当前状态（基本要求的启停）
//    · LIGHT 参数     : 同时点亮的灯数（基本要求 1，扩展要求 2）
//    · auto_dir 参数  : 1 时到达边界自动换向（扩展要求，忽略 dir/en 恒流动）
// ===========================================================================
module flash_led_ctl #(
    parameter integer LIGHT    = 1,
    parameter         auto_dir = 1'b0
) (
    input  wire        clk,
    input  wire        rst,       // 高有效，异步复位
    input  wire        en,        // 1 流动 / 0 暂停保持
    input  wire        dir,       // 0 向右, 1 向左（auto_dir=1 时忽略）
    input  wire        clk_bps,   // 节拍脉冲
    output reg  [15:0] led
);
    // 亮灯块：贴最高位(led[15]…)为初始/右移起点
    localparam [15:0] TOP_BLOCK = {{LIGHT{1'b1}}, {(16-LIGHT){1'b0}}}; // 如 LIGHT=1→8000, =2→C000
    localparam [15:0] BOT_BLOCK = {{(16-LIGHT){1'b0}}, {LIGHT{1'b1}}}; // 如 LIGHT=1→0001, =2→0003

    reg r_dir;   // 0 向右(>>), 1 向左(<<)

    always @(posedge clk or posedge rst) begin
        if (rst) begin
            led   <= TOP_BLOCK;   // 复位点亮最高位，与参考代码一致
            r_dir <= 1'b0;        // 初始向右
        end else begin
            if (!auto_dir) r_dir <= dir;        // 手动模式：SW0 决定方向
            if (clk_bps && (en || auto_dir)) begin
                if (r_dir == 1'b0) begin                 // 向右 >>
                    if (led == BOT_BLOCK) begin
                        led   <= auto_dir ? (led << 1) : TOP_BLOCK; // 换向 or 回绕
                        if (auto_dir) r_dir <= 1'b1;
                    end else
                        led <= led >> 1;
                end else begin                            // 向左 <<
                    if (led == TOP_BLOCK) begin
                        led   <= auto_dir ? (led >> 1) : BOT_BLOCK;
                        if (auto_dir) r_dir <= 1'b0;
                    end else
                        led <= led << 1;
                end
            end
        end
    end
endmodule
