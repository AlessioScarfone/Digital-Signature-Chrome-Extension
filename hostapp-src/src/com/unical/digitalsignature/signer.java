/*Copyright 2018 Alessio Scarfone
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package com.unical.digitalsignature;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.List;
import java.util.logging.Level;

import org.json.JSONObject;

import com.beust.jcommander.ParameterException;
import com.google.common.io.Files;
import com.google.common.io.Resources;
import com.unical.argparser.ArgsParser;
import com.unical.argparser.MiddlewareChrome;
import com.unical.utils.PAdESProp;
import com.unical.utils.Utility;

import eu.europa.esig.dss.AbstractSignatureParameters;
import eu.europa.esig.dss.DSSASN1Utils;
import eu.europa.esig.dss.DSSDocument;
import eu.europa.esig.dss.DSSException;
import eu.europa.esig.dss.DigestAlgorithm;
import eu.europa.esig.dss.FileDocument;
import eu.europa.esig.dss.SignatureValue;
import eu.europa.esig.dss.ToBeSigned;
import eu.europa.esig.dss.signature.AbstractSignatureService;
import eu.europa.esig.dss.token.DSSPrivateKeyEntry;
import eu.europa.esig.dss.token.Pkcs11SignatureToken;
import eu.europa.esig.dss.x509.CertificateToken;

public class signer {
	private static String className = "signer";

	private enum SystemType {
		WINDOWS, LINUX, MAC
	}

	private static File driverPathWin = new File(Utility.buildFilePath("driver", "Windows", "bit4xpki.dll"));
	private static String resource_DriverPathWindows = "resources/driver/Windows/bit4xpki.dll";

	// TODO: currently they are not present in GitHub folder - Test on linux
	private static File driverPathLinux32 = new File(Utility.buildFilePath("driver", "Linux", "32", "libbit4xpki.so"));
	private static String resource_DriverPathLinux32 = "resources/driver/Linux/32/libbit4xpki.so";
	private static File driverPathLinux64 = new File(Utility.buildFilePath("driver", "Linux", "64", "libbit4xpki.so"));
	private static String resource_DriverPathLinux64 = "resources/driver/Linux/64/libbit4xpki.so";

	private static File currentDriverPath = null;

	private static SignFormat selectedSignFormat = SignFormat.PADES;

	public static void main(String[] args) {
		// hide warning for external library.
		System.setProperty("org.apache.commons.logging.Log", "org.apache.commons.logging.impl.NoOpLog");
		System.setProperty(org.slf4j.impl.SimpleLogger.DEFAULT_LOG_LEVEL_KEY, Level.OFF.toString());

		MiddlewareChrome.log(className, "------------ Start Main --------------");
		if (args[0].equals("ChromeExtensionMessage")) {
			MiddlewareChrome.log(className, "Connect with Chrome extension");
			MiddlewareChrome middlewareChrome = MiddlewareChrome.getInstance();
			middlewareChrome.readMessage();

			if (middlewareChrome.getRequestedAction().equals(MiddlewareChrome.ACTION_INFO)) {
				try {
					JSONObject pdfInfo = middlewareChrome.getPdfInfo();
					middlewareChrome.sendMessage(pdfInfo.toString());
				} catch (IOException e) {
					MiddlewareChrome.log(className, "ERROR :: get Info pdf");
					MiddlewareChrome.getInstance().sendError("Unable to get information of the pdf");
				}
				middlewareChrome.readMessage();
			}

			if (middlewareChrome.getRequestedAction().equals(MiddlewareChrome.ACTION_SIGN)) {
				args = middlewareChrome.createArgsList();
				try {
					middlewareChrome.sendMessage("{\"native_app_message\":\"start\"}");
				} catch (IOException e) {
					MiddlewareChrome.log(className, e.getMessage());
				}
			}
		}

		ArgsParser cmdr = ArgsParser.getInstance();
		try {
			cmdr.parseArgs(args);
		} catch (ParameterException | NullPointerException e) {
			MiddlewareChrome.log(className, "ERROR :: Parameter Error.");
			return;
		}
		// Show help
		if (cmdr.isHelp()) {
			cmdr.showHelp();
			return;
		}

		// use custom or default driver
		if (cmdr.getDriver() != null) {
			if (setDriver(cmdr.getDriver()) == false) {
				MiddlewareChrome.log(className, "ERROR :: Error setting driver");
				return;
			}
		} else
			useDefaultDriver();

		// show certificates info and key usage
		if (cmdr.showCertInfo() || cmdr.showKeyUsage()) {
			showInfo(cmdr.showCertInfo(), cmdr.showKeyUsage());
			return;
		}

		// check selected sign format
		if (!checkSelectedSignFormat()) {
			MiddlewareChrome.log(className, "ERROR :: Select (only) one between PAdES and CAdES.");
			return;
		}

		File inputFile = cmdr.getFileToSign();
		if (inputFile == null) {
			MiddlewareChrome.log(className, "ERROR :: No File input");
			return;
		}

		// check file to sign format
		if (!checkFile(inputFile))
			return;

		sign(inputFile);

	}

	private static boolean checkSelectedSignFormat() {
		ArgsParser cmdr = ArgsParser.getInstance();
		selectedSignFormat = cmdr.checkSelectedSignFormat();
		if (selectedSignFormat == null)
			return false;
		MiddlewareChrome.log(className, "Selected Sign Format: " + selectedSignFormat.toString());
		return true;
	}

	private static void showInfo(boolean info, boolean keyusage) {
		char[] pass = getPassword();
		AbstractSignFactory factory = new CAdESSignFactory(null); // no file is needed
		Pkcs11SignatureToken token = factory.connectToToken(currentDriverPath, pass);
		List<DSSPrivateKeyEntry> keys;
		try {
			keys = token.getKeys();
			int count = 0;
			for (DSSPrivateKeyEntry dssPrivateKeyEntry : keys) {
				CertificateToken ct = dssPrivateKeyEntry.getCertificate();
				MiddlewareChrome.log(className, DSSASN1Utils.getHumanReadableName(ct));

				MiddlewareChrome.log(className, "Certificate:" + count);
				if (info == true) {
					MiddlewareChrome.log(className, "Info:");
					factory.showCertificateData(ct);
					MiddlewareChrome.log(className, "\n");
				}
				if (keyusage = true) {
					MiddlewareChrome.log(className, "Key Usage:");
					factory.showKeyUsage(ct);
					MiddlewareChrome.log(className, "\n");
				}
				MiddlewareChrome.log(className, "---------");
				count++;
			}
		} catch (DSSException e) {
			MiddlewareChrome.log(className, "ERROR :: Token access failed.");
			MiddlewareChrome.getInstance().sendError("Token access failed");
			// e.printStackTrace();
			return;
		}

	}

	private static char[] getPassword() {
		ArgsParser cmdr = ArgsParser.getInstance();
		if (cmdr.getPassword() == null)
			return Utility.readPasswordFromConsole();
		else
			return cmdr.getPassword().toCharArray();
	}

	@SuppressWarnings({ "rawtypes", "unchecked" })
	private static void sign(File inputFile) {
		ArgsParser cmdr = ArgsParser.getInstance();
		MiddlewareChrome.log(className, "Start Signature Procedure");
		char[] pass = getPassword();

		MiddlewareChrome.log(className, "\n");

		AbstractSignFactory factory = null;
		if (selectedSignFormat == SignFormat.CADES) {
			factory = new CAdESSignFactory(inputFile);
		} else if (selectedSignFormat == SignFormat.PADES) {
			PAdESProp padesProp = cmdr.createPAdESProp();
			if (padesProp == null) {
				MiddlewareChrome.log(className, "ERROR :: Error create PAdES Prop");
				return;
			}
			factory = new PAdESSignFactory(padesProp, inputFile);
		}

		Pkcs11SignatureToken token = factory.connectToToken(currentDriverPath, pass);
		List<DSSPrivateKeyEntry> keys;
		try {
			keys = token.getKeys();
		} catch (DSSException e) {
			MiddlewareChrome.log(className, "ERROR :: Token access failed");
			MiddlewareChrome.getInstance().sendError("Token access failed");
			// e.printStackTrace();
			return;
		}

		DSSPrivateKeyEntry signer = factory.getSigner(keys, cmdr.isChoice_certificate());

		if (signer == null) {
			MiddlewareChrome.log(className, "ERROR :: Signature not performed");
			return;
		}

		MiddlewareChrome.log(className, "Certificate to use:  ");
		CertificateToken ct = signer.getCertificate();
		String humanReadableSigner = DSSASN1Utils.getHumanReadableName(ct);
		MiddlewareChrome.log(className, humanReadableSigner);

		// Preparing parameters for the PAdES signature
		AbstractSignatureParameters parameters = factory.createParameter(signer);
		AbstractSignatureService service = factory.createService();
		DSSDocument toSignDocument = new FileDocument(inputFile);
		// Get the SignedInfo segment that need to be signed.
		ToBeSigned dataToSign = service.getDataToSign(toSignDocument, parameters);
		// This function obtains the signature value for signed information using the
		// private key and specified algorithm
		// NOTA: You must use the same algorithm selected in PAdES Parameters
		DigestAlgorithm digestAlgorithm = parameters.getDigestAlgorithm();
		SignatureValue signatureValue = token.sign(dataToSign, digestAlgorithm, signer);
		// We invoke the padesService to sign the document with the signature value
		// obtained the previous step.
		MiddlewareChrome.log(className, "Start of signing process...");
		DSSDocument signedDocument = service.signDocument(toSignDocument, parameters, signatureValue);
		String pathNewFile = factory.createSignedFile(signedDocument);
		MiddlewareChrome.log(className, "End of signing process.");
		try {
			JSONObject jo = new JSONObject();
			jo.put("native_app_message", "end");
			if (selectedSignFormat == SignFormat.PADES)
				jo.put("signature_type", "pades");
			else
				jo.put("signature_type", "cades");
			jo.put("local_path_newFile", pathNewFile);
			MiddlewareChrome.log(className, jo.toString());
			MiddlewareChrome.getInstance().sendMessage(jo.toString());

			// delete created image from base64
			MiddlewareChrome.log(className, ArgsParser.getInstance().getUseVisibleSignatureImage().getAbsolutePath());
			if (ArgsParser.getInstance().getUseVisibleSignatureImage().exists())
				ArgsParser.getInstance().getUseVisibleSignatureImage().delete();

		} catch (IOException e) {
			MiddlewareChrome.log(className, "ERROR :: Return signature data");
//			e.printStackTrace();
		}
	}

	private static boolean checkFile(File inputFile) {
		if (!inputFile.exists()) {
			MiddlewareChrome.log(className, "ERROR :: File not exist.");
			MiddlewareChrome.getInstance().sendError("File not exist");
			return false;
		}
//		if (selectedSignFormat == SignFormat.PADES && !Files.getFileExtension(inputFile.getName()).equals("pdf")) {
		if (selectedSignFormat == SignFormat.PADES && !isPDF(inputFile)) {
			MiddlewareChrome.log(className, "ERROR :: File is not a pdf.");
			return false;
		}
		return true;
	}

	private static boolean isPDF(File inputFile) {
		byte[] fileContent;
		try {
			fileContent = Files.toByteArray(inputFile);
			if (fileContent != null && fileContent.length > 4 && fileContent[0] == 0x25 && // %
					fileContent[1] == 0x50 && // P
					fileContent[2] == 0x44 && // D
					fileContent[3] == 0x46 && // F
					fileContent[4] == 0x2d) { // -
				return true;
			}
		} catch (IOException e) {
			System.err.println("Unable to check if the file is a pdf.");
//			e.printStackTrace();
		}
		return false;
	}

	private static boolean setDriver(File file) {
		if (file.exists()) {
			currentDriverPath = file;
			MiddlewareChrome.log(className, "Use driver located in: " + currentDriverPath);
			return true;
		} else {
			return useDefaultDriver();
		}
	}

	private static boolean useDefaultDriver() {
		SystemType s = null;
		String os = System.getProperty("os.name").toLowerCase();
		String arch = Utility.checkOSArchitecture();
		if (os.contains("win")) {
			currentDriverPath = driverPathWin;
			s = SystemType.WINDOWS;
		} else if (os.contains("nix") || os.contains("nux") || os.contains("aix")) {
			s = SystemType.LINUX;
			if (arch.equals("64"))
				currentDriverPath = driverPathLinux64;
			else
				currentDriverPath = driverPathLinux32;
		} else if (os.contains("mac")) {
			// TODO ??
		}
		// extract only needed driver
		if (!extractDrivers(s))
			return false;
		MiddlewareChrome.log(className, "Use the default driver located in: " + currentDriverPath);
		return true;

	}

	private static boolean extractDrivers(SystemType systype) {
		try {
			if (systype == SystemType.WINDOWS && !driverPathWin.exists()) {
				// load resources
				URL win = Resources.getResource(resource_DriverPathWindows);

				// create folder
				File wf = new File(Utility.buildFilePath("driver", "Windows"));
				if (!wf.exists())
					wf.mkdirs();

				// extract resources
				byte[] bytes = Resources.toByteArray(win);
				Files.write(bytes, driverPathWin);
			}
			if (systype == SystemType.LINUX && !driverPathLinux32.exists()) {
				URL linux32 = Resources.getResource(resource_DriverPathLinux32);
				File lf = new File(Utility.buildFilePath("driver", "Linux", "32"));
				if (!lf.exists())
					lf.mkdirs();
				byte[] bytes = Resources.toByteArray(linux32);
				Files.write(bytes, driverPathLinux32);
			}
			if (systype == SystemType.LINUX && !driverPathLinux64.exists()) {
				URL linux64 = Resources.getResource(resource_DriverPathLinux64);
				File lf64 = new File(Utility.buildFilePath("driver", "Linux", "64"));
				if (!lf64.exists())
					lf64.mkdirs();
				byte[] bytes = Resources.toByteArray(linux64);
				Files.write(bytes, driverPathLinux64);
			}

			// TODO add MAC driver
		} catch (IOException e) {
			MiddlewareChrome.log(className, "ERROR :: Error in default driver extractaction");
			MiddlewareChrome.getInstance().sendError("Error in default driver extractaction");
			return false;
			// e.printStackTrace();
		}
		return true;
	}

}
