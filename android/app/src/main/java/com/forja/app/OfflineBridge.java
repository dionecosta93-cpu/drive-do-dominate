package com.forja.app;

import android.webkit.JavascriptInterface;
import org.json.JSONArray;

/**
 * Ponte JS -> nativo (window.AndroidOffline no WebView). O app chama
 * cacheUrls() com os arquivos JS/CSS da página atual (ver
 * src/lib/html-snapshot.ts) sempre que está online, pra dar pro
 * OfflineAssetStore baixar e guardar em disco -- e servir depois via
 * OfflineWebViewClient quando não há internet.
 */
public class OfflineBridge {

  private final OfflineAssetStore store;

  public OfflineBridge(OfflineAssetStore store) {
    this.store = store;
  }

  @JavascriptInterface
  public void cacheUrls(String jsonArrayOfUrls) {
    try {
      JSONArray arr = new JSONArray(jsonArrayOfUrls);
      String[] urls = new String[arr.length()];
      for (int i = 0; i < arr.length(); i++) urls[i] = arr.getString(i);
      store.cacheUrls(urls);
    } catch (Exception e) {
      // JSON inválido vindo do JS: ignora, não é crítico
    }
  }
}
