package io.chatdemo.deepseek;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            // Allow async TTS AudioContext playback after network fetch completes.
            settings.setMediaPlaybackRequiresUserGesture(false);
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        }
    }
}
