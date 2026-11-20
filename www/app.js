// Robot 2027 Companion V1.4 - Complete Application Controller

const Native = () => window.Capacitor?.Plugins?.RobotNative || null;

// =========================================================================
// 1. TRẠNG THÁI HỆ THỐNG & DỮ LIỆU MẶC ĐỊNH
// =========================================================================
let currentTab = 'robot';
let childName = localStorage.getItem('robo_child_name') || 'Bé Bi';
let starsCount = parseInt(localStorage.getItem('robo_stars') || '2', 10);
let parentPin = localStorage.getItem('robo_pin') || '1234';
let apiEndpoint = localStorage.getItem('robo_api_url') || 'https://khotrithucso.io.vn/robot2027_2_4/api.php';
let ytUnlockedUntil = 0;
let ytActiveVideoUrl = '';
let lastChildHeardText = '';
let idleTimer = null;
let isSleeping = false;
let bleCharacteristic = null;

// Kho 8 chủ đề học tiếng Anh chuẩn sẵn có Offline (Mở rộng lên 32 gói khi bấm Đồng bộ Server)
const DEFAULT_TOPICS = [
  {
    id: 'greetings',
    title: '1. Chào hỏi & Làm quen',
    items: [
      { en: 'Hello! My name is Robo.', spell: 'Hel-lo! My name is Ro-bo.', vi: 'Xin chào! Tên mình là Robo.' },
      { en: 'How are you today?', spell: 'How are you to-day?', vi: 'Hôm nay bạn khỏe không?' },
      { en: 'Nice to meet you!', spell: 'Nice to meet you!', vi: 'Rất vui được gặp bạn!' }
    ]
  },
  {
    id: 'family',
    title: '2. Gia đình yêu thương',
    items: [
      { en: 'I love my mom and dad.', spell: 'I love my mom and dad.', vi: 'Con yêu bố và mẹ.' },
      { en: 'My sister is very kind.', spell: 'My sis-ter is ve-ry kind.', vi: 'Chị gái của mình rất tốt bụng.' },
      { en: 'My grandpa tells funny stories.', spell: 'My grand-pa tells fun-ny sto-ries.', vi: 'Ông nội kể những câu chuyện rất vui.' }
    ]
  },
  {
    id: 'animals',
    title: '3. Thế giới động vật',
    items: [
      { en: 'The cute cat likes milk.', spell: 'The cute cat likes milk.', vi: 'Chú mèo dễ thương thích uống sữa.' },
      { en: 'A big elephant has a long trunk.', spell: 'A big e-le-phant has a long trunk.', vi: 'Chú voi to lớn có cái vòi dài.' },
      { en: 'The happy dog wags its tail.', spell: 'The hap-py dog wags its tail.', vi: 'Chú chó vui vẻ vẫy cái đuôi.' }
    ]
  },
  {
    id: 'colors',
    title: '4. Màu sắc & Số đếm',
    items: [
      { en: 'The sky is blue and bright.', spell: 'The sky is blue and bright.', vi: 'Bầu trời màu xanh và tươi sáng.' },
      { en: 'I have five red apples.', spell: 'I have five red ap-ples.', vi: 'Mình có năm quả táo màu đỏ.' },
      { en: 'The sun is yellow and warm.', spell: 'The sun is yel-low and warm.', vi: 'Ông mặt trời màu vàng và ấm áp.' }
    ]
  },
  {
    id: 'food',
    title: '5. Đồ ăn & Thức uống',
    items: [
      { en: 'I like eating fresh fruit.', spell: 'I like eat-ing fresh fruit.', vi: 'Mình thích ăn trái cây tươi.' },
      { en: 'Please drink more clean water.', spell: 'Please drink more clean wa-ter.', vi: 'Hãy uống thêm nhiều nước sạch nhé.' }
    ]
  },
  {
    id: 'school',
    title: '6. Trường học vui vẻ',
    items: [
      { en: 'I go to school every morning.', spell: 'I go to school eve-ry morn-ing.', vi: 'Mình đi học vào mỗi buổi sáng.' },
      { en: 'I love reading English books.', spell: 'I love read-ing Eng-lish books.', vi: 'Mình thích đọc sách tiếng Anh.' }
    ]
  },
  {
    id: 'weather',
    title: '7. Thời tiết & Thiên nhiên',
    items: [
      { en: 'It is sunny and windy today.', spell: 'It is sun-ny and win-dy to-day.', vi: 'Hôm nay trời có nắng và gió mát.' },
      { en: 'Look at the rainbow after rain.', spell: 'Look at the rain-bow af-ter rain.', vi: 'Nhìn cầu vồng sau cơn mưa kìa.' }
    ]
  },
  {
    id: 'manners',
    title: '8. Lễ phép & Cảm xúc',
    items: [
      { en: 'Thank you very much!', spell: 'Thank you ve-ry much!', vi: 'Cảm ơn bạn rất nhiều!' },
      { en: 'I feel super happy today!', spell: 'I feel su-per hap-py to-day!', vi: 'Hôm nay mình cảm thấy siêu vui!' }
    ]
  }
];

