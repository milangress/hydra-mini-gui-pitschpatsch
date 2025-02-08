# hydra-mini-gui

A plugin for Hydra that automatically creates a GUI interface for controlling numeric values in your code.

## Loading

Run this line inside the Hydra editor to load the extension:

```js
await loadScript("https://path-to-your-hosted-file/hydra-mini-gui.js")
```

## Overview

This extension creates a floating GUI panel that lets you control numeric values in your Hydra code using sliders and other controls. It automatically detects numbers in your code and creates appropriate controls.

## Features

- Automatically detects numeric values in code
- Creates sliders for controlling values
- Updates code in real-time as values change
- Preserves code structure while updating values

## Usage

After loading the script, a GUI panel will automatically appear with controls for any numeric values in your current code. You can:

1. Drag sliders to adjust values
2. Type in precise values
3. Click the GUI title to collapse/expand
4. Click and drag the GUI title to move the panel

## Example

```js
osc(40,0.1,0.8)
  .rotate(0.5)
  .out()
```

Will create sliders for:
- `40` (frequency)
- `0.1` (sync)
- `0.8` (offset)
- `0.5` (rotation)

## Development

This is an experimental plugin. Please report any issues or feature requests on GitHub. 