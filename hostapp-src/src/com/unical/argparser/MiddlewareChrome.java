package com.unical.argparser;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDDocumentCatalog;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageTree;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm;
import org.apache.pdfbox.pdmodel.interactive.form.PDField;
import org.json.JSONArray;
import org.json.JSONObject;

public class MiddlewareChrome {
	private static final String CADES_TYPE = "cades";
	private static final String PADES_TYPE = "pades";
	public static final String ACTION_INFO = "info";
	public static final String ACTION_SIGN = "sign";
	public static final String ACTION_NULL = "null";

	private enum JSONKey {
		ACTION("action"), TYPE("type"), PASSWORD("password"), FILE("filename"), VISIBILE("visible"),
		USE_FIELD("useField"), VERTICAL_POSITION("verticalPosition"), HORIZONTAL_POSITION("horizontalPosition"),
		PAGE_NUMBER("pageNumber"), SIGNATURE_FIELD("signatureField"), IMAGE("image");

		private final String keyname;

		private JSONKey(String s) {
			keyname = s;
		}

		public String toString() {
			return this.keyname;
		}
	}

	// ****** ****** ****** ******

	private static final String LOG_FILE_NAME = "SignerMiddlewareLog.txt";
	private String className = this.getClass().getName();
	private JSONObject jsonObject = null;

	// ** Singleton **

	private static MiddlewareChrome instance = null;

	private MiddlewareChrome() {
		log(className, "Start");

	}

	public static MiddlewareChrome getInstance() {
		if (instance == null)
			instance = new MiddlewareChrome();
		return instance;
	}

	public void readMessage() {
		log(className, "Read Message");
		try {
			String jsonIn = readMessage(System.in);
			log(className, "Host received " + jsonIn);
			jsonObject = new JSONObject(jsonIn);
		} catch (IOException e) {
			e.printStackTrace();
		}
	}

	// ******

	// FOR TEST
	// TODO remove
//	public MiddlewareChrome(String jsonIn) {
//		System.out.println(PATH_LOG);
//		jsonObject = new JSONObject(jsonIn);
//	}
	// ----

	public String getRequestedAction() {
		if (jsonObject.has(JSONKey.ACTION.toString())) {
			String requestAction = jsonObject.get(JSONKey.ACTION.toString()).toString();
			if (requestAction.equals(ACTION_INFO)) {
				return ACTION_INFO;
			} else if (requestAction.equals(ACTION_SIGN)) {
				return ACTION_SIGN;
			}
		}
		return ACTION_NULL;

	}

	public String[] createArgsList() {
		try {
			log(className, "start create args");
			List<String> argsList = new ArrayList<String>();
			log(className, jsonObject.toString());
			String command = jsonObject.getString(JSONKey.TYPE.toString());
			log(className, command);
			String file = jsonObject.getString(JSONKey.FILE.toString());
			log(className, file);
			String pass = jsonObject.getString(JSONKey.PASSWORD.toString());
			log(className, pass);
			boolean visible = (boolean) jsonObject.get(JSONKey.VISIBILE.toString());
			log(className, "visible? " + visible);
			boolean useField = (boolean) jsonObject.get(JSONKey.USE_FIELD.toString());
			log(className, "use field? " + useField);

			String img_base64 = jsonObject.getString(JSONKey.IMAGE.toString());

			argsList.add("-p");
			argsList.add(pass);
			argsList.add(command);

			// TODO add image
			if (command.equals(PADES_TYPE)) {
				// add all pades option
				if (visible) {
					if (img_base64.equals("") == false) {
						String img_path = createImage(img_base64);
						argsList.add("-vi");
						argsList.add(img_path);
					} else
						argsList.add("-v");

					if (useField) {
						argsList.add("-f");
						String fieldName = jsonObject.getString(JSONKey.SIGNATURE_FIELD.toString());
						argsList.add(fieldName);
					} else {
						// use page,and positions
						int page = jsonObject.getInt(JSONKey.PAGE_NUMBER.toString());
						argsList.add("-pg");
						argsList.add(new Integer(page).toString());

						argsList.add("-pv");
						String verticalPos = jsonObject.getString(JSONKey.VERTICAL_POSITION.toString());
						argsList.add(verticalPos);

						argsList.add("-ph");
						String horizontalPos = jsonObject.getString(JSONKey.HORIZONTAL_POSITION.toString());
						argsList.add(horizontalPos);
					}
				}
			}

			// last arg is the file to sign
			argsList.add(file);
			String[] array = argsList.toArray(new String[argsList.size()]);
			log(className, "" + array.length);
			return array;
		} catch (Exception e) {
			log(className, e.getMessage());
		}
		return null;
	}

	private String getPathImage(String ext) {
		String tmpDir = System.getProperty("java.io.tmpdir");
		String path = tmpDir + "chrome_ext_sign." + ext;
		MiddlewareChrome.log(className, "Get path image: " + tmpDir);
		return path;
	}

	private String createImage(String img_base64) {

		String ext = img_base64.split("/")[1].split(";")[0];
		String path = getPathImage(ext);

		// remove first part (data:image/png;base64)
		String base64Image = img_base64.split(",")[1];

		try (FileOutputStream imageOutFile = new FileOutputStream(path)) {
			// Converting a Base64 String into Image byte array
			byte[] imageByteArray = Base64.getDecoder().decode(base64Image.getBytes(StandardCharsets.UTF_8));
			imageOutFile.write(imageByteArray);
		} catch (Exception e) {
			MiddlewareChrome.log(className, "ERROR :: create image- " + e);
		}
		return path;
	}

