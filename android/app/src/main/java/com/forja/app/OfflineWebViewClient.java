package com.forja.app;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Sem internet, o Capacitor não consegue buscar o site publicado (ele mesmo faz essa
 * busca pra injetar a ponte nativa, antes mesmo do service worker do navegador entrar
 * em ação). Aqui a gente intercepta a navegação principal quando está offline e
 * devolve uma página local (public/offline-app.html, já embutida no APK via cap sync)
 * SEM trocar a URL/origem — assim o localStorage continua sendo o mesmo do site real,
 * e a tela offline consegue mostrar as tarefas já salvas no aparelho.
 *
 * Essa página tenta restaurar o app completo (HTML já visto, guardado pelo próprio
 * app em Cache Storage — ver src/lib/html-snapshot.ts). Só que os arquivos JS/CSS
 * que ela referencia são sub-recursos de rede de verdade, e o Service Worker do
 * navegador não intercepta essas requisições de forma confiável dentro do WebView
 * do Android. Por isso também servimos esses arquivos aqui, direto de um cache em
 * disco (OfflineAssetStore) que o próprio app populou enquanto estava online.
 */
public class OfflineWebViewClient extends BridgeWebViewClient {

  // "bridge" na classe-mãe é privado — guardamos nossa própria referência.
  private final Bridge ownBridge;
  private final OfflineAssetStore assetStore;

  public OfflineWebViewClient(Bridge bridge, OfflineAssetStore assetStore) {
    super(bridge);
    this.ownBridge = bridge;
    this.assetStore = assetStore;
  }

  @Override
  public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
    if (!isOnline()) {
      if (request.isForMainFrame()) {
        try {
          InputStream stream = ownBridge.getContext().getAssets().open("public/offline-app.html");
          return new WebResourceResponse("text/html", "UTF-8", stream);
        } catch (IOException e) {
          // sem o asset local por algum motivo: cai no comportamento padrão abaixo
        }
      } else if ("GET".equalsIgnoreCase(request.getMethod())) {
        WebResourceResponse cached = fromAssetStore(request.getUrl().toString());
        if (cached != null) return cached;
      }
    }
    return super.shouldInterceptRequest(view, request);
  }

  private WebResourceResponse fromAssetStore(String url) {
    java.io.File file = assetStore.get(url);
    if (file == null) return null;
    try {
      InputStream stream = new java.io.FileInputStream(file);
      return new WebResourceResponse(OfflineAssetStore.mimeTypeFor(url), "UTF-8", stream);
    } catch (IOException e) {
      return null;
    }
  }

  // Segunda camada de defesa: se por algum motivo a navegação principal foi tentada
  // pela rede mesmo estando offline (ex.: o MainActivity achou que havia internet) e
  // falhou, troca o conteúdo pela página local em vez de deixar o Chromium mostrar a
  // tela nativa "net::ERR_...". loadDataWithBaseURL mantém a mesma origem (baseUrl),
  // então o localStorage continua sendo o mesmo.
  @Override
  public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
    if (request.isForMainFrame()) {
      String html = readOfflineHtml();
      if (html != null) {
        view.loadDataWithBaseURL(request.getUrl().toString(), html, "text/html", "UTF-8", null);
        return;
      }
    }
    super.onReceivedError(view, request, error);
  }

  private String readOfflineHtml() {
    try (
      InputStream stream = ownBridge.getContext().getAssets().open("public/offline-app.html");
      BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))
    ) {
      StringBuilder sb = new StringBuilder();
      String line;
      while ((line = reader.readLine()) != null) sb.append(line).append('\n');
      return sb.toString();
    } catch (IOException e) {
      return null;
    }
  }

  private boolean isOnline() {
    try {
      Context context = ownBridge.getContext();
      ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
      if (cm == null) return false;
      NetworkCapabilities caps = cm.getNetworkCapabilities(cm.getActiveNetwork());
      if (caps == null) return false;
      return (
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
        caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_VALIDATED)
      );
    } catch (Exception e) {
      return false;
    }
  }
}
