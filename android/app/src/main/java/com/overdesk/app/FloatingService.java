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
import android.widget.LinearLayout;
import androidx.core.app.NotificationCompat;

public class FloatingService extends Service {
    private WindowManager windowManager;
    private FrameLayout floatingLayout;
    private WebView webView;
    private View dragHandle;

    private static final String CHANNEL_ID = "FloatingOverdeskChannel";
    private static final int NOTIFICATION_ID = 2024;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
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

        // Create a horizontal or vertical container to house a subtle Drag Handle & WebView
        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setBackgroundColor(Color.TRANSPARENT);

        // Native Drag Handle Bar
        dragHandle = new View(this);
        int handleHeight = (int) (18 * getResources().getDisplayMetrics().density);
        LinearLayout.LayoutParams handleParams = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, handleHeight
        );
        dragHandle.setLayoutParams(handleParams);
        // A sleek, subtle translucent indicator pill of 50% white in a 10% black background
        dragHandle.setBackgroundColor(Color.parseColor("#1a000000"));
        container.addView(dragHandle);

        // WebView instantiation
        webView = new WebView(this);
        LinearLayout.LayoutParams webViewParams = new LinearLayout.LayoutParams(
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
            public void minimizeApp() {
                // Done - overlay is already floating freely!
            }

            @android.webkit.JavascriptInterface
            public void stopService() {
                webView.post(new Runnable() {
                    @Override
                    public void run() {
                        stopSelf();
                    }
                });
            }
        }, "AndroidHost");

        // Load the local packaged index.html under file:/// with the mode=overlay query parameter 
        webView.loadUrl("file:///android_asset/public/index.html?mode=overlay");

        container.addView(webView);
        floatingLayout.addView(container);

        // Setup WindowManager LayoutParams
        int layoutFlag;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            layoutFlag = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            layoutFlag = WindowManager.LayoutParams.TYPE_PHONE;
        }

        final WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            (int) (350 * getResources().getDisplayMetrics().density), // width
            (int) (190 * getResources().getDisplayMetrics().density), // height
            layoutFlag,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
            PixelFormat.TRANSLUCENT
        );

        params.gravity = Gravity.CENTER | Gravity.TOP;
        params.x = 0;
        params.y = 100;

        // Implement touch listener on drag handle to let the user reposition the widget smoothly!
        dragHandle.setOnTouchListener(new View.OnTouchListener() {
            private int initialX;
            private int initialY;
            private float initialTouchX;
            private float initialTouchY;

            @Override
            public boolean onTouch(View v, MotionEvent event) {
                switch (event.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        initialX = params.x;
                        initialY = params.y;
                        initialTouchX = event.getRawX();
                        initialTouchY = event.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        params.x = initialX + (int) (event.getRawX() - initialTouchX);
                        params.y = initialY + (int) (event.getRawY() - initialTouchY);
                        windowManager.updateViewLayout(floatingLayout, params);
                        return true;
                }
                return false;
            }
        });

        windowManager.addView(floatingLayout, params);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingLayout != null && windowManager != null) {
            try {
                windowManager.removeView(floatingLayout);
            } catch (Exception e) {}
        }
    }
}
