package com.robot2027.companion;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.WindowManager;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "RobotNative")
public class RobotNativePlugin extends Plugin {
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private SpeechRecognizer speechRecognizer;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private int savedNotificationVolume = -1;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                ttsReady = true;
                tts.setLanguage(Locale.US);
                tts.setSpeechRate(0.95f);
                tts.setPitch(1.06f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override
                    public void onStart(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("ttsStart", data);
                    }

                    @Override
                    public void onDone(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("ttsEnd", data);
                    }

                    @Override
                    public void onError(String utteranceId) {
                        JSObject data = new JSObject();
                        data.put("id", utteranceId);
                        notifyListeners("ttsEnd", data);
                    }
                });
            }
        });
    }

    @PluginMethod
    public void requestAllPermissions(PluginCall call) {
        Activity act = getActivity();
        if (act == null) {
            call.resolve();
            return;
        }
        List<String> needed = new ArrayList<>();
        String[] perms = new String[]{
            Manifest.permission.RECORD_AUDIO,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        };
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(getContext(), p) != PackageManager.PERMISSION_GRANTED) {
                needed.add(p);
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.BLUETOOTH_CONNECT);
            }
            if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) != PackageManager.PERMISSION_GRANTED) {
                needed.add(Manifest.permission.BLUETOOTH_SCAN);
            }
        }
        if (!needed.isEmpty()) {
            ActivityCompat.requestPermissions(act, needed.toArray(new String[0]), 2027);
        }
        call.resolve();
    }

    @PluginMethod
    public void getDeviceStatus(PluginCall call) {
        Context ctx = getContext();
        int batteryPct = 65;
        float tempC = 38.0f;

        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = ctx.registerReceiver(null, ifilter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                if (level >= 0 && scale > 0) {
                    batteryPct = Math.round((level * 100f) / scale);
                }
                int tempTenths = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 380);
                tempC = tempTenths / 10.0f;
            }
        } catch (Exception ignored) {}

        String wifiSsid = "Chưa kết nối";
        String localIp = "0.0.0.0";

        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo activeNet = cm != null ? cm.getActiveNetworkInfo() : null;
            if (activeNet != null && activeNet.isConnected()) {
                WifiManager wm = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    WifiInfo info = wm.getConnectionInfo();
                    if (info != null) {
                        String rawSsid = info.getSSID();
                        if (rawSsid != null) {
                            wifiSsid = rawSsid.replace("\"", "");
                        }
                        if (wifiSsid.isEmpty() || wifiSsid.toLowerCase().contains("unknown ssid")) {
                            wifiSsid = "Đã kết nối (Bật GPS để hiện tên)";
                        }
                        int ipInt = info.getIpAddress();
                        if (ipInt != 0) {
                            localIp = String.format(
                                Locale.US,
                                "%d.%d.%d.%d",
                                (ipInt & 0xff),
                                (ipInt >> 8 & 0xff),
                                (ipInt >> 16 & 0xff),
                                (ipInt >> 24 & 0xff)
                            );
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        JSObject ret = new JSObject();
        ret.put("battery", batteryPct);
        ret.put("temperature", tempC);
        ret.put("wifiSsid", wifiSsid);
        ret.put("localIp", localIp);
        call.resolve(ret);
    }

    @PluginMethod
    public void speak(PluginCall call) {
        final String text = call.getString("text", "");
        final String lang = call.getString("lang", "en-US");
        final float rate = call.getFloat("rate", 0.95f);
        final float pitch = call.getFloat("pitch", 1.06f);

        if (text.trim().isEmpty() || !ttsReady) {
            call.resolve();
            return;
        }

        mainHandler.post(() -> {
            try {
                if (lang.toLowerCase().startsWith("vi")) {
                    Locale vi = new Locale("vi", "VN");
                    if (tts.isLanguageAvailable(vi) >= TextToSpeech.LANG_AVAILABLE) {
                        tts.setLanguage(vi);
                    } else {
                        tts.setLanguage(Locale.US);
                    }
                } else {
                    tts.setLanguage(Locale.US);
                }
                tts.setSpeechRate(rate);
                tts.setPitch(pitch);
                String uttId = UUID.randomUUID().toString();
                tts.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), uttId);
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @PluginMethod
    public void stopSpeak(PluginCall call) {
        mainHandler.post(() -> {
            if (tts != null) tts.stop();
            call.resolve();
        });
    }

    private void muteSystemBeep(boolean mute) {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;
            if (mute) {
                if (savedNotificationVolume < 0) {
                    savedNotificationVolume = am.getStreamVolume(AudioManager.STREAM_NOTIFICATION);
                }
                am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, 0);
            } else if (savedNotificationVolume >= 0) {
                am.setStreamVolume(AudioManager.STREAM_NOTIFICATION, savedNotificationVolume, 0);
                savedNotificationVolume = -1;
            }
        } catch (Exception ignored) {}
    }

    @PluginMethod
    public void startListening(PluginCall call) {
        final String lang = call.getString("lang", "en-US");

        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            Activity act = getActivity();
            if (act != null) {
                ActivityCompat.requestPermissions(act, new String[]{Manifest.permission.RECORD_AUDIO}, 2028);
            }
            call.reject("Chưa có quyền Micro");
            return;
        }

        mainHandler.post(() -> {
            try {
                if (tts != null) tts.stop();
                muteSystemBeep(true);

                if (speechRecognizer != null) {
                    try { speechRecognizer.destroy(); } catch (Exception ignored) {}
                    speechRecognizer = null;
                }

                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                speechRecognizer.setRecognitionListener(new RecognitionListener() {
                    @Override
                    public void onReadyForSpeech(Bundle params) {
                        mainHandler.postDelayed(() -> muteSystemBeep(false), 350);
                    }

                    @Override
                    public void onBeginningOfSpeech() {}

                    @Override
                    public void onRmsChanged(float rmsdB) {}

                    @Override
                    public void onBufferReceived(byte[] buffer) {}

                    @Override
                    public void onEndOfSpeech() {}

                    @Override
                    public void onError(int error) {
                        muteSystemBeep(false);
                        JSObject ev = new JSObject();
                        ev.put("code", error);
                        notifyListeners("speechError", ev);
                    }

                    @Override
                    public void onResults(Bundle results) {
                        muteSystemBeep(false);
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String best = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                        JSObject ev = new JSObject();
                        ev.put("text", best);
                        notifyListeners("speechResult", ev);
                    }

                    @Override
                    public void onPartialResults(Bundle partialResults) {}

                    @Override
                    public void onEvent(int eventType, Bundle params) {}
                });

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
                speechRecognizer.startListening(intent);
                call.resolve();
            } catch (Exception e) {
                muteSystemBeep(false);
                call.reject("Lỗi Micro: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        mainHandler.post(() -> {
            muteSystemBeep(false);
            if (speechRecognizer != null) {
                try { speechRecognizer.stopListening(); } catch (Exception ignored) {}
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void setBrightness(PluginCall call) {
        int level = call.getInt("level", 70);
        final float brightness = Math.max(0.05f, Math.min(1.0f, level / 100.0f));
        mainHandler.post(() -> {
            Activity act = getActivity();
            if (act != null) {
                WindowManager.LayoutParams lp = act.getWindow().getAttributes();
                lp.screenBrightness = brightness;
                act.getWindow().setAttributes(lp);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        int level = call.getInt("level", 80);
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC);
                int target = Math.round((Math.max(0, Math.min(100, level)) / 100.0f) * max);
                am.setStreamVolume(AudioManager.STREAM_MUSIC, target, 0);
            }
        } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void openWifiSettings(PluginCall call) {
        mainHandler.post(() -> {
            try {
                Intent intent = new Intent(Settings.ACTION_WIFI_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception ignored) {}
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        muteSystemBeep(false);
        if (tts != null) {
            tts.stop();
            tts.shutdown();
        }
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
        }
        super.handleOnDestroy();
    }
}
