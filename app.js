// State management
const state = {
  currentSlide: 0,
  slides: [],
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
  state.slides = Array.from(document.querySelectorAll('.slide'));
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
  } else if (slideId === 'final-products-slide') {
    triggerConfetti();
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
    dashboard.style.display = 'none';
    viewer.style.display = 'flex';
    state.currentSlide = 0;
    updateSlideView();
  });

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

