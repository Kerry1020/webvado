# flash_led —— 实验4 流水灯

基于《实验4 实验要求》的流水灯（跑马灯）工程，目标板 **EGO1（Artix-7 `xc7a35tcsg324-1`）**。
代码约定与课程参考包 `flash_led.rar` 一致：复位点亮 `led[15]`（`16'h8000`），
`sw0=0` 向右流动（`led>>1`）、`sw0=1` 向左流动（`led<<1`）。

## 文件

| 文件 | 作用 |
| --- | --- |
| `srcs/rtl/counter.v` | 分频模块，参数化两级计数器，100 MHz → 节拍脉冲 `clk_bps` |
| `srcs/rtl/flash_led_ctl.v` | 流水灯控制，参数 `LIGHT`（亮灯数）、`auto_dir`（自动换向），`en` 启停 |
| `srcs/rtl/flash_led_top.v` | **基本要求**顶层：单灯、1 Hz、`sw0` 方向、`sw7` 启停 |
| `srcs/rtl/flash_led_ext_top.v` | **扩展要求**顶层：2 灯、4 Hz、自动换向、无需开关 |
| `srcs/constrs/ego1.xdc` | EGO1 引脚约束（时钟/复位/sw0/sw7/led[0..15]） |
| `srcs/sim/flash_led_tb.v` | 自检测试台，覆盖基本+扩展，通过打印 `ALL TESTS PASSED` |

## 要求对照

**基本要求**（顶层 `flash_led_top`）
- 16 只 LED 依次点亮，每次 1 个，流速 1 Hz。
- `sw0`：控制从左向右 / 从右向左依次点亮。
- `sw7`：控制启停（停时保持当前点亮状态）。

**扩展要求**（顶层 `flash_led_ext_top`）
- 每次点亮 2 个灯，流速 4 Hz。
- 不用开关控制，到达边界左右方向自动切换。

## 频率换算

板载晶振 100 MHz。节拍周期 = `DIV_FIRST × DIV_SECOND` 个时钟。
- 1 Hz：`10000 × 10000 = 1e8`（基本顶层默认）。
- 4 Hz：`5000 × 5000 = 2.5e7`（扩展顶层默认）。

## 引脚表（EGO1）

| 信号 | 引脚 | 信号 | 引脚 | 信号 | 引脚 |
| --- | --- | --- | --- | --- | --- |
| clk | P17 | led[0] | F6 | led[8] | K1 |
| rst_n | R1 | led[1] | G4 | led[9] | H6 |
| sw0 | P5 | led[2] | G3 | led[10] | H5 |
| sw7 | V17 | led[3] | J4 | led[11] | J5 |
|  |  | led[4] | H4 | led[12] | K6 |
|  |  | led[5] | J3 | led[13] | L1 |
|  |  | led[6] | J2 | led[14] | M1 |
|  |  | led[7] | K2 | led[15] | K3 |

## WebVado 流程

1. 顶层默认为 `flash_led_top`（基本要求）；验收扩展要求时右键 `flash_led_ext_top` 设为顶层。
2. **Check Syntax / Run Simulation**：仿真台打印 `ALL TESTS PASSED`，波形可见单灯/双灯流动。
   仿真运行时长需 ≥ 2345 ns（Simulation Settings 里设 Run Time）才能跑完自检。
3. **Run Synthesis → Run Implementation → Generate Bitstream**：xc7 流程经 openXC7 完成。
4. **Open Hardware Manager**：EGO1 选 board `arty_a7_35t` 或 cable `digilent`，target=sram 烧录验收。

> 说明：真实上板用 Xilinx EGO1（Artix-7）。WebVado 走开源 openXC7 流程做仿真/综合/实现/位流演示；
> 课程若要求 Vivado 产物，仍以 Vivado 走最终上板流程，二者 RTL/XDC 通用。
