/**
 * 中文语言包
 */
export const zh_CN = {
  // 通用
  common: {
    ok: '确定',
    cancel: '取消',
    yes: '是',
    no: '否',
    save: '保存',
    close: '关闭',
    open: '打开',
    create: '创建',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    remove: '移除',
    search: '搜索',
    loading: '加载中...',
    error: '错误',
    success: '成功',
    warning: '警告',
    info: '信息'
  },

  // 菜单栏
  menu: {
    file: '文件',
    edit: '编辑',
    flow: '流程',
    tools: '工具',
    window: '窗口',
    help: '帮助',
    
    newProject: '新建工程...',
    openProject: '打开工程...',
    saveProject: '保存工程',
    closeProject: '关闭工程',
    exit: '退出',
    
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    find: '查找/替换',
    
    runSynthesis: '运行综合',
    runImplementation: '运行实现',
    generateBitstream: '生成比特流',
    runSimulation: '运行仿真',
    
    settings: '设置...',
    checkSyntax: '检查语法',
    compileOrder: '报告编译顺序',
    
    flowNavigator: 'Flow Navigator',
    sources: '源文件',
    console: '控制台',
    
    about: '关于 WebVado',
    language: '语言',
    projectSummary: '工程概要',
    documentation: '文档'
  },

  // 标题栏
  title: {
    noProject: 'WebVado - 未打开工程',
    withProject: 'WebVado - {name} [{path}]'
  },

  // 状态栏
  status: {
    implementing: '正在运行实现...',
    generatingBitstream: '正在生成位流...',
    ready: '就绪',
    noProject: '未打开工程',
    project: '工程: {name}',
    part: 'Part: {part}',
    saving: '保存中...',
    saved: '已保存',
    compiling: '编译中...',
    compiled: '编译完成',
    simulating: '仿真中...',
    simulated: '仿真完成'
  },
  netlist: {
    module: '网表模块', graph: '综合网表图',
    zoomIn: '放大', zoomOut: '缩小', fit: '适应窗口', empty: '网表中没有模块',
    hint: '拖动画布平移，滚轮缩放；选择单元查看端口、连线和参数。',
    timing: '时序', resources: '资源利用率'
  },
  hardware: {
    board: '开发板', automatic: '自动检测', cable: '连接线（可选）', serial: '序列号（可选）',
    target: '编程目标', loading: '正在加载支持的开发板...', ready: '请选择开发板或连接线。可先检测，再主动点击编程以烧录当前位流。',
    selectBoard: '编程前请选择开发板或输入连接线。', detect: '检测', program: '编程',
    detecting: '正在检测硬件...', programming: '正在编程设备...', detected: '已检测到硬件。',
    programmed: '设备编程成功。', notDetected: '未检测到硬件，请检查连接及开发板/连接线选择。'
  },

  // 对话框
  dialog: {
    newProject: {
      title: '新建工程',
      projectName: '工程名称:',
      projectNamePlaceholder: 'my_project',
      targetPart: '目标器件:',
      language: '设计语言:',
      languageVerilog: 'Verilog',
      languageVHDL: 'VHDL',
      parts: {
        ice40hx8k: 'iCE40 HX8K',
        ice40up5k: 'iCE40 UP5K',
        ecp5_85k: 'ECP5 85K',
        generic: '通用 (Generic)'
      }
    },

    openProject: {
      title: '打开工程',
      selectProject: '选择工程:',
      noProjects: '未找到工程',
      noProjectsMessage: '没有可用的工程。请先创建一个工程。'
    },

    closeProject: {
      title: '关闭工程',
      message: '确定要关闭当前工程吗？'
    },

    exit: {
      title: '退出',
      message: '确定要退出 WebVado 吗？'
    },

    settings: {
      title: '设置',
      categories: {
        general: '常规',
        synthesis: '综合',
        implementation: '实现',
        simulation: '仿真',
        bitstream: '比特流'
      },
      general: {
        title: '常规设置',
        autoSave: '自动保存',
        autoSaveDesc: '文件修改后自动保存',
        showLineNumbers: '显示行号',
        showLineNumbersDesc: '在编辑器中显示行号',
        tabSize: 'Tab 大小',
        tabSizeDesc: 'Tab 键对应的空格数'
      },
      synthesis: {
        title: '综合设置',
        strategy: '综合策略',
        strategyDesc: '选择综合优化策略',
        strategies: {
          default: '默认',
          area: '面积优化',
          speed: '速度优化',
          power: '功耗优化'
        }
      },
      simulation: {
        title: '仿真设置',
        simulator: '仿真器',
        simulatorDesc: '选择 HDL 仿真器',
        runTime: '运行时间',
        runTimeDesc: '仿真运行时长 (ns)'
      }
    },

    about: {
      title: '关于 WebVado',
      version: '版本 {version}',
      description: '开源的网页版 FPGA 开发环境',
      subtitle: '基于 Icarus Verilog、Yosys 和 nextpnr 构建',
      toolchainStatus: '工具链状态',
      found: '已安装',
      notFound: '未安装',
      copyright: 'Copyright © 2026 WebVado Contributors',
      license: 'MIT License',
      tools: {
        iverilog: 'Icarus Verilog',
        verilator: 'Verilator',
        yosys: 'Yosys',
        nextpnr_ice40: 'nextpnr-ice40',
        nextpnr_ecp5: 'nextpnr-ecp5',
        icepack: 'icepack',
        iceprog: 'iceprog'
      }
    }
  },

  // Console
  console: {
    welcome: 'WebVado {version} (Alpha)',
    copyright: 'Copyright 2026 WebVado Contributors',
    helpPrompt: '输入 "help" 查看可用命令',
    commands: {
      help: 'help - 显示帮助信息',
      clear: 'clear - 清空控制台',
      pwd: 'pwd - 显示当前目录',
      ls: 'ls - 列出文件',
      version: 'version - 显示版本信息'
    },
    noProject: '未打开工程',
    unknownCommand: '未知命令: {cmd}。输入 "help" 查看可用命令。'
  },

  // Flow Navigator
  flowNav: {
    projectManager: '工程管理',
    ipIntegrator: 'IP 集成',
    simulation: '仿真',
    rtlAnalysis: 'RTL 分析',
    synthesis: '综合',
    implementation: '实现',
    programDebug: '编程与调试',
    
    settings: '设置',
    addSources: '添加源文件',
    langTemplates: '语言模板',
    ipCatalog: 'IP 目录',
    
    createBlock: '创建块设计',
    openBlock: '打开块设计',
    
    simSettings: '仿真设置',
    runSim: '运行仿真',
    
    openElab: '打开细化设计',
    schematic: '原理图',
    reportDrc: '报告 DRC',
    
    runSynth: '运行综合',
    openSynth: '打开综合设计',
    
    runImpl: '运行实现',
    openImpl: '打开实现设计',
    
    genBitstream: '生成比特流',
    openHw: '打开硬件管理器',
    programDevice: '编程器件'
  },

  // Sources Panel
  sources: {
    designSources: '设计源文件',
    constraints: '约束文件',
    simulationSources: '仿真源文件',
    utilitySources: '实用文件',
    
    addSources: '添加源文件',
    createFile: '创建文件',
    addFile: '添加文件',
    setAsTop: '设为顶层模块',
    remove: '移除',
    open: '打开',
    noFiles: '无文件',
    addSourcesTitle: '添加源文件',
    fileType: '文件类型:',
    typeDesign: '设计源文件 (srcs/rtl)',
    typeConstraint: '约束文件 (srcs/constrs)',
    typeSimulation: '仿真源文件 (srcs/sim)',
    fileName: '文件名:',
    fileNamePlaceholder: 'top.v',
    addExisting: '添加已有文件...',
    invalidFileName: '只能用字母、数字、_ - .，并带扩展名，如 .v',
    searchTitle: '搜索源文件',
    searchPrompt: '文件名包含:',
    removeConfirm: '从工程中移除 {name}？文件会从磁盘删除。'
  },

  // 编辑器
  editor: {
    findTerm: '查找：', replaceWith: '替换为：', replaceAll: '全部替换', findNext: '查找下一个',
    notFound: '未找到“{term}”', replaced: '已替换 {count} 处',
    welcome: '欢迎使用 WebVado',
    welcomeMessage: '开源 FPGA 开发环境',
    newProject: '新建工程',
    openProject: '打开已有工程',
    unsavedChanges: '未保存的更改',
    noFile: '未打开文件',
    examples: '示例工程',
    github: 'GitHub 仓库'
  },

  // 面板与标签页
  panel: {
    flowNavigator: 'Flow Navigator',
    sources: '源文件',
    netlist: '网表',
    compileOrder: '编译顺序',
    tclConsole: 'Tcl 控制台',
    messages: '消息',
    logs: '日志',
    reports: '报告',
    refresh: '刷新',
    clear: '清空',
    scrollBottom: '滚动到底部',
    commandPlaceholder: '在此输入命令',
    status: '状态:',
    minimize: '最小化',
    maximize: '最大化',
    close: '关闭'
  },

  // 消息
  messages: {
    saveAgain: '保存过程中编辑器内容发生变化，请保存最新修改后再构建。',
    implSuccess: '布局布线实现成功。',
    bitstreamSuccess: '位流生成成功。',
    runImplementationFirst: '请先运行实现。',
    runSynthesisFirst: '请先运行综合，再查看生成的网表。',
    clipboardUnavailable: '剪贴板不可用，请手动选择并复制模板。',
    featureUnavailable: '尚未实现：当前工具链集成暂不支持此功能。',
    projectCreated: '工程 "{name}" 已创建 ({id})',
    projectOpened: '已打开工程: {name}',
    projectClosed: '工程已关闭。',
    projectSaved: '工程已保存。',
    fileSaved: '已保存: {filename}',
    fileOpened: '已打开: {filename}',
    
    synthSuccess: '综合成功完成',
    synthFailed: '综合失败: {message}',
    simSuccess: '仿真成功完成',
    simFailed: '仿真失败: {message}',
    
    toolNotFound: '工具 {tool} 未安装',
    toolRequired: '需要安装 {tool}',
    installCommand: '安装命令: {command}',
    
    error: '错误: {message}',
    errorOpenFile: '打开文件失败: {message}',
    errorSaveFile: '保存文件失败: {message}',
    errorCreateProject: '创建工程失败: {message}',
    errorLoadProjects: '加载工程失败: {message}',
    noProjectOpen: '请先打开或新建一个工程。',
    notAvailableTitle: '{feature}',
    notAvailable: '{feature} 需要 {tool}，WebVado 目前还没有集成。',
    toolchainMissing: '本机没有安装 {tool}。安装方法: {command}',
    unsavedConfirm: '{name} 有未保存的修改，确定放弃？',
    discard: '放弃修改'
  }
};

// 默认导出中文
export default zh_CN;
