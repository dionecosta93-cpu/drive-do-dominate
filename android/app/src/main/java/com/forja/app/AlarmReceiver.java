package com.forja.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Disparado pelo AlarmManager no horário exato — abre a tela de despertador. */
public class AlarmReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    Intent activityIntent = new Intent(context, AlarmActivity.class);
    activityIntent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK
            | Intent.FLAG_ACTIVITY_CLEAR_TOP
            | Intent.FLAG_ACTIVITY_SINGLE_TOP);
    activityIntent.putExtras(intent);
    context.startActivity(activityIntent);
  }
}
