(function () {
  "use strict";

  let active = false;
  let chatVisible = true;
  let btn = null;
  let chatToggleBtn = null;
  let chatIframe = null;
  const hiddenElements = [];
  const styledElements = [];
  const ancestorElements = [];

  const CHAT_ON_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  const CHAT_OFF_SVG =
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="3" y1="3" x2="21" y2="21"/></svg>';

  function getTwitchChannel() {
    return localStorage.getItem("cleantube-ttv-channel") || "";
  }

  function getTwitchChatUrl(channel) {
    return `https://www.twitch.tv/embed/${channel}/chat?parent=www.youtube.com&darkpopout`;
  }

  function activate() {
    const player = document.querySelector("#movie_player");
    if (!player) {
      alert("CleanTube TTV: Could not find the YouTube video player on this page.");
      return;
    }

    let channel = getTwitchChannel();
    if (!channel) {
      const input = prompt("Enter Twitch channel name for chat:");
      if (!input) return;
      localStorage.setItem("cleantube-ttv-channel", input.trim());
      channel = input.trim();
    }

    // Walk up from #movie_player to body, collecting the ancestor chain
    const ancestors = new Set();
    let node = player;
    while (node && node !== document.body) {
      ancestors.add(node);
      node = node.parentElement;
    }

    // For each ancestor, hide its sibling elements that are not in the chain
    node = player;
    while (node && node !== document.body) {
      const parent = node.parentElement;
      if (parent) {
        for (const child of parent.children) {
          if (child === node) continue;
          if (child.id === "cleantube-ttv-btn" || child.id === "cleantube-chat-panel") continue;
          if (child.tagName === "SCRIPT" || child.tagName === "STYLE" || child.tagName === "LINK") continue;
          // Hide this sibling
          hiddenElements.push({ el: child, prev: child.style.display });
          child.style.setProperty("display", "none", "important");
        }
      }
      node = parent;
    }

    // Now position the ancestor chain to fill the left portion of the screen
    // We need to override sizing/positioning on each ancestor from body down to the player
    node = player.parentElement;
    while (node && node !== document.body) {
      styledElements.push({ el: node, prev: node.getAttribute("style") || "" });
      ancestorElements.push(node);
      node.style.setProperty("position", "fixed", "important");
      node.style.setProperty("top", "0", "important");
      node.style.setProperty("left", "0", "important");
      node.style.setProperty("width", "calc(100vw - 440px)", "important");
      node.style.setProperty("height", "100vh", "important");
      node.style.setProperty("max-width", "none", "important");
      node.style.setProperty("max-height", "none", "important");
      node.style.setProperty("min-height", "0", "important");
      node.style.setProperty("margin", "0", "important");
      node.style.setProperty("padding", "0", "important");
      node.style.setProperty("z-index", "99998", "important");
      node.style.setProperty("overflow", "hidden", "important");
      node = node.parentElement;
    }

    // Style the player itself
    styledElements.push({ el: player, prev: player.getAttribute("style") || "" });
    player.style.setProperty("width", "100%", "important");
    player.style.setProperty("height", "100%", "important");
    player.style.setProperty("position", "relative", "important");

    // Create the chat iframe
    chatIframe = document.createElement("iframe");
    chatIframe.id = "cleantube-chat-panel";
    chatIframe.src = getTwitchChatUrl(channel);
    chatIframe.setAttribute("allowfullscreen", "true");
    document.body.appendChild(chatIframe);

    document.body.classList.add("cleantube-active");

    active = true;
    chatVisible = true;
    btn.textContent = "Exit Clean View";
    btn.style.background = "#ef4444";
    if (chatToggleBtn) {
      chatToggleBtn.style.display = "flex";
      updateChatToggleIcon();
    }
  }

  function setChatVisible(visible) {
    chatVisible = visible;
    if (chatIframe) {
      chatIframe.style.display = visible ? "" : "none";
    }
    const width = visible ? "calc(100vw - 440px)" : "100vw";
    for (const el of ancestorElements) {
      el.style.setProperty("width", width, "important");
    }
    updateChatToggleIcon();

    // YouTube's player sizes the <video> element via JS, not CSS, so it needs
    // a resize event to recompute dimensions after the container width changes.
    const player = document.querySelector("#movie_player");
    if (player && typeof player.setSize === "function") {
      player.setSize();
    }
    window.dispatchEvent(new Event("resize"));
  }

  function updateChatToggleIcon() {
    if (!chatToggleBtn) return;
    chatToggleBtn.innerHTML = chatVisible ? CHAT_OFF_SVG : CHAT_ON_SVG;
    chatToggleBtn.title = chatVisible ? "Hide chat" : "Show chat";
  }

  function toggleChat() {
    setChatVisible(!chatVisible);
  }

  function deactivate() {
    // Restore all hidden siblings
    for (const item of hiddenElements) {
      if (item.prev !== undefined && item.prev !== "") {
        item.el.style.display = item.prev;
      } else {
        item.el.style.removeProperty("display");
      }
    }
    hiddenElements.length = 0;

    // Restore all restyled ancestors
    for (const item of styledElements) {
      if (item.prev) {
        item.el.setAttribute("style", item.prev);
      } else {
        item.el.removeAttribute("style");
      }
    }
    styledElements.length = 0;
    ancestorElements.length = 0;

    // Remove chat iframe
    if (chatIframe) {
      chatIframe.remove();
      chatIframe = null;
    }

    document.body.classList.remove("cleantube-active");

    active = false;
    chatVisible = true;
    btn.textContent = "Clean View + TTV";
    btn.style.background = "#9146ff";
    if (chatToggleBtn) {
      chatToggleBtn.style.display = "none";
    }
  }

  function toggle() {
    if (active) {
      deactivate();
    } else {
      activate();
    }
  }

  function placeButtonInPlayer() {
    const player = document.querySelector("#movie_player");
    if (player && btn && btn.parentElement !== player) {
      player.appendChild(btn);
    }
    if (player && chatToggleBtn && chatToggleBtn.parentElement !== player) {
      player.appendChild(chatToggleBtn);
    }
  }

  function createButton() {
    if (btn) return;

    btn = document.createElement("button");
    btn.id = "cleantube-ttv-btn";
    btn.textContent = "Clean View + TTV";
    btn.addEventListener("click", toggle);

    chatToggleBtn = document.createElement("button");
    chatToggleBtn.id = "cleantube-chat-toggle-btn";
    chatToggleBtn.addEventListener("click", toggleChat);
    updateChatToggleIcon();

    // Try to place inside the player immediately, fall back to body
    const player = document.querySelector("#movie_player");
    if (player) {
      player.appendChild(btn);
      player.appendChild(chatToggleBtn);
    } else {
      document.body.appendChild(btn);
      document.body.appendChild(chatToggleBtn);
      // Retry when player appears
      const obs = new MutationObserver(() => {
        const p = document.querySelector("#movie_player");
        if (p) {
          p.appendChild(btn);
          p.appendChild(chatToggleBtn);
          obs.disconnect();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  function setupContextMenu() {
    btn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      const current = getTwitchChannel();
      const input = prompt("Change Twitch channel:", current);
      if (input !== null) {
        localStorage.setItem("cleantube-ttv-channel", input.trim());
        if (active && chatIframe) {
          chatIframe.src = getTwitchChatUrl(input.trim());
        }
      }
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && active) {
      deactivate();
    }
  });

  function init() {
    createButton();
    setupContextMenu();

    // Re-place button inside player after YouTube SPA navigations
    document.addEventListener("yt-navigate-finish", placeButtonInPlayer);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
