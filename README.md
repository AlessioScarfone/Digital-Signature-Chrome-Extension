# Digital-Signature-Chrome-Extension

#### > Sorry, README under construction... :construction_worker: 

### Introduction

This project aim to create an integration of digital signature, with pkcs#11 token, within Chrome browser.
The extension interact with a native application developed in java which has the purpose of directly interact with the cryptographic harware. 
The user through the extension can signing a document (PDF) openend in a browser tab.
The software support CAdES and PAdES signature (both visible and not visible type).

### The native application

The native application is an adapted version of my cli tool [https://github.com/AlessioScarfone/Java-Digital-Signature], slightly modified to communicate with a chrome extension.
The fundamental change is the adjunct of a middleware object that read the messages from the extension, in JSON format, and format them for adapt to command line parameters and return the response to the browser.

----

### Installation
**Work in progress...** :construction_worker: :computer:

### Usage
**Work in progress...** :construction_worker: :computer:

----

### Project Structure  :construction_worker: :computer:

Folder structure:
- **app**: contains the source of the chrome extension.
- **hostapp-src**: contains the source code of the native application.
- **hostapp-dist**: contains all the files necessary for installing and running the application. 


###  Chrome Extension structure
**Work in progress...** :construction_worker: :computer:

-----

#### NOTE:
- Tested only on **Windows 10 (JDK8 u181).**

- **Tested with Aruba Token Usb with Italian CNS**: [Link to Aruba token page](https://www.pec.it/cns-token.aspx)

![Token Image](https://www.pec.it/getattachment/20362be8-daa3-44a6-9a91-4d801245baa7/Token)
