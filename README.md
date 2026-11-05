# WebVado

Web 版的 FPGA 开发环境，模仿 Vivado 的 UI，但完全用开源工具链。

## 你能拿它干什么

写 Verilog，综合，生成 bitstream，波形仿真。都在浏览器里。不需要装 Vivado 那一坨几十 GB 的东西。

目前集成了：
- **Icarus Verilog** — 仿真
- **Yosys** — 综合
- **nextpnr** — 布局布线

UI 照着 Vivado 2017.4 的样子做的，用习惯了 Vivado 的人上手会快一点。

## 截图

![主界面](docs/screenshot-main.png)

左边是 Flow Navigator（工作流导航），中间是代码编辑器和文件树，下面是 Tcl 控制台。

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 安装工具链（可选）

如果你想真的跑综合和仿真，装一下这些：

```bash
# macOS
brew install icarus-verilog yosys

# Ubuntu/Debian
sudo apt install iverilog yosys
```

nextpnr 要编译，比较麻烦。如果只想试试 UI，可以先不装。

### 3. 启动服务器

```bash
npm start
```

打开浏览器访问 http://localhost:3000

## 项目结构

```
webvado/
├── backend/              # Node.js + Express 后端
│   ├── server.js         # 服务器入口
│   ├── services/         # 核心服务（项目管理、文件管理、工具链调用）
│   └── routes/           # API 路由
├── frontend/             # 纯 HTML/CSS/JS 前端（无框架）
│   ├── index.html        # 主页面
│   ├── css/              # 样式文件
│   ├── js/               # 所有 JS 模块
│   │   ├── main.js       # 应用入口
│   │   ├── components/   # UI 组件（Dialog、FlowNavigator、SourcesPanel 等）
│   │   ├── managers/     # 管理器（ProjectManager、EditorManager、ConsoleManager）
│   │   ├── ui/           # UI 工具（UIManager、icons.js）
│   │   ├── editor/       # 代码编辑器
│   │   └── i18n/         # 多语言支持（英文/中文）
└── projects/             # 用户项目存储目录
```

## 功能清单

### 已实现

- ✅ 项目管理（创建、打开、保存）
- ✅ Vivado 风格的 Flow Navigator
- ✅ 代码编辑器（语法高亮）
- ✅ 文件树
- ✅ Tcl 控制台
- ✅ 波形查看器（VCD 文件）
- ✅ 多语言切换（中英文）
- ✅ 工具链调用接口
- ✅ WebSocket 实时通信

### 计划做

- ⏳ 真正集成 nextpnr（现在只接了 Yosys 和 Icarus）
- ⏳ Block Design（图形化设计，类似 IP Integrator）
- ⏳ 约束编辑器（XDC/PCF 文件）
- ⏳ 硬件管理器（Program Device）
- ⏳ 项目导入/导出
- ⏳ 深色主题

### 不会做

- ❌ 商业 FPGA 工具支持（Quartus / ISE / Vivado 本体）
- ❌ 专有 IP 核
- ❌ VHDL 支持（只支持 Verilog）

## 为什么做这个

Vivado 太重了。装一次要几十 GB，启动慢，授权麻烦。很多时候只是想改几行 Verilog、跑个仿真、看个波形，不需要那么重的工具。

开源工具链（Yosys + nextpnr）已经能支持很多 FPGA 了（iCE40、ECP5、Gowin 等），但没有好用的 IDE。WebVado 想做一个轻量的、浏览器里就能跑的开发环境。

## 技术选型

- **后端**：Node.js + Express
- **前端**：Vanilla JS（没用 React/Vue/Angular），ES6 模块
- **UI 风格**：模仿 Vivado 2017.4
- **图标**：全部手写 SVG，没有 emoji
- **多语言**：手写的 i18n 系统，不依赖库
- **离线**：所有静态资源本地加载，不依赖 CDN

选 Vanilla JS 是因为想控制包大小，不想引入几十 MB 的前端框架。所有 UI 组件都是手写的。

## 开发

### 添加新的 Flow Navigator 项目

编辑 `frontend/js/components/FlowNavigator.js`，在 `getSections()` 里加：

```javascript
{
  id: 'my-section',
  title: 'MY SECTION',
  items: [
    { 
      id: 'my-item', 
      iconSvg: Icons.play, 
      label: 'My Item', 
      action: 'my-action',
      playable: true  // 如果需要绿色播放按钮
    }
  ]
}
```

然后在 `main.js` 里注册事件：

```javascript
this.eventBus.on('action:my-action', () => this.handleMyAction());
```

### 添加新的对话框

在 `frontend/js/components/dialogs/` 下创建新文件，参考 `NewProjectDialog.js` 的写法。所有对话框按钮必须加 `type="button"`，否则会触发表单提交。

### 调试

打开浏览器 DevTools Console，所有组件都会打印初始化日志。服务器日志在 `backend/server.js` 里配置了 pino，会输出到终端。

## 已知问题

- VCD 波形查看器只能显示简单信号，复杂的总线和层次结构显示有 bug
- Tcl 控制台没有命令历史
- 代码编辑器的自动补全功能还没做
- 浏览器刷新后项目状态会丢失（需要重新打开）

## 贡献

欢迎 PR。开 issue 前先搜一下有没有重复的。

代码风格：
- 用 ES6 模块和 async/await
- 所有按钮必须有 `data-action` 属性
- CSS 用 BEM 命名
- 提交信息用中文，按 [Conventional Commits](https://www.conventionalcommits.org/) 格式

## 协议

MIT License

---

## 常见问题

**Q: 为什么点按钮没反应？**

A: 检查浏览器 Console 有没有报错。大部分"没反应"是因为 JS 模块加载失败或者事件没绑定上。

**Q: 为什么 Flow Navigator 的标题不显示？**

A: CSS 可能没加载。检查 Network 面板，看 `flow-navigator.css` 是不是 404。

**Q: 支持哪些 FPGA？**

A: 理论上支持 Yosys + nextpnr 支持的所有芯片（iCE40、ECP5、Nexus、Gowin、Anlogic 等）。但实际上我只在 iCE40HX8K 上测试过。

**Q: 能用 VHDL 吗？**

A: 不能。Yosys 对 VHDL 支持不完整，我也不想维护两套语言。

**Q: 能导入 Vivado 项目吗？**

A: 目前不能。Vivado 的项目文件格式是私有的。你可以把 .v 文件拷过来，但约束和 IP 核配置要手动重建。

**Q: 为什么不用 React？**

A: 因为想保持包大小小于 1MB。用 React 会引入一堆依赖，最后打包出来几十 MB。这个项目的目标是"能在 2G 内存的老电脑上流畅运行"。

**Q: 移动端能用吗？**

A: 勉强能用，但体验不好。UI 是按桌面设计的，屏幕小于 1024px 会挤成一团。

---

**最后**：这个项目还在早期开发阶段，很多功能是半成品。如果你发现 bug 或者有功能建议，开个 issue 或者直接提 PR。
