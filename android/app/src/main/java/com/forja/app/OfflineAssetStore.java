package com.forja.app;

import android.content.Context;
import android.net.Uri;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Guarda em disco (context.getFilesDir()) uma cópia dos arquivos JS/CSS que o app
 * carrega, pra servir offline depois.
 *
 * Por quê isso é nativo e não via Service Worker/Cache Storage do navegador: o
 * WebView do Android não intercepta essas requisições de forma confiável (só o
 * HTML principal tem um jeito de contornar isso, via CapConfig — ver
 * MainActivity.java). shouldInterceptRequest, por outro lado, É chamado pelo
 * Android pra TODA requisição do WebView (principal e sub-recursos), então dá
 * pra responder direto do disco sem depender de nada do lado do navegador.
 *
 * O app (JS, ver src/lib/html-snapshot.ts) chama syncAssets() com a lista COMPLETA
 * de arquivos do build, via a ponte registrada em MainActivity.
 *
 * Cuidados:
 *  - filesDir (não cacheDir): o Android apaga cacheDir sozinho quando falta espaço,
 *    e o "Limpar cache" do sistema também — o app offline sumiria sem aviso.
 *  - Escrita atômica (arquivo .tmp + rename): download interrompido não deixa um JS
 *    cortado que seria servido offline pra sempre.
 *  - Só baixa do host do próprio app (a ponte fica exposta a qualquer página que o
 *    WebView abrir, ex.: login do Google).
 */
public class OfflineAssetStore {

  private static final String TAG = "OfflineAssetStore";
  private static final String DIR_NAME = "offline-assets";
  private static final String TMP_SUFFIX = ".tmp";
  private static final int MAX_URLS = 400;
  private static final long MAX_FILE_BYTES = 8L * 1024 * 1024;

  private final Context appContext;
  private final String allowedHost;
  // Uma fila só: syncs não rodam em paralelo (o prune de um não atropela o download de outro).
  private final ExecutorService worker = Executors.newSingleThreadExecutor();

  public OfflineAssetStore(Context context, String allowedHost) {
    this.appContext = context.getApplicationContext();
    this.allowedHost = allowedHost;
    // Versão anterior guardava em cacheDir — limpa o resto pra não ocupar espaço à toa.
    deleteRecursively(new File(appContext.getCacheDir(), DIR_NAME));
  }

  private File dir() {
    File d = new File(appContext.getFilesDir(), DIR_NAME);
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

  private boolean isAllowed(String urlStr) {
    if (allowedHost == null) return false;
    try {
      Uri uri = Uri.parse(urlStr);
      return "https".equals(uri.getScheme()) && allowedHost.equalsIgnoreCase(uri.getHost());
    } catch (Exception e) {
      return false;
    }
  }

  /**
   * Baixa o que ainda não está em disco e apaga o que NÃO está na lista (versões
   * antigas do build). Nomes dos arquivos têm hash de conteúdo, então "já existe"
   * significa "já é essa versão".
   */
  public void sync(final String[] urls) {
    worker.execute(() -> {
      Set<String> wanted = new HashSet<>();
      int count = 0;
      for (String url : urls) {
        if (count >= MAX_URLS) break;
        if (!isAllowed(url)) continue;
        count++;
        wanted.add(keyFor(url));
        try {
          downloadOne(url);
        } catch (Exception e) {
          Log.w(TAG, "falha ao cachear " + url + ": " + e.getMessage());
        }
      }
      if (wanted.isEmpty()) return; // lista vazia/inválida: nunca apaga tudo por engano
      File[] files = dir().listFiles();
      if (files == null) return;
      for (File f : files) {
        String name = f.getName();
        if (name.endsWith(TMP_SUFFIX) || !wanted.contains(name)) f.delete();
      }
    });
  }

  private void downloadOne(String urlStr) throws IOException {
    File dest = new File(dir(), keyFor(urlStr));
    if (dest.exists()) return;
    File tmp = new File(dir(), dest.getName() + TMP_SUFFIX);
    HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
    conn.setConnectTimeout(8000);
    conn.setReadTimeout(8000);
    boolean ok = false;
    try {
      if (conn.getResponseCode() != 200) return;
      long total = 0;
      try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) != -1) {
          total += n;
          if (total > MAX_FILE_BYTES) throw new IOException("arquivo grande demais");
          out.write(buf, 0, n);
        }
      }
      ok = total > 0 && tmp.renameTo(dest);
    } finally {
      conn.disconnect();
      if (!ok) tmp.delete();
    }
  }

  /** Null se essa URL nunca foi cacheada. */
  public File get(String urlStr) {
    File f = new File(dir(), keyFor(urlStr));
    return f.exists() ? f : null;
  }

  private static void deleteRecursively(File f) {
    if (!f.exists()) return;
    File[] children = f.listFiles();
    if (children != null) for (File c : children) deleteRecursively(c);
    f.delete();
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
