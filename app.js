// State management
const state = {
  currentSlide: 0,
  slides: [],
  activeLesson: 1, // Track which lesson is active (1 or 2)
  reporterName: '',
  notebookTitle: 'SỔ TAY PHÒNG TRÁNH ĐUỐI NƯỚC',
  notebookColor: 'blue',
  collectedGear: {
    mic: false,
    camera: false,
    badge: false,
    notebook: false
  },
  witnesses: {
    w1: false, // Chuột rút
    w2: false, // Nước xoáy
    w3: false  // Lật thuyền
  },
  matchingDangerConsequence: {
    'cramp': null,
    'vortex': null,
    'capsize': null
  },
  matchingDangerPrevention: {
    'cramp': null,
    'vortex': null,
    'capsize': null
  },
  sortingItems: {
    'jacket': null,    // float
    'can': null,       // float
    'log': null,       // float
    'stone': null,     // sink
    'branch': null     // float/support
  },
  discussionAnswers: {
    q1: '',
    q2: ''
  },
  reflection: {
    q1: '',
    q2: '',
    q3: ''
  },
  pledge: {
    signed: false
  },
  // Lesson 2 specific state properties
  lesson2: {
    flashImagesStarted: false,
    flashImagesCompleted: false,
    rememberedCards: [],
    cardClassifications: {}, // maps cardId -> 'breaking' | 'background' | 'fake'
    logicFramework: {
      intro: [],      // array of card IDs
      cause: [],
      solution: [],
      warning: []
    },
    selectedHeadline: null,
    customHeadline: '',
    voted: false,
    votes: {
      h1: 15,
      h2: 22,
      h3: 18,
      custom: 0
    },
    draft: {
      opening: '',
      mainNews: [], // array of facts selected
      closing: '',
      selectedIcons: [], // array of icon classes selected
      completed: false,
      teleprompterText: ''
    },
    reflection: {
      q1: '',
      q2: '',
      q3: ''
    },
    warningText: '',
    warningReason: '',
    warningCompleted: false
  }
};

// Web Audio API Sound Generator
let audioCtx = null;

function playSound(type) {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'correct') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.setValueAtTime(0.1, now + 0.2);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'incorrect') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'success') {
      // Fanfare
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
      notes.forEach((freq, index) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.connect(g);
        g.connect(audioCtx.destination);
        o.type = 'triangle';
        o.frequency.setValueAtTime(freq, now + index * 0.1);
        g.gain.setValueAtTime(0.08, now + index * 0.1);
        g.gain.linearRampToValueAtTime(0.01, now + index * 0.1 + 0.3);
        o.start(now + index * 0.1);
        o.stop(now + index * 0.1 + 0.3);
      });
    }
  } catch (e) {
    console.warn("Audio Context failed to play", e);
  }
}

// Navigation Controls
function initNavigation() {
  state.slides = Array.from(document.querySelectorAll(`.slide[data-lesson="${state.activeLesson}"]`));
  updateSlideView();

  document.getElementById('btn-prev').addEventListener('click', () => {
    if (state.currentSlide > 0) {
      playSound('click');
      state.currentSlide--;
      updateSlideView();
    }
  });

  document.getElementById('btn-next').addEventListener('click', () => {
    if (state.currentSlide < state.slides.length - 1) {
      if (validateSlideRequirement()) {
        playSound('click');
        state.currentSlide++;
        updateSlideView();
      } else {
        playSound('incorrect');
        highlightSlideError();
      }
    }
  });

  document.getElementById('btn-exit-lesson').addEventListener('click', () => {
    playSound('click');
    exitToDashboard();
  });
}

function updateSlideView() {
  state.slides.forEach((slide, idx) => {
    slide.classList.remove('active');
    if (idx === state.currentSlide) {
      slide.classList.add('active');
    }
  });

  // Update Progress Track
  const progressPercent = (state.currentSlide / (state.slides.length - 1)) * 100;
  document.getElementById('progress-bar').style.width = `${progressPercent}%`;
  document.getElementById('progress-text').textContent = `Slide ${state.currentSlide + 1} / ${state.slides.length}`;

  // Enable/Disable Nav buttons
  document.getElementById('btn-prev').disabled = (state.currentSlide === 0);
  
  // Show exit on cover or last slide
  const exitBtn = document.getElementById('btn-exit-lesson');
  if (state.currentSlide === 0 || state.currentSlide === state.slides.length - 1) {
    exitBtn.style.visibility = 'visible';
  } else {
    exitBtn.style.visibility = 'visible'; // Let it always be visible for accessibility
  }

  // Trigger specific slide hooks
  onSlideEnter(state.slides[state.currentSlide].id);

  // Update active sidebar item
  updateSidebarActive();
}

// Hook to execute actions on slide entry
function onSlideEnter(slideId) {
  // Reset and redraw any interactive assets based on active slide
  if (slideId === 'reporter-mission-slide') {
    checkGearCompletion();
  } else if (slideId === 'analysis-workspace-slide') {
    initMatchingGame('matching-danger-consequence');
  } else if (slideId === 'solution-prevention-slide') {
    initMatchingGame('matching-danger-prevention');
  } else if (slideId === 'solution-float-slide') {
    initSortingGame();
  } else if (slideId === 'notebook-compiler-slide') {
    compileNotebookPreview();
  } else if (slideId === 'pledge-slide') {
    initSignaturePad();
  } else if (slideId === 'final-products-slide' || slideId === 'l2-final-products-slide') {
    triggerConfetti();
  }
  // Lesson 2 slide enter hooks
  else if (slideId === 'l2-flash-images-slide') {
    initFlashImagesGame();
  } else if (slideId === 'l2-flash-qa-slide') {
    initFlashQaGame();
  } else if (slideId === 'l2-classification-workspace-slide') {
    initClassificationGame();
  } else if (slideId === 'l2-logic-workspace-slide') {
    initLogicFrameworkGame();
  } else if (slideId === 'l2-headline-suggestions-slide') {
    initHeadlineSelection();
  } else if (slideId === 'l2-headline-vote-slide') {
    animateHeadlineVotes();
  } else if (slideId === 'l2-headline-summary-slide') {
    populateFinalHeadline();
  } else if (slideId === 'l2-draft-workspace-slide') {
    initDraftWorkspace();
  } else if (slideId === 'l2-draft-broadcast-slide') {
    runTVBroadcast();
  } else if (slideId === 'l2-reflection-slide') {
    initL2Reflection();
  } else if (slideId === 'l2-adaptation-slide') {
    initL2Warning();
  }
}

// Validation before letting student advance
function validateSlideRequirement() {
  const activeSlideId = state.slides[state.currentSlide].id;

  // Gear collection validation
  if (activeSlideId === 'reporter-mission-slide') {
    return state.collectedGear.mic && state.collectedGear.camera && state.collectedGear.badge && state.collectedGear.notebook;
  }

  // Witness check validation
  if (activeSlideId === 'witnesses-corkboard-slide') {
    return state.witnesses.w1 && state.witnesses.w2 && state.witnesses.w3;
  }

  // Matching check validation
  if (activeSlideId === 'analysis-workspace-slide') {
    return Object.values(state.matchingDangerConsequence).every(v => v !== null);
  }

  if (activeSlideId === 'solution-prevention-slide') {
    return Object.values(state.matchingDangerPrevention).every(v => v !== null);
  }

  // Sorting check validation
  if (activeSlideId === 'solution-float-slide') {
    return Object.values(state.sortingItems).every(v => v !== null);
  }

  // Signature check validation
  if (activeSlideId === 'pledge-slide') {
    return state.pledge.signed;
  }

  // Lesson 2 validations
  if (activeSlideId === 'l2-flash-images-slide') {
    return state.lesson2.flashImagesCompleted;
  }
  if (activeSlideId === 'l2-flash-qa-slide') {
    return state.lesson2.rememberedCards.length > 0;
  }
  if (activeSlideId === 'l2-classification-workspace-slide') {
    const correctCount = Object.keys(state.lesson2.cardClassifications).filter(cardId => {
      const card = lesson2Cards.find(c => c.id === cardId);
      return card && card.type === state.lesson2.cardClassifications[cardId];
    }).length;
    return correctCount === 18;
  }
  if (activeSlideId === 'l2-logic-workspace-slide') {
    const f = state.lesson2.logicFramework;
    const introCorrect = f.intro.includes('c2') && f.intro.includes('c5') && f.intro.length === 2;
    const causeCorrect = f.cause.includes('c1') && f.cause.includes('c6') && f.cause.length === 2;
    const solutionCorrect = f.solution.includes('c3') && f.solution.includes('c7') && f.solution.length === 2;
    const warningCorrect = f.warning.includes('c4') && f.warning.includes('c8') && f.warning.length === 2;
    return introCorrect && causeCorrect && solutionCorrect && warningCorrect;
  }
  if (activeSlideId === 'l2-headline-suggestions-slide') {
    return state.lesson2.selectedHeadline !== null;
  }
  if (activeSlideId === 'l2-draft-workspace-slide') {
    return state.lesson2.draft.completed;
  }
  if (activeSlideId === 'l2-reflection-slide') {
    return state.lesson2.reflection.q1.trim() !== '' && state.lesson2.reflection.q2.trim() !== '';
  }
  if (activeSlideId === 'l2-adaptation-slide') {
    return state.lesson2.warningCompleted;
  }

  return true; // Default no restriction
}

