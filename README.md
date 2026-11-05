# WebVado

[English](README.en.md) · [快速开始](docs/QUICK_START.md) · [验证记录](docs/STATUS.md)

浏览器里的 Verilog 工作台。界面参考 Vivado 2017.4，后端使用本机的开源 FPGA 工具。Node.js + Express，前端是原生 JavaScript，没有 React/Vue，也不加载 CDN 资源。

编辑器、文件树、工程管理和波形查看器在浏览器里运行；Icarus Verilog、Yosys、nextpnr 在启动服务器的机器上运行。

## 启动

需要 Node.js 18+、npm 和桌面浏览器。

```sh
git clone https://github.com/Kerry1020/webvado.git
cd webvado
npm ci
npm start
```

打开 **http://localhost:3000**。开发时使用 `npm run dev`，由同一个 Express 服务提供页面与 API。修改前端后刷新浏览器即可。

### 工具链

下载与你的系统、CPU 匹配的 [OSS CAD Suite](https://github.com/YosysHQ/oss-cad-suite-build/releases)，校验官方发布的 SHA-256 后解压到：

```text
webvado/tools/oss-cad-suite/bin/iverilog
webvado/tools/oss-cad-suite/bin/yosys
webvado/tools/oss-cad-suite/bin/nextpnr-ice40
```

安装不需要 Homebrew。也可以使用已有工具目录：

```sh
WEBVADO_TOOLCHAIN=/absolute/path/oss-cad-suite/bin npm start
```

工具搜索顺序为指定目录（或项目内目录）、系统 `PATH`。用 `npm run check-tools` 检查，Help → About 也会显示检测结果。缺少工具时构建会报告具体错误。

## 使用流程

1. **New Project** 创建工程，选择器件。
2. **Add Sources** 创建或上传设计文件到 `srcs/rtl`，仿真文件到 `srcs/sim`，约束文件到 `srcs/constrs`。
3. 单击文件编辑，工具栏 Save 或 Ctrl/Cmd+S 保存；源文件右键菜单可设置顶层模块。
4. **Check Syntax** 调用 Icarus 检查设计。
5. **Run Simulation** 编译设计和 testbench，运行 vvp，读取 testbench 输出的 VCD。
6. **Run Synthesis** 调用 Yosys，生成网表和资源统计。
7. iCE40 工程使用 **Run Implementation** 调用 nextpnr，**Generate Bitstream** 使用 icepack。
8. **Open Hardware Manager** 检测编程电缆并烧录位流（openFPGALoader；仅手动触发，过期位流被拒绝）。

完整样例见[快速开始](docs/QUICK_START.md)。器件、封装、PCF 引脚必须与目标板一致；生成文件与实际板卡烧录验证是两件事。当前没有已验证的物理板卡烧录结果。

### 界面与边界

- 中英文切换：Help → Language，选择保存在浏览器里。
- 编辑器：文本编辑、行号、查找替换、撤销重做、编译诊断；不是 CodeMirror/Monaco，没有语义自动补全。
- 控制台：支持 `help` 列出的有限命令及历史记录，**不是完整 Tcl 解释器**。
- 波形：VCD 标量、总线、缩放与平移。
- iCE40 是布局布线/bitstream 流程的目标；不要把 Yosys 支持的所有 FPGA 等同于本应用已集成的器件。
- IP Catalog、图形化 Block Design 与 RTL elaboration 视图尚未实现。综合后网表原理图（SVG）已实现；硬件编程已实现（openFPGALoader，需手动点击，过期位流会被拒绝），但没有物理板卡验证结果。界面应明确表示能力边界，不能把提示弹窗视为这些功能已完成。
- 不支持 Vivado 工程直接导入、专有 IP 或 VHDL 编译。

所有应用资源都在本地。依赖和工具安装后，编辑、构建与仿真不需要外网；GitHub/文档链接需要网络。

## 数据与代码

```text
backend/        Express API、工程/文件服务、构建调用、VCD 解析
frontend/       HTML/CSS/ES modules
projects/       用户工程（不提交到 Git）
tools/          本地工具链（不提交到 Git）
tests/          单元、真实工具链集成与浏览器回归
scripts/        语法检查、构建、工具检测
docs/           使用说明与验证记录
```

一个工程的数据格式：

```text
<project>/
  .webvado/project.json
  .webvado/build/          # 生成的网表、报告、VCD、bitstream
  srcs/rtl/
  srcs/sim/
  srcs/constrs/
```

## 开发与验证

```sh
npm run check             # 检查所有 JS 的语法，覆盖入口模块依赖
npm run lint
npm test                  # Node 单元测试
npm run test:integration  # 需要真实 FPGA 工具链
npm run test:e2e          # Playwright 浏览器回归
npm run build             # 复制可运行的 ESM 前后端到 dist/
```

首次运行浏览器测试需要 `npx playwright install chromium`。验证脚本的环境要求和本次实际结果见 [STATUS.md](docs/STATUS.md)。旧的 `test-completion.sh` 和 `verify_frontend.sh` 现在调用这些真实测试，不再用“文件存在”推断功能正常。

构建保留目录结构与 ESM，产物不包含依赖、用户工程和工具链。可以在仓库内运行 `node dist/backend/server.js`；工具链在外部时设置 `WEBVADO_TOOLCHAIN`。工程数据路径可通过 `WEBVADO_PROJECTS_DIR` 指定。

## 贡献

保持原生 JS 与现有组件结构。修改行为时写能复现问题的测试，构建失败应保留诊断信息。`docs/SPECIFICATION.md` 和 `docs/IMPLEMENTATION_PLAN.md` 是原始设计目标，不是已完成能力清单。

[提交问题](https://github.com/Kerry1020/webvado/issues) · MIT License
