package com.pims;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.zebra.sdk.comm.BluetoothConnection;
import com.zebra.sdk.comm.Connection;
import com.zebra.sdk.comm.ConnectionException;
import com.zebra.sdk.printer.PrinterLanguage;
import com.zebra.sdk.printer.ZebraPrinter;
import com.zebra.sdk.printer.ZebraPrinterFactory;
import com.zebra.sdk.printer.ZebraPrinterLanguageUnknownException;
import com.facebook.react.bridge.Callback;
import com.zebra.sdk.printer.discovery.BluetoothDiscoverer;
import com.zebra.sdk.printer.discovery.DiscoveredPrinter;
import com.zebra.sdk.printer.discovery.DiscoveredPrinterBluetooth;
import com.zebra.sdk.printer.discovery.DiscoveryHandler;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Set;

import android.util.Log;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;

import org.json.JSONArray;
import org.json.JSONObject;


public class ZSDKModule extends ReactContextBaseJavaModule {

    ZSDKModule(ReactApplicationContext context) {
        super(context);
    }

    @Override
    public String getName() {
        return "ZSDKModule";
    }

    @ReactMethod
public void zsdkWriteBluetooth(String macAddress, String zpl) {
    Log.d("ZSDKModule", "Going to write via Bluetooth with MAC address: " + macAddress
            + " and zpl: " + zpl);

    Connection printerConnection = null;

    try {
        printerConnection = new BluetoothConnection(macAddress);
        printerConnection.open();

        if (printerConnection.isConnected()) {
            // If no ZPL sent from JS, fallback to default test label
            if (zpl == null || zpl.isEmpty()) {
                ZebraPrinter printer = ZebraPrinterFactory.getInstance(printerConnection);
                PrinterLanguage printerLanguage = printer.getPrinterControlLanguage();
                byte[] testLabel = getTestLabel(printerLanguage);
                printerConnection.write(testLabel);
            } else {
                // Use the ZPL string passed from JS — convert to bytes and write
                printerConnection.write(zpl.getBytes("UTF-8"));
            }
        }
    } catch (Exception e) {
        Log.e("ZSDKModule", "Error printing to Bluetooth printer", e);
    } finally {
        if (printerConnection != null) {
            try {
                printerConnection.close();
            } catch (ConnectionException ex) {
                Log.e("ZSDKModule", "Error closing printer connection", ex);
            }
        }
    }
}


    /*
     * Returns the command for a test label depending on the printer control language
     * The test label is a box with the word "TEST" inside of it
     *
     * _________________________
     * |                       |
     * |                       |
     * |        TEST           |
     * |                       |
     * |                       |
     * |_______________________|
     *
     *
     */
    private byte[] getTestLabel(PrinterLanguage printerLanguage) {
        byte[] testLabel = null;
        if (printerLanguage == PrinterLanguage.ZPL) {
            testLabel = "^XA^FO17,16^GB379,371,8^FS^FT65,255^A0N,135,134^FDTEST^FS^XZ".getBytes();
        } else if (printerLanguage == PrinterLanguage.CPCL || printerLanguage == PrinterLanguage.LINE_PRINT) {
            String cpclConfigLabel = "! 0 200 200 406 1\r\n" + "ON-FEED IGNORE\r\n" + "BOX 20 20 380 380 8\r\n" + "T 0 6 137 177 TEST\r\n" + "PRINT\r\n";
            testLabel = cpclConfigLabel.getBytes();
        }
        return testLabel;
    }

    @ReactMethod
    public void zsdkPrinterDiscoveryBluetooth(Callback callback) {
        try {
            BluetoothDiscoverer.findPrinters(getReactApplicationContext(), new DiscoveryResult(callback));
        } catch (ConnectionException e) {
            callback.invoke(e.getMessage(), "[]");
        } finally {
            // Do something
        }
    }

    @ReactMethod
    public void zsdkGetBondedBluetoothPrinters(Callback callback) {
        try {
            BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
            if (adapter == null) {
                callback.invoke("Bluetooth not supported on this device", "[]");
                return;
            }
            if (!adapter.isEnabled()) {
                callback.invoke("Bluetooth is off", "[]");
                return;
            }
            Set<BluetoothDevice> devices = adapter.getBondedDevices();
            JSONArray bondedJson = new JSONArray();
            for (BluetoothDevice device : devices) {
                JSONObject obj = new JSONObject();
                obj.put("address", device.getAddress());
                obj.put("friendlyName", device.getName());
                bondedJson.put(obj);
            }
            callback.invoke(null, bondedJson.toString());
        } catch (Exception e) {
            callback.invoke(e.getMessage(), "[]");
        }
    }

    // Implementation to DiscoveryHandler
    public class DiscoveryResult implements DiscoveryHandler {

        protected Callback callback = null;
        protected ArrayList<Map<String, String>> foundPrinterList;

        public DiscoveryResult(Callback callback) {
            super();
            this.callback = callback;
            foundPrinterList = new ArrayList<Map<String, String>>();
        }

        @Override
        public void foundPrinter(final DiscoveredPrinter printer) {
            DiscoveredPrinter dp = printer;
            Map<String, String> foundPrinter = new HashMap<>();
            foundPrinter.put("address", printer.address);
            foundPrinter.put("friendlyName", ((DiscoveredPrinterBluetooth) printer).friendlyName);
            foundPrinterList.add(foundPrinter);
        }

        @Override
        public void discoveryFinished() {

            // Convert the foundPrinterList into JSON string
            List<JSONObject> jsonObj = new ArrayList<JSONObject>();

            for(Map<String, String> data : foundPrinterList) {
                jsonObj.add(new JSONObject(data));
            }

            JSONArray foundPrinterJson = new JSONArray(jsonObj);

            Log.d("ZSDKModule", "Found printers are: " + foundPrinterJson.toString());

            // Invoke the callback in React Native
            callback.invoke(null, foundPrinterJson.toString());
        }

        @Override
        public void discoveryError(String message) {
            callback.invoke(message, "[]");
        }
    }
}
