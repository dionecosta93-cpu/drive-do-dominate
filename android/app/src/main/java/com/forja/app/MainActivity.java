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
    OfflineAssetStore assetStore = new OfflineAssetStore(this);
    // Ponte pro JS avisar quais arquivos (CSS/JS da página atual) guardar em disco
    // enquanto está online -- ver src/lib/html-snapshot.ts. shouldInterceptRequest
    // sozinho não basta pra servir esses arquivos offline; precisa de uma cópia
    // salva de antemão.
    this.bridge.getWebView().addJavascriptInterface(new OfflineBridge(assetStore), "AndroidOffline");
    // Troca o cliente padrão por um que sabe servir a tela offline local
    // (public/offline-app.html) e os arquivos guardados acima, se a internet cair
    // depois do app já aberto.
    this.bridge.getWebView().setWebViewClient(new OfflineWebViewClient(this.bridge, assetStore));
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
      if (cm == null) return false; // não deu pra checar: assume offline (mais seguro aqui --
      // servir a página local por engano é inofensivo, servir a URL remota por engano
      // é o próprio bug que estamos evitando).
      NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
      if (caps == null) return false;
      // NET_CAPABILITY_INTERNET só diz que a rede DEVERIA ter internet (propriedade
      // estática do transporte); NET_CAPABILITY_VALIDATED é o Android confirmando de
      // fato o acesso (probe periódico) -- exigir os dois evita falso positivo com
      // wifi "conectado" mas sem internet real.
      return (
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
      );
    } catch (Exception e) {
      return false;
    }
  }
}
