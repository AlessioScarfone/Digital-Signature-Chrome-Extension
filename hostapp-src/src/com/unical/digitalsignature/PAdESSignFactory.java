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

import java.awt.Color;
import java.awt.Font;
import java.io.File;
import java.io.IOException;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentCatalog;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageTree;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.apache.pdfbox.pdmodel.interactive.form.PDSignatureField;

import com.google.common.io.Files;
import com.unical.argparser.ArgsParser;
import com.unical.argparser.MiddlewareChrome;
import com.unical.utils.PAdESProp;

import eu.europa.esig.dss.AbstractSignatureParameters;
import eu.europa.esig.dss.DSSASN1Utils;
import eu.europa.esig.dss.DigestAlgorithm;
import eu.europa.esig.dss.FileDocument;
import eu.europa.esig.dss.SignatureLevel;
import eu.europa.esig.dss.pades.PAdESSignatureParameters;
import eu.europa.esig.dss.pades.SignatureImageParameters;
import eu.europa.esig.dss.pades.SignatureImageParameters.VisualSignatureRotation;
import eu.europa.esig.dss.pades.SignatureImageTextParameters;
import eu.europa.esig.dss.pades.signature.PAdESService;
import eu.europa.esig.dss.signature.AbstractSignatureService;
import eu.europa.esig.dss.token.DSSPrivateKeyEntry;
import eu.europa.esig.dss.validation.CommonCertificateVerifier;
import eu.europa.esig.dss.x509.CertificateToken;

public class PAdESSignFactory extends AbstractSignFactory {
	private static String className = "PadesSignFactory";
	private PAdESProp prop;

	public PAdESSignFactory(PAdESProp padesProp, File inputFile) {
		super(inputFile);
		prop = padesProp;
	}

	public AbstractSignatureParameters createParameter(DSSPrivateKeyEntry signer) {
		PAdESSignatureParameters parameters = new PAdESSignatureParameters();

		// We choose the level of the signature (-B, -T, -LT, -LTA).
		parameters.setSignatureLevel(SignatureLevel.PAdES_BASELINE_B);
		// We set the digest algorithm to use with the signature algorithm.
		// You must use the same parameter when you invoke the method sign on the token.
		// The default value is SHA256
		parameters.setDigestAlgorithm(DigestAlgorithm.SHA256);
		// We set the signing certificate
		parameters.setSigningCertificate(signer.getCertificate());
		boolean useField = selectSignatureField(parameters);
		if (prop.useVisibleSign()) {
			CertificateToken ct = signer.getCertificate();
			String humanReadableSigner = DSSASN1Utils.getHumanReadableName(ct);
			humanReadableSigner = humanReadableSigner + "\n" + getDateAndTimeString();
			parameters.setSignatureImageParameters(addVisibleSignatureParameters(humanReadableSigner, useField));
		}

		return parameters;
	}

	private String getDateAndTimeString() {
		LocalDateTime ldt = LocalDateTime.now(Clock.systemUTC());
		LocalTime localTime = ldt.toLocalTime().truncatedTo(ChronoUnit.SECONDS);
		LocalDate localDate = ldt.toLocalDate();
		String s = localDate.toString() + " " + localTime.toString() + " UTC";
		return s;
	}

	private SignatureImageParameters addVisibleSignatureParameters(String humanReadableSigner, boolean useField) {
		// Initialize visual signature
		SignatureImageParameters imageParameters = new SignatureImageParameters();
		imageParameters.setRotation(VisualSignatureRotation.AUTOMATIC);

		if (useField == false) {
			if (prop.getPage() > getNumberPagePDF() || prop.getPage() < 1) {
				prop.setPage(1);
				MiddlewareChrome.log(className,"Selected page is invalid. Use first page.");
			}
			imageParameters.setPage(prop.getPage());
			imageParameters.setAlignmentHorizontal(prop.getPosHorizontal());
			imageParameters.setAlignmentVertical(prop.getPosVertical());
			// imageParameters.setxAxis(0);
			// imageParameters.setyAxis(0);
		}

		if (prop.getImageFile() != null) {
			if (prop.getImageFile().exists()) {
				imageParameters.setImage(new FileDocument(prop.getImageFile()));
			} else {
				System.err.println("Image not exist. Sign only with text.\n");
			}
		}

		// Initialize text to generate for visual signature
		SignatureImageTextParameters textParameters = new SignatureImageTextParameters();
		textParameters.setFont(new Font("serif", Font.PLAIN, 13));
		textParameters.setTextColor(Color.BLACK);
		textParameters.setText(humanReadableSigner);
		imageParameters.setTextParameters(textParameters);

		return imageParameters;
	}

