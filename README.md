# Digital-Signature-Chrome-Extension

<p align="center"> <img src="app/icon/icon128.png"> </p>
  
### 1. Introduction

The aim of this project is to create an integration of digital signature, with pkcs#11 token, within Chrome browser.
The extension interact with a native application developed in java which has the purpose of directly interact with the cryptographic harware. 
The user through the extension can sign a document (PDF) opened in a browser tab.
The software supports CAdES and PAdES signature (both visible and not visible type).
The app allows to sign both online document and local files.

### 2. Native application

The native application is an adapted version of my cli tool ( https://github.com/AlessioScarfone/Java-Digital-Signature ), slightly modified to communicate with a chrome extension.
The fundamental change is the adding of a middleware object that read the messages from the extension, in JSON format, and format them for adapt to command line parameters and return the response to the browser.

----

### 3. Installation

**Prerequisites:**
- Chrome Browser
- Java 8
- Token PKCS #11

**:one: :  DOWNLOAD REQUIRED FILES**

The necessary folders of the project for the installation are: 
- **app**: it contains the extension source code and will be used as *Unpacked Extension*.
- **hostapp-dist**: it contains all files for the native application.

Create a folder that contains them.

**:two: :  INSTALL THE CHROME EXTENSION**

- Open Chrome and enter `chrome://extensions/` into your address bar.
- Click on the “developer mode” toggle in the upper-right corner.
- Click no "**Load Unpacked**" and select the "**app**" folder.
At this point in the extension list will appear the loaded extension.

![Loaded_Ext](./readme-image/loaded-ext.PNG)

Copy the ID (look at the image), you will need it later..

**:three: : INSTALL NATIVE APP**

- Go into **hostapp-dist** folder
- open manifest.json file and modify the "allowed_origins" value with your loaded extension ID.

"allowed_origins": [
    "chrome-extension://YOUR_EXTESION_ID/"
  ]

- After this, run the `install_host.bat` script that will create some registry key that are necessary for using the native application.

**NOW YOU CAN USE THE APPLICATION :smile:** 

> **NOTE:** for **uninstall** the application is enough remove the extension from chrome and run `uninstall_host.bat`


### 4. Usage

<ol>
  <li>Open pdf with browser (local or online file).</li>
  <li>Click on extension icon, this will open a popup.</li>
  <li>Select the type of signature you want:</li>
  4.1. <b>CAdES or PAdES not visible </b>
  <ol> 
    <li>Insert password.</li>
    <li>The extension will download the file (if is online) and sign the pdf.</li>
  </ol>
  4.2. <b>PAdES visible signature</b>
  <ol> 
    <li>The extension will download the file (if is online) and retrieve informations about pdf, like page number and signature fields.</li>
    <li>Configure the setting for visible signature: page and position or if some fields are present, you can select the preferred field to use for signature.</li>
    <li>Go to next step and insert password and sign the pdf.</li>
  </ol>
 5. At the end of procedure you will see a confirm message or, if any problem will rise, you will see an error message.
    
</ol>

**NOTE:**  if the pdf contains signable fields and you have selected "PAdES visible signature", the app may modify the look of the chrome pdf viewer for add the name of the fields "above"  the  pdf ,trying the use more accurate position and respecting the zoom.

----

### 5. Project Structure

**Folder structure:**
- **app**: it contains the source of the chrome extension.
- **hostapp-src**:  it contains the source code of the native application.
- **hostapp-dist**: it contains all the files necessary for installing and running the application. 

Chrome extension gets data from browser and pass it to native application using [Chrome Native Messaging](https://developer.chrome.com/extensions/nativeMessaging). A middleware parses the received message from the browser and prepare data for the native application that will sign the document and return the data needed for the extension.


####  5.1. Chrome Extension structure
**Work in progress...** :construction_worker: :computer:

**Extension components:**
- **Popup/Page Action**: the UI of the extension, which can be activated only on the tabs that contain a pdf. Allows the user to choose the type of signatures and enter the necessary data such as password, field to sign etc.
The script is also responsible for downloading the file and injection the content script if necessary.
- **Background Script**: the script that manages communication with the native app and provides storage services to restore the state of the popup and data. (Allows the user to temporarily close the popup and finish the operation later)
- **Content Script**: (used only for PAdES visible signature). The PDF browser viewer does not show names of signature fields, so this script adds the name of the fields "above" the pdf viewer.

> For details about Chrome Extension Architecture: https://developer.chrome.com/extensions/overview


-----

#### NOTE:
- Tested on: **Windows 10, 8.1 (Oracle JDK8).**

- **Tested with Bit4id smart card reader and an Italian CNS** (all provided by Aruba): 

    [Link to Aruba page](https://www.pec.it/cns-token.aspx) 
    
    [Link to Bit4id usb token](https://www.bit4id.com/en/lettore-di-smart-card-minilector-s-evo/)

![Token Image](https://www.pec.it/getattachment/20362be8-daa3-44a6-9a91-4d801245baa7/Token)
