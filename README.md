# Digital-Signature-Chrome-Extension

## Work in progress... :construction_worker: :computer:

### Introduction
This project aim to create an integration of digital signature, with pkcs#11 token, within Chrome browser.
The extension interact with a native application developed in java which has the purpose of directly interact with the cryptographic harware. 
The user through the extension can signing a document (PDF) openend in a browser tab.
The software support CAdES and PAdES signature (both visible and not visible type).

#### The native application
The native application is an adapted version of my cli tool [https://github.com/AlessioScarfone/Java-Digital-Signature], slightly modified to communicate with a chrome extension.
The fundamental change is the adjunct of a middleware object that read the messages from the extension, in JSON format, and format them for adapt to command line parameters and return the response to the browser.
----

### Installation
**Work in progress...** :construction_worker: :computer:

### Usage
**Work in progress...** :construction_worker: :computer:

---- 
### Technical detail and project structure
#### Project Structure
**Work in progress...** :construction_worker: :computer:

#### Chrome Extension structure
**Work in progress...** :construction_worker: :computer:
