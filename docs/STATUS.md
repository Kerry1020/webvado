# WebVado 验证记录

日期：2026-11-05。此文件取代早期“100% 完成”式自述；原始规格和路线图保留为设计记录。

## 故障根因

`WaveformViewer.js` 曾在类结束后重复追加方法，浏览器报 `Unexpected token '{'`。它由入口直接导入，导致整个模块图加载失败；页面上的 HTML 按钮仍可见，但应用没有初始化。

另有多处独立问题：面板按钮触发两次、编辑器初始化删除欢迎页、弹窗关闭路径不一致、异步错误未处理、文件按 basename 而不是路径识别、API 前缀错误，以及用 Icarus 编译假充 Yosys 综合。

## 验证入口

| 命令 | 验证什么 |
| --- | --- |
| `npm run check` | backend、frontend、scripts、tests 的 JS 语法 |
| `npm run lint` | ESLint 静态检查 |
| `npm test` | Node 单元回归 |
| `npm run test:integration` | 真实工具链输出与后端行为 |
| `npm run test:e2e` | 临时数据目录、独立端口上的 Playwright 操作 |
| `npm run build` | 保留 ESM 目录结构的可运行分发副本 |
| `npm run check-tools` | 与服务器相同的工具检测路径 |

浏览器测试需要先安装 Chromium：`npx playwright install chromium`。集成测试需要 OSS CAD Suite。工具缺失不能算作真实构建成功。

## 集成记录

- 已确认旧构建将后端错误地输出成 CommonJS，损坏 `import.meta.url`。新的构建保留 ESM 与资源路径。
- 新构建副本已经实际启动，`/api/health`、首页与 `/js/main.js` 均校验响应内容；dist 内的服务通过上一级目录找到 `tools/oss-cad-suite`。
- `npm ci --dry-run --ignore-scripts --offline` 已验证 lockfile 与依赖声明一致。

## 本次最终结果（2026-11-05，工具链 OSS CAD Suite 2026-11-05，SHA-256 已校验）

| 检查 | 结果 |
| --- | --- |
| `npm run check` | 48 个 JS 文件语法通过 |
| `npm run lint` | 0 错误 0 警告 |
| `npm test` | 19/19（工程/文件边界、构建失效、硬件服务） |
| `npm run test:integration` | 7/7：真实 iverilog/vvp 仿真按纳秒截停、VCD 别名；hx8k/ct256 与 up5k/sg48 的 Yosys 综合、nextpnr 布局布线（含时序与资源报告）、icepack 位流及 `7e aa 99 7e` 前导；改源码后旧位流被拒绝；ECP5 仅综合并明确拒绝实现 |
| `npm run test:e2e` | 32/32 真实浏览器：工程/编辑/保存竞态、面板与语言、硬件对话框（不自动编程）、SVG 网表，以及 compile→simulate→synthesize→implement→bitstream 全链路，位流经浏览器下载校验 135100 字节 |
| `npm run check-tools` | iverilog/vvp/verilator/yosys/nextpnr-ice40/nextpnr-ecp5/icepack/iceprog/openFPGALoader 全部识别 |
| `npm run build` + dist 运行 | dist 服务健康检查、页面与 9 个工具检测全部通过 |
| 用户工程 | `projects/easy`、`projects/led_blinker` 五个文件 SHA-256 与基线一致，未被修改 |

## 尚不能据此宣称完成的能力

- IP Catalog、图形化 Block Design、RTL elaboration 视图（综合后网表原理图已实现）。
- CodeMirror/Monaco 级编辑器、语义补全、完整 Tcl。
- 除 ice40hx8k/ct256 与 ice40up5k/sg48 外器件的布局布线/bitstream 端到端集成。
- 真实 FPGA 板卡烧录：编程链路（openFPGALoader、选择器校验、过期位流拒绝、并发互斥）已实现并有单元测试，但没有连接物理板卡，不声称已验证真实烧录。

这些是原始路线图中的剩余工作，不能把“有菜单”“弹出说明”或“HTTP 200”当作已交付。
