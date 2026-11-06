`timescale 1ns / 1ps
// ===========================================================================
//  counter.v  —— 分频模块（流水灯节拍发生器）
//  参考《实验4 实验要求》第 6 页 counter.v，改为参数化两级计数器。
//  EGO1 板载晶振 100 MHz：每 DIV_FIRST*DIV_SECOND 个时钟周期输出一个
//  单周期脉冲 clk_bps。
//    1 Hz : DIV_FIRST = DIV_SECOND = 10000  (10000*10000 = 1e8 = 1 s)
//    4 Hz : DIV_FIRST = DIV_SECOND = 5000   (5000*5000  = 2.5e7 = 0.25 s)
//  仿真时用极小参数即可快速出波形。
// ===========================================================================
module counter #(
    parameter integer DIV_FIRST  = 10000,
    parameter integer DIV_SECOND = 10000
) (
    input  wire clk,       // 100 MHz 时钟
    input  wire rst,       // 高有效，异步复位
    output wire clk_bps    // 节拍脉冲，单周期高
);
    reg [15:0] cnt_first;
    reg [15:0] cnt_second;

    wire first_done  = (cnt_first  == DIV_FIRST  - 1);
    wire second_done = (cnt_second == DIV_SECOND - 1);

    // 第一级：每 DIV_FIRST 周期回绕一次
    always @(posedge clk or posedge rst) begin
        if (rst)
            cnt_first <= 16'd0;
        else
            cnt_first <= first_done ? 16'd0 : cnt_first + 1'b1;
    end

    // 第二级：第一级每满一轮计一次，满 DIV_SECOND 轮回绕
    always @(posedge clk or posedge rst) begin
        if (rst)
            cnt_second <= 16'd0;
        else if (first_done)
            cnt_second <= second_done ? 16'd0 : cnt_second + 1'b1;
    end

    // 两级同时到顶 = 一个完整分频周期结束，产生单周期脉冲
    assign clk_bps = first_done & second_done;
endmodule
