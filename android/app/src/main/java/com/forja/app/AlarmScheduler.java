package com.forja.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

/** Agenda/cancela o despertador via AlarmManager.setAlarmClock (mesma categoria dos
 * despertadores nativos do Android — sobrevive à economia de bateria/Doze). */
public class AlarmScheduler {

  public static void schedule(
      Context context,
      int id,
      long atMillis,
      String title,
      String body,
      String sound,
      String taskId,
      String date) {
    AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    if (am == null) return;

    Intent intent = new Intent(context, AlarmReceiver.class);
    intent.putExtra("id", id);
    intent.putExtra("title", title);
    intent.putExtra("body", body);
    intent.putExtra("sound", sound);
    intent.putExtra("taskId", taskId);
    intent.putExtra("date", date);
    PendingIntent operation =
        PendingIntent.getBroadcast(
            context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    Intent showIntent = new Intent(context, MainActivity.class);
    PendingIntent showPI =
        PendingIntent.getActivity(
            context, id, showIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

    am.setAlarmClock(new AlarmManager.AlarmClockInfo(atMillis, showPI), operation);
  }

  public static void cancel(Context context, int id) {
    AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
    Intent intent = new Intent(context, AlarmReceiver.class);
    PendingIntent operation =
        PendingIntent.getBroadcast(
            context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    if (am != null) am.cancel(operation);
    operation.cancel();
  }
}