// Shake warning if not completed slide requirement
function highlightSlideError() {
  const activeSlide = state.slides[state.currentSlide];
  const container = activeSlide.querySelector('.slide-grid') || activeSlide.querySelector('.slide-cover') || activeSlide;
  container.classList.add('shake');
  setTimeout(() => {
    container.classList.remove('shake');
  }, 400);

  // Show inline message
  let errMsg = "Vui lòng hoàn thành hoạt động tương tác trước khi tiếp tục!";
  if (activeSlide.id === 'reporter-mission-slide') {
    errMsg = "Báo cáo Tòa soạn: Bạn cần nhấp chọn thu thập đủ cả 4 trang bị phóng viên!";
  } else if (activeSlide.id === 'witnesses-corkboard-slide') {
    errMsg = "Phóng viên cần nhấp xem và điều tra đủ cả 3 Hồ sơ nhân chứng!";
  } else if (activeSlide.id === 'analysis-workspace-slide' || activeSlide.id === 'solution-prevention-slide') {
    errMsg = "Vui lòng ghép nối chính xác tất cả các mục trên bảng!";
  } else if (activeSlide.id === 'solution-float-slide') {
    errMsg = "Vui lòng phân loại chính xác tất cả 5 vật dụng vào 2 nhóm!";
  } else if (activeSlide.id === 'pledge-slide') {
    errMsg = "Vui lòng hoàn thành cam kết và ký tên xác nhận của bạn!";
  }

  showFloatingToast(errMsg);
}

function showFloatingToast(msg) {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '80px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = 'rgba(211, 47, 47, 0.9)';
  toast.style.color = '#fff';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.zIndex = '300';
  toast.style.fontFamily = 'var(--font-header)';
  toast.style.fontSize = '0.95rem';
  toast.style.fontWeight = '700';
  toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
  toast.textContent = msg;

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.5s';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Gear Collection (S2-01)
function initGearCollection() {
  const items = document.querySelectorAll('.gear-item');
  const continueBtn = document.getElementById('gear-btn-continue');

  items.forEach(item => {
    item.addEventListener('click', function() {
      const gearType = this.dataset.gear;
      if (!state.collectedGear[gearType]) {
        state.collectedGear[gearType] = true;
        this.classList.add('collected');
        playSound('click');
        checkGearCompletion();
      }
    });
  });
}

function checkGearCompletion() {
  const allCollected = Object.values(state.collectedGear).every(v => v === true);
  const statusMsg = document.getElementById('gear-status-msg');
  const graphic = document.getElementById('gear-completion-graphic');
  if (allCollected) {
    playSound('success');
    statusMsg.innerHTML = '✓ Đã nhận đủ trang bị! Bạn đã sẵn sàng tác nghiệp. Nhấn nút <strong>"Tiếp tục"</strong> ở thanh dưới.';
    statusMsg.style.color = 'var(--color-success)';
    if (graphic) graphic.classList.add('complete');
  } else {
    const left = Object.values(state.collectedGear).filter(v => !v).length;
    statusMsg.innerHTML = `Hãy thu thập nốt <strong>${left}</strong> vật dụng còn lại trên bàn.`;
    statusMsg.style.color = 'var(--color-gold)';
    if (graphic) graphic.classList.remove('complete');
  }
}

// Dossier Corkboard (S3-01 to S3-05)
function initDossierBoard() {
  const folders = document.querySelectorAll('.dossier-card');
  const modal = document.getElementById('folder-modal');
  const closeModalBtn = document.getElementById('btn-close-modal');

  folders.forEach(folder => {
    folder.addEventListener('click', function() {
      const id = this.dataset.witness;
      openDossierModal(id);
    });
  });

  closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}

const witnessData = {
  w1: {
    title: "Hồ sơ Nhân chứng 1: Bơi lội tự do",
    story: "Tôi đang bơi lội vui vẻ ở hồ nước gần nhà. Bỗng nhiên bắp chân trái của tôi cứng đờ, đau điếng, không thể cử động nổi. Tôi hoảng loạn và chìm dần xuống, rất may có cứu hộ phát hiện kịp thời.",
    image: "assets/images/muscle_cramp_swimming.png",
    question: "Tình huống nhân chứng gặp phải và nguy cơ đuối nước là gì?",
    options: [
      { text: "A. Bị chuột rút đột ngột khi đang bơi sâu", correct: true, key: "cramp" },
      { text: "B. Bị chuột cắn khi đang ngụp lặn dưới nước", correct: false },
      { text: "C. Không khởi động trước khi bơi làm cơ co thắt nhẹ", correct: false }
    ]
  },
  w2: {
    title: "Hồ sơ Nhân chứng 2: Tránh xa luồng nước xoáy",
    story: "Hôm ấy nước sông dâng cao và chảy xiết. Nhìn bề mặt nước rất êm đềm nhưng bên dưới lại xoáy tròn cực mạnh. Một cậu bé đi bơi đã bị hút thẳng vào tâm xoáy nước đó và cuốn trôi mất tích.",
    image: "assets/images/water_vortex_whirlpool.png",
    question: "Tình huống nhân chứng gặp phải và nguy cơ đuối nước là gì?",
    options: [
      { text: "A. Nước sông lạnh đột ngột làm lạnh cóng cơ thể", correct: false },
      { text: "B. Dòng nước xoáy sâu cuốn trôi người xuống đáy", correct: true, key: "vortex" },
      { text: "C. Thác nước đổ xiết từ trên cao đè ép người bơi", correct: false }
    ]
  },
  w3: {
    title: "Hồ sơ Nhân chứng 3: Sự cố di chuyển đường thủy",
    story: "Nhóm chúng tôi ngồi thuyền gỗ đi tham quan. Vì mải đùa nghịch làm nghiêng thuyền, cộng thêm sóng lớn đánh mạnh từ bên hông làm thuyền bị lật úp. Nhiều người không mặc áo phao chới với vô cùng nguy kịch.",
    image: "assets/images/overturned_boat.png",
    question: "Tình huống nhân chứng gặp phải và nguy cơ đuối nước là gì?",
    options: [
      { text: "A. Sóng ngầm đẩy người rơi khỏi thành mạn thuyền", correct: false },
      { text: "B. Trượt chân trúng rêu xanh ngã từ bến sông xuống nước", correct: false },
      { text: "C. Thuyền bị lật úp làm mọi người rơi xuống nước sâu", correct: true, key: "capsize" }
    ]
  }
};

function openDossierModal(witnessId) {
  const data = witnessData[witnessId];
  const modal = document.getElementById('folder-modal');
  
  document.getElementById('modal-title').textContent = data.title;
  document.getElementById('modal-story').textContent = data.story;
  document.getElementById('modal-img').src = data.image;
  document.getElementById('modal-question').textContent = data.question;

  const listContainer = document.getElementById('modal-options');
  listContainer.innerHTML = '';

  data.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.textContent = opt.text;

    // Check if witness is already completed, styling correct answer directly
    if (state.witnesses[witnessId] && opt.correct) {
      btn.classList.add('correct');
    }

    btn.addEventListener('click', function() {
      if (state.witnesses[witnessId]) return; // locked after correct answer

      if (opt.correct) {
        playSound('correct');
        this.classList.add('correct');
        state.witnesses[witnessId] = true;
        
        // Mark dossier card in UI
        const dossierCard = document.querySelector(`.dossier-card[data-witness="${witnessId}"]`);
        dossierCard.classList.add('completed');
        dossierCard.querySelector('.dossier-status').textContent = 'ĐÃ HOÀN THÀNH';
        
        // Notify user in modal
        const feedback = document.createElement('div');
        feedback.className = 'success-banner';
        feedback.innerHTML = '<span>✓ Phân tích chính xác! Đã lưu dữ liệu vào hồ sơ.</span>';
        listContainer.appendChild(feedback);

        checkWitnessCompletion();
      } else {
        playSound('incorrect');
        this.classList.add('incorrect');
        setTimeout(() => this.classList.remove('incorrect'), 800);
      }
    });

    listContainer.appendChild(btn);
  });

  modal.style.display = 'flex';
}

function checkWitnessCompletion() {
  const completedAll = Object.values(state.witnesses).every(v => v === true);
  if (completedAll) {
    playSound('success');
    document.getElementById('witness-corkboard-status').innerHTML = '✓ Đã hoàn thành điều tra cả 3 hồ sơ! Hãy bấm nút <strong>"Tiếp theo"</strong>.';
    document.getElementById('witness-corkboard-status').style.color = 'var(--color-success)';
  }
}

