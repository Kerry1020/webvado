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
    
    about: '关于 WebVado'
  },

  // 标题栏
  title: {
    noProject: 'WebVado - 未打开工程',
    withProject: 'WebVado - {name} [{path}]'
  },

  // 状态栏
  status: {
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
    projectManager: 'PROJECT MANAGER',
    ipIntegrator: 'IP INTEGRATOR',
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
    remove: '移除'
  },

  // 编辑器
  editor: {
    welcome: 'WebVado',
    welcomeMessage: '打开或创建一个工程开始使用。',
    newProject: '新建工程',
    openProject: '打开工程',
    unsavedChanges: '未保存的更改'
  },

  // 消息
  messages: {
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
    errorLoadProjects: '加载工程失败: {message}'
  }
};

// 默认导出中文
export default zh_CN;
