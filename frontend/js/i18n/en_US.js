/**
 * 英文语言包
 */
export const en_US = {
  // Common
  common: {
    ok: 'OK',
    cancel: 'Cancel',
    yes: 'Yes',
    no: 'No',
    save: 'Save',
    close: 'Close',
    open: 'Open',
    create: 'Create',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    remove: 'Remove',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    warning: 'Warning',
    info: 'Info'
  },

  // Menu
  menu: {
    file: 'File',
    edit: 'Edit',
    flow: 'Flow',
    tools: 'Tools',
    window: 'Window',
    help: 'Help',
    
    newProject: 'New Project...',
    openProject: 'Open Project...',
    saveProject: 'Save Project',
    closeProject: 'Close Project',
    exit: 'Exit',
    
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    find: 'Find/Replace',
    
    runSynthesis: 'Run Synthesis',
    runImplementation: 'Run Implementation',
    generateBitstream: 'Generate Bitstream',
    runSimulation: 'Run Simulation',
    
    settings: 'Settings...',
    checkSyntax: 'Check Syntax',
    compileOrder: 'Report Compile Order',
    
    flowNavigator: 'Flow Navigator',
    sources: 'Sources',
    console: 'Console',
    
    about: 'About WebVado',
    language: 'Language'
  },

  // Title
  title: {
    noProject: 'WebVado - No Project Open',
    withProject: 'WebVado - {name} [{path}]'
  },

  // Status
  status: {
    ready: 'Ready',
    noProject: 'No Project Open',
    project: 'Project: {name}',
    part: 'Part: {part}',
    saving: 'Saving...',
    saved: 'Saved',
    compiling: 'Compiling...',
    compiled: 'Compiled',
    simulating: 'Simulating...',
    simulated: 'Simulated'
  },

  // Dialogs
  dialog: {
    newProject: {
      title: 'New Project',
      projectName: 'Project name:',
      projectNamePlaceholder: 'my_project',
      targetPart: 'Target part:',
      language: 'Design language:',
      languageVerilog: 'Verilog',
      languageVHDL: 'VHDL',
      parts: {
        ice40hx8k: 'iCE40 HX8K',
        ice40up5k: 'iCE40 UP5K',
        ecp5_85k: 'ECP5 85K',
        generic: 'Generic'
      }
    },

    openProject: {
      title: 'Open Project',
      selectProject: 'Select project:',
      noProjects: 'No Projects',
      noProjectsMessage: 'No projects found. Create one first.'
    },

    closeProject: {
      title: 'Close Project',
      message: 'Close current project?'
    },

    exit: {
      title: 'Exit',
      message: 'Exit WebVado?'
    },

    settings: {
      title: 'Settings',
      categories: {
        general: 'General',
        synthesis: 'Synthesis',
        implementation: 'Implementation',
        simulation: 'Simulation',
        bitstream: 'Bitstream'
      },
      general: {
        title: 'General Settings',
        autoSave: 'Auto Save',
        autoSaveDesc: 'Automatically save files',
        showLineNumbers: 'Show Line Numbers',
        showLineNumbersDesc: 'Display line numbers in editor',
        tabSize: 'Tab Size',
        tabSizeDesc: 'Spaces per tab'
      },
      synthesis: {
        title: 'Synthesis Settings',
        strategy: 'Strategy',
        strategyDesc: 'Synthesis optimization strategy',
        strategies: {
          default: 'Default',
          area: 'Area Optimization',
          speed: 'Speed Optimization',
          power: 'Power Optimization'
        }
      },
      simulation: {
        title: 'Simulation Settings',
        simulator: 'Simulator',
        simulatorDesc: 'HDL simulator',
        runTime: 'Run Time',
        runTimeDesc: 'Simulation duration (ns)'
      }
    },

    about: {
      title: 'About WebVado',
      version: 'Version {version}',
      description: 'Open-source web-based FPGA IDE',
      subtitle: 'Built on Icarus Verilog, Yosys and nextpnr',
      toolchainStatus: 'Toolchain Status',
      found: 'Installed',
      notFound: 'Not Installed',
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
    helpPrompt: 'Type "help" for available commands',
    commands: {
      help: 'help - Show this help',
      clear: 'clear - Clear console',
      pwd: 'pwd - Print working directory',
      ls: 'ls - List files',
      version: 'version - Show version'
    },
    noProject: 'No project open',
    unknownCommand: 'Unknown command: {cmd}. Type "help" for available commands.'
  },

  // Flow Navigator
  flowNav: {
    projectManager: 'PROJECT MANAGER',
    ipIntegrator: 'IP INTEGRATOR',
    simulation: 'SIMULATION',
    rtlAnalysis: 'RTL ANALYSIS',
    synthesis: 'SYNTHESIS',
    implementation: 'IMPLEMENTATION',
    programDebug: 'PROGRAM AND DEBUG',
    
    settings: 'Settings',
    addSources: 'Add Sources',
    langTemplates: 'Language Templates',
    ipCatalog: 'IP Catalog',
    
    createBlock: 'Create Block Design',
    openBlock: 'Open Block Design',
    
    simSettings: 'Simulation Settings',
    runSim: 'Run Simulation',
    
    openElab: 'Open Elaborated Design',
    schematic: 'Schematic',
    reportDrc: 'Report DRC',
    
    runSynth: 'Run Synthesis',
    openSynth: 'Open Synthesized Design',
    
    runImpl: 'Run Implementation',
    openImpl: 'Open Implemented Design',
    
    genBitstream: 'Generate Bitstream',
    openHw: 'Open Hardware Manager',
    programDevice: 'Program Device'
  },

  // Sources
  sources: {
    designSources: 'Design Sources',
    constraints: 'Constraints',
    simulationSources: 'Simulation Sources',
    utilitySources: 'Utility Sources',
    
    addSources: 'Add Sources',
    createFile: 'Create File',
    addFile: 'Add File',
    setAsTop: 'Set as Top',
    remove: 'Remove'
  },

  // Editor
  editor: {
    welcome: 'WebVado',
    welcomeMessage: 'Open or create a project to get started.',
    newProject: 'New Project',
    openProject: 'Open Project',
    unsavedChanges: 'Unsaved Changes'
  },

  // Messages
  messages: {
    projectCreated: 'Project "{name}" created ({id})',
    projectOpened: 'Opened project: {name}',
    projectClosed: 'Project closed.',
    projectSaved: 'Project saved.',
    fileSaved: 'Saved: {filename}',
    fileOpened: 'Opened: {filename}',
    
    synthSuccess: 'Synthesis completed successfully',
    synthFailed: 'Synthesis failed: {message}',
    simSuccess: 'Simulation completed successfully',
    simFailed: 'Simulation failed: {message}',
    
    toolNotFound: 'Tool {tool} not found',
    toolRequired: 'Tool {tool} required',
    installCommand: 'Install: {command}',
    
    error: 'Error: {message}',
    errorOpenFile: 'Failed to open file: {message}',
    errorSaveFile: 'Failed to save file: {message}',
    errorCreateProject: 'Failed to create project: {message}',
    errorLoadProjects: 'Failed to load projects: {message}'
  }
};

export default en_US;