// Click-to-Connect Line Matching (S4-03 & S5-03)
function initMatchingGame(gameId) {
  const container = document.getElementById(gameId);
  const leftItems = container.querySelectorAll('.matching-column.left .match-item');
  const rightItems = container.querySelectorAll('.matching-column.right .match-item');
  const svg = container.querySelector('.matching-canvas-svg');

  let selectedLeft = null;
  const isDangerConsequence = (gameId === 'matching-danger-consequence');
  const matchState = isDangerConsequence ? state.matchingDangerConsequence : state.matchingDangerPrevention;

  // Clear previous lines
  svg.innerHTML = '';
  
  // Re-draw any existing matches in state
  Object.keys(matchState).forEach(danger => {
    const consequence = matchState[danger];
    if (consequence !== null) {
      const leftEl = container.querySelector(`.match-item[data-item="${danger}"]`);
      const rightEl = container.querySelector(`.match-item[data-match="${consequence}"]`);
      if (leftEl && rightEl) {
        leftEl.classList.add('matched');
        rightEl.classList.add('matched');
        drawConnectorLine(svg, leftEl, rightEl);
      }
    }
  });

  // Setup click listeners
  leftItems.forEach(item => {
    item.addEventListener('click', function() {
      if (this.classList.contains('matched')) return;

      leftItems.forEach(i => i.classList.remove('selected'));
      this.classList.add('selected');
      selectedLeft = this;
      playSound('click');
    });
  });

  rightItems.forEach(item => {
    item.addEventListener('click', function() {
      if (this.classList.contains('matched') || !selectedLeft) return;

      const leftVal = selectedLeft.dataset.item;
      const rightVal = this.dataset.match;

      // Validate match
      let isCorrect = false;
      if (isDangerConsequence) {
        // cramp -> body-cramp, vortex -> whirlpool, capsize -> boat-capsize
        isCorrect = (leftVal === 'cramp' && rightVal === 'body-cramp') ||
                    (leftVal === 'vortex' && rightVal === 'whirlpool') ||
                    (leftVal === 'capsize' && rightVal === 'boat-capsize');
      } else {
        // cramp -> warm-up, vortex -> stay-away, capsize -> jacket
        isCorrect = (leftVal === 'cramp' && rightVal === 'warm-up') ||
                    (leftVal === 'vortex' && rightVal === 'stay-away') ||
                    (leftVal === 'capsize' && rightVal === 'jacket');
      }

      if (isCorrect) {
        playSound('correct');
        selectedLeft.classList.remove('selected');
        selectedLeft.classList.add('matched');
        this.classList.add('matched');
        
        matchState[leftVal] = rightVal;
        
        drawConnectorLine(svg, selectedLeft, this);
        selectedLeft = null;
        
        checkMatchingCompletion(gameId, matchState);
      } else {
        playSound('incorrect');
        this.classList.add('shake');
        selectedLeft.classList.add('shake');
        setTimeout(() => {
          this.classList.remove('shake');
          selectedLeft.classList.remove('shake');
        }, 500);
      }
    });
  });
}

function drawConnectorLine(svg, el1, el2) {
  const rect1 = el1.getBoundingClientRect();
  const rect2 = el2.getBoundingClientRect();
  const svgRect = svg.getBoundingClientRect();

  const x1 = rect1.right - svgRect.left - 10;
  const y1 = rect1.top + rect1.height / 2 - svgRect.top;
  const x2 = rect2.left - svgRect.left + 10;
  const y2 = rect2.top + rect2.height / 2 - svgRect.top;

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  line.setAttribute('stroke', '#00e676');
  line.setAttribute('stroke-width', '4');
  line.setAttribute('stroke-dasharray', '8,4');
  line.setAttribute('filter', 'drop-shadow(0px 0px 5px rgba(0, 230, 118, 0.6))');
  
  // Add animation inside SVG
  const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
  animate.setAttribute('attributeName', 'stroke-dashoffset');
  animate.setAttribute('values', '120;0');
  animate.setAttribute('dur', '3s');
  animate.setAttribute('repeatCount', 'indefinite');
  line.appendChild(animate);

  svg.appendChild(line);
}

function checkMatchingCompletion(gameId, matchState) {
  const completed = Object.values(matchState).every(v => v !== null);
  if (completed) {
    playSound('success');
    const panel = document.getElementById(gameId + '-status');
    if (panel) {
      panel.innerHTML = '✓ Biên dịch hoàn tất! Dữ liệu đã ghim lên bảng phân tích. Nhấn <strong>"Tiếp theo"</strong> để tiếp tục.';
      panel.style.color = 'var(--color-success)';
    }
  }
}

// Drag & Drop Sorting Game (S5-04)
// Drag & Drop Buoyancy Lab Game (S5-04)
function initSortingGame() {
  const cards = document.querySelectorAll('.sortable-card');
  const tank = document.getElementById('water-tank');
  const shelf = document.getElementById('lab-items-shelf');
  const badge = document.getElementById('lab-validation-badge');

  const leftPositions = {
    'jacket': '5%',
    'log': '24%',
    'can': '43%',
    'branch': '62%',
    'stone': '81%'
  };

  const tiltAngles = {
    'jacket': '-12deg',
    'log': '8deg',
    'can': '-5deg',
    'branch': '15deg',
    'stone': '-8deg'
  };

  // Restore or set initial state for cards
  cards.forEach(card => {
    const itemId = card.dataset.item;
    const itemState = state.sortingItems[itemId];

    // Remove any selection/dragging classes
    card.classList.remove('selected', 'dragging', 'floated', 'sunk', 'float-bobbing', 'sink-impact');
    // Clear inline styles and event listeners
    card.removeAttribute('style');
    card.onclick = null;
    card.ondragstart = null;
    card.ondragend = null;
    
    // Set custom property for dynamic rotation/tilt angle
    card.style.setProperty('--tilt-angle', tiltAngles[itemId] || '0deg');

    if (itemState) {
      // If already dropped, place in the tank
      if (tank) {
        tank.appendChild(card);
        card.setAttribute('draggable', 'false');
        card.style.position = 'absolute';
        card.style.left = leftPositions[itemId];
        card.style.cursor = 'default';

        if (itemState === 'float') {
          card.style.top = '95px';
          card.classList.add('floated', 'float-bobbing');
          const delays = {
            'jacket': '0s',
            'log': '-0.8s',
            'can': '-1.6s',
            'branch': '-2.4s'
          };
          card.style.animationDelay = delays[itemId] || '0s';
        } else {
          card.style.top = '220px';
          card.classList.add('sunk');
        }
      }
    } else {
      // If not yet dropped, place in the shelf
      if (shelf) {
        shelf.appendChild(card);
        card.setAttribute('draggable', 'true');
        card.style.cursor = 'grab';

        // Touch click-to-select alternative (for mobile compatibility)
        card.onclick = function(e) {
          e.stopPropagation();
          // Clear other selections
          cards.forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          playSound('click');
        };
      }
    }

    // Drag listeners (only active if draggable is true)
    card.ondragstart = function(e) {
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', itemId);
    };

    card.ondragend = function() {
      card.classList.remove('dragging');
    };
  });

  if (tank) {
    // Drag over tank
    tank.ondragover = function(e) {
      e.preventDefault();
      tank.classList.add('drag-hover');
    };

    tank.ondragleave = function() {
      tank.classList.remove('drag-hover');
    };

    tank.ondrop = function(e) {
      e.preventDefault();
      tank.classList.remove('drag-hover');
      const itemId = e.dataTransfer.getData('text/plain');
      const card = document.querySelector(`.sortable-card[data-item="${itemId}"]`);
      if (card && !state.sortingItems[itemId]) {
        dropItemIntoTank(card, tank, leftPositions);
      }
    };

    // Click tank to drop selected card
    tank.onclick = function() {
      const selected = document.querySelector('.sortable-card.selected');
      if (selected) {
        const itemId = selected.dataset.item;
        if (!state.sortingItems[itemId]) {
          dropItemIntoTank(selected, tank, leftPositions);
          selected.classList.remove('selected');
        }
      }
    };
  }

  // Click validation badge to reset the experiment
  if (badge) {
    badge.onclick = function(e) {
      e.stopPropagation();
      playSound('click');
      // Reset state
      Object.keys(state.sortingItems).forEach(key => {
        state.sortingItems[key] = null;
      });
      // Re-init game
      initSortingGame();
    };
  }
  
  // Update status message and badge visibility
  checkSortingCompletion();
}

function dropItemIntoTank(card, tank, leftPositions) {
  const itemId = card.dataset.item;
  const isFloat = (itemId === 'jacket' || itemId === 'can' || itemId === 'log' || itemId === 'branch');
  
  const tiltAngles = {
    'jacket': '-12deg',
    'log': '8deg',
    'can': '-5deg',
    'branch': '15deg',
    'stone': '-8deg'
  };
  
  // Update state immediately
  state.sortingItems[itemId] = isFloat ? 'float' : 'sink';
  
  // Set drag state off
  card.setAttribute('draggable', 'false');
  card.style.cursor = 'default';
  
  // Append to tank
  tank.appendChild(card);
  card.style.position = 'absolute';
  card.style.left = leftPositions[itemId];
  card.style.setProperty('--tilt-angle', tiltAngles[itemId] || '0deg');
  
  // Position above the water line for transition start
  card.style.top = '-50px';
  
  // Force reflow
  card.offsetHeight;
  
  // Set target positions
  const targetTop = isFloat ? '95px' : '220px';
  playSound('correct');
  
  if (isFloat) {
    card.classList.add('floated');
  } else {
    card.classList.add('sunk');
  }
  
  card.style.top = targetTop;
  
  // When animation finishes, apply continuous effects
  setTimeout(() => {
    if (isFloat) {
      card.classList.add('float-bobbing');
      const delays = {
        'jacket': '0s',
        'log': '-0.8s',
        'can': '-1.6s',
        'branch': '-2.4s'
      };
      card.style.animationDelay = delays[itemId] || '0s';
    } else {
      card.classList.add('sink-impact');
    }
  }, 1200); // matches the 1.2s transition in CSS
  
  checkSortingCompletion();
}

