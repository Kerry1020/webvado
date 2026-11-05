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
    language: 'Language',
    projectSummary: 'Project Summary',
    documentation: 'Documentation'
  },

  // Title
  title: {
    noProject: 'WebVado - No Project Open',
    withProject: 'WebVado - {name} [{path}]'
  },

  // Status
  status: {
    implementing: 'Running implementation...',
    generatingBitstream: 'Generating bitstream...',
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
  netlist: {
    module: 'Netlist module', graph: 'Synthesized netlist graph',
    zoomIn: 'Zoom In', zoomOut: 'Zoom Out', fit: 'Fit', empty: 'No modules in netlist',
    hint: 'Drag background to pan. Scroll to zoom. Select a cell for ports, connections and parameters.',
    timing: 'Timing', resources: 'Resource utilization'
  },
  hardware: {
    board: 'Board', automatic: 'Automatic detection', cable: 'Cable (optional)', serial: 'Serial number (optional)',
    target: 'Programming target', loading: 'Loading supported boards...', ready: 'Select a board or cable. Detect first, then click Program to program the current bitstream.',
    selectBoard: 'Select a board or enter a cable before programming.', detect: 'Detect', program: 'Program',
    detecting: 'Detecting hardware...', programming: 'Programming device...', detected: 'Hardware detected.',
    programmed: 'Device programmed successfully.', notDetected: 'No hardware detected. Check connection and board/cable selection.'
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
    remove: 'Remove',
    open: 'Open',
    noFiles: 'No files',
    addSourcesTitle: 'Add Sources',
    fileType: 'File type:',
    typeDesign: 'Design source (srcs/rtl)',
    typeConstraint: 'Constraint (srcs/constrs)',
    typeSimulation: 'Simulation source (srcs/sim)',
    fileName: 'File name:',
    fileNamePlaceholder: 'top.v',
    addExisting: 'Add Existing Files...',
    invalidFileName: 'Use letters, digits, _ - . only, with an extension like .v',
    searchTitle: 'Search Sources',
    searchPrompt: 'File name contains:',
    removeConfirm: 'Remove {name} from the project? The file is deleted from disk.'
  },

  // Editor
  editor: {
    findTerm: 'Find:', replaceWith: 'Replace with:', replaceAll: 'Replace All', findNext: 'Find Next',
    notFound: '"{term}" not found', replaced: '{count} replaced',
    welcome: 'Welcome to WebVado',
    welcomeMessage: 'Open-source FPGA Development Environment',
    newProject: 'Create New Project',
    openProject: 'Open Existing Project',
    unsavedChanges: 'Unsaved Changes',
    noFile: 'No file open',
    examples: 'Example Projects',
    github: 'GitHub Repository'
  },

  // Panels and tabs
  panel: {
    flowNavigator: 'Flow Navigator',
    sources: 'Sources',
    netlist: 'Netlist',
    compileOrder: 'Compile Order',
    tclConsole: 'Tcl Console',
    messages: 'Messages',
    logs: 'Logs',
    reports: 'Reports',
    refresh: 'Refresh',
    clear: 'Clear',
    scrollBottom: 'Scroll to Bottom',
    commandPlaceholder: 'Type a command here',
    status: 'Status:',
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close'
  },

  // Messages
  messages: {
    saveAgain: 'The editor changed during saving. Save the latest edits before building.',
    implSuccess: 'Implementation completed successfully.',
    bitstreamSuccess: 'Bitstream generated successfully.',
    runImplementationFirst: 'Run Implementation first.',
    runSynthesisFirst: 'Run Synthesis to view the generated netlist.',
    clipboardUnavailable: 'Clipboard access is unavailable. Select and copy the template manually.',
    featureUnavailable: 'Not implemented: this feature is unavailable in the current toolchain integration.',
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
    errorLoadProjects: 'Failed to load projects: {message}',
    noProjectOpen: 'Open or create a project first.',
    notAvailableTitle: '{feature}',
    notAvailable: '{feature} needs {tool}, which WebVado does not integrate yet.',
    toolchainMissing: '{tool} is not installed on this machine. Install it with: {command}',
    unsavedConfirm: '{name} has unsaved changes. Discard them?',
    discard: 'Discard'
  }
};

export default en_US;
