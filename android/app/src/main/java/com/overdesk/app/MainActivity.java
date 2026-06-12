package com.overdesk.app;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            this.bridge.getWebView().setBackgroundColor(Color.TRANSPARENT);
        } catch (Exception e) {}
    }
}