function checkSortingCompletion() {
  const completed = Object.values(state.sortingItems).every(v => v !== null);
  const badge = document.getElementById('lab-validation-badge');
  const msg = document.getElementById('sorting-status');
  
  if (completed) {
    playSound('success');
    if (badge) badge.classList.add('show');
    if (msg) {
      msg.innerHTML = '✓ Thử nghiệm chính xác toàn bộ vật dụng! Hãy nhấn nút <strong>"Tiếp theo"</strong>.';
      msg.style.color = 'var(--color-success)';
    }
  } else {
    if (badge) badge.classList.remove('show');
    if (msg) {
      msg.innerHTML = 'Thử nghiệm cả 5 vật dụng để hoàn tất bài phân tích.';
      msg.style.color = 'var(--color-gold)';
    }
  }
}

// Sổ tay Phóng viên Compilation (S6-03)
function initNotebookControls() {
  const nameInput = document.getElementById('reporter-name-input');
  const titleInput = document.getElementById('notebook-title-input');
  const themeDots = document.querySelectorAll('.theme-dot');
  const btnPrint = document.getElementById('btn-print-notebook');

  nameInput.addEventListener('input', function() {
    state.reporterName = this.value;
    document.getElementById('nb-preview-author').textContent = state.reporterName || '.......................';
  });

  titleInput.addEventListener('input', function() {
    state.notebookTitle = this.value;
    document.getElementById('nb-preview-title').textContent = state.notebookTitle || 'SỔ TAY PHÒNG TRÁNH ĐUỐI NƯỚC';
  });

  themeDots.forEach(dot => {
    dot.addEventListener('click', function() {
      themeDots.forEach(d => d.classList.remove('active'));
      this.classList.add('active');
      state.notebookColor = this.dataset.color;
      updateNotebookTheme();
      playSound('click');
    });
  });

  btnPrint.addEventListener('click', () => {
    playSound('click');
    window.print();
  });
}

function updateNotebookTheme() {
  const preview = document.getElementById('notebook-preview-card');
  preview.style.borderTop = '18px solid';
  if (state.notebookColor === 'blue') {
    preview.style.borderTopColor = '#1a5f7a';
    preview.style.background = '#fcfbfa';
  } else if (state.notebookColor === 'red') {
    preview.style.borderTopColor = '#b71c1c';
    preview.style.background = '#fefafa';
  } else if (state.notebookColor === 'orange') {
    preview.style.borderTopColor = '#e65100';
    preview.style.background = '#fffaf5';
  }
}

function compileNotebookPreview() {
  // Prepopulate preview text based on inputs
  document.getElementById('nb-preview-title').textContent = state.notebookTitle || 'SỔ TAY PHÒNG TRÁNH ĐUỐI NƯỚC';
  document.getElementById('nb-preview-author').textContent = state.reporterName || '.......................';
  updateNotebookTheme();
}

// Canvas Signature Pad (S8-01)
let canvas = null;
let ctx = null;
let drawing = false;

function initSignaturePad() {
  canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#0a192f';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  const clearBtn = document.getElementById('btn-clear-signature');
  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.pledge.signed = false;
  });

  // Touch and Mouse listeners
  canvas.addEventListener('pointerdown', startDrawing);
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', stopDrawing);
  canvas.addEventListener('pointerout', stopDrawing);

  // Read reflection inputs from DOM
  const pledgeBtn = document.getElementById('btn-pledge-submit');
  pledgeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    if (state.pledge.signed) {
      playSound('success');
      document.getElementById('pledge-status-success').style.display = 'flex';
      // Automatically skip to the next slide in 1.5s
      setTimeout(() => {
        state.currentSlide++;
        updateSlideView();
      }, 1500);
    } else {
      playSound('incorrect');
      showFloatingToast("Vui lòng ký xác nhận cam kết của bạn!");
    }
  });
}

function startDrawing(e) {
  drawing = true;
  ctx.beginPath();
  const rect = canvas.getBoundingClientRect();
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  state.pledge.signed = true; // Mark as signed on first draw stroke
}

function draw(e) {
  if (!drawing) return;
  const rect = canvas.getBoundingClientRect();
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
  ctx.stroke();
}

function stopDrawing() {
  drawing = false;
  ctx.closePath();
}

// Canvas Confetti Celebration (END-02)
let confettiActive = false;
let confettiCanvas = null;
let confettiCtx = null;
let particles = [];

function triggerConfetti() {
  confettiCanvas = document.getElementById('confetti-canvas');
  if (!confettiCanvas) return;

  confettiCtx = confettiCanvas.getContext('2d');
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
  confettiCanvas.style.display = 'block';

  particles = [];
  confettiActive = true;
  playSound('success');

  // Spawn particles
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * confettiCanvas.width,
      y: Math.random() * confettiCanvas.height - confettiCanvas.height,
      r: Math.random() * 6 + 4,
      d: Math.random() * confettiCanvas.height,
      color: `hsl(${Math.random() * 360}, 90%, 50%)`,
      tilt: Math.random() * 10 - 5,
      tiltAngleIncremental: Math.random() * 0.07 + 0.02,
      tiltAngle: 0
    });
  }

  requestAnimationFrame(updateConfetti);

  // Deactivate after 5 seconds
  setTimeout(() => {
    confettiActive = false;
    if (confettiCanvas) confettiCanvas.style.display = 'none';
  }, 5000);
}

function updateConfetti() {
  if (!confettiActive) return;

  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  particles.forEach((p, index) => {
    p.tiltAngle += p.tiltAngleIncremental;
    p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
    p.x += Math.sin(p.tiltAngle);
    p.tilt = Math.sin(p.tiltAngle - index / 3) * 15;

    // Reset particles that hit the bottom
    if (p.y > confettiCanvas.height) {
      particles[index] = {
        x: Math.random() * confettiCanvas.width,
        y: -20,
        r: p.r,
        d: p.d,
        color: p.color,
        tilt: p.tilt,
        tiltAngleIncremental: p.tiltAngleIncremental,
        tiltAngle: p.tiltAngle
      };
    }

    confettiCtx.beginPath();
    confettiCtx.lineWidth = p.r;
    confettiCtx.strokeStyle = p.color;
    confettiCtx.moveTo(p.x + p.tilt + p.r / 2, p.y);
    confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
    confettiCtx.stroke();
  });

  requestAnimationFrame(updateConfetti);
}

// Initializing the whole application
document.addEventListener('DOMContentLoaded', () => {
  // Page routing
  const cardLesson1 = document.getElementById('lesson-card-1');
  const dashboard = document.getElementById('dashboard-view');
  const viewer = document.getElementById('viewer-view');

  cardLesson1.addEventListener('click', () => {
    playSound('click');
    state.activeLesson = 1;
    state.slides = Array.from(document.querySelectorAll('.slide[data-lesson="1"]'));
    dashboard.style.display = 'none';
    viewer.style.display = 'flex';
    
    document.getElementById('lesson-1-sidebar-chapters').style.display = 'block';
    document.getElementById('lesson-2-sidebar-chapters').style.display = 'none';
    
    state.currentSlide = 0;
    updateSlideView();
  });

  const cardLesson2 = document.getElementById('lesson-card-2');
  if (cardLesson2) {
    cardLesson2.addEventListener('click', () => {
      playSound('click');
      state.activeLesson = 2;
      state.slides = Array.from(document.querySelectorAll('.slide[data-lesson="2"]'));
      dashboard.style.display = 'none';
      viewer.style.display = 'flex';
      
      document.getElementById('lesson-1-sidebar-chapters').style.display = 'none';
      document.getElementById('lesson-2-sidebar-chapters').style.display = 'block';
      
      state.currentSlide = 0;
      updateSlideView();
    });
  }

  // Start realtime timecode updater
  startTimecodeUpdater();

  // Handle placeholders for locked cards
  document.querySelectorAll('.lesson-card.locked').forEach(card => {
    card.addEventListener('click', (e) => {
      e.preventDefault();
      playSound('incorrect');
      showFloatingToast("Bài học này sắp ra mắt! Vui lòng khám phá Tiết 1 trước.");
    });
  });

  // Hotnews inputs hook
  const qaBtn = document.getElementById('btn-submit-qa');
  if (qaBtn) {
    qaBtn.addEventListener('click', () => {
      const q1 = document.getElementById('input-q1').value;
      const q2 = document.getElementById('input-q2').value;
      if (q1.trim() && q2.trim()) {
        playSound('correct');
        state.discussionAnswers.q1 = q1;
        state.discussionAnswers.q2 = q2;
        document.getElementById('qa-success-msg').style.display = 'flex';
        
        // Populate into notebook cover
        document.getElementById('nb-preview-briefing').innerHTML = `
          <strong>Đã thảo luận sơ bộ:</strong><br>
          - Chuyện xảy ra: ${q1}<br>
          - Hành động đề xuất: ${q2}
        `;
      } else {
        playSound('incorrect');
        showFloatingToast("Vui lòng ghi chép ý kiến thảo luận của bạn!");
      }
    });
  }

  // Reflection hooks
  const reflectionTextareas = document.querySelectorAll('.reflection-textarea');
  reflectionTextareas.forEach(textarea => {
    textarea.addEventListener('input', function() {
      const field = this.dataset.field;
      state.reflection[field] = this.value;
    });
  });

  // Initialize other setups
  initNavigation();
  initGearCollection();
  initDossierBoard();
  initNotebookControls();
  initSidebar();
});

