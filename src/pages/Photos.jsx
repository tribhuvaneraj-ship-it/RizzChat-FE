
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FiPlus } from "react-icons/fi";
import axios from "axios";
import "./Form.css";
import "./Photos.css";

let API = "https://rizzchat-be-z4vo.onrender.com";

function Photos(){
  let [files, setFiles] = useState([]);
  let [file, setFile] = useState(null);
  let [caption, setCaption] = useState("");
  let [uploading, setUploading] = useState(false);
  let [showForm, setShowForm] = useState(false);
  let [email, setEmail] = useState(null);
  let endRef = useRef(null);

  let auth = getAuth();
  let nav = useNavigate();

  useEffect(()=>{
    let unsubscribe = onAuthStateChanged(auth,(user)=>{
      if(!user) nav("/login");
      else setEmail(user.email);
    });
    return ()=>unsubscribe();
  } , [] );

  let loadFiles = () => {
    axios.get(`${API}/files`)
      .then((res)=>setFiles(res.data))
      .catch((err)=>alert(err));
  };

  useEffect(()=>{
    loadFiles();
  } , [] );

  useEffect(()=>{
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  } , [files] );

  let closeForm = () => {
    setShowForm(false);
    setFile(null);
    setCaption("");
  };

  let handleUpload = (event) => {
    event.preventDefault();

    if(!file){
      alert("Please choose an image");
      return;
    }
    if(caption === ""){
      alert("Caption cannot be empty");
      return;
    }

    let formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);
    formData.append("username", email);

    setUploading(true);
    axios.post(`${API}/upload`, formData)
      .then(()=>{
        closeForm();
        loadFiles();
      })
      .catch((err)=>alert(err))
      .finally(()=>setUploading(false));
  };

  let handleDelete = (id) => {
    axios.delete(`${API}/delete/${id}`)
      .then(()=>loadFiles())
      .catch((err)=>alert(err));
  };

  return (
    <div className="container">
      <div className="form-box">
        <h2>Snaps</h2>

        <div className="button-group">
          <button onClick={()=>setShowForm(true)} style={{ backgroundColor: "#007bff", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <FiPlus /> Add Snap
          </button>

          <button onClick={()=>nav("/home")} style={{ backgroundColor: "#6c757d" }}>
            Home
          </button>
        </div>

        <div className="post-feed">
          {files.map((item)=>{
            let mine = item.username === email;
            return (
              <div className={`post-row ${mine ? "sent" : "received"}`} key={item._id}>
                <div className="post-sender">
                  <span>{item.username}</span>
                  {mine && (
                    <button
                      className="post-delete"
                      onClick={()=>handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="post-bubble">
                  <img className="post-image" src={item.file_url} alt={item.caption} />
                  <div className="post-caption">{item.caption}</div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal-box" onClick={(e)=>e.stopPropagation()}>
            <h2>New Snap</h2>
            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label>Choose Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e)=>setFile(e.target.files[0])}
                />
              </div>

              <div className="form-group">
                <label>Caption</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e)=>setCaption(e.target.value)}
                  placeholder="Write a caption"
                />
              </div>

              <div className="button-group">
                <button type="submit" disabled={uploading} style={{ backgroundColor: "#007bff" }}>
                  {uploading ? "Uploading..." : "Upload"}
                </button>
                <button type="button" onClick={closeForm} style={{ backgroundColor: "#6c757d" }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Photos;
