package com.forja.app;

import android.webkit.JavascriptInterface;
import org.json.JSONArray;

/**
 * Ponte JS -> nativo (window.AndroidOffline no WebView). O app chama
 * syncAssets() com a lista completa de arquivos JS/CSS do build (ver
 * src/lib/html-snapshot.ts) sempre que está online, pra dar pro
 * OfflineAssetStore baixar e guardar em disco -- e servir depois via
 * OfflineWebViewClient quando não há internet.
 */
public class OfflineBridge {

  private final OfflineAssetStore store;

  public OfflineBridge(OfflineAssetStore store) {
    this.store = store;
  }

  /** Baixa o que falta e apaga o que não está mais na lista (versões antigas). */
  @JavascriptInterface
  public void syncAssets(String jsonArrayOfUrls) {
    String[] urls = parse(jsonArrayOfUrls);
    if (urls != null) store.sync(urls);
  }

  /** Nome antigo (JS de versões anteriores do app ainda chama isso). */
  @JavascriptInterface
  public void cacheUrls(String jsonArrayOfUrls) {
    syncAssets(jsonArrayOfUrls);
  }

  private static String[] parse(String json) {
    try {
      JSONArray arr = new JSONArray(json);
      String[] urls = new String[arr.length()];
      for (int i = 0; i < arr.length(); i++) urls[i] = arr.getString(i);
      return urls;
    } catch (Exception e) {
      return null; // JSON inválido vindo do JS: ignora, não é crítico
    }
  }
}
