This is an adapted version of my cli tool for digital signature [https://github.com/AlessioScarfone/Java-Digital-Signature], slightly modified to communicate with a chrome extension.

The fundamental change is the adjunct of a middleware object that read the messages of the Chrome Extension, in JSON format, and format them for adapt to command line parameters.