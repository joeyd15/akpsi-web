(function () {
  // Prevent loading twice
  if (document.getElementById("akpsi-chat-toggle")) return;

  /* ============================
     Styles
  ============================ */
  const style = document.createElement("style");
  style.textContent = `
    .akpsi-chat-toggle {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: #003366;
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 9999;
    }

    .akpsi-chat-modal {
      position: fixed;
      bottom: 90px;
      right: 24px;
      width: 320px;
      height: 420px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      z-index: 9999;
      font-family: Arial, sans-serif;
    }

    .akpsi-chat-header {
      background: #003366;
      color: white;
      padding: 12px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .akpsi-chat-messages {
      flex: 1;
      padding: 10px;
      overflow-y: auto;
      font-size: 14px;
    }

    .akpsi-bot,
    .akpsi-user {
      padding: 8px 10px;
      border-radius: 8px;
      margin-bottom: 6px;
      max-width: 85%;
    }

    .akpsi-bot {
      background: #f1f1f1;
    }

    .akpsi-user {
      background: #003366;
      color: white;
      margin-left: auto;
    }

    .akpsi-chat-input {
      display: flex;
      border-top: 1px solid #ddd;
    }

    .akpsi-chat-input input {
      flex: 1;
      border: none;
      padding: 8px;
      outline: none;
    }

    .akpsi-chat-input button {
      border: none;
      background: #003366;
      color: white;
      padding: 0 14px;
      cursor: pointer;
    }

    .akpsi-quick-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 8px;
    }

    .akpsi-quick-btns button {
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 6px;
      border: 1px solid #003366;
      background: white;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  /* ============================
     HTML
  ============================ */
  const toggle = document.createElement("button");
  toggle.id = "akpsi-chat-toggle";
  toggle.className = "akpsi-chat-toggle";
  toggle.textContent = "💬";

  const modal = document.createElement("div");
  modal.className = "akpsi-chat-modal";
  modal.innerHTML = `
    <div class="akpsi-chat-header">
      <strong>AKPsi Assistant</strong>
      <button id="akpsi-chat-close" aria-label="Close chat">&times;</button>
    </div>
    <div class="akpsi-chat-messages" id="akpsi-chat-messages"></div>
    <div class="akpsi-chat-input">
      <input id="akpsi-chat-input" placeholder="Ask a question..." />
      <button id="akpsi-chat-send">Send</button>
    </div>
  `;

  document.body.appendChild(toggle);
  document.body.appendChild(modal);

  /* ============================
     Public Knowledge Base
  ============================ */
  const KNOWLEDGE = [
    {
      k: ["akpsi", "alpha kappa psi"],
      r: "Alpha Kappa Psi is a professional business fraternity focused on leadership, professional development, and brotherhood. The Zeta Lambda chapter is based at the University of Tennessee."
    },
    {
      k: ["rush", "recruitment", "join"],
      r: "Rush is the recruitment process for AKPsi. Attending rush events is the best way to learn more about the fraternity and meet current members."
    },
    {
      k: ["requirements", "who can join"],
      r: "AKPsi is open to students interested in professional development and leadership. Specific eligibility details are shared during rush."
    },
    {
      k: ["contact", "email", "instagram", "social"],
      r: "You can reach us on Instagram (utk_akpsi) or email us at placeholder@akpsizl.org."
    },
    {
      k: ["utk", "tennessee"],
      r: "AKPsi Zeta Lambda is the Alpha Kappa Psi chapter at the University of Tennessee–Knoxville."
    }
  ];
 

  const QUICK_PROMPTS = [
    "What is AKPsi?",
    "How do I join?",
    "What is rush?",
    "How can I contact you?"
  ];


  /* ============================
     Logic
  ============================ */
  const messages = modal.querySelector("#akpsi-chat-messages");
  const input = modal.querySelector("#akpsi-chat-input");

  function add(text, cls) {
    const div = document.createElement("div");
    div.className = cls;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function respond(text) {
    const t = text.toLowerCase();
    for (const e of KNOWLEDGE) {
      if (e.k.some(k => t.includes(k))) return e.r;
    }
    return "I can help answer questions about AKPsi, rush, or how to get involved. For anything else, feel free to contact us!";
  }

  function addQuickButtons() {
    const wrapper = document.createElement("div");
    wrapper.className = "akpsi-quick-btns";

    QUICK_PROMPTS.forEach(p => {
      const btn = document.createElement("button");
      btn.textContent = p;
      btn.onclick = () => {
        add(p, "akpsi-user");
        setTimeout(() => add(respond(p), "akpsi-bot"), 300);
      };
      wrapper.appendChild(btn);
    });

    messages.appendChild(wrapper);
  }

  

  /* ============================
     Events
  ============================ */
  toggle.onclick = () => {
    modal.style.display = "flex";
    if (!messages.hasChildNodes()) {
      add(
        "Hi! I can help answer questions about Alpha Kappa Psi, rush, and how to get involved.",
        "akpsi-bot"
      );
      addQuickButtons();
    }
  };



  modal.querySelector("#akpsi-chat-close").onclick = () =>
    (modal.style.display = "none");

  modal.querySelector("#akpsi-chat-send").onclick = () => {
    const text = input.value.trim();
    if (!text) return;
    add(text, "akpsi-user");
    input.value = "";
    setTimeout(() => add(respond(text), "akpsi-bot"), 300);
  };

  input.addEventListener("keypress", e => {
    if (e.key === "Enter")
      modal.querySelector("#akpsi-chat-send").click();
  });
})();
