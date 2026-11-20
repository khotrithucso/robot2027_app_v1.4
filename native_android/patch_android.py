import pathlib
import re

# 1. Nâng compileSdkVersion & targetSdkVersion lên 35 trong android/variables.gradle
vars_path = pathlib.Path("android/variables.gradle")
if vars_path.exists():
    txt = vars_path.read_text(encoding="utf-8")
    txt = re.sub(r"compileSdkVersion\s*=\s*\d+", "compileSdkVersion = 35", txt)
    txt = re.sub(r"targetSdkVersion\s*=\s*\d+", "targetSdkVersion = 35", txt)
    txt = re.sub(r"minSdkVersion\s*=\s*\d+", "minSdkVersion = 24", txt)
    vars_path.write_text(txt, encoding="utf-8")
    print("Patched android/variables.gradle -> compileSdkVersion = 35, targetSdkVersion = 35")

# 2. Tắt cảnh báo compileSdk 35 trong android/gradle.properties
props_path = pathlib.Path("android/gradle.properties")
if props_path.exists():
    ptxt = props_path.read_text(encoding="utf-8")
    if "android.suppressUnsupportedCompileSdk" not in ptxt:
        ptxt += "\nandroid.suppressUnsupportedCompileSdk=35\n"
        props_path.write_text(ptxt, encoding="utf-8")

# 3. Cập nhật AndroidManifest.xml: Quyền Mic, Wi-Fi/GPS, Bluetooth BLE, Landscape Kiosk, Queries Speech/TTS
manifest_path = pathlib.Path("android/app/src/main/AndroidManifest.xml")
if manifest_path.exists():
    m_txt = manifest_path.read_text(encoding="utf-8")

    perms = [
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.CHANGE_WIFI_STATE",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.WAKE_LOCK"
    ]
    perm_lines = []
    for p in perms:
        if p not in m_txt:
            perm_lines.append(f'    <uses-permission android:name="{p}" />')

    if perm_lines:
        m_txt = m_txt.replace(
            '<uses-permission android:name="android.permission.INTERNET" />',
            '<uses-permission android:name="android.permission.INTERNET" />\n' + "\n".join(perm_lines)
        )

    if "usesCleartextTraffic" not in m_txt:
        m_txt = m_txt.replace("<application", '<application android:usesCleartextTraffic="true"')

    if "android:screenOrientation" not in m_txt:
        m_txt = m_txt.replace(
            'android:name=".MainActivity"',
            'android:name=".MainActivity" android:screenOrientation="sensorLandscape" android:keepScreenOn="true"'
        )

    if "<queries>" not in m_txt:
        queries_block = '''
    <queries>
        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
        <intent>
            <action android:name="android.intent.action.TTS_SERVICE" />
        </intent>
    </queries>
'''
        m_txt = m_txt.replace("</manifest>", queries_block + "\n</manifest>")

    manifest_path.write_text(m_txt, encoding="utf-8")
    print("Patched AndroidManifest.xml successfully!")
