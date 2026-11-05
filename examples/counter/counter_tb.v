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
