# Project structure

```app directory
app
│
├── Editor.tsx                  # the scenario page screen
│
├── layout.tsx
├── page.tsx                    # loads/saves project and instantiates Editor
├── projectLoader.tsx           # handles backwards compat
│
├── Project.tsx                 # the raw type definition of a Project
├── ProjectManager.tsx          # the Project wrapper class (handles the emulation)
│
├── devices                     # files related to virtual devices (for icons/serialization)
│   ├── Device.tsx              # `type Device`
│   ├── deviceTypesDB.tsx       # the list of available devices
│   ├── ICONS.tsx               # available device icons (as svg)
│   └── list/                   # the individual `Device`s
│
├── editorComponents            # react components
│   ├── Cables.tsx              # the cables in the canvas
│   ├── Chrono.tsx              # the chrono display
│   ├── Decals.tsx              # rects and labels in the canvas
│   ├── Devices.tsx             # devices in the canvas
│   ├── hooks.tsx               # custom react hooks
│   ├── PacketLog.tsx           # the left sidebar, that displays the packets sent
│   ├── PropertiesBar.tsx       # the right sidebar, controlled by the current tool
│   ├── reusable/               # generic components to be used in the UI
│   ├── ToolSelector.tsx        # the bottom bar, that selects the tool in use
│   └── TopBarBtns.tsx          # the buttons on the top bar
│
├── emulators                   # files related to the emulation of virtual devices
│   ├── DeviceEmulator.tsx      # definitions for CLI and the base for emulators
│   ├── list/                   # the emulators available to devices
│   ├── panels/                 # some reusable menus for the PropertiesBar
│   └── utils/                  # code that's reusable for emulators/virtualPrograms
│
├── protocols                   # files emulating real-life protocols
│   ├── packetEngine.tsx        # building blocks for protocol (de/)serialization
│   ├── packetEngineFields/     # extra fields used by (de/)serializers
│   └── ...                     # protocol implementations (+ small utilities)
│
├── tools                       # files that define how the different tools behave
│   ├── Tool.tsx                # base tool definition
│   ├── TOOL_ICONS.tsx          # available tool icons
│   └── ...                     # the tools
│
├── virtualPrograms/            # the programs used by the various emulators
│
├── common.tsx                  # random utilities
│
├── favicon.ico
└── globals.css                 # color definitions ready for light-dark theme
```