let studyTopics = JSON.parse(localStorage.getItem('robo_study_topics') || 'null') || DEFAULT_TOPICS;
let activeTopicIndex = 0;
let activeSentenceIndex = 0;

// =========================================================================
// 2. KHỞI TẠO & CẬP NHẬT TRẠNG THÁI THIẾT BỊ (PIN, NHIỆT ĐỘ, WI-FI, IP)
// =========================================================================
window.addEventListener('DOMContentLoaded', async () => {
  const savedSpeed = localStorage.getItem('robo_tts_speed');
  if (savedSpeed) {
    const sel = document.getElementById('ttsSpeedSelect');
    if (sel) sel.value = savedSpeed;
  }

  updateStarsUI();
  renderStudyTopics();
  renderCurrentLesson();
  resetIdleTimer();

  const plugin = Native();
  if (plugin) {
    try {
      await plugin.requestAllPermissions();
      plugin.addListener('ttsStart', () => setRobotExpression('speaking'));
      plugin.addListener('ttsEnd', () => setRobotExpression('idle'));
      plugin.addListener('speechResult', (res) => onSpeechRecognized(res.text || ''));
      plugin.addListener('speechError', () => {
        setRobotExpression('idle');
        document.getElementById('pronounceFeedback').textContent = 'Chưa nghe rõ, bé bấm "Bé đọc" và nói lại nhé!';
      });
    } catch (e) {
      console.warn('Init plugin:', e);
    }
  }

  refreshDeviceStatus();
  setInterval(refreshDeviceStatus, 15000);
  setInterval(updateYoutubeTimer, 1000);
  window.addEventListener('resize', () => {
    if (currentTab === 'youtube' && ytActiveVideoUrl) {
      syncYoutubePlayerLayout('youtube');
    }
  });

  ['touchstart', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, () => {
      if (isSleeping) wakeUpRobot();
      resetIdleTimer();
    }, { passive: true });
  });
});

async function refreshDeviceStatus() {
  const plugin = Native();
  const pill = document.getElementById('batteryTempPill');
  const banner = document.getElementById('settingStatusBanner');

  if (!plugin) {
    banner.textContent = 'Bot ID: BOT_8XSNEI | Wi-Fi: Trình duyệt Web | Nhiệt độ: 38.0°C';
    return;
  }

  try {
    const info = await plugin.getDeviceStatus();
    const bat = info.battery ?? 65;
    const temp = Number(info.temperature ?? 38.0).toFixed(1);
    pill.textContent = `🔋 ${bat}% • ${temp}°C`;

    if (bat < 15 || parseFloat(temp) > 42.0) {
      pill.classList.add('warn');
    } else {
      pill.classList.remove('warn');
    }

    const ipPart = info.localIp && info.localIp !== '0.0.0.0' ? ` (${info.localIp})` : '';
    banner.textContent = `Bot ID: BOT_8XSNEI | Wi-Fi: ${info.wifiSsid}${ipPart} | Nhiệt độ: ${temp}°C`;
  } catch (e) {
    console.warn('Device status error:', e);
  }
}

