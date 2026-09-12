package com.forja.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Reagenda os despertadores (AlarmPlugin) depois que o aparelho reinicia — sem isso,
 * o AlarmManager esquece tudo no reboot e o JS só re-agenda quando o app é reaberto.
 * Lê o que foi salvo por AlarmPlugin.persistPlanned (SharedPreferences), sem precisar
 * do WebView/JS pra nada disso.
 */
public class BootReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;

    SharedPreferences prefs = context.getSharedPreferences("forja_alarms", Context.MODE_PRIVATE);
    String json = prefs.getString("planned", "[]");
    long now = System.currentTimeMillis();

    try {
      JSONArray items = new JSONArray(json);
      for (int i = 0; i < items.length(); i++) {
        JSONObject item = items.getJSONObject(i);
        long atMillis;
        try {
          atMillis = Long.parseLong(item.optString("atMillis"));
        } catch (NumberFormatException e) {
          continue;
        }
        if (atMillis <= now) continue;
        AlarmScheduler.schedule(
            context,
            item.optInt("id"),
            atMillis,
            item.optString("title"),
            item.optString("body"),
            item.optString("sound"),
            item.optString("taskId"),
            item.optString("date"));
      }
    } catch (Exception e) {
      // nada salvo ainda, ou JSON inválido: nada a restaurar
    }
  }
}
