## ==========================================================================
##  EGO1 (xc7a35tcsg324-1) 引脚约束 —— 流水灯实验（实验4）
##  引脚取自《实验4 实验要求》第 8 页；总线写法 led[0..15]。
##  基本顶层 flash_led_top 用到 clk/rst_n/sw0/sw7/led；
##  扩展顶层 flash_led_ext_top 只用 clk/rst_n/led，sw0/sw7 虽约束但未驱动逻辑，
##  本文件对两个顶层通用。
## ==========================================================================

## 时钟与复位
set_property -dict {PACKAGE_PIN P17 IOSTANDARD LVCMOS33} [get_ports clk]
create_clock -add -name sys_clk_pin -period 10.00 -waveform {0 5} [get_ports clk]
set_property -dict {PACKAGE_PIN R1  IOSTANDARD LVCMOS33} [get_ports rst_n]

## 拨码开关
set_property -dict {PACKAGE_PIN P5  IOSTANDARD LVCMOS33} [get_ports sw0]
set_property -dict {PACKAGE_PIN V17 IOSTANDARD LVCMOS33} [get_ports sw7]

## LED0..LED15
set_property -dict {PACKAGE_PIN F6 IOSTANDARD LVCMOS33} [get_ports {led[0]}]
set_property -dict {PACKAGE_PIN G4 IOSTANDARD LVCMOS33} [get_ports {led[1]}]
set_property -dict {PACKAGE_PIN G3 IOSTANDARD LVCMOS33} [get_ports {led[2]}]
set_property -dict {PACKAGE_PIN J4 IOSTANDARD LVCMOS33} [get_ports {led[3]}]
set_property -dict {PACKAGE_PIN H4 IOSTANDARD LVCMOS33} [get_ports {led[4]}]
set_property -dict {PACKAGE_PIN J3 IOSTANDARD LVCMOS33} [get_ports {led[5]}]
set_property -dict {PACKAGE_PIN J2 IOSTANDARD LVCMOS33} [get_ports {led[6]}]
set_property -dict {PACKAGE_PIN K2 IOSTANDARD LVCMOS33} [get_ports {led[7]}]
set_property -dict {PACKAGE_PIN K1 IOSTANDARD LVCMOS33} [get_ports {led[8]}]
set_property -dict {PACKAGE_PIN H6 IOSTANDARD LVCMOS33} [get_ports {led[9]}]
set_property -dict {PACKAGE_PIN H5 IOSTANDARD LVCMOS33} [get_ports {led[10]}]
set_property -dict {PACKAGE_PIN J5 IOSTANDARD LVCMOS33} [get_ports {led[11]}]
set_property -dict {PACKAGE_PIN K6 IOSTANDARD LVCMOS33} [get_ports {led[12]}]
set_property -dict {PACKAGE_PIN L1 IOSTANDARD LVCMOS33} [get_ports {led[13]}]
set_property -dict {PACKAGE_PIN M1 IOSTANDARD LVCMOS33} [get_ports {led[14]}]
set_property -dict {PACKAGE_PIN K3 IOSTANDARD LVCMOS33} [get_ports {led[15]}]