// =========================================================================
// 3. ĐIỀU HƯỚNG 6 TAB & SỬA TRIỆT ĐỂ MINI-PLAYER YOUTUBE
// =========================================================================
function switchTab(tabName) {
  currentTab = tabName;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  const targetPane = document.getElementById('tab-' + tabName);
  if (targetPane) targetPane.classList.add('active');

  // Auto-Pause TTS & Mic khi rời tab Robot
  if (tabName !== 'robot') {
    stopRobotAudioAndMic();
  }

  // Đồng bộ vị trí/ẩn hiện khung YouTube chuẩn xác trên mọi tab
  requestAnimationFrame(() => syncYoutubePlayerLayout(tabName));
}

function syncYoutubePlayerLayout(tabName) {
  const host = document.getElementById('ytPlayerHost');
  const placeholder = document.getElementById('ytContainerPlaceholder');
  const frame = document.getElementById('ytFrame');

  if (!ytActiveVideoUrl) {
    host.classList.add('hidden-in-setting');
    host.classList.remove('mini');
    return;
  }

  if (tabName === 'youtube') {
    host.classList.remove('hidden-in-setting', 'mini');
    const rect = placeholder.getBoundingClientRect();
    host.style.position = 'fixed';
    host.style.left = rect.left + 'px';
    host.style.top = rect.top + 'px';
    host.style.width = Math.max(200, rect.width) + 'px';
    host.style.height = Math.max(140, rect.height) + 'px';
    host.style.right = 'auto';
    host.style.bottom = 'auto';
    host.style.zIndex = '25';
    if (frame.src !== ytActiveVideoUrl) {
      frame.src = ytActiveVideoUrl;
    }
  } else if (tabName === 'setting') {
    // Ẩn hoàn toàn trong tab Setting để không che nút Cấu Hình Địa Chỉ Server API
    host.classList.add('hidden-in-setting');
    host.classList.remove('mini');
  } else {
    // Mini-player thu nhỏ gọn ở góc dưới bên phải kèm nút phóng to & tắt [✕]
    host.classList.remove('hidden-in-setting');
    host.classList.add('mini');
    host.style.position = 'fixed';
    host.style.left = 'auto';
    host.style.top = 'auto';
    host.style.right = '14px';
    host.style.bottom = '12px';
    host.style.width = '220px';
    host.style.height = '124px';
    host.style.zIndex = '80';
  }
}

function closeYoutubeMiniPlayer() {
  ytActiveVideoUrl = '';
  const frame = document.getElementById('ytFrame');
  frame.src = 'about:blank';
  const host = document.getElementById('ytPlayerHost');
  host.classList.add('hidden-in-setting');
  host.classList.remove('mini');
}

function quickYoutubePreset(queryText) {
  document.getElementById('ytSearchInput').value = queryText;
  loadYoutubeSearch();
}

function loadYoutubeSearch() {
  if (Date.now() > ytUnlockedUntil) {
    alert('Bé hãy bấm nút "⭐ Đổi 1★ = 10 phút" ở góc phải để mở khóa xem YouTube nhé!');
    return;
  }
  const q = encodeURIComponent(document.getElementById('ytSearchInput').value.trim() || 'English songs for kids');
  ytActiveVideoUrl = `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0&modestbranding=1`;
  document.getElementById('ytFrame').src = ytActiveVideoUrl;
  syncYoutubePlayerLayout('youtube');
}

function spendStarForTime(target) {
  if (starsCount < 1) {
    alert('Bé chưa đủ sao ★! Hãy sang tab Robot luyện đọc tiếng Anh để nhận thêm sao nhé.');
    return;
  }
  starsCount -= 1;
  updateStarsUI();
  ytUnlockedUntil = Date.now() + 10 * 60 * 1000;
  updateYoutubeTimer();
  if (!ytActiveVideoUrl) {
    loadYoutubeSearch();
  }
}

function updateYoutubeTimer() {
  const lbl = document.getElementById('ytTimerLabel');
  if (!lbl) return;
  const remain = ytUnlockedUntil - Date.now();
  if (remain <= 0) {
    lbl.textContent = '⏱️ Thời gian xem: Hết giờ (Cần 1★)';
    if (ytActiveVideoUrl) {
      closeYoutubeMiniPlayer();
    }
  } else {
    const mins = Math.floor(remain / 60000);
    const secs = Math.floor((remain % 60000) / 1000);
    lbl.textContent = `⏱️ Còn lại: ${mins}p ${secs}s`;
  }
}