	private boolean selectSignatureField(PAdESSignatureParameters parameters) {
		PDDocument doc;
		try {
			doc = PDDocument.load(inputFile);
			PDDocumentCatalog pdCatalog = doc.getDocumentCatalog();
			PDAcroForm pdAcroForm = pdCatalog.getAcroForm();
			if (pdAcroForm != null) {
				PDPageTree allPages = doc.getDocumentCatalog().getPages();
				// get all fields
				List<PDField> fields = pdAcroForm.getFields();
				// MiddlewareChrome.log(className,"Total Fields number:" + fields.size() + "\n");
				List<PDField> fields_empty = createListEmptyField(fields);
				// if exist any signable field
				if (fields_empty.size() != 0) {
					// check if is possible to use field passed from console
					String nameFieldToSign = ArgsParser.getInstance().getNameFieldToSign();
					if (nameFieldToSign != null && findField(fields_empty, nameFieldToSign)) {
						parameters.setSignatureFieldId(nameFieldToSign);
						return true;
					}
//						else {
//						printListEmptyField(allPages, fields_empty);
//						int n = Utility.getValidIntInRange("Select Field to use (-1 or Enter for skip):", -1,
//								fields_empty.size());
//						if (n != -1)
//							parameters.setSignatureFieldId(fields_empty.get(n).getFullyQualifiedName());
//						else {
//							MiddlewareChrome.log(className,"No Field selected.");
//							return false;
//						}
//						return true;
//					}
				} else {
					MiddlewareChrome.log(className,"No available field in the pdf.");
					return false;
				}
			}
			MiddlewareChrome.log(className,"No available field in the pdf.");
			return false;

		} catch (IOException e) {
			System.err.println("Error to read input");
		}
		return false;
	}
	
	@SuppressWarnings({ "rawtypes", "unchecked" })
	public AbstractSignatureService createService() {
		// Create common certificate verifier
		CommonCertificateVerifier commonCertificateVerifier = new CommonCertificateVerifier();
		// Create PAdESService for signature
		PAdESService service = new PAdESService(commonCertificateVerifier);
		return service;
	}

	@Override
	protected String getNameNewFile() {
		//check if user specify a new name
		String newfilename = ArgsParser.getInstance().getNameNewFile();
		
		//use default name
		if(newfilename == null) 
			newfilename = Files.getNameWithoutExtension(inputFile.getName()) + "-signed.pdf";
		
		//add pdf extension if is not present
		else if(!Files.getFileExtension(newfilename).equals("pdf"))
			newfilename = newfilename+".pdf";
		
		return checkIfFileExist(newfilename);
	}
	
	//get only empty fields (usable for signature)
	private List<PDField> createListEmptyField(List<PDField> fields) {
		List<PDField> fields_empty = new ArrayList<PDField>();
		for (PDField pdField : fields) {
			// show only empty fields
			if (pdField.getValueAsString().isEmpty() && pdField instanceof PDSignatureField) {
				fields_empty.add(pdField);
			}
		}
		return fields_empty;
	}

	private void printListEmptyField(PDPageTree allPages, List<PDField> fields_empty) {
		int c = 0;
		for (PDField pdField : fields_empty) {
			String fieldName = pdField.getFullyQualifiedName();
			PDPage currentPage = pdField.getWidgets().get(0).getPage();
			int pageNumber = allPages.indexOf(currentPage) + 1;
			MiddlewareChrome.log(className,"[" + c + "] - page:" + pageNumber + " - " + fieldName);
			c++;
		}
	}

	private boolean findField(List<PDField> fields_empty, String nameFieldToSign) {
		for (PDField pdField : fields_empty) {
			if (pdField.getFullyQualifiedName().equals(nameFieldToSign))
				return true;
		}
		MiddlewareChrome.log(className,"There is no empty field named '"+ nameFieldToSign+"' in the document");
		return false;
	}

	private int getNumberPagePDF() {
		PDDocument doc;
		try {
			doc = PDDocument.load(inputFile);
			return doc.getNumberOfPages();
		} catch (IOException e) {
			e.printStackTrace();
		}
		return 1;
	}

}
