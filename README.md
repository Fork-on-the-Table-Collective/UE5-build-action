
# Unreal Engine 5 Build Action

## Overview

This GitHub Action builds an Unreal Engine 5 (UE5) project on Windows or macOS. It supports both development and shipping configurations and provides various customization options for the build process.


## Inputs

The action requires the following inputs:

- **`enginePath`**  
  Path to the UE engine folder (e.g., `C:/Program Files/Epic Games/UE_5.4`)  
  *Required*: `true`  
  *Default*: `""`

- **`uprojectPath`**  
  Path to your `.uproject` file  
  *Required*: `true`  
  *Default*: `""`

The following inputs are optional and provide additional configuration:

- **`buildConfig`**  
  Configuration to use (e.g., Development, Shipping)  
  *Required*: `false`  
  *Default*: `Development`

- **`platform`**  
  Target platform (e.g., Win64, Mac)  
  *Required*: `false`  
  *Default*: `Win64`

- **`clean`**  
  Whether to clean the build  
  *Required*: `false`  
  *Default*: `"false"`

- **`cook`**  
  Whether to cook the project  
  *Required*: `false`  
  *Default*: `"true"`

- **`compressed`**  
  Whether to compress the build  
  *Required*: `false`  
  *Default*: `"true"`

- **`UpdateIfNeeded`**  
  Whether to update if needed  
  *Required*: `false`  
  *Default*: `"true"`

- **`stage`**  
  Whether to stage the build  
  *Required*: `false`  
  *Default*: `"true"`

- **`package`**  
  Whether to package the build  
  *Required*: `false`  
  *Default*: `"false"`

- **`pak`**  
  Whether to package files  
  *Required*: `false`  
  *Default*: `"false"`

- **`server`**  
  Whether to include the server  
  *Required*: `false`  
  *Default*: `"false"`

- **`archive`**  
  Whether to create an archive  
  *Required*: `false`  
  *Default*: `"false"`

- **`archivePath`**  
  Path to the archive  
  *Required*: `false`  
  *Default*: `""`

- **`nullrhi`**  
  Whether to execute commands without video output  
  *Required*: `false`  
  *Default*: `"false"`

- **`editor`**  
  Whether to compile the editor as well  
  *Required*: `false`  
  *Default*: `"true"`

- **`encryptIniFiles`**  
  Whether to encrypt INI files  
  *Required*: `false`  
  *Default*: `"false"`

- **`release`**  
  Create a release version (enter new release version number)  
  *Required*: `false`  
  *Default*: `"false"`

- **`patch`**  
  Generate a patch based on a release version (enter release version number)  
  *Required*: `false`  
  *Default*: `"false"`

- **`maps`**  
  Maps to build and package (comma-separated list of maps, leave `"false"` for all maps)  
  *Required*: `false`  
  *Default*: `"false"`

- **`deletePDB`**  
  Whether to delete PDB (debug) files  
  *Required*: `false`  
  *Default*: `"false"`

- **`anticheatEnabled`**  
  Whether to enable anticheat  
  *Required*: `false`  
  *Default*: `"false"`

- **`anticheatPrivateKey`**  
  Base64 encoded private key for anticheat  
  *Required*: `false`  
  *Default*: `""`

- **`anticheatPublicCert`**  
  Base64 encoded public certificate for anticheat  
  *Required*: `false`  
  *Default*: `""`

## Usage

Add the action to your GitHub workflow YAML file:

```yaml
name: Build Unreal Engine 5 Project

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v3

    - name: Build UE5 Project
      uses: Fork-on-the-Table-Collective/UE5-build-action@v1
      with:
        enginePath: 'C:/Program Files/Epic Games/UE_5.4'
        uprojectPath: 'path/to/your/project.uproject'
        buildConfig: 'Development'
        platform: 'Win64'
        # Add other optional parameters as needed
```

## Outputs

This action does not define any outputs.

## Example

Here’s an example workflow configuration using this action:

```yaml
name: Build Unreal Engine 5

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Build Unreal Engine 5 Project
        uses: Fork-on-the-Table-Collective/UE5-build-action@v1
        with:
          enginePath: 'C:/Program Files/Epic Games/UE_5.4'
          uprojectPath: 'path/to/your/project.uproject'
          buildConfig: 'Shipping'
          platform: 'Win64'
          clean: 'true'
          cook: 'true'
          compressed: 'true'
          UpdateIfNeeded: 'true'
          stage: 'true'
          package: 'false'
          pak: 'false'
          server: 'false'
          archive: 'false'
          archivePath: 'path/to/archive'
          nullrhi: 'false'
          editor: 'true'
          encryptIniFiles: 'false'
          release: '1.0.0'
          patch: '1.0.1'
          maps: 'Map1,Map2'
          deletePDB: 'false'
          anticheatEnabled: 'true'
          anticheatPrivateKey: 'base64-private-key'
          anticheatPublicCert: 'base64-public-cert'
```

## Contributing

If you want to contribute to this action, please submit a pull request with your changes.

## License

This action is licensed under the MIT License.