// Helper exit
function exitToDashboard() {
  document.getElementById('viewer-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
}

// Realtime Camera Timecode Updater
function startTimecodeUpdater() {
  function updateTC() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const f = String(Math.floor(now.getMilliseconds() / 16.67)).padStart(2, '0'); // ~60fps frames
    const tc = document.querySelector('.viewfinder-indicator div:last-child');
    if (tc) tc.textContent = `TC ${h}:${m}:${s}:${f}`;
  }
  updateTC();
  setInterval(updateTC, 200); // Update 5x/sec for performance
}

// Handle window resizing
window.addEventListener('resize', () => {
  if (confettiCanvas && confettiActive) {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

// =========================================
// Dashboard Animated Particle Background
// =========================================
function initDashboardBackground() {
  const canvas = document.getElementById('dashboard-bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = [];
  const NUM = 55;
  
  for (let i = 0; i < NUM; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update and draw dots
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,242,254,0.6)';
      ctx.fill();
    });

    // Draw connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.4;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,242,254,${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// Initialize dashboard background on load
document.addEventListener('DOMContentLoaded', () => {
  initDashboardBackground();
});

// =========================================
// Navigation Sidebar Logic
// =========================================
function initSidebar() {
  const sidebar = document.getElementById('nav-sidebar');
  const toggle = document.getElementById('sidebar-toggle');
  const closeBtn = document.getElementById('btn-close-sidebar');
  const items = document.querySelectorAll('.sidebar-item');

  if (toggle && sidebar) {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('click');
      sidebar.classList.toggle('open');
    });
  }

  if (closeBtn && sidebar) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      playSound('click');
      sidebar.classList.remove('open');
    });
  }

  // Click outside to close sidebar
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open')) {
      if (!sidebar.contains(e.target) && (!toggle || !toggle.contains(e.target))) {
        sidebar.classList.remove('open');
      }
    }
  });

  // Sidebar item navigation
  items.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const targetIdx = parseInt(this.dataset.slide, 10);
      playSound('click');
      state.currentSlide = targetIdx;
      updateSlideView();

      // If mobile view, close sidebar on link selection
      if (window.innerWidth < 768 && sidebar) {
        sidebar.classList.remove('open');
      }
    });
  });
}

