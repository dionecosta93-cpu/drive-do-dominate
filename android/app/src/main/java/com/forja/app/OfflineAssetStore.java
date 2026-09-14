package com.forja.app;

import android.content.Context;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Guarda em disco (context.getCacheDir()) uma cópia dos arquivos JS/CSS que o app
 * carrega, pra servir offline depois.
 *
 * Por quê isso é nativo e não via Service Worker/Cache Storage do navegador: o
 * WebView do Android não intercepta essas requisições de forma confiável (só o
 * HTML principal tem um jeito de contornar isso, via CapConfig — ver
 * MainActivity.java). shouldInterceptRequest, por outro lado, É chamado pelo
 * Android pra TODA requisição do WebView (principal e sub-recursos), então dá
 * pra responder direto do disco sem depender de nada do lado do navegador.
 *
 * O app (JS, ver src/lib/html-snapshot.ts) chama cacheUrls() com a lista de
 * arquivos que a página atual usa, via a ponte registrada em MainActivity.
 */
public class OfflineAssetStore {

  private static final String TAG = "OfflineAssetStore";
  private static final String DIR_NAME = "offline-assets";

  private final Context appContext;

  public OfflineAssetStore(Context context) {
    this.appContext = context.getApplicationContext();
  }

  private File dir() {
    File d = new File(appContext.getCacheDir(), DIR_NAME);
    if (!d.exists()) d.mkdirs();
    return d;
  }

  private String keyFor(String url) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hash = digest.digest(url.getBytes("UTF-8"));
      StringBuilder sb = new StringBuilder();
      for (byte b : hash) sb.append(String.format("%02x", b));
      return sb.toString();
    } catch (Exception e) {
      return String.valueOf(url.hashCode());
    }
  }

  /** Baixa e salva cada URL em background. Chamado só enquanto online. */
  public void cacheUrls(final String[] urls) {
    new Thread(() -> {
      for (String url : urls) {
        try {
          downloadOne(url);
        } catch (Exception e) {
          Log.w(TAG, "falha ao cachear " + url + ": " + e.getMessage());
        }
      }
    }).start();
  }

  private void downloadOne(String urlStr) throws IOException {
    File dest = new File(dir(), keyFor(urlStr));
    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
    conn.setConnectTimeout(8000);
    conn.setReadTimeout(8000);
    try {
      int code = conn.getResponseCode();
      if (code != 200) return;
      try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(dest)) {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
      }
    } finally {
      conn.disconnect();
    }
  }

  /** Null se essa URL nunca foi cacheada. */
  public File get(String urlStr) {
    File f = new File(dir(), keyFor(urlStr));
    return f.exists() ? f : null;
  }

  public static String mimeTypeFor(String urlStr) {
    String path = urlStr;
    int q = path.indexOf('?');
    if (q != -1) path = path.substring(0, q);
    if (path.endsWith(".css")) return "text/css";
    if (path.endsWith(".js") || path.endsWith(".mjs")) return "application/javascript";
    if (path.endsWith(".json")) return "application/json";
    if (path.endsWith(".svg")) return "image/svg+xml";
    if (path.endsWith(".png")) return "image/png";
    if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
    if (path.endsWith(".woff2")) return "font/woff2";
    if (path.endsWith(".woff")) return "font/woff";
    return "application/octet-stream";
  }
}
