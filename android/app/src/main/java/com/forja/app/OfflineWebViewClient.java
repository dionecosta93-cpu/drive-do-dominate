package com.forja.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.IOException;
import java.io.InputStream;

/**
 * Sem internet, o Capacitor não consegue buscar o site publicado (ele mesmo faz essa
 * busca pra injetar a ponte nativa, antes mesmo do service worker do navegador entrar
 * em ação). Aqui a gente intercepta só a navegação principal quando está offline e
 * devolve uma página local (public/offline-app.html, já embutida no APK via cap sync)
 * SEM trocar a URL/origem — assim o localStorage continua sendo o mesmo do site real,
 * e a tela offline consegue mostrar as tarefas já salvas no aparelho.
 */
public class OfflineWebViewClient extends BridgeWebViewClient {

  public OfflineWebViewClient(Bridge bridge) {
    super(bridge);
  }

  @Override
  public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    if (request.isForMainFrame() && !isOnline()) {
      try {
        InputStream stream = bridge.getContext().getAssets().open("public/offline-app.html");
        return new WebResourceResponse("text/html", "UTF-8", stream);
      } catch (IOException e) {
        // sem o asset local por algum motivo: cai no comportamento padrão abaixo
      }
    }
    return super.shouldInterceptRequest(view, request);
  }

  private boolean isOnline() {
    try {
      Context context = bridge.getContext();
      ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
      if (cm == null) return true; // não deu pra checar: não bloqueia o fluxo normal
      NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
      return caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    } catch (Exception e) {
      return true;
    }
  }
}