function updateSidebarActive() {
  const items = document.querySelectorAll('.sidebar-item');
  items.forEach(item => {
    const idx = parseInt(item.dataset.slide, 10);
    if (idx === state.currentSlide) {
      item.classList.add('active');
      // Scroll inside sidebar scroll viewport
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}



// =========================================
// TIẾT 2 - INTERACTIVE GAME FUNCTIONS
// =========================================

const flashItemsList = [
  { id: 'chuot-rut', name: 'Chuột rút khi bơi', icon: '⚡' },
  { id: 'ao-phao', name: 'Áo phao cứu sinh', icon: '🦺' },
  { id: 'nuoc-xoay', name: 'Dòng nước xoáy', icon: '🌀' },
  { id: 'canh-cay', name: 'Cành cây hỗ trợ', icon: '🌿' },
  { id: 'cuc-da', name: 'Cục đá cứu hộ', icon: '🪨' },
  { id: 'phao-cuu-sinh', name: 'Phao cứu sinh', icon: '⭕' },
  { id: 'lat-thuyen', name: 'Lật thuyền cứu hộ', icon: '⛵' },
  { id: 'can-nhua', name: 'Can nhựa rỗng', icon: '🏺' },
  { id: 'song-sau', name: 'Dòng sông sâu', icon: '🌊' },
  { id: 'bien-sau', name: 'Biển rộng lớn', icon: '🐳' },
  { id: 'nguoi-cuu-ho', name: 'Người cứu hộ', icon: '🧑‍🚒' },
  { id: 'co-canh-bao', name: 'Cờ cảnh báo màu đỏ', icon: '🚩' }
];

const lesson2Cards = [
  { id: 'c1', text: 'Chuột rút khi bơi', type: 'breaking' },
  { id: 'c2', text: 'Lật thuyền', type: 'breaking' },
  { id: 'c3', text: 'Áo phao cứu sinh', type: 'breaking' },
  { id: 'c4', text: 'Gọi người lớn khi gặp nguy hiểm', type: 'breaking' },
  { id: 'c5', text: 'Biển cảnh báo nguy hiểm', type: 'breaking' },
  { id: 'c6', text: 'Dòng chảy xa bờ', type: 'breaking' },
  { id: 'c7', text: 'Kỹ năng tự nổi cứu mạng', type: 'breaking' },
  { id: 'c8', text: 'Kêu cứu thật lớn khi gặp nạn', type: 'breaking' },
  { id: 'c9', text: 'Việt Nam có nhiều sông ngòi', type: 'background' },
  { id: 'c10', text: 'Bơi lội rất tốt cho sức khỏe', type: 'background' },
  { id: 'c11', text: 'Nhiều người đi bơi vào mùa hè', type: 'background' },
  { id: 'c12', text: 'Lịch sử phát triển môn bơi lội', type: 'background' },
  { id: 'c13', text: 'Các kiểu bơi phổ biến hiện nay', type: 'background' },
  { id: 'c14', text: 'Cầm cục đá to giúp nổi dễ hơn', type: 'fake' },
  { id: 'c15', text: 'Biết bơi thì không thể bị đuối nước', type: 'fake' },
  { id: 'c16', text: 'Tự nhảy xuống nước cứu bạn ngay', type: 'fake' },
  { id: 'c17', text: 'Uống nước muối ngăn chuột rút', type: 'fake' },
  { id: 'c18', text: 'Nín thở dưới nước càng lâu càng tốt', type: 'fake' }
];

// Game 1: 15-second flash slideshow
function initFlashImagesGame() {
  const btn = document.getElementById('l2-btn-start-flash');
  const screen = document.getElementById('l2-flash-screen');
  const progress = document.getElementById('l2-flash-progress');
  const statusMsg = document.getElementById('l2-flash-status');
  
  if (!btn) return;
  
  if (state.lesson2.flashImagesCompleted) {
    statusMsg.style.display = 'block';
    progress.style.width = '100%';
    screen.innerHTML = `<div class="flash-screen-inner" style="background:var(--color-success-bg); border-color:var(--color-success);"><span style="font-size:3rem; margin-bottom:10px;">✓</span><div style="font-size:1.1rem; font-weight:bold; color:var(--color-success);">BẢN TIN HOÀN TẤT</div></div>`;
    return;
  }
  
  btn.onclick = function() {
    if (state.lesson2.flashImagesStarted) return;
    state.lesson2.flashImagesStarted = true;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    playSound('click');
    
    let currentIdx = 0;
    progress.style.width = '0%';
    
    // Cycle through flash items
    const flashInterval = setInterval(() => {
      if (currentIdx < flashItemsList.length) {
        const item = flashItemsList[currentIdx];
        screen.innerHTML = `
          <div class="flash-card-display">
            <span class="flash-card-icon">${item.icon}</span>
            <span class="flash-card-title">${item.name}</span>
          </div>
        `;
        playSound('click');
        currentIdx++;
        
        // Progress update
        const percent = (currentIdx / flashItemsList.length) * 100;
        progress.style.width = `${percent}%`;
      } else {
        clearInterval(flashInterval);
        state.lesson2.flashImagesCompleted = true;
        playSound('success');
        screen.innerHTML = `<div class="flash-screen-inner" style="background:var(--color-success-bg); border-color:var(--color-success);"><span style="font-size:3rem; margin-bottom:10px;">✓</span><div style="font-size:1.1rem; font-weight:bold; color:var(--color-success);">BẢN TIN HOÀN TẤT</div></div>`;
        statusMsg.style.display = 'block';
      }
    }, 1250); // Show each card for 1.25s (15 seconds total)
  };
}

// Game 1 Part 2: Memory test Q&A selection
function initFlashQaGame() {
  const container = document.getElementById('l2-flash-selection-grid');
  const submitBtn = document.getElementById('l2-btn-submit-flash-qa');
  const resultMsg = document.getElementById('l2-flash-qa-result');
  
  if (!container) return;
  
  const cards = container.querySelectorAll('.flash-select-card');
  
  // Restore state
  cards.forEach(card => {
    const itemVal = card.dataset.item;
    if (state.lesson2.rememberedCards.includes(itemVal)) {
      card.classList.add('selected');
    }
    
    card.onclick = function() {
      if (state.lesson2.rememberedCards.length > 0 && submitBtn.disabled) return; // already submitted
      this.classList.toggle('selected');
      playSound('click');
    };
  });
  
  submitBtn.onclick = function() {
    const selectedElms = container.querySelectorAll('.flash-select-card.selected');
    if (selectedElms.length === 0) {
      playSound('incorrect');
      showFloatingToast("Vui lòng chọn ít nhất 1 thẻ hình ảnh mà bạn nhớ!");
      return;
    }
    
    playSound('success');
    state.lesson2.rememberedCards = Array.from(selectedElms).map(el => el.dataset.item);
    
    resultMsg.innerHTML = `✓ Ban Biên Tập báo cáo: Trí nhớ của bạn ghi nhận được <strong>${selectedElms.length}/12</strong> dữ kiện! Tốt lắm, hãy nhấn <strong>"Tiếp theo"</strong>.`;
    resultMsg.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
  };
  
  if (state.lesson2.rememberedCards.length > 0) {
    resultMsg.innerHTML = `✓ Ban Biên Tập báo cáo: Trí nhớ của bạn ghi nhận được <strong>${state.lesson2.rememberedCards.length}/12</strong> dữ kiện! Tốt lắm, hãy nhấn <strong>"Tiếp theo"</strong>.`;
    resultMsg.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
  }
}

// Game 2: Card Categorizer (18 cards into 3 columns)
let selectedPileCard = null;

function initClassificationGame() {
  const pile = document.getElementById('l2-cards-pile');
  const cols = document.querySelectorAll('.classification-col');
  const status = document.getElementById('l2-classification-status');
  const resetBtn = document.getElementById('l2-btn-reset-classification');
  
  if (!pile) return;
  
  renderClassificationPile();
  
  // Setup column clicks
  cols.forEach(col => {
    col.onclick = function() {
      if (!selectedPileCard) return;
      
      const cardId = selectedPileCard.dataset.id;
      const colType = this.dataset.col;
      
      // Move card to state
      state.lesson2.cardClassifications[cardId] = colType;
      
      // Move card element in DOM
      const targetColContainer = this.querySelector('.col-items');
      targetColContainer.appendChild(selectedPileCard);
      
      selectedPileCard.classList.remove('selected');
      selectedPileCard = null;
      playSound('click');
      
      checkClassificationCompletion();
    };
  });
  
  resetBtn.onclick = function() {
    playSound('click');
    state.lesson2.cardClassifications = {};
    renderClassificationPile();
    document.getElementById('l2-col-breaking').innerHTML = '';
    document.getElementById('l2-col-background').innerHTML = '';
    document.getElementById('l2-col-fake').innerHTML = '';
    status.innerHTML = 'Phân loại cả 18 thẻ để hoàn thành bài phân tích sạch.';
    status.style.color = 'var(--color-gold)';
  };
}

function renderClassificationPile() {
  const pile = document.getElementById('l2-cards-pile');
  pile.innerHTML = '';
  selectedPileCard = null;
  
  lesson2Cards.forEach(card => {
    const classification = state.lesson2.cardClassifications[card.id];
    if (!classification) {
      const cardEl = document.createElement('div');
      cardEl.className = 'pile-card-item';
      cardEl.textContent = card.text;
      cardEl.dataset.id = card.id;
      
      cardEl.onclick = function(e) {
        e.stopPropagation();
        document.querySelectorAll('.pile-card-item').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedPileCard = this;
        playSound('click');
      };
      
      pile.appendChild(cardEl);
    } else {
      // Re-place card in correct column
      const cardEl = document.createElement('div');
      cardEl.className = 'pile-card-item placed';
      cardEl.textContent = card.text;
      cardEl.dataset.id = card.id;
      
      const colContainer = document.getElementById(`l2-col-${classification}`);
      if (colContainer) colContainer.appendChild(cardEl);
    }
  });
  
  checkClassificationCompletion();
}

function checkClassificationCompletion() {
  const sortedCount = Object.keys(state.lesson2.cardClassifications).length;
  const status = document.getElementById('l2-classification-status');
  
  if (sortedCount === 18) {
    // Check validation accuracy
    const correctCount = Object.keys(state.lesson2.cardClassifications).filter(cardId => {
      const card = lesson2Cards.find(c => c.id === cardId);
      return card && card.type === state.lesson2.cardClassifications[cardId];
    }).length;
    
    if (correctCount === 18) {
      playSound('success');
      status.innerHTML = '✓ Biên tập viên xuất sắc! Đã phân loại sạch 18 dữ kiện chuẩn xác. Nhấn <strong>"Tiếp theo"</strong>.';
      status.style.color = 'var(--color-success)';
      
      // Remove error borders if any
      document.querySelectorAll('.pile-card-item').forEach(c => c.classList.remove('incorrect-placed'));
    } else {
      playSound('incorrect');
      status.innerHTML = '❌ Phát hiện một số thẻ nằm sai vị trí! Hãy điều chỉnh hoặc nhấn Reset để thử lại.';
      status.style.color = 'var(--color-red-bright)';
      
      // Highlight incorrect items
      Object.keys(state.lesson2.cardClassifications).forEach(cardId => {
        const cardEl = document.querySelector(`.pile-card-item[data-id="${cardId}"]`);
        const cardData = lesson2Cards.find(c => c.id === cardId);
        if (cardEl && cardData) {
          if (cardData.type !== state.lesson2.cardClassifications[cardId]) {
            cardEl.classList.add('incorrect-placed');
          } else {
            cardEl.classList.remove('incorrect-placed');
          }
        }
      });
    }
  } else if (sortedCount > 0) {
    status.innerHTML = `Đã phân loại: ${sortedCount}/18 thẻ thông tin.`;
    status.style.color = 'var(--color-gold)';
  }
}

// Game 3: Logic Frame Builder (8 cards into 4 slots)
let selectedFrameworkCard = null;

function initLogicFrameworkGame() {
  const pile = document.getElementById('l2-framework-cards-pile');
  const slots = document.querySelectorAll('.framework-slot');
  const status = document.getElementById('l2-logic-status');
  const resetBtn = document.getElementById('l2-btn-reset-logic');
  
  if (!pile) return;
  
  renderFrameworkPile();
  
  slots.forEach(slot => {
    slot.onclick = function() {
      if (!selectedFrameworkCard) return;
      
      const cardId = selectedFrameworkCard.dataset.id;
      const slotType = this.dataset.slot;
      
      // Add to logicFramework state
      if (!state.lesson2.logicFramework[slotType].includes(cardId)) {
        state.lesson2.logicFramework[slotType].push(cardId);
      }
      
      const container = this.querySelector('.slot-items-container');
      container.appendChild(selectedFrameworkCard);
      
      selectedFrameworkCard.classList.remove('selected');
      selectedFrameworkCard = null;
      playSound('click');
      
      checkLogicCompletion();
    };
  });
  
  resetBtn.onclick = function() {
    playSound('click');
    state.lesson2.logicFramework = { intro: [], cause: [], solution: [], warning: [] };
    renderFrameworkPile();
    document.getElementById('l2-slot-intro').innerHTML = '';
    document.getElementById('l2-slot-cause').innerHTML = '';
    document.getElementById('l2-slot-solution').innerHTML = '';
    document.getElementById('l2-slot-warning').innerHTML = '';
    status.innerHTML = 'Hãy đặt toàn bộ 8 thẻ vào 4 ô logic trên.';
    status.style.color = 'var(--color-gold)';
  };
}

function renderFrameworkPile() {
  const pile = document.getElementById('l2-framework-cards-pile');
  pile.innerHTML = '';
  selectedFrameworkCard = null;
  
  // Breaking cards ids: c1 to c8
  const breakingCards = lesson2Cards.filter(c => c.type === 'breaking');
  
  breakingCards.forEach(card => {
    // Check if card is already placed in a slot
    let placedSlot = null;
    Object.keys(state.lesson2.logicFramework).forEach(slotKey => {
      if (state.lesson2.logicFramework[slotKey].includes(card.id)) {
        placedSlot = slotKey;
      }
    });
    
    if (!placedSlot) {
      const cardEl = document.createElement('div');
      cardEl.className = 'pile-card-item bg-breaking';
      cardEl.textContent = card.text;
      cardEl.dataset.id = card.id;
      
      cardEl.onclick = function(e) {
        e.stopPropagation();
        document.querySelectorAll('.pile-card-item').forEach(c => c.classList.remove('selected'));
        this.classList.add('selected');
        selectedFrameworkCard = this;
        playSound('click');
      };
      
      pile.appendChild(cardEl);
    } else {
      const cardEl = document.createElement('div');
      cardEl.className = 'pile-card-item placed bg-breaking';
      cardEl.textContent = card.text;
      cardEl.dataset.id = card.id;
      
      const container = document.getElementById(`l2-slot-${placedSlot}`);
      if (container) container.appendChild(cardEl);
    }
  });
  
  checkLogicCompletion();
}

function checkLogicCompletion() {
  const f = state.lesson2.logicFramework;
  const sortedCount = f.intro.length + f.cause.length + f.solution.length + f.warning.length;
  const status = document.getElementById('l2-logic-status');
  
  if (sortedCount === 8) {
    // Validate
    const introCorrect = f.intro.includes('c2') && f.intro.includes('c5') && f.intro.length === 2;
    const causeCorrect = f.cause.includes('c1') && f.cause.includes('c6') && f.cause.length === 2;
    const solutionCorrect = f.solution.includes('c3') && f.solution.includes('c7') && f.solution.length === 2;
    const warningCorrect = f.warning.includes('c4') && f.warning.includes('c8') && f.warning.length === 2;
    
    if (introCorrect && causeCorrect && solutionCorrect && warningCorrect) {
      playSound('success');
      status.innerHTML = '✓ Tuyệt vời! Khung bản tin hoàn hảo theo mạch logic chặt chẽ. Nhấn <strong>"Tiếp theo"</strong>.';
      status.style.color = 'var(--color-success)';
      document.querySelectorAll('.framework-slot').forEach(s => s.classList.remove('incorrect-slot'));
    } else {
      playSound('incorrect');
      status.innerHTML = '❌ Phát hiện dữ kiện bị lệch mạch logic kịch bản! Hãy điều chỉnh hoặc nhấn Reset.';
      status.style.color = 'var(--color-red-bright)';
      
      // Highlight slot errors
      if (!introCorrect) document.querySelector('.framework-slot[data-slot="intro"]').classList.add('incorrect-slot');
      else document.querySelector('.framework-slot[data-slot="intro"]').classList.remove('incorrect-slot');
      
      if (!causeCorrect) document.querySelector('.framework-slot[data-slot="cause"]').classList.add('incorrect-slot');
      else document.querySelector('.framework-slot[data-slot="cause"]').classList.remove('incorrect-slot');
      
      if (!solutionCorrect) document.querySelector('.framework-slot[data-slot="solution"]').classList.add('incorrect-slot');
      else document.querySelector('.framework-slot[data-slot="solution"]').classList.remove('incorrect-slot');
      
      if (!warningCorrect) document.querySelector('.framework-slot[data-slot="warning"]').classList.add('incorrect-slot');
      else document.querySelector('.framework-slot[data-slot="warning"]').classList.remove('incorrect-slot');
    }
  } else if (sortedCount > 0) {
    status.innerHTML = `Đã xếp: ${sortedCount}/8 thẻ vào khung logic.`;
    status.style.color = 'var(--color-gold)';
  }
}

// Game 4: Headline selection
function initHeadlineSelection() {
  const options = document.querySelectorAll('.headline-option-card');
  const btn = document.getElementById('l2-btn-submit-headline');
  const customInput = document.getElementById('l2-custom-headline-input');
  
  if (!options) return;
  
  // Set initial selected Headline active if any
  options.forEach(opt => {
    const key = opt.dataset.headline;
    if (state.lesson2.selectedHeadline === key) {
      opt.classList.add('active');
    } else {
      opt.classList.remove('active');
    }
    
    opt.onclick = function() {
      if (state.lesson2.voted) return; // already voted
      options.forEach(o => o.classList.remove('active'));
      this.classList.add('active');
      state.lesson2.selectedHeadline = key;
      playSound('click');
    };
  });
  
  btn.onclick = function() {
    if (state.lesson2.voted) return;
    
    if (!state.lesson2.selectedHeadline) {
      playSound('incorrect');
      showFloatingToast("Vui lòng chọn hoặc tự viết một tiêu đề!");
      return;
    }
    
    if (state.lesson2.selectedHeadline === 'custom') {
      const text = customInput.value.trim();
      if (!text) {
        playSound('incorrect');
        showFloatingToast("Vui lòng nhập Headline tự biên soạn của nhóm!");
        customInput.focus();
        return;
      }
      state.lesson2.customHeadline = text;
    }
    
    playSound('correct');
    state.lesson2.voted = true;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    customInput.disabled = true;
    
    // Auto jump to slide 21 (vote visual) in 1.2s
    setTimeout(() => {
      state.currentSlide++;
      updateSlideView();
    }, 1200);
  };
  
  if (state.lesson2.voted) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    customInput.disabled = true;
  }
}

// Game 4 Part 2: Vote poll animation
function animateHeadlineVotes() {
  const key = state.lesson2.selectedHeadline;
  
  // Reset charts
  document.getElementById('l2-vote-fill-h1').style.width = '0%';
  document.getElementById('l2-vote-fill-h2').style.width = '0%';
  document.getElementById('l2-vote-fill-h3').style.width = '0%';
  document.getElementById('l2-vote-fill-custom').style.width = '0%';
  document.getElementById('l2-custom-vote-row').style.display = 'none';
  
  setTimeout(() => {
    if (key === 'h1') {
      document.getElementById('l2-vote-fill-h1').style.width = '42%';
      document.getElementById('l2-vote-val-h1').textContent = '42%';
      
      document.getElementById('l2-vote-fill-h2').style.width = '30%';
      document.getElementById('l2-vote-val-h2').textContent = '30%';
      
      document.getElementById('l2-vote-fill-h3').style.width = '28%';
      document.getElementById('l2-vote-val-h3').textContent = '28%';
    } else if (key === 'h2') {
      document.getElementById('l2-vote-fill-h1').style.width = '25%';
      document.getElementById('l2-vote-val-h1').textContent = '25%';
      
      document.getElementById('l2-vote-fill-h2').style.width = '52%';
      document.getElementById('l2-vote-val-h2').textContent = '52%';
      
      document.getElementById('l2-vote-fill-h3').style.width = '23%';
      document.getElementById('l2-vote-val-h3').textContent = '23%';
    } else if (key === 'h3') {
      document.getElementById('l2-vote-fill-h1').style.width = '22%';
      document.getElementById('l2-vote-val-h1').textContent = '22%';
      
      document.getElementById('l2-vote-fill-h2').style.width = '25%';
      document.getElementById('l2-vote-val-h2').textContent = '25%';
      
      document.getElementById('l2-vote-fill-h3').style.width = '53%';
      document.getElementById('l2-vote-val-h3').textContent = '53%';
    } else if (key === 'custom') {
      document.getElementById('l2-custom-vote-row').style.display = 'flex';
      document.getElementById('l2-custom-vote-label').textContent = `“${state.lesson2.customHeadline}” (Nhóm bạn):`;
      
      document.getElementById('l2-vote-fill-h1').style.width = '20%';
      document.getElementById('l2-vote-val-h1').textContent = '20%';
      
      document.getElementById('l2-vote-fill-h2').style.width = '20%';
      document.getElementById('l2-vote-val-h2').textContent = '20%';
      
      document.getElementById('l2-vote-fill-h3').style.width = '15%';
      document.getElementById('l2-vote-val-h3').textContent = '15%';
      
      document.getElementById('l2-vote-fill-custom').style.width = '45%';
      document.getElementById('l2-vote-val-custom').textContent = '45%';
    }
  }, 300);
}

// Game 4 Part 3: Show final Headline
function populateFinalHeadline() {
  const display = document.getElementById('l2-final-headline-display');
  if (!display) return;
  
  let headlineText = '“BIẾT BƠI CHƯA CHẮC ĐÃ AN TOÀN”';
  const key = state.lesson2.selectedHeadline;
  
  if (key === 'h1') headlineText = '“PHÒNG TRÁNH LUÔN TỐT HƠN CỨU HỘ”';
  else if (key === 'h2') headlineText = '“ĐỪNG CHỦ QUAN VỚI NƯỚC”';
  else if (key === 'h3') headlineText = '“BIẾT BƠI CHƯA CHẮC ĐÃ AN TOÀN”';
  else if (key === 'custom') headlineText = `“${state.lesson2.customHeadline.toUpperCase()}”`;
  
  display.textContent = headlineText;
}

// Game 5: Script Compiler
function initDraftWorkspace() {
  const headlineDisplay = document.getElementById('l2-draft-headline-display');
  const compileBtn = document.getElementById('l2-btn-compile-draft');
  const successMsg = document.getElementById('l2-compile-success');
  const icons = document.querySelectorAll('.icon-select-card');
  const checkboxGroup = document.getElementsByName('main_news_fact');
  
  if (!headlineDisplay) return;
  
  // Set headline display
  let headlineText = 'BIẾT BƠI CHƯA CHẮC ĐÃ AN TOÀN';
  const key = state.lesson2.selectedHeadline;
  if (key === 'h1') headlineText = 'PHÒNG TRÁNH LUÔN TỐT HƠN CỨU HỘ';
  else if (key === 'h2') headlineText = 'ĐỪNG CHỦ QUAN VỚI NƯỚC';
  else if (key === 'h3') headlineText = 'BIẾT BƠI CHƯA CHẮC ĐÃ AN TOÀN';
  else if (key === 'custom') headlineText = state.lesson2.customHeadline;
  
  headlineDisplay.textContent = `“${headlineText.toUpperCase()}”`;
  
  // Setup icon clicks
  icons.forEach(ic => {
    const iconKey = ic.dataset.icon;
    
    // Initial active state from state
    if (state.lesson2.draft.selectedIcons.includes(iconKey)) {
      ic.classList.add('active');
    } else {
      ic.classList.remove('active');
    }
    
    ic.onclick = function() {
      if (state.lesson2.draft.completed) return;
      this.classList.toggle('active');
      playSound('click');
      
      const idx = state.lesson2.draft.selectedIcons.indexOf(iconKey);
      if (idx > -1) {
        state.lesson2.draft.selectedIcons.splice(idx, 1);
      } else {
        state.lesson2.draft.selectedIcons.push(iconKey);
      }
    };
  });
  
  compileBtn.onclick = function() {
    if (state.lesson2.draft.completed) return;
    
    const openingVal = document.getElementById('l2-draft-opening').value;
    if (!openingVal) {
      playSound('incorrect');
      showFloatingToast("Vui lòng chọn một Lời dẫn mở đầu!");
      return;
    }
    
    // Check main news points selected (at least 3)
    const selectedFacts = [];
    checkboxGroup.forEach(cb => {
      if (cb.checked) selectedFacts.push(cb.value);
    });
    
    if (selectedFacts.length < 3) {
      playSound('incorrect');
      showFloatingToast("Vui lòng tích chọn ít nhất 3 dữ kiện quan trọng cho phần tin chính!");
      return;
    }
    
    if (state.lesson2.draft.selectedIcons.length === 0) {
      playSound('incorrect');
      showFloatingToast("Vui lòng chọn ít nhất 1 biểu tượng hiển thị hỗ trợ!");
      return;
    }
    
    // Assembling teleprompter text
    let openingText = "";
    if (openingVal === 'hook1') openingText = "🚨 Cảnh báo khẩn cấp từ hiện trường: Số vụ đuối nước học đường đang gia tăng ở mức nguy hiểm!";
    else if (openingVal === 'hook2') openingText = "🌊 Bạn có biết, những dòng sông tĩnh lặng lại ẩn chứa hiểm họa vô cùng đáng sợ đối với học sinh?";
    else if (openingVal === 'hook3') openingText = "🎙️ Bản tin Nova News hôm nay xin gửi tới các bạn cảnh báo đặc biệt về an toàn dưới nước!";
    
    let factsText = "";
    if (selectedFacts.includes('fact1')) factsText += " • Nhấn mạnh việc mặc áo phao cứu sinh tiêu chuẩn giúp bảo vệ cơ thể và giảm tới 90% nguy cơ đuối nước.";
    if (selectedFacts.includes('fact2')) factsText += " • Hãy trang bị kỹ năng tự nổi cứu mạng, giúp cơ thể nổi ngửa, tiết kiệm sức lực và kéo dài thời gian chờ đội hộ đê.";
    if (selectedFacts.includes('fact3')) factsText += " • Lưu ý chuột rút cơ đột ngột và rơi vào dòng chảy xa bờ chảy xiết là 2 tác nhân nguy hiểm hàng đầu.";
    if (selectedFacts.includes('fact4')) factsText += " • Hãy tránh xa các điểm nước sâu trơn trượt nguy hiểm và luôn quan sát kỹ lưỡng cờ/biển cảnh báo.";
    
    const closingText = `📢 LỜI KHUYÊN CUỐI CÙNG: Hãy khắc cốt ghi tâm thông điệp của ngày hôm nay - "${headlineText.toUpperCase()}". Gặp nguy hiểm, hãy kêu cứu thật to và gọi người lớn trợ giúp. Phòng tránh luôn luôn đi trước cứu hộ!`;
    
    state.lesson2.draft.opening = openingText;
    state.lesson2.draft.mainNews = selectedFacts;
    state.lesson2.draft.closing = closingText;
    state.lesson2.draft.completed = true;
    state.lesson2.draft.teleprompterText = `<strong>[OPENING HOOK]</strong><br>${openingText}<br><br><strong>[BẢN TIN CHÍNH]</strong><br>${factsText}<br><br><strong>[THÔNG ĐIỆP CHỐT]</strong><br>${closingText}`;
    
    playSound('success');
    successMsg.style.display = 'block';
    compileBtn.disabled = true;
    compileBtn.style.opacity = '0.5';
    
    // Disable inputs
    document.getElementById('l2-draft-opening').disabled = true;
    checkboxGroup.forEach(cb => cb.disabled = true);
    
    // Auto jump to next in 1.5s
    setTimeout(() => {
      state.currentSlide++;
      updateSlideView();
    }, 1500);
  };
  
  if (state.lesson2.draft.completed) {
    successMsg.style.display = 'block';
    compileBtn.disabled = true;
    compileBtn.style.opacity = '0.5';
    document.getElementById('l2-draft-opening').disabled = true;
    checkboxGroup.forEach(cb => {
      cb.disabled = true;
      if (state.lesson2.draft.mainNews.includes(cb.value)) cb.checked = true;
    });
  }
}

// Game 5 Part 2: TV Anchor Playback
function runTVBroadcast() {
  const prompter = document.getElementById('l2-teleprompter-box');
  const iconsContainer = document.getElementById('l2-tv-overlay-icons');
  const headlineTextEl = document.getElementById('l2-tv-headline');
  
  if (!prompter) return;
  
  prompter.innerHTML = state.lesson2.draft.teleprompterText || "Kịch bản phát sóng chưa được chuẩn bị...";
  
  // Set overlay icons
  iconsContainer.innerHTML = '';
  state.lesson2.draft.selectedIcons.forEach(icon => {
    let iconStr = "⚠️";
    if (icon === 'warning') iconStr = "⚠️";
    else if (icon === 'vest') iconStr = "🦺";
    else if (icon === 'swimmer') iconStr = "🏊";
    else if (icon === 'phone') iconStr = "📞";
    
    const iconEl = document.createElement('div');
    iconEl.className = 'tv-overlay-badge';
    iconEl.textContent = iconStr;
    iconsContainer.appendChild(iconEl);
  });
  
  // Set lower third headline text
  let headlineText = 'BIẾT BƠI CHƯA CHẮC ĐÃ AN TOÀN';
  const key = state.lesson2.selectedHeadline;
  if (key === 'h1') headlineText = 'PHÒNG TRÁNH TỐT HƠN CỨU HỘ';
  else if (key === 'h2') headlineText = 'ĐỪNG CHỦ QUAN VỚI NƯỚC';
  else if (key === 'h3') headlineText = 'BIẾT BƠI CHƯA CHẮC ĐÃ AN TOÀN';
  else if (key === 'custom') headlineText = state.lesson2.customHeadline;
  
  headlineTextEl.textContent = headlineText.toUpperCase();
}

// Reflection submit hook
function initL2Reflection() {
  const submitBtn = document.getElementById('l2-btn-submit-reflect');
  const successMsg = document.getElementById('l2-reflect-success-msg');
  const ref1 = document.getElementById('l2-input-reflect1');
  const ref2 = document.getElementById('l2-input-reflect2');
  
  if (!submitBtn) return;
  
  ref1.addEventListener('input', function() {
    state.lesson2.reflection.q1 = this.value;
  });
  
  ref2.addEventListener('input', function() {
    state.lesson2.reflection.q2 = this.value;
  });
  
  submitBtn.onclick = function() {
    if (!ref1.value.trim() || !ref2.value.trim()) {
      playSound('incorrect');
      showFloatingToast("Vui lòng điền đầy đủ 2 câu trả lời phản tư!");
      return;
    }
    
    playSound('success');
    successMsg.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    ref1.disabled = true;
    ref2.disabled = true;
  };
  
  if (state.lesson2.reflection.q1.trim() !== '' && state.lesson2.reflection.q2.trim() !== '') {
    successMsg.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    ref1.disabled = true;
    ref2.disabled = true;
    ref1.value = state.lesson2.reflection.q1;
    ref2.value = state.lesson2.reflection.q2;
  }
}

// Adaptation warning submit hook
function initL2Warning() {
  const submitBtn = document.getElementById('l2-btn-submit-warning');
  const successMsg = document.getElementById('l2-warning-success-msg');
  const warningText = document.getElementById('l2-input-warning');
  const warningReason = document.getElementById('l2-input-warning-reason');
  
  if (!submitBtn) return;
  
  warningText.addEventListener('input', function() {
    state.lesson2.warningText = this.value;
  });
  
  warningReason.addEventListener('input', function() {
    state.lesson2.warningReason = this.value;
  });
  
  submitBtn.onclick = function() {
    if (!warningText.value.trim() || !warningReason.value.trim()) {
      playSound('incorrect');
      showFloatingToast("Vui lòng viết đầy đủ lời khuyên cảnh báo và giải thích lý do!");
      return;
    }
    
    playSound('success');
    state.lesson2.warningCompleted = true;
    successMsg.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    warningText.disabled = true;
    warningReason.disabled = true;
  };
  
  if (state.lesson2.warningCompleted) {
    successMsg.style.display = 'flex';
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
    warningText.disabled = true;
    warningReason.disabled = true;
    warningText.value = state.lesson2.warningText;
    warningReason.value = state.lesson2.warningReason;
  }
}
