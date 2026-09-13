package com.forja.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // O Capacitor carrega server.url (rede) dentro do próprio super.onCreate() --
    // por isso, interceptar depois (via WebViewClient) nunca pega a primeira
    // navegação a tempo quando já não há internet no momento em que o app abre
    // (o WebView cai direto na tela de erro do Chromium, net::ERR_INTERNET_DISCONNECTED).
    // A única forma confiável é trocar a configuração ANTES de chamar super.onCreate():
    // sem internet, tiramos o server.url e mantemos hostname/scheme iguais ao site real
    // (então o localStorage continua sendo o mesmo) — o Capacitor passa a servir o
    // index.html local (assets/public/index.html = offline-app.html, ver
    // scripts/sync-android-assets.mjs) em vez de tentar buscar a URL remota.
    if (!isOnline()) {
      String host = hostFromServerUrl(CapConfig.loadDefault(this).getServerUrl());
      if (host != null) {
        this.config = new CapConfig.Builder(this)
          .setHostname(host)
          .setAndroidScheme("https")
          .create();
      }
    }
    super.onCreate(savedInstanceState);
    // Troca o cliente padrão por um que sabe servir a tela offline local
    // (public/offline-app.html) se a internet cair DEPOIS do app já aberto.
    this.bridge.getWebView().setWebViewClient(new OfflineWebViewClient(this.bridge));
  }

  private static String hostFromServerUrl(String serverUrl) {
    if (serverUrl == null || serverUrl.isEmpty()) return null;
    try {
      return Uri.parse(serverUrl).getHost();
    } catch (Exception e) {
      return null;
    }
  }

  private boolean isOnline() {
    try {
      ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
      if (cm == null) return true; // não deu pra checar: não bloqueia o fluxo normal
      NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
      return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    } catch (Exception e) {
      return true;
    }
  }
}
