import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Form.css";
import "./Home.css";
import { getAuth, signOut, onAuthStateChanged } from "firebase/auth";
import {
  FiSend, FiSmile, FiPaperclip, FiMic, FiCamera,
  FiSearch, FiEdit2, FiTrash2, FiBookmark, FiShare2,
  FiMessageSquare, FiX, FiCheck, FiChevronDown,
  FiUsers, FiImage, FiVideo, FiFile, FiStopCircle,
} from "react-icons/fi";
import { io } from "socket.io-client";

let API = "https://rizzchat-be-z4vo.onrender.com";
let socket = io(API);

const EMOJIS = [
  "😀","😂","🤣","😊","😍","🥰","😎","🤩","😜","😝",
  "🤗","😭","😤","😡","🥺","😱","🤔","🙄","😴","🤤",
  "😈","👻","💀","☠️","👋","✋","👌","👍","👎","✌️",
  "🤞","🖕","💪","🦵","👀","🧠","❤️","🧡","💛","💚",
  "💙","💜","🖤","🤍","💔","💕","💯","🔥","⭐","🎉",
  "🎊","🎈","🎁","🎂","👑","💎","🚀","⭐","🌟","✨",
];

const REACTIONS = ["❤️","😂","🔥","👍"];

const SAMPLE_GIFS = [
  "https://media.giphy.com/media/l0HlNaQ6gW8VDcZRe/giphy.gif",
  "https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif",
  "https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif",
  "https://media.giphy.com/media/l41lI2P8UcF7MGVi/giphy.gif",
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/3o7abAHdYvZdBNn7O8/giphy.gif",
  "https://media.giphy.com/media/3orieS4jfHaKpcGYqY/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
];

function ParticleSphere() {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = 200, h = 200;
    canvas.width = w; canvas.height = h;
    const particles = [];
    const N = 150, R = 60, focal = 250;
    for (let i = 0; i < N; i++) {
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      const phi = Math.acos(1 - 2 * (i + 0.5) / N);
      particles.push({
        x: R * Math.sin(phi) * Math.cos(theta),
        y: R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi),
        size: 1 + Math.random() * 2,
        color: "hsl(" + (Math.random() * 60 + 200) + ", 80%, 60%)",
      });
    }
    let angleY = 0, angleX = 0;
    function animate() {
      ctx.clearRect(0, 0, w, h);
      angleY += 0.008; angleX += 0.004;
      const cosY = Math.cos(angleY), sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX), sinX = Math.sin(angleX);
      const projected = particles.map((p) => {
        let x1 = p.x * cosY + p.z * sinY;
        let z1 = -p.x * sinY + p.z * cosY;
        let y1 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;
        let scale = focal / (focal + z2 + R);
        return { ...p, sx: x1 * scale + w / 2, sy: y1 * scale + h / 2, scale };
      });
      projected.sort((a, b) => b.scale - a.scale);
      for (const p of projected) {
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, p.size * p.scale, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.scale * 0.8;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);
  return <canvas ref={canvasRef} className="particle-sphere" />;
}

