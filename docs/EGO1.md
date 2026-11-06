# EGO1 (Artix-7 XC7A35T) 支持说明

WebVado 现支持 Digilent/依元素 EGO1 开发板（`xc7a35tcsg324`，与 Arty A7-35 同芯片同封装）
的全开源流程，无需 Vivado：

| 步骤 | 工具 | 运行位置 |
|------|------|----------|
| 仿真 | iverilog / vvp | 本机 |
| 综合 | yosys `synth_xilinx -flatten` | 本机 |
| 布局布线 | nextpnr-xilinx (openXC7) | Docker |
| 位流 | fasm2frames + xc7frames2bit | Docker |
| 烧录 | openFPGALoader `-b arty_a7_35t`（或 `-c digilent`） | 本机 |

## 环境准备（一次性）

1. **Docker 镜像**（amd64，Apple Silicon 上靠 Rosetta 模拟，功能完整）：
   ```bash
   docker pull regymm/openxc7:latest
   ```
2. **chipdb**：仓库内置于 `tools/chipdb/xc7a35t.bin`（92 MB，由
   `bbaexport.py --device xc7a35tcsg324-1` + `bbasm --l` 生成）。重建：
   ```bash
   mkdir -p tools/chipdb && docker run --rm --platform linux/amd64 \
     -v "$PWD/tools/chipdb:/out" regymm/openxc7:latest bash -lc '
     cd /nextpnr-xilinx/xilinx/python && PYTHONPATH=. python3 bbaexport.py \
       --device xc7a35tcsg324-1 --bba /out/xc7a35t.bba &&
     cd /nextpnr-xilinx && ./bbasm --l /out/xc7a35t.bba /out/xc7a35t.bin'
   ```
3. 环境变量（可选）：
   - `WEBVADO_XC7_CHIPDB` 覆盖 chipdb 路径
   - `WEBVADO_OPENXC7_IMAGE` 覆盖镜像名（默认 `regymm/openxc7:latest`）

Docker Desktop 需保持运行；`/Users` 默认在文件共享列表内，无需额外配置。

## 使用

1. 新建工程时器件选 **Artix-7 XC7A35T (EGO1)**（part 名 `xc7a35t`）。
2. 设计源放 `srcs/rtl`，约束放 `srcs/constrs/*.xdc`（标准 Vivado `-dict` 写法即可，
   布线前会自动归一化为 nextpnr-xilinx 可解析的 flat 写法，产物在
   `.webvado/build/xc7-design.xdc`）。
3. 依次 Run Synthesis → Run Implementation → Generate Bitstream。
   Implement 约 1–3 分钟（Docker 冷启动 + 布线），bitstream 约 1 分钟。
4. 烧录：Connect Hardware 面板选 board `arty_a7_35t`（EGO1 同芯片同封装）
   或 cable `digilent`，target=sram（JTAG 易失加载，断电即失，适合实验验收）。

## 已知边界

- 仅支持 `xc7a35t`（csg324-1 速度档）。其它 7 系列需另生成 chipdb。
- XDC 归一化只保留 `PACKAGE_PIN/LOC/IOSTANDARD/DRIVE/SLEW/PULL*` 与 `create_clock`;
  时钟管理原语（MMCME/PLL）、false path 等 Vivado 专有约束不支持。
- 位流是 SRAM 配置流（.bit 格式，2.2 MB），非 SPI flash 镜像。
- Implement/bitstream 走 `docker run`，首次拉镜像需网络；镜像缺失时报 424。

## 参考实验

`examples/flash_led/`（流水灯：1 Hz / SW0 方向 / SW7 启停 + 扩展 2 灯 4 Hz 自动换向）
是完整示例工程，README 含引脚表、时钟频率调整方法和验收对照清单。
WebVado 内置工程 `flash_led`（part=xc7a35t）可直接体验全流程。
