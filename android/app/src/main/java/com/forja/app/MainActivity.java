package com.forja.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Troca o cliente padrão por um que sabe servir a tela offline local
    // (public/offline-app.html) quando o aparelho está sem internet.
    this.bridge.getWebView().setWebViewClient(new OfflineWebViewClient(this.bridge));
  }
}
