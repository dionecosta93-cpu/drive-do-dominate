package com.forja.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Tela cheia do despertador: toca em loop e vibra até "Desligar", mesmo com o
 * aparelho bloqueado. Disparada pelo AlarmReceiver (AlarmManager.setAlarmClock). */
public class AlarmActivity extends Activity {
  private MediaPlayer player;
  private Vibrator vibrator;
  private PowerManager.WakeLock wakeLock;
  private int alarmId;

  @Override
  @SuppressWarnings("deprecation")
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    getWindow()
        .addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
      KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null) km.requestDismissKeyguard(this, null);
    }

    PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
    if (pm != null) {
      wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "forja:alarm");
      wakeLock.acquire(10 * 60 * 1000L);
    }

    alarmId = getIntent().getIntExtra("id", 0);
    String title = getIntent().getStringExtra("title");
    String body = getIntent().getStringExtra("body");
    String sound = getIntent().getStringExtra("sound");

    buildUi(title, body);
    playSound(sound);
    startVibration();
  }

  private void buildUi(String title, String body) {
    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER);
    root.setBackgroundColor(Color.parseColor("#050505"));
    int pad = dp(24);
    root.setPadding(pad, pad, pad, pad);

    TextView icon = new TextView(this);
    icon.setText("⏰");
    icon.setTextSize(56);
    icon.setGravity(Gravity.CENTER);
    root.addView(icon);

    TextView titleView = new TextView(this);
    titleView.setText(title != null && !title.isEmpty() ? title : "Forja");
    titleView.setTextColor(Color.WHITE);
    titleView.setTextSize(24);
    titleView.setGravity(Gravity.CENTER);
    titleView.setPadding(0, dp(16), 0, dp(8));
    root.addView(titleView);

    TextView bodyView = new TextView(this);
    bodyView.setText(body != null ? body : "");
    bodyView.setTextColor(Color.parseColor("#a1a1aa"));
    bodyView.setTextSize(15);
    bodyView.setGravity(Gravity.CENTER);
    root.addView(bodyView);

    Button stopButton = new Button(this);
    stopButton.setText("DESLIGAR");
    stopButton.setTextColor(Color.BLACK);
    stopButton.setBackgroundColor(Color.parseColor("#22c55e"));
    LinearLayout.LayoutParams stopParams =
        new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(56));
    stopParams.topMargin = dp(40);
    stopButton.setLayoutParams(stopParams);
    stopButton.setOnClickListener(v -> finishAlarm());
    root.addView(stopButton);

    Button snoozeButton = new Button(this);
    snoozeButton.setText("SONECA 5 MIN");
    snoozeButton.setTextColor(Color.WHITE);
    snoozeButton.setBackgroundColor(Color.parseColor("#232326"));
    LinearLayout.LayoutParams snoozeParams =
        new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(48));
    snoozeParams.topMargin = dp(12);
    snoozeButton.setLayoutParams(snoozeParams);
    snoozeButton.setOnClickListener(v -> snooze());
    root.addView(snoozeButton);

    setContentView(root);
  }

  private int dp(int value) {
    float density = getResources().getDisplayMetrics().density;
    return Math.round(value * density);
  }

  private void playSound(String sound) {
    try {
      int resId = 0;
      if (sound != null && !sound.isEmpty()) {
        resId = getResources().getIdentifier(sound, "raw", getPackageName());
      }
      Uri uri =
          resId != 0
              ? Uri.parse("android.resource://" + getPackageName() + "/" + resId)
              : RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
      player = new MediaPlayer();
      player.setDataSource(this, uri);
      if (Build.VERSION.SDK_INT >= 21) {
        player.setAudioAttributes(
            new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
      } else {
        player.setAudioStreamType(AudioManager.STREAM_ALARM);
      }
      player.setLooping(true);
      player.prepare();
      player.start();
    } catch (Exception e) {
      // sem som: o alarme ainda vibra e mostra a tela
    }
  }

  private void startVibration() {
    vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    if (vibrator == null) return;
    long[] pattern = {0, 800, 400};
    if (Build.VERSION.SDK_INT >= 26) {
      vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
    } else {
      vibrator.vibrate(pattern, 0);
    }
  }

  private void snooze() {
    String taskId = getIntent().getStringExtra("taskId");
    String date = getIntent().getStringExtra("date");
    String title = getIntent().getStringExtra("title");
    String body = getIntent().getStringExtra("body");
    String sound = getIntent().getStringExtra("sound");
    stopRinging();
    long snoozeAt = System.currentTimeMillis() + 5 * 60 * 1000L;
    AlarmScheduler.schedule(this, alarmId, snoozeAt, title, body, sound, taskId, date);
    finish();
  }

  private void finishAlarm() {
    stopRinging();
    finish();
  }

  private void stopRinging() {
    if (player != null) {
      try {
        player.stop();
        player.release();
      } catch (Exception e) {
        /* ignora */
      }
      player = null;
    }
    if (vibrator != null) vibrator.cancel();
    if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
  }

  @Override
  protected void onDestroy() {
    stopRinging();
    super.onDestroy();
  }

  @Override
  @SuppressWarnings("deprecation")
  public void onBackPressed() {
    finishAlarm();
  }
}
