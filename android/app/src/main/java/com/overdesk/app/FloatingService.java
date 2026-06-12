package com.overdesk.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.core.app.NotificationCompat;

public class FloatingService extends Service {
    private WindowManager windowManager;
    private FrameLayout floatingLayout;
    private WebView webView;
    private WindowManager.LayoutParams params;

    private static final String CHANNEL_ID = "FloatingOverdeskChannel";
    private static final int NOTIFICATION_ID = 2024;
    private static FloatingService instance = null;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        if (instance != null) {
            try {
                instance.stopSelf();
            } catch (Exception e) {}
        }
        instance = this;

        createNotificationChannel();
        startForegroundServiceCompat();
        initFloatingWindow();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Overdesk Floating Service",
                NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundServiceCompat() {
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Overdesk Active")
            .setContentText("Overdesk floating widget is running over other apps.")
            .setSmallIcon(android.R.drawable.ic_menu_agenda)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build();
        startForeground(NOTIFICATION_ID, notification);
    }

    private void initFloatingWindow() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        // Main layout container for the floating view
        floatingLayout = new FrameLayout(this);
        floatingLayout.setBackgroundColor(Color.TRANSPARENT);

        // WebView instantiation
        webView = new WebView(this);
        FrameLayout.LayoutParams webViewParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        );
        webView.setLayoutParams(webViewParams);
        webView.setBackgroundColor(Color.TRANSPARENT); // Background-free!

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        // Support mixing content (https/http) if necessary
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
        });

        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void dragWindow(final float dx, final float dy) {
                new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                    @Override
                    public void run() {
                        if (params != null && windowManager != null && floatingLayout != null) {
                            params.x += (int) dx;
                            params.y += (int) dy;
                            try {
                                windowManager.updateViewLayout(floatingLayout, params);
                            } catch (Exception e) {}
                        }
                    }
                });
            }

            @android.webkit.JavascriptInterface
            public void minimizeApp() {
                // Done - overlay is already floating freely!
            }

            @android.webkit.JavascriptInterface
            public void stopService() {
                new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                    @Override
                    public void run() {
                        stopSelf();
                    }
                });
            }
        }, "AndroidHost");

        // Load the local packaged index.html under file:/// with the mode=overlay query parameter 
        webView.loadUrl("file:///android_asset/public/index.html?mode=overlay");

        floatingLayout.addView(webView);

        // Setup WindowManager LayoutParams
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        // width: 360dp, height: 220dp to make card completely borderless without cropping/distortion
        params = new WindowManager.LayoutParams(
            (int) (360 * getResources().getDisplayMetrics().density), // width
            (int) (220 * getResources().getDisplayMetrics().density), // height
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | 
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | 
            WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS, // Allows free dragging past screen limits
            PixelFormat.TRANSLUCENT
        );

        // Map 1:1 on absolute screen pixels
        params.gravity = Gravity.TOP | Gravity.LEFT;
        
        // Center top layout initially
        int screenWidth = getResources().getDisplayMetrics().widthPixels;
        params.x = (screenWidth - params.width) / 2;
        params.y = (int) (80 * getResources().getDisplayMetrics().density);

        windowManager.addView(floatingLayout, params);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (instance == this) {
            instance = null;
        }
        if (floatingLayout != null && windowManager != null) {
            try {
                windowManager.removeView(floatingLayout);
            } catch (Exception e) {}
        }
    }
}