function updateStarsUI() {
  localStorage.setItem('robo_stars', String(starsCount));
  document.getElementById('profileStarPill').textContent = `👤 ${childName} • ★ ${starsCount}`;
}

function editChildProfile() {
  const newName = prompt('Nhập tên của bé hiển thị trên Robot:', childName);
  if (newName && newName.trim().length > 0) {
    childName = newName.trim();
    localStorage.setItem('robo_child_name', childName);
    updateStarsUI();
  }
}

// =========================================================================
// 4. SỔ HỌC (32 CHỦ ĐỀ) & KARAOKE CHẤM ĐIỂM PHÁT ÂM
// =========================================================================
function renderStudyTopics(filterText = '') {
  const grid = document.getElementById('topicsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const q = filterText.trim().toLowerCase();

  studyTopics.forEach((topic, idx) => {
    if (q && !topic.title.toLowerCase().includes(q)) return;
    const card = document.createElement('div');
    card.className = 'topic-card';
    card.innerHTML = `
      <div class="t-title">${topic.title}</div>
      <div class="t-meta">${topic.items.length} mẫu câu • Sẵn sàng Offline</div>
    `;
    card.onclick = () => {
      activeTopicIndex = idx;
      activeSentenceIndex = 0;
      renderCurrentLesson();
      switchTab('robot');
      document.getElementById('faceBox').classList.add('docked');
      playCurrentSentence();
    };
    grid.appendChild(card);
  });
}

function filterStudyTopics(val) {
  renderStudyTopics(val);
}

async function syncStudyPacks() {
  try {
    const sep = apiEndpoint.includes('?') ? '&' : '?';
    const res = await fetch(`${apiEndpoint}${sep}action=get_topics`);
    const data = await res.json();
    if (data && Array.isArray(data.topics) && data.topics.length > 0) {
      studyTopics = data.topics;
      localStorage.setItem('robo_study_topics', JSON.stringify(studyTopics));
      renderStudyTopics();
      alert(`Đã đồng bộ thành công ${studyTopics.length} chủ đề học offline!`);
    } else {
      alert('Server chưa có chủ đề mới, đang dùng bộ 8 chủ đề offline chuẩn.');
    }
  } catch (e) {
    alert('Không kết nối được Server API, đang học ở chế độ Offline.');
  }
}

function renderCurrentLesson() {
  const topic = studyTopics[activeTopicIndex] || studyTopics[0];
  const item = topic.items[activeSentenceIndex] || topic.items[0];
  document.getElementById('lessonTopicBadge').textContent = `${topic.title} (${activeSentenceIndex + 1}/${topic.items.length})`;

  const words = item.en.split(/\s+/);
  document.getElementById('karaokeEn').innerHTML = words
    .map((w, i) => `<span class="word" id="kw_${i}">${w}</span>`)
    .join(' ');
  document.getElementById('karaokeSpell').textContent = item.spell || item.en;
  document.getElementById('karaokeVi').textContent = item.vi || '';
  document.getElementById('pronounceFeedback').textContent = 'Bấm "Bé đọc" để luyện phát âm nhận sao ★!';
  lastChildHeardText = '';
  document.getElementById('btnReplayHeard').disabled = true;
}

function toggleDockEyes() {
  document.getElementById('faceBox').classList.toggle('docked');
}

function nextSentence() {
  const topic = studyTopics[activeTopicIndex] || studyTopics[0];
  activeSentenceIndex = (activeSentenceIndex + 1) % topic.items.length;
  renderCurrentLesson();
  playCurrentSentence();
}

function prevSentence() {
  const topic = studyTopics[activeTopicIndex] || studyTopics[0];
  activeSentenceIndex = (activeSentenceIndex - 1 + topic.items.length) % topic.items.length;
  renderCurrentLesson();
  playCurrentSentence();
}

async function playCurrentSentence() {
  const topic = studyTopics[activeTopicIndex] || studyTopics[0];
  const item = topic.items[activeSentenceIndex] || topic.items[0];
  const rate = parseFloat(document.getElementById('ttsSpeedSelect').value || '0.95');

  const words = item.en.split(/\s+/);
  words.forEach((_, idx) => {
    setTimeout(() => {
      document.querySelectorAll('.k-en .word').forEach(el => el.classList.remove('active'));
      const wEl = document.getElementById('kw_' + idx);
      if (wEl) wEl.classList.add('active');
    }, idx * (360 / rate));
  });
  setTimeout(() => {
    document.querySelectorAll('.k-en .word').forEach(el => el.classList.remove('active'));
  }, words.length * (380 / rate) + 300);

  await speakText(item.en, 'en-US', rate);
}

async function speakVietnameseMeaning() {
  const topic = studyTopics[activeTopicIndex] || studyTopics[0];
  const item = topic.items[activeSentenceIndex] || topic.items[0];
  if (item && item.vi) {
    await speakText(item.vi, 'vi-VN', 1.0);
  }
}

async function speakText(text, lang = 'en-US', rate = 0.95) {
  setRobotExpression('speaking');
  const plugin = Native();
  if (plugin) {
    await plugin.speak({ text, lang, rate, pitch: 1.06 });
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    u.onend = () => setRobotExpression('idle');
    window.speechSynthesis.speak(u);
  }
}

function stopRobotAudioAndMic() {
  const plugin = Native();
  if (plugin) {
    plugin.stopSpeak();
    plugin.stopListening();
  } else if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
  setRobotExpression('idle');
}

async function startPronounceCheck() {
  setRobotExpression('listening');
  document.getElementById('pronounceFeedback').textContent = `🎙️ Robo đang lắng nghe ${childName} đọc...`;
  const plugin = Native();
  if (plugin) {
    await plugin.startListening({ lang: 'en-US' });
  } else {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert('Chức năng Micro chạy tốt nhất trên bản cài đặt APK Android!');
      setRobotExpression('idle');
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.onresult = (e) => onSpeechRecognized(e.results[0][0].transcript);
    rec.onerror = () => setRobotExpression('idle');
    rec.start();
  }
}

function onSpeechRecognized(spoken) {
  setRobotExpression('idle');
  lastChildHeardText = spoken;
  document.getElementById('btnReplayHeard').disabled = false;

  const topic = studyTopics[activeTopicIndex] || studyTopics[0];
  const item = topic.items[activeSentenceIndex] || topic.items[0];
  const targetWords = item.en.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const spokenClean = spoken.toLowerCase().replace(/[^a-z0-9\s]/g, '');

  let matched = 0;
  targetWords.forEach((w, idx) => {
    const el = document.getElementById('kw_' + idx);
    if (spokenClean.includes(w)) {
      matched++;
      if (el) { el.classList.add('ok'); el.classList.remove('miss'); }
    } else {
      if (el) { el.classList.add('miss'); el.classList.remove('ok'); }
    }
  });

  const score = Math.round((matched / Math.max(1, targetWords.length)) * 100);
  const fb = document.getElementById('pronounceFeedback');
  if (score >= 80) {
    starsCount += 1;
    updateStarsUI();
    setRobotExpression('happy');
    sendEspCommand('M:CLAP');
    fb.textContent = `🎉 Tuyệt vời (${score}%)! Máy nghe: "${spoken}" — Thưởng +1 ★!`;
    speakText('Great job! You got one star!', 'en-US', 1.0);
  } else {
    fb.textContent = `💪 Đạt ${score}% — Máy nghe: "${spoken}". Bé bấm "Nghe mẫu" rồi thử lại nhé!`;
  }
}

function replayChildHeard() {
  if (lastChildHeardText) {
    speakText(lastChildHeardText, 'en-US', 0.9);
  }
}

// =========================================================================
// 5. KHU VỰC TRÒ CHƠI (CẢM ỨNG + 4 NÚT CỨNG ESP32)
// =========================================================================
let activeGameMode = '';

function startGameRPS() {
  activeGameMode = 'RPS';
  const arena = document.getElementById('gameArena');
  arena.innerHTML = `
    <div style="font-size:18px; font-weight:700; color:#38bdf8;">✊✋✌️ Oẳn Tù Tì Cùng Robot</div>
    <div style="font-size:13px; color:#94a3b8;">Chạm chọn bên dưới hoặc bấm Nút 1 (Búa), Nút 2 (Bao), Nút 3 (Kéo) trên ESP32:</div>
    <div class="rps-choices">
      <button class="rps-btn" onclick="playRPS(0)">✊ Búa</button>
      <button class="rps-btn" onclick="playRPS(1)">✋ Bao</button>
      <button class="rps-btn" onclick="playRPS(2)">✌️ Kéo</button>
    </div>
    <div id="rpsResult" style="font-size:16px; font-weight:700; color:#fbbf24;"></div>
  `;
}

function playRPS(playerChoice) {
  const names = ['✊ Búa', '✋ Bao', '✌️ Kéo'];
  const botChoice = Math.floor(Math.random() * 3);
  const resEl = document.getElementById('rpsResult');
  if (!resEl) return;

  if (playerChoice === botChoice) {
    resEl.textContent = `Hòa rồi! Bé ra ${names[playerChoice]} — Robo cũng ra ${names[botChoice]}`;
  } else if ((playerChoice === 0 && botChoice === 2) || (playerChoice === 1 && botChoice === 0) || (playerChoice === 2 && botChoice === 1)) {
    resEl.textContent = `🎉 Bé thắng! Bé ra ${names[playerChoice]} thắng Robo (${names[botChoice]})!`;
    sendEspCommand('M:HAPPY');
  } else {
    resEl.textContent = `🤖 Robo thắng! Robo ra ${names[botChoice]} thắng ${names[playerChoice]} của bé!`;
    sendEspCommand('M:NOD');
  }
}

function startGameCup() {
  activeGameMode = 'CUP';
  const arena = document.getElementById('gameArena');
  const pearlPos = Math.floor(Math.random() * 3);
  arena.innerHTML = `
    <div style="font-size:18px; font-weight:700; color:#fbbf24;">🥤 Tìm Ngọc Dưới Cốc</div>
    <div style="font-size:13px; color:#94a3b8;">Viên ngọc đang trốn dưới cốc nào? (Chạm cốc hoặc bấm Nút 1, 2, 3 trên ESP32)</div>
    <div class="rps-choices">
      <button class="rps-btn" onclick="guessCup(0, ${pearlPos})">🥤 Cốc 1</button>
      <button class="rps-btn" onclick="guessCup(1, ${pearlPos})">🥤 Cốc 2</button>
      <button class="rps-btn" onclick="guessCup(2, ${pearlPos})">🥤 Cốc 3</button>
    </div>
    <div id="cupResult" style="font-size:16px; font-weight:700; color:#34d399;"></div>
  `;
}

function guessCup(pick, pearlPos) {
  const el = document.getElementById('cupResult');
  if (!el) return;
  if (pick === pearlPos) {
    el.innerHTML = `💎 Chính xác! Viên ngọc nằm ở Cốc ${pearlPos + 1}! <button class="btn btn-primary" style="margin-left:8px;" onclick="startGameCup()">Chơi ván mới</button>`;
    sendEspCommand('M:CLAP');
  } else {
    el.innerHTML = `😅 Tiếc quá! Viên ngọc ở Cốc ${pearlPos + 1} cơ. <button class="btn btn-warn" style="margin-left:8px;" onclick="startGameCup()">Thử lại</button>`;
  }
}

function openOnlineGames() {
  activeGameMode = 'ONLINE';
  document.getElementById('gameArena').innerHTML = `
    <iframe src="https://www.abcya.com/" style="width:100%; height:100%; border:none; border-radius:12px;" sandbox="allow-scripts allow-same-origin"></iframe>
  `;
}

// =========================================================================
// 6. CÀI ĐẶT, KHÓA PIN PHỤ HUYNH & PHẦN CỨNG ESP32
// =========================================================================
function requestOpenSetting() {
  document.getElementById('pinInput').value = '';
  document.getElementById('pinModal').classList.add('open');
}

function verifyPin() {
  const val = document.getElementById('pinInput').value.trim();
  if (val === parentPin) {
    closeModal('pinModal');
    switchTab('setting');
  } else {
    alert('Sai mã PIN phụ huynh! (Mặc định là 1234)');
  }
}

function openChangePinModal() {
  const np = prompt('Nhập mã PIN 4 số mới cho Phụ huynh:', parentPin);
  if (np && /^\d{4}$/.test(np)) {
    parentPin = np;
    localStorage.setItem('robo_pin', np);
    alert('Đã đổi mã PIN thành công!');
  } else if (np !== null) {
    alert('Mã PIN phải gồm đúng 4 chữ số.');
  }
}

function onBrightnessChange(val) {
  document.getElementById('brightnessVal').textContent = val + '%';
  const plugin = Native();
  if (plugin) plugin.setBrightness({ level: parseInt(val, 10) });
}

function onVolumeChange(val) {
  document.getElementById('volumeVal').textContent = val + '%';
  const plugin = Native();
  if (plugin) plugin.setVolume({ level: parseInt(val, 10) });
}

function saveSettings() {
  localStorage.setItem('robo_tts_speed', document.getElementById('ttsSpeedSelect').value);
}

function testSpeaker() {
  speakText('Hello! Speaker system is working perfectly!', 'en-US', 0.95);
}

function testMicrophone() {
  switchTab('robot');
  startPronounceCheck();
}

function openAndroidWifi() {
  const plugin = Native();
  if (plugin) {
    plugin.openWifiSettings();
  } else {
    alert('Chức năng mở cài đặt Wi-Fi hoạt động trên thiết bị Android.');
  }
}

function openApiConfigModal() {
  document.getElementById('apiUrlInput').value = apiEndpoint;
  document.getElementById('apiModal').classList.add('open');
}

function saveApiUrl() {
  apiEndpoint = document.getElementById('apiUrlInput').value.trim();
  localStorage.setItem('robo_api_url', apiEndpoint);
  closeModal('apiModal');
  alert('Đã lưu địa chỉ Server API!');
}

function openEsp32Modal() {
  document.getElementById('espModal').classList.add('open');
}

async function connectEsp32Ble() {
  const st = document.getElementById('espStatusText');
  try {
    if (!navigator.bluetooth) {
      st.textContent = 'Thiết bị không hỗ trợ Web Bluetooth, dùng chế độ nút giả lập bên dưới.';
      return;
    }
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'ESP32' }, { namePrefix: 'Robot' }],
      optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb']
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
    bleCharacteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
    await bleCharacteristic.startNotifications();
    bleCharacteristic.addEventListener('characteristicvaluechanged', (ev) => {
      const msg = new TextDecoder().decode(ev.target.value).trim();
      if (msg.startsWith('BTN_')) {
        handleEspButton(parseInt(msg.replace('BTN_', ''), 10));
      }
    });
    st.textContent = '✅ Đã kết nối Bluetooth với ' + device.name;
  } catch (e) {
    st.textContent = '⚠️ Chưa ghép nối BLE: ' + e.message;
  }
}