function Home() {
  let [chat, setChat] = useState([]);
  let [message, setMessage] = useState("");
  let [username, setUsername] = useState(null);
  let [displayName, setDisplayName] = useState("");
  let [replyingTo, setReplyingTo] = useState(null);
  let [editMsgId, setEditMsgId] = useState(null);
  let [editText, setEditText] = useState("");
  let [showEmoji, setShowEmoji] = useState(false);
  let [showGifs, setShowGifs] = useState(false);
  let [showStickers, setShowStickers] = useState(false);
  let [reactionMsg, setReactionMsg] = useState(null);
  let [isRecording, setIsRecording] = useState(false);
  let [typingUsers, setTypingUsers] = useState([]);
  let [onlineUsers, setOnlineUsers] = useState([]);
  let [searchQuery, setSearchQuery] = useState("");
  let [showSearch, setShowSearch] = useState(false);
  let [gifSearch, setGifSearch] = useState("");
  let [gifResults, setGifResults] = useState(SAMPLE_GIFS);
  let [showSidebar, setShowSidebar] = useState(false);

  let endRef = useRef(null);
  let typingTimeout = useRef(null);
  let mediaRecorder = useRef(null);
  let audioChunks = useRef([]);
  let auth = getAuth();
  let nav = useNavigate();

  useEffect(() => {
    function checkUser(user) {
      if (!user) nav("/login");
      else {
        setUsername(user.email);
        setDisplayName(user.displayName || user.email);
        socket.emit("register", user.email);
      }
    }
    let stopWatching = onAuthStateChanged(auth, checkUser);
    return () => stopWatching();
  }, []);

  useEffect(() => {
    if (!username) return;

    socket.on("history", (data) => {
      setChat(data);
    });

    socket.on("message", (data) => {
      setChat((prev) => {
        let exists = prev.find((m) => m._id === data._id);
        if (exists) return prev.map((m) => m._id === data._id ? data : m);
        return [...prev, data];
      });
      if (data.senderId !== username) {
        setTimeout(() => {
          socket.emit("seen", { messageId: data._id, email: username });
        }, 500);
      }
    });

    socket.on("messageEdited", (data) => {
      setChat((prev) => prev.map((m) => {
        if (m._id === data._id) return { ...m, message: data.message, edited: true, editedAt: data.editedAt };
        return m;
      }));
    });

    socket.on("messageDeleted", (data) => {
      setChat((prev) => prev.filter((m) => m._id !== data._id));
    });

    socket.on("reaction", (data) => {
      setChat((prev) => prev.map((m) => {
        if (m._id === data._id) return { ...m, reactions: data.reactions };
        return m;
      }));
    });

    socket.on("messagePinned", (data) => {
      setChat((prev) => prev.map((m) => {
        if (m._id === data._id) return { ...m, pinned: data.pinned };
        return m;
      }));
    });

    socket.on("seen", (data) => {
      setChat((prev) => prev.map((m) => {
        if (m._id === data._id) return { ...m, seenBy: data.seenBy };
        return m;
      }));
    });

    socket.on("typing", (data) => {
      if (data.email !== username) {
        setTypingUsers((prev) => {
          if (!prev.includes(data.email)) return [...prev, data.email];
          return prev;
        });
        clearTimeout(data._timeout);
        data._timeout = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((u) => u !== data.email));
        }, 3000);
      }
    });

    socket.on("stopTyping", (data) => {
      setTypingUsers((prev) => prev.filter((u) => u !== data.email));
    });

    socket.on("onlineUsers", (data) => {
      setOnlineUsers(data);
    });

    socket.on("userOffline", (data) => {
      setOnlineUsers((prev) => prev.filter((u) => u !== data.email));
    });

    socket.emit("getHistory");
    socket.emit("getOnlineUsers");

    return () => {
      socket.off("history"); socket.off("message");
      socket.off("messageEdited"); socket.off("messageDeleted");
      socket.off("reaction"); socket.off("messagePinned");
      socket.off("seen"); socket.off("typing");
      socket.off("stopTyping"); socket.off("onlineUsers");
      socket.off("userOffline");
    };
  }, [username]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, typingUsers]);

  let startTyping = useCallback(() => {
    socket.emit("typing", { email: username, name: displayName });
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit("stopTyping", { email: username });
    }, 2000);
  }, [username, displayName]);

  let uploadFile = async (blob, fileName) => {
    let formData = new FormData();
    formData.append("file", blob, fileName);
    let res = await fetch(API + "/chat/upload", { method: "POST", body: formData });
    return await res.json();
  };

  let sendTextMessage = async () => {
    let msgText = message;
    if (!msgText.trim() && !replyingTo) return;
    let data = {
      senderId: username, senderName: displayName, message: msgText, type: "text",
      replyTo: replyingTo ? replyingTo._id : null,
      replyPreview: replyingTo ? (replyingTo.message || "").substring(0, 80) : null,
    };
    socket.emit("message", data);
    setMessage(""); setReplyingTo(null);
    setShowEmoji(false); setShowGifs(false); setShowStickers(false);
  };

  let sendFileMessage = async (file, msgType) => {
    if (!file) return;
    try {
      let result = await uploadFile(file, file.name);
      socket.emit("message", {
        senderId: username, senderName: displayName, message: file.name, type: msgType,
        fileUrl: result.file_url, fileName: result.file_name,
        fileSize: result.size, mimeType: result.mime_type || file.type,
        replyTo: replyingTo ? replyingTo._id : null,
        replyPreview: replyingTo ? (replyingTo.message || "").substring(0, 80) : null,
      });
      setReplyingTo(null);
    } catch (err) {
      alert("Upload failed");
    }
  };

  let startVoiceRecording = async () => {
    try {
      let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = async () => {
        let blob = new Blob(audioChunks.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        if (blob.size > 0) {
          let result = await uploadFile(blob, "voice_" + Date.now() + ".webm");
          socket.emit("message", {
            senderId: username, senderName: displayName, message: "Voice message", type: "voice",
            fileUrl: result.file_url, fileName: result.file_name,
            fileSize: result.size, mimeType: "audio/webm",
          });
        }
      };
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied");
    }
  };

  let stopVoiceRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== "inactive") {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  let toggleReaction = (msgId, emoji) => {
    socket.emit("reaction", { messageId: msgId, reaction: emoji, email: username });
    setReactionMsg(null);
  };

  let handleEdit = (msg) => {
    setEditMsgId(msg._id);
    setEditText(msg.message);
  };

  let saveEdit = () => {
    if (editText.trim()) {
      socket.emit("editMessage", { messageId: editMsgId, newMessage: editText });
    }
    setEditMsgId(null); setEditText("");
  };

  let handleDelete = (msgId) => {
    if (confirm("Delete this message for everyone?")) {
      socket.emit("deleteMessage", { messageId: msgId });
    }
  };

  let handlePin = (msgId, pinned) => {
    socket.emit("pinMessage", { messageId: msgId, pinned: !pinned });
  };

  let handleForward = (msg) => {
    socket.emit("forwardMessage", {
      senderId: username, senderName: displayName, message: msg.message, type: msg.type,
      fileUrl: msg.fileUrl || "", fileName: msg.fileName || "",
      fileSize: msg.fileSize || 0, mimeType: msg.mimeType || "",
      forwardedFrom: msg.senderName || msg.username || "Unknown",
    });
  };

  let searchGiphy = async (q) => {
    setGifSearch(q);
    try {
      let res = await fetch("https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkrB1DZR5WrmMuVlsJ179SJWwKj&q=" + encodeURIComponent(q) + "&limit=20");
      let json = await res.json();
      if (json.data) setGifResults(json.data.map((g) => g.images.fixed_height.url));
    } catch (e) {
      setGifResults(SAMPLE_GIFS);
    }
  };

  let formatTime = (date) => {
    if (!date) return "";
    let d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  let formatLastSeen = (date) => {
    if (!date) return "Last seen: unknown";
    let d = new Date(date);
    let now = new Date();
    let diff = now - d;
    if (diff < 60000) return "Last seen: just now";
    if (diff < 3600000) return "Last seen: " + Math.floor(diff / 60000) + "m ago";
    if (diff < 86400000) return "Last seen: " + Math.floor(diff / 3600000) + "h ago";
    return "Last seen: " + d.toLocaleDateString();
  };

  let renderMessageContent = (msg) => {
    if (msg.type === "image" || msg.type === "video" || msg.type === "voice" || msg.fileUrl) {
      let isImage = msg.type === "image" || msg.mimeType?.startsWith("image");
      let isVideo = msg.type === "video" || msg.mimeType?.startsWith("video");
      let isVoice = msg.type === "voice" || msg.mimeType?.startsWith("audio");
      if (isImage) return <img src={msg.fileUrl} alt={msg.message} className="msg-media" onClick={() => window.open(msg.fileUrl)} />;
      if (isVideo) return <video src={msg.fileUrl} controls className="msg-media" />;
      if (isVoice) return <audio src={msg.fileUrl} controls className="msg-audio" />;
    }
    if (msg.type === "gif" && msg.fileUrl) {
      return <img src={msg.fileUrl} alt="GIF" className="msg-gif" />;
    }
    if (msg.type === "sticker") {
      return <span className="msg-sticker">{msg.message}</span>;
    }
    if (msg.fileUrl && (msg.type === "file" || !msg.type)) {
      let icon = msg.mimeType?.includes("pdf") ? "PDF" : msg.mimeType?.includes("zip") || msg.mimeType?.includes("rar") ? "ZIP" : "FILE";
      return (
        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className="msg-file">
          <FiFile /> {icon} - {msg.message || "File"}
        </a>
      );
    }
    return <span>{msg.message}</span>;
  };

  let filteredChat = searchQuery.trim()
    ? chat.filter((m) =>
        (m.message || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.senderName || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chat;

  let pinnedItems = chat.filter((m) => m.pinned);
  let mainMessages = chat.filter((m) => !m.pinned);

  return (
    <div className="container">
      <div className="app-layout">
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>RizzChat</h3>
            <button className="sidebar-toggle" onClick={() => setShowSidebar(!showSidebar)}>
              <FiChevronDown />
            </button>
          </div>
          <div className="online-section">
              <div className="last-seen-container">
              <div className="sphere-bg">
                <ParticleSphere />
              </div>
              <div className="last-seen-overlay">
                <h4>Online Now</h4>
                <p className="online-count">{onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""}</p>
                {onlineUsers.slice(0, 5).map((u, i) => (
                  <div key={i} className="online-user">
                    <span className="online-dot" />
                    <span>{u.split("@")[0]}</span>
                  </div>
                ))}
                {onlineUsers.length > 5 && <p className="more-online">+{onlineUsers.length - 5} more</p>}
                <p className="self-status">{onlineUsers.includes(username) ? "You are online" : "You are offline"}</p>
              </div>
            </div>
          </div>
          <div className="nav-section">
            <button onClick={() => nav("/profile")} style={{ background: "#28a745" }}>Profile</button>
            <button onClick={() => nav("/photos")} style={{ background: "#007bff" }}>Snaps</button>
            <button onClick={() => signOut(auth).then(() => nav("/login"))} style={{ background: "#dc3545" }}>Logout</button>
          </div>
        </div>

        <div className="main-chat">
          <div className="chat-header">
            <h2>RizzChat</h2>
            <div className="chat-header-actions">
              <button className="icon-btn" onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }} title="Search messages">
                <FiSearch />
              </button>
              <button className="icon-btn" onClick={() => setShowSidebar(!showSidebar)} title="Online users">
                <FiUsers />
              </button>
            </div>
          </div>

          {showSearch && (
            <div className="search-bar">
              <FiSearch className="search-icon" />
              <input
                type="text" placeholder="Search messages..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input" autoFocus
              />
              {searchQuery && <FiX className="search-clear" onClick={() => setSearchQuery("")} />}
            </div>
          )}
          {searchQuery && (
            <div className="search-results-info">
              Found {filteredChat.length} result{filteredChat.length !== 1 ? "s" : ""}
            </div>
          )}

          <div className="chat-box">
            <div className="chat-messages">
              {pinnedItems.length > 0 && (
                <div className="pinned-section">
                  <div className="pinned-header"><FiBookmark /> Pinned Messages</div>
                  {pinnedItems.slice(0, 3).map((msg, i) => (
                    <div key={i} className="pinned-preview">
                      <span className="pinned-sender">{msg.senderName?.split("@")[0]}: </span>
                      <span className="pinned-text">{(msg.message || "").substring(0, 30)}</span>
                    </div>
                  ))}
                </div>
              )}

              {filteredChat.length === 0 && (
                <div className="empty-chat">
                  <FiMessageSquare size={48} />
                  <p>{searchQuery ? "No messages found" : "No messages yet. Start chatting!"}</p>
                </div>
              )}

              {filteredChat.map((data, index) => {
                let senderId = data.senderId || data.username;
                let senderName = data.senderName || data.username || "Unknown";
                let isMine = senderId === username;
                let msgReactions = data.reactions || {};
                let hasReactions = Object.keys(msgReactions).length > 0;
                let seenCount = data.seenBy ? data.seenBy.length : 0;
                let seenByOthers = isMine && seenCount > 1;
                return (
                  <div key={data._id || index} className={"msg-wrapper " + (isMine ? "mine" : "theirs")}>
                    <div className="msg-sender">{senderName?.split("@")[0]}</div>
                    <div className={"msg-bubble " + (isMine ? "sent" : "received") + (data.pinned ? " pinned" : "")}
                         onMouseEnter={() => setReactionMsg(data._id)}
                         onMouseLeave={() => setReactionMsg(null)}>

                      {data.replyTo && (
                        <div className="reply-indicator">
                          <FiMessageSquare size={12} />
                          <span>{(data.replyPreview || "").substring(0, 40)}</span>
                        </div>
                      )}

                      {data.forwarded && (
                        <div className="forward-indicator">
                          <FiShare2 size={12} /> Forwarded from {(data.forwardedFrom || "Unknown").split("@")[0]}
                        </div>
                      )}

                      {editMsgId === data._id ? (
                        <div className="edit-mode">
                          <input value={editText} onChange={(e) => setEditText(e.target.value)} className="edit-input" autoFocus />
                          <div className="edit-actions">
                            <button onClick={saveEdit} className="edit-save"><FiCheck /></button>
                            <button onClick={() => { setEditMsgId(null); setEditText(""); }} className="edit-cancel"><FiX /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="msg-content">
                          {renderMessageContent(data)}
                          {data.edited && <span className="edited-badge">(edited)</span>}
                        </div>
                      )}
                      <div className="msg-meta">
                        <span className="msg-time">{formatTime(data.createdAt)}</span>
                        {isMine && (
                          <span className="read-receipt">
                            {seenByOthers ? <span className="seen-all"><FiCheck /><FiCheck /></span> : <span className="seen-sent"><FiCheck /></span>}
                          </span>
                        )}
                      </div>

                      {hasReactions && (
                        <div className="reaction-bar">
                          {Object.entries(msgReactions).map(([emoji, users]) => (
                            <span key={emoji} className={"reaction-badge " + (users.includes(username) ? "mine" : "")}
                                  onClick={() => toggleReaction(data._id, emoji)}>
                              {emoji} {users.length}
                            </span>
                          ))}
                        </div>
                      )}

                      {reactionMsg === data._id && (
                        <div className="reaction-picker">
                          {REACTIONS.map((emoji) => (
                            <span key={emoji} className="reaction-option" onClick={() => toggleReaction(data._id, emoji)}>{emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {reactionMsg === data._id && isMine && (
                      <div className="msg-actions">
                        {!data.pinned && <button className="msg-action" onClick={() => handlePin(data._id, false)} title="Pin"><FiBookmark /></button>}
                        {data.pinned && <button className="msg-action active" onClick={() => handlePin(data._id, true)} title="Unpin"><FiBookmark /></button>}
                        <button className="msg-action" onClick={() => handleEdit(data)} title="Edit"><FiEdit2 /></button>
                        <button className="msg-action" onClick={() => handleDelete(data._id)} title="Delete"><FiTrash2 /></button>
                        <button className="msg-action" onClick={() => setReplyingTo(data)} title="Reply"><FiMessageSquare /></button>
                        <button className="msg-action" onClick={() => handleForward(data)} title="Forward"><FiShare2 /></button>
                      </div>
                    )}
                    {reactionMsg === data._id && !isMine && (
                      <div className="msg-actions">
                        <button className="msg-action" onClick={() => setReplyingTo(data)} title="Reply"><FiMessageSquare /></button>
                        <button className="msg-action" onClick={() => handleForward(data)} title="Forward"><FiShare2 /></button>
                      </div>
                    )}
                  </div>
                );
              })}
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  <span className="typing-dots">
                    <span className="dot" /><span className="dot" /><span className="dot" />
                  </span>
                  <span className="typing-text">
                    {typingUsers.map((u) => u.split("@")[0]).join(", ")} typing{typingUsers.length === 1 ? "s" : ""}...
                  </span>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="chat-input-area">
              {replyingTo && (
                <div className="reply-preview">
                  <div className="reply-info">
                    <FiMessageSquare size={14} />
                    <span>Replying to <strong>{(replyingTo.senderName || replyingTo.username || "Unknown").split("@")[0]}</strong></span>
                  </div>
                  <span className="reply-text">{(replyingTo.message || "").substring(0, 50)}</span>
                  <FiX className="reply-close" onClick={() => setReplyingTo(null)} />
                </div>
              )}

              <div className="input-toolbar">
                <button className={"toolbar-btn " + (showEmoji ? "active" : "")} onClick={() => { setShowEmoji(!showEmoji); setShowGifs(false); setShowStickers(false); }} title="Emoji">
                  <FiSmile />
                </button>
                <button className="toolbar-btn" onClick={() => { setShowGifs(!showGifs); setShowEmoji(false); setShowStickers(false); }} title="GIF">
                  <FiImage />
                </button>
                <button className="toolbar-btn" onClick={() => { setShowStickers(!showStickers); setShowEmoji(false); setShowGifs(false); }} title="Stickers">
                  <FiCamera />
                </button>
                <label className="toolbar-btn" title="File">
                  <FiPaperclip />
                  <input type="file" hidden onChange={(e) => { let f = e.target.files[0]; if (f) sendFileMessage(f, "file"); e.target.value = ""; }} />
                </label>
                <label className="toolbar-btn" title="Photo/Video">
                  <FiVideo />
                  <input type="file" accept="image/*,video/*" hidden onChange={(e) => { let f = e.target.files[0]; if (f) { let t = f.type.startsWith("video") ? "video" : "image"; sendFileMessage(f, t); } e.target.value = ""; }} />
                </label>
                <button className={"toolbar-btn " + (isRecording ? "recording" : "")}
                        onMouseDown={startVoiceRecording} onMouseUp={stopVoiceRecording}
                        onTouchStart={startVoiceRecording} onTouchEnd={stopVoiceRecording}
                        title={isRecording ? "Release to send" : "Hold to record voice"}>
                  {isRecording ? <FiStopCircle /> : <FiMic />}
                </button>
              </div>

              {(showEmoji || showGifs || showStickers) && (
                <div className="picker-panel">
                  {showEmoji && (
                    <div className="emoji-grid">
                      {EMOJIS.map((emoji, i) => (
                        <span key={i} className="emoji-item" onClick={() => setMessage(message + emoji)}>{emoji}</span>
                      ))}
                    </div>
                  )}
                  {showStickers && (
                    <div className="sticker-grid">
                      {["❤️","🔥","💯","🎉","😍","😂","👍","👏","💪","🙏","🎊","✨","⭐","💥","🌈","👑","🚀","💎","🎯","🏆"].map((s, i) => (
                        <span key={i} className="sticker-item" onClick={() => {
                          socket.emit("message", { senderId: username, senderName: displayName, message: s, type: "sticker" });
                          setShowStickers(false);
                        }}>{s}</span>
                      ))}
                    </div>
                  )}
                  {showGifs && (
                    <div className="gif-picker">
                      <div className="gif-search-row">
                        <input type="text" placeholder="Search GIFs..." value={gifSearch}
                          onChange={(e) => searchGiphy(e.target.value)} className="gif-search-input" />
                      </div>
                      <div className="gif-grid">
                        {gifResults.map((url, i) => (
                          <img key={i} src={url} alt="" className="gif-item" onClick={() => {
                            socket.emit("message", { senderId: username, senderName: displayName, message: "GIF", type: "gif", fileUrl: url });
                            setShowGifs(false);
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="chat-input-row">
                <input
                  type="text" className="chat-input" placeholder="Type a message..."
                  value={message} onChange={(e) => { setMessage(e.target.value); startTyping(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendTextMessage(); } }}
                />
                <button className="send-btn" onClick={sendTextMessage}><FiSend /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;