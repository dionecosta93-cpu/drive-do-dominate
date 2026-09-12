package com.forja.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSArray;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Ponte JS -> AlarmScheduler. Ver src/lib/native-alarm.ts no lado web. */
@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {

  @PluginMethod
  public void schedule(PluginCall call) {
    Integer id = call.getInt("id");
    String atMillisStr = call.getString("atMillis");
    if (id == null || atMillisStr == null) {
      call.reject("id e atMillis são obrigatórios");
      return;
    }
    long atMillis;
    try {
      atMillis = Long.parseLong(atMillisStr);
    } catch (NumberFormatException e) {
      call.reject("atMillis inválido");
      return;
    }
    String title = call.getString("title", "Forja");
    String body = call.getString("body", "");
    String sound = call.getString("sound", "");
    String taskId = call.getString("taskId", "");
    String date = call.getString("date", "");
    AlarmScheduler.schedule(getContext(), id, atMillis, title, body, sound, taskId, date);
    call.resolve();
  }

  /**
   * Salva a lista completa de despertadores planejados em SharedPreferences (JSON),
   * pra o BootReceiver conseguir re-agendar tudo sem depender do WebView/JS caso o
   * aparelho reinicie (ou o Android limpe os alarmes agendados, comum em alguns
   * fabricantes). Chamado toda vez que o app recalcula os despertadores.
   */
  @PluginMethod
  public void persistPlanned(PluginCall call) {
    JSArray items = call.getArray("items");
    SharedPreferences prefs = getContext().getSharedPreferences("forja_alarms", Context.MODE_PRIVATE);
    prefs.edit().putString("planned", items != null ? items.toString() : "[]").apply();
    call.resolve();
  }

  @PluginMethod
  public void cancel(PluginCall call) {
    Integer id = call.getInt("id");
    if (id == null) {
      call.reject("id é obrigatório");
      return;
    }
    AlarmScheduler.cancel(getContext(), id);
    call.resolve();
  }
}