async function sendEspCommand(cmd) {
  if (!bleCharacteristic) return;
  try {
    await bleCharacteristic.writeValue(new TextEncoder().encode(cmd + '\n'));
  } catch (e) {
    console.warn('BLE send error:', e);
  }
}

// Xử lý 4 nút cứng vật lý từ mạch ESP32
function handleEspButton(btnNum) {
  wakeUpRobot();
  if (currentTab === 'game') {
    if (activeGameMode === 'RPS' && btnNum >= 1 && btnNum <= 3) playRPS(btnNum - 1);
    return;
  }
  if (currentTab === 'robot') {
    if (btnNum === 1) startPronounceCheck();
    if (btnNum === 2) playCurrentSentence();
    if (btnNum === 3) nextSentence();
    if (btnNum === 4) switchTab('study');
  }
}

// =========================================================================
// 7. BIỂU CẢM KHUÔN MẶT & CHẾ ĐỘ NGỦ THÔNG MINH (60 GIÂY)
// =========================================================================
function setRobotExpression(expr) {
  const box = document.getElementById('faceBox');
  const isDocked = box.classList.contains('docked');
  box.className = 'face-box' + (isDocked ? ' docked' : '') + (expr && expr !== 'idle' ? ' ' + expr : '');
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (currentTab === 'robot') {
      isSleeping = true;
      setRobotExpression('sleep');
    }
  }, 60000);
}

function wakeUpRobot() {
  if (!isSleeping) return;
  isSleeping = false;
  setRobotExpression('happy');
  setTimeout(() => setRobotExpression('idle'), 1500);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
