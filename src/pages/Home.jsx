
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Form.css";
import "./Home.css";
import { getAuth , signOut , onAuthStateChanged } from "firebase/auth";
import { FiSend } from "react-icons/fi";
import { RiZzzFill } from "react-icons/ri";
import { io } from "socket.io-client";

let socket = io("https://rizzchat-be-z4vo.onrender.com");

function Home(){

  let [chat, setChat] = useState([]);
  let [message, setMessage] = useState("");
  let [username, setUsername] = useState(null);
  let endRef = useRef(null);

  let auth = getAuth();
  let nav = useNavigate();

  useEffect(()=>{
    function checkUser(user){
      if(!user) nav("/login");      
      else setUsername(user.email);  
    }

    let stopWatching = onAuthStateChanged(auth, checkUser);
    return ()=> stopWatching();
  } , [] );

  useEffect(() => {
    
     socket.on("history", (data) => setChat(data));
     socket.emit("getHistory");

    socket.on("message", (data) => setChat((prev) => [...prev, data]));
    
    return () => {
    socket.off("history");
      socket.off("message");
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  function sendMessage()
  {
     if(username && message)
     {
        socket.emit("message",{ username , message})
        setMessage("");
     }
  }

  return (
    <div className="container">
      <div className="form-box">
        <h2>RizzChat <RiZzzFill /></h2>


        <div className="button-group">
          <button onClick={()=>nav("/profile")}  style={{ backgroundColor: "#28a745" }}>
            Profile
          </button>

          <button onClick={()=>nav("/photos")} style={{ backgroundColor: "#007bff" }}>
            Snaps
          </button>

          <button onClick={()=>signOut(auth).then(()=>nav("/login"))} style={{ backgroundColor: "#dc3545" }}>
            Logout
          </button>
        </div>

        <div className="chat-box">
          <div className="chat-messages">
            {chat.map((data, index) => (
              <div
                key={index}
                className={`chat-row ${data.username === username ? "sent" : "received"}`}
              >
                <div className="chat-sender">{data.username}</div>
                <span className={`chat-bubble ${data.username === username ? "sent" : "received"}`}>
                  {data.message}
                </span>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="chat-input-area">
            <div className="chat-input-row">
              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
              />
              <button className="send-btn" onClick={sendMessage}>
                <FiSend style={{ color: 'inherit' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