	private String readMessage(InputStream in) throws IOException {
		byte[] b = new byte[4];
		in.read(b);

		int size = getInt(b);

		if (size == 0) {
			log(className, "Blocked communication");
//			throw new InterruptedIOException("Blocked communication");
		}

		b = new byte[size];
		in.read(b);

		return new String(b, "UTF-8");
	}

	public void sendMessage(String message) throws IOException {
		System.out.write(getBytes(message.length()));
		System.out.write(message.getBytes("UTF-8"));
		System.out.flush();
	}

	private int getInt(byte[] bytes) {
		return (bytes[3] << 24) & 0xff000000 | (bytes[2] << 16) & 0x00ff0000 | (bytes[1] << 8) & 0x0000ff00
				| (bytes[0] << 0) & 0x000000ff;
	}

	private byte[] getBytes(int length) {
		byte[] bytes = new byte[4];
		bytes[0] = (byte) (length & 0xFF);
		bytes[1] = (byte) ((length >> 8) & 0xFF);
		bytes[2] = (byte) ((length >> 16) & 0xFF);
		bytes[3] = (byte) ((length >> 24) & 0xFF);
		return bytes;
	}

	public static void log(String sender, String message) {
		File file = new File(System.getProperty("user.dir"), LOG_FILE_NAME);
		try {
			if (!file.exists()) {
				file.createNewFile();
			}

			FileWriter fileWriter = new FileWriter(file.getAbsoluteFile(), true);
			BufferedWriter bufferedWriter = new BufferedWriter(fileWriter);

			DateFormat dateFormat = new SimpleDateFormat("yyyy/MM/dd HH:mm:ss");
			Date date = new Date();

			bufferedWriter.write(dateFormat.format(date) + ", " + sender + ": " + message + "\r\n");
			bufferedWriter.close();
		} catch (Exception e) {
			log("Middleware", "ERROR ==> Method (log)" + e.getMessage());
			e.printStackTrace();
		}
	}

	public JSONObject getPdfInfo() {
		JSONArray ja = new JSONArray();
		JSONObject finalJson = new JSONObject();
		String filename = jsonObject.getString(JSONKey.FILE.toString());
		File inputFile = new File(filename);
		PDDocument doc;
		try {
			doc = PDDocument.load(inputFile);
			PDDocumentCatalog pdCatalog = doc.getDocumentCatalog();
			PDAcroForm pdAcroForm = pdCatalog.getAcroForm();
			PDPageTree allPages = doc.getDocumentCatalog().getPages();
			finalJson.put("page", doc.getNumberOfPages());
			if (pdAcroForm != null) {
				// get all fields
				List<PDField> fields = pdAcroForm.getFields();
				// MiddlewareChrome.log(className,"Total Fields number:" + fields.size() +
				// "\n");
				List<PDField> fields_empty = createListEmptyField(fields);
				for (PDField pdField : fields_empty) {
					String fieldName = pdField.getFullyQualifiedName();
					PDPage currentPage = pdField.getWidgets().get(0).getPage();
					int pageNumber = allPages.indexOf(currentPage) + 1;
					PDRectangle rectangle = pdField.getWidgets().get(0).getRectangle();
					float upperRightX = rectangle.getUpperRightX();
					float upperRightY = rectangle.getUpperRightY();
					float lowerLeftX = rectangle.getLowerLeftX();
					float lowerLeftY = rectangle.getLowerLeftY();
					JSONObject jo = new JSONObject();
					jo.put("name", fieldName);
					jo.put("page", pageNumber);
					jo.put("upper-right-x", upperRightX);
					jo.put("upper-right-Y", upperRightY);
					jo.put("lower-left-x", lowerLeftX);
					jo.put("lower-left-y", lowerLeftY);
					ja.put(jo);
					MiddlewareChrome.log(className, "page:" + pageNumber + " - " + fieldName + "[ urX:" + upperRightX
							+ " urY:" + upperRightY + " llx:" + lowerLeftX + " lly:" + lowerLeftY +" ]");

//					PDPageContentStream contentStream = new PDPageContentStream(doc, currentPage, true, false);
//					contentStream.beginText();
//					contentStream.setFont(PDType1Font.TIMES_ROMAN, 10);
//					contentStream.newLineAtOffset(lowerLeftX, upperRightY+2);
//					String text = fieldName;
//					contentStream.showText(text);
//					contentStream.endText();
//					contentStream.close();

				}
				finalJson.put("fields", ja);
				
//				doc.save(inputFile.getParent()+Files.getNameWithoutExtension(filename)+"-with-field."+Files.getFileExtension(filename));
			}
		} catch (IOException e) {
			log(className, "Error to read input");
		}
		finalJson.put("native_app_message", "info");

		return finalJson;
	}

	// get only empty fields (usable for signature)
	private List<PDField> createListEmptyField(List<PDField> fields) {
		List<PDField> fields_empty = new ArrayList<PDField>();
		for (PDField pdField : fields) {
			// show only empty fields
			if (pdField.getValueAsString().isEmpty()) {
				fields_empty.add(pdField);
			}
		}
		return fields_empty;
	}

}